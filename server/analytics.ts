import { GoogleGenAI } from '@google/genai';

export interface MeasurementRow {
  id: string;
  user_id: string;
  recorded_at: string;
  date_key: string;
  heart_rate_bpm: number | null;
  resting_hr_bpm: number | null;
  spo2_pct: number | null;
  is_experimental_spo2: number;
  sleep_hours: number | null;
  sleep_start: string | null;
  sleep_end: string | null;
  sleep_consistency_score: number | null;
  steps: number | null;
  active_minutes: number | null;
  exercise_minutes: number | null;
  exercise_type: string | null;
  mood_score: number | null;
  energy_score: number | null;
  focus_score: number | null;
  water_liters: number | null;
  screen_time_minutes: number | null;
  habits: string;
  notes: string;
  source_device: string;
  source_type: string;
  signal_quality_score: number;
  quality_flags: string;
  is_rejected: number;
  is_demo: number;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
  });
}

function avg(nums: Array<number | null | undefined>): number | null {
  const valid = nums.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
}

export function buildUserContextSummary(
  profileName: string,
  measurements: MeasurementRow[],
  goals: string[]
) {
  const valid = measurements.filter((m) => m.is_rejected === 0);
  const last7 = valid.slice(-7);
  const prev7 = valid.slice(-14, -7);

  const summary = {
    userName: profileName || 'User',
    totalRecordedSamples: valid.length,
    rejectedSamplesCount: measurements.length - valid.length,
    dateRange:
      valid.length > 0
        ? `${valid[0].date_key} to ${valid[valid.length - 1].date_key}`
        : 'No recorded dates yet',
    goals,
    last7Days: {
      count: last7.length,
      avgSleepHours: avg(last7.map((m) => m.sleep_hours)),
      avgHeartRateBpm: avg(last7.map((m) => m.heart_rate_bpm)),
      avgRestingHrBpm: avg(last7.map((m) => m.resting_hr_bpm)),
      avgSpo2Pct: avg(last7.map((m) => m.spo2_pct)),
      avgSteps: avg(last7.map((m) => m.steps)),
      avgEnergy: avg(last7.map((m) => m.energy_score)),
      avgMood: avg(last7.map((m) => m.mood_score)),
      avgScreenTimeMin: avg(last7.map((m) => m.screen_time_minutes)),
    },
    previous7Days: {
      count: prev7.length,
      avgSleepHours: avg(prev7.map((m) => m.sleep_hours)),
      avgRestingHrBpm: avg(prev7.map((m) => m.resting_hr_bpm)),
      avgSteps: avg(prev7.map((m) => m.steps)),
      avgEnergy: avg(prev7.map((m) => m.energy_score)),
      avgMood: avg(prev7.map((m) => m.mood_score)),
    },
    recentEntries: last7.map((m) => ({
      date: m.date_key,
      hr: m.heart_rate_bpm,
      rhr: m.resting_hr_bpm,
      spo2: m.spo2_pct,
      sleepHrs: m.sleep_hours,
      steps: m.steps,
      energy: m.energy_score,
      mood: m.mood_score,
      screenMin: m.screen_time_minutes,
      source: m.source_device,
      isDemo: m.is_demo === 1,
    })),
  };

  return summary;
}

function buildLocalDeterministicReply(
  question: string,
  ctx: ReturnType<typeof buildUserContextSummary>,
  reason: 'local_first' | 'no_api_key' | 'consent_disabled'
): {
  reply: string;
  references: Array<{ label: string; dateRange?: string; metric?: string }>;
  isDemoResponse: boolean;
} {
  const q = question.toLowerCase();
  const modeNote =
    reason === 'local_first'
      ? 'Processed locally on your server/device (Local-First Intelligence Mode active — external AI disabled).'
      : reason === 'consent_disabled'
      ? 'Processed locally because external AI cloud consent is turned off in Settings & Privacy.'
      : 'Processed by LifeTwin Local Intelligence Engine (configure GEMINI_API_KEY for conversational Gemini synthesis).';

  if (ctx.totalRecordedSamples === 0) {
    return {
      reply: `There are currently no accepted measurements in your account yet. Log your first entry in the Lifestyle Tracker or connect your smartwatch or ESP32 sensor to start uncovering personal trends.\n\n_${modeNote}_`,
      references: [{ label: 'Account Data Status', metric: '0 samples' }],
      isDemoResponse: reason === 'no_api_key',
    };
  }

  const l7 = ctx.last7Days;
  const p7 = ctx.previous7Days;
  const refs: Array<{ label: string; dateRange?: string; metric?: string }> = [
    { label: `${ctx.totalRecordedSamples} verified records`, dateRange: ctx.dateRange },
  ];

  let body = '';
  if (q.includes('sleep') && (q.includes('energy') || q.includes('relationship') || q.includes('pattern'))) {
    const highSleepDays = ctx.recentEntries.filter((d) => (d.sleepHrs ?? 0) >= 7.2);
    const lowSleepDays = ctx.recentEntries.filter((d) => d.sleepHrs !== null && d.sleepHrs < 7.2);
    const highE = avg(highSleepDays.map((d) => d.energy));
    const lowE = avg(lowSleepDays.map((d) => d.energy));
    body = `Across your last ${l7.count} recorded days, days with ≥ 7.2 hours of sleep (${highSleepDays.length} days) averaged ${highE ?? 'N/A'}/10 energy, compared with ${lowE ?? 'N/A'}/10 on shorter sleep nights (${lowSleepDays.length} days). This indicates an observed co-occurrence in your records, though workload, hydration, and stress may also contribute.`;
    refs.push({ label: 'Sleep & Energy Correlation', metric: `Avg Sleep ${l7.avgSleepHours ?? 'N/A'}h · Avg Energy ${l7.avgEnergy ?? 'N/A'}/10` });
  } else if (q.includes('heart') || q.includes('hr') || q.includes('spo2')) {
    body = `Over the last ${l7.count} recorded days, your average recorded heart rate was ${l7.avgHeartRateBpm ?? 'N/A'} BPM with a resting heart rate average of ${l7.avgRestingHrBpm ?? 'N/A'} BPM (previous 7-day resting avg: ${p7.avgRestingHrBpm ?? 'N/A'} BPM). Experimental SpO2 estimates averaged ${l7.avgSpo2Pct ?? 'N/A'}%. Note: MAX30102 optical SpO2 values are experimental wellness estimates and not clinically validated.`;
    refs.push({ label: 'Cardiovascular Telemetry', metric: `${l7.avgHeartRateBpm ?? 'N/A'} BPM avg` });
  } else if (q.includes('compare') || q.includes('last month') || q.includes('previous week')) {
    const sleepDelta = l7.avgSleepHours && p7.avgSleepHours ? (l7.avgSleepHours - p7.avgSleepHours).toFixed(2) : null;
    const stepDelta = l7.avgSteps && p7.avgSteps ? Math.round(l7.avgSteps - p7.avgSteps) : null;
    const energyDelta = l7.avgEnergy && p7.avgEnergy ? (l7.avgEnergy - p7.avgEnergy).toFixed(2) : null;
    body = `Week-over-week comparison (${l7.count} recent days vs ${p7.count} prior days):\n• Sleep duration: ${l7.avgSleepHours ?? 'N/A'}h vs ${p7.avgSleepHours ?? 'N/A'}h (${sleepDelta ? (Number(sleepDelta) >= 0 ? '+' : '') + sleepDelta + 'h' : 'insufficient prior data'})\n• Daily steps: ${l7.avgSteps ? Math.round(l7.avgSteps) : 'N/A'} vs ${p7.avgSteps ? Math.round(p7.avgSteps) : 'N/A'} (${stepDelta !== null ? (stepDelta >= 0 ? '+' : '') + stepDelta : 'N/A'})\n• Self-reported energy: ${l7.avgEnergy ?? 'N/A'}/10 vs ${p7.avgEnergy ?? 'N/A'}/10 (${energyDelta ? (Number(energyDelta) >= 0 ? '+' : '') + energyDelta : 'N/A'}).`;
    refs.push({ label: '7-Day Period Comparison', dateRange: ctx.dateRange });
  } else if (q.includes('experiment')) {
    body = `Based on your recent 7-day average evening screen time (${l7.avgScreenTimeMin ? Math.round(l7.avgScreenTimeMin) : 'N/A'} min) and sleep duration (${l7.avgSleepHours ?? 'N/A'}h), a practical 7-day N-of-1 experiment would be: "Pause screens 45 minutes before your usual bedtime and track next-morning energy." You can review and approve this in the Experiment Lab.`;
    refs.push({ label: 'Suggested N-of-1 Experiment', metric: 'Evening Screen Reduction' });
  } else {
    body = `Here is a grounded summary across your last ${l7.count} recorded days (${ctx.dateRange}):\n• Sleep: ${l7.avgSleepHours ?? 'N/A'} hrs/night average\n• Resting Heart Rate: ${l7.avgRestingHrBpm ?? 'N/A'} BPM average\n• Daily Steps: ${l7.avgSteps ? Math.round(l7.avgSteps).toLocaleString() : 'N/A'} steps/day\n• Energy & Mood: ${l7.avgEnergy ?? 'N/A'}/10 energy, ${l7.avgMood ?? 'N/A'}/10 mood.\nAsk specifically about sleep-energy links, heart rate trends, week-over-week comparisons, or experiment ideas to dive deeper.`;
    refs.push({ label: '7-Day Wellness Summary', dateRange: ctx.dateRange });
  }

  return {
    reply: `${body}\n\n${modeNote}`,
    references: refs,
    isDemoResponse: reason === 'no_api_key',
  };
}

export async function generateAssistantResponse(params: {
  question: string;
  profileName: string;
  measurements: MeasurementRow[];
  goals: string[];
  localFirstMode: boolean;
  aiCloudConsent: boolean;
}): Promise<{
  reply: string;
  references: Array<{ label: string; dateRange?: string; metric?: string }>;
  isDemoResponse: boolean;
}> {
  const ctx = buildUserContextSummary(params.profileName, params.measurements, params.goals);

  if (params.localFirstMode) {
    return buildLocalDeterministicReply(params.question, ctx, 'local_first');
  }
  if (!params.aiCloudConsent) {
    return buildLocalDeterministicReply(params.question, ctx, 'consent_disabled');
  }

  const ai = getGeminiClient();
  if (!ai) {
    return buildLocalDeterministicReply(params.question, ctx, 'no_api_key');
  }

  try {
    const systemInstruction = [
      'You are the LifeTwin AI Personal Health Intelligence Assistant.',
      'Your role is to help the user investigate patterns in THEIR OWN authorized wellness records.',
      'STRICT SAFETY & EVIDENCE RULES:',
      '1. Never diagnose diseases, prescribe treatments, or give clinical medical advice.',
      '2. Clearly distinguish correlation from causation and mention alternative explanations when discussing patterns.',
      '3. Cite exact numbers, sample counts, and dates from the provided JSON context. Never invent missing data.',
      '4. If MAX30102 SpO2 readings appear, note they are experimental optical estimates, not clinically validated.',
      '5. Keep answers concise, clear, structured, and under 180 words.',
    ].join('\n');

    const prompt = `User question: "${params.question}"\n\nAuthorized User Health Context:\n${JSON.stringify(ctx)}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction,
      },
    });

    const text = (response.text ?? '').trim();
    if (!text) {
      return buildLocalDeterministicReply(params.question, ctx, 'no_api_key');
    }

    return {
      reply: text,
      references: [
        { label: `Verified dataset (${ctx.totalRecordedSamples} samples)`, dateRange: ctx.dateRange },
        { label: `7d Avg: ${ctx.last7Days.avgSleepHours ?? '—'}h sleep · ${ctx.last7Days.avgRestingHrBpm ?? '—'} bpm RHR` },
      ],
      isDemoResponse: false,
    };
  } catch (err) {
    console.error('Gemini API error:', err);
    return buildLocalDeterministicReply(params.question, ctx, 'no_api_key');
  }
}

export async function explainTwoMoments(params: {
  dateA: string;
  dateB: string;
  recordA: MeasurementRow | null;
  recordB: MeasurementRow | null;
  localFirstMode: boolean;
  aiCloudConsent: boolean;
}): Promise<{ explanation: string; isDemoResponse: boolean }> {
  const { dateA, dateB, recordA, recordB, localFirstMode, aiCloudConsent } = params;

  if (!recordA && !recordB) {
    return {
      explanation: `No recorded data exists for either ${dateA} or ${dateB}. Log lifestyle entries or sync a device for these dates to compare.`,
      isDemoResponse: false,
    };
  }
  if (!recordA || !recordB) {
    const missing = !recordA ? dateA : dateB;
    return {
      explanation: `No recorded data is available for ${missing}, so a full two-moment comparison cannot be completed without inventing missing metrics.`,
      isDemoResponse: false,
    };
  }

  const diffs: string[] = [];
  if (recordA.sleep_hours !== null && recordB.sleep_hours !== null) {
    const d = (recordB.sleep_hours - recordA.sleep_hours).toFixed(1);
    diffs.push(`Sleep duration changed from ${recordA.sleep_hours}h to ${recordB.sleep_hours}h (${Number(d) >= 0 ? '+' : ''}${d}h).`);
  }
  if (recordA.resting_hr_bpm !== null && recordB.resting_hr_bpm !== null) {
    const d = recordB.resting_hr_bpm - recordA.resting_hr_bpm;
    diffs.push(`Resting HR shifted from ${recordA.resting_hr_bpm} BPM to ${recordB.resting_hr_bpm} BPM (${d >= 0 ? '+' : ''}${d} BPM).`);
  }
  if (recordA.steps !== null && recordB.steps !== null) {
    const d = recordB.steps - recordA.steps;
    diffs.push(`Daily steps changed from ${recordA.steps.toLocaleString()} to ${recordB.steps.toLocaleString()} (${d >= 0 ? '+' : ''}${d.toLocaleString()}).`);
  }
  if (recordA.energy_score !== null && recordB.energy_score !== null) {
    const d = (recordB.energy_score - recordA.energy_score).toFixed(1);
    diffs.push(`Energy rating changed from ${recordA.energy_score}/10 to ${recordB.energy_score}/10 (${Number(d) >= 0 ? '+' : ''}${d}).`);
  }
  if (recordA.screen_time_minutes !== null && recordB.screen_time_minutes !== null) {
    const d = recordB.screen_time_minutes - recordA.screen_time_minutes;
    diffs.push(`Evening screen time shifted from ${recordA.screen_time_minutes}m to ${recordB.screen_time_minutes}m (${d >= 0 ? '+' : ''}${d}m).`);
  }

  const deterministicSummary = `${diffs.join(' ')} Note: Differences between two individual dates reflect observed day-to-day variation and lifestyle context rather than proven single-cause effects.`;

  if (localFirstMode || !aiCloudConsent) {
    return { explanation: deterministicSummary, isDemoResponse: false };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return { explanation: deterministicSummary, isDemoResponse: true };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Compare Date A (${dateA}) and Date B (${dateB}) strictly using these recorded values:\nDate A: ${JSON.stringify(recordA)}\nDate B: ${JSON.stringify(recordB)}\nExplain the recorded differences clearly in 2-3 sentences, noting that two-day comparisons show variation rather than medical diagnosis or proven causation.`,
    });
    const text = (response.text ?? '').trim();
    return { explanation: text || deterministicSummary, isDemoResponse: false };
  } catch {
    return { explanation: deterministicSummary, isDemoResponse: true };
  }
}
