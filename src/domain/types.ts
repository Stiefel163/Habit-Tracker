import type { DayKey } from "../lib/date";

export type HabitId = "sleep" | "noReels" | "training" | "study" | "spanish" | "driving" | "create" | "supplements";

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
  | "noReels";

export interface Settings {
  version: 2;
  appearance: "system" | "dark" | "light";
  dayStartHour: number;
  active: Record<HabitId, boolean>;
  sports: string[]; // your own activities, e.g. Volleyball
  goals: Record<GoalId, number>;
}

export interface AppData {
  version: 2;
  days: Record<DayKey, DayLog>;
  settings: Settings;
}
