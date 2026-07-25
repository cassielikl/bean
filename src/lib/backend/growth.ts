import type { SeedStage } from "./types";

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || "") as string;
const localBackend = !supabaseUrl || /localhost|127\.0\.0\.1/.test(supabaseUrl);
const development = import.meta.env.DEV && (localBackend || import.meta.env.VITE_BEAN_GROWTH_MODE === "development");

export const GROWTH_TIMING = development
  ? { sproutMs: 10_000, bloomMs: 30_000 }
  : { sproutMs: 2 * 60 * 60 * 1000, bloomMs: 5 * 60 * 60 * 1000 };

export function getSeedStage(plantedAt: string | null, now = Date.now()): SeedStage {
  if (!plantedAt) return "unplanted";
  const age = now - new Date(plantedAt).getTime();
  if (age >= GROWTH_TIMING.bloomMs) return "bloomed";
  if (age >= GROWTH_TIMING.sproutMs) return "sprout";
  return "planted";
}
