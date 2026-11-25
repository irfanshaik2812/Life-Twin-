import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  Clock,
  Droplets,
  Footprints,
  HeartPulse,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Smile,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { Line, LineChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useLifeTwin } from '../context/LifeTwinContext';
import { CameraPreset, DigitalTwinCanvas } from '../components/twin/DigitalTwinCanvas';
import { BodyRegion, HealthMeasurement } from '../types/lifetwin';
import { generateEvidenceInsights, getAcceptedMeasurements } from '../lib/analyticsEngine';

function buildDateTimeline(accepted: HealthMeasurement[]): Array<{ dateKey: string; record: HealthMeasurement | null }> {
  if (accepted.length === 0) return [];
  const byDate = new Map<string, HealthMeasurement>();
  for (const m of accepted) {
    byDate.set(m.dateKey, m);
  }
  const sortedKeys = Array.from(byDate.keys()).sort();
  const start = new Date(sortedKeys[0] + 'T00:00:00Z');
  const end = new Date(sortedKeys[sortedKeys.length - 1] + 'T00:00:00Z');
  const days: Array<{ dateKey: string; record: HealthMeasurement | null }> = [];
  const cur = new Date(start);
  while (cur <= end && days.length < 120) {
    const k = cur.toISOString().slice(0, 10);
    days.push({ dateKey: k, record: byDate.get(k) ?? null });
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export function DigitalTwinPage({ initialTimeTravel = false }: { initialTimeTravel?: boolean }) {
  const { state, apiFetch } = useLifeTwin();
  const accepted = useMemo(() => getAcceptedMeasurements(state.measurements), [state.measurements]);
  const timeline = useMemo(() => buildDateTimeline(accepted), [accepted]);
  const insights = useMemo(() => generateEvidenceInsights(state.measurements), [state.measurements]);

  const [selectedIndex, setSelectedIndex] = useState<number>(Math.max(0, timeline.length - 1));
  const [playing, setPlaying] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<BodyRegion>('whole');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('reset');
  const [zoomCmd, setZoomCmd] = useState<{ type: 'in' | 'out'; seq: number } | null>(null);
  const [mobilePanel, setMobilePanel] = useState<'vitals' | 'analytics'>('analytics');

  // Compare Two Moments state
  const [compareOpen, setCompareOpen] = useState(initialTimeTravel);
  const [dateA, setDateA] = useState(timeline[Math.max(0, timeline.length - 8)]?.dateKey || '');
  const [dateB, setDateB] = useState(timeline[Math.max(0, timeline.length - 1)]?.dateKey || '');
  const [compareResult, setCompareResult] = useState<{
    recordA: HealthMeasurement | null;
    recordB: HealthMeasurement | null;
    explanation: string;
    isDemoResponse: boolean;
  } | null>(null);
  const [comparing, setComparing] = useState(false);

  // Sync slider index when timeline populates
  useEffect(() => {
    if (timeline.length > 0 && selectedIndex >= timeline.length) {
      setSelectedIndex(timeline.length - 1);
    }
    if (timeline.length > 0 && !dateB) {
      setDateA(timeline[Math.max(0, timeline.length - 8)].dateKey);
      setDateB(timeline[timeline.length - 1].dateKey);
    }
  }, [timeline, selectedIndex, dateB]);

  // Play timeline animation across real available dates
  useEffect(() => {
    if (!playing || timeline.length <= 1) return;
    const timer = window.setInterval(() => {
      setSelectedIndex((prev) => {
        if (prev >= timeline.length - 1) {
          setPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 950);
    return () => window.clearInterval(timer);
  }, [playing, timeline.length]);

  const currentSlot = timeline[selectedIndex] ?? null;
  const activeRecord = currentSlot?.record ?? null;
  const missingData = Boolean(currentSlot && !activeRecord);

  const recentMiniSeries = useMemo(() => {
    const slice = accepted.slice(Math.max(0, selectedIndex - 9), selectedIndex + 1);
    return slice.map((m) => ({
      d: m.dateKey.slice(5),
      hr: m.heartRateBpm ?? 0,
      sleep: m.sleepHours ?? 0,
      steps: m.steps ?? 0,
      energy: m.energyScore ?? 0,
    }));
  }, [accepted, selectedIndex]);

  const jumpOffset = (daysAgo: number) => {
    if (timeline.length === 0) return;
    setPlaying(false);
    const idx = Math.max(0, timeline.length - 1 - daysAgo);
    setSelectedIndex(idx);
  };

  const handleExplainComparison = async () => {
    if (!dateA || !dateB) return;
    setComparing(true);
    try {
      const res = await apiFetch<{
        recordA: HealthMeasurement | null;
        recordB: HealthMeasurement | null;
        explanation: string;
        isDemoResponse: boolean;
      }>('/api/ai/compare-moments', {
        method: 'POST',
        body: JSON.stringify({ dateA, dateB }),
      });
      setCompareResult(res);
    } finally {
      setComparing(false);
    }
  };

  const regionDescriptions: Record<BodyRegion, string> = {
    whole: 'Whole-body overview integrating cardiovascular, sleep, movement, and lifestyle streams.',
    head: 'Head region: Sleep duration, sleep schedule consistency, mood, and self-reported focus.',
    chest: 'Chest region: Heart rate (BPM), resting heart rate, and experimental MAX30102 SpO2 estimates.',
    torso: 'Core region: Daily habits, hydration intake, evening screen exposure, and recovery notes.',
    limbs: 'Locomotor region: Daily steps, active minutes, and structured exercise sessions.',
  };

  return (
    <div className="min-h-[calc(100vh-57px)] bg-[#061021] text-slate-100 flex flex-col justify-between p-4 sm:p-5 gap-4">
      {/* Top 3-Column Immersive Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 items-stretch">
        {/* Mobile Panel Switcher */}
        <div className="lg:hidden flex gap-2">
          <button
            onClick={() => setMobilePanel('vitals')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
              mobilePanel === 'vitals'
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-[#0B172C] border-slate-800 text-slate-400'
            }`}
          >
            Profile &amp; Vitals
          </button>
          <button
            onClick={() => setMobilePanel('analytics')}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold border ${
              mobilePanel === 'analytics'
                ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                : 'bg-[#0B172C] border-slate-800 text-slate-400'
            }`}
          >
            Analytics &amp; AI
          </button>
        </div>

        {/* LEFT PANEL: Profile, Devices, Quick Vitals & Date Selector */}
        <aside
          className={`lg:col-span-3 space-y-3 ${
            mobilePanel === 'vitals' ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="rounded-xl bg-[#0B172C] border border-slate-800 p-4">
            <p className="text-[11px] font-mono-tabular text-sky-400 uppercase tracking-wider">Digital Twin Profile</p>
            <h2 className="font-display text-lg font-bold text-white mt-0.5">
              {state.profile?.fullName || 'Member'}
            </h2>
            <p className="text-xs font-mono-tabular text-slate-400 mt-1">
              {state.profile?.heightCm || 174} cm · {state.profile?.weightKg || 70} kg · {state.avatar?.bodyBuild || 'balanced'}
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              {state.devices.length > 0
                ? `${state.devices.length} connected source(s)`
                : 'No active device (Stored / Manual mode)'}
            </p>
          </div>

          <div className="rounded-xl bg-[#0B172C] border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-300">Selected Moment</span>
              <span className="text-xs font-mono-tabular text-white">
                {currentSlot?.dateKey || 'No history'}
              </span>
            </div>

            {missingData || !activeRecord ? (
              <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-amber-300">
                No recorded data for this period.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-[#081224] border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <HeartPulse className="w-3.5 h-3.5 text-cyan-400" /> Heart Rate
                  </span>
                  <p className="font-mono-tabular text-lg font-bold text-white mt-1">
                    {activeRecord.heartRateBpm ?? '—'} <span className="text-[10px] text-slate-400">BPM</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#081224] border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-sky-400" /> SpO2 (Exp.)
                  </span>
                  <p className="font-mono-tabular text-lg font-bold text-white mt-1">
                    {activeRecord.spo2Pct ?? '—'} <span className="text-[10px] text-slate-400">%</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#081224] border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Moon className="w-3.5 h-3.5 text-indigo-400" /> Sleep
                  </span>
                  <p className="font-mono-tabular text-lg font-bold text-white mt-1">
                    {activeRecord.sleepHours ?? '—'} <span className="text-[10px] text-slate-400">hrs</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-[#081224] border border-slate-800">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Footprints className="w-3.5 h-3.5 text-teal-400" /> Steps
                  </span>
                  <p className="font-mono-tabular text-lg font-bold text-white mt-1">
                    {activeRecord.steps?.toLocaleString() ?? '—'}
                  </p>
                </div>
              </div>
            )}

            <div className="pt-1">
              <p className="text-[11px] text-slate-400 mb-1.5">Quick Time Travel Presets</p>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  onClick={() => jumpOffset(0)}
                  className="py-1.5 px-2 rounded bg-[#081224] border border-slate-700 hover:border-sky-400 text-slate-200 cursor-pointer"
                >
                  Today / Latest
                </button>
                <button
                  onClick={() => jumpOffset(1)}
                  className="py-1.5 px-2 rounded bg-[#081224] border border-slate-700 hover:border-sky-400 text-slate-200 cursor-pointer"
                >
                  Yesterday
                </button>
                <button
                  onClick={() => jumpOffset(7)}
                  className="py-1.5 px-2 rounded bg-[#081224] border border-slate-700 hover:border-sky-400 text-slate-200 cursor-pointer"
                >
                  7 Days Ago
                </button>
                <button
                  onClick={() => jumpOffset(29)}
                  className="py-1.5 px-2 rounded bg-[#081224] border border-slate-700 hover:border-sky-400 text-slate-200 cursor-pointer"
                >
                  30 Days Ago
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-[#0B172C] border border-slate-800 p-4 text-xs space-y-2">
            <p className="font-semibold text-sky-300">Data Source &amp; Transparency</p>
            <p className="text-slate-400">
              {activeRecord
                ? `${activeRecord.isDemo ? 'DEMO DATA · ' : ''}${activeRecord.sourceDevice}`
                : 'No recorded data for this period.'}
            </p>
            <p className="text-[11px] text-amber-300/90">
              MAX30102 SpO2 readings are experimental estimates. Region selection highlights wellness trends, not medical diagnoses.
            </p>
          </div>
        </aside>

        {/* CENTER STAGE: INTERACTIVE 3D DIGITAL TWIN */}
        <section className="lg:col-span-5 flex flex-col rounded-2xl bg-[#061021] border border-slate-800 overflow-hidden min-h-[500px] lg:min-h-[600px]">
          {/* Region & Camera Toolbar */}
          <div className="p-3 bg-[#09162B] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1">
              {(['whole', 'head', 'chest', 'torso', 'limbs'] as BodyRegion[]).map((reg) => (
                <button
                  key={reg}
                  onClick={() => setSelectedRegion(reg)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-medium capitalize cursor-pointer ${
                    selectedRegion === reg
                      ? 'bg-cyan-500 text-slate-950 font-semibold'
                      : 'bg-[#0E1E38] text-slate-300 hover:text-white'
                  }`}
                >
                  {reg}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {(['front', 'side', 'back'] as CameraPreset[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setCameraPreset(p)}
                  className="px-2 py-1 rounded bg-[#0E1E38] text-[11px] text-slate-300 hover:text-white capitalize cursor-pointer"
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setZoomCmd((z) => ({ type: 'in', seq: (z?.seq || 0) + 1 }))}
                className="p-1.5 rounded bg-[#0E1E38] text-slate-300 hover:text-white cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoomCmd((z) => ({ type: 'out', seq: (z?.seq || 0) + 1 }))}
                className="p-1.5 rounded bg-[#0E1E38] text-slate-300 hover:text-white cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => {
                  setSelectedRegion('whole');
                  setCameraPreset('reset');
                }}
                className="p-1.5 rounded bg-[#0E1E38] text-slate-300 hover:text-white cursor-pointer"
                title="Reset Camera"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 relative">
            <DigitalTwinCanvas
              heightCm={state.profile?.heightCm || 174}
              weightKg={state.profile?.weightKg || 70}
              avatar={state.avatar}
              heartRateBpm={activeRecord?.heartRateBpm}
              spo2Pct={activeRecord?.spo2Pct}
              sleepHours={activeRecord?.sleepHours}
              steps={activeRecord?.steps}
              moodScore={activeRecord?.moodScore}
              energyScore={activeRecord?.energyScore}
              selectedRegion={selectedRegion}
              onSelectRegion={(reg) => setSelectedRegion(reg)}
              cameraPreset={cameraPreset}
              zoomCommand={zoomCmd}
              hasMissingData={missingData || !activeRecord}
            />
          </div>

          <div className="px-4 py-2.5 bg-[#09162B] border-t border-slate-800 text-xs text-sky-200/90">
            {regionDescriptions[selectedRegion]}
          </div>
        </section>

        {/* RIGHT PANEL: FLOATING ANALYTICS PANELS */}
        <aside
          className={`lg:col-span-4 space-y-3 ${
            mobilePanel === 'analytics' ? 'block' : 'hidden lg:block'
          }`}
        >
          {/* Heart Rate & Chest Analytics */}
          <div
            className={`rounded-xl bg-[#0B172C] border p-4 transition-colors ${
              selectedRegion === 'chest' ? 'border-cyan-400' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> Cardiovascular &amp; SpO2 Panel
              </span>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                RHR {activeRecord?.restingHrBpm ?? '—'} BPM
              </span>
            </div>
            <div className="h-20 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={recentMiniSeries}>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B172C', borderColor: '#1e293b', fontSize: 11 }}
                  />
                  <Line type="monotone" dataKey="hr" stroke="#22d3ee" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {activeRecord?.isExperimentalSpo2
                ? `Experimental SpO2: ${activeRecord.spo2Pct}% (not clinically validated)`
                : `Source: ${activeRecord?.sourceDevice || 'Unavailable'}`}
            </p>
          </div>

          {/* Sleep & Mood / Head Region */}
          <div
            className={`rounded-xl bg-[#0B172C] border p-4 transition-colors ${
              selectedRegion === 'head' ? 'border-cyan-400' : 'border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
                <Smile className="w-3.5 h-3.5" /> Sleep, Mood &amp; Energy Panel
              </span>
              <span className="text-[11px] font-mono-tabular text-slate-400">
                Consistency {activeRecord?.sleepConsistencyScore ?? '—'}%
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-mono-tabular">
              <div className="p-2 rounded bg-[#081224]">
                <span className="text-[10px] text-slate-400 block">Sleep</span>
                <strong>{activeRecord?.sleepHours ?? '—'}h</strong>
              </div>
              <div className="p-2 rounded bg-[#081224]">
                <span className="text-[10px] text-slate-400 block">Mood</span>
                <strong>{activeRecord?.moodScore ?? '—'}/10</strong>
              </div>
              <div className="p-2 rounded bg-[#081224]">
                <span className="text-[10px] text-slate-400 block">Energy</span>
                <strong>{activeRecord?.energyScore ?? '—'}/10</strong>
              </div>
            </div>
          </div>

          {/* Activity & Lifestyle Panel */}
          <div
            className={`rounded-xl bg-[#0B172C] border p-4 transition-colors ${
              selectedRegion === 'limbs' || selectedRegion === 'torso' ? 'border-cyan-400' : 'border-slate-800'
            }`}
          >
            <span className="text-xs font-semibold text-teal-300">Activity &amp; Lifestyle Context</span>
            <p className="text-xs text-slate-300 mt-1.5 font-mono-tabular">
              Exercise: {activeRecord?.exerciseType || '—'} ({activeRecord?.exerciseMinutes ?? 0}m) · Water:{' '}
              {activeRecord?.waterLiters ?? '—'}L · Screen: {activeRecord?.screenTimeMinutes ?? '—'}m
            </p>
            {activeRecord?.notes && (
              <p className="text-[11px] text-slate-400 mt-1.5">&ldquo;{activeRecord.notes}&rdquo;</p>
            )}
          </div>

          {/* AI Observation Panel */}
          <div className="rounded-xl bg-[#0B172C] border border-slate-800 p-4 space-y-2">
            <span className="text-xs font-semibold text-sky-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Evidence-Based Twin Observation
            </span>
            {insights.length > 0 ? (
              <>
                <p className="text-xs text-slate-200 leading-relaxed">{insights[0].observation}</p>
                <p className="text-[11px] text-slate-400">
                  {insights[0].matchedDays} of {insights[0].totalSampleDays} days · {insights[0].alternativeExplanations}
                </p>
              </>
            ) : (
              <p className="text-xs text-slate-400">
                Add at least 4 recorded days to unlock historical evidence observations.
              </p>
            )}
          </div>
        </aside>
      </div>

      {/* BOTTOM TIME-TRAVEL TIMELINE DOCK */}
      <section className="rounded-2xl bg-[#0B172C] border border-slate-800 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="font-display font-semibold text-sm text-white">Time-Travel Health Timeline</span>
            <span className="text-xs font-mono-tabular text-cyan-300 ml-2">
              {currentSlot ? currentSlot.dateKey : 'No history'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setPlaying(false);
                setSelectedIndex((i) => Math.max(0, i - 1));
              }}
              disabled={selectedIndex <= 0}
              className="px-2.5 py-1.5 rounded-lg bg-[#081224] border border-slate-700 text-xs text-slate-200 hover:border-sky-400 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Prev
            </button>
            <button
              onClick={() => {
                if (selectedIndex >= timeline.length - 1) setSelectedIndex(0);
                setPlaying(!playing);
              }}
              disabled={timeline.length <= 1}
              className="px-3.5 py-1.5 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 cursor-pointer inline-flex items-center gap-1.5"
            >
              {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              {playing ? 'Pause' : 'Play Timeline'}
            </button>
            <button
              onClick={() => {
                setPlaying(false);
                setSelectedIndex((i) => Math.min(timeline.length - 1, i + 1));
              }}
              disabled={selectedIndex >= timeline.length - 1}
              className="px-2.5 py-1.5 rounded-lg bg-[#081224] border border-slate-700 text-xs text-slate-200 hover:border-sky-400 disabled:opacity-40 cursor-pointer inline-flex items-center gap-1"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => jumpOffset(0)}
              className="px-3 py-1.5 rounded-lg bg-[#0E1E38] text-xs font-medium text-sky-200 hover:bg-sky-900/40 cursor-pointer"
            >
              Travel to Today
            </button>
            <button
              onClick={() => setCompareOpen(!compareOpen)}
              className="px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-500 cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {compareOpen ? 'Hide Compare' : 'Compare Two Dates'}
            </button>
          </div>
        </div>

        {timeline.length > 0 && (
          <div className="space-y-1">
            <input
              type="range"
              min={0}
              max={timeline.length - 1}
              value={selectedIndex}
              onChange={(e) => {
                setPlaying(false);
                setSelectedIndex(Number(e.target.value));
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] font-mono-tabular text-slate-400">
              <span>{timeline[0].dateKey}</span>
              <span>
                Day {selectedIndex + 1} of {timeline.length}
                {missingData ? ' · No recorded data for this period' : ''}
              </span>
              <span>{timeline[timeline.length - 1].dateKey}</span>
            </div>
          </div>
        )}

        {/* COMPARE TWO MOMENTS PANEL */}
        {compareOpen && timeline.length > 0 && (
          <div className="pt-4 mt-2 border-t border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="text-slate-400">Moment A:</label>
                <select
                  value={dateA}
                  onChange={(e) => setDateA(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#081224] border border-slate-700 text-white font-mono-tabular"
                >
                  {timeline.map((t) => (
                    <option key={t.dateKey} value={t.dateKey}>
                      {t.dateKey} {t.record ? '' : '(No data)'}
                    </option>
                  ))}
                </select>
                <label className="text-slate-400">Moment B:</label>
                <select
                  value={dateB}
                  onChange={(e) => setDateB(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#081224] border border-slate-700 text-white font-mono-tabular"
                >
                  {timeline.map((t) => (
                    <option key={t.dateKey} value={t.dateKey}>
                      {t.dateKey} {t.record ? '' : '(No data)'}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleExplainComparison}
                disabled={comparing}
                className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs hover:bg-cyan-400 cursor-pointer disabled:opacity-50"
              >
                {comparing ? 'Analyzing Differences…' : 'Explain These Changes'}
              </button>
            </div>

            {compareResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono-tabular">
                  {[
                    { label: `Moment A (${dateA})`, rec: compareResult.recordA },
                    { label: `Moment B (${dateB})`, rec: compareResult.recordB },
                  ].map((item) => (
                    <div key={item.label} className="p-3.5 rounded-xl bg-[#081224] border border-slate-800">
                      <p className="font-sans font-semibold text-sky-300 mb-2">{item.label}</p>
                      {item.rec ? (
                        <div className="grid grid-cols-3 gap-2">
                          <span>HR: {item.rec.heartRateBpm ?? '—'} bpm</span>
                          <span>RHR: {item.rec.restingHrBpm ?? '—'} bpm</span>
                          <span>Sleep: {item.rec.sleepHours ?? '—'}h</span>
                          <span>Steps: {item.rec.steps?.toLocaleString() ?? '—'}</span>
                          <span>Mood: {item.rec.moodScore ?? '—'}/10</span>
                          <span>Energy: {item.rec.energyScore ?? '—'}/10</span>
                        </div>
                      ) : (
                        <p className="text-amber-300">No recorded data for this period.</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="p-3.5 rounded-xl bg-sky-950/60 border border-sky-700/60 text-xs text-sky-100 leading-relaxed">
                  {compareResult.explanation}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
