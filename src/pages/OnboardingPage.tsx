import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Edit3, ShieldAlert } from 'lucide-react';
import { useLifeTwin } from '../context/LifeTwinContext';
import { BrandMark } from '../components/common/BrandMark';
import { DigitalTwinCanvas } from '../components/twin/DigitalTwinCanvas';
import { AvatarPreferences, UserProfile } from '../types/lifetwin';

const GOAL_OPTIONS = [
  'Understand personal health patterns',
  'Improve sleep consistency',
  'Improve daily activity',
  'Understand heart-rate trends',
  'Track lifestyle habits',
  'Improve energy and productivity',
  'Build healthier routines',
  'Explore personal wellness patterns',
];

const EXERCISE_OPTIONS = [
  'Brisk Walking',
  'Running',
  'Cycling',
  'Strength Training',
  'Yoga / Mobility',
  'Swimming',
  'Sports',
];

const SKIN_TONES = [
  { label: 'Porcelain', value: '#f2d3c2' },
  { label: 'Warm Sand', value: '#d8b4a0' },
  { label: 'Olive', value: '#c49a76' },
  { label: 'Amber', value: '#9c6f4b' },
  { label: 'Deep Espresso', value: '#5e3c27' },
];

export function OnboardingPage() {
  const { navigate, signUpWithOnboarding, signInDemo, loading, error, clearError } = useLifeTwin();
  const [step, setStep] = useState(1);

  const [profile, setProfile] = useState<Partial<UserProfile>>({
    fullName: '',
    age: 26,
    dob: '',
    gender: '',
    heightCm: 174,
    weightKg: 70,
    unitSystem: 'metric',
    country: 'Singapore',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    sleepTargetHours: 7.5,
    usualBedtime: '23:00',
    usualWakeTime: '06:30',
    activityLevel: 'moderate',
    exerciseFrequency: '3-4x/week',
    exercisePreferences: ['Brisk Walking', 'Strength Training'],
    dailyRoutine: 'Work/study 09:00–18:00, evening walk or workout, wind down around 22:15.',
    dietaryPreferences: '',
    moodTrackingEnabled: true,
    energyTrackingEnabled: true,
    goals: ['Understand personal health patterns', 'Improve sleep consistency'],
    healthContext: '',
    medications: '',
    wellnessNotes: '',
    measurementLimitations: '',
  });

  const [avatar, setAvatar] = useState<Partial<AvatarPreferences>>({
    bodyBuild: 'balanced',
    skinTone: '#d8b4a0',
    hairStyle: 'short',
    accentColor: 'cyan',
    postureStyle: 'neutral',
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadSampleHistory, setLoadSampleHistory] = useState(true);

  const toggleArrayItem = (arr: string[] = [], item: string) =>
    arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    await signUpWithOnboarding({
      email,
      password,
      profile,
      avatar,
      loadSampleHistory,
    });
  };

  const stepTitles = [
    'Basic Info',
    'Lifestyle',
    'Personal Goals',
    'Wellness Context',
    'Avatar Twin',
    'Review & Create',
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFD] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-[1160px] mx-auto flex items-center justify-between gap-4">
          <button onClick={() => navigate('intro')} className="cursor-pointer">
            <BrandMark />
          </button>
          <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
            <span className="font-mono-tabular">Step {step} of 6</span>
            <button
              onClick={() => signInDemo()}
              className="text-sky-700 hover:underline cursor-pointer whitespace-nowrap"
            >
              Use Demo Profile
            </button>
          </div>
        </div>
      </header>

      {/* Progress Stepper */}
      <div className="bg-white border-b border-slate-200/70 px-6 py-3">
        <div className="max-w-[1160px] mx-auto grid grid-cols-6 gap-2">
          {stepTitles.map((label, idx) => {
            const num = idx + 1;
            const active = num === step;
            const done = num < step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(num)}
                className={`text-left py-1.5 px-2 rounded-lg transition-colors cursor-pointer ${
                  active
                    ? 'bg-sky-50 text-sky-900 font-semibold'
                    : done
                    ? 'text-slate-700 hover:bg-slate-50'
                    : 'text-slate-400'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[11px] font-mono-tabular">
                  <span
                    className={`w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] ${
                      done
                        ? 'bg-sky-600 text-white'
                        : active
                        ? 'bg-[#0B1D39] text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {done ? <Check className="w-2.5 h-2.5" /> : num}
                  </span>
                  <span className="hidden sm:inline truncate">{label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 max-w-[1160px] w-full mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          {/* STEP 1 */}
          {step === 1 && (
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Basic Personal Information</h1>
              <p className="text-sm text-slate-600 mt-1">
                Used to calibrate units, timezone alignment, and representative Digital Twin proportions. Optional fields can be skipped.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={profile.fullName || ''}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    placeholder="e.g., Jordan Lee"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Age</label>
                    <input
                      type="number"
                      min={13}
                      max={110}
                      value={profile.age ?? ''}
                      onChange={(e) =>
                        setProfile({ ...profile, age: e.target.value ? Number(e.target.value) : null })
                      }
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Gender (Optional)</label>
                    <select
                      value={profile.gender || ''}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Non-binary">Non-binary</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Preferred Units</label>
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg">
                    {(['metric', 'imperial'] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => setProfile({ ...profile, unitSystem: u })}
                        className={`flex-1 py-2 text-xs font-medium rounded-md capitalize cursor-pointer ${
                          profile.unitSystem === u
                            ? 'bg-white text-[#0B1D39] shadow-sm'
                            : 'text-slate-600'
                        }`}
                      >
                        {u === 'metric' ? 'Metric (cm / kg)' : 'Imperial (ft / lbs)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Height ({profile.unitSystem === 'imperial' ? 'in · stored cm' : 'cm'})
                    </label>
                    <input
                      type="number"
                      min={120}
                      max={220}
                      value={profile.heightCm || 174}
                      onChange={(e) => setProfile({ ...profile, heightCm: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Weight (kg)</label>
                    <input
                      type="number"
                      min={35}
                      max={200}
                      value={profile.weightKg || 70}
                      onChange={(e) => setProfile({ ...profile, weightKg: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Country / Region (Optional)</label>
                  <input
                    type="text"
                    value={profile.country || ''}
                    onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Time Zone</label>
                  <input
                    type="text"
                    value={profile.timezone || ''}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Lifestyle &amp; Daily Rhythm</h1>
              <p className="text-sm text-slate-600 mt-1">
                Helps LifeTwin establish initial sleep windows, activity context, and habit tracking preferences.
              </p>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Typical Sleep Duration (hrs)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={4}
                    max={12}
                    value={profile.sleepTargetHours || 7.5}
                    onChange={(e) => setProfile({ ...profile, sleepTargetHours: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Usual Bedtime</label>
                  <input
                    type="time"
                    value={profile.usualBedtime || '23:00'}
                    onChange={(e) => setProfile({ ...profile, usualBedtime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Usual Wake-up Time</label>
                  <input
                    type="time"
                    value={profile.usualWakeTime || '06:30'}
                    onChange={(e) => setProfile({ ...profile, usualWakeTime: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm font-mono-tabular"
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Daily Activity Level</label>
                  <select
                    value={profile.activityLevel || 'moderate'}
                    onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value as UserProfile['activityLevel'] })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="sedentary">Mostly Sedentary (desk-based)</option>
                    <option value="light">Lightly Active</option>
                    <option value="moderate">Moderately Active</option>
                    <option value="active">Active</option>
                    <option value="very_active">Very Active / Athletic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Exercise Frequency</label>
                  <select
                    value={profile.exerciseFrequency || '3-4x/week'}
                    onChange={(e) => setProfile({ ...profile, exerciseFrequency: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm bg-white"
                  >
                    <option value="Rarely">Rarely</option>
                    <option value="1-2x/week">1–2 times / week</option>
                    <option value="3-4x/week">3–4 times / week</option>
                    <option value="5+x/week">5+ times / week</option>
                  </select>
                </div>
              </div>

              <div className="mt-5">
                <label className="block text-xs font-medium text-slate-700 mb-2">Exercise Preferences</label>
                <div className="flex flex-wrap gap-2">
                  {EXERCISE_OPTIONS.map((ex) => {
                    const selected = (profile.exercisePreferences || []).includes(ex);
                    return (
                      <button
                        key={ex}
                        type="button"
                        onClick={() =>
                          setProfile({
                            ...profile,
                            exercisePreferences: toggleArrayItem(profile.exercisePreferences, ex),
                          })
                        }
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-[#0B1D39] text-white border-[#0B1D39]'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300'
                        }`}
                      >
                        {ex}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Typical Daily Routine</label>
                  <textarea
                    rows={2}
                    value={profile.dailyRoutine || ''}
                    onChange={(e) => setProfile({ ...profile, dailyRoutine: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Dietary Preferences (Optional)</label>
                  <textarea
                    rows={2}
                    value={profile.dietaryPreferences || ''}
                    onChange={(e) => setProfile({ ...profile, dietaryPreferences: e.target.value })}
                    placeholder="e.g., Vegetarian, caffeine cutoff at 14:00"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-6">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.moodTrackingEnabled ?? true}
                    onChange={(e) => setProfile({ ...profile, moodTrackingEnabled: e.target.checked })}
                    className="rounded border-slate-300 text-sky-600"
                  />
                  Enable daily mood tracking
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={profile.energyTrackingEnabled ?? true}
                    onChange={(e) => setProfile({ ...profile, energyTrackingEnabled: e.target.checked })}
                    className="rounded border-slate-300 text-sky-600"
                  />
                  Enable daily energy tracking
                </label>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Personal Wellness Goals</h1>
              <p className="text-sm text-slate-600 mt-1">
                Select all goals you would like LifeTwin AI to prioritize in insights, experiments, and habit challenges.
              </p>
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((g) => {
                  const active = (profile.goals || []).includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setProfile({ ...profile, goals: toggleArrayItem(profile.goals, g) })}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        active
                          ? 'bg-sky-50/70 border-sky-500 text-[#0B1D39]'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-medium">{g}</span>
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          active ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300'
                        }`}
                      >
                        {active && <Check className="w-3 h-3" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div>
              <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Health &amp; Wellness Context</h1>
              <p className="text-sm text-slate-600 mt-1">
                Optional context helps LifeTwin interpret measurement limitations responsibly (for example, cold hands affecting optical SpO2 sensors or recovery periods).
              </p>

              <div className="mt-4 p-4 rounded-xl bg-sky-50/80 border border-sky-200 flex items-start gap-3 text-xs text-sky-900">
                <ShieldAlert className="w-4 h-4 text-sky-700 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Privacy &amp; Non-Diagnostic Guarantee</p>
                  <p className="mt-0.5 text-sky-800">
                    All sensitive wellness notes are optional, encrypted in transit, scoped strictly to your private account, and never used to diagnose medical conditions. You can skip this step or delete records anytime.
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Relevant Health Context (Optional)</label>
                  <textarea
                    rows={3}
                    value={profile.healthContext || ''}
                    onChange={(e) => setProfile({ ...profile, healthContext: e.target.value })}
                    placeholder="e.g., Shift work schedule, training for 10K"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Medications / Supplements (Optional)</label>
                  <textarea
                    rows={3}
                    value={profile.medications || ''}
                    onChange={(e) => setProfile({ ...profile, medications: e.target.value })}
                    placeholder="Optional personal reference only"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Personal Wellness Notes (Optional)</label>
                  <textarea
                    rows={2}
                    value={profile.wellnessNotes || ''}
                    onChange={(e) => setProfile({ ...profile, wellnessNotes: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Known Measurement Limitations (Optional)</label>
                  <textarea
                    rows={2}
                    value={profile.measurementLimitations || ''}
                    onChange={(e) => setProfile({ ...profile, measurementLimitations: e.target.value })}
                    placeholder="e.g., Wrist tattoo or cold fingers during MAX30102 readings"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5 */}
          {step === 5 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-6 space-y-5">
                <div>
                  <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Personalize Your 3D Digital Twin</h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Generated from your profile dimensions and chosen visual style. This is a representative interactive avatar, not a physical body scan.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Body Proportions</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(['lean', 'balanced', 'athletic', 'broad'] as const).map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setAvatar({ ...avatar, bodyBuild: b })}
                        className={`py-2 rounded-lg border text-xs font-medium capitalize cursor-pointer ${
                          avatar.bodyBuild === b
                            ? 'bg-[#0B1D39] text-white border-[#0B1D39]'
                            : 'bg-white text-slate-700 border-slate-200'
                        }`}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-2">Skin Tone Reference</label>
                  <div className="flex items-center gap-3">
                    {SKIN_TONES.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        title={t.label}
                        onClick={() => setAvatar({ ...avatar, skinTone: t.value })}
                        className={`w-8 h-8 rounded-full border-2 cursor-pointer ${
                          avatar.skinTone === t.value ? 'border-sky-500 scale-110' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: t.value }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Hair Silhouette</label>
                    <select
                      value={avatar.hairStyle || 'short'}
                      onChange={(e) => setAvatar({ ...avatar, hairStyle: e.target.value as AvatarPreferences['hairStyle'] })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                    >
                      <option value="minimal">Minimal / Shaved</option>
                      <option value="short">Short</option>
                      <option value="fade">Fade</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-2">Biometric Highlight Accent</label>
                    <select
                      value={avatar.accentColor || 'cyan'}
                      onChange={(e) => setAvatar({ ...avatar, accentColor: e.target.value as AvatarPreferences['accentColor'] })}
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white"
                    >
                      <option value="cyan">Electric Cyan</option>
                      <option value="cobalt">Deep Cobalt</option>
                      <option value="ice">Ice Silver-Blue</option>
                      <option value="teal">Biometric Teal</option>
                    </select>
                  </div>
                </div>

                <p className="text-xs text-slate-500 font-mono-tabular">
                  Calibrated Scale: {profile.heightCm || 174} cm · {profile.weightKg || 70} kg · Build: {avatar.bodyBuild}
                </p>
              </div>

              <div className="lg:col-span-6 min-h-[380px] rounded-2xl overflow-hidden bg-[#061021] border border-slate-800">
                <DigitalTwinCanvas
                  compact
                  heightCm={profile.heightCm || 174}
                  weightKg={profile.weightKg || 70}
                  avatar={avatar}
                  heartRateBpm={70}
                />
              </div>
            </div>
          )}

          {/* STEP 6 */}
          {step === 6 && (
            <form onSubmit={handleSubmit}>
              <h1 className="font-display text-2xl font-bold text-[#0B1D39]">Review &amp; Create Your LifeTwin</h1>
              <p className="text-sm text-slate-600 mt-1">
                Confirm your profile details and secure your private LifeTwin AI account.
              </p>

              {error && (
                <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
                  {error}
                </div>
              )}

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-xl bg-[#F8FAFD] border border-slate-200 space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#0B1D39]">Profile Summary</span>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="inline-flex items-center gap-1 text-xs text-sky-700 hover:underline cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Name:</strong> {profile.fullName || 'Not provided'}
                  </p>
                  <p className="text-slate-600 font-mono-tabular">
                    <strong className="font-sans text-slate-800">Body:</strong> {profile.heightCm} cm · {profile.weightKg} kg · Age {profile.age ?? '—'}
                  </p>
                  <p className="text-slate-600 font-mono-tabular">
                    <strong className="font-sans text-slate-800">Sleep Target:</strong> {profile.sleepTargetHours}h ({profile.usualBedtime} – {profile.usualWakeTime})
                  </p>
                  <p className="text-slate-600">
                    <strong className="text-slate-800">Goals ({profile.goals?.length || 0}):</strong>{' '}
                    {(profile.goals || []).slice(0, 3).join(', ') || 'None selected'}
                  </p>
                  <p className="text-slate-600 capitalize">
                    <strong className="text-slate-800">3D Avatar:</strong> {avatar.bodyBuild} build · {avatar.hairStyle} hair · {avatar.accentColor} glow
                  </p>
                </div>

                <div className="p-5 rounded-xl border border-slate-200 space-y-4">
                  <h2 className="font-display font-semibold text-base text-[#0B1D39]">Create Private Account</h2>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Password (min 6 characters)</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={loadSampleHistory}
                      onChange={(e) => setLoadSampleHistory(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-sky-600"
                    />
                    <span>
                      Include 30 days of clearly labeled <strong>DEMO DATA</strong> history so you can explore Time Travel, LifeGraph, and Baselines immediately (you can clear demo records anytime).
                    </span>
                  </label>
                </div>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#0284C7] text-white font-semibold text-sm hover:bg-sky-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Creating LifeTwin…' : 'CREATE MY LIFETWIN'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          )}

          {/* Step Navigation Footer (Steps 1-5) */}
          {step < 6 && (
            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => (step === 1 ? navigate('intro') : setStep(step - 1))}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                {step === 1 ? 'Welcome Screen' : 'Previous'}
              </button>

              <div className="flex items-center gap-3">
                {(step === 1 || step === 4) && (
                  <button
                    type="button"
                    onClick={() => setStep(step + 1)}
                    className="text-xs font-medium text-slate-500 hover:text-[#0B1D39] px-3 py-2 cursor-pointer"
                  >
                    Skip Optional Fields
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setStep(step + 1)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#0B1D39] text-white text-sm font-semibold hover:bg-[#132E59] transition-colors cursor-pointer"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
