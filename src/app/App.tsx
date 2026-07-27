import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";

// ─── Figma screen imports ─────────────────────────────────────────────────────
import FirstFrameImport from "@/imports/FirstFrame";
import SecondFrameImport from "@/imports/2ndFrame";
import ThirdFrameImport from "@/imports/3rdFrame";
import HomeImport, { PodDefaultBackdrop } from "@/imports/Home";
import HomeIntroImport from "@/imports/HomeIntro";
import NameImport from "@/imports/Name";
import FirstQuestImport from "@/imports/FirstQuest";
import CompleteFirstImport from "@/imports/CompleteFirst";
import { backend, getSeedStage } from "@/lib/backend";
import type { ObservationSource, BeanMoodState, BeanPersonalityState, UserInterestSignal, DailyQuest } from "@/lib/backend";
import { connectCalendar, connectHealth, connectNotifications, disconnectDeviceContext, scheduleLocalContextMessage } from "@/lib/native/deviceContext";

// ─── Figma icon / character imports ──────────────────────────────────────────
import FigmaBeanBody from "@/imports/Group37-1"; // exact pink Bean (same shape as home screen)
import questHomeFrame from "@/assets/quest-figma/quest-home.png";
import questInputFrame from "@/assets/quest-figma/quest-input.png";
import questCloudBackground from "@/assets/quest-figma/quest-cloud-background.png";
import questDailyRewardFrame from "@/assets/quest-figma/quest-daily-reward.png";
import questCompleteFrame from "@/assets/quest-figma/quest-complete.png";
import questBonusInputFrame from "@/assets/quest-figma/quest-bonus-input.png";
import questBonusRewardFrame from "@/assets/quest-figma/quest-bonus-reward.png";
import gardenHomeFrame from "@/assets/garden/garden-home.png";
import capsuleHomeFrame from "@/assets/capsule/capsule-home.png";
import capsuleNavFrame from "@/assets/capsule/capsule-nav.png";
import capsuleRewind1 from "@/assets/capsule/rewind-1.png";
import capsuleRewind2 from "@/assets/capsule/rewind-2.png";
import capsuleRewind3 from "@/assets/capsule/rewind-3.png";
import capsuleRewind4 from "@/assets/capsule/rewind-4.png";
import capsuleRewind5 from "@/assets/capsule/rewind-5.png";
import storeHat from "@/assets/store/hat.png";
import storeCrown from "@/assets/store/crown.png";
import storeBow from "@/assets/store/bow.png";
import storeMustache from "@/assets/store/mustache.png";
import storeBlush from "@/assets/store/blush.png";
import storeHeartGlasses from "@/assets/store/heart-glasses.png";
import storeCatEars from "@/assets/store/cat-ears.png";
import storeBearEars from "@/assets/store/bear-ears.png";
import storeBunnyEars from "@/assets/store/bunny-ears.png";
import storeFlowerClip from "@/assets/store/flower-clip.png";
import storeMushroomHouse from "@/assets/store/mushroom-house.png";
import storeStump from "@/assets/store/stump.png";
import storeSnail from "@/assets/store/snail.png";
import storeFence from "@/assets/store/fence.png";
import storeGnome from "@/assets/store/gnome.png";
import storeBird from "@/assets/store/bird.png";
import storeBush from "@/assets/store/bush.png";
import storeWateringCan from "@/assets/store/watering-can.png";
import storeCoin from "@/assets/store/coin.png";
import flowerDaisy from "@/assets/garden/flowers/Group 53.png";
import flowerTulip from "@/assets/garden/flowers/Group 54.png";
import flowerMorningGlory from "@/assets/garden/flowers/Group 56.png";
import flowerMarigold from "@/assets/garden/flowers/Group 65.png";
import flowerPeony from "@/assets/garden/flowers/Group 66.png";
import flowerBluebell from "@/assets/garden/flowers/Group 67.png";
import flowerLavender from "@/assets/garden/flowers/Group 68.png";
import flowerSunflower from "@/assets/garden/flowers/Group 69.png";
import flowerIris from "@/assets/garden/flowers/Group 70.png";
import NavQuestIcon from "@/imports/Group31";    // quest paper/checklist icon
import NavHomeIcon from "@/imports/Group51";     // house icon
import NavBeanIcon from "@/imports/Group32";     // golden yellow bean face (nav right)

// ─── Scale constants ──────────────────────────────────────────────────────────
const FW = 1290;
const FH = 2796;
const SCALE = 390 / FW; // ≈ 0.3023
const fs = (n: number) => n * SCALE;

// ─── Types ────────────────────────────────────────────────────────────────────
type ScreenId =
  | "o1" | "o2" | "o3"
  | "naming" | "account" | "quest" | "qComplete"
  | "home" | "questPage" | "garden" | "store" | "profile" | "pastMoments"
  | "settings" | "beanHome";

const SCREEN_IDS = new Set<ScreenId>(["o1", "o2", "o3", "naming", "account", "quest", "qComplete", "home", "questPage", "garden", "store", "profile", "pastMoments", "settings", "beanHome"]);

interface ObservationMedia { kind: "photo" | "voice"; url: string; mimeType?: string | null }
interface Observation {
  id: string;
  prompt: string;
  text: string;
  createdAt: string;
  category: string;
  emoji: string;
  hasPhoto: boolean;
  hasVoice: boolean;
  media?: ObservationMedia[];
  flowerSpeciesId?: string;
}

interface GardenPlacement {
  id: string;
  itemId: string;
  kind: "flower" | "decor";
  slot: number;
}

interface MemorySeedRecord {
  id: string;
  observationId: string;
  plantedAt: string | null;
  harvestedAt: string | null;
}

interface AppState {
  screen: ScreenId;
  userName: string;
  beanName: string;
  seeds: number;
  tokens: number;
  gardenPhase: "empty" | "planted" | "bloomed";
  tutorialStep: number;
  questText: string;
  hasPhoto: boolean;
  hasVoice: boolean;
  storeItems: Record<string, boolean>;
  observations: Observation[];
  gardenPlacements: GardenPlacement[];
  connections: Record<"calendar" | "health" | "notifications", boolean>;
  equipped: { outfit: string; face: string; background: string };
  memorySeeds: MemorySeedRecord[];
  accountLinked: boolean;
  accountSkipped: boolean;
  syncError: string;
}

const INIT: AppState = {
  screen: "o1",
  userName: "",
  beanName: "",
  seeds: 0,
  tokens: 10,
  gardenPhase: "empty",
  tutorialStep: 0,
  questText: "",
  hasPhoto: false,
  hasVoice: false,
  storeItems: { hat: true, meadow: true },
  observations: [],
  gardenPlacements: [],
  connections: { calendar: false, health: false, notifications: false },
  equipped: { outfit: "none", face: "none", background: "meadow" },
  memorySeeds: [],
  accountLinked: false,
  accountSkipped: false,
  syncError: "",
};

const STORAGE_KEY = "bean-figma-prototype-v1";

function readSavedState(): AppState {
  try {
    if (import.meta.env.DEV && new URLSearchParams(window.location.search).get("reset") === "1") {
      window.localStorage.removeItem(STORAGE_KEY);
      window.history.replaceState({}, "", window.location.pathname);
      return INIT;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return INIT;
    const parsed = JSON.parse(saved);
    const migratedObservations: Observation[] = parsed.observations?.length ? parsed.observations : parsed.questText ? [{
      id: "legacy-first-memory",
      prompt: "What’s something about your current physical environment that you appreciate?",
      text: parsed.questText,
      createdAt: new Date().toISOString(),
      category: "Moment",
      emoji: "✨",
      hasPhoto: !!parsed.hasPhoto,
      hasVoice: !!parsed.hasVoice,
    }] : [];
    const migratedPlacements: GardenPlacement[] = parsed.gardenPlacements?.length ? parsed.gardenPlacements : parsed.gardenPhase === "bloomed" && migratedObservations[0] ? [{ id: "legacy-flower", itemId: migratedObservations[0].id, kind: "flower", slot: 0 }] : [];
    const migratedSeeds: MemorySeedRecord[] = parsed.memorySeeds?.length ? parsed.memorySeeds : migratedObservations.map((observation, index) => ({
      id: `legacy-seed-${observation.id}`,
      observationId: observation.id,
      plantedAt: index < migratedPlacements.length ? new Date().toISOString() : null,
      harvestedAt: index < migratedPlacements.length ? new Date().toISOString() : null,
    }));
    return {
      ...INIT,
      ...parsed,
      observations: migratedObservations,
      gardenPlacements: migratedPlacements,
      connections: { ...INIT.connections, ...parsed.connections },
      equipped: { ...INIT.equipped, ...parsed.equipped },
      memorySeeds: migratedSeeds,
    };
  } catch {
    return INIT;
  }
}

function makeObservation(prompt: string, text: string, hasPhoto = false, hasVoice = false): Observation {
  const lower = `${prompt} ${text}`.toLowerCase();
  const category = lower.includes("sound") ? "Sound" : lower.includes("color") ? "Color" : lower.includes("light") ? "Light" : "Moment";
  const emoji = category === "Sound" ? "🎵" : category === "Color" ? "🎨" : category === "Light" ? "☀️" : "✨";
  return { id: crypto.randomUUID(), prompt, text, createdAt: new Date().toISOString(), category, emoji, hasPhoto, hasVoice };
}

function useDeviceScale() {
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));

  useEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return Math.min(1, viewport.width / 390, viewport.height / 844);
}

const CTA_YELLOW = "#FEB700";
const BLUE_TEXT = "#266da9";

function readableError(reason: unknown, fallback: string) {
  if (reason instanceof Error && reason.message.trim()) return reason.message;
  if (typeof reason === "string" && reason.trim()) return reason;
  if (reason && typeof reason === "object") {
    const record = reason as Record<string, unknown>;
    for (const candidate of [record.message, record.error_description, record.msg, record.code]) {
      if (typeof candidate === "string" && candidate.trim() && candidate !== "{}") return candidate;
    }
  }
  return fallback;
}

function BeanOutfitOverlay({ itemId, size = 54 }: { itemId: string; size?: number }) {
  const item = ITEMS.find((candidate) => candidate.id === itemId && candidate.cat === "outfit");
  if (!item) return null;
  const placement: Record<string, React.CSSProperties> = {
    hat: { top: "-20%", left: "50%", transform: "translateX(-50%)" },
    crown: { top: "-13%", left: "50%", transform: "translateX(-50%)" },
    bow: { top: "-7%", left: "68%", transform: "translateX(-50%) rotate(5deg)" },
    mustache: { top: "53%", left: "50%", transform: "translateX(-50%)" },
    blush: { top: "47%", left: "50%", transform: "translateX(-50%)" },
    heartGlasses: { top: "42%", left: "50%", transform: "translateX(-50%)" },
    catEars: { top: "-6%", left: "50%", transform: "translateX(-50%)" },
    bearEars: { top: "-4%", left: "50%", transform: "translateX(-50%)" },
    bunnyEars: { top: "-25%", left: "50%", transform: "translateX(-50%)" },
    flowerClip: { top: "12%", left: "16%", transform: "translateX(-50%)" },
  };
  return <span aria-hidden style={{ position: "absolute", zIndex: 3, width: size * 2.1, height: size, lineHeight: 1, filter: "drop-shadow(0 4px 4px rgba(42,34,20,.2))", pointerEvents: "none", ...placement[item.id] }}><StoreItemArt itemId={item.id} size={size} /></span>;
}

function HomeStyleBean({ size = 130, outfitId = "none", faceId = "none", float = true }: { size?: number; outfitId?: string; faceId?: string; float?: boolean }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      style={{ position: "relative", width: size, height: size * .84, transformOrigin: "50% 88%" }}
      animate={reduceMotion || !float ? undefined : {
        y: [0, -5, 2, -3, 0],
        rotate: [0, -2, 1.5, -.8, 0],
        scaleX: [1, .93, 1.05, .97, 1],
        scaleY: [1, 1.07, .92, 1.04, 1],
      }}
      transition={reduceMotion || !float ? undefined : { repeat: Infinity, duration: 5.8, times: [0, .24, .47, .72, 1], ease: "easeInOut" }}
    >
      <FigmaBeanBody />
      <BeanOutfitOverlay itemId={outfitId} size={size * .28} />
      <BeanOutfitOverlay itemId={faceId} size={size * .28} />
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATED BEAN — faithful to Group37 / Name-1 Figma, with eye tracking + blink
// ══════════════════════════════════════════════════════════════════════════════
function AnimatedBean({
  size = 130,
  float = true,
  expression = "happy",
  onClick,
}: {
  size?: number;
  float?: boolean;
  expression?: "happy" | "excited" | "curious" | "wondering";
  onClick?: () => void;
}) {
  const [eyeOff, setEyeOff] = useState({ x: 0, y: 0 });
  const [blink, setBlink] = useState(false);
  const [sparkle, setSparkle] = useState(false);

  // Randomise eye direction every 2–4 s
  useEffect(() => {
    const id = setInterval(() => {
      setEyeOff({ x: (Math.random() - 0.5) * 20, y: (Math.random() - 0.5) * 8 });
    }, 2000 + Math.random() * 2000);
    return () => clearInterval(id);
  }, []);

  // Blink every 3–6 s
  useEffect(() => {
    const id = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 140);
    }, 3000 + Math.random() * 3000);
    return () => clearInterval(id);
  }, []);

  const W = size;
  const H = size * 0.88;

  // Smile path by expression
  // Tiny, subtle smile matching the Figma Group37 closeup
  const smilePath =
    expression === "excited"
      ? "M100 115 Q117 126 134 115"
      : expression === "curious"
      ? "M103 114 Q117 120 131 114"
      : "M102 114 Q117 122 132 114";

  return (
    <motion.div
      style={{ width: W, height: H, cursor: onClick ? "pointer" : "default", position: "relative" }}
      animate={float ? { y: [0, -9, 0] } : {}}
      transition={float ? { repeat: Infinity, duration: 2.9, ease: "easeInOut" } : {}}
      whileHover={{ scale: 1.07 }}
      whileTap={{ scale: 0.91 }}
      onClick={() => { setSparkle(true); setTimeout(() => setSparkle(false), 600); onClick?.(); }}
    >
      <svg width={W} height={H} viewBox="0 0 240 212" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="bean-grad" x1="86" x2="84" y1="8" y2="192" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F24DD6" />
            <stop offset="0.288" stopColor="#F28BDD" />
            <stop offset="0.659" stopColor="#F2B3EF" />
            <stop offset="1" stopColor="#C1AAE0" stopOpacity="0.55" />
          </linearGradient>
          <filter id="bean-sh" x="-25%" y="-25%" width="150%" height="160%">
            <feDropShadow dx="-4" dy="6" stdDeviation="7.5" floodOpacity="0.1" />
            <feDropShadow dx="-16" dy="22" stdDeviation="13.5" floodOpacity="0.09" />
            <feDropShadow dx="-36" dy="50" stdDeviation="18.5" floodOpacity="0.05" />
          </filter>
          {/* Clip path — sheens stay inside the blob */}
          <clipPath id="bean-clip">
            <path d="M 26 150 C 12 124 11 95 20 72 C 32 42 60 20 98 14 C 128 9 163 16 190 37 C 213 54 226 83 222 112 C 217 142 199 164 170 176 C 149 185 124 187 100 183 C 68 177 40 172 26 150 Z" />
          </clipPath>
        </defs>

        {/* Body */}
        <g filter="url(#bean-sh)">
          <path
            d="M 26 150 C 12 124 11 95 20 72 C 32 42 60 20 98 14 C 128 9 163 16 190 37 C 213 54 226 83 222 112 C 217 142 199 164 170 176 C 149 185 124 187 100 183 C 68 177 40 172 26 150 Z"
            fill="url(#bean-grad)"
          />
        </g>

        {/* Sheens — clipped so they never spill outside the blob */}
        <g clipPath="url(#bean-clip)">
          <ellipse cx="166" cy="40" rx="20" ry="12" fill="white" opacity="0.56"
            transform="rotate(-30,166,40)" style={{ filter: "blur(3px)" }} />
          <ellipse cx="182" cy="62" rx="10" ry="6" fill="white" opacity="0.4"
            transform="rotate(-22,182,62)" style={{ filter: "blur(2px)" }} />
        </g>

        {/* LEFT EYE */}
        <motion.ellipse
          cx={85 + eyeOff.x}
          cy={96 + eyeOff.y}
          rx="6" ry={blink ? 0.5 : 6.5}
          fill="#111"
          animate={{ cx: 85 + eyeOff.x, cy: 96 + eyeOff.y, ry: blink ? 0.5 : 6.5 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        />
        {/* RIGHT EYE */}
        <motion.ellipse
          cx={150 + eyeOff.x}
          cy={96 + eyeOff.y}
          rx="6" ry={blink ? 0.5 : 6.5}
          fill="#111"
          animate={{ cx: 150 + eyeOff.x, cy: 96 + eyeOff.y, ry: blink ? 0.5 : 6.5 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
        />

        {/* Smile — small and subtle, matching the Figma closeup */}
        <path d={smilePath} stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />

        {/* Sparkle on tap */}
        {sparkle && (
          <>
            <motion.path d="M200 20l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#FEB700"
              initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 0.5 }} />
            <motion.path d="M20 50l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#FEB700"
              initial={{ scale: 0, opacity: 1 }} animate={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }} />
          </>
        )}
      </svg>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SKY + CLOUD BACKGROUND — matches Name-1 Figma visual style
// Blue gradient sky → white cloud swoosh → white content area
// ══════════════════════════════════════════════════════════════════════════════
function SkyCloudBg({ skyH = 235 }: { skyH?: number }) {
  return (
    <>
      {/* Sky gradient */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: skyH,
        background: "linear-gradient(to bottom, #0b5c87 0%, #3889b5 48%, #7ab8d9 100%)",
      }} />

      {/* Cloud 1 — left side, drifts slowly right */}
      <motion.div
        style={{ position: "absolute", top: "7%", opacity: 0.78 }}
        animate={{ x: [0, 18, 0] }}
        transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
      >
        <div style={{ position: "relative", width: 88, height: 36, background: "white", borderRadius: "50%", left: "5%" }}>
          <div style={{ position: "absolute", top: -15, left: 10, width: 52, height: 40, background: "white", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: -7, left: 50, width: 36, height: 32, background: "white", borderRadius: "50%" }} />
        </div>
      </motion.div>
      {/* Cloud 2 — right side, drifts slowly left */}
      <motion.div
        style={{ position: "absolute", top: "5%", left: "58%", opacity: 0.55 }}
        animate={{ x: [0, -14, 0] }}
        transition={{ repeat: Infinity, duration: 9, ease: "easeInOut", delay: 2 }}
      >
        <div style={{ position: "relative", width: 60, height: 26, background: "white", borderRadius: "50%" }}>
          <div style={{ position: "absolute", top: -10, left: 8, width: 34, height: 28, background: "white", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: -5, left: 34, width: 24, height: 22, background: "white", borderRadius: "50%" }} />
        </div>
      </motion.div>

      {/* Settings gear (top left, faint) */}
      <div style={{ position: "absolute", top: 18, left: 18, opacity: 0.4 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="3" stroke="white" strokeWidth="2" />
          <path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"
            stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </div>

      {/* White cloud swoosh boundary — matches Name-1's large white Union shape */}
      <svg
        style={{ position: "absolute", top: skyH - 60, left: 0, width: "100%", height: 85, display: "block" }}
        viewBox="0 0 390 85"
        preserveAspectRatio="none"
      >
        <path
          d="M-5 85 L-5 52 C 8 42, 28 24, 55 28 C 75 31, 90 14, 118 17 C 140 20, 152 36, 172 36 C 192 36, 208 16, 234 20 C 255 24, 268 38, 290 38 C 312 38, 332 20, 358 24 C 376 27, 390 40, 400 48 L 400 85 Z"
          fill="white"
        />
      </svg>

      {/* Solid white content fill below cloud */}
      <div style={{ position: "absolute", top: skyH + 20, left: 0, right: 0, bottom: 0, background: "white" }} />
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UNIVERSAL BOTTOM NAV — illustrated style matching the Figma home screen
// ══════════════════════════════════════════════════════════════════════════════
function AppNavBar({
  active,
  onNav,
  tutHighlight,
}: {
  active: ScreenId;
  onNav: (s: ScreenId) => void;
  tutHighlight?: "questPage" | "profile";
}) {
  // White circle with inset shadow — matches Figma home nav circle style
  const circleStyle = (isActive: boolean): React.CSSProperties => ({
    width: 56, height: 56, borderRadius: "50%", border: "none", cursor: "pointer",
    background: "white",
    boxShadow: isActive
      ? "inset 0px 4px 6px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)"
      : "inset 0px 3px 5px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.06)",
    display: "flex", alignItems: "center", justifyContent: "center", position: "relative",
  });

  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
      background: "white",
      borderTop: "1px solid rgba(0,0,0,0.05)",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      paddingBottom: 8,
      zIndex: 60,
      borderRadius: "0 0 40px 40px",
    }}>

      {/* QUEST — exact Figma Group31 import */}
      <motion.button aria-label="Quests" onClick={() => onNav("questPage")} whileTap={{ scale: 0.88 }} style={circleStyle(active === "questPage")}>
        {tutHighlight === "questPage" && (
          <motion.div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "3px solid #FEB700" }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.18, 0.9] }}
            transition={{ repeat: Infinity, duration: 1.2 }} />
        )}
        <div style={{ width: 32, height: 36, position: "relative" }}>
          <NavQuestIcon />
        </div>
      </motion.button>

      {/* HOME — exact Figma Group51 import */}
      <motion.button aria-label="Home" onClick={() => onNav("home")} whileTap={{ scale: 0.88 }}
        style={{
          width: 60, height: 60, borderRadius: "50%", border: "none", cursor: "pointer",
          background: "white",
          boxShadow: "inset 0px 4px 6px rgba(0,0,0,0.15), 0 3px 12px rgba(0,0,0,0.08)",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden",
        }}>
        <div style={{ width: 38, height: 39, position: "relative" }}>
          <NavHomeIcon />
        </div>
      </motion.button>

      {/* BEAN PROFILE — exact Figma Group32 import (golden yellow bean face) */}
      <motion.button aria-label="Bean profile" onClick={() => onNav("profile")} whileTap={{ scale: 0.88 }} style={circleStyle(active === "profile")}>
        {tutHighlight === "profile" && (
          <motion.div style={{ position: "absolute", inset: -6, borderRadius: "50%", border: "3px solid #FEB700" }}
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.9, 1.18, 0.9] }}
            transition={{ repeat: Infinity, duration: 1.2 }} />
        )}
        {/* Group32 has a negative inset; render in a slightly smaller container so it
            fills the button circle without overflowing the rounded clip. */}
        <div style={{ width: 36, height: 32, position: "relative", overflow: "visible" }}>
          <NavBeanIcon />
        </div>
      </motion.button>
    </div>
  );
}

// ─── Figma canvas wrapper ─────────────────────────────────────────────────────
function FigmaView({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 0, left: 0,
        width: FW, height: FH,
        transform: `scale(${SCALE})`,
        transformOrigin: "top left",
      }}>
        {children}
      </div>
    </div>
  );
}

function ExactQuestFrame({ src }: { src: string }) {
  return <FigmaView><img src={src} alt="" style={{ display: "block", width: FW, height: FH }} /></FigmaView>;
}

function FO({
  x, y, w, h, onClick, children, style, zIndex = 10,
}: {
  x: number; y: number; w: number; h: number;
  onClick?: () => void; children?: React.ReactNode;
  style?: React.CSSProperties; zIndex?: number;
}) {
  return (
    <div style={{
      position: "absolute", left: fs(x), top: fs(y), width: fs(w), height: fs(h),
      cursor: onClick ? "pointer" : "default", zIndex, ...style,
    }} onClick={onClick}>
      {children}
    </div>
  );
}

function FigmaInput({ x, y, w, h, value, onChange, placeholder }: {
  x: number; y: number; w: number; h: number;
  value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      style={{
        position: "absolute", left: fs(x) + fs(30), top: fs(y) + fs(14),
        width: fs(w) - fs(60), height: fs(h) - fs(28),
        background: "transparent", border: "none", outline: "none",
        fontSize: fs(40), fontFamily: "'Inter', sans-serif", fontWeight: 500,
        color: "#1a1a1a", zIndex: 10, boxSizing: "border-box",
      }}
    />
  );
}

function Screen({ children, scrollable }: { children: React.ReactNode; scrollable?: boolean }) {
  return (
    <motion.div
      className={`absolute inset-0 ${scrollable ? "overflow-y-auto" : "overflow-hidden"}`}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
    >
      {children}
    </motion.div>
  );
}

function TapHint({ label = "Tap to continue →" }: { label?: string }) {
  return (
    <motion.div
      className="absolute left-0 right-0 flex justify-center pointer-events-none"
      style={{ bottom: 88 }}
      animate={{ opacity: [0.65, 1, 0.65] }}
      transition={{ repeat: Infinity, duration: 1.8 }}
    >
      <div style={{ background: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}
        className="px-6 py-2.5 rounded-full text-white text-sm font-semibold">
        {label}
      </div>
    </motion.div>
  );
}

// ─── Tutorial overlay ─────────────────────────────────────────────────────────
const TUT_CONFIGS: Record<number, { text: string; hint: string; spotX: number; spotY: number; spotRX: number; spotRY: number; cardTop: number }> = {
  2: { text: "Find today’s quest here. Come back tomorrow for a new one, or share more with Bean now.", hint: "Tap Quest", spotX: 102, spotY: 800, spotRX: 34, spotRY: 34, cardTop: 125 },
  4: { text: "See what Bean is learning about you.", hint: "Tap Bean’s profile", spotX: 301, spotY: 802, spotRX: 34, spotRY: 34, cardTop: 125 },
  6: { text: "Your first memory became a seed.", hint: "Tap Bean’s Garden", spotX: 304, spotY: 448, spotRX: 48, spotRY: 48, cardTop: 120 },
  17: { text: "Your new item is waiting in Bean’s pod.", hint: "Tap Bean’s pod", spotX: 92, spotY: 443, spotRX: 76, spotRY: 112, cardTop: 115 },
  19: { text: "Revisit the moments you’ve shared with Bean.", hint: "Tap the Capsule", spotX: 350, spotY: 154, spotRX: 30, spotRY: 30, cardTop: 305 },
};

function TutorialOverlay({ step }: { step: number }) {
  const cfg = TUT_CONFIGS[step];
  if (!cfg) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, pointerEvents: "none" }}>
      <svg style={{ position: "absolute", inset: 0, pointerEvents: "none" }} width="390" height="844">
        <defs>
          <mask id={`tm-${step}`}>
            <rect width="390" height="844" fill="white" />
            <ellipse cx={cfg.spotX} cy={cfg.spotY} rx={cfg.spotRX} ry={cfg.spotRY} fill="black" />
          </mask>
        </defs>
        <rect width="390" height="844" fill="rgba(0,0,0,0.52)" mask={`url(#tm-${step})`} />
        <motion.ellipse cx={cfg.spotX} cy={cfg.spotY} rx={cfg.spotRX} ry={cfg.spotRY}
          fill="none" stroke="#FEB700" strokeWidth="3"
          animate={{ opacity: [1, 0.55, 1] }}
          transition={{ repeat: Infinity, duration: 1.3 }} />
      </svg>
      <motion.div style={{
        position: "absolute",
        left: 55,          // (390 - 280) / 2 = 55px, keeps popup fully within frame
        top: cfg.cardTop,
        width: 280,
        pointerEvents: "none",
      }}
        initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}>
        <div style={{
          background: "rgba(255,255,255,.4)", backdropFilter: "blur(5px)", border: "1px solid rgba(255,255,255,.55)", borderRadius: 24, padding: "16px 18px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.12)", textAlign: "center",
        }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: "#1a2a3a", marginBottom: 6, lineHeight: 1.4 }}>{cfg.text}</p>
          <p style={{ fontSize: 12, color: CTA_YELLOW, fontWeight: 600 }}>{cfg.hint}</p>
        </div>
      </motion.div>
    </div>
  );
}

function WelcomeOverlay({ onNext }: { onNext: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40 }} onClick={onNext}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.12)" }} />
      <motion.div style={{ position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)" }}
        animate={{ opacity: [0.7, 1, 0.7] }} transition={{ repeat: Infinity, duration: 1.8 }}>
        <div style={{
          background: CTA_YELLOW, borderRadius: 100, padding: "10px 28px",
          color: "white", fontWeight: 700, fontSize: 15, boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}>Let&apos;s go! →</div>
      </motion.div>
    </div>
  );
}

function OnboardingCompleteOverlay({ onDone }: { onDone: () => void }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50, background: "rgba(21,42,54,.32)", display: "grid", placeItems: "center", padding: 38 }}>
      <motion.div initial={{ opacity: 0, scale: .88, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} style={{ width: "100%", padding: "24px 22px 20px", borderRadius: 28, background: "rgba(255,255,255,.92)", textAlign: "center", boxShadow: "0 16px 45px rgba(20,49,59,.25)" }}>
        <h2 style={{ margin: 0, color: "#2f83aa", fontSize: 24, fontWeight: 900 }}>That’s the basics!</h2>
        <p style={{ margin: "13px 0 20px", color: "#344b55", fontSize: 14, lineHeight: 1.5, fontWeight: 650 }}>Come back and share little moments from your day. Every noticing helps Bean learn, grow, and make your garden bloom.</p>
        <button onClick={onDone} style={{ border: 0, borderRadius: 100, background: CTA_YELLOW, color: "white", padding: "11px 25px", fontSize: 14, fontWeight: 850, cursor: "pointer" }}>Start exploring</button>
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ONBOARDING SCREENS (Figma frames + tap overlay)
// ══════════════════════════════════════════════════════════════════════════════
function Onboarding1({ onNext }: { onNext: () => void }) {
  return (
    <Screen>
      <FigmaView><FirstFrameImport /></FigmaView>
      <div style={{ position: "absolute", inset: 0 }} onClick={onNext} />
      <TapHint />
    </Screen>
  );
}
function Onboarding2({ onNext }: { onNext: () => void }) {
  return (
    <Screen>
      <FigmaView><SecondFrameImport /></FigmaView>
      <div style={{ position: "absolute", inset: 0 }} onClick={onNext} />
      <TapHint />
    </Screen>
  );
}
function Onboarding3({ onNext }: { onNext: () => void }) {
  return (
    <Screen>
      <FigmaView><ThirdFrameImport /></FigmaView>
      <div style={{ position: "absolute", inset: 0 }} onClick={onNext} />
      <TapHint label="Meet Bean →" />
    </Screen>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// NAMING SCREEN (Figma frame + transparent inputs)
// ══════════════════════════════════════════════════════════════════════════════
function NamingScreen({ state, setState, onNext }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNext: () => void;
}) {
  const ready = state.userName.trim().length > 0 && state.beanName.trim().length > 0;
  return (
    <Screen>
      <FigmaView><NameImport /></FigmaView>
      <FigmaInput x={288} y={1898} w={762} h={82}
        value={state.userName} onChange={(v) => setState((s) => ({ ...s, userName: v }))} placeholder="Your name…" />
      <FigmaInput x={288} y={2130} w={762} h={82}
        value={state.beanName} onChange={(v) => setState((s) => ({ ...s, beanName: v }))} placeholder="Bean's Earth name…" />
      <FO x={393} y={2432} w={533} h={167} onClick={ready ? onNext : undefined}
        style={{ opacity: ready ? 1 : 0.45 }} />
    </Screen>
  );
}

// ─── Account step: appears after naming, before the first quest ──────────────
function AccountScreen({ state, setState, onContinue }: {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  onContinue: () => void;
}) {
  const channel = "email" as const;
  const [value, setValue] = useState("");
  const [stage, setStage] = useState<"details" | "sent">("details");
  const [mode, setMode] = useState<"link" | "signin">("link");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const normalized = value.trim().toLowerCase();
  const valid = /^\S+@\S+\.\S+$/.test(normalized);

  const sendCode = async () => {
    if (!valid) return;
    setBusy(true); setError("");
    try {
      if (backend.configured) await backend.requestOtp(channel, normalized, mode);
      setStage("sent");
    } catch (reason) {
      setError(readableError(reason, "Bean couldn't send that email link. Please try again."));
    } finally { setBusy(false); }
  };

  const confirmReturn = async () => {
    setBusy(true); setError("");
    try {
      const profile = backend.configured ? await backend.bootstrap() : null;
      if (!backend.configured || (profile && !profile.isAnonymous)) {
        setState((s) => ({ ...s, accountLinked: true, accountSkipped: false }));
        onContinue();
      } else {
        setError("We’re still waiting for the email link. Open it, then come back here.");
      }
    } catch (reason) {
      setError(readableError(reason, "Bean couldn’t confirm the link yet. Please open the email link and try again."));
    } finally { setBusy(false); }
  };

  const skip = () => {
    setState((s) => ({ ...s, accountSkipped: true }));
    onContinue();
  };

  return (
    <Screen>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#74cefe", fontFamily: "'Inter',sans-serif", padding: "28px 24px" }}>
        <img src={questCloudBackground} aria-hidden="true" alt="" style={{ position: "absolute", left: 0, top: 72, width: "100%", height: "calc(100% - 72px)", objectFit: "cover", objectPosition: "top center", pointerEvents: "none" }} />
        <div aria-hidden="true" style={{ position: "relative", height: 155 }} />
        <div style={{ position: "relative", background: "rgba(254,209,87,.20)", borderRadius: 28, padding: "22px 20px", boxShadow: "0 14px 34px rgba(35,78,92,.12)" }}>
          <div style={{ background: "rgba(255,255,255,.96)", borderRadius: 22, padding: "18px 16px" }}>
          <h1 style={{ color: BLUE_TEXT, textAlign: "center", fontSize: 23, lineHeight: 1.2, fontWeight: 900 }}>{mode === "link" ? `Keep your adventures with ${state.beanName || "Bean"} safe` : "Welcome back"}</h1>
          <p style={{ color: "#63717a", textAlign: "center", fontSize: 13, lineHeight: 1.45, margin: "8px 0 18px" }}>{mode === "link" ? "Create an account now, or keep exploring and do it later." : "Use the email already connected to your Bean account."}</p>

          {stage === "details" ? <>
            <label style={{ display: "block", color: "#44545e", fontSize: 12, fontWeight: 800, marginBottom: 6 }}>Email address</label>
            <input value={value} onChange={(e) => setValue(e.target.value)} type="email" placeholder="you@example.com" autoComplete="email" style={{ width: "100%", border: "2px solid #dbe6ea", borderRadius: 14, padding: "12px 13px", outline: "none", fontSize: 15, boxSizing: "border-box" }} />
            <motion.button whileTap={{ scale: .97 }} disabled={!valid || busy} onClick={sendCode} style={{ width: "100%", marginTop: 14, border: 0, borderRadius: 100, padding: 12, background: valid ? CTA_YELLOW : "#d8dde0", color: "white", fontWeight: 900, cursor: valid ? "pointer" : "default" }}>{busy ? "Sending…" : "Send my link"}</motion.button>
          </> : <>
            <h2 style={{ color: BLUE_TEXT, textAlign: "center", fontSize: 19, margin: "2px 0 9px" }}>Check your email</h2>
            <p style={{ color: "#52616a", fontSize: 13, lineHeight: 1.5, margin: "0 0 14px", textAlign: "center" }}>We sent a secure sign-in link to <strong>{normalized}</strong>. Tap it, then return to Bean.</p>
            <motion.button whileTap={{ scale: .97 }} disabled={busy} onClick={confirmReturn} style={{ width: "100%", border: 0, borderRadius: 100, padding: 12, background: CTA_YELLOW, color: "white", fontWeight: 900, cursor: busy ? "wait" : "pointer" }}>{busy ? "Checking…" : "I opened the link"}</motion.button>
            <button onClick={() => setStage("details")} style={{ display: "block", margin: "10px auto 0", border: 0, background: "transparent", color: BLUE_TEXT, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Use a different email</button>
            <button disabled={busy} onClick={sendCode} style={{ display: "block", margin: "6px auto 0", border: 0, background: "transparent", color: "#68767d", fontSize: 11, fontWeight: 700, cursor: busy ? "wait" : "pointer" }}>Resend link</button>
          </>}
          {error && <p role="alert" style={{ color: "#b42318", fontSize: 11, lineHeight: 1.35, marginTop: 9, textAlign: "center" }}>{error}</p>}
          {!backend.configured && stage === "sent" && <p style={{ color: "#7c6985", background: "#f5ebfa", borderRadius: 10, padding: 8, fontSize: 10, marginTop: 9, textAlign: "center" }}>Preview mode: no email was sent. Tap “I opened the link” to continue.</p>}
          <button onClick={skip} style={{ width: "100%", border: 0, background: "transparent", color: "#68767d", padding: "13px 0 0", fontWeight: 700, cursor: "pointer" }}>Not now</button>
          <button onClick={() => { setMode((current) => current === "link" ? "signin" : "link"); setStage("details"); setError(""); }} style={{ width: "100%", border: 0, background: "transparent", color: BLUE_TEXT, padding: "8px 0 0", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>{mode === "link" ? "Already have an account? Sign in" : "New here? Create an account"}</button>
          </div>
        </div>
        <p style={{ position: "relative", textAlign: "center", color: "#6e6b45", fontSize: 10, lineHeight: 1.35, marginTop: 12 }}>Without an email, progress may be lost if this browser’s data is cleared.</p>
      </div>
    </Screen>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// QUEST SCREEN (Figma frame + interactive textarea)
// ══════════════════════════════════════════════════════════════════════════════
function QuestScreen({ state, setState, onSubmit }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onSubmit: (media?: Array<{ kind: "photo" | "voice"; file: File }>) => void;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const voiceInput = useRef<HTMLInputElement>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [voiceFile, setVoiceFile] = useState<File | null>(null);
  const hasContent = state.questText.trim() || state.hasPhoto || state.hasVoice;
  return (
    <Screen>
      <ExactQuestFrame src={questInputFrame} />
      <textarea value={state.questText} onChange={(event) => setState((current) => ({ ...current, questText: event.target.value }))} placeholder="I appreciate..." autoFocus style={{ position: "absolute", left: fs(213) + fs(38), top: fs(961) + fs(38), width: fs(864) - fs(76), height: fs(942) - fs(76), resize: "none", border: 0, outline: 0, background: "white", color: "#1f2937", fontSize: fs(40), lineHeight: 1.45, zIndex: 12 }} />
      <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(event) => { const file = event.target.files?.[0] || null; setPhotoFile(file); setState((current) => ({ ...current, hasPhoto: Boolean(file) })); }} />
      <input ref={voiceInput} type="file" accept="audio/*" capture hidden onChange={(event) => { const file = event.target.files?.[0] || null; setVoiceFile(file); setState((current) => ({ ...current, hasVoice: Boolean(file) })); }} />
      <FO x={415} y={1900} w={200} h={135} onClick={() => state.hasPhoto ? (setPhotoFile(null), setState((current) => ({ ...current, hasPhoto: false }))) : photoInput.current?.click()} zIndex={14} />
      <FO x={675} y={1900} w={220} h={135} onClick={() => state.hasVoice ? (setVoiceFile(null), setState((current) => ({ ...current, hasVoice: false }))) : voiceInput.current?.click()} zIndex={14} />
      <FO x={385} y={2144} w={533} h={123} onClick={hasContent ? () => onSubmit([...(photoFile ? [{ kind: "photo" as const, file: photoFile }] : []), ...(voiceFile ? [{ kind: "voice" as const, file: voiceFile }] : [])]) : undefined} style={{ opacity: hasContent ? 1 : .45 }} zIndex={14} />
    </Screen>
  );

  /* Previous imported onboarding quest frame remains below as a fallback. */
  return (
    <Screen>
      <FigmaView><FirstQuestImport /></FigmaView>
      <textarea value={state.questText}
        onChange={(e) => setState((s) => ({ ...s, questText: e.target.value }))}
        placeholder="I appreciate…"
        style={{
          position: "absolute", left: fs(212) + fs(30), top: fs(1519),
          width: fs(864) - fs(60), height: fs(390),
          background: "white", border: "none", outline: "none", resize: "none",
          fontSize: fs(38), fontFamily: "'Inter', sans-serif", color: "#374151",
          zIndex: 10, boxSizing: "border-box", lineHeight: 1.5,
        }} />
      {(state.hasPhoto || state.hasVoice) && (
        <div style={{ position: "absolute", left: fs(220), top: fs(1950), display: "flex", gap: 6, zIndex: 10 }}>
          {state.hasPhoto && <span style={{ fontSize: 10, background: "rgba(255,139,5,0.12)", color: "#FF8B05", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>📷 Photo attached</span>}
          {state.hasVoice && <span style={{ fontSize: 10, background: "rgba(255,139,5,0.12)", color: "#FF8B05", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>🎤 Voice note attached</span>}
        </div>
      )}
      <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" hidden onChange={(event) => { const file = event.target.files?.[0] || null; setPhotoFile(file); setState((s) => ({ ...s, hasPhoto: Boolean(file) })); }} />
      <input ref={voiceInput} type="file" accept="audio/*" capture hidden onChange={(event) => { const file = event.target.files?.[0] || null; setVoiceFile(file); setState((s) => ({ ...s, hasVoice: Boolean(file) })); }} />
      <FO x={454} y={2044} w={134} h={89} onClick={() => state.hasPhoto ? (setPhotoFile(null), setState((s) => ({ ...s, hasPhoto: false }))) : photoInput.current?.click()} style={{ opacity: state.hasPhoto ? 1 : 0.7 }} />
      <FO x={717} y={2059} w={136} h={70} onClick={() => state.hasVoice ? (setVoiceFile(null), setState((s) => ({ ...s, hasVoice: false }))) : voiceInput.current?.click()} style={{ opacity: state.hasVoice ? 1 : 0.7 }} />
      <FO x={381} y={2244} w={533} h={167} onClick={hasContent ? () => onSubmit([...(photoFile ? [{ kind: "photo" as const, file: photoFile }] : []), ...(voiceFile ? [{ kind: "voice" as const, file: voiceFile }] : [])]) : undefined} style={{ opacity: hasContent ? 1 : 0.45 }} />
    </Screen>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// QUEST COMPLETE (Figma + tap to continue)
// ══════════════════════════════════════════════════════════════════════════════
function QuestCompleteScreen({ state, onContinue }: { state: AppState; onContinue: () => void }) {
  void state;
  return (
    <Screen>
      <ExactQuestFrame src={questDailyRewardFrame} />
      <div style={{ position: "absolute", inset: 0, cursor: "pointer", zIndex: 20 }} onClick={onContinue} />
    </Screen>
  );

  /* Previous imported reward frame remains below as a fallback. */
  return (
    <Screen>
      <FigmaView><CompleteFirstImport /></FigmaView>
      <div style={{ position: "absolute", inset: 0 }} onClick={onContinue} />
      <TapHint label="Continue to Home →" />
    </Screen>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HOME SCREEN (Figma + tutorial + nav overlays)
// ══════════════════════════════════════════════════════════════════════════════
function HomeScreen({ state, setState, onNav, onCreateObservation }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
  onCreateObservation: (observation: Observation, source: ObservationSource, assignmentId?: string, media?: Array<{ kind: "photo" | "voice"; file: File }>) => void;
}) {
  const tutStep = state.tutorialStep;
  const handleQuest = () => { if (tutStep === 2) setState((current) => ({ ...current, tutorialStep: 3 })); onNav("questPage"); };
  const [quickSharePrototype, setQuickSharePrototype] = useState(false);
  const handleGarden = () => { if (tutStep === 6) setState((current) => ({ ...current, tutorialStep: 7 })); onNav("garden"); };
  const handleStore = () => onNav("store");
  const handleProfile = () => { if (tutStep === 4) setState((current) => ({ ...current, tutorialStep: 5 })); onNav("profile"); };
  const handleHourglass = () => { if (tutStep === 19) setState((current) => ({ ...current, tutorialStep: 20 })); onNav("pastMoments"); };
  const handleSettings = () => onNav("settings");
  const handlePod = () => { if (tutStep === 17) setState((current) => ({ ...current, tutorialStep: 18 })); onNav("beanHome"); };
  const reduceMotion = useReducedMotion();

  const selectedBackdrop = BACKDROP_ASSETS[state.equipped.background];
  return (
    <Screen>
      <FigmaView><HomeImport backdropSrc={selectedBackdrop} /></FigmaView>

      {/* Animated cloud overlays drifting across the Figma sky area (top ~280px) */}
      {!selectedBackdrop && <>
      <motion.div
        style={{ position: "absolute", top: 42, left: 18, opacity: 0.55, pointerEvents: "none", zIndex: 5 }}
        animate={{ x: [0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
      >
        <div style={{ position: "relative", width: 72, height: 28, background: "rgba(255,255,255,0.7)", borderRadius: "50%" }}>
          <div style={{ position: "absolute", top: -12, left: 8, width: 42, height: 30, background: "rgba(255,255,255,0.7)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: -6, left: 38, width: 28, height: 24, background: "rgba(255,255,255,0.7)", borderRadius: "50%" }} />
        </div>
      </motion.div>
      <motion.div
        style={{ position: "absolute", top: 32, left: 220, opacity: 0.38, pointerEvents: "none", zIndex: 5 }}
        animate={{ x: [0, -16, 0] }}
        transition={{ repeat: Infinity, duration: 10, ease: "easeInOut", delay: 3 }}
      >
        <div style={{ position: "relative", width: 52, height: 20, background: "rgba(255,255,255,0.65)", borderRadius: "50%" }}>
          <div style={{ position: "absolute", top: -9, left: 6, width: 30, height: 22, background: "rgba(255,255,255,0.65)", borderRadius: "50%" }} />
          <div style={{ position: "absolute", top: -4, left: 28, width: 22, height: 18, background: "rgba(255,255,255,0.65)", borderRadius: "50%" }} />
        </div>
      </motion.div>
      </>}

      {/* Animated Bean — renders the EXACT Figma Group37-1 shape (same as Group14 in
          the home frame) at a slightly larger size so it fully covers the static
          bean underneath. Float animation brings it to life.
          Group14 device coords: left=137 top=539 w=131 h=110
          We scale 1.35× and re-center: w=177 h=149, so left=137-(177-131)/2=114, top=539-20=519 */}
      <div
        style={{
          position: "absolute",
          left: 114, top: 519,
          width: 177, height: 149,
          pointerEvents: "none",
          zIndex: 8,
        }}
      >
        <motion.div
          style={{ position: "relative", width: "100%", height: "100%", transformOrigin: "50% 88%" }}
          animate={reduceMotion ? undefined : {
            y: [0, -7, 3, -4, 0],
            rotate: [0, -2.5, 1.8, -1, 0],
            scaleX: [1, .9, 1.08, .95, 1],
            scaleY: [1, 1.11, .86, 1.06, 1],
          }}
          transition={reduceMotion ? undefined : {
            repeat: Infinity,
            duration: 5.8,
            times: [0, .24, .47, .72, 1],
            ease: "easeInOut",
          }}
        >
          <FigmaBeanBody />
          <BeanOutfitOverlay itemId={state.equipped.outfit} size={49} />
          <BeanOutfitOverlay itemId={state.equipped.face} size={49} />
        </motion.div>
      </div>
      {tutStep >= 12 && state.connections.calendar && <div style={{ position: "absolute", left: 86, right: 45, top: 350, zIndex: 12, background: "white", borderRadius: 18, padding: "10px 14px", boxShadow: "0 6px 18px rgba(0,0,0,.15)", textAlign: "center" }}><p style={{ color: "#33434d", fontWeight: 700, fontSize: 12, lineHeight: 1.4 }}>Good luck on your exam tomorrow, {state.userName || "friend"}. I know you’ll do great!</p></div>}

      {/* Interactive overlays */}
      <FO x={74} y={145} w={162} h={163} onClick={handleSettings} zIndex={20} />
      <FO x={75} y={1165} w={454} h={601} onClick={handlePod} zIndex={20} />
      <FO x={877} y={1440} w={260} h={185} onClick={handleGarden} zIndex={20} />
      <FO x={1063} y={136} w={187} h={187} onClick={handleStore} zIndex={20} />
      <FO x={1063} y={415} w={187} h={187} onClick={handleHourglass} zIndex={20} />
      <FO x={243} y={2554} w={187} h={187} onClick={handleQuest} zIndex={20} />
      <FO x={567} y={2558} w={187} h={187} onClick={() => {}} zIndex={20} />
      <FO x={903} y={2559} w={187} h={187} onClick={handleProfile} zIndex={20} />
      {tutStep === 1 && <QuickShareOnboardingHint />}
      {!quickSharePrototype && [2,4,6,17,19].includes(tutStep) && <TutorialOverlay step={tutStep} />}
      {tutStep === 21 && <OnboardingCompleteOverlay onDone={() => setState((current) => ({ ...current, tutorialStep: 22 }))} />}
      {tutStep !== 21 && <button aria-label="Share something with Bean" onClick={() => { if (tutStep === 1) setState((current) => ({ ...current, tutorialStep: 2 })); setQuickSharePrototype(true); }} style={{ position: "absolute", left: 104, top: 509, width: 197, height: 169, zIndex: 35, border: 0, background: "transparent", cursor: "pointer" }} />}
      {quickSharePrototype && <QuickSharePrototype onClose={() => setQuickSharePrototype(false)} onSave={onCreateObservation} />}
    </Screen>
  );
}

function QuickShareOnboardingHint() {
  return <div style={{ position: "absolute", left: 32, right: 32, top: 78, zIndex: 30, padding: "14px 18px", borderRadius: 22, background: "rgba(255,255,255,.62)", border: "1px solid rgba(255,255,255,.9)", color: "#294956", textAlign: "center", fontSize: 16, fontWeight: 800, lineHeight: 1.35, pointerEvents: "none" }}>Tap Bean whenever you want to share a small moment.</div>;
}

type ShareCaptureKind = "write" | "speak" | "camera" | "album";

function ShareCaptureIcon({ kind, size = 26 }: { kind: ShareCaptureKind; size?: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} {...common}>
    {kind === "write" && <><path d="M4 20l4.1-1 10.7-10.7a2.1 2.1 0 0 0-3-3L5.1 16 4 20Z" /><path d="m14.5 6.5 3 3" /></>}
    {kind === "speak" && <><rect x="8.5" y="3" width="7" height="12" rx="3.5" /><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M8.5 21h7" /></>}
    {kind === "camera" && <><path d="M4 7.5h3l1.4-2h7.2l1.4 2h3a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 20 19.5H4A1.5 1.5 0 0 1 2.5 18V9A1.5 1.5 0 0 1 4 7.5Z" /><circle cx="12" cy="13" r="3.5" /><path d="M18.5 10h.01" /></>}
    {kind === "album" && <><rect x="5" y="3.5" width="15.5" height="14" rx="2" /><path d="m7.5 15 3.7-4 2.6 2.6 1.8-1.8 2.4 3.2M9 8h.01" /><path d="M3.5 7v12a1.5 1.5 0 0 0 1.5 1.5h12" /></>}
  </svg>;
}

function QuickSharePrototype({ onClose, onSave }: {
  onClose: () => void;
  onSave: (observation: Observation, source: ObservationSource, assignmentId?: string, media?: Array<{ kind: "photo" | "voice"; file: File }>) => void;
}) {
  const [selected, setSelected] = useState<"write" | "speak" | "camera" | "album" | null>(null);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [voice, setVoice] = useState<File | null>(null);
  const [recording, setRecording] = useState(false);
  const [message, setMessage] = useState("");
  const photoInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const choose = (mode: "write" | "speak" | "camera" | "album") => {
    setSelected(mode); setMessage("");
    if (mode === "camera") window.setTimeout(() => cameraInput.current?.click(), 0);
    if (mode === "album") window.setTimeout(() => photoInput.current?.click(), 0);
  };
  const stopRecording = () => recorder.current?.stop();
  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Voice recording is not available in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const mediaRecorder = new MediaRecorder(stream);
      recorder.current = mediaRecorder;
      mediaRecorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType || "audio/webm" });
        setVoice(new File([blob], `bean-voice-${Date.now()}.webm`, { type: blob.type }));
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
      };
      mediaRecorder.start(); setRecording(true);
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Bean could not start recording."); }
  };
  const save = () => {
    if (!text.trim() && !photo && !voice) return;
    const observation = makeObservation("What would you like Bean to remember?", text.trim() || "Voice memo awaiting transcription.", Boolean(photo), Boolean(voice));
    onSave(observation, "freeform", undefined, [...(photo ? [{ kind: "photo" as const, file: photo }] : []), ...(voice ? [{ kind: "voice" as const, file: voice }] : [])]);
    onClose();
  };
  const options = [
    { id: "write" as const, label: "Write", detail: "Type a little noticing" },
    { id: "speak" as const, label: "Speak", detail: "Record a voice note" },
    { id: "camera" as const, label: "Camera", detail: "Take a new photo" },
    { id: "album" as const, label: "Photo library", detail: "Choose an existing photo" },
  ];
  const hasContent = Boolean(text.trim() || photo || voice);
  return <div role="dialog" aria-modal="true" aria-label="Share something with Bean" style={{ position: "absolute", inset: 0, zIndex: 60, background: "rgba(25,45,61,.45)", display: "flex", alignItems: "end" }} onClick={onClose}>
    <motion.section initial={{ y: 260 }} animate={{ y: 0 }} transition={{ type: "spring", damping: 24, stiffness: 260 }} onClick={(event) => event.stopPropagation()} style={{ position: "relative", width: "100%", maxHeight: "88%", overflowY: "auto", borderRadius: "30px 30px 0 0", background: "#fff6dd", padding: "22px 20px 30px", boxShadow: "0 -10px 36px rgba(27,55,70,.2)", boxSizing: "border-box" }}>
      <button aria-label="Close quick share" onClick={onClose} style={{ position: "absolute", right: 16, top: 14, width: 35, height: 35, border: 0, borderRadius: "50%", background: "#edf3f3", color: "#3786ad", fontSize: 25, cursor: "pointer" }}>×</button>
      <h2 style={{ margin: "6px 38px 4px 0", color: "#27424d", fontSize: 25, lineHeight: 1.12 }}>Want to share something with Bean?</h2>
      <p style={{ margin: "0 0 18px", color: "#6a777c", fontSize: 13, lineHeight: 1.4 }}>Save a small moment, with or without a prompt.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 11 }}>
        {options.map((option) => <button key={option.id} onClick={() => choose(option.id)} style={{ minHeight: 88, border: selected === option.id ? "3px solid #fcb900" : "1px solid #f0dfb5", borderRadius: 20, background: selected === option.id ? "#fff" : "rgba(255,255,255,.72)", padding: "12px 10px", textAlign: "left", cursor: "pointer" }}><span style={{ display: "grid", placeItems: "center", width: 34, height: 34, borderRadius: 12, background: "#e2f1f8", color: "#3182ab", marginBottom: 7 }}><ShareCaptureIcon kind={option.id} size={22} /></span><strong style={{ display: "block", color: "#304953", fontSize: 15 }}>{option.label}</strong><small style={{ display: "block", marginTop: 2, color: "#7b8586", fontSize: 11 }}>{option.detail}</small></button>)}
      </div>
      {selected === "write" && <textarea autoFocus value={text} onChange={(event) => setText(event.target.value)} placeholder="What would you like Bean to remember?" style={{ width: "100%", minHeight: 92, marginTop: 14, padding: 12, boxSizing: "border-box", resize: "vertical", border: "1px solid #dfd1aa", borderRadius: 16, font: "14px Inter, sans-serif" }} />}
      {selected === "speak" && <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: "rgba(255,255,255,.7)", color: "#48575a", fontSize: 13 }}>{voice ? <><b>Voice note ready.</b><button onClick={() => setVoice(null)} style={{ marginLeft: 10, border: 0, background: "transparent", color: "#3786ad" }}>Remove</button></> : <><p style={{ marginTop: 0 }}>Record a thought in your own voice.</p><button onClick={recording ? stopRecording : startRecording} style={{ border: 0, borderRadius: 18, padding: "9px 14px", background: recording ? "#e95c6e" : "#3786ad", color: "white", fontWeight: 800 }}>{recording ? "Stop recording" : "Start recording"}</button></>}</div>}
      {(selected === "camera" || selected === "album") && <div style={{ marginTop: 14, padding: 14, borderRadius: 16, background: "rgba(255,255,255,.7)", color: "#48575a", fontSize: 13 }}>{photo ? <><b>{photo.name}</b><button onClick={() => setPhoto(null)} style={{ marginLeft: 10, border: 0, background: "transparent", color: "#3786ad" }}>Choose another</button></> : "Opening your photo picker…"}</div>}
      {message && <p role="alert" style={{ color: "#b44b54", fontSize: 12 }}>{message}</p>}
      {hasContent && <button onClick={save} style={{ width: "100%", marginTop: 14, border: 0, borderRadius: 100, padding: "13px 15px", background: CTA_YELLOW, color: "white", fontSize: 16, fontWeight: 850 }}>Share with Bean</button>}
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
      <input ref={photoInput} type="file" accept="image/*" hidden onChange={(event) => setPhoto(event.target.files?.[0] || null)} />
    </motion.section>
  </div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// INNER SCREENS — sky+cloud background, animated Bean, universal nav bar
// ══════════════════════════════════════════════════════════════════════════════

// Shared inner screen layout wrapper
function InnerScreen({
  active, onNav, children, beanExpr = "happy", beanLabel, outfitId = "none", faceId = "none",
}: {
  active: ScreenId;
  onNav: (s: ScreenId) => void;
  children: React.ReactNode;
  beanExpr?: "happy" | "excited" | "curious" | "wondering";
  beanLabel?: string;
  outfitId?: string;
  faceId?: string;
}) {
  const SKY_H = 230;
  const NAV_H = 76;
  return (
    <motion.div
      style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: "'Inter', sans-serif" }}
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.24 }}
    >
      {/* Sky + cloud background */}
      <SkyCloudBg skyH={SKY_H} />

      {/* Animated Bean floating in sky */}
      <div style={{

        position: "absolute", top: 48, left: "50%",
        transform: "translateX(-50%)", zIndex: 5,
      }}>
        <HomeStyleBean size={130} outfitId={outfitId} faceId={faceId} />
        {beanLabel && (
          <motion.div
            style={{
              position: "absolute", top: -36, left: "50%",
              background: "white", borderRadius: 16, padding: "8px 14px",
              boxShadow: "0 4px 14px rgba(0,0,0,0.12)",
              width: 210, maxWidth: "calc(100vw - 32px)", whiteSpace: "normal", textAlign: "center",
            }}
            initial={{ opacity: 0, y: 6, x: "-50%" }} animate={{ opacity: 1, y: 0, x: "-50%" }}
            transition={{ delay: 0.3 }}
          >
            <p style={{ fontSize: 12, fontWeight: 600, color: "#333", lineHeight: 1.35, overflowWrap: "anywhere" }}>{beanLabel}</p>
            {/* Speech bubble tail */}
            <div style={{
              position: "absolute", bottom: -6, left: "50%", transform: "translateX(-50%)",
              width: 12, height: 12, background: "white", rotate: "45deg",
              boxShadow: "2px 2px 4px rgba(0,0,0,0.06)",
            }} />
          </motion.div>
        )}
      </div>

      {/* Scrollable content area */}
      <div style={{
        position: "absolute",
        top: SKY_H + 18,
        bottom: NAV_H,
        left: 0, right: 0,
        overflowY: "auto",
        padding: "0 20px 16px",
      }}>
        {children}
      </div>

      {/* Nav bar */}
      <AppNavBar active={active} onNav={onNav} />
    </motion.div>
  );
}

// ─── Quest Page ───────────────────────────────────────────────────────────────
function QuestPageScreen({ state, setState, onNav, onCreateObservation }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
  onCreateObservation: (observation: Observation, source: ObservationSource, assignmentId?: string, media?: Array<{ kind: "photo" | "voice"; file: File }>) => void;
}) {
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [bonusText, setBonusText] = useState("");
  const [bonusPhoto, setBonusPhoto] = useState(false);
  const [bonusVoice, setBonusVoice] = useState(false);
  const [bonusPhotoFile, setBonusPhotoFile] = useState<File | null>(null);
  const [bonusVoiceFile, setBonusVoiceFile] = useState<File | null>(null);
  const bonusCameraInput = useRef<HTMLInputElement>(null);
  const bonusAlbumInput = useRef<HTMLInputElement>(null);
  const bonusVoiceInput = useRef<HTMLInputElement>(null);
  const [rewardKind, setRewardKind] = useState<"daily" | "bonus" | null>(null);
  const [reviewPrompt, setReviewPrompt] = useState<string | null>(null);
  const [dailyQuest, setDailyQuest] = useState<DailyQuest | null>(null);
  const fallbackDailyPrompt = "What’s something about your current physical environment that you appreciate?";
  const bonusPrompts = ["Who’s someone you are grateful for right now?", "What’s a hobby that brings you joy?", "Describe the sounds in your environment."];
  const handleNav = (s: ScreenId) => { if (s === "home" && state.tutorialStep === 3) setState((p) => ({ ...p, tutorialStep: 4 })); onNav(s); };

  useEffect(() => {
    if (!backend.configured) return;
    void backend.getDailyQuest(new Date().toISOString().slice(0, 10)).then(setDailyQuest).catch(() => { /* Offline fallback stays usable. */ });
  }, []);

  const activeDailyPrompt = dailyQuest?.prompt || fallbackDailyPrompt;
  const promptIsComplete = (prompt: string) => state.observations.some((item) => item.prompt === prompt);
  const dailyComplete = Boolean(dailyQuest?.completedAt || state.questText || promptIsComplete(activeDailyPrompt));
  const submitObservation = () => {
    if (!selectedPrompt || (!bonusText.trim() && !bonusPhotoFile && !bonusVoiceFile)) return;
    const source: ObservationSource = selectedPrompt === activeDailyPrompt ? "daily" : selectedPrompt === "What would you like Bean to remember?" ? "freeform" : "bonus";
    const observation = makeObservation(selectedPrompt, bonusText.trim() || (bonusVoiceFile ? "Voice memo awaiting transcription." : "Photo shared."), Boolean(bonusPhotoFile), Boolean(bonusVoiceFile));
    if (source === "daily" && dailyQuest) { observation.category = dailyQuest.category; observation.emoji = dailyQuest.emoji; }
    onCreateObservation(observation, source, source === "daily" ? dailyQuest?.assignmentId : undefined, [...(bonusPhotoFile ? [{ kind: "photo" as const, file: bonusPhotoFile }] : []), ...(bonusVoiceFile ? [{ kind: "voice" as const, file: bonusVoiceFile }] : [])]);
    setRewardKind(source === "daily" ? "daily" : "bonus");
    setSelectedPrompt(null); setBonusText(""); setBonusPhoto(false); setBonusVoice(false); setBonusPhotoFile(null); setBonusVoiceFile(null);
  };

  if (rewardKind) return <Screen><ExactQuestFrame src={rewardKind === "daily" ? questDailyRewardFrame : questBonusRewardFrame} /><div style={{ position: "absolute", inset: 0, zIndex: 20, cursor: "pointer" }} onClick={() => setRewardKind(null)} /></Screen>;

  if (selectedPrompt) {
    const isDailyInput = selectedPrompt === activeDailyPrompt;
    const wordCount = bonusText.trim() ? bonusText.trim().split(/\s+/).length : 0;
    const detailNudge = selectedPrompt === "What’s a hobby that brings you joy?" ? "What is one tiny part of it you love?" : "What detail would you like Bean to remember?";
    return <Screen><ExactQuestFrame src={isDailyInput ? questInputFrame : questBonusInputFrame} />
      {wordCount > 0 && wordCount < 12 && <div style={{ position: "absolute", left: fs(235), top: fs(850), width: fs(820), padding: fs(20), borderRadius: fs(28), background: "rgba(255,246,221,.92)", color: "#5e685f", fontSize: fs(28), lineHeight: 1.35, textAlign: "center", zIndex: 13, pointerEvents: "none" }}><b style={{ color: "#3c84ab" }}>Optional:</b> {detailNudge} A few extra words help Bean remember this moment.</div>}
      {!isDailyInput && <p style={{ position: "absolute", left: fs(214), top: fs(788), width: fs(823), minHeight: fs(149), background: "#fff6dd", color: "#111", fontSize: fs(40), lineHeight: 1.2, zIndex: 11 }}>{selectedPrompt}</p>}
      <textarea value={bonusText} onChange={(event) => setBonusText(event.target.value)} placeholder="I appreciate…" autoFocus style={{ position: "absolute", left: fs(251), top: fs(999), width: fs(788), height: fs(866), resize: "none", border: 0, outline: 0, background: "white", color: "#1f2937", fontSize: fs(40), lineHeight: 1.45, zIndex: 12 }} />
      <input ref={bonusCameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(event) => { const file = event.target.files?.[0] || null; setBonusPhotoFile(file); setBonusPhoto(Boolean(file)); }} />
      <input ref={bonusAlbumInput} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0] || null; setBonusPhotoFile(file); setBonusPhoto(Boolean(file)); }} />
      <input ref={bonusVoiceInput} type="file" accept="audio/*" capture hidden onChange={(event) => { const file = event.target.files?.[0] || null; setBonusVoiceFile(file); setBonusVoice(Boolean(file)); }} />
      <FO x={74} y={145} w={162} h={164} onClick={() => setSelectedPrompt(null)} zIndex={15} />
      <div aria-hidden style={{ position: "absolute", left: fs(285), top: fs(1872), width: fs(720), height: fs(190), zIndex: 15, background: "white" }} />
      {[
        { label: "Speak", kind: "speak" as const, left: 325, action: () => bonusVoiceInput.current?.click() },
        { label: "Camera", kind: "camera" as const, left: 555, action: () => bonusCameraInput.current?.click() },
        { label: "Photo library", kind: "album" as const, left: 785, action: () => bonusAlbumInput.current?.click() },
      ].map(({ label, kind, left, action }) => <button key={label} type="button" aria-label={label} onClick={action} style={{ position: "absolute", left: fs(left), top: fs(1888), width: fs(180), height: fs(160), zIndex: 16, border: 0, borderRadius: fs(28), background: "#e2f1f8", color: "#3182ab", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: fs(8), cursor: "pointer" }}><ShareCaptureIcon kind={kind} size={fs(64)} /><span style={{ fontSize: fs(25), fontWeight: 800, lineHeight: 1 }}>{label}</span></button>)}
      <FO x={385} y={2144} w={533} h={123} onClick={bonusText.trim() || bonusPhoto || bonusVoice ? submitObservation : undefined} style={{ opacity: bonusText.trim() || bonusPhoto || bonusVoice ? 1 : .45 }} zIndex={15} /><FO x={243} y={2554} w={187} h={187} onClick={() => handleNav("questPage")} zIndex={15} /><FO x={567} y={2558} w={187} h={187} onClick={() => handleNav("home")} zIndex={15} /><FO x={903} y={2559} w={187} h={187} onClick={() => handleNav("profile")} zIndex={15} />
    </Screen>;
  }

  return <Screen><ExactQuestFrame src={dailyComplete ? questCompleteFrame : questHomeFrame} />{!dailyComplete && <p style={{ position: "absolute", left: fs(220), top: fs(985), width: fs(850), margin: 0, color: "#344252", fontSize: fs(34), lineHeight: 1.22, textAlign: "center", zIndex: 12, pointerEvents: "none" }}>{activeDailyPrompt}</p>}<FO x={74} y={145} w={162} h={164} onClick={() => onNav("settings")} zIndex={15} /><FO x={374} y={983} w={533} h={96} onClick={() => dailyComplete ? setReviewPrompt(activeDailyPrompt) : setSelectedPrompt(activeDailyPrompt)} zIndex={15} />
    {bonusPrompts.map((prompt, index) => { const completed = promptIsComplete(prompt); return <React.Fragment key={prompt}><FO x={104} y={[1364,1572,1792][index]} w={1114} h={159} onClick={() => completed ? setReviewPrompt(prompt) : setSelectedPrompt(prompt)} zIndex={15} /></React.Fragment>; })}
    <FO x={104} y={2012} w={1114} h={159} onClick={() => setSelectedPrompt("What would you like Bean to remember?")} zIndex={15} />
    <AnimatePresence>{reviewPrompt && <div style={{ position: "absolute", inset: 0, zIndex: 45, display: "grid", placeItems: "center", padding: 24, background: "rgba(26,67,84,.5)" }} onClick={() => setReviewPrompt(null)}><motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} onClick={(event) => event.stopPropagation()} style={{ width: "100%", maxWidth: 330, padding: "22px 20px", borderRadius: 27, background: "#fffdf7" }}><button onClick={() => setReviewPrompt(null)} aria-label="Close saved response" style={{ float: "right", width: 30, height: 30, border: 0, borderRadius: "50%", background: "#eef2f1", color: "#3786ad", fontSize: 21 }}>×</button><p style={{ margin: "0 35px 7px 0", color: CTA_YELLOW, fontSize: 11, fontWeight: 900 }}>YOU ALREADY NOTICED THIS</p><h2 style={{ margin: 0, color: BLUE_TEXT, fontSize: 18, lineHeight: 1.32 }}>{reviewPrompt}</h2><div style={{ marginTop: 16, display: "grid", gap: 10 }}>{state.observations.filter((item) => item.prompt === reviewPrompt).slice(0, 3).map((item) => <div key={item.id} style={{ padding: "12px 13px", borderRadius: 16, background: "#fff6dd", color: "#3e4b42", fontSize: 14, lineHeight: 1.45, fontStyle: "italic" }}>“{item.text}”</div>)}</div><p style={{ margin: "16px 0 10px", color: "#65736c", fontSize: 12 }}>A new answer can grow another memory seed.</p><button onClick={() => { const prompt = reviewPrompt; setReviewPrompt(null); setBonusText(""); setSelectedPrompt(prompt); }} style={{ width: "100%", border: 0, borderRadius: 100, padding: "12px 15px", background: CTA_YELLOW, color: "white", fontWeight: 850 }}>Add another answer</button></motion.div></div>}</AnimatePresence>
    <FO x={243} y={2554} w={187} h={187} onClick={() => handleNav("questPage")} zIndex={15} /><FO x={567} y={2558} w={187} h={187} onClick={() => handleNav("home")} zIndex={15} /><FO x={903} y={2559} w={187} h={187} onClick={() => handleNav("profile")} zIndex={15} />
  </Screen>;
}


// ─── Garden Screen ────────────────────────────────────────────────────────────
function GardenScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [showBloom, setShowBloom] = useState(false);

  const handleNav = (s: ScreenId) => {
    if (s === "home" && state.tutorialStep === 5) setState((p) => ({ ...p, tutorialStep: 6 }));
    onNav(s);
  };

  const handlePlant = () => {
    setState((s) => ({ ...s, gardenPhase: "planted", seeds: Math.max(0, s.seeds - 1) }));
    setTimeout(() => {
      setState((s) => ({ ...s, gardenPhase: "bloomed", tokens: s.tokens + 10 }));
      setShowBloom(true);
    }, 1200);
  };

  return (
    <motion.div
      style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: "'Inter', sans-serif" }}
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.24 }}
    >
      {/* Garden background */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(to bottom, #0b5c87 0%, #7ab8d9 30%, #9DC072 30%, #7CB872 65%, #5a8c4a 100%)",
      }} />
      <svg style={{ position: "absolute", top: "25%", width: "100%", height: "22%" }} viewBox="0 0 390 100" preserveAspectRatio="none">
        <path d="M-10 100C70 50 160 28 240 36 310 43 355 66 410 53L410 100Z" fill="#a8d078" />
      </svg>

      {/* Flowers */}
      {[{x:14,y:60,c:"#FF6B6B",s:9},{x:22,y:65,c:CTA_YELLOW,s:7},{x:65,y:58,c:"#FF9FF3",s:8},{x:73,y:63,c:"#54a0ff",s:6},{x:85,y:68,c:"#A8E6CF",s:7}].map((f,i) => (
        <motion.div key={i} style={{ position: "absolute", left: `${f.x}%`, top: `${f.y}%`, transformOrigin: "50% 100%" }} animate={{ rotate: [-3, 4, -2, 3, -3], x: [0, 1, -1, 1, 0] }} transition={{ repeat: Infinity, duration: 3.2 + i * .18, delay: i * .2, ease: "easeInOut" }}>
          <svg width={f.s*2.5} height={f.s*2.5} viewBox="0 0 20 20">
            <circle cx="10" cy="10" r="4" fill={f.c} />
            {[0,90,180,270].map(a=><circle key={a} cx={10+7*Math.cos(a*Math.PI/180)} cy={10+7*Math.sin(a*Math.PI/180)} r="3" fill={f.c} opacity="0.7"/>)}
            <circle cx="10" cy="10" r="2.5" fill="rgba(255,255,255,0.6)" />
          </svg>
        </motion.div>
      ))}

      {/* Header */}
      <p style={{ position: "absolute", top: 22, left: 0, right: 0, textAlign: "center", color: "white", fontWeight: 700, fontSize: 18 }}>Bean&apos;s Garden</p>
      <div style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.22)", borderRadius: 20, padding: "4px 12px", display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ fontSize: 16 }}>🌱</span>
        <span style={{ color: "white", fontSize: 13, fontWeight: 700 }}>{state.seeds} seeds</span>
      </div>

      {/* Animated Bean in sky */}
      <div style={{ position: "absolute", top: 50, left: "50%", transform: "translateX(-50%)", zIndex: 5 }}>
        <HomeStyleBean size={110} outfitId={state.equipped.outfit} faceId={state.equipped.face} />
      </div>
      {/* Bean speech */}
      <div style={{ position: "absolute", top: 34, left: "50%", transform: "translateX(-170px)" }}>
        <div style={{ background: "white", borderRadius: 14, padding: "6px 12px", maxWidth: 140, boxShadow: "0 3px 12px rgba(0,0,0,0.12)" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#333", lineHeight: 1.3 }}>
            {state.gardenPhase === "bloomed" ? "Memory bloomed! 🌸" : "Pick a cozy patch!"}
          </p>
        </div>
      </div>

      {/* Planting area */}
      <div style={{ position: "absolute", bottom: 100, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {state.gardenPhase === "empty" && state.seeds > 0 && (
          <motion.button onClick={handlePlant} style={{ background: "none", border: "none", cursor: "pointer" }} whileTap={{ scale: 0.93 }}>
            <motion.div style={{ width: 72, height: 36, borderRadius: 36, border: "3px solid rgba(254,183,0,0.75)", background: "rgba(254,183,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}
              animate={{ boxShadow: ["0 0 0 0 rgba(254,183,0,0.4)","0 0 0 16px rgba(254,183,0,0.05)","0 0 0 0 rgba(254,183,0,0.4)"] }}
              transition={{ repeat: Infinity, duration: 1.6 }}>
              <span style={{ fontSize: 22 }}>🌱</span>
            </motion.div>
            <p style={{ color: "white", fontSize: 11, fontWeight: 700, textAlign: "center", marginTop: 5, textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}>Tap to plant</p>
          </motion.button>
        )}
        {state.gardenPhase === "empty" && state.seeds === 0 && (
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center", fontWeight: 600, textShadow: "0 1px 3px rgba(0,0,0,0.3)" }}>Complete a quest to earn a Memory Seed!</p>
        )}
        {state.gardenPhase === "planted" && (
          <motion.div animate={{ scale: [0.6,1.1,0.95,1], rotate: [0,12,-10,0] }} transition={{ duration: 1.2 }}>
            <svg width="50" height="62" viewBox="0 0 50 62">
              <ellipse cx="25" cy="54" rx="18" ry="8" fill="#4a7c3a" />
              <rect x="22" y="18" width="6" height="36" rx="3" fill="#5a8c4a" />
              <ellipse cx="25" cy="18" rx="14" ry="10" fill="#6ab846" />
            </svg>
          </motion.div>
        )}
        {state.gardenPhase === "bloomed" && (
          <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 250, damping: 13 }}>
            <svg width="90" height="110" viewBox="0 0 90 110">
              <rect x="43" y="50" width="5" height="58" rx="2.5" fill="#5a8c4a" />
              {[0,45,90,135,180,225,270,315].map((a,i) => (
                <ellipse key={i} cx={45+22*Math.cos(a*Math.PI/180)} cy={40+22*Math.sin(a*Math.PI/180)} rx="10" ry="6" fill="#FFD700"
                  transform={`rotate(${a},${45+22*Math.cos(a*Math.PI/180)},${40+22*Math.sin(a*Math.PI/180)})`} />
              ))}
              <circle cx="45" cy="40" r="14" fill="#FF8B05" />
              <circle cx="45" cy="40" r="8" fill={CTA_YELLOW} />
            </svg>
          </motion.div>
        )}
      </div>

      {/* Bloom celebration */}
      <AnimatePresence>
        {showBloom && (
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => setShowBloom(false)}>
            <motion.div style={{ background: "white", borderRadius: 28, padding: "28px 24px", maxWidth: 300, textAlign: "center", boxShadow: "0 16px 48px rgba(0,0,0,0.24)" }}
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}>
              <div style={{ fontSize: 42, marginBottom: 10 }}>🌸</div>
              <h3 style={{ fontWeight: 800, fontSize: 18, color: BLUE_TEXT, marginBottom: 6 }}>Your first memory has bloomed!</h3>
              <p style={{ fontSize: 13, color: "#555", marginBottom: 4 }}>Plants grow from the things you notice.</p>
              <p style={{ fontSize: 12, color: "#888", marginBottom: 16 }}>Category: Light · Bloom: Sunbell Flower</p>
              <div style={{ background: "#fffbeb", borderRadius: 14, padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 18 }}>
                <span style={{ fontSize: 22 }}>🌱</span>
                <span style={{ fontWeight: 700, color: "#92400e", fontSize: 16 }}>+10 tokens earned!</span>
              </div>
              <button style={{ background: CTA_YELLOW, border: "none", borderRadius: 100, padding: "12px 32px", color: "white", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
                onClick={() => setShowBloom(false)}>Wonderful! ✨</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AppNavBar active="garden" onNav={handleNav} />
    </motion.div>
  );
}

// ─── Store Screen ─────────────────────────────────────────────────────────────
const ITEMS = [
  { id: "hat", emoji: "🎩", name: "Top Hat", price: 5, cat: "outfit" },
  { id: "crown", emoji: "👑", name: "Crown", price: 5, cat: "outfit" },
  { id: "bow", emoji: "🎀", name: "Blue Bow", price: 4, cat: "outfit" },
  { id: "mustache", emoji: "〰", name: "Mustache", price: 2, cat: "outfit" },
  { id: "blush", emoji: "〰", name: "Blush", price: 2, cat: "outfit" },
  { id: "heartGlasses", emoji: "♡—♡", name: "Heart Glasses", price: 3, cat: "outfit" },
  { id: "catEars", emoji: "◢　◣", name: "Cat Ears", price: 3, cat: "outfit" },
  { id: "bearEars", emoji: "◖　◗", name: "Bear Ears", price: 3, cat: "outfit" },
  { id: "bunnyEars", emoji: "ᘏ　ᘏ", name: "Bunny Ears", price: 3, cat: "outfit" },
  { id: "flowerClip", emoji: "🌸", name: "Flower Clip", price: 2, cat: "outfit" },
  { id: "mushroomHouse", emoji: "🍄", name: "Mushroom House", price: 5, cat: "garden" },
  { id: "stump", emoji: "🪵", name: "Tree Stump", price: 4, cat: "garden" },
  { id: "snail", emoji: "🐌", name: "Garden Snail", price: 2, cat: "garden" },
  { id: "fence", emoji: "🪵", name: "Wooden Fence", price: 2, cat: "garden" },
  { id: "gnome", emoji: "🧙", name: "Garden Gnome", price: 3, cat: "garden" },
  { id: "bird", emoji: "🐦", name: "Little Bird", price: 3, cat: "garden" },
  { id: "bush", emoji: "🌿", name: "Flowering Bush", price: 3, cat: "garden" },
  { id: "wateringCan", emoji: "🪣", name: "Watering Can", price: 3, cat: "garden" },
  { id: "lamp", emoji: "🍄", name: "Mushroom Lamp", price: 8, cat: "garden" },
  { id: "stone", emoji: "🪨", name: "Garden Stone", price: 5, cat: "garden" },
  { id: "meadow", emoji: "🌼", name: "Sunny Meadow", price: 0, cat: "background" },
  { id: "starlight", emoji: "🌌", name: "Starlight Backdrop", price: 10, cat: "background" },
  { id: "backdrop-1", emoji: "", name: "Golden Meadow", price: 10, cat: "background" },
  { id: "backdrop-2", emoji: "", name: "Lavender Evening", price: 10, cat: "background" },
  { id: "backdrop-3", emoji: "", name: "Moonlit Garden", price: 10, cat: "background" },
  { id: "backdrop-4", emoji: "", name: "Bluebell Day", price: 15, cat: "background" },
  { id: "backdrop-5", emoji: "", name: "Wildflower Field", price: 10, cat: "background" },
  { id: "backdrop-6", emoji: "", name: "Sunrise Hills", price: 15, cat: "background" },
  { id: "backdrop-7", emoji: "", name: "Garden Picnic", price: 10, cat: "background" },
  { id: "backdrop-8", emoji: "", name: "Dewdrop Morning", price: 10, cat: "background" },
  { id: "backdrop-9", emoji: "", name: "Dreamy Pond", price: 15, cat: "background" },
  { id: "backdrop-10", emoji: "", name: "Secret Grove", price: 10, cat: "background" },
  { id: "backdrop-11", emoji: "", name: "Blooming Path", price: 15, cat: "background" },
  { id: "backdrop-12", emoji: "", name: "Cloud Garden", price: 10, cat: "background" },
  { id: "backdrop-13", emoji: "", name: "Twilight Field", price: 15, cat: "background" },
];

const FACE_ITEM_IDS = new Set(["mustache", "heartGlasses", "blush"]);
const outfitSlotFor = (itemId: string) => FACE_ITEM_IDS.has(itemId) ? "face" : "head";

const STORE_ITEM_ASSETS: Record<string, string> = {
  hat: storeHat,
  crown: storeCrown,
  bow: storeBow,
  mustache: storeMustache,
  blush: storeBlush,
  heartGlasses: storeHeartGlasses,
  catEars: storeCatEars,
  bearEars: storeBearEars,
  bunnyEars: storeBunnyEars,
  flowerClip: storeFlowerClip,
  mushroomHouse: storeMushroomHouse,
  stump: storeStump,
  snail: storeSnail,
  fence: storeFence,
  gnome: storeGnome,
  bird: storeBird,
  bush: storeBush,
  wateringCan: storeWateringCan,
};

const BACKDROP_ASSETS: Record<string, string> = {
  "backdrop-1": "/backdrops/backdrop-1.png",
  "backdrop-2": "/backdrops/backdrop-2.png",
  "backdrop-3": "/backdrops/backdrop-3.png",
  "backdrop-4": "/backdrops/backdrop-4.png",
  "backdrop-5": "/backdrops/backdrop-5.png",
  "backdrop-6": "/backdrops/backdrop-6.png",
  "backdrop-7": "/backdrops/backdrop-7.png",
  "backdrop-8": "/backdrops/backdrop-8.png",
  "backdrop-9": "/backdrops/backdrop-9.png",
  "backdrop-10": "/backdrops/backdrop-10.png",
  "backdrop-11": "/backdrops/backdrop-11.png",
  "backdrop-12": "/backdrops/backdrop-12.png",
  "backdrop-13": "/backdrops/backdrop-13.png",
};

const BACKDROP_THUMBNAILS: Record<string, string> = {
  ...BACKDROP_ASSETS,
  meadow: "/pod-default/meadow-tile.png",
};

function StoreItemArt({ itemId, size = 48 }: { itemId: string; size?: number }) {
  const item = ITEMS.find((candidate) => candidate.id === itemId);
  if (!item) return null;
  const asset = STORE_ITEM_ASSETS[itemId] ?? BACKDROP_THUMBNAILS[itemId];
  return <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: size, lineHeight: 1, whiteSpace: "nowrap" }}>{asset ? <img src={asset} alt="" style={{ display: "block", width: "100%", height: "100%", objectFit: item.cat === "background" ? "cover" : "contain", objectPosition: item.cat === "background" ? "center 75%" : "center" }} /> : item.cat === "background" ? null : item.emoji}</div>;
}

function StoreScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [tab, setTab] = useState<"outfit" | "garden" | "background">("outfit");
  const [celebrating, setCelebrating] = useState<(typeof ITEMS)[number] | null>(null);
  const [pendingPurchase, setPendingPurchase] = useState<(typeof ITEMS)[number] | null>(null);
  const [purchaseError, setPurchaseError] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const handleNav = (s: ScreenId) => {
    if (s === "home" && state.tutorialStep === 16) return;
    onNav(s);
  };

  const buy = async (item: typeof ITEMS[0]) => {
    if (state.tokens >= item.price && !state.storeItems[item.id]) {
      setPurchasing(true);
      setPurchaseError("");
      try {
        // The localhost preview uses the persisted app state. Production always
        // delegates balance changes to Supabase's atomic purchase operation.
        const tokens = backend.configured && !import.meta.env.DEV
          ? await backend.purchaseItem(item.id)
          : state.tokens - item.price;
        setState((s) => ({ ...s, tokens, storeItems: { ...s.storeItems, [item.id]: true }, tutorialStep: s.tutorialStep === 16 && item.cat === "outfit" ? 17 : s.tutorialStep, syncError: "" }));
        setPendingPurchase(null);
        setCelebrating(item);
      } catch (reason) {
        const message = reason instanceof Error ? reason.message : "Bean couldn't complete that purchase.";
        setPurchaseError(message);
        setState((s) => ({ ...s, syncError: message }));
      } finally {
        setPurchasing(false);
      }
    }
  };

  const visibleItems = ITEMS
    .filter((item) => item.cat === tab && !["lamp", "stone", "meadow", "starlight"].includes(item.id))
    .sort((a, b) => Number(Boolean(state.storeItems[a.id])) - Number(Boolean(state.storeItems[b.id])));
  const onboardingStoreItem = pendingPurchase
    ?? visibleItems.find((item) => !state.storeItems[item.id] && state.tokens >= item.price)
    ?? visibleItems[0]
    ?? null;

  const equipCelebratingItem = async () => {
    if (!celebrating) return;
    if (celebrating.cat === "outfit") {
      try {
        const slot = outfitSlotFor(celebrating.id);
        if (backend.configured && !import.meta.env.DEV) await backend.equipItem(slot === "head" ? "outfit" : "face", celebrating.id);
        setState((current) => ({ ...current, equipped: { ...current.equipped, [slot === "head" ? "outfit" : "face"]: celebrating.id }, syncError: "" }));
        setCelebrating(null);
      } catch (reason) {
        setState((current) => ({ ...current, syncError: reason instanceof Error ? reason.message : "Bean couldn't equip that item." }));
      }
      return;
    }
    if (celebrating.cat === "background") {
      setState((current) => ({ ...current, equipped: { ...current.equipped, background: celebrating.id }, syncError: "" }));
      if (backend.configured) void backend.equipItem("backdrop", celebrating.id).catch((reason) => setState((current) => ({ ...current, syncError: reason instanceof Error ? reason.message : "Bean couldn't equip that backdrop." })));
      setCelebrating(null);
      onNav("beanHome");
      return;
    }
    setCelebrating(null);
    onNav("garden");
  };

  return (
    <motion.div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg,#66caff 0%,#9ddbfd 22%,#fff 42%)", fontFamily: "'Inter',sans-serif" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ position: "absolute", zIndex: 1, left: 0, right: 0, top: fs(670), bottom: 0, background: "white" }} />
      <div aria-hidden style={{ position: "absolute", zIndex: 1, left: fs(-70), top: fs(454), width: fs(516), height: fs(440), borderRadius: "50%", background: "white" }} />
      <div aria-hidden style={{ position: "absolute", zIndex: 1, left: fs(386), top: fs(567), width: fs(431), height: fs(440), borderRadius: "50%", background: "white" }} />
      <div aria-hidden style={{ position: "absolute", zIndex: 1, left: fs(710), top: fs(371), width: fs(431), height: fs(440), borderRadius: "50%", background: "white" }} />
      <div aria-hidden style={{ position: "absolute", zIndex: 1, left: fs(960), top: fs(543), width: fs(431), height: fs(440), borderRadius: "50%", background: "white" }} />

      <button aria-label="Settings" onClick={() => onNav("settings")} style={{ position: "absolute", zIndex: 15, left: fs(136), top: fs(145), width: fs(162), height: fs(163), border: 0, background: "transparent", color: "#3c84ab", cursor: "pointer", transform: "rotate(31deg)" }}><svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.95L14.37 2.8a.49.49 0 0 0-.49-.4h-3.84a.49.49 0 0 0-.49.4l-.36 2.51c-.59.24-1.13.56-1.64.95L5.16 5.3a.49.49 0 0 0-.61.22L2.63 8.84a.49.49 0 0 0 .12.64l2.03 1.58c-.05.31-.08.65-.08.94s.03.63.08.94l-2.03 1.58a.49.49 0 0 0-.12.64l1.92 3.32c.12.22.38.31.61.22l2.39-.96c.5.39 1.05.71 1.64.95l.36 2.51c.04.24.24.4.49.4h3.84c.25 0 .45-.16.49-.4l.36-2.51c.59-.24 1.13-.56 1.63-.95l2.39.96c.23.09.49 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.02-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" /></svg></button>
      <div style={{ position: "absolute", zIndex: 12, left: fs(974), top: fs(163), width: fs(249), height: fs(127), borderRadius: fs(70), background: "rgba(244,244,244,.5)", display: "flex", alignItems: "center", justifyContent: "center", gap: fs(18), fontSize: fs(52), fontWeight: 700 }}><img src={storeCoin} alt="Coins" style={{ width: fs(84), height: fs(83), objectFit: "contain" }} />{state.tokens}</div>
      <div style={{ position: "absolute", zIndex: 5, left: fs(33), top: fs(501), width: fs(359) }}><HomeStyleBean size={fs(359)} outfitId={state.equipped.outfit} faceId={state.equipped.face} /></div>
      <h1 style={{ position: "absolute", zIndex: 6, left: fs(510), top: fs(680), width: fs(744), margin: 0, color: "#3c84ab", fontSize: fs(48), fontWeight: 800, textAlign: "center" }}>Welcome to Bean&apos;s store!</h1>

      <button onClick={() => setTab("outfit")} style={{ position: "absolute", zIndex: 9, left: fs(201), top: fs(877), width: fs(238), height: fs(91), border: 0, borderRadius: `${fs(10)}px ${fs(10)}px 0 0`, background: tab === "outfit" ? "#fff6dd" : "#ffedb7", color: tab === "outfit" ? "#111" : "#837d6b", fontSize: fs(40), cursor: "pointer" }}>Wardrobe</button>
      <button disabled={state.tutorialStep === 16} onClick={() => setTab("garden")} style={{ position: "absolute", zIndex: 9, left: fs(449), top: fs(877), width: fs(212), height: fs(91), border: 0, borderRadius: `${fs(10)}px ${fs(10)}px 0 0`, background: tab === "garden" ? "#fff6dd" : "#ffedb7", color: tab === "garden" ? "#111" : "#837d6b", fontSize: fs(40), cursor: state.tutorialStep === 16 ? "default" : "pointer", opacity: state.tutorialStep === 16 ? .55 : 1 }}>Garden</button>
      <button disabled={state.tutorialStep === 16} onClick={() => setTab("background")} style={{ position: "absolute", zIndex: 9, left: fs(673), top: fs(877), width: fs(212), height: fs(91), border: 0, borderRadius: `${fs(10)}px ${fs(10)}px 0 0`, background: tab === "background" ? "#fff6dd" : "#ffedb7", color: tab === "background" ? "#111" : "#837d6b", fontSize: fs(36), cursor: state.tutorialStep === 16 ? "default" : "pointer", opacity: state.tutorialStep === 16 ? .55 : 1 }}>Backdrop</button>
      <section aria-label={tab === "outfit" ? "Wardrobe items" : tab === "garden" ? "Garden items" : "Backdrop items"} style={{ position: "absolute", zIndex: 8, left: fs(105), top: fs(953), width: fs(1079), height: fs(1486), borderRadius: fs(100), background: "#fff6dd", overflowY: "auto", overflowX: "hidden", boxSizing: "border-box", padding: `${fs(90)}px ${fs(102)}px`, display: "grid", gridTemplateColumns: `repeat(3, ${fs(280)}px)`, alignContent: "start", gap: `${fs(42)}px ${fs(34)}px` }}>
        {visibleItems.map((item) => {
          const owned = Boolean(state.storeItems[item.id]);
          const canAfford = state.tokens >= item.price;
          const isBackdrop = item.cat === "background";
          return <motion.button key={item.id} aria-label={owned ? "Owned backdrop" : isBackdrop ? "Purchase this backdrop" : `${owned ? "Owned" : "Buy"} ${item.name}`} disabled={owned || !canAfford} onClick={() => { setPurchaseError(""); setPendingPurchase(item); }} whileTap={!owned && canAfford ? { scale: .94 } : undefined} style={{ position: "relative", width: fs(280), height: fs(280), border: 0, borderRadius: fs(32), background: "white", cursor: owned || !canAfford ? "default" : "pointer", opacity: 1, flex: "none" }}>
            <span style={{ position: "absolute", inset: `${fs(18)}px ${fs(18)}px ${fs(78)}px`, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", clipPath: "inset(0 round 12%)", filter: owned ? "grayscale(1) opacity(.55)" : "none" }}><StoreItemArt itemId={item.id} size={fs(isBackdrop ? 220 : tab === "outfit" ? 132 : 126)} /></span>
            <span style={{ position: "absolute", left: "50%", bottom: fs(20), transform: "translateX(-50%)", minWidth: fs(120), height: fs(61), padding: `0 ${fs(14)}px`, borderRadius: fs(40), background: owned ? "#eeeeee" : "#fff6dd", display: "flex", alignItems: "center", justifyContent: "center", gap: fs(10), color: "#333", fontSize: fs(30), whiteSpace: "nowrap" }}>{owned ? "Owned" : <><img src={storeCoin} alt="" style={{ width: fs(40), height: fs(40), objectFit: "contain" }} />{item.price}</>}</span>
          </motion.button>;
        })}
      </section>

      <nav style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: fs(2469), height: fs(327), background: "#a6ca72", clipPath: "polygon(0 7%,20% 12%,50% 18%,80% 13%,100% 8%,100% 100%,0 100%)" }}>
        {[{ x: 243, label: "Quests", screen: "questPage" as ScreenId, icon: <NavQuestIcon /> }, { x: 567, label: "Home", screen: "home" as ScreenId, icon: <NavHomeIcon /> }, { x: 903, label: "Bean profile", screen: "profile" as ScreenId, icon: <NavBeanIcon /> }].map((item) => <motion.button key={item.label} aria-label={item.label} whileTap={{ scale: .88 }} onClick={() => handleNav(item.screen)} style={{ position: "absolute", left: fs(item.x), top: fs(89), width: fs(187), height: fs(187), borderRadius: "50%", border: 0, background: "white", boxShadow: "0 2px 7px rgba(0,0,0,.12)", display: "grid", placeItems: "center", cursor: "pointer" }}><span style={{ position: "relative", width: fs(item.screen === "questPage" ? 106 : item.screen === "home" ? 111 : 121), height: fs(item.screen === "questPage" ? 121 : item.screen === "home" ? 114 : 105) }}>{item.icon}</span></motion.button>)}
      </nav>

      {state.tutorialStep === 16 && onboardingStoreItem && <div style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: "none" }}>
        <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} style={{ position: "absolute", left: 160, right: 16, top: 105, padding: "13px 14px", borderRadius: 19, background: "rgba(255,255,255,.4)", backdropFilter: "blur(5px)", border: "1px solid rgba(255,255,255,.55)", textAlign: "center", boxShadow: "0 7px 20px rgba(0,0,0,.12)" }}>
            <div style={{ width: 130, height: 130, margin: "0 auto 14px", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 20, background: "white" }}><StoreItemArt itemId={onboardingStoreItem.id} size={130} /></div>
        </motion.div>
      </div>}

      <AnimatePresence>
        {pendingPurchase && <div style={{ position: "absolute", zIndex: 110, inset: 0, background: "rgba(36,64,78,.48)", display: "grid", placeItems: "center", padding: 28 }} onClick={() => !purchasing && setPendingPurchase(null)}>
          <motion.div initial={{ scale: .84, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }} onClick={(event) => event.stopPropagation()} style={{ width: "100%", background: "#fff6dd", borderRadius: 30, padding: "24px 22px 20px", textAlign: "center", boxShadow: "0 18px 45px rgba(34,58,70,.25)" }}>
            <div style={{ width: 130, height: 130, margin: "0 auto 14px", display: "grid", placeItems: "center", overflow: "hidden", borderRadius: 20, background: "white" }}><StoreItemArt itemId={pendingPurchase.id} size={105} /></div>
            <h2 style={{ margin: 0, color: "#3c84ab", fontSize: 22, fontWeight: 800 }}>{pendingPurchase.cat === "background" ? "Purchase this backdrop?" : `Purchase ${pendingPurchase.name}?`}</h2>
            <p style={{ margin: "10px 0 18px", color: "#756d5a", fontSize: 14, display: "flex", justifyContent: "center", alignItems: "center", gap: 7 }}><img src={storeCoin} alt="" style={{ width: 28, height: 28 }} />{pendingPurchase.price} coins</p>
            {purchaseError && <p role="alert" style={{ margin: "0 0 12px", color: "#c34f5f", fontSize: 13 }}>{purchaseError}</p>}
            <div style={{ display: "flex", gap: 10 }}><button disabled={purchasing} onClick={() => setPendingPurchase(null)} style={{ flex: 1, border: "1px solid #dfd4b8", borderRadius: 100, background: "white", padding: 12, cursor: purchasing ? "default" : "pointer", color: "#615c4e", opacity: purchasing ? .6 : 1 }}>Cancel</button><button disabled={purchasing} onClick={() => buy(pendingPurchase)} style={{ flex: 1, border: 0, borderRadius: 100, background: CTA_YELLOW, color: "white", padding: 12, cursor: purchasing ? "wait" : "pointer", fontWeight: 800, opacity: purchasing ? .7 : 1 }}>{purchasing ? "Purchasing…" : "Purchase"}</button></div>
          </motion.div>
        </div>}
        {celebrating && <motion.div style={{ position: "absolute", zIndex: 100, inset: 0, overflow: "hidden", background: "linear-gradient(180deg,#66caff 0%,#9ddbfd 38.77%)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.button aria-label="Close purchase reward" onClick={() => setCelebrating(null)} whileTap={{ scale: .9 }} style={{ position: "absolute", zIndex: 20, right: fs(70), top: fs(105), width: fs(104), height: fs(104), border: 0, borderRadius: "50%", background: "rgba(255,255,255,.82)", color: "#3c84ab", fontSize: fs(65), lineHeight: 1, cursor: "pointer", boxShadow: "0 3px 10px rgba(32,84,108,.18)" }}>×</motion.button>
          <button aria-label="Settings" onClick={() => onNav("settings")} style={{ position: "absolute", zIndex: 7, left: fs(74), top: fs(145), width: fs(162), height: fs(163), border: 0, background: "transparent", color: "#3c84ab", cursor: "pointer", transform: "rotate(31deg)" }}><svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.95L14.37 2.8a.49.49 0 0 0-.49.4l-.36 2.51c-.59.24-1.13.56-1.64.95L5.16 5.3a.49.49 0 0 0-.61.22L2.63 8.84a.49.49 0 0 0 .12.64l2.03 1.58c-.05.31-.08.65-.08.94s.03.63.08.94l-2.03 1.58a.49.49 0 0 0-.12.64l1.92 3.32c.12.22.38.31.61.22l2.39-.96c.5.39 1.05.71 1.64.95l.36 2.51c.04.24.24.4.49.4h3.84c.25 0 .45-.16.49-.4l.36-2.51c.59-.24 1.13-.56 1.63-.95l2.39.96c.23.09.49 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.02-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" /></svg></button>
          <motion.div style={{ position: "absolute", left: fs(110), top: fs(415), width: fs(419), height: fs(209), borderRadius: "50%", background: "rgba(255,255,255,.28)" }} animate={{ x: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 10 }} />
          <motion.div style={{ position: "absolute", left: fs(792), top: fs(415), width: fs(628), height: fs(257), borderRadius: "50%", background: "rgba(255,255,255,.28)" }} animate={{ x: [0, -14, 0] }} transition={{ repeat: Infinity, duration: 12 }} />
          <motion.div style={{ position: "absolute", left: fs(755), top: fs(227), width: fs(271), height: fs(101), borderRadius: "50%", background: "rgba(255,255,255,.22)" }} animate={{ x: [0, 9, 0] }} transition={{ repeat: Infinity, duration: 9 }} />
          <div style={{ position: "absolute", left: fs(-19), top: fs(1082), width: fs(1328), height: fs(1803), borderRadius: "50% 50% 0 0 / 20% 20% 0 0", background: "radial-gradient(circle at 50% 5%,#fff5a7 0%,#e9eeaf 26%,#a9e4ef 58%,#70cdf9 100%)" }} />
          <motion.div initial={{ scale: .75, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 18 }} style={{ position: "absolute", zIndex: 4, left: fs(360), top: fs(879), width: fs(570), height: fs(478) }}><HomeStyleBean size={fs(570)} outfitId={state.equipped.outfit} faceId={state.equipped.face} float={false} /></motion.div>
          <div style={{ position: "absolute", zIndex: 5, left: fs(699), top: fs(591), width: fs(423), height: fs(189), borderRadius: "50%", background: "white", display: "grid", placeItems: "center", fontSize: fs(40) }}>Yay!<i style={{ position: "absolute", left: fs(30), bottom: fs(-20), width: fs(55), height: fs(50), background: "white", clipPath: "polygon(0 0,100% 0,0 100%)" }} /></div>
          <div style={{ position: "absolute", zIndex: 5, left: "50%", top: fs(1475), width: fs(229), height: fs(155), transform: "translateX(-50%)", display: "grid", placeItems: "center" }}><StoreItemArt itemId={celebrating.id} size={fs(155)} /></div>
          <h2 style={{ position: "absolute", zIndex: 5, left: fs(308), top: fs(1671), width: fs(673), margin: 0, textAlign: "center", color: "#1b6d93", fontSize: fs(48), lineHeight: 1.25, fontWeight: 800 }}>{celebrating.cat === "background" ? "You got a backdrop!" : `You got ${celebrating.name.toLowerCase().startsWith("a") ? "an" : "a"} ${celebrating.name.toLowerCase()}!`}</h2>
          <motion.button onClick={equipCelebratingItem} whileTap={{ scale: .92 }} style={{ position: "absolute", zIndex: 6, left: fs(539), top: fs(1870), width: fs(211), height: fs(68), border: 0, borderRadius: fs(64), background: "#fcb900", color: "white", fontSize: fs(40), cursor: "pointer" }}>Equip</motion.button>
        </motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────
function ProfileScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(state.beanName || "Bean");
  const [mood, setMood] = useState<BeanMoodState | null>(null);
  const [personality, setPersonality] = useState<BeanPersonalityState | null>(null);
  const [interests, setInterests] = useState<UserInterestSignal[]>([]);

  useEffect(() => {
    if (!backend.configured) return;
    let active = true;
    void Promise.all([backend.getBeanMood(), backend.getBeanPersonality(), backend.listUserInterests()])
      .then(([nextMood, nextPersonality, nextInterests]) => {
        if (!active) return;
        setMood(nextMood);
        setPersonality(nextPersonality);
        setInterests(nextInterests);
      })
      .catch(() => { /* The profile keeps its gentle defaults while offline. */ });
    return () => { active = false; };
  }, []);

  const handleNav = (s: ScreenId) => {
    if (s === "home" && state.tutorialStep === 5) setState((p) => ({ ...p, tutorialStep: 6 }));
    onNav(s);
  };

  const traits = [
    { left: "Practical", right: "Adventurous", y: 1357, dotX: 715.41, value: personality?.practicalAdventurous },
    { left: "Spontaneous", right: "Organized", y: 1468, dotX: 672.05, value: personality?.spontaneousOrganized },
    { left: "Reserved", right: "Social", y: 1579, dotX: 693.73, value: personality?.reservedSocial },
    { left: "Competitive", right: "Cooperative", y: 1690, dotX: 525.23, value: personality?.competitiveCooperative },
    { left: "Calm", right: "Passionate", y: 1801, dotX: 582.38, value: personality?.calmPassionate },
  ];
  const moodLabel = mood ? `${mood.mood[0].toUpperCase()}${mood.mood.slice(1)}` : "Content";
  const moodFaces: Record<string, { fill: string; eyes: string; mouth: string }> = {
    content: { fill: "#ed8bdc", eyes: "M35 59h1M95 59h1", mouth: "M52 82q14 13 28 0" },
    curious: { fill: "#a6ddf3", eyes: "M35 56h1M95 52h1", mouth: "M51 84q13-9 29 0" },
    excited: { fill: "#ffd65b", eyes: "M34 55l13 9-13 9M97 55l-13 9 13 9", mouth: "M49 81q16 19 33 0" },
    proud: { fill: "#b8dda0", eyes: "M35 59h1M95 59h1", mouth: "M50 81q15 15 31 0" },
    gentle: { fill: "#d5b9ec", eyes: "M34 60q7 6 14 0M83 60q7 6 14 0", mouth: "M52 81q14 10 28 0" },
    sleepy: { fill: "#9eb9dd", eyes: "M33 61q7 5 14 0M84 61q7 5 14 0", mouth: "M55 84q11-5 22 0" },
  };
  const moodFace = moodFaces[mood?.mood || "content"];
  const interestLabels = interests.slice(0, 2).map((interest) => interest.tag.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()));
  const personalityDotX = (trait: typeof traits[number]) => trait.value === undefined || trait.value === 0
    ? trait.dotX
    : Math.max(477, Math.min(811, trait.dotX + trait.value * 11));

  return (
    <motion.div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg,#66caff 0%,#9ddbfd 19.385%,#b9e7ff 38.77%)", fontFamily: "'Inter', sans-serif" }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div style={{ position: "absolute", zIndex: 1, left: 0, right: 0, top: fs(500), bottom: 0, background: "white" }} />
      <div aria-hidden style={{ position: "absolute", zIndex: 1, left: fs(-120), top: fs(370), width: fs(560), height: fs(300), borderRadius: "50%", background: "white" }} />
      <div aria-hidden style={{ position: "absolute", zIndex: 1, left: fs(385), top: fs(255), width: fs(520), height: fs(430), borderRadius: "50%", background: "white" }} />
      <div aria-hidden style={{ position: "absolute", zIndex: 1, left: fs(850), top: fs(370), width: fs(560), height: fs(300), borderRadius: "50%", background: "white" }} />
      <button aria-label="Settings" onClick={() => onNav("settings")} style={{ position: "absolute", zIndex: 12, top: fs(145), left: fs(74), width: fs(162), height: fs(163), border: 0, background: "transparent", color: "#3c84ab", cursor: "pointer", transform: "rotate(31deg)" }}><svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.95L14.37 2.8a.49.49 0 0 0-.49-.4h-3.84a.49.49 0 0 0-.49.4l-.36 2.51c-.59.24-1.13.56-1.64.95L5.16 5.3a.49.49 0 0 0-.61.22L2.63 8.84a.49.49 0 0 0 .12.64l2.03 1.58c-.05.31-.08.65-.08.94s.03.63.08.94l-2.03 1.58a.49.49 0 0 0-.12.64l1.92 3.32c.12.22.38.31.61.22l2.39-.96c.5.39 1.05.71 1.64.95l.36 2.51c.04.24.24.4.49.4h3.84c.25 0 .45-.16.49-.4l.36-2.51c.59-.24 1.13-.56 1.63-.95l2.39.96c.23.09.49 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.02-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" /></svg></button>

      <main style={{ position: "absolute", zIndex: 3, inset: 0 }}>
        <div style={{ position: "absolute", left: fs(430), top: fs(310), width: fs(430), display: "flex", justifyContent: "center" }}><HomeStyleBean size={fs(430)} outfitId={state.equipped.outfit} faceId={state.equipped.face} /></div>
        <h1 style={{ position: "absolute", left: fs(183), top: fs(701), width: fs(924), margin: 0, textAlign: "center", color: "#3c84ab", fontSize: fs(48), lineHeight: 1.2, fontWeight: 800 }}>{state.beanName || "Bean"} the Bean</h1>
        <button onClick={() => setRenaming(true)} style={{ position: "absolute", left: fs(490), top: fs(787), width: fs(314), height: fs(93), border: 0, borderRadius: fs(60), background: "rgba(238,238,238,.5)", color: "rgba(0,0,0,.5)", fontSize: fs(32), cursor: "pointer" }}>Rename Bean</button>

        <section style={{ position: "absolute", left: fs(128), top: fs(947), width: fs(1029), height: fs(205), background: "#fff6dd", borderRadius: fs(60) }}>
          <h2 style={{ position: "absolute", left: fs(44), top: fs(40), margin: 0, color: "#3c84ab", fontSize: fs(48), lineHeight: 1.2, fontWeight: 800 }}>Current Mood</h2>
          <p style={{ position: "absolute", left: fs(44), top: fs(110), margin: 0, fontSize: fs(36), lineHeight: 1.2 }}>{moodLabel}</p>
          <div aria-label={moodLabel} style={{ position: "absolute", left: fs(815), top: fs(28), width: fs(131), height: fs(131) }}><svg viewBox="0 0 131 131" width="100%" height="100%"><circle cx="65.5" cy="65.5" r="65.5" fill={moodFace.fill}/><path d={moodFace.eyes} fill="none" stroke="#111" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/><path d={moodFace.mouth} fill="none" stroke="#111" strokeWidth="6" strokeLinecap="round"/></svg></div>
        </section>

        <section style={{ position: "absolute", left: fs(132), top: fs(1208), width: fs(1029), height: fs(689), background: "#fff6dd", borderRadius: fs(60) }}>
          <h2 style={{ position: "absolute", left: fs(40), top: fs(44), margin: 0, color: "#3c84ab", fontSize: fs(48), lineHeight: 1.2, fontWeight: 800 }}>Personality</h2>
          {traits.map((trait) => <React.Fragment key={trait.left}>
            <span style={{ position: "absolute", left: fs(4), top: fs(trait.y - 1208), width: fs(297), textAlign: "right", fontSize: fs(40), lineHeight: 1.2 }}>{trait.left}</span>
            <span style={{ position: "absolute", left: fs(345), top: fs(trait.y - 1208 + 28), width: fs(334), height: fs(5), background: "#feb700" }} />
            <motion.i animate={{ left: fs(personalityDotX(trait) - 132) }} transition={{ type: "spring", stiffness: 120, damping: 18 }} style={{ position: "absolute", top: fs(trait.y - 1208 + 6), width: fs(44), height: fs(44), borderRadius: "50%", background: "#feb700" }} />
            <span style={{ position: "absolute", left: fs(719), top: fs(trait.y - 1208), width: fs(297), fontSize: fs(40), lineHeight: 1.2 }}>{trait.right}</span>
          </React.Fragment>)}
        </section>

        <section style={{ position: "absolute", left: fs(128), top: fs(1938), width: fs(1029), height: fs(308), background: "#fff6dd", borderRadius: fs(60) }}>
          <h2 style={{ position: "absolute", left: fs(44), top: fs(48), margin: 0, color: "#3c84ab", fontSize: fs(48), lineHeight: 1.2, fontWeight: 800 }}>Interests</h2>
          {interestLabels.length ? interestLabels.map((label, index) => <span key={label} style={{ position: "absolute", left: fs(44 + index * 329), top: fs(161), width: fs(291), height: fs(93), display: "grid", placeItems: "center", background: "rgba(255,255,255,.38)", color: "rgba(0,0,0,.5)", borderRadius: fs(60), fontSize: fs(32) }}>{label}</span>) : <span style={{ position: "absolute", left: fs(44), top: fs(161), width: fs(620), height: fs(93), display: "grid", placeItems: "center", background: "rgba(255,255,255,.38)", color: "rgba(0,0,0,.5)", borderRadius: fs(60), fontSize: fs(30) }}>Keep noticing to help Bean learn your likes</span>}
        </section>
        <p style={{ position: "absolute", left: fs(288), top: fs(2308), width: fs(711), margin: 0, textAlign: "center", fontSize: fs(36), lineHeight: 1.2 }}>What you share with Bean helps it grow its personality and likes. The more you notice, the more Bean learns!</p>
      </main>

      <nav style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: fs(2469), height: fs(327), background: "#a6ca72", clipPath: "polygon(0 7%, 20% 12%, 50% 18%, 80% 13%, 100% 8%, 100% 100%, 0 100%)" }}>
        {[{ x: 243, label: "Quests", screen: "questPage" as ScreenId, icon: <NavQuestIcon /> }, { x: 567, label: "Home", screen: "home" as ScreenId, icon: <NavHomeIcon /> }, { x: 903, label: "Bean profile", screen: "profile" as ScreenId, icon: <NavBeanIcon /> }].map((item) => <motion.button key={item.label} aria-label={item.label} whileTap={{ scale: .88 }} onClick={() => handleNav(item.screen)} style={{ position: "absolute", left: fs(item.x), top: fs(89), width: fs(187), height: fs(187), borderRadius: "50%", border: 0, background: "white", boxShadow: item.screen === "profile" ? "inset 0 3px 7px rgba(0,0,0,.2),0 2px 7px rgba(0,0,0,.12)" : "0 2px 7px rgba(0,0,0,.12)", display: "grid", placeItems: "center", cursor: "pointer" }}><span style={{ position: "relative", width: fs(item.screen === "questPage" ? 106 : item.screen === "home" ? 111 : 121), height: fs(item.screen === "questPage" ? 121 : item.screen === "home" ? 114 : 105) }}>{item.icon}</span></motion.button>)}
      </nav>
      <AnimatePresence>
        {renaming && (
          <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(11,50,75,.58)", display: "grid", placeItems: "center", padding: 24 }} onClick={() => setRenaming(false)}>
            <motion.div initial={{ scale: .88, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .9, opacity: 0 }} onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", background: "white", borderRadius: 26, padding: 22, boxShadow: "0 18px 50px rgba(0,0,0,.24)" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}><HomeStyleBean size={105} outfitId={state.equipped.outfit} faceId={state.equipped.face} float={false} /></div>
              <h3 style={{ textAlign: "center", color: BLUE_TEXT, fontSize: 20, fontWeight: 800 }}>Give Bean a new Earth name</h3>
              <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} autoFocus maxLength={24}
                style={{ width: "100%", marginTop: 14, padding: "12px 14px", border: "1.5px solid #9ec9df", borderRadius: 14, textAlign: "center", fontWeight: 700, color: "#263b4a" }} />
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button onClick={() => setRenaming(false)} style={{ flex: 1, padding: 11, borderRadius: 100, border: "1px solid #d8e0e5", background: "white", cursor: "pointer" }}>Cancel</button>
                <button onClick={() => { if (nameDraft.trim()) { setState((s) => ({ ...s, beanName: nameDraft.trim() })); setRenaming(false); } }}
                  style={{ flex: 1, padding: 11, borderRadius: 100, border: 0, background: CTA_YELLOW, color: "white", fontWeight: 800, cursor: "pointer" }}>Save name</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Past Moments / Time Capsule ──────────────────────────────────────────────
function LegacyPastMomentsScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [selDay, setSelDay] = useState<number | null>(null);

  const handleNav = (s: ScreenId) => {
    if (s === "home" && state.tutorialStep === 11) setState((p) => ({ ...p, tutorialStep: 12 }));
    onNav(s);
  };

  const memories: Record<number, { emoji: string; text: string; category: string }> = {
    1: { emoji: "☀️", text: "The morning light on my desk was beautiful.", category: "Light" },
    3: { emoji: "🎵", text: "A bird kept singing the same four notes.", category: "Sound" },
    5: { emoji: "🌿", text: "My windowsill plant grew a new leaf!", category: "Nature" },
    ...(state.questText ? { 7: { emoji: "🌱", text: state.questText, category: "Moment" } } : {}),
  };

  return (
    <InnerScreen active="pastMoments" onNav={handleNav} beanExpr="wondering" outfitId={state.equipped.outfit} faceId={state.equipped.face}
      beanLabel="Your memories live here 💫">
      <p style={{ fontWeight: 800, fontSize: 20, color: BLUE_TEXT, textAlign: "center", marginBottom: 14 }}>
        Time Capsule
      </p>

      {/* Week header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <p style={{ fontWeight: 800, fontSize: 15, color: "#1a1a1a" }}>This Week</p>
        <span style={{ background: "#dbeafe", color: "#1d4ed8", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>Week 1</span>
      </div>

      {/* Calendar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 8, marginBottom: 14 }}>
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center" }}>
            <p style={{ fontSize: 10, color: "#9ca3af", marginBottom: 6 }}>{d}</p>
            <motion.div
              onClick={() => setSelDay(selDay === i + 1 ? null : (memories[i + 1] ? i + 1 : null))}
              style={{
                aspectRatio: "1", borderRadius: 12,
                background: selDay === i + 1 ? BLUE_TEXT : memories[i + 1] ? "rgba(254,183,0,0.18)" : "#f9fafb",
                border: `2px solid ${selDay === i + 1 ? BLUE_TEXT : "transparent"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: memories[i + 1] ? "pointer" : "default", fontSize: 16,
              }}
              whileTap={memories[i + 1] ? { scale: 0.88 } : {}}>
              {memories[i + 1] ? memories[i + 1].emoji : <span style={{ fontSize: 10, color: "#d1d5db" }}>{i + 1}</span>}
            </motion.div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selDay && memories[selDay] && (
          <motion.div
            style={{ border: "1.5px solid #fde68a", background: "#fffbeb", borderRadius: 16, padding: "12px 14px", marginBottom: 14 }}
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 22 }}>{memories[selDay].emoji}</span>
              <span style={{ fontSize: 11, background: "#fde68a", color: "#92400e", padding: "2px 8px", borderRadius: 20, fontWeight: 700 }}>{memories[selDay].category}</span>
            </div>
            <p style={{ fontSize: 13, color: "#374151", fontStyle: "italic" }}>&ldquo;{memories[selDay].text}&rdquo;</p>
          </motion.div>
        )}
      </AnimatePresence>

      <p style={{ fontWeight: 700, color: "#1a1a1a", marginBottom: 8, fontSize: 14 }}>Memory Categories</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {[["☀️","Light"],["🌿","Nature"],["🎵","Sound"],["🫂","People"],["🍎","Food"],["✨","Surprise"]].map(([e,c]) => (
          <span key={c} style={{ display: "flex", alignItems: "center", gap: 5, background: "#f3f4f6", padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, color: "#555" }}>
            {e} {c}
          </span>
        ))}
      </div>

      {/* Week capsule card */}
      <div style={{ borderRadius: 20, overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.08)", marginBottom: 8 }}>
        <div style={{ padding: "14px 16px", background: "linear-gradient(135deg, #0b5c87, #9DC072)" }}>
          <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Week 1 Time Capsule</p>
          <h4 style={{ color: "white", fontWeight: 800, fontSize: 15 }}>Happy things you noticed</h4>
        </div>
        <div style={{ background: "white", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
          {Object.values(memories).map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 18 }}>{m.emoji}</span>
              <p style={{ fontSize: 13, color: "#374151", lineHeight: 1.45 }}>&ldquo;{m.text}&rdquo;</p>
            </div>
          ))}
        </div>
      </div>
    </InnerScreen>
  );
}

function NativePastMomentsScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [showRewindNotice, setShowRewindNotice] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthName = new Intl.DateTimeFormat("en-US", { month: "long" }).format(now);
  const observations = state.observations.filter((item) => { const date = new Date(item.createdAt); return date.getFullYear() === year && date.getMonth() === month; });
  const dayFor = (item: Observation) => new Date(item.createdAt).getDate();
  const observationDays = new Set(observations.map(dayFor));
  const selectedObservations = observations.filter((item) => dayFor(item) === selectedDay);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  const activeDays = new Set(state.observations.map((item) => dayKey(new Date(item.createdAt))));
  let streak = 0; const cursor = new Date(year, month, now.getDate());
  while (activeDays.has(dayKey(cursor))) { streak += 1; cursor.setDate(cursor.getDate() - 1); }
  const handleNav = (screen: ScreenId) => { if (screen === "home" && state.tutorialStep === 20) setState((current) => ({ ...current, tutorialStep: 21 })); onNav(screen); };

  return <Screen>
    <div style={{ position: "absolute", inset: "0 0 76px", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", background: "linear-gradient(#68cafa 0 130px,white 210px)", fontFamily: "Inter,sans-serif" }}>
      <button aria-label="Open settings" onClick={() => handleNav("settings")} style={{ position: "absolute", left: 25, top: 40, border: 0, background: "transparent", color: "#3c84ab", fontSize: 34, cursor: "pointer" }}>⚙</button>
      <div style={{ padding: "185px 26px 40px" }}>
        <h2 style={{ color: "#3285ad", fontSize: 20 }}>Capsule</h2>
        <section style={{ background: "#fff6dd", borderRadius: 20, padding: 16, marginTop: 18, display: "grid", gridTemplateColumns: "1fr 120px", alignItems: "center" }}><div><b style={{ color: "#3285ad" }}>Current streak</b><div style={{ marginTop: 14, borderRadius: 22, background: CTA_YELLOW, color: "white", fontSize: 20, padding: "20px 8px", textAlign: "center" }}>{streak} {streak === 1 ? "Day" : "Days"}</div></div><motion.div animate={{ rotate: [-5, 5, -5], scale: [1, 1.08, 1] }} transition={{ duration: 2.8, repeat: Infinity }} style={{ fontSize: 90, textAlign: "center" }}>⭐</motion.div></section>
        <motion.button whileTap={{ scale: .97 }} onClick={() => setShowRewindNotice(true)} style={{ display: "block", width: "86%", margin: "18px auto 25px", border: 0, borderRadius: 100, background: CTA_YELLOW, color: "white", padding: 13, fontSize: 18, fontWeight: 800, cursor: "pointer" }}>Month Rewind</motion.button>
        {showRewindNotice && <div role="status" style={{ margin: "-12px auto 22px", maxWidth: 300, padding: "12px 14px", borderRadius: 18, background: "#e7f6ed", color: "#287a51", fontSize: 13, lineHeight: 1.4, textAlign: "center" }}>Bean’s {monthName} rewind will be ready at the end of the month. Keep noticing and we’ll look back together.</div>}
        <section style={{ background: "#fff6dd", borderRadius: 20, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#3285ad", fontWeight: 800 }}><span>{state.userName || "Your"}’s Calendar</span><span style={{ color: "#888", fontWeight: 400 }}>{monthName} {year}</span></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, margin: "18px 0 12px", fontSize: 10, textAlign: "center", color: "#71807f" }}>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <span key={day}>{day}</span>)}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 6, fontSize: 12, textAlign: "center" }}>{Array.from({ length: firstWeekday }, (_, index) => <span key={`blank-${index}`} />)}{Array.from({ length: daysInMonth }, (_, index) => { const day = index + 1; const hasObservation = observationDays.has(day); const isSelected = selectedDay === day; return <button key={day} onClick={() => setSelectedDay(day)} style={{ minHeight: 30, border: 0, borderRadius: 15, background: isSelected ? CTA_YELLOW : hasObservation ? "#f6a44a" : "transparent", color: isSelected ? "white" : "#33434d", fontWeight: isSelected || hasObservation ? 800 : 400, cursor: "pointer" }}>{day}</button>; })}</div>
          <p style={{ margin: "16px 0 8px", color: "#71807f", fontSize: 11 }}>Gold is the day you selected. Orange days hold a moment with Bean.</p>
          {selectedObservations.length ? selectedObservations.map((memory, index) => <motion.article key={memory.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .08 }} style={{ borderTop: "2px dashed #b7aa88", padding: "13px 0" }}><small style={{ color: "#8a8a8a" }}>{new Date(memory.createdAt).toLocaleDateString()}</small><p style={{ color: "#3285ad", fontWeight: 800, fontSize: 12, margin: "8px 0" }}>{memory.prompt}</p><p style={{ margin: "0 0 8px", color: "#46534d", fontSize: 13, lineHeight: 1.45 }}>“{memory.text}”</p><span style={{ background: "white", borderRadius: 20, padding: "5px 10px", fontSize: 11 }}>{memory.emoji} {memory.category}</span>{memory.media?.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>{memory.media.map((media, mediaIndex) => media.kind === "photo" ? <button key={`${memory.id}-${mediaIndex}`} aria-label="Open saved photo" onClick={() => setExpandedPhoto(media.url)} style={{ width: 74, height: 74, padding: 0, border: "2px solid white", borderRadius: 14, overflow: "hidden", background: "#e5eef1", cursor: "pointer" }}><img src={media.url} alt="Saved moment" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></button> : <div key={`${memory.id}-${mediaIndex}`} style={{ minWidth: 190, padding: "9px 10px", borderRadius: 14, background: "white" }}><b style={{ display: "block", marginBottom: 6, color: "#3285ad", fontSize: 12 }}>Voice memo</b><audio controls preload="metadata" src={media.url} style={{ width: "100%", height: 30 }} /></div>)}</div> : null}</motion.article>) : <p style={{ margin: "20px 0 4px", color: "#71807f", fontSize: 13, textAlign: "center" }}>No moments saved on this day yet.</p>}
        </section>
      </div>
    </div>
    {expandedPhoto && <div role="dialog" aria-modal="true" aria-label="Saved photo" onClick={() => setExpandedPhoto(null)} style={{ position: "absolute", inset: 0, zIndex: 80, display: "grid", placeItems: "center", padding: 18, background: "rgba(15,28,42,.88)", cursor: "zoom-out" }}><img src={expandedPhoto} alt="Saved moment enlarged" style={{ maxWidth: "100%", maxHeight: "88%", borderRadius: 18, objectFit: "contain", boxShadow: "0 12px 40px rgba(0,0,0,.45)" }} /><button aria-label="Close photo" onClick={() => setExpandedPhoto(null)} style={{ position: "absolute", top: 22, right: 22, width: 38, height: 38, border: 0, borderRadius: "50%", background: "white", color: "#3285ad", fontSize: 25 }}>×</button></div>}
    <AppNavBar active="pastMoments" onNav={handleNav} />
  </Screen>;
}

const EXACT_REWIND_FRAMES = [capsuleRewind1, capsuleRewind2, capsuleRewind3, capsuleRewind4, capsuleRewind5];

function PastMomentsScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [rewindPage, setRewindPage] = useState<number | null>(null);
  const handleNav = (screen: ScreenId) => {
    if (screen === "home" && state.tutorialStep === 20) setState((current) => ({ ...current, tutorialStep: 21 }));
    onNav(screen);
  };

  if (rewindPage !== null) return <Screen>
    <motion.img key={rewindPage} src={EXACT_REWIND_FRAMES[rewindPage]} alt={`Month Rewind page ${rewindPage + 1}`} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill" }} />
    <button aria-label="Settings" onClick={() => handleNav("settings")} style={{ position: "absolute", left: fs(74), top: fs(145), width: fs(162), height: fs(163), border: 0, background: "transparent", cursor: "pointer" }} />
    <motion.button aria-label={rewindPage ? "Previous page" : "Back to Capsule"} whileTap={{ scale: .86 }} onClick={() => rewindPage === 0 ? setRewindPage(null) : setRewindPage(rewindPage - 1)} style={{ position: "absolute", left: fs(50), bottom: fs(70), width: fs(180), height: fs(210), border: 0, background: "transparent", cursor: "pointer" }} />
    <motion.button aria-label={rewindPage === 4 ? "Back to Capsule" : "Next page"} whileTap={{ scale: .86 }} onClick={() => rewindPage === 4 ? setRewindPage(null) : setRewindPage(rewindPage + 1)} style={{ position: "absolute", right: fs(50), bottom: fs(70), width: fs(180), height: fs(210), border: 0, background: "transparent", cursor: "pointer" }} />
  </Screen>;

  return <Screen>
    <div style={{ position: "absolute", inset: "0 0 99px", overflowY: "auto", overflowX: "hidden", WebkitOverflowScrolling: "touch", background: "white" }}>
      <div style={{ position: "relative", width: "100%", height: fs(3169), overflow: "hidden" }}>
        <img src={capsuleHomeFrame} alt="Capsule" style={{ position: "absolute", inset: 0, width: "100%", height: fs(3496), display: "block" }} />
        <button aria-label="Settings" onClick={() => handleNav("settings")} style={{ position: "absolute", left: fs(74), top: fs(145), width: fs(162), height: fs(163), border: 0, background: "transparent", cursor: "pointer" }} />
        <motion.button aria-label="Month Rewind" whileTap={{ scale: .98 }} onClick={() => setRewindPage(0)} style={{ position: "absolute", left: fs(180), top: fs(1340), width: fs(930), height: fs(170), border: 0, borderRadius: 100, background: "transparent", cursor: "pointer" }} />
      </div>
    </div>
    <div style={{ position: "absolute", zIndex: 50, left: 0, right: 0, bottom: 0, height: 99 }}>
      <img src={capsuleNavFrame} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} />
      <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 18, background: "#a5c873" }} />
      <button aria-label="Quests" onClick={() => handleNav("questPage")} style={{ position: "absolute", left: fs(243), top: fs(74), width: fs(187), height: fs(187), border: 0, borderRadius: "50%", background: "transparent", cursor: "pointer" }} />
      <button aria-label="Home" onClick={() => handleNav("home")} style={{ position: "absolute", left: fs(567), top: fs(78), width: fs(187), height: fs(187), border: 0, borderRadius: "50%", background: "transparent", cursor: "pointer" }} />
      <button aria-label="Bean profile" onClick={() => handleNav("profile")} style={{ position: "absolute", left: fs(903), top: fs(79), width: fs(187), height: fs(187), border: 0, borderRadius: "50%", background: "transparent", cursor: "pointer" }} />
    </div>
  </Screen>;
}

// ─── Settings / connected context ────────────────────────────────────────────
function SettingsScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [connecting, setConnecting] = useState<keyof AppState["connections"] | null>(null);
  const connections = [
    { id: "calendar" as const, icon: "📅", title: "Calendar", detail: "Events, exams, appointments" },
    { id: "health" as const, icon: "♥", title: "Health", detail: "Sleep, activity, mindful minutes" },
    { id: "notifications" as const, icon: "🔔", title: "Notifications", detail: "Timely notes from Bean" },
  ];
  const toggle = async (id: keyof AppState["connections"]) => {
    if (connecting) return;
    setConnecting(id);
    try {
      if (state.connections[id]) {
        if (id !== "notifications") {
          await disconnectDeviceContext();
          if (backend.configured) {
            const contexts = await backend.listDerivedContexts();
            const kinds = id === "calendar" ? new Set(["exam","deadline","appointment","birthday","travel","important"]) : new Set(["activity_trend","sleep_trend","mindful_trend"]);
            await Promise.all(contexts.filter((context) => kinds.has(context.kind)).map((context) => backend.deleteDerivedContext(context.id)));
          }
        } else if (backend.configured) {
          const current = await backend.getNotificationPreferences();
          if (current) await backend.saveNotificationPreferences({ ...current, dailyPromptEnabled: false, bloomEnabled: false, calendarEncouragementEnabled: false });
        }
        setState((s) => ({ ...s, connections: { ...s.connections, [id]: false } }));
        return;
      }
      if (id === "calendar") {
        const ok = window.confirm("Bean will look at upcoming events on this iPhone only to create gentle labels like exam, deadline, or birthday. Event titles, notes, people, and locations stay on your device. Continue?");
        if (!ok) return;
        const result = await connectCalendar();
        if (!result.granted) throw new Error("Calendar access was not enabled. You can change this later in iPhone Settings.");
        if (backend.configured) await Promise.all(result.contexts.map((context) => backend.saveDerivedContext(context)));
        await Promise.all(result.contexts.map((context) => scheduleLocalContextMessage(context, state.beanName || "Bean")));
      } else if (id === "health") {
        const ok = window.confirm("Bean will ask for broad activity, sleep, and mindful-minute trends. Exact Health values stay in HealthKit and Bean will not give medical advice. Continue?");
        if (!ok) return;
        const result = await connectHealth();
        if (!result.granted) throw new Error("Health access was not enabled. Bean works normally without it.");
        if (backend.configured) await Promise.all(result.contexts.map((context) => backend.saveDerivedContext(context)));
      } else {
        const ok = window.confirm("Bean will ask iOS for permission to send daily prompts and bloom notes. You can turn each notification type off later. Continue?");
        if (!ok) return;
        const result = await connectNotifications(async (token) => { if (backend.configured) await backend.registerDevice({ apnsToken: token, appVersion: "0.1.0" }); });
        if (!result.granted) throw new Error("Notifications were not enabled. You can change this later in iPhone Settings.");
        if (backend.configured) {
          const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
          await backend.saveNotificationPreferences({ dailyPromptEnabled: true, bloomEnabled: true, calendarEncouragementEnabled: false, dailyWindowStart: "18:00", dailyWindowEnd: "20:00", quietHoursStart: "21:00", quietHoursEnd: "08:00", timezone });
        }
      }
      setState((s) => ({ ...s, connections: { ...s.connections, [id]: true }, syncError: "" }));
    } catch (reason) {
      setState((s) => ({ ...s, syncError: reason instanceof Error ? reason.message : "Bean couldn't connect that service." }));
    } finally { setConnecting(null); }
  };
  const exportData = async () => {
    try {
      const data = backend.configured ? await backend.exportAccount() : { exportedAt: new Date().toISOString(), profile: { userName: state.userName, beanName: state.beanName }, observations: state.observations, seeds: state.memorySeeds, gardenPlacements: state.gardenPlacements };
      const href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = href; link.download = `bean-memories-${new Date().toISOString().slice(0,10)}.json`; link.click();
      URL.revokeObjectURL(href);
    } catch (reason) { setState((s) => ({ ...s, syncError: reason instanceof Error ? reason.message : "Bean couldn't prepare your export." })); }
  };
  const deleteData = async () => {
    if (!window.confirm("Permanently delete your Bean account, memories, garden, and media? This cannot be undone.")) return;
    try {
      if (backend.configured) await backend.deleteAccount();
      window.localStorage.removeItem(STORAGE_KEY);
      setState(INIT);
      onNav("o1");
    } catch (reason) { setState((s) => ({ ...s, syncError: reason instanceof Error ? reason.message : "Bean couldn't delete the account." })); }
  };
  const resetPreview = async () => {
    if (!window.confirm("Reset the local preview and restart from the first onboarding screen?")) return;
    try {
      if (backend.configured) await backend.resetProgressForTesting();
      window.localStorage.removeItem(STORAGE_KEY);
      window.location.assign(`${window.location.pathname}?reset=1`);
    } catch (reason) {
      setState((s) => ({ ...s, syncError: reason instanceof Error ? reason.message : "Bean couldn't reset the test progress." }));
    }
  };
  return (
    <InnerScreen active="settings" onNav={onNav} beanExpr="curious" outfitId={state.equipped.outfit} faceId={state.equipped.face} beanLabel="You choose what I can learn ✨">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button onClick={() => onNav("home")} style={{ border: 0, background: "#eef5f8", borderRadius: "50%", width: 36, height: 36, cursor: "pointer" }} aria-label="Back home">←</button>
        <h2 style={{ color: BLUE_TEXT, fontSize: 21, fontWeight: 800 }}>Settings</h2><span style={{ width: 36 }} />
      </div>
      <div style={{ background: "linear-gradient(135deg,#eff8ff,#fff8d8)", padding: 16, borderRadius: 20, marginBottom: 14 }}>
        <p style={{ color: BLUE_TEXT, fontWeight: 800, fontSize: 15, marginBottom: 5 }}>Help Bean understand your days</p>
        <p style={{ color: "#52616b", fontSize: 12, lineHeight: 1.5 }}>These are private prototype connections. You can turn each one off at any time.</p>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {connections.map((item) => <div key={item.id} style={{ display: "grid", gridTemplateColumns: "42px 1fr auto", gap: 10, alignItems: "center", background: "white", border: "1px solid #d9e6eb", borderRadius: 17, padding: 12 }}>
          <span style={{ width: 42, height: 42, display: "grid", placeItems: "center", borderRadius: 13, background: item.id === "health" ? "#ffe5ef" : item.id === "calendar" ? "#e7f4ff" : "#fff2c8", fontSize: 20 }}>{item.icon}</span>
          <div><strong style={{ display: "block", color: "#263b4a", fontSize: 14 }}>{item.title}</strong><small style={{ color: "#77848c", fontSize: 11 }}>{item.detail}</small></div>
          <button disabled={connecting === item.id} onClick={() => void toggle(item.id)} aria-label={`${state.connections[item.id] ? "Disconnect" : "Connect"} ${item.title}`} aria-pressed={state.connections[item.id]}
            style={{ width: 51, height: 29, padding: 3, border: 0, borderRadius: 100, background: state.connections[item.id] ? "#66b87a" : "#d8dfe3", cursor: "pointer" }}>
            <span style={{ display: "block", width: 23, height: 23, borderRadius: "50%", background: "white", transform: `translateX(${state.connections[item.id] ? 22 : 0}px)`, transition: "transform .2s" }} />
          </button>
        </div>)}
      </div>
      <div style={{ marginTop: 16, background: "#f4e9fa", borderRadius: 18, padding: 15 }}>
        <p style={{ color: "#744d84", fontSize: 11, fontWeight: 800, marginBottom: 6 }}>MESSAGE PREVIEW</p>
        <p style={{ color: "#4c4150", fontSize: 13, lineHeight: 1.5, fontStyle: "italic" }}>
          {state.connections.calendar ? `“Good luck on your exam tomorrow, ${state.userName || "friend"}. I know you’ll do great!”` : "Connect Calendar to preview timely encouragement from Bean."}
        </p>
      </div>
      <div style={{ marginTop: 14, background: "white", border: "1px solid #d9e6eb", borderRadius: 18, padding: 14 }}>
        <p style={{ color: "#263b4a", fontWeight: 800, fontSize: 14 }}>Account & privacy</p>
        <p style={{ color: "#77848c", fontSize: 11, lineHeight: 1.45, margin: "4px 0 11px" }}>{state.accountLinked ? "Your memories are connected to your verified account." : "You are exploring anonymously. Link an email or phone to recover your memories on another device."}</p>
        <div style={{ display: "grid", gap: 8 }}>
          {!state.accountLinked && <button onClick={() => onNav("account")} style={{ border: 0, borderRadius: 12, padding: 10, background: CTA_YELLOW, color: "white", fontWeight: 800, cursor: "pointer" }}>Link email or phone</button>}
          <button onClick={exportData} style={{ border: "1px solid #b9cbd3", borderRadius: 12, padding: 10, background: "#f7fbfc", color: BLUE_TEXT, fontWeight: 800, cursor: "pointer" }}>Export my data</button>
          {import.meta.env.DEV && <button onClick={resetPreview} style={{ border: "1px dashed #d4a24a", borderRadius: 12, padding: 10, background: "#fff9e9", color: "#956716", fontWeight: 800, cursor: "pointer" }}>↻ Reset onboarding test</button>}
          <button onClick={deleteData} style={{ border: "1px solid #f0c2c2", borderRadius: 12, padding: 10, background: "#fff6f6", color: "#a83232", fontWeight: 800, cursor: "pointer" }}>Delete my account</button>
        </div>
      </div>
      {state.syncError && <p role="status" style={{ color: "#9a5b28", background: "#fff5e8", borderRadius: 12, padding: 10, fontSize: 10, lineHeight: 1.4, marginTop: 10 }}>Offline note: {state.syncError}</p>}
      <p style={{ color: "#8b969c", fontSize: 10, lineHeight: 1.45, marginTop: 12, textAlign: "center" }}>Calendar titles and exact Health data stay on this iPhone. Bean stores only the gentle context you approve.</p>
    </InnerScreen>
  );
}

// ─── Pod / Bean home customization ───────────────────────────────────────────
function BeanHomeScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [category, setCategory] = useState<"outfit" | "background">("outfit");
  const customBackdrop = BACKDROP_ASSETS[state.equipped.background];
  const owned = ITEMS.filter((item) => item.cat === category && item.id !== "starlight" && (item.id === "meadow" || Boolean(state.storeItems[item.id])));
  const leavePod = () => {
    if (state.tutorialStep === 18) setState((current) => ({ ...current, tutorialStep: 19 }));
    onNav("home");
  };
  const equip = (item: typeof ITEMS[number]) => {
    if (item.cat === "outfit") {
      const slot = outfitSlotFor(item.id);
      const key = slot === "head" ? "outfit" : "face";
      const next = state.equipped[key] === item.id ? "none" : item.id;
      setState((current) => ({ ...current, equipped: { ...current.equipped, [key]: next } }));
      if (backend.configured && !import.meta.env.DEV) void backend.equipItem(slot === "head" ? "outfit" : "face", next).catch((reason) => setState((current) => ({ ...current, syncError: reason instanceof Error ? reason.message : "Bean couldn't save that outfit." })));
    } else {
      setState((current) => ({ ...current, equipped: { ...current.equipped, background: item.id } }));
      if (backend.configured) void backend.equipItem("backdrop", item.id).catch((reason) => setState((current) => ({ ...current, syncError: reason instanceof Error ? reason.message : "Bean couldn't save that backdrop." })));
    }
  };
  return (
    <motion.div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: "'Inter',sans-serif", background: customBackdrop ? `url(${customBackdrop}) center / cover no-repeat` : "transparent" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {!customBackdrop && <PodDefaultBackdrop />}
      <button onClick={leavePod} aria-label="Close Bean's home" style={{ position: "absolute", top: 30, left: 22, zIndex: 45, width: 48, height: 48, border: 0, background: "transparent", color: "#3c84ab", cursor: "pointer" }}><svg viewBox="0 0 24 24" width="100%" height="100%" fill="currentColor"><path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.2 7.2 0 0 0-1.63-.95L14.37 2.8a.49.49 0 0 0-.49-.4h-3.84a.49.49 0 0 0-.49.4l-.36 2.51c-.59.24-1.13.56-1.64.95L5.16 5.3a.49.49 0 0 0-.61.22L2.63 8.84a.49.49 0 0 0 .12.64l2.03 1.58c-.05.31-.08.65-.08.94s.03.63.08.94l-2.03 1.58a.49.49 0 0 0-.12.64l1.92 3.32c.12.22.38.31.61.22l2.39-.96c.5.39 1.05.71 1.64.95l.36 2.51c.04.24.24.4.49.4h3.84c.25 0 .45-.16.49-.4l.36-2.51c.59-.24 1.13-.56 1.63-.95l2.39.96c.23.09.49 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.02-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8a3.5 3.5 0 0 1 0 7.5Z" /></svg></button>
      <div style={{ position: "absolute", zIndex: 4, top: fs(1108), left: "50%", width: fs(433), height: fs(363), transform: "translateX(-50%)", display: "grid", placeItems: "center" }}><HomeStyleBean size={fs(433)} outfitId={state.equipped.outfit} faceId={state.equipped.face} /></div>
      <div style={{ position: "absolute", zIndex: 8, left: fs(-53), right: fs(-41), top: fs(1611), bottom: fs(107), borderRadius: `${fs(96)}px ${fs(96)}px 0 0`, background: "#fff6dd" }}>
        <div style={{ position: "absolute", left: fs(85), top: fs(-92), display: "flex", alignItems: "end" }}>
          {(["outfit", "background"] as const).map((tab) => <button key={tab} onClick={() => setCategory(tab)} style={{ width: fs(tab === "outfit" ? 238 : 272), height: fs(120), border: 0, borderRadius: `${fs(8)}px ${fs(8)}px 0 0`, background: category === tab ? "#fff6dd" : "#feecba", color: category === tab ? "#111" : "rgba(0,0,0,.5)", fontSize: fs(40), cursor: "pointer" }}>{tab === "outfit" ? "Wardrobe" : "Backdrops"}</button>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(3, ${fs(280)}px)`, justifyContent: "center", alignContent: "start", gap: `${fs(61)}px ${fs(85)}px`, height: "100%", overflowY: "auto", padding: `${fs(58)}px ${fs(100)}px`, boxSizing: "border-box" }}>
          {owned.map((item) => {
            const active = state.equipped.outfit === item.id || state.equipped.face === item.id || state.equipped.background === item.id;
            const isBackdrop = item.cat === "background";
            return <button key={item.id} aria-label={isBackdrop ? "Owned backdrop" : item.name} onClick={() => equip(item)} style={{ position: "relative", width: fs(280), height: fs(280), border: active ? `${fs(8)}px solid ${CTA_YELLOW}` : 0, borderRadius: fs(30), background: isBackdrop ? "rgba(255,255,255,.1)" : "white", cursor: "pointer", overflow: "hidden", clipPath: "inset(0 round 11%)", padding: 0 }}><StoreItemArt itemId={item.id} size={isBackdrop ? fs(280) : fs(132)} />{active && <span style={{ position: "absolute", left: "50%", bottom: fs(10), transform: "translateX(-50%)", color: "rgba(0,0,0,.5)", fontSize: fs(28), whiteSpace: "nowrap" }}>Equipped</span>}</button>;
          })}
          {!owned.length && <button onClick={() => onNav("store")} style={{ gridColumn: "1/-1", border: 0, borderRadius: 28, background: "white", padding: 20, color: BLUE_TEXT, fontWeight: 800, cursor: "pointer" }}>Visit the Store</button>}
        </div>
      </div>
      <AppNavBar active="home" onNav={(screen) => screen === "home" ? leavePod() : onNav(screen)} />
    </motion.div>
  );
}

// ─── Editable garden studio and memory-flower collection ────────────────────
const GARDEN_SLOTS = [
  { left: 65, top: 267 }, { left: 148, top: 267 }, { left: 230, top: 267 }, { left: 313, top: 267 },
  { left: 63, top: 340 }, { left: 146, top: 340 }, { left: 229, top: 340 }, { left: 311, top: 340 },
  { left: 230, top: 412 }, { left: 313, top: 412 }, { left: 230, top: 486 }, { left: 313, top: 486 },
  { left: 230, top: 559 }, { left: 313, top: 559 },
];

const FLOWER_CATALOG = [
  { name: "Daisy", src: flowerDaisy }, { name: "Tulip", src: flowerTulip },
  { name: "Morning Glory", src: flowerMorningGlory }, { name: "Marigold", src: flowerMarigold },
  { name: "Peony", src: flowerPeony }, { name: "Bluebell", src: flowerBluebell },
  { name: "Lavender", src: flowerLavender }, { name: "Sunflower", src: flowerSunflower },
  { name: "Iris", src: flowerIris },
];
const GARDEN_BEAN_ID = "bean-character";

function flowerIndexForObservation(memory: Observation) {
  const classifiedIndex = ["daisy","tulip","morning-glory","marigold","peony","bluebell","lavender","sunflower","iris"].indexOf(memory.flowerSpeciesId || "");
  if (classifiedIndex >= 0) return classifiedIndex;
  if (memory.category === "Light") return 7;
  if (memory.category === "Sound") return 5;
  if (memory.category === "Color") return 1;
  if (memory.category === "Nature") return 0;
  return [...memory.id].reduce((total, character) => total + character.charCodeAt(0), 0) % FLOWER_CATALOG.length;
}

function MemoryFlower({ emoji = "🌸", selected = false, delay = 0 }: { emoji?: string; selected?: boolean; delay?: number }) {
  const reduceMotion = useReducedMotion();
  return <motion.span style={{ display: "grid", placeItems: "center", width: 52, height: 66, fontSize: 31, filter: selected ? "drop-shadow(0 0 7px #feb700)" : "drop-shadow(0 4px 3px rgba(36,76,45,.2))", transformOrigin: "50% 100%" }} animate={reduceMotion ? undefined : { rotate: [-2.5, 3.5, -1.5, 2.5, -2.5], x: [0, 1, -1, 1, 0] }} transition={reduceMotion ? undefined : { duration: 3.6, delay, repeat: Infinity, ease: "easeInOut" }}><span>{emoji === "🎵" ? "🪻" : emoji === "🎨" ? "🌺" : emoji === "☀️" ? "🌻" : "🌸"}</span><i style={{ width: 4, height: 25, marginTop: -7, borderRadius: 4, background: "#397d47" }} /></motion.span>;
}

function GardenStudioScreen({ state, setState, onNav }: {
  state: AppState; setState: React.Dispatch<React.SetStateAction<AppState>>; onNav: (s: ScreenId) => void;
}) {
  const [mode, setMode] = useState<"garden" | "design" | "memories">("garden");
  const [designTab, setDesignTab] = useState<"plants" | "decor">("plants");
  const [selectedItem, setSelectedItem] = useState<{ id: string; kind: "flower" | "decor" } | null>(null);
  const [selectedMemory, setSelectedMemory] = useState<Observation | null>(null);
  const [showBloom, setShowBloom] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), import.meta.env.DEV ? 1000 : 60_000);
    return () => window.clearInterval(timer);
  }, []);
  const stageForSeed = (seed?: MemorySeedRecord) => {
    if (!seed?.plantedAt) return "unplanted" as const;
    if (state.tutorialStep >= 10 && state.tutorialStep <= 21) {
      const tutorialAge = now - new Date(seed.plantedAt).getTime();
      if (tutorialAge >= 4_000) return "bloomed" as const;
      if (tutorialAge >= 1_500) return "sprout" as const;
      return "planted" as const;
    }
    return getSeedStage(seed.plantedAt, now);
  };
  useEffect(() => {
    if (state.tutorialStep !== 10) return;
    const tutorialSeed = state.memorySeeds.find((seed) => seed.plantedAt && !seed.harvestedAt);
    if (stageForSeed(tutorialSeed) === "bloomed") setState((current) => ({ ...current, tutorialStep: 11 }));
  }, [now, state.tutorialStep, state.memorySeeds, setState]);
  const handleNav = (screen: ScreenId) => {
    if (screen === "home" && state.tutorialStep === 5) setState((s) => ({ ...s, tutorialStep: 6 }));
    onNav(screen);
  };
  const placedIds = new Set(state.gardenPlacements.filter((p) => p.kind === "flower").map((p) => p.itemId));
  const unplaced = state.observations.filter((o) => !placedIds.has(o.id));
  const addNextFlower = () => {
    const memory = unplaced[0];
    if (!memory || state.seeds < 1) return;
    const seed = state.memorySeeds.find((item) => item.observationId === memory.id && !item.plantedAt);
    if (!seed) return;
    const used = new Set(state.gardenPlacements.map((p) => p.slot));
    const slot = GARDEN_SLOTS.findIndex((_, index) => !used.has(index));
    if (slot < 0) return;
    const plantedAt = new Date().toISOString();
    const localPlacementId = `local-placement-${crypto.randomUUID()}`;
    setState((s) => ({ ...s, seeds: Math.max(0, s.seeds - 1), gardenPhase: "planted", memorySeeds: s.memorySeeds.map((item) => item.id === seed.id ? { ...item, plantedAt } : item), gardenPlacements: [...s.gardenPlacements, { id: localPlacementId, itemId: memory.id, kind: "flower", slot }] }));
    setShowBloom(true);
    if (backend.configured && !seed.id.startsWith("local-") && !seed.id.startsWith("legacy-")) {
      void backend.plantSeed(seed.id).then(async (serverTime) => {
        const placementId = await backend.saveGardenPlacement({ seedId: seed.id, x: GARDEN_SLOTS[slot].left / 390, y: GARDEN_SLOTS[slot].top / 844, zIndex: slot });
        setState((s) => ({ ...s, memorySeeds: s.memorySeeds.map((item) => item.id === seed.id ? { ...item, plantedAt: serverTime } : item), gardenPlacements: s.gardenPlacements.map((item) => item.id === localPlacementId ? { ...item, id: placementId } : item), syncError: "" }));
      }).catch((reason) => setState((s) => ({ ...s, syncError: reason instanceof Error ? reason.message : "The seed is planted locally and will sync later." })));
    }
  };
  const harvestSelected = async () => {
    if (!selectedMemory) return;
    const seed = state.memorySeeds.find((item) => item.observationId === selectedMemory.id);
    if (!seed || seed.harvestedAt || stageForSeed(seed) !== "bloomed") return;
    try {
      if (state.tutorialStep === 12) {
        setState((s) => ({ ...s, tokens: s.tokens + 10, memorySeeds: s.memorySeeds.map((item) => item.id === seed.id ? { ...item, harvestedAt: new Date().toISOString() } : item), gardenPhase: "bloomed", tutorialStep: 13 }));
        setSelectedMemory(null);
      } else if (backend.configured && !seed.id.startsWith("local-") && !seed.id.startsWith("legacy-")) {
        const tokens = await backend.harvestSeed(seed.id);
        setState((s) => ({ ...s, tokens, memorySeeds: s.memorySeeds.map((item) => item.id === seed.id ? { ...item, harvestedAt: new Date().toISOString() } : item), gardenPhase: "bloomed", syncError: "" }));
      } else {
        setState((s) => ({ ...s, tokens: s.tokens + 10, memorySeeds: s.memorySeeds.map((item) => item.id === seed.id ? { ...item, harvestedAt: new Date().toISOString() } : item), gardenPhase: "bloomed" }));
      }
    } catch (reason) {
      setState((s) => ({ ...s, syncError: reason instanceof Error ? reason.message : "Bean couldn't harvest that flower yet." }));
    }
  };
  const placeSelected = (slot: number) => {
    if (!selectedItem) return;
    const existing = state.gardenPlacements.find((p) => p.itemId === selectedItem.id && p.kind === selectedItem.kind);
    if (selectedItem.kind === "flower" && !existing) {
      const seed = state.memorySeeds.find((item) => item.observationId === selectedItem.id);
      if (seed && !seed.plantedAt && state.seeds > 0) {
        const plantedAt = new Date().toISOString();
        const localPlacementId = `local-placement-${crypto.randomUUID()}`;
        setState((current) => ({ ...current, seeds: Math.max(0, current.seeds - 1), gardenPhase: "planted", tutorialStep: current.tutorialStep === 9 ? 10 : current.tutorialStep, memorySeeds: current.memorySeeds.map((item) => item.id === seed.id ? { ...item, plantedAt } : item), gardenPlacements: [...current.gardenPlacements.filter((item) => item.slot !== slot), { id: localPlacementId, itemId: selectedItem.id, kind: "flower", slot }] }));
        setSelectedItem(null);
        if (backend.configured && !seed.id.startsWith("local-") && !seed.id.startsWith("legacy-")) void backend.plantSeed(seed.id).then(async (serverTime) => {
          const placementId = await backend.saveGardenPlacement({ seedId: seed.id, x: GARDEN_SLOTS[slot].left / 390, y: GARDEN_SLOTS[slot].top / 844, zIndex: slot });
          setState((current) => ({ ...current, memorySeeds: current.memorySeeds.map((item) => item.id === seed.id ? { ...item, plantedAt: serverTime } : item), gardenPlacements: current.gardenPlacements.map((item) => item.id === localPlacementId ? { ...item, id: placementId } : item), syncError: "" }));
        }).catch((reason) => setState((current) => ({ ...current, syncError: reason instanceof Error ? reason.message : "The seed is planted locally and will sync later." })));
        return;
      }
    }
    const localId = existing?.id || `local-placement-${crypto.randomUUID()}`;
    setState((s) => ({ ...s, gardenPlacements: [...s.gardenPlacements.filter((p) => p.slot !== slot && !(p.itemId === selectedItem.id && p.kind === selectedItem.kind)), { id: localId, itemId: selectedItem.id, kind: selectedItem.kind, slot }] }));
    if (backend.configured) {
      const seedId = selectedItem.kind === "flower" ? state.memorySeeds.find((seed) => seed.observationId === selectedItem.id)?.id : undefined;
      if (selectedItem.kind === "decor" || (seedId && !seedId.startsWith("local-") && !seedId.startsWith("legacy-"))) {
        void backend.saveGardenPlacement({ id: existing && !existing.id.startsWith("local-") ? existing.id : undefined, seedId, catalogItemId: selectedItem.kind === "decor" ? selectedItem.id : undefined, x: GARDEN_SLOTS[slot].left / 390, y: GARDEN_SLOTS[slot].top / 844, zIndex: slot }).then((serverId) => setState((s) => ({ ...s, gardenPlacements: s.gardenPlacements.map((item) => item.id === localId ? { ...item, id: serverId } : item), syncError: "" }))).catch((reason) => setState((s) => ({ ...s, syncError: reason instanceof Error ? reason.message : "That garden move is saved on this device." })));
      }
    }
  };
  const removePlacement = (placement: GardenPlacement) => {
    setState((s) => ({ ...s, gardenPlacements: s.gardenPlacements.filter((p) => p.id !== placement.id) }));
    if (backend.configured && !placement.id.startsWith("local-") && !placement.id.startsWith("legacy-")) void backend.removeGardenPlacement(placement.id).catch((reason) => setState((s) => ({ ...s, syncError: reason instanceof Error ? reason.message : "That garden change is saved on this device." })));
  };
  const ownedDecor = ITEMS.filter(
    (item) => item.cat === "garden" && state.storeItems[item.id] && !["lamp", "stone"].includes(item.id),
  );

  const bloomedMemories = state.observations.filter((memory) => stageForSeed(state.memorySeeds.find((seed) => seed.observationId === memory.id)) === "bloomed");
  const discoveredFlowerMemories = Array.from(new Map(bloomedMemories.map((memory) => [flowerIndexForObservation(memory), memory])).values());
  const tutorialGlow: React.CSSProperties = { borderRadius: 999, boxShadow: "0 0 0 4px #feb700,0 0 0 10px rgba(254,183,0,.24),0 0 25px rgba(254,183,0,.8)" };

  return (
    <Screen>
      <ExactQuestFrame src={gardenHomeFrame} />
      <FO x={74} y={145} w={162} h={164} onClick={() => handleNav("home")} zIndex={20} />
      <div style={{ position: "absolute", left: fs(1095), top: fs(172), width: fs(105), height: fs(80), display: "grid", placeItems: "center", background: "#e9f1f1", borderRadius: 100, zIndex: 12, fontFamily: "'Bradley Hand',cursive", fontWeight: 800, fontSize: 20 }}>{state.seeds}</div>
      {GARDEN_SLOTS.map((slot, index) => {
        const placement = state.gardenPlacements.find((item) => item.slot === index);
        const memory = placement?.kind === "flower" ? state.observations.find((item) => item.id === placement.itemId) : undefined;
        const seed = memory ? state.memorySeeds.find((item) => item.observationId === memory.id) : undefined;
        const stage = stageForSeed(seed);
        const flower = memory ? FLOWER_CATALOG[flowerIndexForObservation(memory)] : undefined;
        const decor = placement?.kind === "decor" ? ITEMS.find((item) => item.id === placement.itemId) : undefined;
        const isBean = placement?.kind === "decor" && placement.itemId === GARDEN_BEAN_ID;
        return <button key={index} aria-label={memory ? `${flower?.name || "Memory"} flower` : mode === "design" ? `Garden slot ${index + 1}` : undefined} onClick={() => { if (mode === "design") placeSelected(index); else if (memory) { setSelectedMemory(memory); if (state.tutorialStep === 11) setState((current) => ({ ...current, tutorialStep: 12 })); } }} style={{ position: "absolute", left: slot.left, top: slot.top, width: 78, height: 105, transform: "translate(-50%,-50%)", border: 0, background: "transparent", zIndex: 14 + index, cursor: mode === "design" || memory ? "pointer" : "default", padding: 0, ...(state.tutorialStep === 11 && memory ? tutorialGlow : {}) }}>
          {mode === "design" && <span style={{ position: "absolute", left: "50%", top: "50%", width: 58, height: 58, transform: "translate(-50%,-50%)", border: "1.5px dashed rgba(255,255,255,.9)", borderRadius: "50%", background: "rgba(255,255,255,.08)", display: "grid", placeItems: "center", color: "white", fontSize: 29, textShadow: "0 2px 4px #52744f" }}>+</span>}
          {memory && stage === "bloomed" && flower && <motion.span style={{ position: "absolute", left: "50%", top: "50%", width: 72, height: 94, marginLeft: -36, marginTop: -47, transformOrigin: "50% 100%", filter: selectedItem?.id === memory.id ? "drop-shadow(0 0 8px #fff3a0)" : "none" }} animate={{ rotate: [-2.5,3,-1.5,2,-2.5] }} transition={{ duration: 3.5 + index * .16, delay: index * .18, repeat: Infinity, ease: "easeInOut" }}><img src={flower.src} alt={flower.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} /></motion.span>}
          {memory && stage !== "bloomed" && <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", fontSize: stage === "sprout" ? 38 : 31, filter: "drop-shadow(0 3px 3px rgba(20,60,30,.25))" }}>{stage === "sprout" ? "🌱" : "🫘"}</span>}
          {decor && !isBean && <span style={{ position: "absolute", left: "50%", top: "50%", width: 72, height: 72, transform: "translate(-50%,-50%)", display: "grid", placeItems: "center" }}><StoreItemArt itemId={decor.id} size={60} /></span>}
          {isBean && <span style={{ position: "absolute", left: "50%", top: "50%", width: 74, height: 63, transform: "translate(-50%,-50%)", pointerEvents: "none" }}><HomeStyleBean size={74} outfitId={state.equipped.outfit} faceId={state.equipped.face} /></span>}
          {mode === "design" && placement && <span onClick={(event) => { event.stopPropagation(); removePlacement(placement); }} style={{ position: "absolute", right: -5, top: -5, width: 21, height: 21, borderRadius: "50%", background: "#e85e67", color: "white", lineHeight: "21px", fontSize: 13 }}>×</span>}
        </button>;
      })}

      <FO x={214} y={2226} w={249} h={127} style={state.tutorialStep === 13 ? tutorialGlow : undefined} onClick={() => { setMode(mode === "memories" ? "garden" : "memories"); if (state.tutorialStep === 13) setState((current) => ({ ...current, tutorialStep: 14 })); }} zIndex={25} />
      <FO x={536} y={2226} w={249} h={127} style={state.tutorialStep === 7 ? tutorialGlow : undefined} onClick={() => { setMode(mode === "design" ? "garden" : "design"); if (state.tutorialStep === 7) setState((current) => ({ ...current, tutorialStep: 8 })); }} zIndex={25} />
      <FO x={869} y={2226} w={249} h={127} style={state.tutorialStep === 15 ? tutorialGlow : undefined} onClick={() => { if (state.tutorialStep === 15) setState((current) => ({ ...current, tutorialStep: 16 })); handleNav("store"); }} zIndex={25} />
      <FO x={243} y={2554} w={187} h={187} onClick={() => handleNav("questPage")} zIndex={25} />
      <FO x={567} y={2558} w={187} h={187} onClick={() => handleNav("home")} zIndex={25} />
      <FO x={903} y={2559} w={187} h={187} onClick={() => handleNav("profile")} zIndex={25} />

      {mode === "design" && <motion.div initial={{ y: 230 }} animate={{ y: 0 }} exit={{ y: 230 }} style={{ position: "absolute", left: 0, right: 0, bottom: 76, height: 166, zIndex: 30, background: "#fff6dd", borderRadius: "25px 25px 0 0", padding: "42px 27px 18px", boxShadow: "0 -3px 12px rgba(62,76,39,.18)" }}>
        <div style={{ position: "absolute", left: 28, top: -28, display: "flex", alignItems: "end" }}>
          <button onClick={() => setDesignTab("plants")} style={{ width: 98, height: 36, border: 0, borderRadius: "5px 5px 0 0", background: designTab === "plants" ? "#fff6dd" : "#ffeab0", color: designTab === "plants" ? "#111" : "#8d8062", fontSize: 15, cursor: "pointer" }}>Plants</button>
          <button onClick={() => setDesignTab("decor")} style={{ width: 88, height: 36, border: 0, borderRadius: "5px 5px 0 0", background: designTab === "decor" ? "#fff6dd" : "#ffeab0", color: designTab === "decor" ? "#111" : "#8d8062", fontSize: 15, cursor: "pointer" }}>Decor</button>
        </div>
        <button onClick={() => { setMode("garden"); setSelectedItem(null); }} aria-label="Close garden designer" style={{ position: "absolute", right: 12, top: 8, width: 34, height: 34, border: 0, borderRadius: "50%", background: "#eef2f1", color: "#3786ad", fontSize: 23, cursor: "pointer" }}>×</button>
        <div style={{ display: "flex", gap: 18, overflowX: "auto", alignItems: "center", height: 96, paddingRight: 15 }}>
          {designTab === "plants" && (() => { const seedMemory = unplaced.find((memory) => { const seed = state.memorySeeds.find((item) => item.observationId === memory.id); return seed && !seed.plantedAt; }); return seedMemory && state.seeds > 0 ? <button onClick={() => { setSelectedItem({ id: seedMemory.id, kind: "flower" }); if (state.tutorialStep === 8) setState((current) => ({ ...current, tutorialStep: 9 })); }} style={{ position: "relative", flex: "0 0 85px", height: 85, border: selectedItem?.id === seedMemory.id ? `3px solid ${CTA_YELLOW}` : 0, borderRadius: 12, background: "white", cursor: "pointer", display: "grid", placeItems: "center", fontSize: 36, ...(state.tutorialStep === 8 ? tutorialGlow : {}) }}><span>🫘</span><small style={{ position: "absolute", right: 5, top: 4, color: "#858585", fontSize: 13 }}>x{state.seeds}</small></button> : null; })()}
          {designTab === "plants" && discoveredFlowerMemories.map((discoveredMemory) => {
            const flowerIndex = flowerIndexForObservation(discoveredMemory);
            const flower = FLOWER_CATALOG[flowerIndex];
            const availableMemories = bloomedMemories.filter((memory) => flowerIndexForObservation(memory) === flowerIndex && !state.gardenPlacements.some((placement) => placement.kind === "flower" && placement.itemId === memory.id));
            const availableMemory = availableMemories[0];
            const count = availableMemories.length;
            return <button key={flower.name} disabled={!availableMemory} onClick={() => availableMemory && setSelectedItem({ id: availableMemory.id, kind: "flower" })} style={{ position: "relative", flex: "0 0 85px", height: 85, border: availableMemory && selectedItem?.id === availableMemory.id ? `3px solid ${CTA_YELLOW}` : 0, borderRadius: 12, background: availableMemory ? "white" : "#eeeeea", cursor: availableMemory ? "pointer" : "default" }}><img src={flower.src} alt={flower.name} style={{ width: 62, height: 72, objectFit: "contain", filter: availableMemory ? "none" : "grayscale(1)", opacity: availableMemory ? 1 : .24 }} /><small style={{ position: "absolute", right: 5, top: 4, color: availableMemory ? "#858585" : "#aaa99e", fontSize: 13 }}>x{count}</small></button>;
          })}
          {designTab === "decor" && (() => { const available = !state.gardenPlacements.some((placement) => placement.kind === "decor" && placement.itemId === GARDEN_BEAN_ID); return <button disabled={!available} onClick={() => available && setSelectedItem({ id: GARDEN_BEAN_ID, kind: "decor" })} style={{ position: "relative", flex: "0 0 85px", height: 85, border: available && selectedItem?.id === GARDEN_BEAN_ID ? `3px solid ${CTA_YELLOW}` : 0, borderRadius: 12, background: available ? "white" : "#eeeeea", cursor: available ? "pointer" : "default", opacity: available ? 1 : .45 }}><span style={{ position: "absolute", left: 10, top: 9, width: 66, height: 56 }}><HomeStyleBean size={66} outfitId={state.equipped.outfit} faceId={state.equipped.face} float={false} /></span><small style={{ position: "absolute", right: 5, top: 4, color: "#858585", fontSize: 13 }}>x{available ? 1 : 0}</small></button>; })()}
          {designTab === "decor" && ownedDecor.map((item) => { const available = !state.gardenPlacements.some((placement) => placement.kind === "decor" && placement.itemId === item.id); return <button key={item.id} disabled={!available} onClick={() => available && setSelectedItem({ id: item.id, kind: "decor" })} style={{ position: "relative", flex: "0 0 85px", height: 85, border: available && selectedItem?.id === item.id ? `3px solid ${CTA_YELLOW}` : 0, borderRadius: 12, background: available ? "white" : "#eeeeea", cursor: available ? "pointer" : "default", filter: available ? "none" : "grayscale(1)", opacity: available ? 1 : .45 }}><span style={{ position: "absolute", left: "50%", top: "50%", width: 66, height: 66, transform: "translate(-50%,-50%)", display: "grid", placeItems: "center" }}><StoreItemArt itemId={item.id} size={58} /></span><small style={{ position: "absolute", right: 5, top: 4, color: "#858585", fontSize: 13 }}>x{available ? 1 : 0}</small></button>; })}
        </div>
        <p style={{ position: "absolute", left: 0, right: 0, bottom: 5, textAlign: "center", color: "#8b866f", fontSize: 9 }}>{selectedItem ? "Tap a dotted garden spot to place it." : `Choose something from ${designTab === "plants" ? "Plants" : "Decor"}.`}</p>
      </motion.div>}

      {mode === "memories" && <div style={{ position: "absolute", left: 25, right: 25, top: 100, bottom: 125, zIndex: 35, overflowY: "auto", background: "#fff6dd", borderRadius: 25, padding: "20px 21px", boxShadow: "0 3px 8px rgba(39,76,43,.3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 1 }}><h2 style={{ color: "#3684aa", fontSize: 20, fontWeight: 900 }}>Flower Library</h2><button onClick={() => { setMode("garden"); if (state.tutorialStep === 14) setState((current) => ({ ...current, tutorialStep: 15 })); }} aria-label="Close flower library" style={{ width: 32, height: 32, border: 0, borderRadius: "50%", background: "#eef2f1", color: "#3786ad", fontSize: 23, cursor: "pointer", ...(state.tutorialStep === 14 ? tutorialGlow : {}) }}>×</button></div>
        <p style={{ color: "#111", fontSize: 15, lineHeight: 1.4, marginBottom: 18 }}>Flowers discovered <span style={{ display: "inline-block", marginLeft: 8, padding: "5px 12px", borderRadius: 100, background: "white", boxShadow: "inset 0 2px 4px #0002" }}>{Math.round((new Set(bloomedMemories.map(flowerIndexForObservation)).size / FLOWER_CATALOG.length) * 100)}%</span></p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "20px 20px" }}>{FLOWER_CATALOG.map((flower, index) => { const memory = bloomedMemories.find((item) => flowerIndexForObservation(item) === index); return <button key={flower.name} onClick={() => memory && setSelectedMemory(memory)} disabled={!memory} style={{ height: 102, border: 0, borderRadius: 11, background: memory ? "white" : "#eeeeee", padding: 5, cursor: memory ? "pointer" : "default" }}><img src={flower.src} alt="" style={{ width: "100%", height: 76, objectFit: "contain", filter: memory ? "none" : "grayscale(1)", opacity: memory ? 1 : .2 }} /><small style={{ display: "block", color: "#111", fontWeight: 500, fontSize: 11 }}>{memory ? flower.name : "?"}</small></button>; })}</div>
      </div>}

      <AnimatePresence>{selectedMemory && <div style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(12,48,28,.55)", display: "grid", placeItems: "center", padding: 25 }} onClick={() => setSelectedMemory(null)}><motion.div initial={{ scale: .84, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(event) => event.stopPropagation()} style={{ width: "100%", background: "white", borderRadius: 27, padding: 22, textAlign: "center" }}>
        <img src={FLOWER_CATALOG[flowerIndexForObservation(selectedMemory)].src} alt="" style={{ width: 105, height: 125, objectFit: "contain", margin: "0 auto" }} /><h3 style={{ color: BLUE_TEXT, fontSize: 19, fontWeight: 900 }}>{FLOWER_CATALOG[flowerIndexForObservation(selectedMemory)].name}</h3><p style={{ color: "#788178", fontSize: 11, margin: "5px 0" }}>{selectedMemory.prompt}</p><p style={{ color: "#3e4b42", fontSize: 14, lineHeight: 1.5, fontStyle: "italic" }}>“{selectedMemory.text}”</p>
        {(() => { const seed = state.memorySeeds.find((item) => item.observationId === selectedMemory.id); return seed && !seed.harvestedAt && stageForSeed(seed) === "bloomed" ? <button onClick={harvestSelected} style={{ marginTop: 16, border: 0, borderRadius: 100, background: CTA_YELLOW, color: "white", padding: "10px 24px", fontWeight: 800, cursor: "pointer", ...(state.tutorialStep === 12 ? tutorialGlow : {}) }}>Harvest · +10 tokens</button> : seed?.harvestedAt ? <p style={{ color: "#5a8a5f", fontSize: 12, fontWeight: 800, marginTop: 12 }}>✓ Harvested</p> : null; })()}
        <button onClick={() => setSelectedMemory(null)} style={{ display: "block", margin: "12px auto 0", border: 0, borderRadius: 100, background: "#eaf0e2", color: BLUE_TEXT, padding: "10px 24px", fontWeight: 800 }}>Close</button>
      </motion.div></div>}</AnimatePresence>
      {state.tutorialStep >= 7 && state.tutorialStep <= 15 && <div style={{ position: "absolute", inset: 0, zIndex: 80, pointerEvents: "none" }}>
        <motion.div key={state.tutorialStep} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ position: "absolute", left: 42, right: 42, top: state.tutorialStep === 14 ? 690 : state.tutorialStep === 12 ? 92 : 150, padding: "12px 15px", borderRadius: 18, background: "rgba(255,255,255,.4)", backdropFilter: "blur(5px)", border: "1px solid rgba(255,255,255,.55)", textAlign: "center", boxShadow: "0 6px 18px rgba(31,65,45,.12)" }}>
          <p style={{ color: "#294752", fontSize: 13, lineHeight: 1.38, fontWeight: 850, textShadow: "0 1px 2px rgba(255,255,255,.9)" }}>{({ 7: "Tap ✨ to design your garden.", 8: "Choose your seed.", 9: "Pick any open garden spot.", 10: "It’s growing…", 11: "Your flower bloomed! Tap it.", 12: "Harvest it to earn tokens.", 13: "Tap the book to see your flowers.", 14: "Your flowers and memories live here.", 15: "Visit the Store to spend your tokens." } as Record<number,string>)[state.tutorialStep]}</p>
        </motion.div>
      </div>}
    </Screen>
  );

  /* Previous garden layout remains below as a fallback while the exact Figma garden is validated. */

  return (
    <motion.div style={{ position: "absolute", inset: 0, overflow: "hidden", fontFamily: "'Inter',sans-serif", background: "linear-gradient(#0b5c87 0 26%,#a8d078 26% 44%,#70ad65 44%)" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <svg style={{ position: "absolute", top: 180, width: "100%", height: 125 }} viewBox="0 0 390 125" preserveAspectRatio="none"><path d="M0 125V85C70 20 145 15 220 48c70 31 115 20 170-2v79Z" fill="#9fca73" /></svg>
      <div style={{ position: "absolute", top: 18, left: 18, right: 18, display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 10 }}>
        <button onClick={() => handleNav("home")} aria-label="Back home" style={{ width: 36, height: 36, border: 0, borderRadius: "50%", background: "rgba(255,255,255,.78)", cursor: "pointer" }}>←</button>
        <h2 style={{ color: "white", fontWeight: 800, fontSize: 20, textShadow: "0 2px 4px rgba(0,0,0,.18)" }}>Bean’s Garden</h2>
        <span style={{ color: "white", background: "rgba(255,255,255,.2)", borderRadius: 100, padding: "7px 10px", fontSize: 12, fontWeight: 800 }}>🌱 {state.seeds}</span>
      </div>
      <div style={{ position: "absolute", top: 62, left: "50%", transform: "translateX(-50%)", zIndex: 4 }}><HomeStyleBean size={105} outfitId={state.equipped.outfit} faceId={state.equipped.face} /></div>
      <div style={{ position: "absolute", top: 178, left: 16, right: 16, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, zIndex: 12 }}>
        {(["garden","design","memories"] as const).map((item) => <button key={item} onClick={() => setMode(item)} style={{ border: 0, borderRadius: 100, padding: 9, background: mode === item ? CTA_YELLOW : "rgba(255,255,255,.9)", color: mode === item ? "white" : BLUE_TEXT, fontWeight: 800, textTransform: "capitalize", cursor: "pointer" }}>{item}</button>)}
      </div>

      {mode !== "memories" && <div style={{ position: "absolute", inset: "222px 0 78px", zIndex: 4 }}>
        {GARDEN_SLOTS.map((slot, index) => {
          const placement = state.gardenPlacements.find((p) => p.slot === index);
          const memory = placement?.kind === "flower" ? state.observations.find((o) => o.id === placement.itemId) : undefined;
          const seed = memory ? state.memorySeeds.find((item) => item.observationId === memory.id) : undefined;
          const stage = getSeedStage(seed?.plantedAt || null, now);
          const decor = placement?.kind === "decor" ? ITEMS.find((i) => i.id === placement.itemId) : undefined;
          return <button key={index} onClick={() => mode === "design" ? placeSelected(index) : memory ? setSelectedMemory(memory) : undefined}
            style={{ position: "absolute", left: slot.left, top: slot.top - 222, width: 66, height: 76, transform: "translate(-50%,-50%)", border: mode === "design" ? "2px dashed rgba(255,255,255,.72)" : "none", borderRadius: "50%", background: mode === "design" ? "rgba(255,255,255,.11)" : "transparent", display: "grid", placeItems: "center", cursor: mode === "design" || memory ? "pointer" : "default" }}>
            {memory ? stage === "bloomed" ? <MemoryFlower emoji={memory.emoji} selected={selectedItem?.id === memory.id} delay={index * .22} /> : <span style={{ display: "grid", placeItems: "center", fontSize: stage === "sprout" ? 35 : 29, filter: "drop-shadow(0 3px 3px rgba(25,65,36,.2))" }}>{stage === "sprout" ? "🌱" : "🫘"}<small style={{ color: "white", fontSize: 8, fontWeight: 800, textShadow: "0 1px 3px #234" }}>{stage === "sprout" ? "Growing" : "Planted"}</small></span> : decor ? <span style={{ fontSize: 38 }}>{decor.emoji}</span> : mode === "design" ? <span style={{ color: "white", fontSize: 22 }}>+</span> : null}
            {mode === "design" && placement && <span onClick={(e) => { e.stopPropagation(); removePlacement(placement); }} style={{ position: "absolute", right: -3, top: -3, width: 20, height: 20, borderRadius: "50%", background: "#e85e67", color: "white", fontSize: 13 }}>×</span>}
          </button>;
        })}
        {mode === "garden" && unplaced.length > 0 && state.seeds > 0 && <button onClick={addNextFlower} style={{ position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)", border: 0, borderRadius: 100, padding: "11px 20px", background: CTA_YELLOW, color: "white", fontWeight: 800, cursor: "pointer", boxShadow: "0 5px 16px rgba(105,72,0,.25)" }}>🌱 Plant next memory</button>}
        {mode === "garden" && !state.gardenPlacements.length && <p style={{ position: "absolute", left: 30, right: 30, top: "45%", textAlign: "center", color: "white", fontWeight: 700, textShadow: "0 2px 4px rgba(0,0,0,.3)" }}>Your garden is ready for its first memory flower.</p>}
      </div>}

      {mode === "design" && <div style={{ position: "absolute", zIndex: 15, left: 12, right: 12, bottom: 82, background: "rgba(255,255,244,.95)", borderRadius: 18, padding: 10, boxShadow: "0 -5px 18px rgba(29,74,42,.18)" }}>
        <p style={{ fontSize: 10, color: "#687565", fontWeight: 800, marginBottom: 7 }}>SELECT AN ITEM, THEN TAP A GARDEN SPOT</p>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {state.observations.filter((memory) => getSeedStage(state.memorySeeds.find((seed) => seed.observationId === memory.id)?.plantedAt || null, now) === "bloomed").map((memory) => <button key={memory.id} onClick={() => setSelectedItem({ id: memory.id, kind: "flower" })} style={{ flex: "0 0 58px", height: 58, border: selectedItem?.id === memory.id ? `3px solid ${CTA_YELLOW}` : "1px solid #d8dfc8", borderRadius: 14, background: "white", cursor: "pointer" }}><MemoryFlower emoji={memory.emoji} /></button>)}
          {ownedDecor.map((item) => <button key={item.id} onClick={() => setSelectedItem({ id: item.id, kind: "decor" })} style={{ flex: "0 0 58px", height: 58, border: selectedItem?.id === item.id ? `3px solid ${CTA_YELLOW}` : "1px solid #d8dfc8", borderRadius: 14, background: "white", fontSize: 28, cursor: "pointer" }}>{item.emoji}</button>)}
          {!state.observations.length && !ownedDecor.length && <small style={{ padding: 12, color: "#7f8877" }}>Unlock flowers and buy décor to design your garden.</small>}
        </div>
      </div>}

      {mode === "memories" && <div style={{ position: "absolute", zIndex: 5, top: 224, left: 12, right: 12, bottom: 82, overflowY: "auto", background: "rgba(255,255,244,.94)", borderRadius: 22, padding: 14 }}>
        <h3 style={{ color: BLUE_TEXT, fontWeight: 800, fontSize: 17, marginBottom: 4 }}>Unlocked memory flowers</h3><p style={{ fontSize: 11, color: "#6c786d", marginBottom: 12 }}>Tap a flower to revisit what helped it grow.</p>
        <div style={{ display: "grid", gap: 9 }}>{state.observations.filter((memory) => getSeedStage(state.memorySeeds.find((seed) => seed.observationId === memory.id)?.plantedAt || null, now) === "bloomed").map((memory) => <button key={memory.id} onClick={() => setSelectedMemory(memory)} style={{ display: "grid", gridTemplateColumns: "55px 1fr auto", alignItems: "center", gap: 8, textAlign: "left", border: "1px solid #d9e2cd", borderRadius: 16, background: "white", padding: 10, cursor: "pointer" }}><MemoryFlower emoji={memory.emoji} /><span><strong style={{ display: "block", color: "#374d3e", fontSize: 13 }}>{memory.category} flower</strong><small style={{ color: "#758078", fontSize: 10 }}>{new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(memory.createdAt))}</small></span><span>›</span></button>)}</div>
        {!state.observations.length && <p style={{ padding: 35, textAlign: "center", color: "#798279" }}>Complete a quest to unlock your first flower.</p>}
      </div>}

      <AnimatePresence>{(selectedMemory || showBloom) && <div style={{ position: "absolute", inset: 0, zIndex: 70, background: "rgba(12,48,28,.55)", display: "grid", placeItems: "center", padding: 25 }} onClick={() => { setSelectedMemory(null); setShowBloom(false); }}><motion.div initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "white", borderRadius: 27, padding: 22, textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center" }}><MemoryFlower emoji={selectedMemory?.emoji || "☀️"} /></div><h3 style={{ color: BLUE_TEXT, fontSize: 19, fontWeight: 800 }}>{showBloom ? "A memory seed was planted!" : `${selectedMemory?.category} flower`}</h3>
        {selectedMemory ? <><p style={{ color: "#788178", fontSize: 11, margin: "5px 0" }}>{selectedMemory.prompt}</p><p style={{ color: "#3e4b42", fontSize: 14, lineHeight: 1.5, fontStyle: "italic" }}>“{selectedMemory.text}”</p></> : <p style={{ color: "#5c685e", fontSize: 13, lineHeight: 1.45, marginTop: 5 }}>Your memory seed is planted. It will sprout soon and bloom in about five hours.</p>}
        {selectedMemory && (() => { const seed = state.memorySeeds.find((item) => item.observationId === selectedMemory.id); return seed && !seed.harvestedAt && getSeedStage(seed.plantedAt, now) === "bloomed" ? <button onClick={harvestSelected} style={{ marginTop: 16, border: 0, borderRadius: 100, background: CTA_YELLOW, color: "white", padding: "10px 24px", fontWeight: 800, cursor: "pointer" }}>Harvest · +10 tokens</button> : seed?.harvestedAt ? <p style={{ color: "#5a8a5f", fontSize: 12, fontWeight: 800, marginTop: 12 }}>✓ Harvested</p> : null; })()}
        <button onClick={() => { setSelectedMemory(null); setShowBloom(false); }} style={{ display: "block", margin: "12px auto 0", border: 0, borderRadius: 100, background: showBloom ? CTA_YELLOW : "#eaf0f2", color: showBloom ? "white" : BLUE_TEXT, padding: "10px 24px", fontWeight: 800, cursor: "pointer" }}>Lovely ✨</button>
      </motion.div></div>}</AnimatePresence>
      <AppNavBar active="garden" onNav={handleNav} />
    </motion.div>
  );
}

export default function App() {
  const [state, setState] = useState<AppState>(readSavedState);
  const [backendReady, setBackendReady] = useState(!backend.configured);
  const scale = useDeviceScale();
  const activeScreen = SCREEN_IDS.has(state.screen) ? state.screen : "home";
  const navigate = (screen: ScreenId) => setState((current) => ({ ...current, screen }));

  const createObservation = (observation: Observation, source: ObservationSource, assignmentId?: string, media?: Array<{ kind: "photo" | "voice"; file: File }>) => {
    const observationWithMedia: Observation = { ...observation, media: media?.map((item) => ({ kind: item.kind, url: URL.createObjectURL(item.file), mimeType: item.file.type })) };
    const pendingSeedId = `local-seed-${observation.id}`;
    setState((current) => ({ ...current, seeds: current.seeds + 1, observations: current.observations.some((item) => item.id === observation.id) ? current.observations : [observationWithMedia, ...current.observations], memorySeeds: current.memorySeeds.some((seed) => seed.observationId === observation.id) ? current.memorySeeds : [...current.memorySeeds, { id: pendingSeedId, observationId: observation.id, plantedAt: null, harvestedAt: null }], syncError: "" }));
    if (!backend.configured) return;
    void backend.submitObservation({ clientRequestId: observation.id, source, prompt: observation.prompt, body: observation.text, category: observation.category, emoji: observation.emoji, assignmentId, media }).then((result) => {
      setState((current) => ({ ...current, memorySeeds: current.memorySeeds.map((seed) => seed.id === pendingSeedId ? { ...seed, id: result.seedId } : seed), syncError: "" }));
    }).catch((reason) => setState((current) => ({ ...current, syncError: reason instanceof Error ? reason.message : "Your noticing is safe on this device and will sync when Bean reconnects." })));
  };

  useEffect(() => {
    if (!backend.configured) return;
    let active = true;
    void (async () => {
      try {
        await backend.bootstrap();
        const onboardingScreens = new Set(["o1", "o2", "o3", "naming", "account", "quest", "qComplete", "home"]);
        await backend.importLegacy({ userName: state.userName, beanName: state.beanName, onboardingScreen: (onboardingScreens.has(state.screen) ? state.screen : "home") as any, tutorialStep: state.tutorialStep, tokens: state.tokens, observations: state.observations });
        const [profile, observations, seeds, inventory, placements] = await Promise.all([backend.bootstrap(), backend.listObservations(), backend.listSeeds(), backend.listInventory(), backend.listGardenPlacements()]);
        if (!active || !profile) return;
        const hydratedObservations = await Promise.all(observations.map(async (item) => ({ ...item, media: await Promise.all(item.media.map(async (media) => ({ kind: media.kind, url: await backend.createMediaUrl(media.storagePath), mimeType: media.mimeType }))) })));
        if (!active) return;
        const savedScreen = SCREEN_IDS.has(profile.onboardingScreen as ScreenId) ? profile.onboardingScreen as ScreenId : "home";
        const resumedScreen = !profile.isAnonymous && savedScreen === "account" ? (profile.tutorialStep > 0 ? "home" : "quest") : savedScreen;
        setState((current) => ({ ...current, screen: resumedScreen, userName: profile.userName || current.userName, beanName: profile.beanName || current.beanName, tutorialStep: profile.tutorialStep, tokens: profile.tokens, accountLinked: !profile.isAnonymous, observations: hydratedObservations.length ? hydratedObservations.map((item) => ({ id: item.id, prompt: item.prompt, text: item.body, createdAt: item.createdAt, category: item.category, emoji: item.emoji, hasPhoto: item.hasPhoto, hasVoice: item.hasVoice, media: item.media, flowerSpeciesId: item.classification?.flowerSpeciesId })) : current.observations, memorySeeds: seeds.length ? seeds.map((seed) => ({ id: seed.id, observationId: seed.observationId, plantedAt: seed.plantedAt, harvestedAt: seed.harvestedAt })) : current.memorySeeds, seeds: seeds.length ? seeds.filter((seed) => !seed.plantedAt).length : current.seeds, equipped: { outfit: profile.equippedOutfit, face: profile.equippedFace || current.equipped.face || "none", background: profile.equippedBackdrop }, storeItems: inventory.length ? Object.fromEntries(inventory.map((id) => [id, true])) : current.storeItems, gardenPlacements: placements.length ? placements.map((placement) => ({ id: placement.id, itemId: placement.itemId, kind: placement.kind, slot: GARDEN_SLOTS.reduce((best, candidate, index) => Math.abs(candidate.left / 390 - placement.x) + Math.abs(candidate.top / 844 - placement.y) < best.distance ? { index, distance: Math.abs(candidate.left / 390 - placement.x) + Math.abs(candidate.top / 844 - placement.y) } : best, { index: 0, distance: Number.POSITIVE_INFINITY }).index })) : current.gardenPlacements, syncError: "" }));
      } catch (reason) { if (active) setState((current) => ({ ...current, syncError: reason instanceof Error ? reason.message : "Bean is working offline." })); }
      finally { if (active) setBackendReady(true); }
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (!backend.configured || !backendReady) return;
    const screens = new Set(["o1", "o2", "o3", "naming", "account", "quest", "qComplete", "home"]);
    const timer = window.setTimeout(() => void backend.saveOnboarding({ userName: state.userName, beanName: state.beanName, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC", onboardingScreen: (screens.has(state.screen) ? state.screen : "home") as any, tutorialStep: state.tutorialStep, onboardingCompletedAt: state.tutorialStep >= 22 ? new Date().toISOString() : undefined }).catch(() => undefined), 350);
    return () => window.clearTimeout(timer);
  }, [backendReady, state.userName, state.beanName, state.screen, state.tutorialStep]);

  return <div className="bean-app-stage"><div style={{ width: 390 * scale, height: 844 * scale, flex: "0 0 auto" }}><div className="bean-device" style={{ transform: `scale(${scale})` }}><AnimatePresence mode="wait">
    {activeScreen === "o1" && <Onboarding1 key="o1" onNext={() => navigate("o2")} />}
    {activeScreen === "o2" && <Onboarding2 key="o2" onNext={() => navigate("o3")} />}
    {activeScreen === "o3" && <Onboarding3 key="o3" onNext={() => navigate("naming")} />}
    {activeScreen === "naming" && <NamingScreen key="naming" state={state} setState={setState} onNext={() => navigate("account")} />}
    {activeScreen === "account" && <AccountScreen key="account" state={state} setState={setState} onContinue={() => navigate(state.tutorialStep > 0 || state.observations.length ? "home" : "quest")} />}
    {activeScreen === "quest" && <QuestScreen key="quest" state={state} setState={setState} onSubmit={(media) => { const observation = makeObservation("What’s something about your current physical environment that you appreciate?", state.questText.trim() || "Voice memo awaiting transcription.", state.hasPhoto, state.hasVoice); createObservation(observation, "first_quest", undefined, media); navigate("qComplete"); }} />}
    {activeScreen === "qComplete" && <QuestCompleteScreen key="qComplete" state={state} onContinue={() => setState((current) => ({ ...current, screen: "home", tutorialStep: 1 }))} />}
    {activeScreen === "home" && <HomeScreen key="home" state={state} setState={setState} onNav={navigate} onCreateObservation={createObservation} />}
    {activeScreen === "questPage" && <QuestPageScreen key="questPage" state={state} setState={setState} onNav={navigate} onCreateObservation={createObservation} />}
    {activeScreen === "garden" && <GardenStudioScreen key="garden" state={state} setState={setState} onNav={navigate} />}
    {activeScreen === "store" && <StoreScreen key="store" state={state} setState={setState} onNav={navigate} />}
    {activeScreen === "profile" && <ProfileScreen key="profile" state={state} setState={setState} onNav={navigate} />}
    {activeScreen === "pastMoments" && <NativePastMomentsScreen key="pastMoments" state={state} setState={setState} onNav={navigate} />}
    {activeScreen === "settings" && <SettingsScreen key="settings" state={state} setState={setState} onNav={navigate} />}
    {activeScreen === "beanHome" && <BeanHomeScreen key="beanHome" state={state} setState={setState} onNav={navigate} />}
  </AnimatePresence></div></div></div>;
}
