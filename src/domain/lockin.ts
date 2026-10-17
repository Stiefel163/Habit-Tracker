import { addDays, type DayKey } from "../lib/date";
import { HABITS } from "./habits";
import { activeHabits, dayProgress, goalStates, isDone, sheetsOf } from "./progress";
import type { AppData, HabitId } from "./types";

/* ------------------------------------------------------------------
   Streak (Duolingo-style, with freezes so one bad day isn't the end)
   ------------------------------------------------------------------ */

export type StreakMark = "met" | "frozen" | "missed" | "pending" | "none";

export interface Streak {
  days: number; // current streak, including today if today's goal is met
  freezes: number; // banked freezes (max 2)
  todayMet: boolean;
  marks: Record<DayKey, StreakMark>;
}

export const MAX_FREEZES = 2;
export const FREEZE_EVERY = 7; // earn one freeze every 7 streak days

/**
 * A day counts when you hit the small daily goal (default: 3 checks).
 * You start with 1 freeze and earn another every 7 streak days. A missed day
 * uses a freeze automatically, so only missing twice in a row breaks it:
 * "never miss twice" built into the streak.
 */
export function computeStreak(data: AppData, today: DayKey): Streak {
  const goal = Math.max(1, data.settings.dailyGoal);
  const met = (d: DayKey) => dayProgress(data.days[d], data.settings).done >= goal;
  const marks: Record<DayKey, StreakMark> = {};
  const logged = Object.keys(data.days).filter((d) => d <= today).sort();
  let days = 0;
  let freezes = 1;
  if (!logged.length) return { days: 0, freezes, todayMet: false, marks };

  for (let d = logged[0]; d < today; d = addDays(d, 1)) {
    if (met(d)) {
      days++;
      marks[d] = "met";
      if (days % FREEZE_EVERY === 0) freezes = Math.min(MAX_FREEZES, freezes + 1);
    } else if (days > 0 && freezes > 0) {
      freezes--;
      marks[d] = "frozen";
    } else {
      days = 0;
      marks[d] = "missed";
    }
  }
  const todayMet = met(today);
  if (todayMet) days++;
  marks[today] = todayMet ? "met" : "pending";
  return { days, freezes, todayMet, marks };
}

/* ------------------------------------------------------------------
   30-day short-form reset (Dopamine Nation)
   ------------------------------------------------------------------ */

export const RESET_DAYS = 30;

export interface Reset {
  started: boolean;
  day: number; // 1..30 (or more when finished)
  clean: number; // reel-free days inside the 30-day window
  finished: boolean;
}

export function resetState(data: AppData, today: DayKey): Reset {
  const start = data.settings.resetStart;
  if (!start) return { started: false, day: 0, clean: 0, finished: false };
  let day = 0;
  let clean = 0;
  for (let d = start, i = 0; d <= today && i < RESET_DAYS; d = addDays(d, 1), i++) {
    day = i + 1;
    if (isDone(data.days[d], "reelFree")) clean++;
  }
  const finished = addDays(start, RESET_DAYS - 1) < today;
  return { started: true, day, clean, finished };
}

/* ------------------------------------------------------------------
   Urges, votes, eras
   ------------------------------------------------------------------ */

export function urgesBeaten(data: AppData): number {
  return Object.values(data.urges).reduce((a, list) => a + list.length, 0);
}

/** Every check is a vote for who you're becoming. */
export function votes(data: AppData): number {
  let n = 0;
  for (const log of Object.values(data.days)) n += activeHabits(data.settings).filter((h) => isDone(log, h.id)).length;
  return n + urgesBeaten(data);
}

/** Your progress through the semester, named after Kanye's albums. */
export const ERAS = [
  { name: "The College Dropout", at: 0 },
  { name: "Late Registration", at: 40 },
  { name: "Graduation", at: 120 },
  { name: "My Beautiful Dark Twisted Fantasy", at: 250 },
  { name: "Yeezus", at: 400 },
  { name: "The Life of Pablo", at: 600 },
  { name: "Donda", at: 850 },
];

export function eraOf(v: number) {
  let i = 0;
  while (i + 1 < ERAS.length && v >= ERAS[i + 1].at) i++;
  const next = ERAS[i + 1];
  return { era: ERAS[i], next, toNext: next ? next.at - v : 0, index: i };
}

/** Habits you skipped yesterday that are still open today: "don't miss twice". */
export function missedYesterday(data: AppData, date: DayKey): Set<HabitId> {
  const y = data.days[addDays(date, -1)];
  const t = data.days[date];
  const hadAny = !!y || Object.keys(data.days).some((d) => d < addDays(date, -1));
  if (!hadAny) return new Set();
  return new Set(activeHabits(data.settings).filter((h) => !isDone(y, h.id) && !isDone(t, h.id)).map((h) => h.id));
}

/* ------------------------------------------------------------------
   Cookie jar (Goggins): proof you can do hard things
   ------------------------------------------------------------------ */

export function cookies(data: AppData, today: DayKey): string[] {
  const out: string[] = [];
  const urges = urgesBeaten(data);
  if (urges) out.push(`You beat ${urges} ${urges === 1 ? "urge" : "urges"} instead of scrolling.`);
  const full = Object.entries(data.days).filter(([d, log]) => d <= today && dayProgress(log, data.settings).p >= 1).length;
  if (full) out.push(`${full} full ${full === 1 ? "tree" : "trees"}: days where you did everything.`);
  const passed = Object.values(data.days).flatMap((l) => sheetsOf(l)).filter((x) => x === "pass").length;
  if (passed) out.push(`${passed} Bögen passed.`);
  goalStates(data)
    .filter((g) => g.reached)
    .forEach((g) => out.push(`Goal crushed: ${g.target}× ${g.label}.`));
  const s = computeStreak(data, today);
  if (s.days >= 3) out.push(`${s.days} days in a row locked in.`);
  data.wins.forEach((w) => out.push(w.text));
  return out;
}

/** One line of fuel per day, stable for the whole day. */
export function fuelFor(lines: string[], date: DayKey): string {
  if (!lines.length) return "";
  const n = date.split("-").reduce((a, x) => a * 31 + Number(x), 7);
  return lines[n % lines.length];
}

/** What an urge can be turned into. Some also log the matching habit. */
export const URGE_ACTIONS = [
  { id: "study", label: "15-min study block", icon: "📚", minutes: 15, habit: "study" as HabitId },
  { id: "bogen", label: "One Bogen", icon: "🚗", minutes: 0, habit: "driving" as HabitId },
  { id: "spanish", label: "One Spanish lesson", icon: "🇪🇸", minutes: 0, habit: "spanish" as HabitId },
  { id: "pushups", label: "20 push-ups", icon: "💪", minutes: 0 },
  { id: "walk", label: "10 min outside", icon: "🚶", minutes: 10 },
  { id: "cold", label: "Cold shower", icon: "🚿", minutes: 0 },
  { id: "wait", label: "Just wait 10 minutes", icon: "⏳", minutes: 10 },
];

export const HABIT_NAMES = Object.fromEntries(HABITS.map((h) => [h.id, h.name]));
