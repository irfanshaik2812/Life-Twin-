import React, { useState } from 'react';
import {
  Activity,
  BarChart3,
  Bot,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Clock,
  Compass,
  Cpu,
  Database,
  Eye,
  FlaskConical,
  HeartHandshake,
  LayoutDashboard,
  LogOut,
  Menu,
  Network,
  Settings,
  SlidersHorizontal,
  Sparkles,
  SunMedium,
  Trophy,
  UserCircle2,
  X,
} from 'lucide-react';
import { useLifeTwin } from '../../context/LifeTwinContext';
import { BrandMark } from '../common/BrandMark';
import { AppRoute } from '../../types/lifetwin';

interface NavGroup {
  id: string;
  label: string;
  items: Array<{ route: AppRoute; label: string; icon: React.ComponentType<{ className?: string }> }>;
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: 'main',
    label: 'Main',
    items: [
      { route: 'overview', label: 'Overview', icon: LayoutDashboard },
      { route: 'monitoring', label: 'Health Monitoring', icon: Activity },
      { route: 'lifestyle', label: 'Lifestyle Tracker', icon: CalendarDays },
      { route: 'devices', label: 'Connected Devices', icon: Cpu },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    items: [
      { route: 'insights', label: 'AI Insights', icon: Sparkles },
      { route: 'memory', label: 'Personal Health Memory', icon: Database },
      { route: 'lifegraph', label: 'LifeGraph', icon: Network },
      { route: 'evidence', label: 'Evidence-Based AI', icon: Eye },
      { route: 'baseline', label: 'Adaptive Baseline', icon: SlidersHorizontal },
      { route: 'rhythm', label: 'Personal Rhythm', icon: SunMedium },
    ],
  },
  {
    id: 'twin',
    label: 'Digital Twin',
    items: [
      { route: 'twin', label: '3D Digital Twin', icon: UserCircle2 },
      { route: 'timetravel', label: 'Time Travel', icon: Clock },
      { route: 'futurepath', label: 'FuturePath', icon: Compass },
    ],
  },
  {
    id: 'development',
    label: 'Personal Development',
    items: [
      { route: 'experiments', label: 'Experiment Lab', icon: FlaskConical },
      { route: 'coach', label: 'Wellness Coach', icon: HeartHandshake },
      { route: 'challenges', label: 'Habit Challenges', icon: Trophy },
    ],
  },
  {
    id: 'assistant',
    label: 'Assistant and Reports',
    items: [
      { route: 'assistant', label: 'AI Assistant', icon: Bot },
      { route: 'reports', label: 'Reports', icon: BarChart3 },
      { route: 'settings', label: 'Settings and Privacy', icon: Settings },
    ],
  },
];

export function DashboardShell({
  title,
  children,
  darkViewport = false,
}: {
  title: string;
  children: React.ReactNode;
  darkViewport?: boolean;
}) {
  const { route, navigate, state, logout, liveEventBanner, dismissLiveBanner } = useLifeTwin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    main: true,
    intelligence: true,
    twin: true,
    development: true,
    assistant: true,
  });

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));

  const hasDemo = state.measurements.some((m) => m.isDemo) || state.user?.isDemo;
  const localFirst = state.privacy?.localFirstMode;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200/90">
      <div className="px-5 py-4 border-b border-slate-200/80 flex items-center justify-between">
        <button onClick={() => navigate('overview')} className="cursor-pointer">
          <BrandMark size="sm" />
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 cursor-pointer"
          aria-label="Close navigation"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4">
        {NAV_GROUPS.map((group) => {
          const isOpen = openGroups[group.id];
          return (
            <div key={group.id}>
              <button
                type="button"
                onClick={() => toggleGroup(group.id)}
                className="w-full px-2.5 py-1 flex items-center justify-between text-[11px] font-semibold tracking-wider uppercase text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span>{group.label}</span>
                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
              {isOpen && (
                <div className="mt-1 space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = route === item.route;
                    return (
                      <button
                        key={item.route}
                        onClick={() => {
                          navigate(item.route);
                          setMobileOpen(false);
                        }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors cursor-pointer text-left ${
                          active
                            ? 'bg-sky-50 text-[#0284C7] font-semibold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-[#0B1D39]'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#0284C7]' : 'text-slate-400'}`} />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200/80 space-y-2.5">
        <div className="text-xs">
          <p className="font-semibold text-[#0B1D39] truncate">
            {state.profile?.fullName || state.user?.email || 'Member'}
          </p>
          <p className="text-slate-500 truncate">{state.user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F8FAFD] text-[#0B1D39]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-[270px] h-full">{sidebarContent}</div>
          <div className="flex-1 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className={`sticky top-0 z-20 px-4 sm:px-6 py-3.5 border-b flex items-center justify-between gap-4 ${
            darkViewport
              ? 'bg-[#071124] border-slate-800 text-white'
              : 'bg-white/95 border-slate-200/90 text-[#0B1D39]'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileOpen(true)}
              className={`lg:hidden p-2 rounded-lg cursor-pointer ${
                darkViewport ? 'hover:bg-slate-800 text-sky-100' : 'hover:bg-slate-100 text-slate-700'
              }`}
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className={`text-xs truncate ${darkViewport ? 'text-sky-300/80' : 'text-slate-500'}`}>
                LifeTwin AI · {title}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs shrink-0">
            <span className={`hidden sm:inline ${darkViewport ? 'text-slate-300' : 'text-slate-500'}`}>
              {localFirst ? 'Local-First Mode' : state.capabilities.geminiConfigured ? 'Gemini AI Active' : 'Local Analytics Engine'}
              {hasDemo ? ' · Includes Demo Data' : ''}
            </span>
            <button
              onClick={() => navigate('twin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer ${
                darkViewport
                  ? 'bg-sky-500/20 text-sky-200 border border-sky-400/30'
                  : 'bg-[#0B1D39] text-white hover:bg-[#132E59]'
              }`}
            >
              3D Twin
            </button>
          </div>
        </header>

        {liveEventBanner && (
          <div className="px-6 py-2.5 bg-sky-600 text-white text-xs flex items-center justify-between gap-4">
            <span className="font-mono-tabular">{liveEventBanner}</span>
            <button onClick={dismissLiveBanner} className="underline font-semibold cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        <main className={`flex-1 ${darkViewport ? 'bg-[#061021] text-white' : ''}`}>{children}</main>
      </div>
    </div>
  );
}
