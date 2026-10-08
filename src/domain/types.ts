import type { DayKey } from "../lib/date";

export type HabitId = "sleep" | "training" | "spanish" | "driving" | "create" | "supplements" | "noReels";

/**
 * What happened on one day. A habit is "done" when its list has at least one item.
 * Simple habits store ["done"]; Training stores what you did (["gym", "sport:Volleyball"]);
 * Create stores ["worked"] and/or ["published"].
 */
export type DayLog = Partial<Record<HabitId, string[]>>;

export type GoalId =
  | "gym"
  | "swim"
  | "sport"
  | "spanish"
  | "driving"
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
