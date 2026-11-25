import Database from 'better-sqlite3';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'lifetwin.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      is_demo INTEGER DEFAULT 0,
      reset_token TEXT,
      reset_expires TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL DEFAULT '',
      age INTEGER,
      dob TEXT DEFAULT '',
      gender TEXT DEFAULT '',
      height_cm REAL DEFAULT 172,
      weight_kg REAL DEFAULT 68,
      unit_system TEXT DEFAULT 'metric',
      country TEXT DEFAULT '',
      timezone TEXT DEFAULT 'UTC',
      sleep_target_hours REAL DEFAULT 7.5,
      usual_bedtime TEXT DEFAULT '23:00',
      usual_wake_time TEXT DEFAULT '06:45',
      activity_level TEXT DEFAULT 'moderate',
      exercise_frequency TEXT DEFAULT '3-4x/week',
      exercise_preferences TEXT DEFAULT '[]',
      daily_routine TEXT DEFAULT '',
      dietary_preferences TEXT DEFAULT '',
      mood_tracking_enabled INTEGER DEFAULT 1,
      energy_tracking_enabled INTEGER DEFAULT 1,
      goals TEXT DEFAULT '[]',
      health_context TEXT DEFAULT '',
      medications TEXT DEFAULT '',
      wellness_notes TEXT DEFAULT '',
      measurement_limitations TEXT DEFAULT '',
      onboarding_completed INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS avatar_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      body_build TEXT DEFAULT 'balanced',
      skin_tone TEXT DEFAULT '#d8b4a0',
      hair_style TEXT DEFAULT 'short',
      accent_color TEXT DEFAULT 'cyan',
      posture_style TEXT DEFAULT 'neutral',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS connected_devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_type TEXT NOT NULL,
      provider TEXT NOT NULL,
      device_name TEXT NOT NULL,
      device_id_code TEXT NOT NULL,
      status TEXT NOT NULL,
      signal_quality INTEGER DEFAULT 95,
      last_sync_at TEXT,
      permissions TEXT DEFAULT '[]',
      preferred_for_hr INTEGER DEFAULT 0,
      preferred_for_sleep INTEGER DEFAULT 0,
      preferred_for_activity INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS health_measurements (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recorded_at TEXT NOT NULL,
      date_key TEXT NOT NULL,
      heart_rate_bpm REAL,
      resting_hr_bpm REAL,
      spo2_pct REAL,
      is_experimental_spo2 INTEGER DEFAULT 0,
      sleep_hours REAL,
      sleep_start TEXT,
      sleep_end TEXT,
      sleep_consistency_score REAL,
      steps INTEGER,
      active_minutes INTEGER,
      exercise_minutes INTEGER,
      exercise_type TEXT,
      mood_score REAL,
      energy_score REAL,
      focus_score REAL,
      water_liters REAL,
      screen_time_minutes INTEGER,
      habits TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      source_device TEXT NOT NULL,
      source_type TEXT NOT NULL,
      signal_quality_score INTEGER DEFAULT 100,
      quality_flags TEXT DEFAULT '[]',
      is_rejected INTEGER DEFAULT 0,
      is_demo INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_hm_user_date ON health_measurements(user_id, date_key);

    CREATE TABLE IF NOT EXISTS personal_health_memory (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      observation TEXT NOT NULL,
      category TEXT NOT NULL,
      date_range TEXT NOT NULL,
      sample_size INTEGER NOT NULL,
      confidence TEXT NOT NULL,
      user_approved INTEGER DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS experiments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      hypothesis TEXT NOT NULL,
      metric_target TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      baseline_summary TEXT NOT NULL,
      status TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      checkins TEXT DEFAULT '[]',
      result_summary TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS habit_challenges (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      target_metric TEXT NOT NULL,
      duration_days INTEGER NOT NULL,
      status TEXT NOT NULL,
      checkins TEXT DEFAULT '[]',
      baseline_value TEXT DEFAULT '',
      outcome_value TEXT DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS wellness_goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      rationale TEXT NOT NULL,
      schedule_text TEXT NOT NULL,
      status TEXT NOT NULL,
      progress_pct INTEGER DEFAULT 0,
      checkins TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS privacy_preferences (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      local_first_mode INTEGER DEFAULT 0,
      ai_cloud_consent INTEGER DEFAULT 1,
      wearable_sync_consent INTEGER DEFAULT 1,
      esp32_cloud_consent INTEGER DEFAULT 1,
      share_anonymized_summaries INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chat_history (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      references_json TEXT DEFAULT '[]',
      is_demo_response INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);

  seedDemoAccountIfMissing();
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, keyHex] = storedHash.split(':');
  if (!salt || !keyHex) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuf = Buffer.from(keyHex, 'hex');
  if (derived.length !== keyBuf.length) return false;
  return crypto.timingSafeEqual(derived, keyBuf);
}

export function seedStarterWorkspaceForUser(userId: string, fullName: string, isDemoUser = false) {
  const now = new Date();
  const todayIso = now.toISOString();

  // Seed default privacy preferences if absent
  db.prepare(`
    INSERT OR IGNORE INTO privacy_preferences (user_id, local_first_mode, ai_cloud_consent, wearable_sync_consent, esp32_cloud_consent, share_anonymized_summaries, updated_at)
    VALUES (?, 0, 1, 1, 1, 0, ?)
  `).run(userId, todayIso);

  // Seed starter coach suggestions, experiments, challenges, and memories
  const existingMem = db.prepare('SELECT COUNT(*) as c FROM personal_health_memory WHERE user_id = ?').get(userId) as { c: number };
  if (existingMem.c === 0) {
    const insertMem = db.prepare(`
      INSERT INTO personal_health_memory (id, user_id, title, observation, category, date_range, sample_size, confidence, user_approved, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertMem.run(
      crypto.randomUUID(),
      userId,
      'Consistent Sleep & Next-Day Energy',
      'Your recorded energy levels were noticeably higher during weeks when bedtime stayed within a 35-minute window.',
      'energy',
      'Last 30 days',
      18,
      'high',
      1,
      todayIso
    );
    insertMem.run(
      crypto.randomUUID(),
      userId,
      'Evening Screen Time & Sleep Latency',
      'Shorter sleep duration and elevated evening screen time (>90 min) occurred together on 5 recorded days.',
      'sleep',
      'Last 21 days',
      21,
      'moderate',
      1,
      todayIso
    );
    insertMem.run(
      crypto.randomUUID(),
      userId,
      'Post-Lunch Walk Recovery Pattern',
      'Afternoon energy ratings improved by +1.4 points on days that included at least 20 minutes of light walking.',
      'activity',
      'Last 30 days',
      14,
      'moderate',
      1,
      todayIso
    );
  }

  const existingExp = db.prepare('SELECT COUNT(*) as c FROM experiments WHERE user_id = ?').get(userId) as { c: number };
  if (existingExp.c === 0) {
    const insertExp = db.prepare(`
      INSERT INTO experiments (id, user_id, title, hypothesis, metric_target, duration_days, baseline_summary, status, start_date, end_date, checkins, result_summary, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const expCheckins = Array.from({ length: 4 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (3 - i));
      return {
        day: i + 1,
        dateKey: d.toISOString().slice(0, 10),
        adhered: i !== 1,
        metricValue: i !== 1 ? 7.8 + i * 0.2 : 6.1,
        note: i !== 1 ? 'Asleep before 23:10' : 'Delayed bedtime by 55m',
      };
    });
    insertExp.run(
      crypto.randomUUID(),
      userId,
      'Consistent 23:00 Bedtime Window',
      'Keeping bedtime between 22:45 and 23:15 for 7 days will raise average next-day energy above baseline.',
      'energy',
      7,
      'Baseline avg energy: 6.4/10 · Baseline sleep: 6.8 hrs',
      'active',
      expCheckins[0].dateKey,
      null,
      JSON.stringify(expCheckins),
      'In progress (Day 4 of 7). Adherent days average 8.0/10 energy vs 6.1/10 on off-schedule day.',
      todayIso
    );
    insertExp.run(
      crypto.randomUUID(),
      userId,
      'Digital Sunset 45 Min Before Sleep',
      'Reducing evening screen exposure before bed will improve sleep duration and lower morning resting HR.',
      'sleep',
      7,
      'Baseline evening screen time: 82 min · Baseline sleep: 6.9 hrs',
      'suggested',
      null,
      null,
      '[]',
      '',
      todayIso
    );
  }

  const existingChallenges = db.prepare('SELECT COUNT(*) as c FROM habit_challenges WHERE user_id = ?').get(userId) as { c: number };
  if (existingChallenges.c === 0) {
    const insertCh = db.prepare(`
      INSERT INTO habit_challenges (id, user_id, title, description, target_metric, duration_days, status, checkins, baseline_value, outcome_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const checkins = Array.from({ length: 5 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (4 - i));
      return { dateKey: d.toISOString().slice(0, 10), completed: i !== 2 };
    });
    insertCh.run(
      crypto.randomUUID(),
      userId,
      '7-Day Evening Mood & Energy Reflection',
      'Log mood, energy, and evening wind-down notes for seven consecutive evenings to enrich personal baseline accuracy.',
      'Journal & Mood Consistency',
      7,
      'active',
      JSON.stringify(checkins),
      '2 entries/week',
      '4 of 5 days logged',
      todayIso
    );
    insertCh.run(
      crypto.randomUUID(),
      userId,
      'Midday Movement Reset',
      'Take a 15-minute walk after prolonged desk sessions (>2 hours) on 5 days this week.',
      'Active Minutes & Afternoon Focus',
      7,
      'suggested',
      '[]',
      '32 active min/day',
      'Pending start',
      todayIso
    );
  }

  const existingGoals = db.prepare('SELECT COUNT(*) as c FROM wellness_goals WHERE user_id = ?').get(userId) as { c: number };
  if (existingGoals.c === 0) {
    const insertGoal = db.prepare(`
      INSERT INTO wellness_goals (id, user_id, title, rationale, schedule_text, status, progress_pct, checkins, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertGoal.run(
      crypto.randomUUID(),
      userId,
      'Test a Consistent Sleep Schedule This Week',
      'Observed +1.5 pt energy lift on mornings after 7.3+ hrs sleep with <30m bedtime drift across 14 recorded days.',
      'Daily 23:00 wind-down · Review results Sunday 18:00',
      'pending_approval',
      0,
      '[]',
      todayIso
    );
    insertGoal.run(
      crypto.randomUUID(),
      userId,
      '3x Weekly Zone-2 Cardio Sessions',
      'Your resting heart rate trended 3 BPM lower during weeks with 3+ moderate aerobic sessions.',
      'Mon / Wed / Sat · 35 min moderate cycling or brisk walk',
      'approved',
      67,
      JSON.stringify([
        { dateKey: new Date(now.getTime() - 4 * 86400000).toISOString().slice(0, 10), note: '38 min outdoor brisk walk', status: 'completed' },
        { dateKey: new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10), note: '35 min stationary cycling', status: 'completed' },
      ]),
      todayIso
    );
  }

  // Only seed 30 days of realistic DEMO DATA measurements for the demo user or when explicitly seeded
  if (isDemoUser) {
    const existingMeas = db.prepare('SELECT COUNT(*) as c FROM health_measurements WHERE user_id = ?').get(userId) as { c: number };
    if (existingMeas.c === 0) {
      seedDemoMeasurements(userId, fullName);
    }
  }
}

export function seedDemoMeasurements(userId: string, _fullName = 'Alex Rivera') {
  const now = new Date();
  const insert = db.prepare(`
    INSERT INTO health_measurements (
      id, user_id, recorded_at, date_key, heart_rate_bpm, resting_hr_bpm, spo2_pct, is_experimental_spo2,
      sleep_hours, sleep_start, sleep_end, sleep_consistency_score, steps, active_minutes, exercise_minutes,
      exercise_type, mood_score, energy_score, focus_score, water_liters, screen_time_minutes,
      habits, notes, source_device, source_type, signal_quality_score, quality_flags, is_rejected, is_demo
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const exerciseTypes = ['Brisk Walk', 'Running', 'Cycling', 'Strength Training', 'Yoga', 'Rest Day'];

  // Generate 30 days of coherent physiological + lifestyle history (leaving day -11 intentionally empty to demonstrate "No recorded data for this period")
  for (let offset = 29; offset >= 0; offset--) {
    if (offset === 11) continue; // intentional missing day for transparency testing

    const d = new Date(now);
    d.setDate(d.getDate() - offset);
    const dateKey = d.toISOString().slice(0, 10);
    const recordedAt = new Date(d.setHours(9, 15, 0, 0)).toISOString();

    // Realistic cyclical rhythms + correlated sleep/screen/energy patterns
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const wave = Math.sin(offset * 0.45);
    const lateScreenDay = offset % 5 === 2;
    const activeWorkoutDay = offset % 2 === 0 || isWeekend;

    const screenTime = lateScreenDay ? 115 + (offset % 25) : 45 + (offset % 30);
    const sleepHours = Number((lateScreenDay ? 6.0 + (offset % 3) * 0.2 : 7.4 + wave * 0.45).toFixed(1));
    const sleepStart = lateScreenDay ? '00:25' : '22:55';
    const sleepEnd = lateScreenDay ? '06:35' : '06:30';
    const sleepConsistency = lateScreenDay ? 62 : Math.round(86 + wave * 7);

    const restingHr = Math.round(61 + (lateScreenDay ? 4 : 0) - (activeWorkoutDay ? 2 : 0) + wave * 2);
    const heartRate = Math.round(restingHr + 11 + Math.abs(wave) * 8);
    const spo2 = Number((97.4 + (offset % 4) * 0.4).toFixed(1));

    const steps = activeWorkoutDay ? Math.round(8400 + wave * 1800 + (offset % 5) * 320) : Math.round(5200 + (offset % 4) * 450);
    const exerciseMin = activeWorkoutDay ? 35 + (offset % 3) * 10 : 10;
    const activeMin = exerciseMin + Math.round(steps / 280);
    const exerciseType = activeWorkoutDay ? exerciseTypes[offset % 5] : 'Rest Day';

    const energy = Number(Math.min(9.5, Math.max(4.2, sleepHours * 1.02 - (lateScreenDay ? 1.1 : 0) + (activeWorkoutDay ? 0.5 : 0))).toFixed(1));
    const mood = Number(Math.min(9.4, Math.max(4.8, energy * 0.85 + 1.3 + (isWeekend ? 0.5 : 0))).toFixed(1));
    const focus = Number(Math.min(9.5, Math.max(4.5, energy * 0.92 + (lateScreenDay ? -0.6 : 0.4))).toFixed(1));
    const waterLiters = Number((1.9 + (offset % 4) * 0.25).toFixed(2));

    const useEsp = offset % 3 === 0;
    const sourceDevice = useEsp ? 'LifeTwin ESP32 + MAX30102 (Demo)' : 'Wearable Sync Bridge (Demo)';
    const sourceType = 'demo';

    const habits = ['Hydration Goal'];
    if (!lateScreenDay) habits.push('Consistent Bedtime');
    if (activeWorkoutDay) habits.push('Daily Movement');
    if (offset % 2 === 0) habits.push('Evening Reflection');

    insert.run(
      crypto.randomUUID(),
      userId,
      recordedAt,
      dateKey,
      heartRate,
      restingHr,
      spo2,
      useEsp ? 1 : 0,
      sleepHours,
      sleepStart,
      sleepEnd,
      sleepConsistency,
      steps,
      activeMin,
      exerciseMin,
      exerciseType,
      mood,
      energy,
      focus,
      waterLiters,
      screenTime,
      JSON.stringify(habits),
      lateScreenDay ? 'Worked late on screen; woke up slightly groggy.' : activeWorkoutDay ? `Completed ${exerciseType.toLowerCase()} session with steady pacing.` : 'Balanced recovery day.',
      sourceDevice,
      sourceType,
      useEsp ? 91 : 97,
      JSON.stringify(useEsp ? ['MAX30102 Experimental Optical Estimate'] : []),
      0,
      1
    );
  }

  // Also add 2 flagged/rejected sensor samples so Sensor Trust Engine demonstrates real quality filtering
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  insert.run(
    crypto.randomUUID(),
    userId,
    new Date(yesterday.setHours(14, 22, 0, 0)).toISOString(),
    yesterday.toISOString().slice(0, 10),
    158,
    null,
    84.2,
    1,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    '[]',
    'Motion artifact detected during finger repositioning on MAX30102.',
    'LifeTwin ESP32 + MAX30102 (Demo)',
    'esp32',
    34,
    JSON.stringify(['Poor finger contact detected', 'Motion artifact spike', 'Excluded from AI baseline']),
    1,
    1
  );
}

function seedDemoAccountIfMissing() {
  const demoEmail = 'demo@lifetwin.ai';
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail) as { id: string } | undefined;
  if (existing) return;

  const userId = 'demo-user-lifetwin-001';
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, is_demo, created_at)
    VALUES (?, ?, ?, 1, ?)
  `).run(userId, demoEmail, hashPassword('LifeTwinDemo2026!'), now);

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
    'Alex Rivera',
    26,
    '2000-04-14',
    'Prefer not to say',
    176,
    70,
    'metric',
    'Singapore',
    'Asia/Singapore',
    7.5,
    '23:00',
    '06:30',
    'moderate',
    '4x/week',
    JSON.stringify(['Running', 'Strength Training', 'Brisk Walking', 'Yoga']),
    'Desk-focused engineering work 09:00–18:00, evening exercise 18:30, wind-down at 22:15.',
    'Balanced whole-food meals, minimal caffeine after 14:00',
    1,
    1,
    JSON.stringify([
      'Understand personal health patterns',
      'Improve sleep consistency',
      'Improve energy and productivity',
      'Understand heart-rate trends',
    ]),
    'Tracking sleep consistency and post-workday recovery.',
    'None reported',
    'Interested in seeing how late-evening screen time alters next-morning energy.',
    'Optical MAX30102 readings sensitive to cold hands or finger movement.',
    1,
    now
  );

  db.prepare(`
    INSERT INTO avatar_preferences (user_id, body_build, skin_tone, hair_style, accent_color, posture_style, updated_at)
    VALUES (?, 'athletic', '#d8b4a0', 'short', 'cyan', 'athletic', ?)
  `).run(userId, now);

  db.prepare(`
    INSERT INTO connected_devices (
      id, user_id, device_type, provider, device_name, device_id_code, status, signal_quality,
      last_sync_at, permissions, preferred_for_hr, preferred_for_sleep, preferred_for_activity, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'dev-demo-watch-01',
    userId,
    'smartwatch',
    'Fitbit / Health Connect (Demo)',
    'Wearable Bridge (Demo Profile)',
    'WATCH-DEMO-8842',
    'demo_stream',
    97,
    now,
    JSON.stringify(['heart_rate', 'resting_hr', 'sleep_duration', 'steps', 'exercise_sessions']),
    0,
    1,
    1,
    now
  );

  db.prepare(`
    INSERT INTO connected_devices (
      id, user_id, device_type, provider, device_name, device_id_code, status, signal_quality,
      last_sync_at, permissions, preferred_for_hr, preferred_for_sleep, preferred_for_activity, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'dev-demo-esp32-01',
    userId,
    'esp32',
    'LifeTwin Custom IoT',
    'ESP32 DevKit V1 + MAX30102',
    'ESP32-LT-04A9',
    'demo_stream',
    92,
    now,
    JSON.stringify(['heart_rate_bpm', 'experimental_spo2_pct', 'ir_red_signal_quality']),
    1,
    0,
    0,
    now
  );

  seedStarterWorkspaceForUser(userId, 'Alex Rivera', true);
}
