import { describe, expect, it } from "vitest";
import { appToday, weekStart } from "../lib/date";
import { emptyData } from "./defaults";
import { checkInWeek, cleanDays, computeStreak, dayFocus, eraOf, lockedInDays, modeOn, nextHabit } from "./focus";
import { fromV1, normalize } from "./migrate";
import { sheetStats, stageOf, studyTotals } from "./progress";
import type { AppData, DayLog, ModeId } from "./types";

function data(days: Record<string, DayLog>, modeLog: { date: string; mode: ModeId }[] = []): AppData {
  const d = emptyData();
  d.days = days;
  d.settings.modeLog = modeLog;
  return d;
}

// Exam mode focus: study 4×90 min, sleep, clean day
const examDay: DayLog = { study: ["90", "90", "90", "90"], sleep: ["done"], reelFree: ["done"] };
// Build mode focus: morning lock-in, training, study 2×60
const buildDay: DayLog = { noReels: ["done"], training: ["gym"], study: ["60", "60"] };

describe("modes and focus", () => {
  it("starts in exam mode with three focus habits", () => {
    const f = dayFocus(data({}), "2026-10-19");
    expect(f.mode.id).toBe("exam");
    expect(f.focus.map((h) => h.id)).toEqual(["study", "sleep", "reelFree"]);
  });
  it("the mode on a day is the last switch on or before it", () => {
    const d = data({}, [{ date: "2026-10-26", mode: "build" }]);
    expect(modeOn(d.settings, "2026-10-25").id).toBe("exam");
    expect(modeOn(d.settings, "2026-10-27").id).toBe("build");
  });
  it("study grows the tree block by block, toward the mode's target", () => {
    const f = dayFocus(data({ "2026-10-19": { study: ["90", "90"], sleep: ["done"] } }), "2026-10-19");
    expect(f.parts).toEqual([0.5, 1, 0]);
    expect(f.done).toBe(1);
    expect(f.p).toBeCloseTo(0.5);
    expect(f.lockedIn).toBe(false);
  });
  it("a day is locked in when all focus habits are done; extras don't matter", () => {
    expect(dayFocus(data({ "2026-10-19": examDay }), "2026-10-19").lockedIn).toBe(true);
    expect(dayFocus(data({ "2026-10-19": { ...buildDay } }), "2026-10-19").lockedIn).toBe(false);
  });
  it("tree stages", () => {
    expect([0, 1 / 3, 2 / 3, 1].map(stageOf)).toEqual([0, 2, 3, 5]);
  });
});

describe("streak, eras, ladder", () => {
  it("one missed day uses a freeze, two in a row break the streak", () => {
    const once = data({ "2026-10-12": examDay, "2026-10-13": {}, "2026-10-14": examDay });
    expect(computeStreak(once, "2026-10-14")).toMatchObject({ days: 2, freezes: 0, todayMet: true });
    const twice = data({ "2026-10-12": examDay, "2026-10-13": {}, "2026-10-14": {}, "2026-10-15": examDay });
    expect(computeStreak(twice, "2026-10-15").days).toBe(1);
  });
  it("eras level up with locked-in days", () => {
    expect(eraOf(0).era.name).toBe("The College Dropout");
    expect(eraOf(12)).toMatchObject({ era: { name: "Graduation" }, toNext: 10 });
    expect(eraOf(100).next).toBeUndefined();
  });
  it("suggests the next habit only in build mode after 10 of 14 locked-in days", () => {
    const days: Record<string, DayLog> = {};
    for (let i = 1; i <= 14; i++) days[`2026-11-${String(i).padStart(2, "0")}`] = i <= 9 ? buildDay : {};
    const log = [{ date: "2026-11-01", mode: "build" as ModeId }];
    expect(nextHabit(data(days, log), "2026-11-15")).toMatchObject({ habit: { id: "supplements" }, locked: 9, ready: false });
    days["2026-11-10"] = buildDay;
    expect(nextHabit(data(days, log), "2026-11-15")?.ready).toBe(true);
    expect(nextHabit(data(days), "2026-11-15")).toBeNull(); // exam mode: no new habits
    expect(lockedInDays(data(days, log), "2026-11-15")).toBe(10);
  });
  it("counts clean days in the last 30 and knows when the Sunday check-in is due", () => {
    expect(cleanDays(data({ "2026-10-18": { reelFree: ["done"] }, "2026-10-19": { reelFree: ["done"] } }), "2026-10-19")).toBe(2);
    expect(checkInWeek("2026-10-18")).toBe("2026-10-12"); // Sunday
    expect(checkInWeek("2026-10-19")).toBe("2026-10-12"); // Monday, same week
    expect(checkInWeek("2026-10-21")).toBeNull();
  });
});

describe("numbers, migration and dates", () => {
  it("study totals and Bögen pass rate", () => {
    const days = { "2025-10-06": { study: ["30", "45"], driving: ["fail", "pass"] }, "2025-10-07": { study: ["60"], driving: ["pass"] } };
    expect(studyTotals(days, ["2025-10-06", "2025-10-07"])).toEqual({ min: 135, blocks: 3 });
    expect(sheetStats(days)).toEqual({ total: 3, passed: 2, recent: 3, recentPassed: 2 });
  });
  it("migrates old data and rejects files that aren't backups", () => {
    const d = fromV1({ entries: [{ date: "2025-10-06", habit: "training", subtype: "strength" }] });
    expect(d.days["2025-10-06"]).toEqual({ training: ["gym"] });
    expect(() => normalize({ foo: 1 })).toThrow();
    const kept = normalize({ ...emptyData(), reviews: { "2026-10-12": { change: "" } } });
    expect(kept.reviews["2026-10-12"]).toEqual({ change: "" });
  });
  it("keeps the previous day until 4:00, weeks start Monday", () => {
    expect(appToday(4, new Date(2025, 9, 9, 1, 30))).toBe("2025-10-08");
    expect(weekStart("2025-10-12")).toBe("2025-10-06");
  });
});
