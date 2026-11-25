import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Cpu, ShieldAlert, ShieldCheck, Activity, Wifi } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useLifeTwin } from '../context/LifeTwinContext';
import { getAcceptedMeasurements, getRejectedMeasurements } from '../lib/analyticsEngine';

export function HealthMonitoringPage() {
  const { state, apiFetch, navigate } = useLifeTwin();
  const [sending, setSending] = useState(false);
  const [statusNote, setStatusNote] = useState<string | null>(null);

  const accepted = useMemo(() => getAcceptedMeasurements(state.measurements), [state.measurements]);
  const rejected = useMemo(() => getRejectedMeasurements(state.measurements), [state.measurements]);

  const latestHr = [...accepted].reverse().find((m) => m.heartRateBpm !== null);
  const latestSpo2 = [...accepted].reverse().find((m) => m.spo2Pct !== null);
  const espDevice = state.devices.find((d) => d.deviceType === 'esp32');
  const watchDevice = state.devices.find((d) => d.deviceType === 'smartwatch');

  const chartSeries = useMemo(
    () =>
      accepted.slice(-20).map((m) => ({
        date: m.dateKey.slice(5),
        hr: m.heartRateBpm,
        spo2: m.spo2Pct,
        quality: m.signalQualityScore,
      })),
    [accepted]
  );

  const sendPacket = async (noisy: boolean) => {
    setSending(true);
    setStatusNote(null);
    try {
      await apiFetch('/api/iot/ingest', {
        method: 'POST',
        body: JSON.stringify({
          deviceIdCode: espDevice?.deviceIdCode || 'ESP32-LT-04A9',
          heartRateBpm: noisy ? 172 : Math.round(69 + Math.random() * 9),
          spo2Pct: noisy ? 82.4 : Number((97.4 + Math.random() * 1.4).toFixed(1)),
          irSignalLevel: noisy ? 9800 : 66400,
          fingerDetected: !noisy,
          motionVariance: noisy ? 0.62 : 0.05,
          isDemoPacket: true,
        }),
      });
      setStatusNote(
        noisy
          ? 'Noisy test packet received and quarantined by Sensor Trust Engine (excluded from AI analytics).'
          : 'Clean demo MAX30102 packet ingested and verified.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Health Monitoring &amp; Sensor Trust Engine</h1>
          <p className="text-sm text-slate-600 mt-1">
            Live and historical cardiovascular streams across Smartwatch and ESP32 + MAX30102 hardware, filtered by signal quality.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => sendPacket(false)}
            disabled={sending}
            className="px-3.5 py-2 rounded-lg bg-[#0284C7] text-white text-xs font-semibold hover:bg-sky-700 cursor-pointer disabled:opacity-50"
          >
            Simulate Clean ESP32 Packet (Demo)
          </button>
          <button
            onClick={() => sendPacket(true)}
            disabled={sending}
            className="px-3.5 py-2 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold hover:bg-amber-100 cursor-pointer"
          >
            Simulate Poor Finger Contact
          </button>
        </div>
      </div>

      {statusNote && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-xs text-sky-900">
          {statusNote}
        </div>
      )}

      {/* Hardware & Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500">Latest Verified Heart Rate</p>
          <p className="font-mono-tabular text-3xl font-bold text-[#0B1D39] mt-1">
            {latestHr?.heartRateBpm ?? '—'} <span className="text-xs font-normal text-slate-500">BPM</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            {latestHr?.isDemo ? 'DEMO DATA · ' : ''}
            {latestHr?.sourceDevice || 'No readings yet'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <p className="text-xs text-slate-500">Experimental SpO2 Estimate</p>
          <p className="font-mono-tabular text-3xl font-bold text-[#0B1D39] mt-1">
            {latestSpo2?.spo2Pct ?? '—'} <span className="text-xs font-normal text-slate-500">%</span>
          </p>
          <p className="text-[11px] text-amber-700 mt-2">
            Experimental optical estimate · Not clinically validated
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>ESP32 + MAX30102</span>
            <Cpu className="w-4 h-4 text-sky-600" />
          </div>
          <p className="font-display font-semibold text-base text-[#0B1D39] mt-1.5">
            {espDevice ? espDevice.deviceIdCode : 'Not Paired'}
          </p>
          <p className="text-[11px] font-mono-tabular text-slate-500 mt-1">
            {espDevice
              ? `Quality ${espDevice.signalQuality}% · ${espDevice.status}`
              : 'Pair hardware in Connected Devices'}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Smartwatch Bridge</span>
            <Activity className="w-4 h-4 text-sky-600" />
          </div>
          <p className="font-display font-semibold text-base text-[#0B1D39] mt-1.5">
            {watchDevice ? watchDevice.provider : 'Not Connected'}
          </p>
          <p className="text-[11px] font-mono-tabular text-slate-500 mt-1">
            {watchDevice?.lastSyncAt
              ? `Synced ${new Date(watchDevice.lastSyncAt).toLocaleDateString()}`
              : 'Configure in Connected Devices'}
          </p>
        </div>
      </div>

      {/* Time-Series Chart */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-display font-semibold text-lg text-[#0B1D39]">
              Verified Physiological Time-Series
            </h2>
            <p className="text-xs text-slate-500">
              Only samples passing Sensor Trust quality checks are plotted and passed to AI analytics.
            </p>
          </div>
          <button
            onClick={() => navigate('connect')}
            className="text-xs font-semibold text-sky-700 hover:underline cursor-pointer"
          >
            Manage Hardware Sources
          </button>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="hr" name="Heart Rate (BPM)" stroke="#e11d48" strokeWidth={2} />
              <Line type="monotone" dataKey="spo2" name="Experimental SpO2 (%)" stroke="#0284c7" strokeWidth={2} />
              <Line type="monotone" dataKey="quality" name="Signal Quality (%)" stroke="#0d9488" strokeDasharray="4 4" strokeWidth={1.6} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Sensor Trust Engine Section (Feature 11) */}
      <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Feature 11 · Sensor Trust Engine
            </div>
            <h2 className="font-display text-xl font-bold text-[#0B1D39] mt-1">
              Measurement Quality &amp; Artifact Isolation
            </h2>
          </div>
          <div className="text-xs font-mono-tabular text-slate-600">
            {accepted.length} Accepted · {rejected.length} Quarantined
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F8FAFD] border border-slate-200/80">
            <p className="font-semibold text-[#0B1D39] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Implemented Checks
            </p>
            <p className="text-slate-600 mt-1.5 leading-relaxed">
              IR perfusion finger-contact threshold, motion variance spike check, BPM physiological bounds (35–210), and SpO2 plausibility range.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F8FAFD] border border-slate-200/80">
            <p className="font-semibold text-[#0B1D39] flex items-center gap-1.5">
              <Wifi className="w-4 h-4 text-sky-600" /> Source Integrity
            </p>
            <p className="text-slate-600 mt-1.5 leading-relaxed">
              Multi-source timestamps and device IDs are preserved on every sample so smartwatch and ESP32 readings never overwrite each other silently.
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F8FAFD] border border-slate-200/80">
            <p className="font-semibold text-[#0B1D39] flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" /> Planned Capabilities
            </p>
            <p className="text-slate-600 mt-1.5 leading-relaxed">
              Raw 100Hz PPG waveform FFT spectral filtering on-device inside ESP32 firmware before Wi-Fi upload.
            </p>
          </div>
        </div>

        {/* Quarantined / Rejected Samples Table */}
        <div>
          <h3 className="font-display font-semibold text-sm text-[#0B1D39] mb-2">
            Flagged or Rejected Samples ({rejected.length})
          </h3>
          {rejected.length > 0 ? (
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Source</th>
                    <th className="py-2.5 px-3 text-right">Raw HR / SpO2</th>
                    <th className="py-2.5 px-3 text-right">Quality</th>
                    <th className="py-2.5 px-3">Quality Warnings</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rejected.map((r) => (
                    <tr key={r.id} className="hover:bg-rose-50/30">
                      <td className="py-2.5 px-3 font-mono-tabular">{r.dateKey}</td>
                      <td className="py-2.5 px-3">{r.sourceDevice}</td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular">
                        {r.heartRateBpm ?? '—'} BPM / {r.spo2Pct ?? '—'}%
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono-tabular text-rose-600 font-semibold">
                        {r.signalQualityScore}%
                      </td>
                      <td className="py-2.5 px-3 text-amber-800">
                        <span className="inline-flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          {r.qualityFlags.join(' · ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              No rejected samples right now. Click &ldquo;Simulate Poor Finger Contact&rdquo; above to see Sensor Trust rejection in action.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
