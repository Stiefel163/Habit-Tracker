import type { AppData, Mode, ModeId, Settings } from "./types";

export const DEFAULT_MODES: Record<ModeId, Mode> = {
  exam: {
    id: "exam",
    name: "Exam mode",
    icon: "🎓",
    why: "Exams first. Study, sleep, stay clean. Everything else waits, no guilt.",
    focus: ["study", "sleep", "reelFree"],
    studyBlocks: 4,
    blockMin: 90,
  },
  build: {
    id: "build",
    name: "Build mode",
    icon: "🧱",
    why: "A normal week. Three anchors; add one habit when they stick.",
    focus: ["noReels", "training", "study"],
    studyBlocks: 2,
    blockMin: 60,
  },
  offgrid: {
    id: "offgrid",
    name: "Off-grid",
    icon: "🏔️",
    why: "Travel and weekends away. Move and stay clean. That's a win.",
    focus: ["reelFree", "training"],
    studyBlocks: 1,
    blockMin: 30,
  },
};

export const DEFAULT_CLEAN_RULE = "No Reels, TikTok or Shorts feed. Posting and DMs are fine.";

export const DEFAULT_SETTINGS: Settings = {
  version: 2,
  appearance: "system",
  dayStartHour: 4,
  active: { sleep: true, noReels: true, reelFree: true, training: true, study: true, spanish: true, driving: true, create: true, supplements: true },
  sports: ["Volleyball"],
  modes: DEFAULT_MODES,
  modeLog: [],
  cleanRule: DEFAULT_CLEAN_RULE,
  identity: "I'm someone who locks in.",
  fuel: [
    "Stay hard.",
    "When your mind says you're done, you're only at 40%.",
    "Callus your mind: do the thing you don't feel like doing.",
    "The feed doesn't know your goals. You do.",
    "Treat today like a track on the album you're making.",
  ],
  setup: {},
};

/** Mode used before you ever switch. It's exam season right now. */
export const FIRST_MODE: ModeId = "exam";

export function emptyData(): AppData {
  return { version: 2, days: {}, urges: {}, wins: [], reviews: {}, settings: structuredClone(DEFAULT_SETTINGS) };
}

export function withDefaults(s: Partial<Settings> | undefined): Settings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s || s.version !== 2) return d;
  const modes = { ...d.modes };
  for (const id of Object.keys(modes) as ModeId[]) modes[id] = { ...modes[id], ...s.modes?.[id] };
  return {
    ...d,
    ...s,
    active: { ...d.active, ...s.active },
    sports: s.sports ?? d.sports,
    modes,
    modeLog: s.modeLog ?? [],
    cleanRule: s.cleanRule ?? d.cleanRule,
    fuel: s.fuel ?? d.fuel,
    setup: { ...d.setup, ...s.setup },
  };
}
