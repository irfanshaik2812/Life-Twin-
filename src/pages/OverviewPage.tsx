import React, { useMemo, useState } from 'react';
import {
  Activity,
  Droplets,
  Flame,
  Footprints,
  HeartPulse,
  Moon,
  Smile,
  Zap,
  ArrowRight,
  Cpu,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLifeTwin } from '../context/LifeTwinContext';
import {
  computeAverage,
  generateEvidenceInsights,
  getAcceptedMeasurements,
} from '../lib/analyticsEngine';

type DateRangeFilter = 'daily' | '7d' | '30d' | 'custom';

export function OverviewPage() {
  const { state, navigate } = useLifeTwin();
  const [range, setRange] = useState<DateRangeFilter>('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const accepted = useMemo(() => getAcceptedMeasurements(state.measurements), [state.measurements]);

  const filtered = useMemo(() => {
    if (accepted.length === 0) return [];
    if (range === 'daily') return accepted.slice(-1);
    if (range === '7d') return accepted.slice(-7);
    if (range === 'custom' && customStart && customEnd) {
      return accepted.filter((m) => m.dateKey >= customStart && m.dateKey <= customEnd);
    }
    return accepted.slice(-30);
  }, [accepted, range, customStart, customEnd]);

  const latest = accepted.length > 0 ? accepted[accepted.length - 1] : null;
  const previous = accepted.length > 1 ? accepted[accepted.length - 2] : null;

  const insights = useMemo(() => generateEvidenceInsights(state.measurements), [state.measurements]);

  const connectedCount = state.devices.filter((d) => d.status !== 'disconnected').length;
  const firstName = (state.profile?.fullName || 'Member').split(' ')[0];
  const todayFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const deltaStr = (curr: number | null | undefined, prev: number | null | undefined, unit: string) => {
    if (typeof curr !== 'number' || typeof prev !== 'number') return 'No prior comparison';
    const d = Number((curr - prev).toFixed(1));
    return `${d >= 0 ? '+' : ''}${d} ${unit} vs prior`;
  };

  const kpiCards = [
    {
      label: 'Current Heart Rate',
      value: latest?.heartRateBpm !== null && latest?.heartRateBpm !== undefined ? `${latest.heartRateBpm}` : '—',
      unit: 'BPM',
      icon: HeartPulse,
      source: latest?.sourceDevice || 'No source',
      time: latest?.dateKey || 'No date',
      delta: deltaStr(latest?.heartRateBpm, previous?.heartRateBpm, 'BPM'),
      isDemo: latest?.isDemo ?? false,
      color: '#e11d48',
      series: filtered.map((m) => ({ k: m.dateKey.slice(5), v: m.heartRateBpm ?? 0 })),
    },
    {
      label: 'SpO2 Estimate',
      value: latest?.spo2Pct !== null && latest?.spo2Pct !== undefined ? `${latest.spo2Pct}` : '—',
      unit: '% (Exp.)',
      icon: Droplets,
      source: latest?.isExperimentalSpo2 ? `${latest.sourceDevice} · Experimental` : latest?.sourceDevice || 'No source',
      time: latest?.dateKey || 'No date',
      delta: deltaStr(latest?.spo2Pct, previous?.spo2Pct, '%'),
      isDemo: latest?.isDemo ?? false,
      color: '#0284c7',
      series: filtered.map((m) => ({ k: m.dateKey.slice(5), v: m.spo2Pct ?? 97 })),
    },
    {
      label: 'Resting Heart Rate',
      value: latest?.restingHrBpm !== null && latest?.restingHrBpm !== undefined ? `${latest.restingHrBpm}` : '—',
      unit: 'BPM',
      icon: Activity,
      source: latest?.sourceDevice || 'No source',
      time: latest?.dateKey || 'No date',
      delta: deltaStr(latest?.restingHrBpm, previous?.restingHrBpm, 'BPM'),
      isDemo: latest?.isDemo ?? false,
      color: '#be123c',
      series: filtered.map((m) => ({ k: m.dateKey.slice(5), v: m.restingHrBpm ?? 60 })),
    },
    {
      label: 'Sleep Duration',
      value: latest?.sleepHours !== null && latest?.sleepHours !== undefined ? `${latest.sleepHours}` : '—',
      unit: 'hrs',
      icon: Moon,
      source: latest?.sourceDevice || 'No source',
      time: latest?.dateKey || 'No date',
      delta: deltaStr(latest?.sleepHours, previous?.sleepHours, 'h'),
      isDemo: latest?.isDemo ?? false,
      color: '#4f46e5',
      series: filtered.map((m) => ({ k: m.dateKey.slice(5), v: m.sleepHours ?? 0 })),
    },
    {
      label: 'Daily Activity',
      value: latest?.steps !== null && latest?.steps !== undefined ? latest.steps.toLocaleString() : '—',
      unit: 'steps',
      icon: Footprints,
      source: latest?.sourceDevice || 'No source',
      time: latest?.dateKey || 'No date',
      delta: deltaStr(latest?.steps, previous?.steps, 'steps'),
      isDemo: latest?.isDemo ?? false,
      color: '#0d9488',
      series: filtered.map((m) => ({ k: m.dateKey.slice(5), v: m.steps ?? 0 })),
    },
    {
      label: 'Exercise Duration',
      value: latest?.exerciseMinutes !== null && latest?.exerciseMinutes !== undefined ? `${latest.exerciseMinutes}` : '—',
      unit: 'min',
      icon: Flame,
      source: latest?.exerciseType || latest?.sourceDevice || 'No source',
      time: latest?.dateKey || 'No date',
      delta: deltaStr(latest?.exerciseMinutes, previous?.exerciseMinutes, 'min'),
      isDemo: latest?.isDemo ?? false,
      color: '#059669',
      series: filtered.map((m) => ({ k: m.dateKey.slice(5), v: m.exerciseMinutes ?? 0 })),
    },
    {
      label: 'Mood',
      value: latest?.moodScore !== null && latest?.moodScore !== undefined ? `${latest.moodScore}` : '—',
      unit: '/ 10',
      icon: Smile,
      source: 'Self-reported',
      time: latest?.dateKey || 'No date',
      delta: deltaStr(latest?.moodScore, previous?.moodScore, 'pts'),
      isDemo: latest?.isDemo ?? false,
      color: '#2563eb',
      series: filtered.map((m) => ({ k: m.dateKey.slice(5), v: m.moodScore ?? 0 })),
    },
    {
      label: 'Energy',
      value: latest?.energyScore !== null && latest?.energyScore !== undefined ? `${latest.energyScore}` : '—',
      unit: '/ 10',
      icon: Zap,
      source: 'Self-reported',
      time: latest?.dateKey || 'No date',
      delta: deltaStr(latest?.energyScore, previous?.energyScore, 'pts'),
      isDemo: latest?.isDemo ?? false,
      color: '#0ea5e9',
      series: filtered.map((m) => ({ k: m.dateKey.slice(5), v: m.energyScore ?? 0 })),
    },
  ];

  const chartData = useMemo(
    () =>
      filtered.map((m) => ({
        date: m.dateKey.slice(5),
        hr: m.heartRateBpm,
        rhr: m.restingHrBpm,
        spo2: m.spo2Pct,
        sleep: m.sleepHours,
        steps: m.steps,
        mood: m.moodScore,
        energy: m.energyScore,
      })),
    [filtered]
  );

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Welcome Banner */}
      <section className="bg-white rounded-2xl border border-slate-200/90 p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500 font-mono-tabular">{todayFormatted}</p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1D39] mt-1">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            {accepted.length > 0
              ? `Tracking ${accepted.length} verified physiological & lifestyle records · Avg sleep ${computeAverage(filtered.map((m) => m.sleepHours)) ?? '—'}h · Avg resting HR ${computeAverage(filtered.map((m) => m.restingHrBpm)) ?? '—'} BPM.`
              : 'No measurements recorded yet. Log a lifestyle entry or connect a sensor to begin.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('devices')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
          >
            <Cpu className="w-4 h-4 text-sky-600" />
            {connectedCount > 0 ? `${connectedCount} Device(s) Paired` : 'No Device Connected (Demo / Manual)'}
          </button>
          <button
            onClick={() => navigate('lifestyle')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0284C7] text-white text-xs font-semibold hover:bg-sky-700 cursor-pointer"
          >
            Log Today&apos;s Check-In
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </section>

      {/* Date Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg">
          {([
            ['daily', 'Latest Day'],
            ['7d', 'Last 7 Days'],
            ['30d', 'Last 30 Days'],
            ['custom', 'Custom Range'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setRange(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                range === key ? 'bg-[#0B1D39] text-white' : 'text-slate-600 hover:text-[#0B1D39]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono-tabular"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white font-mono-tabular"
            />
          </div>
        )}
      </div>

      {/* 8 Health Summary KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-slate-200/90 p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-medium text-slate-700">{card.label}</span>
                  <Icon className="w-4 h-4 text-sky-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="font-mono-tabular text-3xl font-bold text-[#0B1D39]">{card.value}</span>
                  <span className="text-xs font-mono-tabular text-slate-500">{card.unit}</span>
                </div>
                <p className="mt-1 text-[11px] font-mono-tabular text-slate-500">
                  {card.delta}
                </p>
              </div>

              <div className="h-12 mt-3">
                {card.series.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={card.series}>
                      <Line type="monotone" dataKey="v" stroke={card.color} strokeWidth={1.8} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center text-[11px] text-slate-400">Add more days for trend</div>
                )}
              </div>

              <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[160px]">
                  {card.isDemo ? 'DEMO DATA · ' : ''}
                  {card.source}
                </span>
                <span className="font-mono-tabular shrink-0">{card.time}</span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Main Interactive Charts */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-base text-[#0B1D39]">Heart Rate &amp; Resting HR Trend</h2>
              <p className="text-xs text-slate-500">Beats per minute (BPM) · Verified accepted samples only</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="hr" name="Heart Rate (BPM)" stroke="#e11d48" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="rhr" name="Resting HR (BPM)" stroke="#0284c7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-base text-[#0B1D39]">Sleep Duration &amp; Experimental SpO2</h2>
              <p className="text-xs text-slate-500">Sleep hours vs optical SpO2 estimates (not clinically validated)</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="sleep" name="Sleep (hrs)" stroke="#4f46e5" fill="#e0e7ff" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-base text-[#0B1D39]">Daily Activity Volume</h2>
              <p className="text-xs text-slate-500">Recorded steps across selected timeframe</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="steps" name="Steps" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display font-semibold text-base text-[#0B1D39]">Mood &amp; Energy Patterns</h2>
              <p className="text-xs text-slate-500">Self-reported ratings (1–10 scale)</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="energy" name="Energy (/10)" stroke="#0ea5e9" strokeWidth={2} />
                <Line type="monotone" dataKey="mood" name="Mood (/10)" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Daily Wellness Summary & Top Evidence Insights */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-6 space-y-3">
          <h2 className="font-display font-semibold text-lg text-[#0B1D39]">Daily Wellness Summary</h2>
          {latest ? (
            <>
              <p className="text-sm text-slate-600 leading-relaxed">
                Latest record ({latest.dateKey}) from <strong>{latest.sourceDevice}</strong>
                {latest.isDemo ? ' (DEMO DATA)' : ''}: {latest.sleepHours ?? '—'} hrs sleep,{' '}
                {latest.steps?.toLocaleString() ?? '—'} steps, resting HR {latest.restingHrBpm ?? '—'} BPM, energy{' '}
                {latest.energyScore ?? '—'}/10.
              </p>
              {latest.notes && (
                <p className="text-xs text-slate-500 bg-[#F8FAFD] p-3 rounded-lg border border-slate-200/70">
                  Journal note: &ldquo;{latest.notes}&rdquo;
                </p>
              )}
              <div className="pt-2 flex flex-wrap gap-3">
                <button
                  onClick={() => navigate('twin')}
                  className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
                >
                  Inspect on 3D Digital Twin →
                </button>
                <button
                  onClick={() => navigate('assistant')}
                  className="text-xs font-semibold text-[#0B1D39] hover:underline cursor-pointer"
                >
                  Ask AI Assistant →
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">No entries recorded yet.</p>
          )}
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-semibold text-lg text-[#0B1D39]">Recent Evidence-Based AI Insights</h2>
            <button
              onClick={() => navigate('evidence')}
              className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
            >
              View All Evidence
            </button>
          </div>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.slice(0, 2).map((ins) => (
                <div key={ins.id} className="p-4 rounded-xl bg-[#F8FAFD] border border-slate-200/80">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                    <span className="font-semibold text-[#0B1D39]">{ins.title}</span>
                    <span className="font-mono-tabular">
                      {ins.matchedDays}/{ins.totalSampleDays} days · {ins.confidence}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">{ins.observation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Record at least 4 days of paired physiological and lifestyle metrics to generate evidence-backed insights.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
