import { describe, expect, it } from "vitest";
import { appToday, weekStart } from "../lib/date";
import { emptyData } from "./defaults";
import { normalize } from "./migrate";
import {
  ACHIEVEMENTS,
  RANKS,
  achievementContext,
  unlockedAchievements,
  cookieJar,
  diff,
  journey,
  masteryOf,
  playerOf,
  playerXpToNext,
  rankOf,
  snapshot,
  spanishStreak,
  validLogs,
  weekHistory,
  weekResult,
  xpOf,
} from "./rpg";
import type { ActivityLog, AppData } from "./types";

let n = 0;
type NL = ActivityLog extends infer L ? (L extends ActivityLog ? Omit<L, "id" | "at"> & { at?: string } : never) : never;
const log = (l: NL): ActivityLog => ({ id: String(n++), at: `${l.date}T10:00:${String(n % 60).padStart(2, "0")}Z`, ...l }) as ActivityLog;
const withLogs = (logs: ActivityLog[]): AppData => ({ ...emptyData(), logs });
const spanish = (date: string, better = "x") => log({ kind: "spanish", date, better });

describe("XP and levels", () => {
  it("gives fixed XP per action and proportional XP for focus", () => {
    expect(xpOf(log({ kind: "strength", date: "2026-11-02" }))).toBe(50);
    expect(xpOf(log({ kind: "bogen", date: "2026-11-02", count: 3 }))).toBe(30);
    expect(xpOf(log({ kind: "focus", date: "2026-11-02", minutes: 150, category: "USask" }))).toBe(63);
  });
  it("can't be gamed by splitting focus or double-logging a workout", () => {
    const one = playerOf(withLogs([log({ kind: "focus", date: "2026-11-02", minutes: 240, category: "Creator" })]), "2026-11-02").xp;
    const split = playerOf(withLogs(Array.from({ length: 8 }, () => log({ kind: "focus", date: "2026-11-02", minutes: 30, category: "Creator" }))), "2026-11-02").xp;
    expect(split).toBe(one);
    const twice = validLogs([log({ kind: "strength", date: "2026-11-02" }), log({ kind: "strength", date: "2026-11-02" }), spanish("2026-11-02"), spanish("2026-11-02")]);
    expect(twice).toHaveLength(2);
    expect(validLogs([log({ kind: "focus", date: "2026-11-02", minutes: 10, category: "Tax" })])).toHaveLength(0);
  });
  it("early levels come fast, level 100 takes real work, ranks follow the ladder", () => {
    const toLevel = (target: number) => Array.from({ length: target - 1 }, (_, i) => playerXpToNext(i + 1)).reduce((a, b) => a + b, 0);
    expect(toLevel(10)).toBeLessThan(1000); // about one good week
    expect(toLevel(100)).toBeGreaterThan(80000);
    expect(playerXpToNext(50)).toBeGreaterThan(playerXpToNext(10));
    expect([1, 9, 10, 25, 59, 99, 100].map(rankOf)).toEqual(["Crook", "Crook", "Hustler", "Enforcer", "Capo", "Boss", "Mafia Boss"]);
    expect(RANKS).toHaveLength(11);
  });
});

describe("weekly missions", () => {
  const mon = "2026-11-02";
  const week = [
    ...["2026-11-02", "2026-11-04", "2026-11-06"].map((date) => log({ kind: "strength", date })),
    log({ kind: "swim", date: "2026-11-05" }),
    ...["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"].map((d) => spanish(d)),
    log({ kind: "video", date: "2026-11-07", better: "Faster pacing" }),
    log({ kind: "bogen", date: "2026-11-03", count: 6 }),
    log({ kind: "bogen", date: "2026-11-07", count: 4 }),
    log({ kind: "focus", date: "2026-11-03", minutes: 600, category: "USask" }),
    ...["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"].map((date) => log({ kind: "clean", date, social: true, goon: true, sleep: true })),
  ];
  it("counts stars and rates the week", () => {
    const r = weekResult(week.slice(0, 4), mon, emptyData().settings.targets);
    expect(r.stars).toBe(2);
    expect(r.rating).toBeNull();
    const full = weekResult(week, mon, emptyData().settings.targets);
    expect(full).toMatchObject({ stars: 7, perfect: true, rating: "PERFECT WEEK" });
  });
  it("a perfect week adds a 200 XP bonus; incomplete missions cost nothing", () => {
    const base = 3 * 50 + 40 + 5 * 25 + 100 + 10 * 10 + 250 + 5 * 30;
    expect(playerOf(withLogs(week), "2026-11-08").xp).toBe(base + 200);
    expect(playerOf(withLogs(week.slice(0, 3)), "2026-11-08").xp).toBe(150);
    expect(weekHistory(week, "2026-11-10", emptyData().settings.targets)[0].start).toBe("2026-11-09");
  });
});

describe("Spanish streak with a shield", () => {
  it("one missed day uses the shield and the streak survives", () => {
    const s = spanishStreak([spanish("2026-11-01"), spanish("2026-11-02"), spanish("2026-11-04")], "2026-11-04", 7);
    expect(s).toMatchObject({ current: 3, shield: false, shieldUsedOn: "2026-11-03", toRecharge: 6, todayDone: true });
  });
  it("missing again before the shield recharges breaks only the current streak", () => {
    const logs = [spanish("2026-11-01"), spanish("2026-11-02"), spanish("2026-11-04"), spanish("2026-11-06")];
    const s = spanishStreak(logs, "2026-11-06", 7);
    expect(s.current).toBe(1);
    expect(s.best).toBe(3);
    expect(snapshot(withLogs(logs), "2026-11-06").spanishDays).toBe(4); // 100-days progress untouched
  });
  it("the shield recharges after 7 successful days; today open doesn't count as missed", () => {
    const logs = [spanish("2026-11-01"), ...Array.from({ length: 7 }, (_, i) => spanish(`2026-11-${String(i + 3).padStart(2, "0")}`))];
    expect(spanishStreak(logs, "2026-11-09", 7)).toMatchObject({ current: 8, shield: true, toRecharge: 0 });
    expect(spanishStreak(logs, "2026-11-10", 7)).toMatchObject({ current: 8, todayDone: false });
  });
});

describe("rewards, journeys, mastery", () => {
  it("publishing video #1 shows XP, a milestone and an achievement", () => {
    const before = withLogs([]);
    const after = withLogs([log({ kind: "video", date: "2026-11-04", better: "Posted at all" })]);
    const today = "2026-11-04";
    const missions = weekResult(after.logs, weekStart(today), after.settings.targets).missions;
    const ev = diff(snapshot(before, today), snapshot(after, today), "video", missions);
    expect(ev.map((e) => e.type)).toEqual(["xp", "level", "mission", "milestone", "achievement", "achievement"]);
    expect(ev.filter((e) => e.type === "achievement").map((e) => (e as { label: string }).label)).toEqual(["Hello World", "Main Character Energy"]);
  });
  it("numbers the Spanish journey by date, even when a day is logged late", () => {
    const j = journey([spanish("2026-11-03", "b"), { ...spanish("2026-11-02", "a"), at: "2026-11-04T09:00:00Z" }], "spanish");
    expect(j.map((x) => [x.n, x.log.better])).toEqual([
      [1, "a"],
      [2, "b"],
    ]);
  });
  it("shows the road to 1,000 focus hours", () => {
    expect(masteryOf(150 * 60)).toMatchObject({ next: { hours: 500 }, reached: { hours: 100 } });
  });
});

describe("migration", () => {
  it("turns the previous version's days into logs and keeps the original", () => {
    const old = {
      version: 2,
      days: { "2026-10-16": { training: ["gym", "sport:Volleyball"], study: ["90", "30"], driving: ["pass", "fail"], spanish: ["done"], create: ["published"] } },
      wins: [{ date: "2026-10-11", text: "National park" }],
      settings: { version: 2 },
    };
    const d = normalize(old);
    expect(d.logs.map((l) => l.kind).sort()).toEqual(["bogen", "focus", "spanish", "strength", "video"]);
    expect(d.logs.find((l) => l.kind === "focus")).toMatchObject({ minutes: 120, category: "USask" });
    expect(d.logs.find((l) => l.kind === "bogen")).toMatchObject({ count: 2 });
    expect(d.wins).toHaveLength(1);
    expect(d.legacy).toEqual(old);
    expect(normalize(JSON.parse(JSON.stringify(d))).logs).toHaveLength(5);
    expect(() => normalize({ foo: 1 })).toThrow();
  });
  it("keeps the previous day until 4:00", () => {
    expect(appToday(4, new Date(2026, 10, 4, 1, 30))).toBe("2026-11-03");
  });
});

describe("cookie jar", () => {
  it("collects your words, your wins and your achievements", () => {
    const d = withLogs([
      log({ kind: "spanish", date: "2026-11-02", better: "Ordered food without English" }),
      log({ kind: "video", date: "2026-11-03", better: "Shorter intro" }),
      log({ kind: "bogen", date: "2026-11-03", count: 10 }),
    ]);
    d.wins = [{ date: "2026-10-01", text: "Got the scholarship" }];
    const jar = cookieJar(d, "2026-11-04");
    expect(jar.map((c) => c.text)).toEqual([
      "Ordered food without English",
      "Shorter intro",
      "Got the scholarship",
      "Finish 10 Bögen in one day.",
    ]);
  });
});

describe("achievements", () => {
  const got = (logs: ActivityLog[], today = "2026-11-30") => unlockedAchievements(achievementContext(withLogs(logs), today));
  it("rewards odd combos on the same day only", () => {
    expect(got([log({ kind: "strength", date: "2026-11-02" }), log({ kind: "swim", date: "2026-11-03" })]).has("amphibian")).toBe(false);
    expect(got([log({ kind: "strength", date: "2026-11-02" }), log({ kind: "swim", date: "2026-11-02" })]).has("amphibian")).toBe(true);
  });
  it("needs all six things in one day for the Jackpot", () => {
    const d = "2026-11-02";
    const five = [log({ kind: "strength", date: d }), log({ kind: "swim", date: d }), spanish(d), log({ kind: "video", date: d, better: "x" }), log({ kind: "bogen", date: d, count: 1 })];
    expect(got(five).has("jackpot")).toBe(false);
    expect(got([...five, log({ kind: "focus", date: d, minutes: 30, category: "USask" })]).has("jackpot")).toBe(true);
  });
  it("adds up focus per day for the long-day ones", () => {
    const g = got([log({ kind: "focus", date: "2026-11-02", minutes: 400, category: "USask" }), log({ kind: "focus", date: "2026-11-02", minutes: 320, category: "Creator" })]);
    expect(["monk-mode", "brain-exe", "human"].every((id) => g.has(id))).toBe(true);
  });
  it("spots a comeback after a week off", () => {
    expect(got([spanish("2026-11-01"), spanish("2026-11-05")]).has("comeback")).toBe(false);
    expect(got([spanish("2026-11-01"), spanish("2026-11-09")]).has("comeback")).toBe(true);
  });
  it("has unique ids", () => {
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
  });
});

describe("clean days", () => {
  it("gives 10 XP per kept item and the latest check-in of a day wins", () => {
    const d = "2026-11-02";
    const first = log({ kind: "clean", date: d, social: true, goon: false, sleep: false, at: `${d}T20:00:00Z` });
    const fixed = log({ kind: "clean", date: d, social: true, goon: true, sleep: true, at: `${d}T22:00:00Z` });
    expect(playerOf(withLogs([first]), d).xp).toBe(10);
    expect(playerOf(withLogs([fixed, first]), d).xp).toBe(30);
    expect(validLogs([first, fixed])).toHaveLength(1);
  });
  it("doesn't take stars from weeks before the first check-in", () => {
    const t = emptyData().settings.targets;
    const old = weekResult([log({ kind: "strength", date: "2026-10-26" })], "2026-10-26", t);
    expect(old.missions.some((m) => m.id === "clean")).toBe(false);
    const later = [log({ kind: "strength", date: "2026-10-26" }), log({ kind: "clean", date: "2026-11-03", social: true, goon: true, sleep: true })];
    expect(weekResult(later, "2026-10-26", t).missions.some((m) => m.id === "clean")).toBe(false);
    expect(weekResult(later, "2026-11-02", t).missions.some((m) => m.id === "clean")).toBe(true);
  });
  it("counts only days with all three as clean days", () => {
    const r = weekResult([log({ kind: "clean", date: "2026-11-02", social: true, goon: true, sleep: false })], "2026-11-02", emptyData().settings.targets);
    expect(r.missions.find((m) => m.id === "clean")!.value).toBe(0);
  });
});
