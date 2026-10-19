import type { DayKey } from "../lib/date";

export type HabitId = "sleep" | "noReels" | "reelFree" | "training" | "study" | "spanish" | "driving" | "create" | "supplements";

/**
 * What happened on one day. A habit is "done" when its list has at least one item.
 * Simple habits store ["done"]; Training stores what you did (["gym", "sport:Volleyball"]);
 * Create stores ["worked"] and/or ["published"].
 * Study stores one entry per block in minutes (["90", "15"]).
 * Driving theory stores one entry per practice sheet (Bogen): ["pass", "fail"].
 * ("noReels" keeps its id for saved data; it is shown as "Morning lock-in".
 *  "reelFree" is shown as "Clean day".)
 */
export type DayLog = Partial<Record<HabitId, string[]>>;

export type ModeId = "exam" | "build" | "offgrid";

/** A season of life: which few things matter right now. Everything else is paused. */
export interface Mode {
  id: ModeId;
  name: string;
  icon: string;
  why: string;
  focus: HabitId[]; // max 4, usually 3
  studyBlocks: number; // study target per day = blocks × blockMin
  blockMin: number;
}

export interface Settings {
  version: 2;
  appearance: "system" | "dark" | "light";
  dayStartHour: number;
  active: Record<HabitId, boolean>;
  sports: string[]; // your own activities, e.g. Volleyball
  modes: Record<ModeId, Mode>;
  /** When you switched modes. The mode on a day is the last switch on or before it. */
  modeLog: { date: DayKey; mode: ModeId }[];
  cleanRule: string; // what a clean day means to you
  identity: string;
  fuel: string[]; // your lines: lyrics, quotes, reminders. One shows per day.
  setup: Record<string, boolean>; // one-time phone setup
}

/** The Sunday check-in: one optional line. Keyed by the week's Monday. */
export interface Review {
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
