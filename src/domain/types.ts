import type { DayKey } from "../lib/date";

/**
 * Storage model. Everything the player does is one ActivityLog.
 * Levels, skills, missions, streaks and achievements are *derived* from the logs
 * (see rpg.ts), so they can never drift out of sync and can't be gamed.
 */

export type SkillId = "strength" | "swimming" | "spanish" | "creator" | "driving" | "focus" | "discipline";

export type Split = "push" | "pull" | "legs" | "upper" | "lower" | "full" | "other";

interface BaseLog {
  id: string;
  date: DayKey; // the day it counts for
  at: string; // ISO timestamp when it was logged
}

export interface StrengthLog extends BaseLog {
  kind: "strength";
  split?: Split;
  minutes?: number;
}

export interface SwimLog extends BaseLog {
  kind: "swim";
  minutes?: number;
}

/** One completed Spanish day. Max one per calendar day. */
export interface SpanishDay extends BaseLog {
  kind: "spanish";
  better: string; // "What got better today?"
  minutes?: number;
}

/** One published video on the Road to 100. */
export interface PublishedVideo extends BaseLog {
  kind: "video";
  better: string; // "What got better with this video?"
  title?: string;
}

/** Completed practice sheets (Bögen). */
export interface DrivingLog extends BaseLog {
  kind: "bogen";
  count: number;
}

/** Focused work, logged afterwards. XP is proportional to time. */
export interface FocusLog extends BaseLog {
  kind: "focus";
  minutes: number;
  category: string;
}

/** Daily good-behaviour check-in. One per day; saving again for that day replaces it. */
export interface CleanDay extends BaseLog {
  kind: "clean";
  social: boolean; // kept social media low
  goon: boolean; // no gooning
  sleep: boolean; // kept good sleep times
}

/** Stay Hard (Goggins): one tap each time you resisted something, or did something anyway. */
export interface StayHard extends BaseLog {
  kind: "hard";
  type: "resist" | "anyway";
}

export type ActivityLog = StrengthLog | SwimLog | SpanishDay | PublishedVideo | DrivingLog | FocusLog | CleanDay | StayHard;
export type LogKind = ActivityLog["kind"];

export interface WeeklyTargets {
  strength: number;
  swim: number;
  spanish: number; // days
  videos: number;
  bogen: number;
  focusHours: number;
  clean: number; // days with all three kept
}

export interface Win {
  date: DayKey;
  text: string;
}

export interface Settings {
  version: 3;
  dayStartHour: number;
  targets: WeeklyTargets;
  shieldEvery: number; // successful Spanish days to recharge the Streak Shield
  focusCategories: string[];
  vision: string; // why you do this (shown on Home)
  sound: boolean; // sound + haptics on rewards
  /** One-time settings updates already applied, so they never run twice. */
  applied?: string[];
}

export interface AppData {
  version: 3;
  logs: ActivityLog[];
  /** The cookie jar: wins you wrote down yourself (trips, the scholarship …). */
  wins: Win[];
  settings: Settings;
  /** Untouched data from earlier app versions, kept so nothing is ever lost. */
  legacy?: unknown;
}
