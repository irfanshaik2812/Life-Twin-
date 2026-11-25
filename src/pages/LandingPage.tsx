import React from 'react';
import { ArrowRight, Cpu, Activity, ShieldCheck, Sparkles, Compass, Clock, FlaskConical, Network, Eye, HeartHandshake, SlidersHorizontal, SunMedium, CheckCircle2, Trophy, Database } from 'lucide-react';
import { useLifeTwin } from '../context/LifeTwinContext';
import { BrandMark } from '../components/common/BrandMark';
import { DigitalTwinCanvas } from '../components/twin/DigitalTwinCanvas';

const FEATURES_12 = [
  {
    num: '01',
    title: 'Personal Health Memory',
    desc: 'Stores user-approved historical observations across weeks and months so recurring sleep, mood, and energy patterns are never forgotten.',
    icon: Database,
  },
  {
    num: '02',
    title: 'FuturePath What-If Engine',
    desc: 'Simulates how adjustments to sleep schedule, exercise cadence, or screen habits could shift future energy trajectories — transparently labeled as projections.',
    icon: Compass,
  },
  {
    num: '03',
    title: 'N-of-1 Experiment Lab',
    desc: 'Design structured 7-to-14 day personal lifestyle experiments with baseline capture, daily check-ins, and before-and-after results.',
    icon: FlaskConical,
  },
  {
    num: '04',
    title: 'LifeGraph Relationship Explorer',
    desc: 'Interactive correlation network mapping how sleep, exercise, heart rate, screen exposure, mood, and energy move together without confusing correlation with causation.',
    icon: Network,
  },
  {
    num: '05',
    title: 'Evidence-Based AI',
    desc: 'Every insight cites exact sample sizes, date ranges, alternative explanations, and includes a View Supporting Data drawer.',
    icon: Eye,
  },
  {
    num: '06',
    title: 'Agentic Wellness Coach',
    desc: 'Proposes personalized goals and check-in cadences that strictly require your explicit approval before scheduling or modifying anything.',
    icon: HeartHandshake,
  },
  {
    num: '07',
    title: 'Adaptive Baseline Engine',
    desc: 'Learns your own historical normal ranges for resting heart rate, sleep duration, activity, and energy rather than relying on generic population averages.',
    icon: SlidersHorizontal,
  },
  {
    num: '08',
    title: 'Local-First Intelligence Mode',
    desc: 'Granular consent controls, on-device statistical analytics option, JSON export, and instant data deletion.',
    icon: ShieldCheck,
  },
  {
    num: '09',
    title: 'Time-Travel Digital Twin',
    desc: 'Scrub through recorded health history on an interactive 3D human model and compare any two dates side by side.',
    icon: Clock,
  },
  {
    num: '10',
    title: 'Personal Rhythm Discovery',
    desc: 'Identifies your personal peak energy and focus windows alongside sleep midpoint consistency across weekdays and weekends.',
    icon: SunMedium,
  },
  {
    num: '11',
    title: 'Sensor Trust Engine',
    desc: 'Scores ESP32 + MAX30102 optical signal quality, flags finger-contact or motion artifacts, and excludes noisy samples from AI analytics.',
    icon: CheckCircle2,
  },
  {
    num: '12',
    title: 'Personalized Habit Challenges',
    desc: 'Achievable habit challenges tied to your own goals, tracking real adherence and self-reported outcomes.',
    icon: Trophy,
  },
];

export function LandingPage() {
  const { navigate, signInDemo } = useLifeTwin();

  return (
    <div className="min-h-screen bg-[#F8FAFD] text-[#0B1D39]">
      {/* Strict 3-Zone Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-[1280px] mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <button onClick={() => navigate('intro')} className="cursor-pointer whitespace-nowrap shrink-0">
            <BrandMark size="md" />
          </button>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#home" className="hover:text-[#0B1D39] transition-colors whitespace-nowrap shrink-0">Home</a>
            <a href="#features" className="hover:text-[#0B1D39] transition-colors whitespace-nowrap shrink-0">Features</a>
            <a href="#how-it-works" className="hover:text-[#0B1D39] transition-colors whitespace-nowrap shrink-0">How It Works</a>
            <a href="#technology" className="hover:text-[#0B1D39] transition-colors whitespace-nowrap shrink-0">Technology</a>
            <a href="#about" className="hover:text-[#0B1D39] transition-colors whitespace-nowrap shrink-0">About</a>
          </nav>

          <div className="flex items-center gap-4 shrink-0">
            <button
              onClick={() => navigate('auth')}
              className="hidden sm:inline-block text-sm font-medium text-slate-700 hover:text-[#0B1D39] whitespace-nowrap shrink-0 cursor-pointer"
            >
              Login
            </button>
            <button
              onClick={() => navigate('onboarding')}
              className="px-4 py-2 rounded-lg bg-[#0B1D39] text-white text-sm font-semibold hover:bg-[#132E59] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="max-w-[1280px] mx-auto px-6 py-14 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 flex flex-col justify-center">
            <p className="text-xs font-semibold tracking-widest uppercase text-sky-700 mb-3">
              Personal Health Intelligence · Wearable &amp; IoT Unified
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-extrabold tracking-tight text-[#0B1D39] leading-[1.08]">
              Understand Your Body. Unlock Your Potential.
            </h1>
            <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              LifeTwin AI connects your wearable devices, custom ESP32 + MAX30102 IoT sensors, and everyday lifestyle records to reveal the real patterns behind your personal wellness.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => navigate('onboarding')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0284C7] text-white font-semibold text-sm hover:bg-sky-700 transition-colors cursor-pointer"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white border border-slate-200 text-[#0B1D39] font-semibold text-sm hover:border-sky-300 transition-colors"
              >
                Explore Features
              </a>
              <button
                onClick={() => signInDemo()}
                className="text-sm font-medium text-sky-700 hover:underline cursor-pointer"
              >
                Launch Demo Workspace
              </button>
            </div>

            <div className="mt-10 pt-6 border-t border-slate-200/80 grid grid-cols-3 gap-6 max-w-lg">
              <div>
                <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39]">3</p>
                <p className="text-xs text-slate-500 mt-0.5">Unified Data Inputs</p>
              </div>
              <div>
                <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39]">12</p>
                <p className="text-xs text-slate-500 mt-0.5">Intelligence Modules</p>
              </div>
              <div>
                <p className="font-mono-tabular text-2xl font-bold text-[#0B1D39]">3D</p>
                <p className="text-xs text-slate-500 mt-0.5">Time-Travel Twin</p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 min-h-[430px] lg:min-h-[520px] rounded-2xl overflow-hidden border border-slate-200 bg-[#061021] relative">
            <DigitalTwinCanvas compact heartRateBpm={72} spo2Pct={98.1} sleepHours={7.6} energyScore={8.1} />
            <div className="pointer-events-none absolute top-4 left-4 right-4 flex items-center justify-between text-xs font-mono-tabular text-sky-200/90">
              <span>Interactive 3D Digital Twin Preview</span>
              <span>72 BPM · Demo Stream</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem & Solution */}
      <section className="bg-white border-y border-slate-200/80 py-16">
        <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-2">The Challenge</p>
            <h2 className="font-display text-3xl font-bold text-[#0B1D39]">
              We&apos;re Collecting Data. But Are We Understanding It?
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              Traditional fitness trackers tell you what your body recorded yesterday — 7,420 steps, 6.4 hours of sleep, 64 BPM resting heart rate — yet leave you guessing why your afternoon energy dropped or which habits truly move the needle for your physiology.
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-widest uppercase text-sky-700 mb-2">The LifeTwin Approach</p>
            <h2 className="font-display text-3xl font-bold text-[#0B1D39]">
              From Passive Telemetry to Personal Self-Investigation
            </h2>
            <p className="mt-4 text-slate-600 leading-relaxed">
              LifeTwin AI fuses wearable biometrics, custom ESP32 + MAX30102 pulse-oximetry streams, and lifestyle context into an evidence-first intelligence layer. Every observation shows its sample size, uncertainty, and supporting charts — never medical guesswork.
            </p>
          </div>
        </div>
      </section>

      {/* All 12 Advanced Features */}
      <section id="features" className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-sky-700 mb-2">Platform Capabilities</p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#0B1D39]">
            Twelve Integrated Intelligence Systems
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES_12.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.num}
                className="bg-white rounded-xl border border-slate-200/90 p-6 hover:border-sky-300 transition-colors"
              >
                <div className="flex items-center justify-between mb-3 text-xs font-mono-tabular text-slate-400">
                  <span>{f.num}</span>
                  <Icon className="w-4 h-4 text-sky-600" />
                </div>
                <h3 className="font-display text-lg font-semibold text-[#0B1D39]">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-white border-y border-slate-200/80 py-16">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="max-w-xl mb-10">
            <p className="text-xs font-semibold tracking-widest uppercase text-sky-700 mb-2">Workflow</p>
            <h2 className="font-display text-3xl font-bold text-[#0B1D39]">How LifeTwin AI Works</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: '01. Collect', text: 'Capture heart rate, experimental SpO2, sleep, activity, mood, and daily habits across wearables, ESP32 sensors, or manual logs.' },
              { step: '02. Connect', text: 'Deduplicate multi-device streams, filter noisy optical artifacts with the Sensor Trust Engine, and align records on one timeline.' },
              { step: '03. Analyze', text: 'Establish adaptive personal baselines, compute LifeGraph correlations, and run structured N-of-1 experiments.' },
              { step: '04. Understand', text: 'Explore your history in 3D Time Travel, test scenarios in FuturePath, and query Evidence-Based AI.' },
            ].map((item) => (
              <div key={item.step} className="p-6 rounded-xl bg-[#F8FAFD] border border-slate-200/80">
                <h3 className="font-display text-lg font-bold text-[#0B1D39]">{item.step}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section id="technology" className="max-w-[1280px] mx-auto px-6 py-16">
        <div className="max-w-2xl mb-10">
          <p className="text-xs font-semibold tracking-widest uppercase text-sky-700 mb-2">Architecture</p>
          <h2 className="font-display text-3xl font-bold text-[#0B1D39]">Hardware, Cloud &amp; 3D Stack</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <img
              src="/src/assets/images/esp32_max30102_kit_1795620518352.jpg"
              alt="ESP32 DevKit V1 wired to MAX30102 optical heart rate sensor"
              referrerPolicy="no-referrer"
              className="w-full h-44 object-cover"
            />
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs text-sky-700 font-medium mb-1">
                <Cpu className="w-3.5 h-3.5" />
                <span>Custom IoT Hardware</span>
              </div>
              <h3 className="font-display font-semibold text-base text-[#0B1D39]">ESP32 DevKit V1 &amp; MAX30102</h3>
              <p className="text-sm text-slate-600 mt-1.5">
                Wi-Fi telemetry pipeline streaming BPM and experimental SpO2 estimates through our Sensor Trust Engine.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <img
              src="/src/assets/images/smartwatch_wearable_1795620517131.jpg"
              alt="Smartwatch wearable physiological metrics display"
              referrerPolicy="no-referrer"
              className="w-full h-44 object-cover"
            />
            <div className="p-5">
              <div className="flex items-center gap-2 text-xs text-sky-700 font-medium mb-1">
                <Activity className="w-3.5 h-3.5" />
                <span>Wearable Ecosystem</span>
              </div>
              <h3 className="font-display font-semibold text-base text-[#0B1D39]">Smartwatch &amp; Health Connect</h3>
              <p className="text-sm text-slate-600 mt-1.5">
                Integration architecture for Apple Health, Android Health Connect, Fitbit, and Garmin exports with source prioritization.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-sky-700 font-medium mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Software &amp; Intelligence</span>
              </div>
              <h3 className="font-display font-semibold text-lg text-[#0B1D39]">Full-Stack Intelligence Core</h3>
              <ul className="mt-4 space-y-2.5 text-sm text-slate-600">
                <li>React · TypeScript · Tailwind CSS</li>
                <li>Three.js WebGL 3D Digital Twin</li>
                <li>Recharts Interactive Analytics</li>
                <li>Express Backend + SQLite / Supabase Ready</li>
                <li>Server-Side Gemini AI Synthesis</li>
              </ul>
            </div>
            <button
              onClick={() => navigate('onboarding')}
              className="mt-6 w-full py-2.5 rounded-lg bg-[#0B1D39] text-white text-sm font-semibold hover:bg-[#132E59] transition-colors cursor-pointer"
            >
              Build Your LifeTwin
            </button>
          </div>
        </div>
      </section>

      {/* About & Final CTA */}
      <section id="about" className="bg-[#0B1D39] text-white py-16">
        <div className="max-w-[1280px] mx-auto px-6 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold max-w-2xl mx-auto">
            Your Body Has a Story. It&apos;s Time to Understand It.
          </h2>
          <p className="mt-4 text-sky-200/85 max-w-xl mx-auto text-sm sm:text-base">
            Traditional fitness trackers tell you what your body recorded. LifeTwin AI helps you investigate what those records mean.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={() => navigate('onboarding')}
              className="px-7 py-3.5 rounded-xl bg-sky-500 text-white font-semibold text-sm hover:bg-sky-400 transition-colors cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      <footer className="bg-[#071429] text-slate-400 py-8 px-6 border-t border-slate-800">
        <div className="max-w-[1280px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span>LifeTwin AI. Your Body. Your Data. Your Intelligence.</span>
          <span>Built for wHACKiest 2026. Know Thyself.</span>
        </div>
      </footer>
    </div>
  );
}
