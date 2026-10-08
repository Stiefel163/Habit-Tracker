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
  const c: Record<GoalId, number> = { gym: 0, swim: 0, sport: 0, spanish: 0, driving: 0, create: 0, published: 0, sleep: 0, supplements: 0, noReels: 0 };
  for (const log of Object.values(days)) {
    const t = log.training ?? [];
    if (t.includes("gym")) c.gym++;
    if (t.includes("swim")) c.swim++;
    c.sport += t.filter((x) => x.startsWith(SPORT_PREFIX)).length;
    if (isDone(log, "spanish")) c.spanish++;
    if (isDone(log, "driving")) c.driving++;
    if (isDone(log, "create")) c.create++;
    if (log.create?.includes("published")) c.published++;
    if (isDone(log, "sleep")) c.sleep++;
    if (isDone(log, "supplements")) c.supplements++;
    if (isDone(log, "noReels")) c.noReels++;
  }
  return c;
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
