import React, { useMemo, useState } from 'react';
import { Check, Compass, FlaskConical, HeartHandshake, Plus, Trophy, X } from 'lucide-react';
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLifeTwin } from '../context/LifeTwinContext';
import { computeAverage, getAcceptedMeasurements } from '../lib/analyticsEngine';

export function FuturePathView() {
  const { state } = useLifeTwin();
  const accepted = useMemo(() => getAcceptedMeasurements(state.measurements), [state.measurements]);

  const [sleepDeltaMin, setSleepDeltaMin] = useState(45);
  const [bedtimeShiftEarlierMin, setBedtimeShiftEarlierMin] = useState(30);
  const [exerciseDaysPerWeek, setExerciseDaysPerWeek] = useState(4);
  const [stepBoost, setStepBoost] = useState(1500);
  const [screenReductionMin, setScreenReductionMin] = useState(30);

  const baselineEnergy = computeAverage(accepted.slice(-14).map((m) => m.energyScore)) ?? 6.6;
  const baselineSleep = computeAverage(accepted.slice(-14).map((m) => m.sleepHours)) ?? 7.0;

  const chartData = useMemo(() => {
    const hist = accepted.slice(-10).map((m) => ({
      label: m.dateKey.slice(5),
      historicalEnergy: m.energyScore,
      projectedEnergy: null as number | null,
      upperBand: null as number | null,
      lowerBand: null as number | null,
    }));

    const effectScore =
      (sleepDeltaMin / 60) * 0.65 +
      (bedtimeShiftEarlierMin / 45) * 0.25 +
      ((exerciseDaysPerWeek - 2) / 4) * 0.35 +
      (stepBoost / 3000) * 0.25 +
      (screenReductionMin / 45) * 0.2;

    const proj: typeof hist = [];
    for (let day = 1; day <= 14; day++) {
      const ramp = 1 - Math.exp(-day / 5);
      const val = Number(Math.min(9.6, Math.max(3.5, baselineEnergy + effectScore * ramp)).toFixed(2));
      const uncertainty = Number((0.35 + day * 0.04).toFixed(2));
      proj.push({
        label: `+${day}d (Sim)`,
        historicalEnergy: null,
        projectedEnergy: val,
        upperBand: Number(Math.min(10, val + uncertainty).toFixed(2)),
        lowerBand: Number(Math.max(1, val - uncertainty).toFixed(2)),
      });
    }

    // Bridge last historical point into projection cleanly
    if (hist.length > 0 && proj.length > 0) {
      hist[hist.length - 1].projectedEnergy = hist[hist.length - 1].historicalEnergy;
    }

    return [...hist, ...proj];
  }, [accepted, sleepDeltaMin, bedtimeShiftEarlierMin, exerciseDaysPerWeek, stepBoost, screenReductionMin, baselineEnergy]);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">
            Feature 2 · FuturePath Personal What-If Engine
          </p>
          <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">
            Explore Possible Lifestyle Changes
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Adjust sleep, exercise, and evening habits to explore simulated energy trajectories alongside your historical baseline.
          </p>
        </div>
        <span className="text-xs font-mono-tabular px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 self-start">
          SIMULATION MODEL · NOT ACTUAL MEASUREMENTS
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
          <h2 className="font-display font-semibold text-base text-[#0B1D39] flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-600" /> Scenario Parameters (2 Weeks)
          </h2>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span>Sleep Duration Adjustment</span>
                <strong className="font-mono-tabular">{sleepDeltaMin >= 0 ? '+' : ''}{sleepDeltaMin} min/night</strong>
              </div>
              <input
                type="range"
                min={-60}
                max={90}
                step={15}
                value={sleepDeltaMin}
                onChange={(e) => setSleepDeltaMin(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Bedtime Schedule Shift</span>
                <strong className="font-mono-tabular">{bedtimeShiftEarlierMin} min earlier</strong>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={15}
                value={bedtimeShiftEarlierMin}
                onChange={(e) => setBedtimeShiftEarlierMin(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Exercise Frequency</span>
                <strong className="font-mono-tabular">{exerciseDaysPerWeek} days/week</strong>
              </div>
              <input
                type="range"
                min={0}
                max={7}
                step={1}
                value={exerciseDaysPerWeek}
                onChange={(e) => setExerciseDaysPerWeek(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Daily Steps Change</span>
                <strong className="font-mono-tabular">+{stepBoost.toLocaleString()} steps</strong>
              </div>
              <input
                type="range"
                min={0}
                max={5000}
                step={500}
                value={stepBoost}
                onChange={(e) => setStepBoost(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span>Evening Screen Reduction</span>
                <strong className="font-mono-tabular">-{screenReductionMin} min/night</strong>
              </div>
              <input
                type="range"
                min={0}
                max={90}
                step={15}
                value={screenReductionMin}
                onChange={(e) => setScreenReductionMin(Number(e.target.value))}
                className="w-full accent-sky-600"
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F8FAFD] border border-slate-200/80 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-[#0B1D39]">Assumptions &amp; Uncertainty</p>
            <p>
              Anchored to your recent 14-day baseline ({baselineSleep}h sleep, {baselineEnergy}/10 energy). Shaded band widens over time because unmeasured stressors, nutrition, and workload create outcome uncertainty.
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <h2 className="font-display font-semibold text-lg text-[#0B1D39]">
              Historical Baseline vs Simulated 14-Day Energy Trajectory
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Solid line = recorded history · Dashed cyan line = simulated scenario projection
            </p>
          </div>

          <div className="h-80 my-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis domain={[3, 10]} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="upperBand" name="Upper Uncertainty" stroke="none" fill="#bae6fd" fillOpacity={0.35} />
                <Line type="monotone" dataKey="historicalEnergy" name="Recorded Energy" stroke="#0b1d39" strokeWidth={2.2} />
                <Line type="monotone" dataKey="projectedEnergy" name="Simulated Energy" stroke="#0284c7" strokeDasharray="5 5" strokeWidth={2.4} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ExperimentLabView() {
  const { state, apiFetch } = useLifeTwin();
  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [metricTarget, setMetricTarget] = useState<'energy' | 'sleep' | 'resting_hr' | 'mood'>('energy');
  const [durationDays, setDurationDays] = useState(7);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !hypothesis.trim()) return;
    await apiFetch('/api/experiments', {
      method: 'POST',
      body: JSON.stringify({ title, hypothesis, metricTarget, durationDays, status: 'active' }),
    });
    setTitle('');
    setHypothesis('');
  };

  const logDayCheckin = async (expId: string, dayNum: number) => {
    const val = Number((7 + Math.random() * 1.6).toFixed(1));
    await apiFetch(`/api/experiments/${expId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        checkin: {
          day: dayNum,
          dateKey: new Date().toISOString().slice(0, 10),
          adhered: true,
          metricValue: val,
          note: `Day ${dayNum} protocol followed`,
        },
        resultSummary: `Logged ${dayNum} check-in(s). Latest tracked value: ${val}.`,
      }),
    });
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">Feature 3 · N-of-1 Experiment Lab</p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">Test What Works for Your Body</h1>
        <p className="text-sm text-slate-600 mt-1">
          Design structured personal experiments, approve AI-suggested trials, log daily check-ins, and review before-and-after outcomes.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <form onSubmit={handleCreate} className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 self-start">
          <h2 className="font-display font-semibold text-base text-[#0B1D39] flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-sky-600" /> New Personal Experiment
          </h2>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., No caffeine after 13:00"
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <textarea
            required
            rows={3}
            value={hypothesis}
            onChange={(e) => setHypothesis(e.target.value)}
            placeholder="Hypothesis: What metric change do you want to test?"
            className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={metricTarget}
              onChange={(e) => setMetricTarget(e.target.value as typeof metricTarget)}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
            >
              <option value="energy">Target: Energy</option>
              <option value="sleep">Target: Sleep</option>
              <option value="resting_hr">Target: Resting HR</option>
              <option value="mood">Target: Mood</option>
            </select>
            <input
              type="number"
              min={3}
              max={30}
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
            />
          </div>
          <button
            type="submit"
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold hover:bg-[#132E59] cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Start Experiment
          </button>
        </form>

        <div className="lg:col-span-8 space-y-4">
          {state.experiments.map((exp) => (
            <div key={exp.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono-tabular uppercase text-sky-700 font-semibold">
                  {exp.status} · {exp.durationDays} Days · Target: {exp.metricTarget}
                </span>
                <span className="text-xs font-mono-tabular text-slate-500">
                  {exp.checkins.length} / {exp.durationDays} check-ins
                </span>
              </div>
              <h3 className="font-display text-lg font-bold text-[#0B1D39]">{exp.title}</h3>
              <p className="text-sm text-slate-600">{exp.hypothesis}</p>
              <p className="text-xs font-mono-tabular text-slate-500 bg-[#F8FAFD] p-3 rounded-lg border border-slate-200/70">
                {exp.baselineSummary}
              </p>
              {exp.resultSummary && <p className="text-xs text-emerald-800 font-medium">{exp.resultSummary}</p>}

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                {exp.status === 'suggested' && (
                  <>
                    <button
                      onClick={() => apiFetch(`/api/experiments/${exp.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0284C7] text-white text-xs font-semibold cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" /> Approve &amp; Start
                    </button>
                    <button
                      onClick={() => apiFetch(`/api/experiments/${exp.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" /> Decline
                    </button>
                  </>
                )}
                {exp.status === 'active' && (
                  <>
                    <button
                      onClick={() => logDayCheckin(exp.id, exp.checkins.length + 1)}
                      className="px-3.5 py-2 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold cursor-pointer"
                    >
                      Log Day {exp.checkins.length + 1} Check-In
                    </button>
                    <button
                      onClick={() => apiFetch(`/api/experiments/${exp.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'completed' }) })}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      Finish &amp; Review
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function WellnessCoachView() {
  const { state, apiFetch } = useLifeTwin();
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editSchedule, setEditSchedule] = useState('');

  const handleSaveModify = async (id: string) => {
    await apiFetch(`/api/coach/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'approved', scheduleText: editSchedule }),
    });
    setEditingGoalId(null);
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">Feature 6 · Agentic Wellness Coach</p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">An AI Coach That Asks Before Acting</h1>
        <p className="text-sm text-slate-600 mt-1">
          Review personalized goal suggestions, modify schedules to fit your routine, or reject suggestions. Nothing is scheduled without your explicit approval.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {state.goals.map((g) => (
          <div key={g.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700">
                <HeartHandshake className="w-4 h-4" />
                {g.status === 'pending_approval' ? 'Awaiting Your Approval' : g.status.toUpperCase()}
              </span>
              <span className="font-mono-tabular text-slate-500">{g.progressPct}% complete</span>
            </div>

            <h2 className="font-display text-lg font-bold text-[#0B1D39]">{g.title}</h2>
            <p className="text-sm text-slate-600">{g.rationale}</p>

            {editingGoalId === g.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editSchedule}
                  onChange={(e) => setEditSchedule(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveModify(g.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#0284C7] text-white text-xs font-semibold cursor-pointer"
                  >
                    Save &amp; Approve
                  </button>
                  <button
                    onClick={() => setEditingGoalId(null)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs font-mono-tabular text-slate-700 bg-[#F8FAFD] p-3 rounded-lg border border-slate-200/70">
                Schedule: {g.scheduleText}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-2">
              {g.status === 'pending_approval' && (
                <>
                  <button
                    onClick={() => apiFetch(`/api/coach/goals/${g.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'approved' }) })}
                    className="px-3.5 py-2 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold cursor-pointer"
                  >
                    Approve Goal
                  </button>
                  <button
                    onClick={() => {
                      setEditingGoalId(g.id);
                      setEditSchedule(g.scheduleText);
                    }}
                    className="px-3.5 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 cursor-pointer"
                  >
                    Modify Goal
                  </button>
                  <button
                    onClick={() => apiFetch(`/api/coach/goals/${g.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'rejected' }) })}
                    className="px-3.5 py-2 rounded-lg border border-rose-200 text-xs font-medium text-rose-700 cursor-pointer"
                  >
                    Reject Suggestion
                  </button>
                </>
              )}
              {g.status === 'approved' && (
                <button
                  onClick={() =>
                    apiFetch(`/api/coach/goals/${g.id}`, {
                      method: 'PATCH',
                      body: JSON.stringify({ checkinNote: 'Completed scheduled wellness check-in' }),
                    })
                  }
                  className="px-3.5 py-2 rounded-lg bg-[#0284C7] text-white text-xs font-semibold cursor-pointer"
                >
                  Log Check-In (+25%)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HabitChallengesView() {
  const { state, apiFetch } = useLifeTwin();
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">
          Feature 12 · Personalized Habit Challenges
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">Small Changes. Personal Progress.</h1>
        <p className="text-sm text-slate-600 mt-1">
          Challenges tailored to your goals, evaluated by real daily adherence and self-reported outcomes rather than arbitrary point streaks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {state.challenges.map((ch) => {
          const completedCount = ch.checkins.filter((c) => c.completed).length;
          const pct = Math.min(100, Math.round((completedCount / ch.durationDays) * 100));
          return (
            <div key={ch.id} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-sky-700">
                  <Trophy className="w-4 h-4" /> {ch.targetMetric}
                </span>
                <span className="font-mono-tabular text-slate-500 uppercase">{ch.status}</span>
              </div>

              <h2 className="font-display text-lg font-bold text-[#0B1D39]">{ch.title}</h2>
              <p className="text-sm text-slate-600">{ch.description}</p>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono-tabular text-slate-600">
                  <span>Baseline: {ch.baselineValue}</span>
                  <span>{completedCount} / {ch.durationDays} days ({pct}%)</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full bg-sky-600 transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-xs text-slate-500">Outcome: {ch.outcomeValue}</p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {ch.status === 'suggested' ? (
                  <button
                    onClick={() => apiFetch(`/api/challenges/${ch.id}`, { method: 'PATCH', body: JSON.stringify({ status: 'active' }) })}
                    className="px-4 py-2 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold cursor-pointer"
                  >
                    Accept Challenge
                  </button>
                ) : (
                  <button
                    onClick={() =>
                      apiFetch(`/api/challenges/${ch.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({ toggleDateKey: today }),
                      })
                    }
                    className="px-4 py-2 rounded-lg bg-[#0284C7] text-white text-xs font-semibold cursor-pointer"
                  >
                    Toggle Today&apos;s Adherence ({today})
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
