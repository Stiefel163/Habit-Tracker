import { addDays, dayIndexInWeek, weekDays, weekStart, type DayKey } from "../lib/date";
import { bedRel, clockToMin, minToClock } from "../lib/time";
import { evaluateSleep } from "./sleep";
import { counts, entriesOn, entryState, isStrength, isSwim, sum } from "./status";
import type { Entry, HabitId, Settings, SleepData } from "./types";

export interface PeriodStats {
  strength: number; // days with strength training
  swim: number;
  spanish: number; // days with a qualifying Spanish session
  driving: number;
  create: number;
  videos: number;
  supplements: number;
  noReels: number;
  sleepLogged: number;
  sleepOnRhythm: number;
  spanishMin: number;
  drivingMin: number;
  drivingQuestions: number;
  createMin: number;
  avgBed?: string;
  avgWake?: string;
  avgSleepMin?: number;
}

export function periodStats(days: DayKey[], entries: Entry[], s: Settings): PeriodStats {
  const set = new Set(days);
  const inRange = entries.filter((e) => set.has(e.date));
  const daysWith = (pred: (e: Entry) => boolean) => new Set(inRange.filter(pred).map((e) => e.date)).size;
  const of = (h: HabitId) => inRange.filter((e) => e.habit === h);

  const sleeps = of("sleep");
  const evals = sleeps.map((e) => ({ d: e.data as SleepData, ev: evaluateSleep(e.data as SleepData, s.sleep) }));
  const avg = (a: number[]) => (a.length ? sum(a) / a.length : undefined);
  const aBed = avg(evals.map((x) => bedRel(x.d.bed)));
  const aWake = avg(evals.map((x) => clockToMin(x.d.wake)));

  return {
    strength: daysWith(isStrength),
    swim: daysWith(isSwim),
    spanish: daysWith((e) => e.habit === "spanish" && counts(e, s)),
    driving: daysWith((e) => e.habit === "driving"),
    create: daysWith((e) => e.habit === "create"),
    videos: sum(of("create").filter((e) => e.subtype === "post").map((e) => e.value ?? 1)),
    supplements: daysWith((e) => e.habit === "supplements" && counts(e, s)),
    noReels: daysWith((e) => e.habit === "noReels" && counts(e, s)),
    sleepLogged: new Set(sleeps.map((e) => e.date)).size,
    sleepOnRhythm: new Set(sleeps.filter((e) => counts(e, s)).map((e) => e.date)).size,
    spanishMin: sum(of("spanish").map((e) => e.durationMin ?? 0)),
    drivingMin: sum(of("driving").map((e) => e.durationMin ?? 0)),
    drivingQuestions: sum(of("driving").map((e) => e.value ?? 0)),
    createMin: sum(of("create").map((e) => e.durationMin ?? 0)),
    avgBed: aBed === undefined ? undefined : minToClock(aBed),
    avgWake: aWake === undefined ? undefined : minToClock(aWake),
    avgSleepMin: avg(evals.map((x) => x.ev.sleepMin)),
  };
}

/** Share of active habits that were done (or deliberately rested) that day: 0..1 */
export function dayScore(date: DayKey, entries: Entry[], s: Settings): number {
  const active = (Object.keys(s.active) as HabitId[]).filter((h) => s.active[h]);
  if (!active.length) return 0;
  const day = entriesOn(entries, date);
  const ok = active.filter((h) => day.some((e) => e.habit === h && ["done", "rest"].includes(entryState(e, s)))).length;
  return ok / active.length;
}

export interface WeeklyGoal {
  key: "strength" | "swim" | "spanish" | "driving" | "create";
  habit: HabitId;
  name: string;
  target: number;
}

export function weeklyGoals(s: Settings): WeeklyGoal[] {
  const g: WeeklyGoal[] = [];
  if (s.active.training) {
    g.push({ key: "strength", habit: "training", name: "Strength", target: s.targets.strength });
    g.push({ key: "swim", habit: "training", name: "Swimming", target: s.targets.swim });
  }
  if (s.active.spanish) g.push({ key: "spanish", habit: "spanish", name: "Spanish", target: s.targets.spanish });
  if (s.active.driving) g.push({ key: "driving", habit: "driving", name: "Driving theory", target: s.targets.driving });
  if (s.active.create) g.push({ key: "create", habit: "create", name: "Create", target: s.targets.create });
  return g.filter((x) => x.target > 0);
}

/**
 * One calm sentence for the top of Today. It answers "what should I do next?"
 * so the decision is already made. No guilt, no streak drama.
 */
export function focusLine(today: DayKey, entries: Entry[], s: Settings): string {
  const todayEntries = entriesOn(entries, today);
  const yesterday = entriesOn(entries, addDays(today, -1));
  const hasHistory = entries.some((e) => e.date < today);
  if (todayEntries.length === 0 && yesterday.length === 0 && hasHistory) {
    return "Fresh start. Log one thing and today counts.";
  }

  const week = periodStats(weekDays(weekStart(today)), entries, s);
  const daysLeft = 7 - dayIndexInWeek(today);
  const doneToday = (g: WeeklyGoal) =>
    todayEntries.some((e) =>
      g.key === "strength" ? isStrength(e) : g.key === "swim" ? isSwim(e) : e.habit === g.habit,
    );

  const open = weeklyGoals(s)
    .map((g) => ({ g, left: g.target - week[g.key] }))
    .filter((x) => x.left > 0 && !doneToday(x.g))
    .sort((a, b) => b.left / daysLeft - a.left / daysLeft);

  if (!open.length) {
    const anyLeft = weeklyGoals(s).some((g) => g.target - week[g.key] > 0);
    return anyLeft ? "Today's sessions are in. Nice work." : "Weekly targets hit. Everything else is a bonus.";
  }
  const { g, left } = open[0];
  const dayWord = daysLeft === 1 ? "today is the last day" : `${daysLeft} days left`;
  if (left > daysLeft) return `${g.name}: ${week[g.key]} / ${g.target} this week. One session today still moves it.`;
  return `Next: ${g.name}. ${left} more this week, ${dayWord}.`;
}
