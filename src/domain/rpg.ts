import { addDays, monthKey, weekDays, weekStart, type DayKey } from "../lib/date";
import type { ActivityLog, AppData, LogKind, SkillId, Split, WeeklyTargets } from "./types";
import { ACHIEVEMENTS, type AchContext, type DayAgg } from "./achievements";

/* ==================================================================
   Rewards. Fixed per real action; focus is proportional to time,
   so splitting one session into many earns exactly the same.
   ================================================================== */

export const XP = {
  strength: 50,
  swim: 40,
  spanish: 25,
  video: 100,
  bogen: 10,
  focusPerHour: 25,
  cleanEach: 10,
  perfectWeek: 200,
} as const;

export const MIN_FOCUS_MIN = 15;

export const SKILLS: { id: SkillId; name: string; icon: string }[] = [
  { id: "strength", name: "Strength", icon: "🦾" },
  { id: "swimming", name: "Swimming", icon: "🏊" },
  { id: "spanish", name: "Spanish", icon: "🇪🇸" },
  { id: "creator", name: "Creator", icon: "🎬" },
  { id: "driving", name: "Driving Theory", icon: "🚗" },
  { id: "focus", name: "Focus", icon: "🧠" },
  { id: "discipline", name: "Discipline", icon: "🧘" },
];

export const SKILL_OF: Record<LogKind, SkillId> = {
  strength: "strength",
  swim: "swimming",
  spanish: "spanish",
  video: "creator",
  bogen: "driving",
  focus: "focus",
  clean: "discipline",
};

export const SPLITS: { id: Split; label: string }[] = [
  { id: "push", label: "Push" },
  { id: "pull", label: "Pull" },
  { id: "legs", label: "Legs" },
  { id: "upper", label: "Upper" },
  { id: "lower", label: "Lower" },
  { id: "full", label: "Full Body" },
  { id: "other", label: "Other" },
];

export const CLEAN_ITEMS = [
  { id: "social", icon: "📵", label: "Low social media" },
  { id: "goon", icon: "🚫", label: "No gooning" },
  { id: "sleep", icon: "😴", label: "Good sleep times" },
] as const;

export const cleanCount = (l: { social: boolean; goon: boolean; sleep: boolean }) => Number(!!l.social) + Number(!!l.goon) + Number(!!l.sleep);

export function xpOf(l: ActivityLog): number {
  switch (l.kind) {
    case "strength":
      return XP.strength;
    case "swim":
      return XP.swim;
    case "spanish":
      return XP.spanish;
    case "video":
      return XP.video;
    case "bogen":
      return XP.bogen * Math.max(0, l.count);
    case "focus":
      return Math.round((Math.max(0, l.minutes) / 60) * XP.focusPerHour);
    case "clean":
      return XP.cleanEach * cleanCount(l);
  }
}

/**
 * Anti-gaming: one strength workout, one swim and one Spanish day per calendar day.
 * Extra logs of those kinds on the same day are ignored. Focus under 15 min doesn't count.
 */
export function validLogs(logs: ActivityLog[]): ActivityLog[] {
  const seen = new Set<string>();
  const out: ActivityLog[] = [];
  // Clean-day check-ins: the latest one for a day is the one that counts.
  const latestClean = new Map<string, string>();
  for (const l of logs) if (l.kind === "clean") {
    const prev = latestClean.get(l.date);
    if (!prev || logs.find((x) => x.id === prev)!.at < l.at) latestClean.set(l.date, l.id);
  }
  for (const l of [...logs].sort((a, b) => a.at.localeCompare(b.at))) {
    if (l.kind === "clean" && latestClean.get(l.date) !== l.id) continue;
    if (l.kind === "strength" || l.kind === "swim" || l.kind === "spanish") {
      const k = `${l.kind}|${l.date}`;
      if (seen.has(k)) continue;
      seen.add(k);
    }
    if (l.kind === "focus" && l.minutes < MIN_FOCUS_MIN) continue;
    if (l.kind === "bogen" && l.count < 1) continue;
    out.push(l);
  }
  return out;
}

/* ==================================================================
   Player level 1–100 and ranks
   ================================================================== */

export const MAX_LEVEL = 100;

/** XP needed to go from `level` to `level + 1`. Early levels come fast, later ones take real work. */
export function playerXpToNext(level: number): number {
  return Math.round(60 + 2.3 * Math.pow(level, 1.5));
}

export function skillXpToNext(level: number): number {
  return 40 + 20 * level;
}

function levelFrom(total: number, toNext: (l: number) => number, max: number) {
  let level = 1;
  let rem = Math.max(0, total);
  while (level < max && rem >= toNext(level)) {
    rem -= toNext(level);
    level++;
  }
  const need = level < max ? toNext(level) : 0;
  return { level, into: rem, need, progress: need ? rem / need : 1 };
}

export const RANKS = [
  { from: 1, name: "Crook" },
  { from: 10, name: "Hustler" },
  { from: 20, name: "Enforcer" },
  { from: 30, name: "Soldier" },
  { from: 40, name: "Lieutenant" },
  { from: 50, name: "Capo" },
  { from: 60, name: "Underboss" },
  { from: 70, name: "Don" },
  { from: 80, name: "Kingpin" },
  { from: 90, name: "Boss" },
  { from: 100, name: "Mafia Boss" },
];

export function rankOf(level: number): string {
  let r = RANKS[0].name;
  for (const x of RANKS) if (level >= x.from) r = x.name;
  return r;
}

/* ==================================================================
   Weeks and missions
   ================================================================== */

export interface WeekStats {
  strength: number;
  swim: number;
  spanish: number;
  videos: number;
  bogen: number;
  focusMin: number;
  /** Days with all three good behaviours kept. */
  clean: number;
}

export function statsFor(logs: ActivityLog[], days: Set<DayKey>): WeekStats {
  const s: WeekStats = { strength: 0, swim: 0, spanish: 0, videos: 0, bogen: 0, focusMin: 0, clean: 0 };
  for (const l of logs) {
    if (!days.has(l.date)) continue;
    if (l.kind === "strength") s.strength++;
    else if (l.kind === "swim") s.swim++;
    else if (l.kind === "spanish") s.spanish++;
    else if (l.kind === "video") s.videos++;
    else if (l.kind === "bogen") s.bogen += l.count;
    else if (l.kind === "focus") s.focusMin += l.minutes;
    else if (cleanCount(l) === 3) s.clean++;
  }
  return s;
}

export interface WeeklyMission {
  id: keyof WeeklyTargets;
  icon: string;
  label: string;
  value: number; // in display units (hours for focus)
  target: number;
  unit: string;
  complete: boolean;
}

export function missionsFor(s: WeekStats, t: WeeklyTargets): WeeklyMission[] {
  const m: WeeklyMission[] = [
    { id: "strength", icon: "🦾", label: "Strength", value: s.strength, target: t.strength, unit: "", complete: false },
    { id: "swim", icon: "🏊", label: "Swimming", value: s.swim, target: t.swim, unit: "", complete: false },
    { id: "spanish", icon: "🇪🇸", label: "Spanish", value: s.spanish, target: t.spanish, unit: "days", complete: false },
    { id: "videos", icon: "🎬", label: "Publish video", value: s.videos, target: t.videos, unit: "", complete: false },
    { id: "bogen", icon: "🚗", label: "Driving", value: s.bogen, target: t.bogen, unit: "Bögen", complete: false },
    { id: "focusHours", icon: "🧠", label: "Focus", value: Math.round((s.focusMin / 60) * 10) / 10, target: t.focusHours, unit: "h", complete: false },
    { id: "clean", icon: "🧘", label: "Clean days", value: s.clean, target: t.clean, unit: "days", complete: false },
  ];
  return m.filter((x) => x.target > 0).map((x) => ({ ...x, complete: x.value >= x.target }));
}

export interface WeekResult {
  start: DayKey;
  missions: WeeklyMission[];
  stars: number;
  perfect: boolean;
  rating: string | null;
}

export function ratingOf(stars: number, total: number): string | null {
  if (total > 0 && stars >= total) return "PERFECT WEEK";
  if (stars >= 5) return "LOCKED IN";
  if (stars >= 4) return "STRONG WEEK";
  if (stars >= 3) return "GOOD WEEK";
  return null;
}

export function weekResult(logs: ActivityLog[], start: DayKey, t: WeeklyTargets): WeekResult {
  // The clean-day mission only counts from the week you first checked in, so older weeks keep their stars.
  const firstClean = logs.reduce<DayKey | null>((a, l) => (l.kind === "clean" && (!a || l.date < a) ? l.date : a), null);
  if (!firstClean || start < weekStart(firstClean)) t = { ...t, clean: 0 };
  const missions = missionsFor(statsFor(logs, new Set(weekDays(start))), t);
  const stars = missions.filter((m) => m.complete).length;
  const perfect = missions.length > 0 && stars === missions.length;
  return { start, missions, stars, perfect, rating: ratingOf(stars, missions.length) };
}

/** Every week from the first log up to the current one, newest first. */
export function weekHistory(logs: ActivityLog[], today: DayKey, t: WeeklyTargets): WeekResult[] {
  if (!logs.length) return [weekResult(logs, weekStart(today), t)];
  const first = logs.reduce((a, l) => (l.date < a ? l.date : a), today);
  const out: WeekResult[] = [];
  for (let w = weekStart(first); w <= today; w = addDays(w, 7)) out.push(weekResult(logs, w, t));
  return out.reverse();
}

/* ==================================================================
   Spanish streak with a Streak Shield (Duolingo-style)
   ================================================================== */

export interface StreakState {
  current: number;
  best: number;
  todayDone: boolean;
  shield: boolean; // available?
  shieldUsedOn?: DayKey;
  toRecharge: number; // successful days until the shield is back (0 when available)
}

/**
 * You start with one Shield. Missing a day while the streak is alive uses it and the
 * streak survives. Missing again before it recharges breaks only the current streak.
 * The Shield comes back after `every` successful Spanish days. Days, XP and entries are never lost.
 */
export function spanishStreak(logs: ActivityLog[], today: DayKey, every: number): StreakState {
  const days = new Set(logs.filter((l) => l.kind === "spanish").map((l) => l.date));
  const sorted = [...days].filter((d) => d <= today).sort();
  let current = 0;
  let best = 0;
  let shield = true;
  let progress = 0;
  let shieldUsedOn: DayKey | undefined;
  const success = () => {
    current++;
    best = Math.max(best, current);
    if (!shield && ++progress >= every) {
      shield = true;
      progress = 0;
    }
  };
  if (sorted.length) {
    for (let d = sorted[0]; d < today; d = addDays(d, 1)) {
      if (days.has(d)) success();
      else if (current > 0 && shield) {
        shield = false;
        progress = 0;
        shieldUsedOn = d;
      } else current = 0;
    }
  }
  const todayDone = days.has(today);
  if (todayDone) success();
  return { current, best, todayDone, shield, shieldUsedOn: shield ? undefined : shieldUsedOn, toRecharge: shield ? 0 : every - progress };
}

/* ==================================================================
   Totals and automatic achievements
   ================================================================== */

export interface Totals extends WeekStats {}

export function totals(logs: ActivityLog[]): Totals {
  const all = new Set(logs.map((l) => l.date));
  return statsFor(logs, all);
}

export { ACHIEVEMENTS, TIER_NAME, type Achievement } from "./achievements";
export const VIDEO_MILESTONES = [1, 5, 10, 25, 50, 75, 100];

const dayGap = (a: DayKey, b: DayKey) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5);

/** The facts achievements are judged on, all derived from the log. */
export function achievementContext(data: AppData, today: DayKey, level = playerOf(data, today).level): AchContext {
  const logs = validLogs(data.logs);
  const days = new Map<DayKey, DayAgg>();
  for (const date of new Set(logs.map((l) => l.date))) {
    const st = statsFor(logs, new Set([date]));
    days.set(date, { ...st, kinds: [st.strength, st.swim, st.spanish, st.videos, st.bogen, st.focusMin].filter((x) => x > 0).length });
  }
  const sorted = [...days.keys()].sort();
  let activeRun = 0;
  let run = 0;
  let comeback = false;
  sorted.forEach((d, i) => {
    const gap = i ? dayGap(sorted[i - 1], d) : 1;
    run = gap === 1 ? run + 1 : 1;
    activeRun = Math.max(activeRun, run);
    if (gap >= 8) comeback = true;
  });
  const cleanLogs = logs.filter((l): l is Extract<ActivityLog, { kind: "clean" }> => l.kind === "clean").sort((a, b) => a.date.localeCompare(b.date));
  const runOf = (ok: (l: (typeof cleanLogs)[number]) => boolean) => {
    let best = 0;
    let cur = 0;
    let prev: DayKey | null = null;
    for (const l of cleanLogs) {
      cur = ok(l) ? (prev && dayGap(prev, l.date) === 1 && cur > 0 ? cur + 1 : 1) : 0;
      best = Math.max(best, cur);
      prev = l.date;
    }
    return best;
  };
  const clean = {
    full: cleanLogs.filter((l) => cleanCount(l) === 3).length,
    social: cleanLogs.filter((l) => l.social).length,
    goon: cleanLogs.filter((l) => l.goon).length,
    sleep: cleanLogs.filter((l) => l.sleep).length,
    run: runOf((l) => cleanCount(l) === 3),
    goonRun: runOf((l) => l.goon),
    sleepRun: runOf((l) => l.sleep),
  };
  const swimsPerWeek = new Map<DayKey, number>();
  for (const l of logs) if (l.kind === "swim") swimsPerWeek.set(weekStart(l.date), (swimsPerWeek.get(weekStart(l.date)) ?? 0) + 1);
  return {
    total: { ...totals(logs), logs: logs.length },
    days,
    bestStreak: spanishStreak(logs, today, data.settings.shieldEvery).best,
    perfectWeeks: weekHistory(logs, today, data.settings.targets).filter((w) => w.perfect).length,
    bestWeekSwims: Math.max(0, ...swimsPerWeek.values()),
    wins: data.wins.length,
    level,
    activeRun,
    comeback,
    clean,
    hours: logs.map((l) => ({ kind: l.kind, hour: new Date(l.at).getHours() })),
  };
}

export function unlockedAchievements(c: AchContext): Set<string> {
  return new Set(ACHIEVEMENTS.filter((a) => a.test(c)).map((a) => a.id));
}

/* ==================================================================
   Whole-player snapshot
   ================================================================== */

export interface SkillState {
  id: SkillId;
  name: string;
  icon: string;
  xp: number;
  level: number;
  into: number;
  need: number;
  progress: number;
}

export interface Player {
  xp: number;
  level: number;
  rank: string;
  into: number;
  need: number;
  progress: number;
  perfectWeeks: number;
  skills: SkillState[];
}

export function playerOf(data: AppData, today: DayKey): Player {
  const logs = validLogs(data.logs);
  const skillXp: Record<SkillId, number> = { strength: 0, swimming: 0, spanish: 0, creator: 0, driving: 0, focus: 0, discipline: 0 };
  let focusMin = 0;
  for (const l of logs) {
    if (l.kind === "focus") focusMin += l.minutes;
    else skillXp[SKILL_OF[l.kind]] += xpOf(l);
  }
  // From the total, so many short logs earn exactly what one long log earns.
  skillXp.focus = Math.round((focusMin / 60) * XP.focusPerHour);
  const perfectWeeks = weekHistory(logs, today, data.settings.targets).filter((w) => w.perfect).length;
  const xp = Object.values(skillXp).reduce((a, b) => a + b, 0) + perfectWeeks * XP.perfectWeek;
  const lv = levelFrom(xp, playerXpToNext, MAX_LEVEL);
  return {
    xp,
    ...lv,
    rank: rankOf(lv.level),
    perfectWeeks,
    skills: SKILLS.map((s) => ({ ...s, xp: skillXp[s.id], ...levelFrom(skillXp[s.id], skillXpToNext, 99) })),
  };
}

/** Everything that can trigger a reward, so a log can be compared before and after. */
export interface Snapshot {
  player: Player;
  missionsDone: Set<string>;
  perfect: boolean;
  achievements: Set<string>;
  streak: StreakState;
  spanishDays: number;
  videos: number;
}

export function snapshot(data: AppData, today: DayKey): Snapshot {
  const logs = validLogs(data.logs);
  const week = weekResult(logs, weekStart(today), data.settings.targets);
  const t = totals(logs);
  const player = playerOf(data, today);
  return {
    player,
    missionsDone: new Set(week.missions.filter((m) => m.complete).map((m) => m.id)),
    perfect: week.perfect,
    achievements: unlockedAchievements(achievementContext(data, today, player.level)),
    streak: spanishStreak(logs, today, data.settings.shieldEvery),
    spanishDays: t.spanish,
    videos: t.videos,
  };
}

export type RewardEvent =
  | { type: "xp"; amount: number; skill: SkillState; before: number; after: number; levelUp: boolean }
  | { type: "level"; level: number }
  | { type: "rank"; rank: string }
  | { type: "mission"; label: string }
  | { type: "perfect" }
  | { type: "achievement"; icon: string; label: string }
  | { type: "milestone"; label: string };

export function diff(a: Snapshot, b: Snapshot, kind: LogKind, weekMissions: WeeklyMission[]): RewardEvent[] {
  const out: RewardEvent[] = [];
  const skillId = SKILL_OF[kind];
  const sa = a.player.skills.find((s) => s.id === skillId)!;
  const sb = b.player.skills.find((s) => s.id === skillId)!;
  const amount = b.player.xp - a.player.xp;
  if (amount > 0 || sb.xp > sa.xp) {
    out.push({ type: "xp", amount, skill: sb, before: sb.level > sa.level ? 0 : sa.progress, after: sb.progress, levelUp: sb.level > sa.level });
  }
  if (b.player.level > a.player.level) out.push({ type: "level", level: b.player.level });
  if (b.player.rank !== a.player.rank) out.push({ type: "rank", rank: b.player.rank });
  for (const m of weekMissions) if (b.missionsDone.has(m.id) && !a.missionsDone.has(m.id)) out.push({ type: "mission", label: m.label });
  if (b.perfect && !a.perfect) out.push({ type: "perfect" });
  if (kind === "video" && VIDEO_MILESTONES.includes(b.videos) && b.videos > a.videos) out.push({ type: "milestone", label: `Video #${b.videos}. Road to 100: ${b.videos} / 100` });
  for (const ach of ACHIEVEMENTS) if (b.achievements.has(ach.id) && !a.achievements.has(ach.id)) out.push({ type: "achievement", icon: ach.icon, label: ach.name });
  return out;
}

/* ==================================================================
   Focus statistics and the road to mastery
   ================================================================== */

export function focusStats(logs: ActivityLog[], today: DayKey) {
  const focus = logs.filter((l): l is Extract<ActivityLog, { kind: "focus" }> => l.kind === "focus");
  const week = new Set(weekDays(weekStart(today)));
  const sum = (pred: (d: DayKey) => boolean) => focus.filter((l) => pred(l.date)).reduce((a, l) => a + l.minutes, 0);
  const byCategory = new Map<string, number>();
  for (const l of focus) byCategory.set(l.category, (byCategory.get(l.category) ?? 0) + l.minutes);
  return {
    today: sum((d) => d === today),
    week: sum((d) => week.has(d)),
    month: sum((d) => monthKey(d) === monthKey(today)),
    lifetime: sum(() => true),
    byCategory: [...byCategory.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/**
 * Rule of thumb: roughly 1,000–4,000 hours of focused, deliberate work put you
 * among the top 1% in a field. Shown as a long road, not a promise.
 */
export const MASTERY = [
  { hours: 20, label: "Started" },
  { hours: 100, label: "Ahead of most people who try" },
  { hours: 500, label: "Serious" },
  { hours: 1000, label: "Top 1% territory" },
  { hours: 4000, label: "Elite" },
];

export function masteryOf(minutes: number) {
  const h = minutes / 60;
  const next = MASTERY.find((m) => h < m.hours) ?? MASTERY[MASTERY.length - 1];
  const reached = [...MASTERY].reverse().find((m) => h >= m.hours);
  return { hours: h, next, reached, progress: Math.min(1, h / next.hours) };
}

export function formatHours(minutes: number): string {
  const h = minutes / 60;
  if (h === 0) return "0 h";
  return `${h >= 10 ? Math.round(h) : Math.round(h * 10) / 10} h`;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** The "what got better" entries, oldest first: the journey you can scroll back through. */
export function journey(logs: ActivityLog[], kind: "spanish" | "video") {
  return validLogs(logs)
    .filter((l): l is Extract<ActivityLog, { kind: "spanish" | "video" }> => l.kind === kind)
    .sort((a, b) => a.date.localeCompare(b.date) || a.at.localeCompare(b.at))
    .map((l, i) => ({ n: i + 1, log: l }));
}

/* ==================================================================
   Cookie jar (Goggins): proof of what you've already done
   ================================================================== */

export interface Cookie {
  key: string;
  date?: DayKey;
  tag: string;
  text: string;
}

/** Only things you wrote yourself: your wins, and what got better on Spanish days and videos. No automatic entries. */
export function cookieJar(data: AppData, _today: DayKey): Cookie[] {
  const logs = validLogs(data.logs);
  const out: Cookie[] = [];
  for (const x of journey(logs, "spanish")) if (x.log.better) out.push({ key: `s-${x.log.id}`, date: x.log.date, tag: `🇪🇸 Spanish Day ${x.n}`, text: x.log.better });
  for (const x of journey(logs, "video")) if (x.log.better) out.push({ key: `v-${x.log.id}`, date: x.log.date, tag: `🎬 Video #${x.n}`, text: x.log.better });
  data.wins.forEach((w, i) => out.push({ key: `w-${i}`, date: w.date, tag: "🍪 Your win", text: w.text }));
  return out;
}
