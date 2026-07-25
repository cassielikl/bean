import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }),
);

const client = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY);
const check = (condition, message) => { if (!condition) throw new Error(message); };

const signedIn = await client.auth.signInAnonymously();
if (signedIn.error) throw signedIn.error;
check(signedIn.data.user?.is_anonymous, "Expected an anonymous test user");

const profile = await client.from("profiles").select("tokens,onboarding_screen").single();
if (profile.error) throw profile.error;
check(profile.data.tokens === 10, "New profile should start with 10 tokens");

const inventory = await client.from("user_inventory").select("item_id");
if (inventory.error) throw inventory.error;
check(inventory.data.length === 3, "New account should receive three starter items");
check(!inventory.data.some((item) => item.item_id === "lamp"), "Mushroom/lamp should not be a starter decor item");

const themes = await client.from("theme_catalog").select("id");
if (themes.error) throw themes.error;
check(themes.data.length === 9, "Theme taxonomy should include nine primary themes");

const notificationPrefs = await client.from("notification_preferences").select("daily_prompt_enabled,bloom_enabled,calendar_encouragement_enabled").single();
if (notificationPrefs.error) throw notificationPrefs.error;
check(notificationPrefs.data.daily_prompt_enabled === false && notificationPrefs.data.bloom_enabled === false && notificationPrefs.data.calendar_encouragement_enabled === false, "Notifications should default to off");

const today = new Date().toISOString().slice(0, 10);
const quest = await client.rpc("get_daily_quest", { p_local_date: today });
if (quest.error) throw quest.error;
check(quest.data.length === 1, "Expected one daily quest");

const observationId = crypto.randomUUID();
const submitted = await client.rpc("submit_observation", {
  p_client_request_id: observationId,
  p_source: "daily",
  p_prompt: quest.data[0].prompt,
  p_body: "Backend integration test",
  p_category: quest.data[0].category,
  p_emoji: quest.data[0].emoji,
  p_assignment_id: quest.data[0].assignment_id,
});
if (submitted.error) throw submitted.error;
check(submitted.data.length === 1, "Observation should create one memory seed");

const classified = await client.rpc("apply_observation_classification", {
  p_observation_id: submitted.data[0].observation_id,
  p_primary_theme_id: "nature",
  p_secondary_tags: ["weather"],
  p_sensory_channel: "visual",
  p_tone: "positive",
  p_confidence: 0.9,
  p_provenance: "keyword_fallback",
  p_model_version: "test",
});
if (classified.error) throw classified.error;
check(classified.data[0].flower_species_id === "daisy", "Nature observations should map to Daisy");

const seedId = submitted.data[0].seed_id;
const planted = await client.rpc("plant_seed", { p_seed_id: seedId });
if (planted.error) throw planted.error;

const placement = await client.from("garden_placements").insert({
  user_id: signedIn.data.user.id,
  seed_id: seedId,
  x: 0.5,
  y: 0.6,
}).select("id").single();
if (placement.error) throw placement.error;

const purchased = await client.rpc("purchase_item", { p_item_id: "cape" });
if (purchased.error) throw purchased.error;
check(purchased.data === 4, "Cape purchase should leave four tokens");

const reset = await client.rpc("reset_own_progress");
if (reset.error) throw reset.error;
const resetProfile = await client.from("profiles").select("tokens,onboarding_screen,tutorial_step").single();
if (resetProfile.error) throw resetProfile.error;
check(resetProfile.data.tokens === 10 && resetProfile.data.onboarding_screen === "o1" && resetProfile.data.tutorial_step === 0, "Testing reset should restore onboarding defaults");
const resetObservations = await client.from("observations").select("id", { count: "exact", head: true });
if (resetObservations.error) throw resetObservations.error;
check(resetObservations.count === 0, "Testing reset should remove observations");

const deleted = await client.functions.invoke("delete-account");
if (deleted.error) throw deleted.error;

console.log("Bean backend integration test passed.");
