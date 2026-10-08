import type { GoalId, HabitId } from "./types";

export interface HabitDef {
  id: HabitId;
  name: string;
  icon: string;
  hint: string; // what "done" means, shown under the name
  color: string; // fruit color on the tree (never the only signal: rows also show text + check)
  choice?: boolean; // opens a small picker instead of toggling
}

export const HABITS: HabitDef[] = [
  { id: "sleep", name: "Good sleep", icon: "🌙", hint: "Bed ~23:00, up ~07:00", color: "#9b8cff" },
  { id: "training", name: "Training", icon: "🏋️", hint: "Gym, swim or any sport", color: "#ff9f43", choice: true },
  { id: "spanish", name: "Spanish", icon: "🇪🇸", hint: "Any session counts", color: "#ffd23f" },
  { id: "driving", name: "Driving theory", icon: "🚗", hint: "Any session counts", color: "#4fa3ff" },
  { id: "create", name: "Create", icon: "🎬", hint: "Edit, film, write, post", color: "#ff5d8f", choice: true },
  { id: "supplements", name: "Supplements", icon: "💊", hint: "Your daily set", color: "#5ee0b5" },
  { id: "noReels", name: "No reels after waking", icon: "📵", hint: "Out of bed before scrolling", color: "#c7f464" },
];

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
  { id: "driving", habit: "driving", label: "Driving theory", unit: "days", animal: "🫎", animalName: "Moose" },
  { id: "create", habit: "create", label: "Create", unit: "days", animal: "🦊", animalName: "Fox" },
  { id: "published", habit: "create", label: "Videos published", unit: "videos", animal: "🦅", animalName: "Eagle" },
  { id: "sleep", habit: "sleep", label: "Good sleep", unit: "nights", animal: "🦉", animalName: "Owl" },
  { id: "noReels", habit: "noReels", label: "Reel-free mornings", unit: "mornings", animal: "🐿️", animalName: "Squirrel" },
  { id: "supplements", habit: "supplements", label: "Supplements", unit: "days", animal: "🐇", animalName: "Hare" },
];

export function activityLabel(id: string): string {
  if (id.startsWith(SPORT_PREFIX)) return id.slice(SPORT_PREFIX.length);
  return [...TRAINING_FIXED, ...CREATE_OPTIONS].find((o) => o.id === id)?.label ?? id;
}
