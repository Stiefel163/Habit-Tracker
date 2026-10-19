import { addDays, weekStart, type DayKey } from "../lib/date";
import { FIRST_MODE } from "./defaults";
import { HABIT_BY_ID, LADDER, type HabitDef } from "./habits";
import { isDone, sheetsOf, studyMinutes } from "./progress";
import type { AppData, DayLog, HabitId, Mode, Settings } from "./types";

/* ------------------------------------------------------------------
   Modes and focus: only a few things matter on any given day
   ------------------------------------------------------------------ */

export const MAX_FOCUS = 4;

export function modeOn(s: Settings, date: DayKey): Mode {
  let id = FIRST_MODE;
  for (const e of [...s.modeLog].sort((a, b) => a.date.localeCompare(b.date))) if (e.date <= date) id = e.mode;
  return s.modes[id];
}

export function focusOf(s: Settings, date: DayKey): HabitDef[] {
  return modeOn(s, date)
    .focus.filter((h) => s.active[h])
    .map((h) => HABIT_BY_ID[h]);
}

export function studyTarget(m: Mode): number {
  return m.studyBlocks * m.blockMin;
}

/** How far one habit got today, 0..1. Study grows block by block toward the mode's target. */
export function partOf(log: DayLog | undefined, h: HabitId, m: Mode): number {
  if (h === "study") return Math.min(1, studyMinutes(log) / Math.max(1, studyTarget(m)));
  return isDone(log, h) ? 1 : 0;
}

export interface DayFocus {
  mode: Mode;
  focus: HabitDef[];
  parts: number[];
  done: number; // focus habits fully done
  total: number;
  p: number; // 0..1, partial study counts
  lockedIn: boolean;
}

export function dayFocus(data: AppData, date: DayKey): DayFocus {
  const mode = modeOn(data.settings, date);
  const focus = focusOf(data.settings, date);
  const log = data.days[date];
  const parts = focus.map((h) => partOf(log, h.id, mode));
  const done = parts.filter((x) => x >= 1).length;
  const p = focus.length ? parts.reduce((a, x) => a + x, 0) / focus.length : 0;
  return { mode, focus, parts, done, total: focus.length, p, lockedIn: focus.length > 0 && done === focus.length };
}

/* ------------------------------------------------------------------
   Streak: locked-in days in a row. One missed day is forgiven by a freeze
   (you start with one, earn one every 7 days, max 2). Never miss twice.
   ------------------------------------------------------------------ */

export type StreakMark = "met" | "frozen" | "missed" | "pending" | "none";

export interface Streak {
  days: number;
  freezes: number;
  todayMet: boolean;
  marks: Record<DayKey, StreakMark>;
}

export function computeStreak(data: AppData, today: DayKey): Streak {
  const marks: Record<DayKey, StreakMark> = {};
  const logged = Object.keys(data.days).filter((d) => d <= today).sort();
  let days = 0;
  let freezes = 1;
  if (!logged.length) return { days: 0, freezes, todayMet: false, marks };
  for (let d = logged[0]; d < today; d = addDays(d, 1)) {
    if (dayFocus(data, d).lockedIn) {
      days++;
      marks[d] = "met";
      if (days % 7 === 0) freezes = Math.min(2, freezes + 1);
    } else if (days > 0 && freezes > 0) {
      freezes--;
      marks[d] = "frozen";
    } else {
      days = 0;
      marks[d] = "missed";
    }
  }
  const todayMet = dayFocus(data, today).lockedIn;
  if (todayMet) days++;
  marks[today] = todayMet ? "met" : "pending";
  return { days, freezes, todayMet, marks };
}

export function lockedInDays(data: AppData, today: DayKey): number {
  return Object.keys(data.days).filter((d) => d <= today && dayFocus(data, d).lockedIn).length;
}

/* ------------------------------------------------------------------
   Eras: your level, named after Kanye's albums. One locked-in day = one step.
   ------------------------------------------------------------------ */

export const ERAS = [
  { name: "The College Dropout", at: 0 },
  { name: "Late Registration", at: 5 },
  { name: "Graduation", at: 12 },
  { name: "My Beautiful Dark Twisted Fantasy", at: 22 },
  { name: "Yeezus", at: 35 },
  { name: "The Life of Pablo", at: 50 },
  { name: "Donda", at: 70 },
];

export function eraOf(lockedDays: number) {
  let i = 0;
  while (i + 1 < ERAS.length && lockedDays >= ERAS[i + 1].at) i++;
  const next = ERAS[i + 1];
  const from = ERAS[i].at;
  return {
    era: ERAS[i],
    index: i,
    next,
    toNext: next ? next.at - lockedDays : 0,
    progress: next ? (lockedDays - from) / (next.at - from) : 1,
  };
}

/* ------------------------------------------------------------------
   Clean days, the next habit to add, and the Sunday check-in
   ------------------------------------------------------------------ */

export function cleanDays(data: AppData, today: DayKey, window = 30): number {
  let n = 0;
  for (let i = 0; i < window; i++) if (isDone(data.days[addDays(today, -i)], "reelFree")) n++;
  return n;
}

/**
 * Atomic Habits: add one habit at a time, only when the current ones stick.
 * In Build mode, after 10 locked-in days out of the last 14, suggest the next one.
 */
export function nextHabit(data: AppData, today: DayKey): { habit: HabitDef; locked: number; ready: boolean } | null {
  const mode = modeOn(data.settings, today);
  if (mode.id !== "build" || mode.focus.length >= MAX_FOCUS) return null;
  const next = LADDER.find((h) => data.settings.active[h] && !mode.focus.includes(h));
  if (!next) return null;
  let locked = 0;
  for (let i = 1; i <= 14; i++) if (dayFocus(data, addDays(today, -i)).lockedIn) locked++;
  return { habit: HABIT_BY_ID[next], locked, ready: locked >= 10 };
}

/** The Sunday check-in is shown Sunday and Monday, for the week that is ending/just ended. */
export function checkInWeek(date: DayKey): DayKey | null {
  const dow = (new Date(date + "T12:00:00").getDay() + 6) % 7; // Mon = 0
  if (dow === 6) return weekStart(date);
  if (dow === 0) return addDays(weekStart(date), -7);
  return null;
}

/* ------------------------------------------------------------------
   Urges and the cookie jar (Goggins)
   ------------------------------------------------------------------ */

export function urgesBeaten(data: AppData): number {
  return Object.values(data.urges).reduce((a, list) => a + list.length, 0);
}

export function cookies(data: AppData, today: DayKey): string[] {
  const out: string[] = [];
  const urges = urgesBeaten(data);
  if (urges) out.push(`You beat ${urges} ${urges === 1 ? "urge" : "urges"} instead of scrolling.`);
  const locked = lockedInDays(data, today);
  if (locked) out.push(`${locked} ${locked === 1 ? "day" : "days"} fully locked in.`);
  const s = computeStreak(data, today);
  if (s.days >= 3) out.push(`${s.days} days in a row.`);
  const passed = Object.values(data.days).flatMap((l) => sheetsOf(l)).filter((x) => x === "pass").length;
  if (passed) out.push(`${passed} Bögen passed.`);
  const study = Object.values(data.days).reduce((a, l) => a + studyMinutes(l), 0);
  if (study >= 60) out.push(`${Math.floor(study / 60)} hours studied.`);
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
  { id: "study", label: "15-min study block", icon: "📚", minutes: 15 },
  { id: "pushups", label: "20 push-ups", icon: "💪", minutes: 0 },
  { id: "walk", label: "10 min outside", icon: "🚶", minutes: 10 },
  { id: "cold", label: "Cold shower", icon: "🚿", minutes: 0 },
  { id: "bogen", label: "One Bogen", icon: "🚗", minutes: 0 },
  { id: "wait", label: "Just wait 10 minutes", icon: "⏳", minutes: 10 },
];
