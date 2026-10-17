import type { GoalId, HabitId } from "./types";

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
  { id: "sleep", name: "Good sleep", icon: "🌙", hint: "Phone at the charger by 23:00", color: "#9b8cff", kind: "check" },
  { id: "noReels", name: "Morning lock-in", icon: "☀️", hint: "Up, breakfast, start", color: "#c7f464", kind: "check" },
  { id: "reelFree", name: "Reel-free day", icon: "🧠", hint: "No feed. Posting & DMs OK", color: "#ffffff", kind: "check" },
  { id: "training", name: "Training", icon: "🏋️", hint: "Minimum: pack the bag and go", color: "#ff9f43", kind: "choice" },
  { id: "study", name: "Study", icon: "📚", hint: "Minimum: one 15-min block", color: "#f4a6ff", kind: "minutes" },
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

export interface GoalDef {
  id: GoalId;
  habit: HabitId;
  label: string; // "40× Gym" style: number is added by the view
  unit: string;
  animal: string;
  animalName: string;
}

/** Long-term goals for the semester. Each one you finish brings an animal to your forest. */
export const GOALS: GoalDef[] = [
  { id: "gym", habit: "training", label: "Gym", unit: "sessions", animal: "🐻", animalName: "Grizzly" },
  { id: "swim", habit: "training", label: "Swimming", unit: "swims", animal: "🦫", animalName: "Beaver" },
  { id: "sport", habit: "training", label: "Other sports", unit: "games", animal: "🐺", animalName: "Wolf" },
  { id: "spanish", habit: "spanish", label: "Spanish", unit: "days", animal: "🦜", animalName: "Parrot" },
  { id: "studyHours", habit: "study", label: "Study hours", unit: "hours", animal: "🐢", animalName: "Turtle" },
  { id: "driving", habit: "driving", label: "Practice sheets", unit: "sheets", animal: "🫎", animalName: "Moose" },
  { id: "create", habit: "create", label: "Create", unit: "days", animal: "🦊", animalName: "Fox" },
  { id: "published", habit: "create", label: "Videos published", unit: "videos", animal: "🦅", animalName: "Eagle" },
  { id: "sleep", habit: "sleep", label: "Good sleep", unit: "nights", animal: "🦉", animalName: "Owl" },
  { id: "noReels", habit: "noReels", label: "Lock-in mornings", unit: "mornings", animal: "🐿️", animalName: "Squirrel" },
  { id: "reelFree", habit: "reelFree", label: "Reel-free days", unit: "days", animal: "🦌", animalName: "Elk" },
  { id: "supplements", habit: "supplements", label: "Supplements", unit: "days", animal: "🐇", animalName: "Hare" },
];

export function activityLabel(id: string): string {
  if (id.startsWith(SPORT_PREFIX)) return id.slice(SPORT_PREFIX.length);
  return [...TRAINING_FIXED, ...CREATE_OPTIONS].find((o) => o.id === id)?.label ?? id;
}
