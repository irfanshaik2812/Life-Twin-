export type AppRoute =
  | 'intro'
  | 'landing'
  | 'auth'
  | 'onboarding'
  | 'connect'
  | 'overview'
  | 'monitoring'
  | 'lifestyle'
  | 'devices'
  | 'insights'
  | 'memory'
  | 'lifegraph'
  | 'evidence'
  | 'baseline'
  | 'rhythm'
  | 'twin'
  | 'timetravel'
  | 'futurepath'
  | 'experiments'
  | 'coach'
  | 'challenges'
  | 'assistant'
  | 'reports'
  | 'settings';

export interface UserAccount {
  id: string;
  email: string;
  isDemo?: boolean;
  createdAt: string;
}

export interface UserProfile {
  userId: string;
  fullName: string;
  age: number | null;
  dob: string;
  gender: string;
  heightCm: number;
  weightKg: number;
  unitSystem: 'metric' | 'imperial';
  country: string;
  timezone: string;
  sleepTargetHours: number;
  usualBedtime: string;
  usualWakeTime: string;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  exerciseFrequency: string;
  exercisePreferences: string[];
  dailyRoutine: string;
  dietaryPreferences: string;
  moodTrackingEnabled: boolean;
  energyTrackingEnabled: boolean;
  goals: string[];
  healthContext: string;
  medications: string;
  wellnessNotes: string;
  measurementLimitations: string;
  onboardingCompleted: boolean;
  updatedAt: string;
}

export interface AvatarPreferences {
  userId: string;
  bodyBuild: 'lean' | 'balanced' | 'athletic' | 'broad';
  skinTone: string;
  hairStyle: 'short' | 'medium' | 'long' | 'fade' | 'minimal';
  accentColor: 'cyan' | 'cobalt' | 'ice' | 'teal';
  postureStyle: 'neutral' | 'athletic' | 'relaxed';
  updatedAt: string;
}

export type DeviceType = 'smartwatch' | 'esp32';

export interface ConnectedDevice {
  id: string;
  userId: string;
  deviceType: DeviceType;
  provider: string;
  deviceName: string;
  deviceIdCode: string;
  status: 'connected' | 'disconnected' | 'awaiting_credentials' | 'demo_stream';
  signalQuality: number;
  lastSyncAt: string | null;
  permissions: string[];
  preferredForHr: boolean;
  preferredForSleep: boolean;
  preferredForActivity: boolean;
  createdAt: string;
}

export type SourceType = 'esp32' | 'smartwatch' | 'manual' | 'demo';

export interface HealthMeasurement {
  id: string;
  userId: string;
  recordedAt: string;
  dateKey: string;
  heartRateBpm: number | null;
  restingHrBpm: number | null;
  spo2Pct: number | null;
  isExperimentalSpo2: boolean;
  sleepHours: number | null;
  sleepStart: string | null;
  sleepEnd: string | null;
  sleepConsistencyScore: number | null;
  steps: number | null;
  activeMinutes: number | null;
  exerciseMinutes: number | null;
  exerciseType: string | null;
  moodScore: number | null; // 1-10
  energyScore: number | null; // 1-10
  focusScore: number | null; // 1-10
  waterLiters: number | null;
  screenTimeMinutes: number | null;
  habits: string[];
  notes: string;
  sourceDevice: string;
  sourceType: SourceType;
  signalQualityScore: number; // 0-100
  qualityFlags: string[];
  isRejected: boolean;
  isDemo: boolean;
}

export interface PersonalHealthMemoryItem {
  id: string;
  userId: string;
  title: string;
  observation: string;
  category: 'sleep' | 'energy' | 'heart' | 'activity' | 'mood';
  dateRange: string;
  sampleSize: number;
  confidence: 'high' | 'moderate' | 'preliminary';
  userApproved: boolean;
  createdAt: string;
}

export interface ExperimentCheckin {
  day: number;
  dateKey: string;
  adhered: boolean;
  metricValue: number | null;
  note: string;
}

export interface ExperimentItem {
  id: string;
  userId: string;
  title: string;
  hypothesis: string;
  metricTarget: 'energy' | 'sleep' | 'resting_hr' | 'mood';
  durationDays: number;
  baselineSummary: string;
  status: 'suggested' | 'active' | 'completed' | 'rejected';
  startDate: string | null;
  endDate: string | null;
  checkins: ExperimentCheckin[];
  resultSummary: string;
  createdAt: string;
}

export interface HabitChallengeItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  targetMetric: string;
  durationDays: number;
  status: 'suggested' | 'active' | 'completed';
  checkins: { dateKey: string; completed: boolean }[];
  baselineValue: string;
  outcomeValue: string;
  createdAt: string;
}

export interface WellnessGoalItem {
  id: string;
  userId: string;
  title: string;
  rationale: string;
  scheduleText: string;
  status: 'pending_approval' | 'approved' | 'modified' | 'rejected' | 'completed';
  progressPct: number;
  checkins: { dateKey: string; note: string; status: string }[];
  createdAt: string;
}

export interface PrivacyPreferences {
  userId: string;
  localFirstMode: boolean;
  aiCloudConsent: boolean;
  wearableSyncConsent: boolean;
  esp32CloudConsent: boolean;
  shareAnonymizedSummaries: boolean;
  updatedAt: string;
}

export interface ChatMessageItem {
  id: string;
  userId: string;
  role: 'user' | 'assistant';
  content: string;
  references: { label: string; dateRange?: string; metric?: string }[];
  isDemoResponse: boolean;
  createdAt: string;
}

export interface EvidenceInsight {
  id: string;
  title: string;
  category: 'sleep' | 'heart' | 'activity' | 'mood' | 'rhythm';
  observation: string;
  supportingSummary: string;
  matchedDays: number;
  totalSampleDays: number;
  dateRange: string;
  confidence: 'High' | 'Moderate' | 'Exploratory';
  alternativeExplanations: string;
  recommendation: string;
  supportingDateKeys: string[];
  isDemoBasis: boolean;
}

export type BodyRegion = 'head' | 'chest' | 'torso' | 'limbs' | 'whole';
