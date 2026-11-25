import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { LifeTwinProvider, useLifeTwin } from './context/LifeTwinContext';
import { IntroPage } from './pages/IntroPage';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { ConnectSourcesPage } from './pages/ConnectSourcesPage';
import { DashboardShell } from './components/layout/DashboardShell';
import { OverviewPage } from './pages/OverviewPage';
import { HealthMonitoringPage } from './pages/HealthMonitoringPage';
import { LifestyleTrackerPage } from './pages/LifestyleTrackerPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import {
  AdaptiveBaselineView,
  EvidenceInsightsView,
  LifeGraphView,
  PersonalHealthMemoryView,
  PersonalRhythmView,
} from './pages/IntelligencePages';
import {
  ExperimentLabView,
  FuturePathView,
  HabitChallengesView,
  WellnessCoachView,
} from './pages/DevelopmentPages';
import {
  AIAssistantView,
  ReportsView,
  SettingsPrivacyView,
} from './pages/AssistantReportsSettingsPages';
import { AppRoute } from './types/lifetwin';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class AppErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'An unexpected rendering error occurred.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('LifeTwin UI ErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F8FAFD] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 font-semibold text-sm">
              <AlertCircle className="w-5 h-5" />
              LifeTwin Workspace Recovery
            </div>
            <p className="text-sm text-slate-600">{this.state.message}</p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, message: '' })}
              className="px-4 py-2 rounded-lg bg-[#0B1D39] text-white text-sm font-semibold cursor-pointer"
            >
              Reload Workspace View
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const ROUTE_TITLES: Record<AppRoute, string> = {
  intro: 'Welcome',
  landing: 'LifeTwin AI',
  auth: 'Sign In',
  onboarding: 'Create Your LifeTwin',
  connect: 'Connect Health Data Sources',
  overview: 'Overview',
  monitoring: 'Health Monitoring',
  lifestyle: 'Lifestyle Tracker',
  devices: 'Connected Devices',
  insights: 'AI Insights',
  memory: 'Personal Health Memory',
  lifegraph: 'LifeGraph Relationship Explorer',
  evidence: 'Evidence-Based AI',
  baseline: 'Adaptive Baseline Engine',
  rhythm: 'Personal Rhythm Discovery',
  twin: '3D Digital Twin',
  timetravel: 'Time-Travel Digital Twin',
  futurepath: 'FuturePath What-If Engine',
  experiments: 'N-of-1 Experiment Lab',
  coach: 'Agentic Wellness Coach',
  challenges: 'Personalized Habit Challenges',
  assistant: 'Personal AI Assistant',
  reports: 'Reports & Export',
  settings: 'Settings & Privacy',
};

function LifeTwinRouter() {
  const { route, error, clearError } = useLifeTwin();

  const renderGlobalError = () =>
    error ? (
      <div
        role="alert"
        className="fixed bottom-5 right-5 z-50 max-w-md bg-[#0B1D39] text-white border border-rose-400/50 rounded-xl shadow-lg px-4 py-3 flex items-start gap-3"
      >
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed flex-1">{error}</p>
        <button
          type="button"
          onClick={clearError}
          aria-label="Dismiss error"
          className="text-slate-300 hover:text-white cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    ) : null;

  if (route === 'intro') {
    return (
      <>
        <IntroPage />
        {renderGlobalError()}
      </>
    );
  }
  if (route === 'landing') {
    return (
      <>
        <LandingPage />
        {renderGlobalError()}
      </>
    );
  }
  if (route === 'auth') {
    return (
      <>
        <AuthPage />
        {renderGlobalError()}
      </>
    );
  }
  if (route === 'onboarding') {
    return (
      <>
        <OnboardingPage />
        {renderGlobalError()}
      </>
    );
  }
  if (route === 'connect') {
    return (
      <>
        <ConnectSourcesPage />
        {renderGlobalError()}
      </>
    );
  }

  const isDarkViewport = route === 'twin' || route === 'timetravel';

  const renderDashboardContent = () => {
    switch (route) {
      case 'overview':
        return <OverviewPage />;
      case 'monitoring':
        return <HealthMonitoringPage />;
      case 'lifestyle':
        return <LifestyleTrackerPage />;
      case 'devices':
        return <ConnectSourcesPage embedded />;
      case 'insights':
        return <EvidenceInsightsView mode="insights" />;
      case 'memory':
        return <PersonalHealthMemoryView />;
      case 'lifegraph':
        return <LifeGraphView />;
      case 'evidence':
        return <EvidenceInsightsView mode="evidence" />;
      case 'baseline':
        return <AdaptiveBaselineView />;
      case 'rhythm':
        return <PersonalRhythmView />;
      case 'twin':
        return <DigitalTwinPage key="twin" initialTimeTravel={false} />;
      case 'timetravel':
        return <DigitalTwinPage key="timetravel" initialTimeTravel={true} />;
      case 'futurepath':
        return <FuturePathView />;
      case 'experiments':
        return <ExperimentLabView />;
      case 'coach':
        return <WellnessCoachView />;
      case 'challenges':
        return <HabitChallengesView />;
      case 'assistant':
        return <AIAssistantView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsPrivacyView />;
      default:
        return <OverviewPage />;
    }
  };

  return (
    <>
      <DashboardShell title={ROUTE_TITLES[route]} darkViewport={isDarkViewport}>
        {renderDashboardContent()}
      </DashboardShell>
      {renderGlobalError()}
    </>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <LifeTwinProvider>
        <LifeTwinRouter />
      </LifeTwinProvider>
    </AppErrorBoundary>
  );
}
