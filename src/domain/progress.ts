import type { DayKey } from "../lib/date";
import { GOALS, HABITS, SPORT_PREFIX, type GoalDef } from "./habits";
import type { AppData, DayLog, GoalId, HabitId, Settings } from "./types";

export const isDone = (log: DayLog | undefined, h: HabitId) => (log?.[h]?.length ?? 0) > 0;

export function activeHabits(s: Settings) {
  return HABITS.filter((h) => s.active[h.id]);
}

/** How much of the day's tree has grown: done / active habits, 0..1. */
export function dayProgress(log: DayLog | undefined, s: Settings) {
  const active = activeHabits(s);
  const done = active.filter((h) => isDone(log, h.id)).length;
  return { done, total: active.length, p: active.length ? done / active.length : 0 };
}

export const STAGES = ["Seed", "Sprout", "Sapling", "Young tree", "Tree", "Full tree"] as const;

export function stageOf(p: number): number {
  if (p >= 1) return 5;
  if (p <= 0) return 0;
  return Math.min(4, 1 + Math.floor(p * 4));
}

/** Counts toward each long-term goal across all days. */
export function goalCounts(days: AppData["days"]): Record<GoalId, number> {
  const c: Record<GoalId, number> = { gym: 0, swim: 0, sport: 0, studyHours: 0, spanish: 0, driving: 0, create: 0, published: 0, sleep: 0, supplements: 0, noReels: 0 };
  let studyMin = 0;
  for (const log of Object.values(days)) {
    const t = log.training ?? [];
    if (t.includes("gym")) c.gym++;
    if (t.includes("swim")) c.swim++;
    c.sport += t.filter((x) => x.startsWith(SPORT_PREFIX)).length;
    if (isDone(log, "spanish")) c.spanish++;
    c.driving += sheetsOf(log).length;
    studyMin += studyMinutes(log);
    if (isDone(log, "create")) c.create++;
    if (log.create?.includes("published")) c.published++;
    if (isDone(log, "sleep")) c.sleep++;
    if (isDone(log, "supplements")) c.supplements++;
    if (isDone(log, "noReels")) c.noReels++;
  }
  c.studyHours = Math.floor(studyMin / 60);
  return c;
}

/** Minutes studied that day. */
export function studyMinutes(log: DayLog | undefined): number {
  return (log?.study ?? []).reduce((a, x) => a + (parseInt(x, 10) || 0), 0);
}

/** Practice sheets (Bögen) that day, in order. Older "done" marks aren't sheets. */
export function sheetsOf(log: DayLog | undefined): ("pass" | "fail")[] {
  return (log?.driving ?? []).filter((x): x is "pass" | "fail" => x === "pass" || x === "fail");
}

export interface SheetStats {
  total: number;
  passed: number;
  recent: number; // size of the recent window (up to 10)
  recentPassed: number;
}

/** All sheets ever, plus how many of the last 10 were passed: the best readiness signal. */
export function sheetStats(days: AppData["days"]): SheetStats {
  const all = Object.keys(days)
    .sort()
    .flatMap((d) => sheetsOf(days[d]));
  const recent = all.slice(-10);
  return {
    total: all.length,
    passed: all.filter((x) => x === "pass").length,
    recent: recent.length,
    recentPassed: recent.filter((x) => x === "pass").length,
  };
}

export function studyTotals(days: AppData["days"], dates: DayKey[]) {
  const min = dates.reduce((a, d) => a + studyMinutes(days[d]), 0);
  const blocks = dates.reduce((a, d) => a + (days[d]?.study?.length ?? 0), 0);
  return { min, blocks };
}

export function formatMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (!h) return `${m} min`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export interface GoalState extends GoalDef {
  target: number;
  count: number;
  reached: boolean;
}

export function goalStates(data: AppData): GoalState[] {
  const counts = goalCounts(data.days);
  const s = data.settings;
  return GOALS.filter((g) => s.active[g.habit] && s.goals[g.id] > 0).map((g) => ({
    ...g,
    target: s.goals[g.id],
    count: counts[g.id],
    reached: counts[g.id] >= s.goals[g.id],
  }));
}

export function forestStats(data: AppData, today: DayKey) {
  let trees = 0;
  let full = 0;
  for (const [day, log] of Object.entries(data.days)) {
    if (day > today) continue;
    const { p } = dayProgress(log, data.settings);
    if (p > 0) trees++;
    if (p >= 1) full++;
  }
  return { trees, full };
}
