import React, { useMemo, useState } from 'react';
import { CalendarDays, Edit2, Plus, Trash2 } from 'lucide-react';
import { useLifeTwin } from '../context/LifeTwinContext';
import { computeAverage } from '../lib/analyticsEngine';
import { HealthMeasurement } from '../types/lifetwin';

const HABIT_CHIPS = [
  'Consistent Bedtime',
  'Hydration Goal',
  'Daily Movement',
  'Evening Reflection',
  'Screen Pause Before Bed',
  'Mindfulness',
];

export function LifestyleTrackerPage() {
  const { state, apiFetch } = useLifeTwin();
  const [view, setView] = useState<'records' | 'calendar'>('records');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    dateKey: new Date().toISOString().slice(0, 10),
    sleepStart: '23:00',
    sleepEnd: '06:30',
    sleepHours: 7.5,
    exerciseType: 'Brisk Walk',
    exerciseMinutes: 30,
    steps: 7800,
    activeMinutes: 45,
    moodScore: 7.5,
    energyScore: 7.5,
    focusScore: 7.5,
    waterLiters: 2.2,
    screenTimeMinutes: 55,
    habits: ['Hydration Goal', 'Daily Movement'] as string[],
    notes: '',
  });

  const sorted = useMemo(
    () => [...state.measurements].filter((m) => !m.isRejected).sort((a, b) => b.dateKey.localeCompare(a.dateKey)),
    [state.measurements]
  );

  const last7 = sorted.slice(0, 7);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await apiFetch(`/api/measurements/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(form),
        });
        setEditingId(null);
      } else {
        await apiFetch('/api/measurements', {
          method: 'POST',
          body: JSON.stringify({
            ...form,
            sourceDevice: 'Manual Lifestyle Tracker',
            sourceType: 'manual',
            isDemo: false,
          }),
        });
      }
      setForm((prev) => ({ ...prev, notes: '' }));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (m: HealthMeasurement) => {
    setEditingId(m.id);
    setForm({
      dateKey: m.dateKey,
      sleepStart: m.sleepStart || '23:00',
      sleepEnd: m.sleepEnd || '06:30',
      sleepHours: m.sleepHours ?? 7.5,
      exerciseType: m.exerciseType || 'Brisk Walk',
      exerciseMinutes: m.exerciseMinutes ?? 30,
      steps: m.steps ?? 7500,
      activeMinutes: m.activeMinutes ?? 40,
      moodScore: m.moodScore ?? 7,
      energyScore: m.energyScore ?? 7,
      focusScore: m.focusScore ?? 7,
      waterLiters: m.waterLiters ?? 2.0,
      screenTimeMinutes: m.screenTimeMinutes ?? 60,
      habits: m.habits || [],
      notes: m.notes || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/measurements/${id}`, { method: 'DELETE' });
  };

  const toggleHabit = (h: string) =>
    setForm((f) => ({
      ...f,
      habits: f.habits.includes(h) ? f.habits.filter((x) => x !== h) : [...f.habits, h],
    }));

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Lifestyle Tracker</h1>
          <p className="text-sm text-slate-600 mt-1">
            Log sleep schedule, exercise, daily movement, mood, energy, hydration, and habits to power your LifeTwin analytics.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg self-start">
          <button
            onClick={() => setView('records')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              view === 'records' ? 'bg-[#0B1D39] text-white' : 'text-slate-600'
            }`}
          >
            Historical Records
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer ${
              view === 'calendar' ? 'bg-[#0B1D39] text-white' : 'text-slate-600'
            }`}
          >
            Calendar View
          </button>
        </div>
      </div>

      {/* Weekly Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">7-Day Avg Sleep</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39] mt-1">
            {computeAverage(last7.map((m) => m.sleepHours)) ?? '—'} <span className="text-xs font-normal text-slate-500">hrs</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">7-Day Avg Exercise</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39] mt-1">
            {computeAverage(last7.map((m) => m.exerciseMinutes)) ?? '—'} <span className="text-xs font-normal text-slate-500">min</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">7-Day Avg Mood</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39] mt-1">
            {computeAverage(last7.map((m) => m.moodScore)) ?? '—'} <span className="text-xs font-normal text-slate-500">/10</span>
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">7-Day Avg Energy</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39] mt-1">
            {computeAverage(last7.map((m) => m.energyScore)) ?? '—'} <span className="text-xs font-normal text-slate-500">/10</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        <form onSubmit={handleSave} className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold text-lg text-[#0B1D39]">
              {editingId ? 'Edit Lifestyle Entry' : 'Add Daily Entry'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={() => setEditingId(null)}
                className="text-xs text-slate-500 hover:underline cursor-pointer"
              >
                Cancel Edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={form.dateKey}
                onChange={(e) => setForm({ ...form, dateKey: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sleep Duration (hrs)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                max={16}
                value={form.sleepHours}
                onChange={(e) => setForm({ ...form, sleepHours: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sleep Start</label>
              <input
                type="time"
                value={form.sleepStart}
                onChange={(e) => setForm({ ...form, sleepStart: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Wake-up Time</label>
              <input
                type="time"
                value={form.sleepEnd}
                onChange={(e) => setForm({ ...form, sleepEnd: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Exercise Type</label>
              <input
                type="text"
                value={form.exerciseType}
                onChange={(e) => setForm({ ...form, exerciseType: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Exercise (min)</label>
              <input
                type="number"
                min={0}
                value={form.exerciseMinutes}
                onChange={(e) => setForm({ ...form, exerciseMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Daily Steps</label>
              <input
                type="number"
                min={0}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Water Intake (L)</label>
              <input
                type="number"
                step="0.1"
                min={0}
                value={form.waterLiters}
                onChange={(e) => setForm({ ...form, waterLiters: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Mood (1–10)</label>
              <input
                type="number"
                step="0.5"
                min={1}
                max={10}
                value={form.moodScore}
                onChange={(e) => setForm({ ...form, moodScore: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Energy (1–10)</label>
              <input
                type="number"
                step="0.5"
                min={1}
                max={10}
                value={form.energyScore}
                onChange={(e) => setForm({ ...form, energyScore: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Evening Screen (min)</label>
              <input
                type="number"
                min={0}
                value={form.screenTimeMinutes}
                onChange={(e) => setForm({ ...form, screenTimeMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Active Min</label>
              <input
                type="number"
                min={0}
                value={form.activeMinutes}
                onChange={(e) => setForm({ ...form, activeMinutes: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">Personal Habits</label>
            <div className="flex flex-wrap gap-1.5">
              {HABIT_CHIPS.map((h) => {
                const active = form.habits.includes(h);
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => toggleHabit(h)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium border cursor-pointer ${
                      active ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {h}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Reflections, meals, caffeine timing, or stress notes…"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold hover:bg-[#132E59] cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {saving ? 'Saving…' : editingId ? 'Update Entry' : 'Save Lifestyle Entry'}
          </button>
        </form>

        {/* Records / Calendar View */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6">
          {view === 'records' ? (
            <div className="space-y-3">
              <h2 className="font-display font-semibold text-lg text-[#0B1D39]">
                Recorded Entries ({sorted.length})
              </h2>
              {sorted.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No lifestyle entries recorded yet. Add your first entry on the left.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-1">
                  {sorted.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl border border-slate-200/90 hover:border-sky-200 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs font-mono-tabular text-slate-500">
                          <span className="font-semibold text-[#0B1D39]">{m.dateKey}</span>
                          {' · '}
                          <span>{m.isDemo ? 'DEMO DATA · ' : ''}{m.sourceDevice}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => startEdit(m)}
                            className="p-1 text-slate-500 hover:text-sky-700 cursor-pointer"
                            title="Edit entry"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(m.id)}
                            className="p-1 text-slate-500 hover:text-rose-600 cursor-pointer"
                            title="Delete entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-3 sm:grid-cols-5 gap-2 text-xs font-mono-tabular">
                        <div>Sleep: <strong>{m.sleepHours ?? '—'}h</strong></div>
                        <div>Steps: <strong>{m.steps?.toLocaleString() ?? '—'}</strong></div>
                        <div>Exercise: <strong>{m.exerciseMinutes ?? '—'}m</strong></div>
                        <div>Mood: <strong>{m.moodScore ?? '—'}/10</strong></div>
                        <div>Energy: <strong>{m.energyScore ?? '—'}/10</strong></div>
                      </div>

                      {m.notes && <p className="mt-2 text-xs text-slate-600">{m.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CalendarDays className="w-4 h-4 text-sky-600" />
                <h2 className="font-display font-semibold text-lg text-[#0B1D39]">30-Day Activity &amp; Sleep Calendar</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {sorted.slice(0, 30).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => startEdit(m)}
                    className="p-3 rounded-xl border border-slate-200 text-left hover:border-sky-400 transition-colors cursor-pointer"
                  >
                    <p className="font-mono-tabular text-[11px] text-slate-500">{m.dateKey}</p>
                    <p className="font-mono-tabular text-sm font-bold text-[#0B1D39] mt-1">
                      {m.sleepHours ?? '—'}h sleep
                    </p>
                    <p className="font-mono-tabular text-[11px] text-sky-700 mt-0.5">
                      Energy {m.energyScore ?? '—'}/10
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
