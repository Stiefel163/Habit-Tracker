import { describe, expect, it } from "vitest";
import { emptyData } from "./defaults";
import { computeStreak, eraOf, missedYesterday, resetState, votes } from "./lockin";
import type { AppData, DayLog } from "./types";

const three: DayLog = { sleep: ["done"], spanish: ["done"], supplements: ["done"] };
const one: DayLog = { sleep: ["done"] };

function data(days: Record<string, DayLog>, patch: Partial<AppData> = {}): AppData {
  return { ...emptyData(), days, ...patch };
}

describe("streak with freezes", () => {
  it("counts days that reach the daily goal (3 checks)", () => {
    const d = data({ "2025-10-06": three, "2025-10-07": three, "2025-10-08": three });
    expect(computeStreak(d, "2025-10-08")).toMatchObject({ days: 3, todayMet: true });
  });
  it("today not done yet doesn't break the streak", () => {
    const d = data({ "2025-10-06": three, "2025-10-07": three });
    expect(computeStreak(d, "2025-10-08")).toMatchObject({ days: 2, todayMet: false });
  });
  it("one missed day uses the starting freeze, two in a row break it", () => {
    const once = data({ "2025-10-06": three, "2025-10-07": one, "2025-10-08": three });
    const s = computeStreak(once, "2025-10-08");
    expect(s).toMatchObject({ days: 2, freezes: 0 });
    expect(s.marks["2025-10-07"]).toBe("frozen");
    const twice = data({ "2025-10-06": three, "2025-10-07": one, "2025-10-08": one, "2025-10-09": three });
    expect(computeStreak(twice, "2025-10-09").days).toBe(1);
  });
  it("earns a freeze every 7 streak days, max 2", () => {
    const days: Record<string, DayLog> = {};
    for (let i = 1; i <= 21; i++) days[`2025-10-${String(i).padStart(2, "0")}`] = three;
    expect(computeStreak(data(days), "2025-10-22").freezes).toBe(2);
  });
});

describe("30-day reset", () => {
  it("counts reel-free days since the start, without resetting on a slip", () => {
    const d = data(
      { "2025-10-01": { reelFree: ["done"] }, "2025-10-02": {}, "2025-10-03": { reelFree: ["done"] } },
      { settings: { ...emptyData().settings, resetStart: "2025-10-01" } },
    );
    expect(resetState(d, "2025-10-03")).toEqual({ started: true, day: 3, clean: 2, finished: false });
    expect(resetState(d, "2025-11-05").finished).toBe(true);
  });
});

describe("votes, eras, don't miss twice", () => {
  it("every check and every beaten urge is a vote", () => {
    const d = data({ "2025-10-06": three }, { urges: { "2025-10-06": ["walk", "study"] } });
    expect(votes(d)).toBe(5);
    expect(eraOf(0).era.name).toBe("The College Dropout");
    expect(eraOf(130)).toMatchObject({ era: { name: "Graduation" }, toNext: 120 });
  });
  it("flags habits skipped yesterday that are still open today", () => {
    const d = data({ "2025-10-06": { sleep: ["done"] }, "2025-10-07": { spanish: ["done"] } });
    const m = missedYesterday(d, "2025-10-07");
    expect(m.has("spanish")).toBe(false); // done today
    expect(m.has("sleep")).toBe(false); // done yesterday
    expect(m.has("study")).toBe(true);
  });
});
