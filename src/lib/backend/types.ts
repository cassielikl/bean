export type OnboardingScreen = "o1" | "o2" | "o3" | "naming" | "account" | "quest" | "qComplete" | "home";
export type ObservationSource = "first_quest" | "daily" | "bonus" | "freeform";
export type SeedStage = "unplanted" | "planted" | "sprout" | "bloomed";

export interface BackendProfile {
  id: string;
  userName: string;
  beanName: string;
  timezone: string;
  onboardingScreen: OnboardingScreen;
  tutorialStep: number;
  onboardingCompletedAt: string | null;
  localDataImportedAt: string | null;
  tokens: number;
  equippedOutfit: string;
  equippedFace: string;
  equippedBackdrop: string;
  isAnonymous: boolean;
}

export interface ObservationMedia { kind: "photo" | "voice"; storagePath: string; mimeType: string | null }

export interface BackendObservation {
  id: string;
  clientRequestId: string;
  source: ObservationSource;
  prompt: string;
  body: string;
  category: string;
  emoji: string;
  createdAt: string;
  hasPhoto: boolean;
  hasVoice: boolean;
  media: ObservationMedia[];
  classification: ObservationClassification | null;
}

export type ThemeId = "nature" | "beauty-color" | "calm-reflection" | "achievement-energy" | "relationships-care" | "sound-presence" | "comfort-routine" | "joy-optimism" | "creativity-curiosity";
export type BeanMood = "content" | "curious" | "excited" | "proud" | "gentle" | "sleepy";

export interface ThemeDefinition { id: ThemeId; name: string; description: string; flowerSpeciesId: string; flowerName: string; assetKey: string }
export interface ObservationClassification {
  primaryThemeId: ThemeId;
  flowerSpeciesId: string;
  secondaryTags: string[];
  sensoryChannel: "visual" | "sound" | "touch" | "smell" | "taste" | "movement" | "general";
  tone: "positive" | "neutral";
  confidence: number;
  provenance: "prompt_rule" | "keyword_fallback" | "ai" | "user_corrected";
  modelVersion: string;
}
export interface UserInterestSignal { tag: string; evidenceCount: number; confidence: number; firstSeenAt: string; lastSeenAt: string }
export interface BeanPersonalityState {
  practicalAdventurous: number; spontaneousOrganized: number; reservedSocial: number;
  competitiveCooperative: number; calmPassionate: number; updatedAt: string;
}
export interface BeanMoodState { mood: BeanMood; reason: string; expiresAt: string | null; updatedAt: string }
export interface DerivedContextInput { kind: "exam" | "deadline" | "appointment" | "birthday" | "travel" | "important" | "activity_trend" | "sleep_trend" | "mindful_trend"; band?: "below_usual" | "usual" | "above_usual"; startsAt?: string; expiresAt: string; userApproved: boolean }
export interface NotificationPreferences { dailyPromptEnabled: boolean; bloomEnabled: boolean; calendarEncouragementEnabled: boolean; dailyWindowStart: string; dailyWindowEnd: string; quietHoursStart: string; quietHoursEnd: string; timezone: string }

export interface BackendGardenPlacement {
  id: string;
  itemId: string;
  kind: "flower" | "decor";
  x: number;
  y: number;
  zIndex: number;
}

export interface BackendSeed {
  id: string;
  observationId: string;
  plantedAt: string | null;
  harvestedAt: string | null;
  stage: SeedStage;
}

export interface DailyQuest {
  assignmentId: string;
  questId: string;
  prompt: string;
  category: string;
  emoji: string;
  completedAt: string | null;
}

export interface SubmitObservationInput {
  clientRequestId: string;
  source: ObservationSource;
  prompt: string;
  body: string;
  category: string;
  emoji: string;
  assignmentId?: string | null;
  media?: Array<{ kind: "photo" | "voice"; file: File }>;
}

export interface SubmitObservationResult {
  observationId: string;
  seedId: string;
  beanResponse: string;
}

export interface WeeklyCapsule {
  id: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
}

export interface LegacyImport {
  userName: string;
  beanName: string;
  onboardingScreen: OnboardingScreen;
  tutorialStep: number;
  tokens: number;
  observations: Array<{
    id: string;
    prompt: string;
    text: string;
    createdAt: string;
    category: string;
    emoji: string;
  }>;
}

export interface BeanBackend {
  readonly configured: boolean;
  bootstrap(): Promise<BackendProfile | null>;
  saveOnboarding(input: Partial<Pick<BackendProfile, "userName" | "beanName" | "timezone" | "onboardingScreen" | "tutorialStep" | "onboardingCompletedAt">>): Promise<void>;
  requestOtp(channel: "email" | "phone", value: string, mode?: "link" | "signin"): Promise<void>;
  verifyOtp(channel: "email" | "phone", value: string, token: string, mode?: "link" | "signin"): Promise<void>;
  signOut(): Promise<void>;
  importLegacy(input: LegacyImport): Promise<void>;
  getDailyQuest(localDate: string): Promise<DailyQuest | null>;
  submitObservation(input: SubmitObservationInput): Promise<SubmitObservationResult>;
  classifyObservation(observationId: string): Promise<ObservationClassification>;
  correctObservationTheme(observationId: string, themeId: ThemeId): Promise<ObservationClassification>;
  listThemes(): Promise<ThemeDefinition[]>;
  listUserInterests(): Promise<UserInterestSignal[]>;
  getBeanPersonality(): Promise<BeanPersonalityState | null>;
  getBeanMood(): Promise<BeanMoodState | null>;
  recordBeanBehavior(eventType: "daily_completed" | "bonus_completed" | "freeform_shared" | "garden_designed" | "item_purchased", idempotencyKey: string): Promise<BeanPersonalityState>;
  saveDerivedContext(input: DerivedContextInput): Promise<string>;
  listDerivedContexts(): Promise<Array<DerivedContextInput & { id: string }>>;
  deleteDerivedContext(id: string): Promise<void>;
  registerDevice(input: { apnsToken: string; appVersion?: string }): Promise<string>;
  getNotificationPreferences(): Promise<NotificationPreferences | null>;
  saveNotificationPreferences(input: NotificationPreferences): Promise<void>;
  listObservations(): Promise<BackendObservation[]>;
  listSeeds(): Promise<BackendSeed[]>;
  listInventory(): Promise<string[]>;
  listGardenPlacements(): Promise<BackendGardenPlacement[]>;
  plantSeed(seedId: string): Promise<string>;
  harvestSeed(seedId: string): Promise<number>;
  purchaseItem(itemId: string): Promise<number>;
  equipItem(category: "outfit" | "face" | "backdrop", itemId: string): Promise<void>;
  saveGardenPlacement(input: { id?: string; seedId?: string; catalogItemId?: string; x: number; y: number; zIndex?: number }): Promise<string>;
  removeGardenPlacement(id: string): Promise<void>;
  listCapsules(): Promise<WeeklyCapsule[]>;
  createMediaUrl(path: string): Promise<string>;
  exportAccount(): Promise<Record<string, unknown>>;
  deleteAccount(): Promise<void>;
  resetProgressForTesting(): Promise<void>;
}
