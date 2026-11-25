import { EvidenceInsight, HealthMeasurement } from '../types/lifetwin';

export function getAcceptedMeasurements(measurements: HealthMeasurement[]): HealthMeasurement[] {
  return measurements.filter((m) => !m.isRejected);
}

export function getRejectedMeasurements(measurements: HealthMeasurement[]): HealthMeasurement[] {
  return measurements.filter((m) => m.isRejected);
}

export function computeAverage(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
  if (valid.length === 0) return null;
  return Number((valid.reduce((a, b) => a + b, 0) / valid.length).toFixed(2));
}

export function computeStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
  return Number(Math.sqrt(variance).toFixed(2));
}

export function computePearsonCorrelation(x: number[], y: number[]): number | null {
  if (x.length !== y.length || x.length < 4) return null;
  const n = x.length;
  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const denom = Math.sqrt(denX * denY);
  if (denom === 0) return null;
  return Number((num / denom).toFixed(2));
}

export interface AdaptiveBaselineMetric {
  key: 'restingHr' | 'sleepHours' | 'steps' | 'mood' | 'energy';
  label: string;
  unit: string;
  current: number | null;
  baselineMean: number | null;
  normalMin: number | null;
  normalMax: number | null;
  sampleCount: number;
  deviationText: string;
  status: 'within' | 'elevated' | 'below' | 'insufficient';
}

export function computeAdaptiveBaselines(measurements: HealthMeasurement[]): AdaptiveBaselineMetric[] {
  const accepted = getAcceptedMeasurements(measurements);
  const defs: Array<{
    key: AdaptiveBaselineMetric['key'];
    label: string;
    unit: string;
    extract: (m: HealthMeasurement) => number | null;
  }> = [
    { key: 'restingHr', label: 'Resting Heart Rate', unit: 'BPM', extract: (m) => m.restingHrBpm },
    { key: 'sleepHours', label: 'Sleep Duration', unit: 'hrs', extract: (m) => m.sleepHours },
    { key: 'steps', label: 'Daily Steps', unit: 'steps', extract: (m) => m.steps },
    { key: 'mood', label: 'Self-Reported Mood', unit: '/ 10', extract: (m) => m.moodScore },
    { key: 'energy', label: 'Self-Reported Energy', unit: '/ 10', extract: (m) => m.energyScore },
  ];

  return defs.map((def) => {
    const series = accepted
      .map((m) => def.extract(m))
      .filter((v): v is number => typeof v === 'number' && !Number.isNaN(v));
    if (series.length < 3) {
      return {
        key: def.key,
        label: def.label,
        unit: def.unit,
        current: series.length > 0 ? series[series.length - 1] : null,
        baselineMean: null,
        normalMin: null,
        normalMax: null,
        sampleCount: series.length,
        deviationText: 'Need at least 3 verified days for personal range',
        status: 'insufficient',
      };
    }

    const current = series[series.length - 1];
    const mean = Number((series.reduce((a, b) => a + b, 0) / series.length).toFixed(1));
    const sd = Math.max(def.key === 'steps' ? 850 : 0.4, computeStdDev(series));
    const min = Number((mean - sd).toFixed(1));
    const max = Number((mean + sd).toFixed(1));
    const diff = Number((current - mean).toFixed(1));
    const status: AdaptiveBaselineMetric['status'] =
      current > max ? 'elevated' : current < min ? 'below' : 'within';
    const deviationText =
      status === 'within'
        ? `Within personal baseline (${diff >= 0 ? '+' : ''}${diff} ${def.unit})`
        : status === 'elevated'
        ? `Above personal range (+${diff} ${def.unit})`
        : `Below personal range (${diff} ${def.unit})`;

    return {
      key: def.key,
      label: def.label,
      unit: def.unit,
      current,
      baselineMean: mean,
      normalMin: min,
      normalMax: max,
      sampleCount: series.length,
      deviationText,
      status,
    };
  });
}

export function generateEvidenceInsights(measurements: HealthMeasurement[]): EvidenceInsight[] {
  const accepted = getAcceptedMeasurements(measurements);
  if (accepted.length < 4) {
    return [];
  }

  const dateRange = `${accepted[0].dateKey} to ${accepted[accepted.length - 1].dateKey}`;
  const isDemoBasis = accepted.some((m) => m.isDemo);
  const insights: EvidenceInsight[] = [];

  // 1. Sleep & Next-Day Energy evidence
  const sleepEnergyPairs = accepted.filter((m) => m.sleepHours !== null && m.energyScore !== null);
  if (sleepEnergyPairs.length >= 5) {
    const matched = sleepEnergyPairs.filter(
      (m) => (m.sleepHours! >= 7.1 && m.energyScore! >= 7) || (m.sleepHours! < 6.8 && m.energyScore! < 7)
    );
    const highSleep = sleepEnergyPairs.filter((m) => m.sleepHours! >= 7.1);
    const lowSleep = sleepEnergyPairs.filter((m) => m.sleepHours! < 7.1);
    const avgHighE = computeAverage(highSleep.map((m) => m.energyScore));
    const avgLowE = computeAverage(lowSleep.map((m) => m.energyScore));

    insights.push({
      id: 'ev-sleep-energy',
      title: 'Sleep Duration & Next-Day Energy Alignment',
      category: 'sleep',
      observation: `Higher next-day energy ratings aligned with nights of 7.1+ hours of sleep on ${matched.length} of ${sleepEnergyPairs.length} recorded days.`,
      supportingSummary: `Days ≥ 7.1h sleep (${highSleep.length}d) averaged ${avgHighE ?? '—'}/10 energy vs ${avgLowE ?? '—'}/10 on shorter sleep nights (${lowSleep.length}d).`,
      matchedDays: matched.length,
      totalSampleDays: sleepEnergyPairs.length,
      dateRange,
      confidence: matched.length / sleepEnergyPairs.length >= 0.7 ? 'High' : 'Moderate',
      alternativeExplanations: 'Workday stress, hydration, caffeine timing, and physical exertion may also influence perceived morning energy.',
      recommendation: 'Test a consistent wind-down window for 7 days in the Experiment Lab to verify whether the pattern holds intentionally.',
      supportingDateKeys: matched.map((m) => m.dateKey),
      isDemoBasis,
    });
  }

  // 2. Evening screen time & sleep length
  const screenSleepPairs = accepted.filter((m) => m.screenTimeMinutes !== null && m.sleepHours !== null);
  if (screenSleepPairs.length >= 5) {
    const highScreenShortSleep = screenSleepPairs.filter((m) => m.screenTimeMinutes! >= 90 && m.sleepHours! < 6.8);
    const r = computePearsonCorrelation(
      screenSleepPairs.map((m) => m.screenTimeMinutes!),
      screenSleepPairs.map((m) => m.sleepHours!)
    );
    insights.push({
      id: 'ev-screen-sleep',
      title: 'Evening Screen Exposure & Sleep Duration',
      category: 'rhythm',
      observation: `Shorter sleep (<6.8h) and elevated evening screen time (≥90 min) occurred together on ${highScreenShortSleep.length} recorded days.`,
      supportingSummary: `Observed correlation r = ${r ?? 'N/A'} across ${screenSleepPairs.length} paired days.`,
      matchedDays: highScreenShortSleep.length,
      totalSampleDays: screenSleepPairs.length,
      dateRange,
      confidence: highScreenShortSleep.length >= 4 ? 'Moderate' : 'Exploratory',
      alternativeExplanations: 'Late work deadlines or social commitments can cause both higher screen time and later bedtimes simultaneously.',
      recommendation: 'Try a 45-minute pre-sleep screen pause and monitor whether sleep start shifts earlier.',
      supportingDateKeys: highScreenShortSleep.map((m) => m.dateKey),
      isDemoBasis,
    });
  }

  // 3. Activity & Resting HR
  const activityHrPairs = accepted.filter((m) => m.steps !== null && m.restingHrBpm !== null);
  if (activityHrPairs.length >= 5) {
    const activeDays = activityHrPairs.filter((m) => m.steps! >= 7500);
    const lowerDays = activityHrPairs.filter((m) => m.steps! < 7500);
    const activeRhr = computeAverage(activeDays.map((m) => m.restingHrBpm));
    const lowRhr = computeAverage(lowerDays.map((m) => m.restingHrBpm));
    insights.push({
      id: 'ev-activity-rhr',
      title: 'Daily Movement Volume & Resting Heart Rate',
      category: 'heart',
      observation: `Active days (≥7,500 steps) coincided with an average resting heart rate of ${activeRhr ?? '—'} BPM compared to ${lowRhr ?? '—'} BPM on lower-movement days.`,
      supportingSummary: `Evaluated across ${activityHrPairs.length} verified wearable/sensor records (${activeDays.length} active days, ${lowerDays.length} lighter days).`,
      matchedDays: activeDays.length,
      totalSampleDays: activityHrPairs.length,
      dateRange,
      confidence: activeDays.length >= 6 ? 'High' : 'Moderate',
      alternativeExplanations: 'Measurement timing, hydration, ambient temperature, and recovery from prior exercise affect resting HR.',
      recommendation: 'Keep logging both exercise sessions and morning resting HR to refine your personal cardiovascular baseline.',
      supportingDateKeys: activeDays.map((m) => m.dateKey),
      isDemoBasis,
    });
  }

  return insights;
}

export type LifeGraphMetricKey =
  | 'sleepHours'
  | 'energyScore'
  | 'moodScore'
  | 'steps'
  | 'restingHrBpm'
  | 'heartRateBpm'
  | 'screenTimeMinutes'
  | 'exerciseMinutes'
  | 'waterLiters';

export const LIFEGRAPH_METRICS: Array<{ key: LifeGraphMetricKey; label: string; unit: string; color: string }> = [
  { key: 'sleepHours', label: 'Sleep Duration', unit: 'hrs', color: '#0284c7' },
  { key: 'energyScore', label: 'Energy', unit: '/10', color: '#0ea5e9' },
  { key: 'moodScore', label: 'Mood', unit: '/10', color: '#2563eb' },
  { key: 'steps', label: 'Daily Steps', unit: 'steps', color: '#0d9488' },
  { key: 'exerciseMinutes', label: 'Exercise', unit: 'min', color: '#059669' },
  { key: 'restingHrBpm', label: 'Resting HR', unit: 'BPM', color: '#e11d48' },
  { key: 'heartRateBpm', label: 'Heart Rate', unit: 'BPM', color: '#f43f5e' },
  { key: 'screenTimeMinutes', label: 'Evening Screen', unit: 'min', color: '#d97706' },
  { key: 'waterLiters', label: 'Water Intake', unit: 'L', color: '#06b6d4' },
];

export function analyzeLifeGraphPair(
  measurements: HealthMeasurement[],
  metricA: LifeGraphMetricKey,
  metricB: LifeGraphMetricKey
) {
  const accepted = getAcceptedMeasurements(measurements);
  const paired = accepted.filter(
    (m) => typeof m[metricA] === 'number' && typeof m[metricB] === 'number'
  );
  const xs = paired.map((m) => Number(m[metricA]));
  const ys = paired.map((m) => Number(m[metricB]));
  const r = computePearsonCorrelation(xs, ys);

  return {
    sampleSize: paired.length,
    correlation: r,
    points: paired.map((m) => ({
      dateKey: m.dateKey,
      a: Number(m[metricA]),
      b: Number(m[metricB]),
    })),
    strengthLabel:
      r === null
        ? 'Insufficient paired records (need ≥ 4)'
        : Math.abs(r) >= 0.6
        ? `Strong ${r > 0 ? 'positive' : 'inverse'} co-movement (r = ${r})`
        : Math.abs(r) >= 0.3
        ? `Moderate ${r > 0 ? 'positive' : 'inverse'} co-movement (r = ${r})`
        : `Weak linear relationship (r = ${r})`,
  };
}
