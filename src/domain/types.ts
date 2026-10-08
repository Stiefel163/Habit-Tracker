import type { DayKey } from "../lib/date";
import type { Clock } from "../lib/time";

export type HabitId = "sleep" | "training" | "spanish" | "driving" | "create" | "supplements" | "noReels";

/**
 * done     – the behavior happened
 * partial  – logged, but below the bar (short session, off-rhythm night, some supplements)
 * rest     – deliberate rest day, never a failure
 * skipped  – consciously logged as "not today" (neutral, not red)
 */
export type EntryState = "done" | "partial" | "rest" | "skipped";

/** What a card shows. "empty" = nothing logged yet. */
export type CardState = EntryState | "empty";

export interface SleepData {
  bed: Clock; // got into bed
  wake: Clock; // got out of bed
  sleepMin?: number; // optional actual sleep
}

export interface SupplementData {
  taken: string[]; // supplement ids
}

/**
 * One row per logged session. Several entries per habit and day are allowed
 * (e.g. gym in the morning, swim in the evening).
 */
export interface Entry {
  id: string;
  date: DayKey;
  habit: HabitId;
  subtype?: string; // training: strength|swim|other|rest · spanish: lesson|… · create: edit|… · noReels: yes|no
  detail?: string; // strength split: push|pull|…
  durationMin?: number;
  value?: number; // driving: practice questions · create/post: videos published
  state: EntryState;
  note?: string;
  data?: SleepData | SupplementData;
  createdAt: string;
  updatedAt: string;
}

export interface DayNote {
  date: DayKey;
  text: string;
  updatedAt: string;
}

export interface Supplement {
  id: string;
  name: string;
  active: boolean;
}

export interface Targets {
  strength: number;
  swim: number;
  spanish: number;
  driving: number;
  create: number;
  sleep: number; // nights on rhythm per week
  supplements: number; // days per week
  noReels: number; // mornings per week
}

export interface Settings {
  version: 1;
  appearance: "system" | "dark" | "light";
  dayStartHour: number;
  active: Record<HabitId, boolean>;
  targets: Targets;
  sleep: { bed: Clock; wake: Clock; toleranceMin: number };
  spanishMinMinutes: number;
  supplements: Supplement[];
  noReelsRule: string;
}

export interface AppData {
  entries: Entry[];
  notes: DayNote[];
  settings: Settings;
}
