import type { HabitId } from "./types";

export interface HabitDef {
  id: HabitId;
  name: string;
  icon: string;
  hint: string; // what "done" means, shown under the name
  color: string; // fruit color on the tree (never the only signal: rows also show text + check)
  /** check: one tap toggles · choice: pick what you did · minutes: add study blocks · sheets: count Bögen */
  kind: "check" | "choice" | "minutes" | "sheets";
}

export const HABITS: HabitDef[] = [
  { id: "sleep", name: "Sleep on time", icon: "🌙", hint: "Phone at the charger, lights out", color: "#9b8cff", kind: "check" },
  { id: "noReels", name: "Morning lock-in", icon: "☀️", hint: "Up, breakfast, start", color: "#c7f464", kind: "check" },
  { id: "reelFree", name: "Clean day", icon: "🧠", hint: "Your rule, see Settings", color: "#e8eef2", kind: "check" },
  { id: "training", name: "Training", icon: "🏋️", hint: "Minimum: pack the bag and go", color: "#ff9f43", kind: "choice" },
  { id: "study", name: "Study", icon: "📚", hint: "Tap a block when it's done", color: "#f4a6ff", kind: "minutes" },
  { id: "spanish", name: "Spanish", icon: "🇪🇸", hint: "Minimum: one lesson", color: "#ffd23f", kind: "check" },
  { id: "driving", name: "Driving theory", icon: "🚗", hint: "Minimum: one Bogen", color: "#4fa3ff", kind: "sheets" },
  { id: "create", name: "Create", icon: "🎬", hint: "Minimum: cut one clip", color: "#ff5d8f", kind: "choice" },
  { id: "supplements", name: "Supplements", icon: "💊", hint: "With breakfast", color: "#5ee0b5", kind: "check" },
];

export const STUDY_BLOCKS = [15, 30, 45, 60, 90, 120];
/** German theory exam (class B): ≤10 error points passes. */
export const SHEET_PASS_RULE = "≤ 10 error points";

export const HABIT_BY_ID = Object.fromEntries(HABITS.map((h) => [h.id, h])) as Record<HabitId, HabitDef>;

export const TRAINING_FIXED = [
  { id: "gym", label: "Gym", icon: "🏋️" },
  { id: "swim", label: "Swimming", icon: "🏊" },
];
export const SPORT_PREFIX = "sport:";

export const CREATE_OPTIONS = [
  { id: "worked", label: "Worked on content", icon: "🎬" },
  { id: "published", label: "Published a video", icon: "🚀" },
];

export function activityLabel(id: string): string {
  if (id.startsWith(SPORT_PREFIX)) return id.slice(SPORT_PREFIX.length);
  return [...TRAINING_FIXED, ...CREATE_OPTIONS].find((o) => o.id === id)?.label ?? id;
}

/** After exams, add habits back one at a time, easiest first. */
export const LADDER: HabitId[] = ["supplements", "driving", "spanish", "create", "noReels", "training", "sleep", "reelFree", "study"];
