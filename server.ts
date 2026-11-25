import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import {
  db,
  initDatabase,
  hashPassword,
  verifyPassword,
  seedStarterWorkspaceForUser,
  seedDemoMeasurements,
} from './server/db.ts';
import {
  generateAssistantResponse,
  explainTwoMoments,
  MeasurementRow,
} from './server/analytics.ts';

initDatabase();

const app = express();
app.use(express.json({ limit: '2mb' }));

const SESSION_SECRET =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 16
    ? process.env.SESSION_SECRET
    : crypto.randomBytes(32).toString('hex');

interface TokenPayload {
  userId: string;
  email: string;
  exp: number;
}

function signToken(payload: TokenPayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyToken(token: string): TokenPayload | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, sig] = parts;
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as TokenPayload;
    if (!parsed.userId || parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

interface AuthenticatedRequest extends Request {
  auth?: TokenPayload;
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : null;
  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: 'Session expired or invalid.' });
    return;
  }
  const exists = db.prepare('SELECT id FROM users WHERE id = ?').get(payload.userId);
  if (!exists) {
    res.status(401).json({ error: 'Account no longer exists.' });
    return;
  }
  req.auth = payload;
  next();
}

// Live SSE subscribers per user_id for real-time ESP32 & wearable updates
const sseClients = new Map<string, Set<Response>>();

function broadcastToUser(userId: string, event: string, data: unknown) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}

function mapMeasurement(row: MeasurementRow) {
  return {
    id: row.id,
    userId: row.user_id,
    recordedAt: row.recorded_at,
    dateKey: row.date_key,
    heartRateBpm: row.heart_rate_bpm,
    restingHrBpm: row.resting_hr_bpm,
    spo2Pct: row.spo2_pct,
    isExperimentalSpo2: row.is_experimental_spo2 === 1,
    sleepHours: row.sleep_hours,
    sleepStart: row.sleep_start,
    sleepEnd: row.sleep_end,
    sleepConsistencyScore: row.sleep_consistency_score,
    steps: row.steps,
    activeMinutes: row.active_minutes,
    exerciseMinutes: row.exercise_minutes,
    exerciseType: row.exercise_type,
    moodScore: row.mood_score,
    energyScore: row.energy_score,
    focusScore: row.focus_score,
    waterLiters: row.water_liters,
    screenTimeMinutes: row.screen_time_minutes,
    habits: JSON.parse(row.habits || '[]'),
    notes: row.notes || '',
    sourceDevice: row.source_device,
    sourceType: row.source_type,
    signalQualityScore: row.signal_quality_score,
    qualityFlags: JSON.parse(row.quality_flags || '[]'),
    isRejected: row.is_rejected === 1,
    isDemo: row.is_demo === 1,
  };
}

function getFullUserState(userId: string) {
  const user = db.prepare('SELECT id, email, is_demo, created_at FROM users WHERE id = ?').get(userId) as
    | { id: string; email: string; is_demo: number; created_at: string }
    | undefined;
  const profileRow = db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  const avatarRow = db.prepare('SELECT * FROM avatar_preferences WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  const devices = db.prepare('SELECT * FROM connected_devices WHERE user_id = ? ORDER BY created_at ASC').all(userId) as Record<string, unknown>[];
  const measurements = db.prepare('SELECT * FROM health_measurements WHERE user_id = ? ORDER BY date_key ASC, recorded_at ASC').all(userId) as MeasurementRow[];
  const memories = db.prepare('SELECT * FROM personal_health_memory WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<string, unknown>[];
  const experiments = db.prepare('SELECT * FROM experiments WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<string, unknown>[];
  const challenges = db.prepare('SELECT * FROM habit_challenges WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<string, unknown>[];
  const goals = db.prepare('SELECT * FROM wellness_goals WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Record<string, unknown>[];
  const privacyRow = db.prepare('SELECT * FROM privacy_preferences WHERE user_id = ?').get(userId) as Record<string, unknown> | undefined;
  const chatRows = db.prepare('SELECT * FROM chat_history WHERE user_id = ? ORDER BY created_at ASC LIMIT 60').all(userId) as Record<string, unknown>[];

  return {
    user: user
      ? { id: user.id, email: user.email, isDemo: user.is_demo === 1, createdAt: user.created_at }
      : null,
    profile: profileRow
      ? {
          userId: profileRow.user_id,
          fullName: profileRow.full_name,
          age: profileRow.age,
          dob: profileRow.dob,
          gender: profileRow.gender,
          heightCm: profileRow.height_cm,
          weightKg: profileRow.weight_kg,
          unitSystem: profileRow.unit_system,
          country: profileRow.country,
          timezone: profileRow.timezone,
          sleepTargetHours: profileRow.sleep_target_hours,
          usualBedtime: profileRow.usual_bedtime,
          usualWakeTime: profileRow.usual_wake_time,
          activityLevel: profileRow.activity_level,
          exerciseFrequency: profileRow.exercise_frequency,
          exercisePreferences: JSON.parse(String(profileRow.exercise_preferences || '[]')),
          dailyRoutine: profileRow.daily_routine,
          dietaryPreferences: profileRow.dietary_preferences,
          moodTrackingEnabled: profileRow.mood_tracking_enabled === 1,
          energyTrackingEnabled: profileRow.energy_tracking_enabled === 1,
          goals: JSON.parse(String(profileRow.goals || '[]')),
          healthContext: profileRow.health_context,
          medications: profileRow.medications,
          wellnessNotes: profileRow.wellness_notes,
          measurementLimitations: profileRow.measurement_limitations,
          onboardingCompleted: profileRow.onboarding_completed === 1,
          updatedAt: profileRow.updated_at,
        }
      : null,
    avatar: avatarRow
      ? {
          userId: avatarRow.user_id,
          bodyBuild: avatarRow.body_build,
          skinTone: avatarRow.skin_tone,
          hairStyle: avatarRow.hair_style,
          accentColor: avatarRow.accent_color,
          postureStyle: avatarRow.posture_style,
          updatedAt: avatarRow.updated_at,
        }
      : null,
    devices: devices.map((d) => ({
      id: d.id,
      userId: d.user_id,
      deviceType: d.device_type,
      provider: d.provider,
      deviceName: d.device_name,
      deviceIdCode: d.device_id_code,
      status: d.status,
      signalQuality: d.signal_quality,
      lastSyncAt: d.last_sync_at,
      permissions: JSON.parse(String(d.permissions || '[]')),
      preferredForHr: d.preferred_for_hr === 1,
      preferredForSleep: d.preferred_for_sleep === 1,
      preferredForActivity: d.preferred_for_activity === 1,
      createdAt: d.created_at,
    })),
    measurements: measurements.map(mapMeasurement),
    memories: memories.map((m) => ({
      id: m.id,
      userId: m.user_id,
      title: m.title,
      observation: m.observation,
      category: m.category,
      dateRange: m.date_range,
      sampleSize: m.sample_size,
      confidence: m.confidence,
      userApproved: m.user_approved === 1,
      createdAt: m.created_at,
    })),
    experiments: experiments.map((e) => ({
      id: e.id,
      userId: e.user_id,
      title: e.title,
      hypothesis: e.hypothesis,
      metricTarget: e.metric_target,
      durationDays: e.duration_days,
      baselineSummary: e.baseline_summary,
      status: e.status,
      startDate: e.start_date,
      endDate: e.end_date,
      checkins: JSON.parse(String(e.checkins || '[]')),
      resultSummary: e.result_summary,
      createdAt: e.created_at,
    })),
    challenges: challenges.map((c) => ({
      id: c.id,
      userId: c.user_id,
      title: c.title,
      description: c.description,
      targetMetric: c.target_metric,
      durationDays: c.duration_days,
      status: c.status,
      checkins: JSON.parse(String(c.checkins || '[]')),
      baselineValue: c.baseline_value,
      outcomeValue: c.outcome_value,
      createdAt: c.created_at,
    })),
    goals: goals.map((g) => ({
      id: g.id,
      userId: g.user_id,
      title: g.title,
      rationale: g.rationale,
      scheduleText: g.schedule_text,
      status: g.status,
      progressPct: g.progress_pct,
      checkins: JSON.parse(String(g.checkins || '[]')),
      createdAt: g.created_at,
    })),
    privacy: privacyRow
      ? {
          userId: privacyRow.user_id,
          localFirstMode: privacyRow.local_first_mode === 1,
          aiCloudConsent: privacyRow.ai_cloud_consent === 1,
          wearableSyncConsent: privacyRow.wearable_sync_consent === 1,
          esp32CloudConsent: privacyRow.esp32_cloud_consent === 1,
          shareAnonymizedSummaries: privacyRow.share_anonymized_summaries === 1,
          updatedAt: privacyRow.updated_at,
        }
      : null,
    chatHistory: chatRows.map((c) => ({
      id: c.id,
      userId: c.user_id,
      role: c.role,
      content: c.content,
      references: JSON.parse(String(c.references_json || '[]')),
      isDemoResponse: c.is_demo_response === 1,
      createdAt: c.created_at,
    })),
    capabilities: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'),
      supabaseConfigured: Boolean(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY),
      fitbitOAuthConfigured: Boolean(process.env.FITBIT_CLIENT_ID && process.env.FITBIT_CLIENT_SECRET),
      garminOAuthConfigured: Boolean(process.env.GARMIN_CONSUMER_KEY && process.env.GARMIN_CONSUMER_SECRET),
    },
  };
}

// ---------------- AUTH ROUTES ----------------

app.post('/api/auth/signup', (req, res) => {
  const { email, password, profile, avatar, loadSampleHistory } = req.body ?? {};
  if (typeof email !== 'string' || !email.includes('@') || typeof password !== 'string' || password.length < 6) {
    res.status(400).json({ error: 'Valid email and password (min 6 characters) are required.' });
    return;
  }
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
  if (existing) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const userId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare('INSERT INTO users (id, email, password_hash, is_demo, created_at) VALUES (?, ?, ?, 0, ?)').run(
    userId,
    normalizedEmail,
    hashPassword(password),
    now
  );

  const p = profile ?? {};
  db.prepare(`
    INSERT INTO profiles (
      user_id, full_name, age, dob, gender, height_cm, weight_kg, unit_system, country, timezone,
      sleep_target_hours, usual_bedtime, usual_wake_time, activity_level, exercise_frequency,
      exercise_preferences, daily_routine, dietary_preferences, mood_tracking_enabled,
      energy_tracking_enabled, goals, health_context, medications, wellness_notes,
      measurement_limitations, onboarding_completed, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    String(p.fullName || normalizedEmail.split('@')[0]),
    typeof p.age === 'number' ? p.age : null,
    String(p.dob || ''),
    String(p.gender || ''),
    Number(p.heightCm) || 172,
    Number(p.weightKg) || 68,
    p.unitSystem === 'imperial' ? 'imperial' : 'metric',
    String(p.country || ''),
    String(p.timezone || 'UTC'),
    Number(p.sleepTargetHours) || 7.5,
    String(p.usualBedtime || '23:00'),
    String(p.usualWakeTime || '06:30'),
    String(p.activityLevel || 'moderate'),
    String(p.exerciseFrequency || '3-4x/week'),
    JSON.stringify(Array.isArray(p.exercisePreferences) ? p.exercisePreferences : []),
    String(p.dailyRoutine || ''),
    String(p.dietaryPreferences || ''),
    p.moodTrackingEnabled === false ? 0 : 1,
    p.energyTrackingEnabled === false ? 0 : 1,
    JSON.stringify(Array.isArray(p.goals) ? p.goals : []),
    String(p.healthContext || ''),
    String(p.medications || ''),
    String(p.wellnessNotes || ''),
    String(p.measurementLimitations || ''),
    p.onboardingCompleted ? 1 : 0,
    now
  );

  const av = avatar ?? {};
  db.prepare(`
    INSERT INTO avatar_preferences (user_id, body_build, skin_tone, hair_style, accent_color, posture_style, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    userId,
    String(av.bodyBuild || 'balanced'),
    String(av.skinTone || '#d8b4a0'),
    String(av.hairStyle || 'short'),
    String(av.accentColor || 'cyan'),
    String(av.postureStyle || 'neutral'),
    now
  );

  seedStarterWorkspaceForUser(userId, String(p.fullName || 'Member'), Boolean(loadSampleHistory));

  const token = signToken({ userId, email: normalizedEmail, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  res.status(201).json({ token, state: getFullUserState(userId) });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== 'string' || typeof password !== 'string') {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }
  const row = db.prepare('SELECT id, email, password_hash FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
    | { id: string; email: string; password_hash: string }
    | undefined;
  if (!row || !verifyPassword(password, row.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }
  const token = signToken({ userId: row.id, email: row.email, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  res.json({ token, state: getFullUserState(row.id) });
});

app.post('/api/auth/demo', (_req, res) => {
  const demoUser = db.prepare('SELECT id, email FROM users WHERE email = ?').get('demo@lifetwin.ai') as
    | { id: string; email: string }
    | undefined;
  if (!demoUser) {
    res.status(500).json({ error: 'Demo profile unavailable.' });
    return;
  }
  const token = signToken({
    userId: demoUser.id,
    email: demoUser.email,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ token, state: getFullUserState(demoUser.id) });
});

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body ?? {};
  if (typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'Valid email is required.' });
    return;
  }
  const row = db.prepare('SELECT id FROM users WHERE email = ?').get(email.trim().toLowerCase()) as { id: string } | undefined;
  if (!row) {
    res.json({
      message: 'If an account matches that email, a password reset code has been prepared.',
    });
    return;
  }
  const code = crypto.randomInt(100000, 999999).toString();
  const expires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(code, expires, row.id);
  // Return preview reset confirmation without leaking if production SMTP is absent
  res.json({
    message: 'Reset verification code generated (preview mode — check below to complete reset).',
    previewResetCode: process.env.NODE_ENV === 'production' ? undefined : code,
  });
});

app.post('/api/auth/reset-password', (req, res) => {
  const { email, code, newPassword } = req.body ?? {};
  if (typeof email !== 'string' || typeof code !== 'string' || typeof newPassword !== 'string' || newPassword.length < 6) {
    res.status(400).json({ error: 'Email, 6-digit code, and new password (min 6 chars) are required.' });
    return;
  }
  const row = db.prepare('SELECT id, reset_token, reset_expires FROM users WHERE email = ?').get(email.trim().toLowerCase()) as
    | { id: string; reset_token: string | null; reset_expires: string | null }
    | undefined;
  if (!row || !row.reset_token || row.reset_token !== code.trim() || !row.reset_expires || new Date(row.reset_expires).getTime() < Date.now()) {
    res.status(400).json({ error: 'Invalid or expired reset code.' });
    return;
  }
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(
    hashPassword(newPassword),
    row.id
  );
  res.json({ message: 'Password updated successfully. You can now sign in.' });
});

app.get('/api/me', requireAuth, (req: AuthenticatedRequest, res) => {
  res.json({ state: getFullUserState(req.auth!.userId) });
});

// ---------------- REAL-TIME STREAM (SSE) ----------------

app.get('/api/stream', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token : '';
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).end();
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  if (!sseClients.has(payload.userId)) {
    sseClients.set(payload.userId, new Set());
  }
  sseClients.get(payload.userId)!.add(res);
  res.write(`event: connected\ndata: ${JSON.stringify({ ok: true })}\n\n`);

  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.get(payload.userId)?.delete(res);
  });
});

// ---------------- PROFILE & AVATAR ----------------

app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const p = req.body ?? {};
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE profiles SET
      full_name = COALESCE(?, full_name),
      age = ?,
      dob = COALESCE(?, dob),
      gender = COALESCE(?, gender),
      height_cm = COALESCE(?, height_cm),
      weight_kg = COALESCE(?, weight_kg),
      unit_system = COALESCE(?, unit_system),
      country = COALESCE(?, country),
      timezone = COALESCE(?, timezone),
      sleep_target_hours = COALESCE(?, sleep_target_hours),
      usual_bedtime = COALESCE(?, usual_bedtime),
      usual_wake_time = COALESCE(?, usual_wake_time),
      activity_level = COALESCE(?, activity_level),
      exercise_frequency = COALESCE(?, exercise_frequency),
      exercise_preferences = COALESCE(?, exercise_preferences),
      daily_routine = COALESCE(?, daily_routine),
      dietary_preferences = COALESCE(?, dietary_preferences),
      mood_tracking_enabled = COALESCE(?, mood_tracking_enabled),
      energy_tracking_enabled = COALESCE(?, energy_tracking_enabled),
      goals = COALESCE(?, goals),
      health_context = COALESCE(?, health_context),
      medications = COALESCE(?, medications),
      wellness_notes = COALESCE(?, wellness_notes),
      measurement_limitations = COALESCE(?, measurement_limitations),
      onboarding_completed = COALESCE(?, onboarding_completed),
      updated_at = ?
    WHERE user_id = ?
  `).run(
    p.fullName ?? null,
    p.age !== undefined ? p.age : null,
    p.dob ?? null,
    p.gender ?? null,
    p.heightCm !== undefined ? Number(p.heightCm) : null,
    p.weightKg !== undefined ? Number(p.weightKg) : null,
    p.unitSystem ?? null,
    p.country ?? null,
    p.timezone ?? null,
    p.sleepTargetHours !== undefined ? Number(p.sleepTargetHours) : null,
    p.usualBedtime ?? null,
    p.usualWakeTime ?? null,
    p.activityLevel ?? null,
    p.exerciseFrequency ?? null,
    p.exercisePreferences ? JSON.stringify(p.exercisePreferences) : null,
    p.dailyRoutine ?? null,
    p.dietaryPreferences ?? null,
    p.moodTrackingEnabled !== undefined ? (p.moodTrackingEnabled ? 1 : 0) : null,
    p.energyTrackingEnabled !== undefined ? (p.energyTrackingEnabled ? 1 : 0) : null,
    p.goals ? JSON.stringify(p.goals) : null,
    p.healthContext ?? null,
    p.medications ?? null,
    p.wellnessNotes ?? null,
    p.measurementLimitations ?? null,
    p.onboardingCompleted !== undefined ? (p.onboardingCompleted ? 1 : 0) : null,
    now,
    userId
  );

  res.json({ state: getFullUserState(userId) });
});

app.put('/api/avatar', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const av = req.body ?? {};
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE avatar_preferences SET
      body_build = COALESCE(?, body_build),
      skin_tone = COALESCE(?, skin_tone),
      hair_style = COALESCE(?, hair_style),
      accent_color = COALESCE(?, accent_color),
      posture_style = COALESCE(?, posture_style),
      updated_at = ?
    WHERE user_id = ?
  `).run(
    av.bodyBuild ?? null,
    av.skinTone ?? null,
    av.hairStyle ?? null,
    av.accentColor ?? null,
    av.postureStyle ?? null,
    now,
    userId
  );

  res.json({ state: getFullUserState(userId) });
});

// ---------------- DEVICES & HARDWARE / WEARABLES ----------------

app.post('/api/devices/connect', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { deviceType, provider, deviceName, deviceIdCode, permissions, preferredForHr, preferredForSleep, preferredForActivity } = req.body ?? {};

  if (!deviceType || !provider || !deviceName) {
    res.status(400).json({ error: 'Device type, provider, and name are required.' });
    return;
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const status =
    deviceType === 'smartwatch' && (provider.includes('Fitbit') || provider.includes('Garmin')) && !process.env.FITBIT_CLIENT_ID
      ? 'awaiting_credentials'
      : 'connected';

  // Ensure no conflicting duplicate deviceIdCode for this user
  const existing = db
    .prepare('SELECT id FROM connected_devices WHERE user_id = ? AND device_id_code = ?')
    .get(userId, String(deviceIdCode || provider));

  if (existing) {
    db.prepare(`
      UPDATE connected_devices SET status = ?, last_sync_at = ?, permissions = ? WHERE id = ? AND user_id = ?
    `).run(status, now, JSON.stringify(permissions || []), (existing as { id: string }).id, userId);
  } else {
    db.prepare(`
      INSERT INTO connected_devices (
        id, user_id, device_type, provider, device_name, device_id_code, status, signal_quality,
        last_sync_at, permissions, preferred_for_hr, preferred_for_sleep, preferred_for_activity, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      deviceType === 'esp32' ? 'esp32' : 'smartwatch',
      String(provider),
      String(deviceName),
      String(deviceIdCode || `${deviceType.toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`),
      status,
      deviceType === 'esp32' ? 92 : 97,
      now,
      JSON.stringify(Array.isArray(permissions) ? permissions : []),
      preferredForHr ? 1 : 0,
      preferredForSleep ? 1 : 0,
      preferredForActivity ? 1 : 0,
      now
    );
  }

  res.json({ state: getFullUserState(userId) });
});

app.patch('/api/devices/:id/preferences', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { preferredForHr, preferredForSleep, preferredForActivity } = req.body ?? {};
  const device = db.prepare('SELECT * FROM connected_devices WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!device) {
    res.status(404).json({ error: 'Device not found.' });
    return;
  }

  if (preferredForHr) {
    db.prepare('UPDATE connected_devices SET preferred_for_hr = 0 WHERE user_id = ?').run(userId);
    db.prepare('UPDATE connected_devices SET preferred_for_hr = 1 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  }
  if (preferredForSleep) {
    db.prepare('UPDATE connected_devices SET preferred_for_sleep = 0 WHERE user_id = ?').run(userId);
    db.prepare('UPDATE connected_devices SET preferred_for_sleep = 1 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  }
  if (preferredForActivity) {
    db.prepare('UPDATE connected_devices SET preferred_for_activity = 0 WHERE user_id = ?').run(userId);
    db.prepare('UPDATE connected_devices SET preferred_for_activity = 1 WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  }

  res.json({ state: getFullUserState(userId) });
});

app.delete('/api/devices/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  db.prepare('DELETE FROM connected_devices WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ state: getFullUserState(userId) });
});

// Real ESP32 DevKit V1 + MAX30102 ingestion endpoint (also callable via demo packet test button with explicit isDemo flag)
app.post('/api/iot/ingest', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const {
    deviceIdCode,
    heartRateBpm,
    spo2Pct,
    irSignalLevel,
    fingerDetected,
    motionVariance,
    isDemoPacket,
  } = req.body ?? {};

  const now = new Date();
  const dateKey = now.toISOString().slice(0, 10);
  const recordedAt = now.toISOString();

  const hr = Number(heartRateBpm);
  const spo2 = spo2Pct !== undefined && spo2Pct !== null ? Number(spo2Pct) : null;
  const ir = irSignalLevel !== undefined ? Number(irSignalLevel) : 65000;
  const motion = motionVariance !== undefined ? Number(motionVariance) : 0.08;
  const fingerOk = fingerDetected !== false && ir >= 25000;

  // Sensor Trust Engine quality evaluation
  const flags: string[] = ['MAX30102 Experimental Optical Estimate'];
  let quality = 95;
  let rejected = false;

  if (!fingerOk) {
    quality -= 55;
    flags.push('Poor finger contact detected (low IR perfusion)');
    rejected = true;
  }
  if (motion > 0.35) {
    quality -= 35;
    flags.push('Motion artifact detected');
    rejected = true;
  }
  if (Number.isNaN(hr) || hr < 35 || hr > 210) {
    quality -= 45;
    flags.push('Physiologically implausible BPM spike');
    rejected = true;
  }
  if (spo2 !== null && (spo2 < 75 || spo2 > 100)) {
    quality -= 30;
    flags.push('Out-of-range experimental SpO2 estimate');
    rejected = true;
  }

  quality = Math.max(5, Math.min(100, quality));
  if (rejected) {
    flags.push('Excluded from AI baseline');
  }

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO health_measurements (
      id, user_id, recorded_at, date_key, heart_rate_bpm, spo2_pct, is_experimental_spo2,
      notes, source_device, source_type, signal_quality_score, quality_flags, is_rejected, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, 'esp32', ?, ?, ?, ?)
  `).run(
    id,
    userId,
    recordedAt,
    dateKey,
    Number.isNaN(hr) ? null : hr,
    spo2,
    rejected
      ? 'ESP32 MAX30102 sample flagged by Sensor Trust Engine.'
      : 'ESP32 DevKit V1 + MAX30102 optical measurement.',
    deviceIdCode ? `ESP32 (${deviceIdCode})` : 'ESP32 DevKit V1 + MAX30102',
    quality,
    JSON.stringify(flags),
    rejected ? 1 : 0,
    isDemoPacket ? 1 : 0
  );

  // Update device sync timestamp
  db.prepare(`
    UPDATE connected_devices SET last_sync_at = ?, signal_quality = ?, status = 'connected'
    WHERE user_id = ? AND device_type = 'esp32'
  `).run(recordedAt, quality, userId);

  const inserted = db.prepare('SELECT * FROM health_measurements WHERE id = ?').get(id) as MeasurementRow;
  const mapped = mapMeasurement(inserted);
  broadcastToUser(userId, 'measurement', mapped);

  res.status(201).json({ measurement: mapped, state: getFullUserState(userId) });
});

// Wearable Health Export Import (Apple Health JSON/CSV or Health Connect JSON)
app.post('/api/wearables/import', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { provider, records } = req.body ?? {};
  if (!Array.isArray(records) || records.length === 0) {
    res.status(400).json({ error: 'Provide an array of wearable records to import.' });
    return;
  }

  const insert = db.prepare(`
    INSERT INTO health_measurements (
      id, user_id, recorded_at, date_key, heart_rate_bpm, resting_hr_bpm, sleep_hours,
      steps, active_minutes, exercise_minutes, exercise_type, notes, source_device,
      source_type, signal_quality_score, quality_flags, is_rejected, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'smartwatch', 96, '[]', 0, 0)
  `);

  let imported = 0;
  let skippedDuplicates = 0;
  for (const r of records.slice(0, 60)) {
    const dateKey = String(r.dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);
    // Deduplicate same dateKey + smartwatch source
    const dup = db
      .prepare(`SELECT id FROM health_measurements WHERE user_id = ? AND date_key = ? AND source_type = 'smartwatch'`)
      .get(userId, dateKey);
    if (dup) {
      skippedDuplicates++;
      continue;
    }
    insert.run(
      crypto.randomUUID(),
      userId,
      `${dateKey}T08:00:00.000Z`,
      dateKey,
      r.heartRateBpm ?? null,
      r.restingHrBpm ?? null,
      r.sleepHours ?? null,
      r.steps ?? null,
      r.activeMinutes ?? null,
      r.exerciseMinutes ?? null,
      r.exerciseType ?? null,
      `Imported from ${provider || 'Wearable Export'}`,
      String(provider || 'Smartwatch Import')
    );
    imported++;
  }

  db.prepare(`UPDATE connected_devices SET last_sync_at = ? WHERE user_id = ? AND device_type = 'smartwatch'`).run(
    new Date().toISOString(),
    userId
  );

  res.json({ imported, skippedDuplicates, state: getFullUserState(userId) });
});

// ---------------- MEASUREMENTS & LIFESTYLE TRACKER ----------------

app.post('/api/measurements', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const b = req.body ?? {};
  const dateKey = String(b.dateKey || new Date().toISOString().slice(0, 10)).slice(0, 10);
  const recordedAt = b.recordedAt || `${dateKey}T${new Date().toISOString().slice(11)}`;

  const id = crypto.randomUUID();
  db.prepare(`
    INSERT INTO health_measurements (
      id, user_id, recorded_at, date_key, heart_rate_bpm, resting_hr_bpm, spo2_pct, is_experimental_spo2,
      sleep_hours, sleep_start, sleep_end, sleep_consistency_score, steps, active_minutes, exercise_minutes,
      exercise_type, mood_score, energy_score, focus_score, water_liters, screen_time_minutes,
      habits, notes, source_device, source_type, signal_quality_score, quality_flags, is_rejected, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    id,
    userId,
    recordedAt,
    dateKey,
    b.heartRateBpm ?? null,
    b.restingHrBpm ?? null,
    b.spo2Pct ?? null,
    b.isExperimentalSpo2 ? 1 : 0,
    b.sleepHours ?? null,
    b.sleepStart ?? null,
    b.sleepEnd ?? null,
    b.sleepConsistencyScore ?? null,
    b.steps ?? null,
    b.activeMinutes ?? null,
    b.exerciseMinutes ?? null,
    b.exerciseType ?? null,
    b.moodScore ?? null,
    b.energyScore ?? null,
    b.focusScore ?? null,
    b.waterLiters ?? null,
    b.screenTimeMinutes ?? null,
    JSON.stringify(Array.isArray(b.habits) ? b.habits : []),
    String(b.notes || ''),
    String(b.sourceDevice || 'Manual Lifestyle Entry'),
    String(b.sourceType || 'manual'),
    Number(b.signalQualityScore ?? 100),
    JSON.stringify(Array.isArray(b.qualityFlags) ? b.qualityFlags : []),
    b.isDemo ? 1 : 0
  );

  const inserted = db.prepare('SELECT * FROM health_measurements WHERE id = ?').get(id) as MeasurementRow;
  broadcastToUser(userId, 'measurement', mapMeasurement(inserted));
  res.status(201).json({ state: getFullUserState(userId) });
});

app.put('/api/measurements/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const b = req.body ?? {};
  const existing = db.prepare('SELECT id FROM health_measurements WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!existing) {
    res.status(404).json({ error: 'Entry not found.' });
    return;
  }

  db.prepare(`
    UPDATE health_measurements SET
      date_key = COALESCE(?, date_key),
      sleep_hours = ?,
      sleep_start = ?,
      sleep_end = ?,
      steps = ?,
      active_minutes = ?,
      exercise_minutes = ?,
      exercise_type = ?,
      mood_score = ?,
      energy_score = ?,
      focus_score = ?,
      water_liters = ?,
      screen_time_minutes = ?,
      habits = ?,
      notes = ?
    WHERE id = ? AND user_id = ?
  `).run(
    b.dateKey ?? null,
    b.sleepHours ?? null,
    b.sleepStart ?? null,
    b.sleepEnd ?? null,
    b.steps ?? null,
    b.activeMinutes ?? null,
    b.exerciseMinutes ?? null,
    b.exerciseType ?? null,
    b.moodScore ?? null,
    b.energyScore ?? null,
    b.focusScore ?? null,
    b.waterLiters ?? null,
    b.screenTimeMinutes ?? null,
    JSON.stringify(Array.isArray(b.habits) ? b.habits : []),
    String(b.notes || ''),
    req.params.id,
    userId
  );

  res.json({ state: getFullUserState(userId) });
});

app.delete('/api/measurements/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  db.prepare('DELETE FROM health_measurements WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ state: getFullUserState(userId) });
});

app.post('/api/measurements/seed-demo', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const profile = db.prepare('SELECT full_name FROM profiles WHERE user_id = ?').get(userId) as { full_name: string } | undefined;
  seedDemoMeasurements(userId, profile?.full_name || 'User');
  res.json({ state: getFullUserState(userId) });
});

// ---------------- PERSONAL HEALTH MEMORY ----------------

app.post('/api/memory', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { title, observation, category, dateRange, sampleSize, confidence } = req.body ?? {};
  if (!title || !observation) {
    res.status(400).json({ error: 'Title and observation are required.' });
    return;
  }
  db.prepare(`
    INSERT INTO personal_health_memory (id, user_id, title, observation, category, date_range, sample_size, confidence, user_approved, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(
    crypto.randomUUID(),
    userId,
    String(title),
    String(observation),
    String(category || 'energy'),
    String(dateRange || 'Recent records'),
    Number(sampleSize) || 7,
    String(confidence || 'moderate'),
    new Date().toISOString()
  );
  res.status(201).json({ state: getFullUserState(userId) });
});

app.patch('/api/memory/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { userApproved } = req.body ?? {};
  db.prepare('UPDATE personal_health_memory SET user_approved = ? WHERE id = ? AND user_id = ?').run(
    userApproved ? 1 : 0,
    req.params.id,
    userId
  );
  res.json({ state: getFullUserState(userId) });
});

app.delete('/api/memory/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  db.prepare('DELETE FROM personal_health_memory WHERE id = ? AND user_id = ?').run(req.params.id, userId);
  res.json({ state: getFullUserState(userId) });
});

// ---------------- EXPERIMENT LAB ----------------

app.post('/api/experiments', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { title, hypothesis, metricTarget, durationDays, baselineSummary, status } = req.body ?? {};
  if (!title || !hypothesis) {
    res.status(400).json({ error: 'Title and hypothesis are required.' });
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  db.prepare(`
    INSERT INTO experiments (id, user_id, title, hypothesis, metric_target, duration_days, baseline_summary, status, start_date, checkins, result_summary, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '', ?)
  `).run(
    crypto.randomUUID(),
    userId,
    String(title),
    String(hypothesis),
    String(metricTarget || 'energy'),
    Number(durationDays) || 7,
    String(baselineSummary || 'Baseline computed from available personal records'),
    status === 'active' ? 'active' : 'suggested',
    status === 'active' ? today : null,
    new Date().toISOString()
  );
  res.status(201).json({ state: getFullUserState(userId) });
});

app.patch('/api/experiments/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { status, checkin, resultSummary } = req.body ?? {};
  const row = db.prepare('SELECT * FROM experiments WHERE id = ? AND user_id = ?').get(req.params.id, userId) as
    | { checkins: string; start_date: string | null }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Experiment not found.' });
    return;
  }

  let checkins = JSON.parse(row.checkins || '[]');
  if (checkin) {
    checkins = [...checkins, checkin];
  }
  const today = new Date().toISOString().slice(0, 10);

  db.prepare(`
    UPDATE experiments SET
      status = COALESCE(?, status),
      start_date = COALESCE(start_date, ?),
      end_date = CASE WHEN ? = 'completed' THEN ? ELSE end_date END,
      checkins = ?,
      result_summary = COALESCE(?, result_summary)
    WHERE id = ? AND user_id = ?
  `).run(
    status ?? null,
    status === 'active' ? today : null,
    status ?? null,
    today,
    JSON.stringify(checkins),
    resultSummary ?? null,
    req.params.id,
    userId
  );

  res.json({ state: getFullUserState(userId) });
});

// ---------------- HABIT CHALLENGES ----------------

app.post('/api/challenges', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { title, description, targetMetric, durationDays } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: 'Challenge title is required.' });
    return;
  }
  db.prepare(`
    INSERT INTO habit_challenges (id, user_id, title, description, target_metric, duration_days, status, checkins, baseline_value, outcome_value, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 'active', '[]', 'Starting baseline', 'In progress', ?)
  `).run(
    crypto.randomUUID(),
    userId,
    String(title),
    String(description || ''),
    String(targetMetric || 'Daily Adherence'),
    Number(durationDays) || 7,
    new Date().toISOString()
  );
  res.status(201).json({ state: getFullUserState(userId) });
});

app.patch('/api/challenges/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { status, toggleDateKey } = req.body ?? {};
  const row = db.prepare('SELECT * FROM habit_challenges WHERE id = ? AND user_id = ?').get(req.params.id, userId) as
    | { checkins: string; duration_days: number }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Challenge not found.' });
    return;
  }
  let checkins: Array<{ dateKey: string; completed: boolean }> = JSON.parse(row.checkins || '[]');
  if (toggleDateKey) {
    const idx = checkins.findIndex((c) => c.dateKey === toggleDateKey);
    if (idx >= 0) {
      checkins[idx].completed = !checkins[idx].completed;
    } else {
      checkins.push({ dateKey: toggleDateKey, completed: true });
    }
  }
  const doneCount = checkins.filter((c) => c.completed).length;
  const outcomeValue = `${doneCount} of ${row.duration_days} days adhered`;
  db.prepare(`
    UPDATE habit_challenges SET
      status = COALESCE(?, status),
      checkins = ?,
      outcome_value = ?
    WHERE id = ? AND user_id = ?
  `).run(status ?? null, JSON.stringify(checkins), outcomeValue, req.params.id, userId);

  res.json({ state: getFullUserState(userId) });
});

// ---------------- AGENTIC WELLNESS COACH GOALS ----------------

app.post('/api/coach/goals', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { title, rationale, scheduleText } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: 'Goal title is required.' });
    return;
  }
  db.prepare(`
    INSERT INTO wellness_goals (id, user_id, title, rationale, schedule_text, status, progress_pct, checkins, created_at)
    VALUES (?, ?, ?, ?, ?, 'pending_approval', 0, '[]', ?)
  `).run(
    crypto.randomUUID(),
    userId,
    String(title),
    String(rationale || 'Personalized wellness goal'),
    String(scheduleText || 'Weekly check-in'),
    new Date().toISOString()
  );
  res.status(201).json({ state: getFullUserState(userId) });
});

app.patch('/api/coach/goals/:id', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { status, title, scheduleText, checkinNote } = req.body ?? {};
  const row = db.prepare('SELECT * FROM wellness_goals WHERE id = ? AND user_id = ?').get(req.params.id, userId) as
    | { checkins: string; progress_pct: number }
    | undefined;
  if (!row) {
    res.status(404).json({ error: 'Goal not found.' });
    return;
  }
  const checkins = JSON.parse(row.checkins || '[]');
  let progress = row.progress_pct;
  if (checkinNote) {
    checkins.push({
      dateKey: new Date().toISOString().slice(0, 10),
      note: String(checkinNote),
      status: 'completed',
    });
    progress = Math.min(100, progress + 25);
  }
  if (status === 'completed') progress = 100;

  db.prepare(`
    UPDATE wellness_goals SET
      status = COALESCE(?, status),
      title = COALESCE(?, title),
      schedule_text = COALESCE(?, schedule_text),
      progress_pct = ?,
      checkins = ?
    WHERE id = ? AND user_id = ?
  `).run(status ?? null, title ?? null, scheduleText ?? null, progress, JSON.stringify(checkins), req.params.id, userId);

  res.json({ state: getFullUserState(userId) });
});

// ---------------- PRIVACY, EXPORT & ACCOUNT DELETION ----------------

app.put('/api/privacy', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const p = req.body ?? {};
  db.prepare(`
    UPDATE privacy_preferences SET
      local_first_mode = COALESCE(?, local_first_mode),
      ai_cloud_consent = COALESCE(?, ai_cloud_consent),
      wearable_sync_consent = COALESCE(?, wearable_sync_consent),
      esp32_cloud_consent = COALESCE(?, esp32_cloud_consent),
      share_anonymized_summaries = COALESCE(?, share_anonymized_summaries),
      updated_at = ?
    WHERE user_id = ?
  `).run(
    p.localFirstMode !== undefined ? (p.localFirstMode ? 1 : 0) : null,
    p.aiCloudConsent !== undefined ? (p.aiCloudConsent ? 1 : 0) : null,
    p.wearableSyncConsent !== undefined ? (p.wearableSyncConsent ? 1 : 0) : null,
    p.esp32CloudConsent !== undefined ? (p.esp32CloudConsent ? 1 : 0) : null,
    p.shareAnonymizedSummaries !== undefined ? (p.shareAnonymizedSummaries ? 1 : 0) : null,
    new Date().toISOString(),
    userId
  );
  res.json({ state: getFullUserState(userId) });
});

app.get('/api/export', requireAuth, (req: AuthenticatedRequest, res) => {
  const state = getFullUserState(req.auth!.userId);
  res.setHeader('Content-Disposition', 'attachment; filename="lifetwin-personal-health-export.json"');
  res.json(state);
});

app.delete('/api/records', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  db.prepare('DELETE FROM health_measurements WHERE user_id = ?').run(userId);
  db.prepare('DELETE FROM chat_history WHERE user_id = ?').run(userId);
  res.json({ state: getFullUserState(userId) });
});

app.delete('/api/account', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const user = db.prepare('SELECT is_demo FROM users WHERE id = ?').get(userId) as { is_demo: number } | undefined;
  if (user?.is_demo === 1) {
    res.status(400).json({ error: 'The shared Demo Explorer account cannot be deleted. Create a private account to test full deletion.' });
    return;
  }
  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  res.json({ deleted: true });
});

// ---------------- AI ASSISTANT & COMPARE TWO MOMENTS ----------------

app.post('/api/ai/chat', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { message } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'Message is required.' });
    return;
  }

  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO chat_history (id, user_id, role, content, references_json, is_demo_response, created_at)
    VALUES (?, ?, 'user', ?, '[]', 0, ?)
  `).run(crypto.randomUUID(), userId, message.trim(), now);

  const profile = db.prepare('SELECT full_name, goals FROM profiles WHERE user_id = ?').get(userId) as
    | { full_name: string; goals: string }
    | undefined;
  const privacy = db.prepare('SELECT local_first_mode, ai_cloud_consent FROM privacy_preferences WHERE user_id = ?').get(userId) as
    | { local_first_mode: number; ai_cloud_consent: number }
    | undefined;
  const measurements = db
    .prepare('SELECT * FROM health_measurements WHERE user_id = ? ORDER BY date_key ASC, recorded_at ASC')
    .all(userId) as MeasurementRow[];

  const aiResult = await generateAssistantResponse({
    question: message.trim(),
    profileName: profile?.full_name || 'Member',
    measurements,
    goals: JSON.parse(profile?.goals || '[]'),
    localFirstMode: privacy?.local_first_mode === 1,
    aiCloudConsent: privacy?.ai_cloud_consent !== 0,
  });

  db.prepare(`
    INSERT INTO chat_history (id, user_id, role, content, references_json, is_demo_response, created_at)
    VALUES (?, ?, 'assistant', ?, ?, ?, ?)
  `).run(
    crypto.randomUUID(),
    userId,
    aiResult.reply,
    JSON.stringify(aiResult.references),
    aiResult.isDemoResponse ? 1 : 0,
    new Date().toISOString()
  );

  res.json({ state: getFullUserState(userId) });
});

app.post('/api/ai/compare-moments', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { dateA, dateB } = req.body ?? {};
  if (!dateA || !dateB) {
    res.status(400).json({ error: 'Both dateA and dateB are required.' });
    return;
  }

  const recordA = db
    .prepare('SELECT * FROM health_measurements WHERE user_id = ? AND date_key = ? AND is_rejected = 0 ORDER BY recorded_at DESC LIMIT 1')
    .get(userId, String(dateA)) as MeasurementRow | undefined;
  const recordB = db
    .prepare('SELECT * FROM health_measurements WHERE user_id = ? AND date_key = ? AND is_rejected = 0 ORDER BY recorded_at DESC LIMIT 1')
    .get(userId, String(dateB)) as MeasurementRow | undefined;
  const privacy = db.prepare('SELECT local_first_mode, ai_cloud_consent FROM privacy_preferences WHERE user_id = ?').get(userId) as
    | { local_first_mode: number; ai_cloud_consent: number }
    | undefined;

  const result = await explainTwoMoments({
    dateA: String(dateA),
    dateB: String(dateB),
    recordA: recordA ?? null,
    recordB: recordB ?? null,
    localFirstMode: privacy?.local_first_mode === 1,
    aiCloudConsent: privacy?.ai_cloud_consent !== 0,
  });

  res.json({
    recordA: recordA ? mapMeasurement(recordA) : null,
    recordB: recordB ? mapMeasurement(recordB) : null,
    explanation: result.explanation,
    isDemoResponse: result.isDemoResponse,
  });
});

// ---------------- SERVER STARTUP (VITE + STATIC) ----------------

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LifeTwin AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
