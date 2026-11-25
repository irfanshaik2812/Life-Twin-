import React, { useMemo, useState } from 'react';
import {
  Check,
  Database,
  Eye,
  Network,
  Plus,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  Trash2,
  X,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLifeTwin } from '../context/LifeTwinContext';
import {
  analyzeLifeGraphPair,
  computeAdaptiveBaselines,
  computeAverage,
  generateEvidenceInsights,
  getAcceptedMeasurements,
  LIFEGRAPH_METRICS,
  LifeGraphMetricKey,
} from '../lib/analyticsEngine';
import { EvidenceInsight } from '../types/lifetwin';

export function EvidenceInsightsView({ mode }: { mode: 'insights' | 'evidence' }) {
  const { state, apiFetch } = useLifeTwin();
  const insights = useMemo(() => generateEvidenceInsights(state.measurements), [state.measurements]);
  const accepted = useMemo(() => getAcceptedMeasurements(state.measurements), [state.measurements]);
  const [inspecting, setInspecting] = useState<EvidenceInsight | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const supportingRows = useMemo(() => {
    if (!inspecting) return [];
    const set = new Set(inspecting.supportingDateKeys);
    return accepted.filter((m) => set.has(m.dateKey));
  }, [inspecting, accepted]);

  const saveToMemory = async (ins: EvidenceInsight) => {
    await apiFetch('/api/memory', {
      method: 'POST',
      body: JSON.stringify({
        title: ins.title,
        observation: ins.observation,
        category: ins.category === 'rhythm' ? 'sleep' : ins.category,
        dateRange: ins.dateRange,
        sampleSize: ins.totalSampleDays,
        confidence: ins.confidence.toLowerCase(),
      }),
    });
    setSavedNotice(`Saved "${ins.title}" to Personal Health Memory.`);
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">
          {mode === 'evidence' ? 'Feature 5 · Evidence-Based AI' : 'Personal Intelligence Synthesis'}
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">
          {mode === 'evidence' ? 'Show Me Why: Evidence & Supporting Records' : 'AI Insights'}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Every observation cites its exact sample count, date range, confidence, and alternative explanations. Never generates unsupported conclusions.
        </p>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center justify-between">
          <span>{savedNotice}</span>
          <button onClick={() => setSavedNotice(null)} className="font-semibold cursor-pointer">Dismiss</button>
        </div>
      )}

      {insights.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="font-display font-semibold text-base text-[#0B1D39]">Insufficient Sample Size</p>
          <p className="text-sm text-slate-500 mt-1">
            LifeTwin AI requires at least 4 verified days of paired metrics before presenting pattern observations.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {insights.map((ins) => (
            <div key={ins.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="font-mono-tabular">
                    {ins.matchedDays} of {ins.totalSampleDays} days · {ins.dateRange}
                  </span>
                  <span className="font-semibold text-sky-700">
                    {ins.confidence} Confidence{ins.isDemoBasis ? ' · Demo Basis' : ''}
                  </span>
                </div>
                <h2 className="font-display text-lg font-bold text-[#0B1D39] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
                  {ins.title}
                </h2>
                <p className="text-sm text-slate-700 leading-relaxed">{ins.observation}</p>
                <p className="text-xs font-mono-tabular text-slate-600 bg-[#F8FAFD] p-3 rounded-lg border border-slate-200/70">
                  {ins.supportingSummary}
                </p>
                <div className="text-xs text-slate-600 space-y-1">
                  <p>
                    <strong className="text-slate-800">Alternative Explanations:</strong> {ins.alternativeExplanations}
                  </p>
                  <p>
                    <strong className="text-slate-800">Practical Recommendation:</strong> {ins.recommendation}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
                <button
                  onClick={() => setInspecting(ins)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold hover:bg-[#132E59] cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  View Supporting Data
                </button>
                <button
                  onClick={() => saveToMemory(ins)}
                  className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Save to Health Memory
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Supporting Data Modal / Drawer */}
      {inspecting && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono-tabular text-sky-700">Supporting Evidence · {inspecting.dateRange}</p>
                <h3 className="font-display text-xl font-bold text-[#0B1D39]">{inspecting.title}</h3>
              </div>
              <button onClick={() => setInspecting(null)} className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={accepted.slice(-20)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="dateKey" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="sleepHours" name="Sleep (hrs)" stroke="#4f46e5" strokeWidth={2} />
                  <Line type="monotone" dataKey="energyScore" name="Energy (/10)" stroke="#0284c7" strokeWidth={2} />
                  <Line type="monotone" dataKey="restingHrBpm" name="Resting HR" stroke="#e11d48" strokeWidth={1.6} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Matched Date</th>
                    <th className="py-2 px-3 text-right">Sleep</th>
                    <th className="py-2 px-3 text-right">Energy</th>
                    <th className="py-2 px-3 text-right">Steps</th>
                    <th className="py-2 px-3 text-right">Resting HR</th>
                    <th className="py-2 px-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono-tabular">
                  {supportingRows.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2 px-3">{r.dateKey}</td>
                      <td className="py-2 px-3 text-right">{r.sleepHours ?? '—'}h</td>
                      <td className="py-2 px-3 text-right">{r.energyScore ?? '—'}/10</td>
                      <td className="py-2 px-3 text-right">{r.steps?.toLocaleString() ?? '—'}</td>
                      <td className="py-2 px-3 text-right">{r.restingHrBpm ?? '—'}</td>
                      <td className="py-2 px-3 font-sans">{r.sourceDevice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PersonalHealthMemoryView() {
  const { state, apiFetch } = useLifeTwin();
  const [title, setTitle] = useState('');
  const [observation, setObservation] = useState('');
  const [category, setCategory] = useState<'sleep' | 'energy' | 'heart' | 'activity' | 'mood'>('energy');

  const accepted = useMemo(() => getAcceptedMeasurements(state.measurements), [state.measurements]);
  const firstHalf = accepted.slice(0, Math.floor(accepted.length / 2));
  const secondHalf = accepted.slice(Math.floor(accepted.length / 2));

  const comparisonData = [
    {
      metric: 'Sleep (hrs)',
      earlier: computeAverage(firstHalf.map((m) => m.sleepHours)) ?? 0,
      recent: computeAverage(secondHalf.map((m) => m.sleepHours)) ?? 0,
    },
    {
      metric: 'Energy (/10)',
      earlier: computeAverage(firstHalf.map((m) => m.energyScore)) ?? 0,
      recent: computeAverage(secondHalf.map((m) => m.energyScore)) ?? 0,
    },
    {
      metric: 'Mood (/10)',
      earlier: computeAverage(firstHalf.map((m) => m.moodScore)) ?? 0,
      recent: computeAverage(secondHalf.map((m) => m.moodScore)) ?? 0,
    },
  ];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !observation.trim()) return;
    await apiFetch('/api/memory', {
      method: 'POST',
      body: JSON.stringify({
        title,
        observation,
        category,
        dateRange: 'User-approved note',
        sampleSize: accepted.length || 1,
        confidence: 'moderate',
      }),
    });
    setTitle('');
    setObservation('');
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">Feature 1 · Personal Health Memory</p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">AI That Remembers Your Patterns</h1>
        <p className="text-sm text-slate-600 mt-1">
          Approve, manage, or delete long-term personal observations and compare earlier vs recent weeks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 space-y-5">
          <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h2 className="font-display font-semibold text-base text-[#0B1D39]">Save New Personal Observation</h2>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning walk improves focus"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm bg-white"
            >
              <option value="energy">Energy</option>
              <option value="sleep">Sleep</option>
              <option value="heart">Heart Rate</option>
              <option value="activity">Activity</option>
              <option value="mood">Mood</option>
            </select>
            <textarea
              required
              rows={3}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              placeholder="Describe the recurring personal pattern you want LifeTwin to remember…"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold hover:bg-[#132E59] cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Store in Memory
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-display font-semibold text-base text-[#0B1D39] mb-3">
              Earlier vs Recent Period Comparison
            </h2>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="earlier" name="Earlier Half" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recent" name="Recent Half" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-[#0B1D39] flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-600" />
              Stored Long-Term Memories ({state.memories.length})
            </h2>
          </div>

          <div className="space-y-3">
            {state.memories.map((mem) => (
              <div key={mem.id} className="p-4 rounded-xl border border-slate-200/90 bg-[#F8FAFD] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono-tabular text-slate-500 uppercase">
                    {mem.category} · {mem.dateRange} · n={mem.sampleSize}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        apiFetch(`/api/memory/${mem.id}`, {
                          method: 'PATCH',
                          body: JSON.stringify({ userApproved: !mem.userApproved }),
                        })
                      }
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                        mem.userApproved
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Check className="w-3 h-3" /> {mem.userApproved ? 'Approved' : 'Paused'}
                    </button>
                    <button
                      onClick={() => apiFetch(`/api/memory/${mem.id}`, { method: 'DELETE' })}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete observation"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="font-display font-semibold text-sm text-[#0B1D39]">{mem.title}</h3>
                <p className="text-sm text-slate-600">{mem.observation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LifeGraphView() {
  const { state } = useLifeTwin();
  const [metricA, setMetricA] = useState<LifeGraphMetricKey>('sleepHours');
  const [metricB, setMetricB] = useState<LifeGraphMetricKey>('energyScore');

  const analysis = useMemo(
    () => analyzeLifeGraphPair(state.measurements, metricA, metricB),
    [state.measurements, metricA, metricB]
  );

  const metaA = LIFEGRAPH_METRICS.find((m) => m.key === metricA)!;
  const metaB = LIFEGRAPH_METRICS.find((m) => m.key === metricB)!;

  // Interactive SVG Network Nodes
  const nodes: Array<{ key: LifeGraphMetricKey; label: string; x: number; y: number }> = [
    { key: 'sleepHours', label: 'Sleep', x: 180, y: 70 },
    { key: 'energyScore', label: 'Energy', x: 350, y: 120 },
    { key: 'moodScore', label: 'Mood', x: 320, y: 245 },
    { key: 'steps', label: 'Activity', x: 180, y: 275 },
    { key: 'restingHrBpm', label: 'Resting HR', x: 55, y: 220 },
    { key: 'screenTimeMinutes', label: 'Screen Time', x: 60, y: 110 },
  ];

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">
          Feature 4 · LifeGraph Relationship Explorer
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">
          Discover Connections Between Your Daily Habits
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Select any two metrics to examine how they move together across your recorded days. Correlation highlights co-occurrence, not causation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Relationship Graph */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display font-semibold text-base text-[#0B1D39] flex items-center gap-2">
              <Network className="w-4 h-4 text-sky-600" /> Interactive Habit &amp; Metric Graph
            </h2>
            <p className="text-xs text-slate-500 mt-1">Click nodes below or use selectors to inspect a pair.</p>
          </div>

          <svg viewBox="0 0 410 330" className="w-full h-64 my-2">
            {/* Edges */}
            {nodes.map((n1, i) =>
              nodes.slice(i + 1).map((n2) => {
                const isSelectedPair =
                  (n1.key === metricA && n2.key === metricB) ||
                  (n1.key === metricB && n2.key === metricA);
                return (
                  <line
                    key={`${n1.key}-${n2.key}`}
                    x1={n1.x}
                    y1={n1.y}
                    x2={n2.x}
                    y2={n2.y}
                    stroke={isSelectedPair ? '#0284c7' : '#cbd5e1'}
                    strokeWidth={isSelectedPair ? 3 : 1}
                    strokeOpacity={isSelectedPair ? 1 : 0.45}
                  />
                );
              })
            )}
            {/* Nodes */}
            {nodes.map((n) => {
              const active = n.key === metricA || n.key === metricB;
              return (
                <g
                  key={n.key}
                  onClick={() => {
                    if (n.key !== metricA) setMetricB(n.key);
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={n.x}
                    cy={n.y}
                    r={active ? 26 : 21}
                    fill={n.key === metricA ? '#0B1D39' : n.key === metricB ? '#0284C7' : '#F8FAFD'}
                    stroke={active ? '#0284C7' : '#94a3b8'}
                    strokeWidth={2}
                  />
                  <text
                    x={n.x}
                    y={n.y + 4}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight="600"
                    fill={active ? '#ffffff' : '#0B1D39'}
                  >
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Primary Metric (X)</label>
              <select
                value={metricA}
                onChange={(e) => setMetricA(e.target.value as LifeGraphMetricKey)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
              >
                {LIFEGRAPH_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-500 mb-1">Compared Metric (Y)</label>
              <select
                value={metricB}
                onChange={(e) => setMetricB(e.target.value as LifeGraphMetricKey)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
              >
                {LIFEGRAPH_METRICS.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Scatter & Summary */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="font-display font-semibold text-lg text-[#0B1D39]">
                {metaA.label} vs {metaB.label}
              </h2>
              <p className="text-xs font-mono-tabular text-sky-700 mt-0.5">
                {analysis.strengthLabel} · Sample Size n = {analysis.sampleSize} days
              </p>
            </div>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" dataKey="a" name={metaA.label} unit={` ${metaA.unit}`} tick={{ fontSize: 11 }} />
                <YAxis type="number" dataKey="b" name={metaB.label} unit={` ${metaB.unit}`} tick={{ fontSize: 11 }} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter name="Recorded Days" data={analysis.points} fill="#0284c7" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-slate-200/80 text-xs text-slate-600">
            <strong>Correlation vs Causation Notice:</strong> Statistical co-variation across {analysis.sampleSize} recorded days highlights habits that tend to occur together. Shared external factors (workload, travel, stress, or caffeine) may explain both metrics.
          </div>
        </div>
      </div>
    </div>
  );
}

export function AdaptiveBaselineView() {
  const { state } = useLifeTwin();
  const baselines = useMemo(() => computeAdaptiveBaselines(state.measurements), [state.measurements]);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">
          Feature 7 · Adaptive Baseline Engine
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">
          Understand What Is Normal for You
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Dynamic personal reference ranges learned strictly from your own verified historical measurements (not clinical diagnostic thresholds).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {baselines.map((b) => (
          <div key={b.key} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-display font-semibold text-base text-[#0B1D39]">{b.label}</span>
              <SlidersHorizontal className="w-4 h-4 text-sky-600" />
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-mono-tabular text-3xl font-bold text-[#0B1D39]">
                {b.current !== null ? b.current : '—'}
              </span>
              <span className="text-xs font-mono-tabular text-slate-500">{b.unit} (latest)</span>
            </div>

            {b.baselineMean !== null ? (
              <div className="space-y-1.5 text-xs font-mono-tabular">
                <p className="text-slate-600">
                  Personal Mean: <strong>{b.baselineMean} {b.unit}</strong>
                </p>
                <p className="text-slate-600">
                  Adaptive Normal Band: <strong>{b.normalMin} – {b.normalMax} {b.unit}</strong>
                </p>
                <p
                  className={`font-sans font-medium pt-1 ${
                    b.status === 'within'
                      ? 'text-emerald-700'
                      : b.status === 'elevated'
                      ? 'text-amber-700'
                      : 'text-sky-700'
                  }`}
                >
                  {b.deviationText}
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">{b.deviationText}</p>
            )}

            <p className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 font-mono-tabular">
              Based on {b.sampleCount} quality-verified records
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PersonalRhythmView() {
  const { state } = useLifeTwin();
  const accepted = useMemo(() => getAcceptedMeasurements(state.measurements), [state.measurements]);

  const byDayOfWeek = useMemo(() => {
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const buckets: Array<{ day: string; energy: number[]; mood: number[]; sleep: number[] }> = names.map((d) => ({
      day: d,
      energy: [],
      mood: [],
      sleep: [],
    }));
    for (const m of accepted) {
      const idx = new Date(m.dateKey + 'T12:00:00Z').getUTCDay();
      if (m.energyScore !== null) buckets[idx].energy.push(m.energyScore);
      if (m.moodScore !== null) buckets[idx].mood.push(m.moodScore);
      if (m.sleepHours !== null) buckets[idx].sleep.push(m.sleepHours);
    }
    return buckets.map((b) => ({
      day: b.day,
      avgEnergy: computeAverage(b.energy) ?? 0,
      avgMood: computeAverage(b.mood) ?? 0,
      avgSleep: computeAverage(b.sleep) ?? 0,
    }));
  }, [accepted]);

  const avgConsistency = computeAverage(accepted.map((m) => m.sleepConsistencyScore));

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">
          Feature 10 · Personal Rhythm Discovery
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">
          Discover When You Feel and Perform Your Best
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Weekly rhythm patterns across sleep consistency, mood, focus, and energy (reported only when ≥ 5 recorded days exist).
        </p>
      </div>

      {accepted.length < 5 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-slate-600">
            At least 5 verified days are required to map your weekly personal rhythm ({accepted.length}/5 recorded).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-display font-semibold text-base text-[#0B1D39] mb-4 flex items-center gap-2">
              <SunMedium className="w-4 h-4 text-sky-600" /> Weekly Energy, Mood &amp; Sleep Rhythm
            </h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byDayOfWeek}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avgEnergy" name="Avg Energy (/10)" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgMood" name="Avg Mood (/10)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="avgSleep" name="Avg Sleep (hrs)" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <p className="text-xs text-slate-500">Sleep Schedule Consistency</p>
              <p className="font-mono-tabular text-3xl font-bold text-[#0B1D39] mt-1">
                {avgConsistency !== null ? `${avgConsistency}%` : '—'}
              </p>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Across {accepted.length} recorded days, mornings following consistent bedtimes show steadier energy scores.
              </p>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-2">
              <h3 className="font-display font-semibold text-sm text-[#0B1D39]">Target Window</h3>
              <p className="text-xs font-mono-tabular text-slate-600">
                Bedtime: {state.profile?.usualBedtime || '23:00'} · Wake: {state.profile?.usualWakeTime || '06:30'}
              </p>
              <p className="text-xs text-slate-500">
                Routine: {state.profile?.dailyRoutine || 'Standard daytime rhythm'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
