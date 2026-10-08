import { addDays, weekDays, weekStart, type DayKey } from "../lib/date";
import { periodStats, weeklyGoals } from "./stats";
import { counts } from "./status";
import type { Entry, Settings } from "./types";

/**
 * The forest is built from effort and never shrinks.
 *  - every session grows that area's grove (training → spruce, Spanish → maple, driving → birch)
 *  - create sessions build the cabin; each published video adds a light to its string
 *  - supplement days and no-reels mornings plant wildflowers
 *  - weeks with enough on-rhythm nights brighten the northern lights
 *  - every strong week (≥3 weekly targets hit) brings a new animal; later ones raise families
 * A bad week simply adds nothing.
 */

export const SPECIES = [
  { id: "squirrel", name: "Red squirrel", baby: "Squirrel kit", icon: "🐿️" },
  { id: "hare", name: "Snowshoe hare", baby: "Leveret", icon: "🐇" },
  { id: "beaver", name: "Beaver", baby: "Beaver kit", icon: "🦫" },
  { id: "fox", name: "Red fox", baby: "Fox kit", icon: "🦊" },
  { id: "loon", name: "Common loon", baby: "Loon chick", icon: "🦆" },
  { id: "eagle", name: "Bald eagle", baby: "Eaglet", icon: "🦅" },
  { id: "deer", name: "White-tailed deer", baby: "Fawn", icon: "🦌" },
  { id: "wolf", name: "Grey wolf", baby: "Wolf pup", icon: "🐺" },
  { id: "elk", name: "Elk", baby: "Elk calf", icon: "🦌" },
  { id: "blackbear", name: "Black bear", baby: "Bear cub", icon: "🐻" },
  { id: "moose", name: "Moose", baby: "Moose calf", icon: "🫎" },
  { id: "grizzly", name: "Grizzly", baby: "Grizzly cub", icon: "🐻" },
] as const;

export const CABIN_STEPS = [1, 4, 8, 14, 22, 35];
export const CABIN_STAGES = ["Build site", "Foundation", "Walls going up", "Walls, door & window", "Roof", "Chimney & warm light", "Porch & woodpile"];

export const TREES_PER = 4; // sessions per new tree
export const MAX_TREES = 6; // per grove; after that trees keep growing taller

export interface Resident {
  id: string; // "fox#0" founder, "fox#1" first kid …
  sp: string;
  stage: 0 | 1 | 2; // baby, young, adult
  kid: number;
  name: string;
  sub: string;
}

export interface Grove {
  habit: "training" | "spanish" | "driving";
  label: string;
  tree: "pine" | "maple" | "birch";
  sessions: number;
}

export interface WeekResult {
  start: DayKey;
  hit: number;
  needed: number;
  strong: boolean;
  sleepHit: boolean;
}

export interface World {
  groves: Grove[];
  cabin: { sessions: number; videos: number; stage: number; title: string; sub: string };
  flowers: number;
  aurora: number;
  strongWeeks: number;
  population: Resident[];
  thisWeek: { hit: number; needed: number; strong: boolean; goals: { name: string; done: number; target: number }[] };
  next: string; // what the next strong week brings
}

export function weekResults(entries: Entry[], s: Settings, today: DayKey): WeekResult[] {
  if (!entries.length) return [];
  const first = entries.reduce((a, e) => (e.date < a ? e.date : a), today);
  const goals = weeklyGoals(s);
  const needed = Math.min(3, goals.length);
  const out: WeekResult[] = [];
  for (let w = weekStart(first); w <= today; w = addDays(w, 7)) {
    const st = periodStats(weekDays(w), entries, s);
    const hit = goals.filter((g) => st[g.key] >= g.target).length;
    out.push({ start: w, hit, needed, strong: needed > 0 && hit >= needed, sleepHit: s.active.sleep && st.sleepOnRhythm >= s.targets.sleep && s.targets.sleep > 0 });
  }
  return out;
}

/** Residents after `strong` strong weeks. Pure function of one number, so it's easy to reason about. */
export function population(strong: number): Resident[] {
  const out: Resident[] = [];
  SPECIES.forEach((sp, j) => {
    const arrived = j + 1; // strong week in which it moves in
    if (strong < arrived) return;
    const grown = strong > arrived;
    out.push({ id: `${sp.id}#0`, sp: sp.id, stage: grown ? 2 : 1, kid: 0, name: sp.name, sub: grown ? "lives here" : "just moved in" });
    [arrived + 4, arrived + 8].forEach((born, i) => {
      if (strong < born) return;
      const age = strong - born;
      const stage = age >= 2 ? 2 : age === 1 ? 1 : 0;
      out.push({
        id: `${sp.id}#${i + 1}`,
        sp: sp.id,
        stage,
        kid: i + 1,
        name: stage === 2 ? sp.name : sp.baby,
        sub: stage === 0 ? "born this week" : stage === 1 ? "growing up" : "grown up here",
      });
    });
  });
  return out;
}

function describeNext(strong: number): string {
  const now = new Map(population(strong).map((r) => [r.id, r]));
  const next = population(strong + 1);
  const arrival = next.find((r) => !now.has(r.id) && r.kid === 0);
  if (arrival) return `${SPECIES.find((x) => x.id === arrival.sp)?.icon ?? ""} ${arrival.name} moves in`;
  const birth = next.find((r) => !now.has(r.id));
  if (birth) return `a ${birth.name.toLowerCase()} is born`;
  return "your animals grow up";
}

export function computeWorld(entries: Entry[], s: Settings, today: DayKey): World {
  const of = (h: string) => entries.filter((e) => e.habit === h);
  const training = of("training").filter((e) => e.subtype !== "rest").length;
  const spanish = of("spanish").filter((e) => counts(e, s)).length;
  const driving = of("driving").length;
  const create = of("create");
  const videos = create.filter((e) => e.subtype === "post").reduce((a, e) => a + (e.value ?? 1), 0);
  const flowers = entries.filter((e) => (e.habit === "supplements" || e.habit === "noReels") && counts(e, s)).length;

  const weeks = weekResults(entries, s, today);
  const strongWeeks = weeks.filter((w) => w.strong).length;
  const aurora = weeks.filter((w) => w.sleepHit).length;

  const stage = CABIN_STEPS.filter((n) => create.length >= n).length;
  const nextStep = CABIN_STEPS[stage];

  const goals = weeklyGoals(s);
  const st = periodStats(weekDays(weekStart(today)), entries, s);
  const cur = weeks.find((w) => w.start === weekStart(today));

  return {
    groves: [
      { habit: "training" as const, label: "Training grove", tree: "pine" as const, sessions: training },
      { habit: "spanish" as const, label: "Spanish grove", tree: "maple" as const, sessions: spanish },
      { habit: "driving" as const, label: "Driving grove", tree: "birch" as const, sessions: driving },
    ].filter((g) => s.active[g.habit] || g.sessions > 0),
    cabin: {
      sessions: create.length,
      videos,
      stage,
      title: `Cabin · ${CABIN_STAGES[stage]}`,
      sub:
        `${create.length} create sessions` +
        (videos ? ` · ${videos} video${videos > 1 ? "s" : ""} = ${videos} light${videos > 1 ? "s" : ""}` : "") +
        (nextStep ? ` · next step at ${nextStep}` : ""),
    },
    flowers,
    aurora,
    strongWeeks,
    population: population(strongWeeks),
    thisWeek: {
      hit: cur?.hit ?? 0,
      needed: Math.min(3, goals.length),
      strong: cur?.strong ?? false,
      goals: goals.map((g) => ({ name: g.name, done: st[g.key], target: g.target })),
    },
    next: describeNext(strongWeeks),
  };
}

/** Compares two worlds and returns the single most meaningful change, for a toast. */
export function worldChange(a: World, b: World): string | null {
  const before = new Map(a.population.map((r) => [r.id, r]));
  const icon = (sp: string) => SPECIES.find((x) => x.id === sp)?.icon ?? "";
  const arrival = b.population.find((r) => !before.has(r.id) && r.kid === 0);
  if (arrival) return `${icon(arrival.sp)} Strong week! A ${arrival.name.toLowerCase()} moved into your forest.`;
  const birth = b.population.find((r) => !before.has(r.id));
  if (birth) return `${icon(birth.sp)} New in the family: a ${birth.name.toLowerCase()}.`;
  if (b.aurora > a.aurora) return a.aurora === 0 ? "Northern lights unlocked. Look up tonight." : "The northern lights got brighter.";
  if (b.cabin.stage > a.cabin.stage) return `Cabin: ${CABIN_STAGES[b.cabin.stage].toLowerCase()} done.`;
  if (b.cabin.videos > a.cabin.videos) return "A new light on your cabin. Published!";
  for (const g of b.groves) {
    const old = a.groves.find((x) => x.habit === g.habit)?.sessions ?? 0;
    const trees = (n: number) => (n > 0 ? Math.min(MAX_TREES, 1 + Math.floor((n - 1) / TREES_PER)) : 0);
    if (trees(g.sessions) > trees(old)) return `A new tree in your ${g.label.toLowerCase()}.`;
  }
  return null;
}
