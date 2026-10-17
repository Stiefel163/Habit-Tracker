import type { DayKey } from "../lib/date";

export type HabitId = "sleep" | "noReels" | "reelFree" | "training" | "study" | "spanish" | "driving" | "create" | "supplements";

/**
 * What happened on one day. A habit is "done" when its list has at least one item.
 * Simple habits store ["done"]; Training stores what you did (["gym", "sport:Volleyball"]);
 * Create stores ["worked"] and/or ["published"].
 * Study stores one entry per block in minutes (["30", "45"]).
 * Driving theory stores one entry per practice sheet (Bogen): ["pass", "fail", "pass"].
 * ("noReels" keeps its id for saved data; it is shown as "Morning lock-in".)
 */
export type DayLog = Partial<Record<HabitId, string[]>>;

export type GoalId =
  | "gym"
  | "swim"
  | "sport"
  | "spanish"
  | "driving"
  | "studyHours"
  | "create"
  | "published"
  | "sleep"
  | "supplements"
  | "noReels"
  | "reelFree";

export interface Settings {
  version: 2;
  appearance: "system" | "dark" | "light";
  dayStartHour: number;
  active: Record<HabitId, boolean>;
  sports: string[]; // your own activities, e.g. Volleyball
  goals: Record<GoalId, number>;
  dailyGoal: number; // checks needed for a streak day (Duolingo-style, kept small)
  identity: string; // "I'm someone who …"
  fuel: string[]; // your lines: lyrics, quotes, reminders. One shows per day.
  resetStart?: DayKey; // first day of the 30-day short-form reset
  setup: Record<string, boolean>; // one-time environment checklist
}

/** Goggins' accountability mirror: a 2-minute weekly look back. Keyed by the week's Monday. */
export interface Review {
  good: string;
  trigger: string;
  change: string;
}

export interface Win {
  date: DayKey;
  text: string;
}

export interface AppData {
  version: 2;
  days: Record<DayKey, DayLog>;
  /** Urges you beat, per day: what you turned each one into ("study", "walk", "passed" …). */
  urges: Record<DayKey, string[]>;
  /** The cookie jar: wins you wrote down to remember on hard days. */
  wins: Win[];
  reviews: Record<DayKey, Review>;
  settings: Settings;
}
