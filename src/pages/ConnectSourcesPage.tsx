import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Layers,
  AlertTriangle,
  Upload,
  Wifi,
  Unlink,
} from 'lucide-react';
import { useLifeTwin } from '../context/LifeTwinContext';
import { BrandMark } from '../components/common/BrandMark';

const WATCH_PROVIDERS = [
  { id: 'Apple Health', label: 'Apple Health (iOS Companion Export)', note: 'Supported via Health XML/JSON import or iOS Companion Bridge' },
  { id: 'Android Health Connect', label: 'Android Health Connect', note: 'Supported via Android Health Connect JSON sync' },
  { id: 'Fitbit', label: 'Fitbit Web API', note: 'OAuth 2.0 integration (requires FITBIT_CLIENT_ID in Secrets)' },
  { id: 'Garmin', label: 'Garmin Health API', note: 'Partner OAuth integration (requires GARMIN_CONSUMER_KEY)' },
  { id: 'Other Wearable CSV', label: 'Other Supported Wearable (CSV/JSON)', note: 'Import steps, sleep, and heart-rate history directly' },
];

export function ConnectSourcesPage({ embedded = false }: { embedded?: boolean }) {
  const { state, navigate, apiFetch } = useLifeTwin();
  const [selectedWatch, setSelectedWatch] = useState('Apple Health');
  const [espDeviceId, setEspDeviceId] = useState('ESP32-LT-04A9');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [showFirmware, setShowFirmware] = useState(false);

  const watchDevice = state.devices.find((d) => d.deviceType === 'smartwatch');
  const espDevice = state.devices.find((d) => d.deviceType === 'esp32');
  const latestEspReading = [...state.measurements]
    .reverse()
    .find((m) => m.sourceType === 'esp32' || m.sourceDevice.toLowerCase().includes('esp32'));

  const handleConnectWatch = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch('/api/devices/connect', {
        method: 'POST',
        body: JSON.stringify({
          deviceType: 'smartwatch',
          provider: selectedWatch,
          deviceName: `${selectedWatch} Bridge`,
          deviceIdCode: `WATCH-${selectedWatch.slice(0, 3).toUpperCase()}-2026`,
          permissions: ['heart_rate', 'resting_hr', 'sleep_duration', 'steps', 'exercise_sessions'],
          preferredForSleep: true,
          preferredForActivity: true,
        }),
      });
      setFeedback(`${selectedWatch} configuration saved.`);
    } finally {
      setBusy(false);
    }
  };

  const handleImportSampleWatch = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const res = await apiFetch<{ imported: number; skippedDuplicates: number }>('/api/wearables/import', {
        method: 'POST',
        body: JSON.stringify({
          provider: selectedWatch,
          records: [
            {
              dateKey: today,
              heartRateBpm: 73,
              restingHrBpm: 60,
              sleepHours: 7.4,
              steps: 8420,
              activeMinutes: 46,
              exerciseMinutes: 35,
              exerciseType: 'Brisk Walk',
            },
          ],
        }),
      });
      setFeedback(`Imported ${res.imported} wearable record(s) (${res.skippedDuplicates} duplicates skipped).`);
    } finally {
      setBusy(false);
    }
  };

  const handleConnectEsp32 = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch('/api/devices/connect', {
        method: 'POST',
        body: JSON.stringify({
          deviceType: 'esp32',
          provider: 'LifeTwin Custom IoT',
          deviceName: 'ESP32 DevKit V1 + MAX30102',
          deviceIdCode: espDeviceId.trim() || 'ESP32-LT-04A9',
          permissions: ['heart_rate_bpm', 'experimental_spo2_pct', 'ir_signal_quality'],
          preferredForHr: true,
        }),
      });
      setFeedback(`ESP32 sensor ${espDeviceId} paired and listening on /api/iot/ingest.`);
    } finally {
      setBusy(false);
    }
  };

  const handleSendEspPacket = async (noisy: boolean) => {
    setBusy(true);
    setFeedback(null);
    try {
      await apiFetch('/api/iot/ingest', {
        method: 'POST',
        body: JSON.stringify({
          deviceIdCode: espDeviceId,
          heartRateBpm: noisy ? 168 : 74,
          spo2Pct: noisy ? 84.5 : 98.2,
          irSignalLevel: noisy ? 12000 : 68500,
          fingerDetected: !noisy,
          motionVariance: noisy ? 0.58 : 0.06,
          isDemoPacket: true,
        }),
      });
      setFeedback(
        noisy
          ? 'Demo noisy packet sent — Sensor Trust Engine detected poor finger contact & rejected it from AI analytics.'
          : 'Demo clean MAX30102 packet ingested & verified (74 BPM · 98.2% experimental SpO2).'
      );
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    setBusy(true);
    try {
      await apiFetch(`/api/devices/${id}`, { method: 'DELETE' });
      setFeedback('Device disconnected.');
    } finally {
      setBusy(false);
    }
  };

  const handleSetPriority = async (deviceId: string, field: 'preferredForHr' | 'preferredForSleep' | 'preferredForActivity') => {
    setBusy(true);
    try {
      await apiFetch(`/api/devices/${deviceId}/preferences`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: true }),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={embedded ? 'space-y-8' : 'min-h-screen bg-[#F8FAFD] pb-16'}>
      {!embedded && (
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-[1220px] mx-auto flex items-center justify-between">
            <BrandMark />
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('overview')}
                className="text-sm font-medium text-slate-600 hover:text-[#0B1D39] cursor-pointer"
              >
                Skip for Now (Demo / Manual Mode)
              </button>
              <button
                onClick={() => navigate('overview')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0B1D39] text-white text-sm font-semibold hover:bg-[#132E59] cursor-pointer"
              >
                Go to Dashboard
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={embedded ? 'space-y-8' : 'max-w-[1220px] mx-auto px-6 pt-10 space-y-8'}>
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-sky-700 mb-2">
            Data Source Architecture
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D39]">
            Connect Your Body to LifeTwin AI
          </h1>
          <p className="text-slate-600 mt-2 max-w-2xl">
            Choose how LifeTwin AI receives your physiological and lifestyle data. Connect a smartwatch platform, pair custom ESP32 + MAX30102 IoT hardware, combine both, or continue manually.
          </p>
        </div>

        {feedback && (
          <div className="p-4 rounded-xl bg-sky-50 border border-sky-200 text-sm text-sky-900 flex items-center justify-between">
            <span>{feedback}</span>
            <button onClick={() => setFeedback(null)} className="text-xs font-semibold text-sky-700 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* OPTION A: SMARTWATCH */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="h-52 bg-slate-100 overflow-hidden relative">
              <img
                src="/src/assets/images/smartwatch_wearable_1795620517131.jpg"
                alt="Smartwatch wearable interface"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/95 text-[11px] font-semibold text-[#0B1D39]">
                Option A · Wearable Integration
              </span>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[#0B1D39]">Connect Your Smartwatch</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Bring supported wearable health data into LifeTwin AI via official OAuth APIs, mobile companion sync, or health export import.
                </p>

                <div className="mt-4">
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Select Wearable Platform</label>
                  <select
                    value={selectedWatch}
                    onChange={(e) => setSelectedWatch(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    {WATCH_PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1.5">
                    {WATCH_PROVIDERS.find((p) => p.id === selectedWatch)?.note}
                  </p>
                </div>

                <div className="mt-4 p-3.5 rounded-xl bg-[#F8FAFD] border border-slate-200/80 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-[#0B1D39]">Supported Categories</p>
                  <p>Heart Rate · Resting HR · Sleep Duration · Daily Steps · Exercise Sessions</p>
                </div>

                {watchDevice && (
                  <div className="mt-4 p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-emerald-900">
                      <span className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        {watchDevice.deviceName}
                      </span>
                      <span className="font-mono-tabular uppercase">
                        {watchDevice.status === 'awaiting_credentials' ? 'Awaiting OAuth Keys' : watchDevice.status}
                      </span>
                    </div>
                    <p className="text-emerald-800 font-mono-tabular">
                      Last Sync: {watchDevice.lastSyncAt ? new Date(watchDevice.lastSyncAt).toLocaleString() : 'Not synced'}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleConnectWatch}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0B1D39] text-white text-xs font-semibold hover:bg-[#132E59] cursor-pointer disabled:opacity-50"
                >
                  <Activity className="w-3.5 h-3.5" />
                  Connect {selectedWatch}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleImportSampleWatch}
                  className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Import Sample Sync
                </button>
                {watchDevice && (
                  <button
                    type="button"
                    onClick={() => handleDisconnect(watchDevice.id)}
                    className="inline-flex items-center gap-1 text-xs text-rose-600 hover:underline ml-auto cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" /> Disconnect
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* OPTION B: CUSTOM ESP32 + MAX30102 */}
          <section className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
            <div className="h-52 bg-slate-100 overflow-hidden relative">
              <img
                src="/src/assets/images/esp32_max30102_kit_1795620518352.jpg"
                alt="ESP32 DevKit V1 wired to MAX30102 pulse oximeter sensor"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-white/95 text-[11px] font-semibold text-[#0B1D39]">
                Option B · Custom IoT Hardware
              </span>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
              <div>
                <h2 className="font-display text-xl font-bold text-[#0B1D39]">Connect LifeTwin Sensor</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Use our custom ESP32 DevKit V1 + MAX30102 optical hardware via Wi-Fi to stream heart rate (BPM) and experimental SpO2 estimates.
                </p>

                <div className="mt-3 p-3 rounded-xl bg-[#F8FAFD] border border-slate-200/80 text-xs font-mono-tabular text-slate-700">
                  MAX30102 (I2C) → ESP32 DevKit V1 → Wi-Fi HTTPS → /api/iot/ingest → Sensor Trust Engine → LifeTwin AI
                </div>

                <div className="mt-3 p-3 rounded-xl bg-amber-50/80 border border-amber-200 flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    MAX30102 SpO2 readings are <strong>experimental optical estimates</strong> and are never clinically validated.
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">ESP32 Device ID</label>
                    <input
                      type="text"
                      value={espDeviceId}
                      onChange={(e) => setEspDeviceId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs font-mono-tabular"
                    />
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                    <p className="text-slate-500">Latest Sensor Telemetry</p>
                    <p className="font-mono-tabular font-semibold text-[#0B1D39] mt-0.5">
                      {latestEspReading
                        ? `${latestEspReading.heartRateBpm ?? '—'} BPM · ${latestEspReading.spo2Pct ?? '—'}% SpO2`
                        : 'No sensor packets yet'}
                    </p>
                  </div>
                </div>

                {espDevice && (
                  <div className="mt-3 flex items-center justify-between text-xs text-emerald-800 bg-emerald-50/70 border border-emerald-200 px-3 py-2 rounded-lg">
                    <span className="inline-flex items-center gap-1.5 font-semibold">
                      <Wifi className="w-3.5 h-3.5 text-emerald-600" />
                      {espDevice.deviceIdCode} · Signal {espDevice.signalQuality}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDisconnect(espDevice.id)}
                      className="text-rose-600 hover:underline cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                )}

                {showFirmware && (
                  <pre className="mt-3 p-3 rounded-lg bg-[#0B1D39] text-sky-100 text-[11px] font-mono-tabular overflow-x-auto">
{`// ESP32 Arduino HTTPClient POST -> /api/iot/ingest
HTTPClient http;
http.begin("https://YOUR_LIFETWIN_HOST/api/iot/ingest");
http.addHeader("Authorization", "Bearer YOUR_TOKEN");
http.addHeader("Content-Type", "application/json");
http.POST("{\\"deviceIdCode\\":\\"${espDeviceId}\\",\\"heartRateBpm\\":74,\\"spo2Pct\\":98.1,\\"irSignalLevel\\":66200}");`}
                  </pre>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleConnectEsp32}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0284C7] text-white text-xs font-semibold hover:bg-sky-700 cursor-pointer disabled:opacity-50"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Connect ESP32
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSendEspPacket(false)}
                  className="px-3 py-2.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Send Demo Clean Packet
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleSendEspPacket(true)}
                  className="px-3 py-2.5 rounded-lg border border-amber-200 text-xs font-medium text-amber-800 hover:bg-amber-50 cursor-pointer"
                >
                  Test Noisy Artifact
                </button>
                <button
                  type="button"
                  onClick={() => setShowFirmware(!showFirmware)}
                  className="text-xs text-sky-700 hover:underline ml-auto cursor-pointer"
                >
                  {showFirmware ? 'Hide ESP32 Code' : 'ESP32 Firmware Snippet'}
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* OPTION C: CONNECT MULTIPLE / SOURCE DEDUPLICATION */}
        <section className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-sky-700 uppercase tracking-wider">
                <Layers className="w-4 h-4" /> Option C · Connect Multiple Data Sources
              </div>
              <h2 className="font-display text-xl font-bold text-[#0B1D39] mt-1">
                Source Attribution &amp; Conflict Prevention
              </h2>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Combine wearable data and LifeTwin&apos;s custom IoT sensor simultaneously. Every reading keeps its source tag and preferred primary source avoids duplicate counts.
              </p>
            </div>
            <button
              onClick={() => navigate('overview')}
              className="px-5 py-2.5 rounded-lg bg-[#0B1D39] text-white text-sm font-semibold hover:bg-[#132E59] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Continue to Dashboard
            </button>
          </div>

          {state.devices.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              {state.devices.map((dev) => (
                <div key={dev.id} className="p-4 rounded-xl border border-slate-200 bg-[#F8FAFD] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#0B1D39]">{dev.deviceName}</span>
                    <span className="text-xs font-mono-tabular text-slate-500">{dev.deviceIdCode}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSetPriority(dev.id, 'preferredForHr')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                        dev.preferredForHr
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {dev.preferredForHr ? 'Primary: Heart Rate' : 'Set Primary HR'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPriority(dev.id, 'preferredForSleep')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                        dev.preferredForSleep
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {dev.preferredForSleep ? 'Primary: Sleep' : 'Set Primary Sleep'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSetPriority(dev.id, 'preferredForActivity')}
                      className={`px-2.5 py-1 rounded text-[11px] font-medium border cursor-pointer ${
                        dev.preferredForActivity
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-600 border-slate-200'
                      }`}
                    >
                      {dev.preferredForActivity ? 'Primary: Activity' : 'Set Primary Activity'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-xs text-slate-500">
              No devices connected yet. You can connect a smartwatch, ESP32 sensor, or click Skip for Now to use Demo / Manual Mode.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
