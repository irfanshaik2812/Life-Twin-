import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  AppRoute,
  AvatarPreferences,
  ChatMessageItem,
  ConnectedDevice,
  ExperimentItem,
  HabitChallengeItem,
  HealthMeasurement,
  PersonalHealthMemoryItem,
  PrivacyPreferences,
  UserAccount,
  UserProfile,
  WellnessGoalItem,
} from '../types/lifetwin';

export interface CapabilitiesState {
  geminiConfigured: boolean;
  supabaseConfigured: boolean;
  fitbitOAuthConfigured: boolean;
  garminOAuthConfigured: boolean;
}

export interface FullAppState {
  user: UserAccount | null;
  profile: UserProfile | null;
  avatar: AvatarPreferences | null;
  devices: ConnectedDevice[];
  measurements: HealthMeasurement[];
  memories: PersonalHealthMemoryItem[];
  experiments: ExperimentItem[];
  challenges: HabitChallengeItem[];
  goals: WellnessGoalItem[];
  privacy: PrivacyPreferences | null;
  chatHistory: ChatMessageItem[];
  capabilities: CapabilitiesState;
}

interface LifeTwinContextValue {
  route: AppRoute;
  navigate: (next: AppRoute) => void;
  token: string | null;
  state: FullAppState;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  liveEventBanner: string | null;
  dismissLiveBanner: () => void;
  apiFetch: <T = unknown>(url: string, options?: RequestInit) => Promise<T>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signInDemo: () => Promise<boolean>;
  signUpWithOnboarding: (payload: {
    email: string;
    password: string;
    profile: Partial<UserProfile>;
    avatar: Partial<AvatarPreferences>;
    loadSampleHistory: boolean;
  }) => Promise<boolean>;
  logout: () => void;
  refreshState: () => Promise<void>;
  applyServerState: (newState: FullAppState) => void;
}

const emptyState: FullAppState = {
  user: null,
  profile: null,
  avatar: null,
  devices: [],
  measurements: [],
  memories: [],
  experiments: [],
  challenges: [],
  goals: [],
  privacy: null,
  chatHistory: [],
  capabilities: {
    geminiConfigured: false,
    supabaseConfigured: false,
    fitbitOAuthConfigured: false,
    garminOAuthConfigured: false,
  },
};

const LifeTwinContext = createContext<LifeTwinContextValue | null>(null);

const PROTECTED_ROUTES: Set<AppRoute> = new Set([
  'connect',
  'overview',
  'monitoring',
  'lifestyle',
  'devices',
  'insights',
  'memory',
  'lifegraph',
  'evidence',
  'baseline',
  'rhythm',
  'twin',
  'timetravel',
  'futurepath',
  'experiments',
  'coach',
  'challenges',
  'assistant',
  'reports',
  'settings',
]);

export function LifeTwinProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<AppRoute>('intro');
  // Session token stored strictly in React memory (never localStorage/sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<FullAppState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveEventBanner, setLiveEventBanner] = useState<string | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const navigate = useCallback(
    (next: AppRoute) => {
      if (PROTECTED_ROUTES.has(next) && !token) {
        setRoute('auth');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
      setRoute(next);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [token]
  );

  const clearError = useCallback(() => setError(null), []);
  const dismissLiveBanner = useCallback(() => setLiveEventBanner(null), []);

  const applyServerState = useCallback((newState: FullAppState) => {
    setState(newState);
  }, []);

  const apiFetch = useCallback(
    async <T = unknown>(url: string, options: RequestInit = {}): Promise<T> => {
      const headers = new Headers(options.headers || {});
      if (!headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      const res = await fetch(url, { ...options, headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = data?.error || `Request failed (${res.status})`;
        setError(msg);
        throw new Error(msg);
      }
      if (data?.state) {
        setState(data.state);
      }
      return data as T;
    },
    [token]
  );

  const refreshState = useCallback(async () => {
    if (!token) return;
    const data = await apiFetch<{ state: FullAppState }>('/api/me');
    setState(data.state);
  }, [token, apiFetch]);

  // Connect live SSE stream for real-time ESP32 / measurement events
  useEffect(() => {
    if (!token) {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      return;
    }

    const es = new EventSource(`/api/stream?token=${encodeURIComponent(token)}`);
    sseRef.current = es;

    es.addEventListener('measurement', (evt) => {
      try {
        const m = JSON.parse((evt as MessageEvent).data) as HealthMeasurement;
        setState((prev) => {
          const exists = prev.measurements.some((x) => x.id === m.id);
          const nextMeas = exists ? prev.measurements : [...prev.measurements, m];
          return { ...prev, measurements: nextMeas };
        });
        setLiveEventBanner(
          m.isRejected
            ? `Sensor Trust flagged sample from ${m.sourceDevice} (Quality ${m.signalQualityScore}%)`
            : `Live reading received from ${m.sourceDevice}${m.heartRateBpm ? ` · ${m.heartRateBpm} BPM` : ''}`
        );
      } catch {
        // ignore parse issues
      }
    });

    return () => {
      es.close();
      sseRef.current = null;
    };
  }, [token]);

  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Sign in failed.');
        return false;
      }
      setToken(data.token);
      setState(data.state);
      setRoute(data.state.profile?.onboardingCompleted ? 'overview' : 'onboarding');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signInDemo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Demo sign in failed.');
        return false;
      }
      setToken(data.token);
      setState(data.state);
      setRoute('overview');
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error.');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signUpWithOnboarding = useCallback(
    async (payload: {
      email: string;
      password: string;
      profile: Partial<UserProfile>;
      avatar: Partial<AvatarPreferences>;
      loadSampleHistory: boolean;
    }) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            profile: { ...payload.profile, onboardingCompleted: true },
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Could not create LifeTwin account.');
          return false;
        }
        setToken(data.token);
        setState(data.state);
        setRoute('connect');
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error.');
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const logout = useCallback(() => {
    setToken(null);
    setState(emptyState);
    setRoute('intro');
  }, []);

  return (
    <LifeTwinContext.Provider
      value={{
        route,
        navigate,
        token,
        state,
        loading,
        error,
        clearError,
        liveEventBanner,
        dismissLiveBanner,
        apiFetch,
        signIn,
        signInDemo,
        signUpWithOnboarding,
        logout,
        refreshState,
        applyServerState,
      }}
    >
      {children}
    </LifeTwinContext.Provider>
  );
}

export function useLifeTwin() {
  const ctx = useContext(LifeTwinContext);
  if (!ctx) throw new Error('useLifeTwin must be used inside LifeTwinProvider');
  return ctx;
}
