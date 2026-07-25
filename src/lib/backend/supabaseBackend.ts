import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSeedStage } from "./growth";
import type {
  BackendGardenPlacement, BackendObservation, BackendProfile, BackendSeed, BeanBackend, DailyQuest,
  LegacyImport, OnboardingScreen, SubmitObservationInput, SubmitObservationResult, ThemeDefinition,
  ObservationClassification, ThemeId, UserInterestSignal, BeanPersonalityState, BeanMoodState,
  DerivedContextInput, NotificationPreferences, WeeklyCapsule,
} from "./types";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

function mapProfile(row: any, isAnonymous: boolean): BackendProfile {
  return {
    id: row.id,
    userName: row.user_name,
    beanName: row.bean_name,
    timezone: row.timezone,
    onboardingScreen: row.onboarding_screen as OnboardingScreen,
    tutorialStep: row.tutorial_step,
    onboardingCompletedAt: row.onboarding_completed_at,
    localDataImportedAt: row.local_data_imported_at,
    tokens: row.tokens,
    equippedOutfit: row.equipped_outfit,
    equippedFace: row.equipped_face ?? "none",
    equippedBackdrop: row.equipped_backdrop,
    isAnonymous,
  };
}

function mapClassification(row: any): ObservationClassification | null {
  if (!row) return null;
  return { primaryThemeId: row.primary_theme_id, flowerSpeciesId: row.flower_species_id, secondaryTags: row.secondary_tags || [], sensoryChannel: row.sensory_channel, tone: row.tone, confidence: row.confidence, provenance: row.provenance, modelVersion: row.model_version };
}

function mapPersonality(row: any): BeanPersonalityState {
  return { practicalAdventurous: row.practical_adventurous, spontaneousOrganized: row.spontaneous_organized, reservedSocial: row.reserved_social, competitiveCooperative: row.competitive_cooperative, calmPassionate: row.calm_passionate, updatedAt: row.updated_at };
}

export class SupabaseBeanBackend implements BeanBackend {
  readonly configured = Boolean(url && key);
  private client: SupabaseClient | null = this.configured ? createClient(url!, key!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }) : null;

  private get db(): SupabaseClient {
    if (!this.client) throw new Error("Supabase is not configured. Copy .env.example to .env.local and add your project values.");
    return this.client;
  }

  async bootstrap(): Promise<BackendProfile | null> {
    if (!this.configured) return null;
    let { data: { session } } = await this.db.auth.getSession();
    if (!session) {
      const result = await this.db.auth.signInAnonymously();
      if (result.error) throw result.error;
      session = result.data.session;
    }
    if (!session) throw new Error("Unable to start a Bean session.");
    const { data, error } = await this.db.from("profiles").select("*").eq("id", session.user.id).single();
    if (error) throw error;
    return mapProfile(data, Boolean(session.user.is_anonymous));
  }

  async saveOnboarding(input: Partial<Pick<BackendProfile, "userName" | "beanName" | "timezone" | "onboardingScreen" | "tutorialStep" | "onboardingCompletedAt">>) {
    if (!this.configured) return;
    const { data: { user } } = await this.db.auth.getUser();
    if (!user) throw new Error("No active session.");
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (input.userName !== undefined) patch.user_name = input.userName;
    if (input.beanName !== undefined) patch.bean_name = input.beanName;
    if (input.timezone !== undefined) patch.timezone = input.timezone;
    if (input.onboardingScreen !== undefined) patch.onboarding_screen = input.onboardingScreen;
    if (input.tutorialStep !== undefined) patch.tutorial_step = input.tutorialStep;
    if (input.onboardingCompletedAt !== undefined) patch.onboarding_completed_at = input.onboardingCompletedAt;
    const { error } = await this.db.from("profiles").update(patch).eq("id", user.id);
    if (error) throw error;
  }

  async requestOtp(channel: "email" | "phone", value: string, mode: "link" | "signin" = "link") {
    const payload = channel === "email" ? { email: value } : { phone: value };
    const { error } = mode === "signin"
      ? await this.db.auth.signInWithOtp({ ...payload, options: { shouldCreateUser: false } } as any)
      : await this.db.auth.updateUser(payload);
    if (error) throw error;
  }

  async verifyOtp(channel: "email" | "phone", value: string, token: string, mode: "link" | "signin" = "link") {
    const params = channel === "email"
      ? { email: value, token, type: (mode === "signin" ? "email" : "email_change") as "email" | "email_change" }
      : { phone: value, token, type: (mode === "signin" ? "sms" : "phone_change") as "sms" | "phone_change" };
    const { error } = await this.db.auth.verifyOtp(params);
    if (error) throw error;
  }

  async signOut() { const { error } = await this.db.auth.signOut(); if (error) throw error; }

  async importLegacy(input: LegacyImport) {
    if (!this.configured) return;
    const profile = await this.bootstrap();
    if (!profile || profile.localDataImportedAt) return;
    const { error } = await this.db.rpc("import_legacy_profile", {
      p_user_name: input.userName,
      p_bean_name: input.beanName,
      p_onboarding_screen: input.onboardingScreen,
      p_tutorial_step: input.tutorialStep,
      p_tokens: Math.max(10, input.tokens),
    });
    if (error) throw error;
    for (const item of input.observations) {
      await this.submitObservation({
        clientRequestId: item.id,
        source: "freeform",
        prompt: item.prompt,
        body: item.text,
        category: item.category,
        emoji: item.emoji,
      });
    }
  }

  async getDailyQuest(localDate: string): Promise<DailyQuest | null> {
    if (!this.configured) return null;
    const { data, error } = await this.db.rpc("get_daily_quest", { p_local_date: localDate });
    if (error) throw error;
    const row = data?.[0];
    return row ? { assignmentId: row.assignment_id, questId: row.quest_id, prompt: row.prompt, category: row.category, emoji: row.emoji, completedAt: row.completed_at } : null;
  }

  async submitObservation(input: SubmitObservationInput): Promise<SubmitObservationResult> {
    const { data, error } = await this.db.rpc("submit_observation", {
      p_client_request_id: input.clientRequestId,
      p_source: input.source,
      p_prompt: input.prompt,
      p_body: input.body,
      p_category: input.category,
      p_emoji: input.emoji,
      p_assignment_id: input.assignmentId ?? null,
    });
    if (error) throw error;
    const row = data[0];
    if (input.media?.length) {
      const { data: { user } } = await this.db.auth.getUser();
      if (!user) throw new Error("No active session.");
      for (const media of input.media) {
        const extension = media.file.name.split(".").pop() || (media.kind === "photo" ? "jpg" : "webm");
        const path = `${user.id}/${row.observation_id}/${crypto.randomUUID()}.${extension}`;
        const upload = await this.db.storage.from("observation-media").upload(path, media.file, { contentType: media.file.type });
        if (upload.error) throw upload.error;
        const inserted = await this.db.from("observation_media").insert({ user_id: user.id, observation_id: row.observation_id, kind: media.kind, storage_path: path, mime_type: media.file.type });
        if (inserted.error) throw inserted.error;
      }
    }
    // Classification and personality are enrichment: the observation remains
    // safely saved even if either service is temporarily unavailable.
    try { await this.classifyObservation(row.observation_id); } catch { /* deterministic backfill can retry later */ }
    const behavior = input.source === "daily" || input.source === "first_quest" ? "daily_completed" : input.source === "bonus" ? "bonus_completed" : "freeform_shared";
    try { await this.recordBeanBehavior(behavior, `observation:${row.observation_id}`); } catch { /* idempotent enrichment */ }
    return { observationId: row.observation_id, seedId: row.seed_id, beanResponse: row.bean_response };
  }

  async listObservations(): Promise<BackendObservation[]> {
    if (!this.configured) return [];
    const { data, error } = await this.db.from("observations").select("*, observation_media(kind, storage_path, mime_type), observation_classifications(*)").order("created_at", { ascending: false });
    if (error) throw error;
    return data.map((r: any) => ({ id: r.id, clientRequestId: r.client_request_id, source: r.source, prompt: r.prompt, body: r.body, category: r.category, emoji: r.emoji, createdAt: r.created_at, hasPhoto: r.observation_media?.some((m: any) => m.kind === "photo") || false, hasVoice: r.observation_media?.some((m: any) => m.kind === "voice") || false, media: (r.observation_media || []).map((m: any) => ({ kind: m.kind, storagePath: m.storage_path, mimeType: m.mime_type })), classification: mapClassification(Array.isArray(r.observation_classifications) ? r.observation_classifications[0] : r.observation_classifications) }));
  }

  async classifyObservation(observationId: string) {
    const { data, error } = await this.db.functions.invoke("classify-observation", { body: { observationId } });
    if (error) throw error;
    return data.classification as ObservationClassification;
  }

  async correctObservationTheme(observationId: string, themeId: ThemeId) {
    const { error } = await this.db.rpc("correct_observation_theme", { p_observation_id: observationId, p_theme_id: themeId });
    if (error) throw error;
    const result = await this.db.from("observation_classifications").select("*").eq("observation_id", observationId).single();
    if (result.error) throw result.error;
    return mapClassification(result.data)!;
  }

  async listThemes(): Promise<ThemeDefinition[]> {
    const { data, error } = await this.db.from("theme_flower_mapping").select("theme_catalog(id,name,description), flower_species(id,name,asset_key)");
    if (error) throw error;
    return (data || []).map((row: any) => ({ id: row.theme_catalog.id, name: row.theme_catalog.name, description: row.theme_catalog.description, flowerSpeciesId: row.flower_species.id, flowerName: row.flower_species.name, assetKey: row.flower_species.asset_key }));
  }

  async listUserInterests(): Promise<UserInterestSignal[]> {
    const { data, error } = await this.db.from("user_interest_signals").select("*").gte("evidence_count", 3).order("confidence", { ascending: false });
    if (error) throw error;
    return (data || []).map((row: any) => ({ tag: row.tag, evidenceCount: row.evidence_count, confidence: row.confidence, firstSeenAt: row.first_seen_at, lastSeenAt: row.last_seen_at }));
  }

  async getBeanPersonality() {
    const { data, error } = await this.db.from("bean_personality_state").select("*").maybeSingle();
    if (error) throw error;
    return data ? mapPersonality(data) : null;
  }

  async getBeanMood(): Promise<BeanMoodState | null> {
    const { data, error } = await this.db.from("bean_mood_state").select("*").maybeSingle();
    if (error) throw error;
    return data ? { mood: data.mood, reason: data.reason, expiresAt: data.expires_at, updatedAt: data.updated_at } : null;
  }

  async recordBeanBehavior(eventType: "daily_completed" | "bonus_completed" | "freeform_shared" | "garden_designed" | "item_purchased", idempotencyKey: string) {
    const { data, error } = await this.db.rpc("record_bean_behavior", { p_event_type: eventType, p_idempotency_key: idempotencyKey });
    if (error) throw error;
    return mapPersonality(data);
  }

  async saveDerivedContext(input: DerivedContextInput) {
    const { data: { user } } = await this.db.auth.getUser();
    if (!user) throw new Error("No active session.");
    const { data, error } = await this.db.from("derived_contexts").insert({ user_id: user.id, kind: input.kind, band: input.band ?? null, starts_at: input.startsAt ?? null, expires_at: input.expiresAt, user_approved: input.userApproved }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  async listDerivedContexts() {
    const { data, error } = await this.db.from("derived_contexts").select("*").gt("expires_at", new Date().toISOString()).order("starts_at");
    if (error) throw error;
    return (data || []).map((row: any) => ({ id: row.id, kind: row.kind, band: row.band ?? undefined, startsAt: row.starts_at ?? undefined, expiresAt: row.expires_at, userApproved: row.user_approved }));
  }

  async deleteDerivedContext(id: string) { const { error } = await this.db.from("derived_contexts").delete().eq("id", id); if (error) throw error; }

  async registerDevice(input: { apnsToken: string; appVersion?: string }) {
    const { data: { user } } = await this.db.auth.getUser();
    if (!user) throw new Error("No active session.");
    const { data, error } = await this.db.from("device_installations").upsert({ user_id: user.id, platform: "ios", apns_token: input.apnsToken, app_version: input.appVersion, enabled: true, last_seen_at: new Date().toISOString() }, { onConflict: "user_id,apns_token" }).select("id").single();
    if (error) throw error;
    return data.id;
  }

  async getNotificationPreferences(): Promise<NotificationPreferences | null> {
    const { data, error } = await this.db.from("notification_preferences").select("*").maybeSingle();
    if (error) throw error;
    return data ? { dailyPromptEnabled: data.daily_prompt_enabled, bloomEnabled: data.bloom_enabled, calendarEncouragementEnabled: data.calendar_encouragement_enabled, dailyWindowStart: data.daily_window_start, dailyWindowEnd: data.daily_window_end, quietHoursStart: data.quiet_hours_start, quietHoursEnd: data.quiet_hours_end, timezone: data.timezone } : null;
  }

  async saveNotificationPreferences(input: NotificationPreferences) {
    const { data: { user } } = await this.db.auth.getUser();
    if (!user) throw new Error("No active session.");
    const { error } = await this.db.from("notification_preferences").upsert({ user_id: user.id, daily_prompt_enabled: input.dailyPromptEnabled, bloom_enabled: input.bloomEnabled, calendar_encouragement_enabled: input.calendarEncouragementEnabled, daily_window_start: input.dailyWindowStart, daily_window_end: input.dailyWindowEnd, quiet_hours_start: input.quietHoursStart, quiet_hours_end: input.quietHoursEnd, timezone: input.timezone, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async listSeeds(): Promise<BackendSeed[]> {
    if (!this.configured) return [];
    const { data, error } = await this.db.from("memory_seeds").select("*").order("created_at");
    if (error) throw error;
    return data.map((r: any) => ({ id: r.id, observationId: r.observation_id, plantedAt: r.planted_at, harvestedAt: r.harvested_at, stage: getSeedStage(r.planted_at) }));
  }

  async listInventory(): Promise<string[]> {
    if (!this.configured) return [];
    const { data, error } = await this.db.from("user_inventory").select("item_id");
    if (error) throw error;
    return data.map((row: any) => row.item_id);
  }

  async listGardenPlacements(): Promise<BackendGardenPlacement[]> {
    if (!this.configured) return [];
    const { data, error } = await this.db.from("garden_placements").select("*, memory_seeds(observation_id)");
    if (error) throw error;
    return data.map((row: any) => ({ id: row.id, itemId: row.seed_id ? row.memory_seeds.observation_id : row.catalog_item_id, kind: row.seed_id ? "flower" : "decor", x: row.x, y: row.y, zIndex: row.z_index }));
  }

  async plantSeed(seedId: string) {
    const { data, error } = await this.db.rpc("plant_seed", { p_seed_id: seedId });
    if (error) throw error;
    return data as string;
  }

  async harvestSeed(seedId: string) {
    const { data, error } = await this.db.rpc("harvest_seed", { p_seed_id: seedId });
    if (error) throw error;
    return data as number;
  }

  async purchaseItem(itemId: string) {
    const { data, error } = await this.db.rpc("purchase_item", { p_item_id: itemId });
    if (error) throw error;
    return data as number;
  }

  async equipItem(category: "outfit" | "face" | "backdrop", itemId: string) {
    const field = category === "outfit" ? "equipped_outfit" : category === "face" ? "equipped_face" : "equipped_backdrop";
    const { data: { user } } = await this.db.auth.getUser();
    if (!user) throw new Error("No active session.");
    const { error } = await this.db.from("profiles").update({ [field]: itemId, updated_at: new Date().toISOString() }).eq("id", user.id);
    if (error) throw error;
  }

  async saveGardenPlacement(input: { id?: string; seedId?: string; catalogItemId?: string; x: number; y: number; zIndex?: number }) {
    const { data: { user } } = await this.db.auth.getUser();
    if (!user) throw new Error("No active session.");
    const record = { user_id: user.id, seed_id: input.seedId ?? null, catalog_item_id: input.catalogItemId ?? null, x: input.x, y: input.y, z_index: input.zIndex ?? 0, updated_at: new Date().toISOString() };
    const query = input.id ? this.db.from("garden_placements").update(record).eq("id", input.id) : this.db.from("garden_placements").insert(record);
    const { data, error } = await query.select("id").single();
    if (error) throw error;
    return data.id;
  }

  async removeGardenPlacement(id: string) { const { error } = await this.db.from("garden_placements").delete().eq("id", id); if (error) throw error; }
  async listCapsules(): Promise<WeeklyCapsule[]> {
    if (!this.configured) return [];
    const { data, error } = await this.db.rpc("ensure_weekly_capsules");
    if (error) throw error;
    return (data || []).map((row: any) => ({ id: row.id, periodStart: row.period_start, periodEnd: row.period_end, createdAt: row.created_at }));
  }
  async createMediaUrl(path: string) { const { data, error } = await this.db.storage.from("observation-media").createSignedUrl(path, 300); if (error) throw error; return data.signedUrl; }

  async exportAccount() {
    const tables = ["profiles", "observations", "observation_media", "observation_classifications", "classification_feedback", "user_interest_signals", "bean_personality_state", "bean_personality_events", "bean_mood_state", "derived_contexts", "device_installations", "notification_preferences", "notification_deliveries", "memory_seeds", "garden_placements", "user_inventory", "token_ledger", "capsules"];
    const result: Record<string, unknown> = { exportedAt: new Date().toISOString() };
    for (const table of tables) { const response = await this.db.from(table).select("*"); if (response.error) throw response.error; result[table] = response.data; }
    return result;
  }

  async deleteAccount() {
    const { error } = await this.db.functions.invoke("delete-account");
    if (error) throw error;
    await this.db.auth.signOut();
  }

  async resetProgressForTesting() {
    if (!this.configured) return;
    const { error } = await this.db.rpc("reset_own_progress");
    if (error) throw error;
  }
}

export const backend = new SupabaseBeanBackend();
