import React, { useMemo, useState } from 'react';
import { Bot, Download, Send, ShieldCheck, Trash2, FileText } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLifeTwin } from '../context/LifeTwinContext';
import { computeAverage, generateEvidenceInsights, getAcceptedMeasurements } from '../lib/analyticsEngine';

const SUGGESTED_QUESTIONS = [
  'How was my sleep this week?',
  'What happened to my heart rate over the last seven days?',
  'Is there a relationship between my sleep and energy?',
  'Compare this week with the previous week.',
  'What personal experiment should I try?',
  'What patterns have you noticed in my lifestyle?',
];

export function AIAssistantView() {
  const { state, apiFetch } = useLifeTwin();
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    setSending(true);
    setInput('');
    try {
      await apiFetch('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ message: text }),
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-6 flex flex-col h-[calc(100vh-70px)]">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1D39]">
            Your Personal Health Intelligence Assistant
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Grounded strictly in your authorized physiological &amp; lifestyle records.
            {state.privacy?.localFirstMode
              ? ' · Local-First Mode (on-server deterministic synthesis)'
              : state.capabilities.geminiConfigured
              ? ' · Server-Side Gemini AI Connected'
              : ' · Demo Local Analytics Assistant (configure GEMINI_API_KEY for Gemini synthesis)'}
          </p>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap gap-2 mb-4">
        {SUGGESTED_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => sendMessage(q)}
            disabled={sending}
            className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 hover:border-sky-400 hover:text-[#0B1D39] transition-colors cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Conversation History */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-5 overflow-y-auto space-y-4">
        {state.chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
            <Bot className="w-9 h-9 text-sky-600 mb-3" />
            <p className="font-display font-semibold text-base text-[#0B1D39]">
              Ask About Your Personal Patterns
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Click any suggested question above or ask about your sleep, resting heart rate, weekly comparisons, or next N-of-1 experiment.
            </p>
          </div>
        ) : (
          state.chatHistory.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-[#0B1D39] text-white'
                    : 'bg-[#F8FAFD] border border-slate-200 text-[#0B1D39]'
                }`}
              >
                {msg.content}
                {msg.role === 'assistant' && msg.references && msg.references.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/80 text-[11px] font-mono-tabular text-slate-500 space-y-0.5">
                    {msg.references.map((r, i) => (
                      <div key={i}>
                        Ref: {r.label} {r.dateRange ? `(${r.dateRange})` : ''} {r.metric ? `· ${r.metric}` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {sending && (
          <div className="text-xs font-mono-tabular text-sky-700">Analyzing authorized personal records…</div>
        )}
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
        className="mt-4 flex gap-3"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your sleep, heart rate, lifestyle patterns, or Digital Twin…"
          className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0284C7] text-white text-sm font-semibold hover:bg-sky-700 disabled:opacity-50 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          Send
        </button>
      </form>
    </div>
  );
}

export function ReportsView() {
  const { state } = useLifeTwin();
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const accepted = useMemo(() => getAcceptedMeasurements(state.measurements), [state.measurements]);
  const insights = useMemo(() => generateEvidenceInsights(state.measurements), [state.measurements]);

  const scoped = useMemo(() => {
    if (period === 'daily') return accepted.slice(-1);
    if (period === 'weekly') return accepted.slice(-7);
    return accepted.slice(-30);
  }, [accepted, period]);

  const summary = {
    count: scoped.length,
    avgHr: computeAverage(scoped.map((m) => m.heartRateBpm)),
    avgRhr: computeAverage(scoped.map((m) => m.restingHrBpm)),
    avgSpo2: computeAverage(scoped.map((m) => m.spo2Pct)),
    avgSleep: computeAverage(scoped.map((m) => m.sleepHours)),
    avgSteps: computeAverage(scoped.map((m) => m.steps)),
    avgEnergy: computeAverage(scoped.map((m) => m.energyScore)),
    avgMood: computeAverage(scoped.map((m) => m.moodScore)),
  };

  const exportPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('LifeTwin AI — Personal Wellness Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`User: ${state.profile?.fullName || state.user?.email || 'Member'}`, 14, 28);
    doc.text(`Period: ${period.toUpperCase()} (${summary.count} verified samples)`, 14, 34);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 40);

    doc.setFontSize(12);
    doc.text('Physiological & Lifestyle Averages', 14, 52);
    doc.setFontSize(10);
    doc.text(`• Heart Rate: ${summary.avgHr ?? 'No data'} BPM`, 16, 60);
    doc.text(`• Resting Heart Rate: ${summary.avgRhr ?? 'No data'} BPM`, 16, 66);
    doc.text(`• Experimental SpO2 Estimate: ${summary.avgSpo2 ?? 'No data'}% (not clinically validated)`, 16, 72);
    doc.text(`• Sleep Duration: ${summary.avgSleep ?? 'No data'} hrs`, 16, 78);
    doc.text(`• Daily Steps: ${summary.avgSteps ? Math.round(summary.avgSteps).toLocaleString() : 'No data'}`, 16, 84);
    doc.text(`• Mood / Energy: ${summary.avgMood ?? 'No data'} / ${summary.avgEnergy ?? 'No data'} (/10)`, 16, 90);

    doc.setFontSize(12);
    doc.text('Evidence-Based Observations', 14, 104);
    doc.setFontSize(9);
    let y = 112;
    insights.forEach((ins) => {
      const lines = doc.splitTextToSize(`${ins.title}: ${ins.observation} (${ins.matchedDays}/${ins.totalSampleDays} days)`, 180);
      doc.text(lines, 16, y);
      y += lines.length * 5 + 4;
    });

    doc.setFontSize(8);
    doc.text('Disclaimer: LifeTwin AI is a personal wellness intelligence platform, not a medical diagnostic tool.', 14, 282);
    doc.save(`lifetwin-${period}-report.pdf`);
  };

  return (
    <div className="max-w-[1320px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Wellness Reports &amp; Analytics</h1>
          <p className="text-sm text-slate-600 mt-1">
            Structured daily, weekly, and monthly summaries distinguishing recorded measurements, experimental estimates, and missing periods.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-white border border-slate-200 rounded-lg">
            {(['daily', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize cursor-pointer ${
                  period === p ? 'bg-[#0B1D39] text-white' : 'text-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            onClick={exportPdf}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0284C7] text-white text-xs font-semibold hover:bg-sky-700 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Recorded Samples</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39] mt-1">{summary.count}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Avg Resting HR</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39] mt-1">{summary.avgRhr ?? '—'} BPM</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Avg Sleep</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39] mt-1">{summary.avgSleep ?? '—'} hrs</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Avg Energy / Mood</p>
          <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39] mt-1">
            {summary.avgEnergy ?? '—'} / {summary.avgMood ?? '—'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <h2 className="font-display font-semibold text-base text-[#0B1D39] mb-4">Period Trend Overview</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoped}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="dateKey" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="sleepHours" name="Sleep (hrs)" stroke="#4f46e5" strokeWidth={2} />
              <Line type="monotone" dataKey="energyScore" name="Energy (/10)" stroke="#0284c7" strokeWidth={2} />
              <Line type="monotone" dataKey="restingHrBpm" name="Resting HR" stroke="#e11d48" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h3 className="font-display font-semibold text-base text-[#0B1D39]">Experiment &amp; Challenge Outcomes</h3>
          {state.experiments.map((e) => (
            <div key={e.id} className="text-xs border-b border-slate-100 pb-2">
              <strong className="text-[#0B1D39]">{e.title}</strong> ({e.status}) — {e.resultSummary || e.hypothesis}
            </div>
          ))}
          {state.challenges.map((c) => (
            <div key={c.id} className="text-xs border-b border-slate-100 pb-2">
              <strong className="text-[#0B1D39]">{c.title}</strong> ({c.status}) — {c.outcomeValue}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h3 className="font-display font-semibold text-base text-[#0B1D39]">Evidence-Based Observations</h3>
          {insights.map((ins) => (
            <div key={ins.id} className="text-xs border-b border-slate-100 pb-2">
              <strong className="text-[#0B1D39]">{ins.title}:</strong> {ins.observation}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPrivacyView() {
  const { state, token, apiFetch, logout, navigate } = useLifeTwin();
  const [notice, setNotice] = useState<string | null>(null);
  const [fullName, setFullName] = useState(state.profile?.fullName || '');
  const [heightCm, setHeightCm] = useState(state.profile?.heightCm || 174);
  const [weightKg, setWeightKg] = useState(state.profile?.weightKg || 70);
  const [bodyBuild, setBodyBuild] = useState(state.avatar?.bodyBuild || 'balanced');
  const [accentColor, setAccentColor] = useState(state.avatar?.accentColor || 'cyan');

  const updatePrivacy = async (patch: Record<string, boolean>) => {
    await apiFetch('/api/privacy', { method: 'PUT', body: JSON.stringify(patch) });
    setNotice('Privacy preference updated.');
  };

  const saveProfileAndAvatar = async (e: React.FormEvent) => {
    e.preventDefault();
    await apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify({ fullName, heightCm, weightKg }) });
    await apiFetch('/api/avatar', { method: 'PUT', body: JSON.stringify({ bodyBuild, accentColor }) });
    setNotice('Profile and 3D Digital Twin avatar preferences saved.');
  };

  const handleExportJson = async () => {
    const res = await fetch('/api/export', { headers: { Authorization: `Bearer ${token}` } });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lifetwin-personal-health-export.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDeleteRecords = async () => {
    await apiFetch('/api/records', { method: 'DELETE' });
    setNotice('All measurement records and chat history cleared from your account.');
  };

  const handleDeleteAccount = async () => {
    try {
      await apiFetch('/api/account', { method: 'DELETE' });
      logout();
    } catch {
      // handled by error banner
    }
  };

  return (
    <div className="max-w-[1160px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider uppercase text-sky-700">
          Feature 8 · Local-First Intelligence &amp; Account Privacy
        </p>
        <h1 className="font-display text-2xl font-bold text-[#0B1D39] mt-1">Settings &amp; Privacy Control</h1>
        <p className="text-sm text-slate-600 mt-1">
          Control where data is processed, manage consent for external AI synthesis, customize your Digital Twin, or export/delete your records.
        </p>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="font-semibold cursor-pointer">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Privacy & Local-First Controls */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg text-[#0B1D39] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-600" /> Local-First &amp; Consent Controls
          </h2>

          <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-[#F8FAFD] border border-slate-200/80 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-[#0B1D39]">Local-First Intelligence Mode</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Runs correlations, baselines, and assistant summaries deterministically on your local analytics engine without calling external Gemini cloud APIs.
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.privacy?.localFirstMode ?? false}
              onChange={(e) => updatePrivacy({ localFirstMode: e.target.checked })}
              className="mt-1 h-4 w-4 accent-sky-600"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-[#F8FAFD] border border-slate-200/80 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-[#0B1D39]">External AI Cloud Synthesis Consent</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Permit sending summarized wellness context to server-side Gemini AI when Local-First Mode is off.
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.privacy?.aiCloudConsent ?? true}
              onChange={(e) => updatePrivacy({ aiCloudConsent: e.target.checked })}
              className="mt-1 h-4 w-4 accent-sky-600"
            />
          </label>

          <label className="flex items-start justify-between gap-4 p-3 rounded-xl bg-[#F8FAFD] border border-slate-200/80 cursor-pointer">
            <div>
              <p className="text-sm font-semibold text-[#0B1D39]">ESP32 &amp; Wearable Sync Storage</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Allow storing incoming smartwatch exports and ESP32 MAX30102 packets in your private account database.
              </p>
            </div>
            <input
              type="checkbox"
              checked={state.privacy?.esp32CloudConsent ?? true}
              onChange={(e) => updatePrivacy({ esp32CloudConsent: e.target.checked })}
              className="mt-1 h-4 w-4 accent-sky-600"
            />
          </label>

          <div className="p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-[#0B1D39]">Data Location Transparency</p>
            <p>• Browser memory: Bearer session token &amp; real-time client statistics.</p>
            <p>• Private Server DB (SQLite / Supabase when configured): User-scoped measurements, memories, experiments.</p>
            <p>• External AI (Gemini): Only invoked on-demand if Local-First is OFF and AI Consent is ON.</p>
          </div>
        </section>

        {/* Profile, Avatar & Data Actions */}
        <section className="space-y-6">
          <form onSubmit={saveProfileAndAvatar} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-display font-semibold text-lg text-[#0B1D39]">Profile &amp; 3D Avatar Preferences</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono-tabular"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Avatar Build</label>
                <select
                  value={bodyBuild}
                  onChange={(e) => setBodyBuild(e.target.value as typeof bodyBuild)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="lean">Lean</option>
                  <option value="balanced">Balanced</option>
                  <option value="athletic">Athletic</option>
                  <option value="broad">Broad</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">3D Highlight Color</label>
                <select
                  value={accentColor}
                  onChange={(e) => setAccentColor(e.target.value as typeof accentColor)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                >
                  <option value="cyan">Electric Cyan</option>
                  <option value="cobalt">Cobalt</option>
                  <option value="ice">Ice Silver</option>
                  <option value="teal">Teal</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => navigate('connect')}
                className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
              >
                Manage Connected Devices →
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold hover:bg-[#132E59] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
            <h2 className="font-display font-semibold text-base text-[#0B1D39]">Data Ownership Actions</h2>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportJson}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-[#0B1D39] hover:bg-slate-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Export All JSON Data
              </button>
              <button
                onClick={handleDeleteRecords}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-amber-200 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Health Records
              </button>
              <button
                onClick={handleDeleteAccount}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
              >
                Delete Account
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
