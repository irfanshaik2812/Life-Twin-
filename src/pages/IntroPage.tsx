import React from 'react';
import { ArrowRight, Compass, LogIn } from 'lucide-react';
import { useLifeTwin } from '../context/LifeTwinContext';
import { BrandMark } from '../components/common/BrandMark';

export function IntroPage() {
  const { navigate, signInDemo, loading } = useLifeTwin();

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-white via-[#F1F7FE] to-[#E3F0FC] flex flex-col justify-between">
      {/* Subtle architectural background image layer */}
      <div className="pointer-events-none absolute inset-0 opacity-45">
        <img
          src="/src/assets/images/lifetwin_intro_backdrop_1795620518820.jpg"
          alt=""
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-[#F4F9FF]/70 to-[#E8F3FF]/90" />
      </div>

      {/* Minimal top header */}
      <header className="relative z-10 w-full max-w-[1280px] mx-auto px-6 py-6 flex items-center justify-between">
        <BrandMark size="md" />
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate('auth')}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#0B1D39]/80 hover:text-sky-700 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            Sign In
          </button>
        </div>
      </header>

      {/* Center focal composition */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-8 text-center">
        {/* Animated Human Silhouette + Biometric Wave Emblem */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-sky-400/15 blur-2xl animate-pulse" />
          <svg
            viewBox="0 0 200 200"
            className="w-full h-full drop-shadow-[0_12px_32px_rgba(2,132,199,0.2)]"
            aria-label="LifeTwin AI animated human silhouette"
          >
            <defs>
              <linearGradient id="sil-grad" x1="40" y1="20" x2="160" y2="180" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#0284C7" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.9" />
              </linearGradient>
              <radialGradient id="core-glow" cx="50%" cy="42%" r="35%">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
              </radialGradient>
            </defs>
            {/* Outer calibration orbital rings */}
            <circle cx="100" cy="100" r="88" fill="none" stroke="#0284C7" strokeOpacity="0.14" strokeWidth="1" strokeDasharray="4 6" />
            <circle cx="100" cy="100" r="72" fill="url(#core-glow)" stroke="#06B6D4" strokeOpacity="0.24" strokeWidth="1.2" />

            {/* Stylized anatomical human silhouette */}
            <circle cx="100" cy="46" r="13.5" fill="none" stroke="url(#sil-grad)" strokeWidth="2.4" />
            <path
              d="M72 80 C72 67 84 62 100 62 C116 62 128 67 128 80 L132 115 C132 120 127 124 122 124 L118 124 L115 166 C115 170 111 173 107 173 L103 173 L100 128 L97 173 L93 173 C89 173 85 170 85 166 L82 124 L78 124 C73 124 68 120 68 115 Z"
              fill="rgba(14,165,233,0.09)"
              stroke="url(#sil-grad)"
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            {/* Chest ECG pulse trace */}
            <path
              d="M80 91 H91 L95 82 L100 100 L105 87 L109 91 H120"
              fill="none"
              stroke="#0284C7"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Biometric telemetry nodes */}
            <circle cx="100" cy="46" r="3" fill="#06B6D4" />
            <circle cx="100" cy="91" r="3.2" fill="#0284C7" />
            <circle cx="48" cy="76" r="2.2" fill="#38BDF8" />
            <circle cx="152" cy="118" r="2.2" fill="#06B6D4" />
            <circle cx="144" cy="64" r="1.8" fill="#0284C7" />
            <circle cx="56" cy="134" r="1.8" fill="#38BDF8" />
          </svg>
        </div>

        <p className="text-xs sm:text-sm font-medium tracking-widest uppercase text-sky-700 mb-3">
          Personal Health Intelligence Platform
        </p>

        <h1 className="font-display text-4xl sm:text-6xl font-extrabold tracking-tight text-[#0B1D39] max-w-3xl">
          LifeTwin AI
        </h1>

        <p className="mt-4 font-display text-xl sm:text-2xl font-semibold text-[#0E3A66] max-w-2xl">
          Your Body. Your Data. Your Intelligence.
        </p>

        <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
          Your personal health. Connected, understood, and transformed into intelligence.
        </p>

        {/* Primary & Secondary Actions */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => navigate('onboarding')}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-[#0B1D39] text-white font-semibold text-sm sm:text-base shadow-[0_10px_24px_rgba(11,29,57,0.18)] hover:bg-[#132E59] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            GET STARTED
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={() => navigate('landing')}
            className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-white/90 text-[#0B1D39] border border-sky-200 font-semibold text-sm sm:text-base hover:bg-white hover:border-sky-300 transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-sky-600" />
            EXPLORE LIFETWIN
          </button>
        </div>

        {/* Instant Demo Explorer link for judges & evaluation */}
        <div className="mt-6">
          <button
            onClick={() => signInDemo()}
            disabled={loading}
            className="text-sm font-medium text-sky-700 hover:text-sky-900 underline underline-offset-4 transition-colors cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Loading Demo Workspace…' : 'Open Interactive Demo Profile (Alex Rivera · 30 Days Demo Data)'}
          </button>
        </div>
      </main>

      {/* Quiet Footer */}
      <footer className="relative z-10 w-full max-w-[1280px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <span>Go Beyond Tracking. Understand Yourself.</span>
        <span>Built for wHACKiest 2026 · Know Thyself</span>
      </footer>
    </div>
  );
}
