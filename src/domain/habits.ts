import type { HabitId } from "./types";

export interface Option {
  id: string;
  label: string;
  icon?: string;
}

export interface HabitDef {
  id: HabitId;
  name: string;
  icon: string;
}

export const HABITS: HabitDef[] = [
  { id: "sleep", name: "Sleep", icon: "🌙" },
  { id: "training", name: "Training", icon: "🏋️" },
  { id: "spanish", name: "Spanish", icon: "🇪🇸" },
  { id: "driving", name: "Driving Theory", icon: "🚗" },
  { id: "create", name: "Create", icon: "🎬" },
  { id: "supplements", name: "Supplements", icon: "💊" },
  { id: "noReels", name: "No Reels After Waking", icon: "📵" },
];

export const HABIT_BY_ID = Object.fromEntries(HABITS.map((h) => [h.id, h])) as Record<HabitId, HabitDef>;

export const TRAINING_TYPES: Option[] = [
  { id: "strength", label: "Strength", icon: "🏋️" },
  { id: "swim", label: "Swimming", icon: "🏊" },
  { id: "other", label: "Other activity", icon: "🚶" },
  { id: "rest", label: "Rest day", icon: "😴" },
];

export const STRENGTH_SPLITS: Option[] = [
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "upper", label: "Upper" },
  { id: "lower", label: "Lower" },
  { id: "full", label: "Full body" },
  { id: "other", label: "Other" },
];

export const SPANISH_TYPES: Option[] = [
  { id: "lesson", label: "Lesson" },
  { id: "self", label: "Self-study" },
  { id: "homework", label: "Homework" },
  { id: "speaking", label: "Speaking" },
  { id: "vocab", label: "Vocabulary" },
  { id: "other", label: "Other" },
];

export const CREATE_TYPES: Option[] = [
  { id: "edit", label: "Edit" },
  { id: "learn", label: "Learn" },
  { id: "film", label: "Film" },
  { id: "script", label: "Script" },
  { id: "post", label: "Post" },
  { id: "organize", label: "Organize footage" },
  { id: "other", label: "Other" },
];

export const MINUTE_CHOICES = [10, 15, 20, 30, 45, 60, 90];
export const TRAINING_MINUTES = [30, 45, 60, 75, 90];
export const QUESTION_CHOICES = [10, 20, 30, 50, 100];

export function labelOf(options: Option[], id?: string): string {
  return options.find((o) => o.id === id)?.label ?? "";
}

/** Small icons for the week/month calendars. */
export const CAL_ICON = {
  strength: "🏋️",
  swim: "🏊",
  other: "🚶",
  rest: "😴",
  spanish: "🇪🇸",
  driving: "🚗",
  create: "🎬",
} as const;
