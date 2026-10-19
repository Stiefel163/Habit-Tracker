import type { DayKey } from "../lib/date";
import { HABITS } from "./habits";
import type { AppData, DayLog, HabitId, Settings } from "./types";

export const isDone = (log: DayLog | undefined, h: HabitId) => (log?.[h]?.length ?? 0) > 0;

export function activeHabits(s: Settings) {
  return HABITS.filter((h) => s.active[h.id]);
}

export const STAGES = ["Seed", "Sprout", "Sapling", "Young tree", "Tree", "Full tree"] as const;

export function stageOf(p: number): number {
  if (p >= 1) return 5;
  if (p <= 0) return 0;
  return Math.min(4, 1 + Math.floor(p * 4));
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
