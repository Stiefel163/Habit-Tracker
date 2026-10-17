import { describe, expect, it } from "vitest";
import { appToday, weekStart } from "../lib/date";
import { DEFAULT_SETTINGS, emptyData } from "./defaults";
import { fromV1, normalize } from "./migrate";
import { dayProgress, forestStats, goalCounts, goalStates, sheetStats, stageOf, studyTotals } from "./progress";

const s = DEFAULT_SETTINGS;

describe("today's tree", () => {
  it("grows with each check", () => {
    expect(dayProgress(undefined, s)).toMatchObject({ done: 0, total: 9, p: 0 });
    const log = { spanish: ["done"], training: ["gym"], sleep: ["done"] };
    expect(dayProgress(log, s).done).toBe(3);
  });
  it("has 6 clear stages, full only when everything is done", () => {
    expect([0, 1 / 9, 3 / 9, 5 / 9, 8 / 9, 1].map(stageOf)).toEqual([0, 1, 2, 3, 4, 5]);
  });
  it("only counts active habits", () => {
    const off = { ...s, active: { ...s.active, driving: false, supplements: false } };
    expect(dayProgress({ spanish: ["done"] }, off).total).toBe(7);
  });
});

describe("goals", () => {
  const days = {
    "2025-10-06": { training: ["gym", "sport:Volleyball"], create: ["worked", "published"] },
    "2025-10-07": { training: ["swim"], spanish: ["done"] },
    "2025-10-08": { training: ["gym"] },
  };
  it("counts gym, swims, sports and published videos separately", () => {
    const c = goalCounts(days);
    expect(c).toMatchObject({ gym: 2, swim: 1, sport: 1, create: 1, published: 1, spanish: 1 });
  });
  it("marks a goal reached and unlocks its animal", () => {
    const data = { ...emptyData(), days };
    data.settings.goals.swim = 1;
    expect(goalStates(data).find((g) => g.id === "swim")).toMatchObject({ reached: true, animalName: "Beaver" });
  });
  it("counts planted and full trees", () => {
    const data = { ...emptyData(), days: { ...days, "2025-10-09": Object.fromEntries(Object.keys(s.active).map((h) => [h, ["done"]])) } };
    expect(forestStats(data, "2025-10-09")).toEqual({ trees: 4, full: 1 });
  });
});

describe("migration and dates", () => {
  it("turns old detailed entries into simple checks", () => {
    const d = fromV1({
      entries: [
        { date: "2025-10-06", habit: "training", subtype: "strength" },
        { date: "2025-10-06", habit: "create", subtype: "post" },
        { date: "2025-10-06", habit: "spanish", state: "partial" },
        { date: "2025-10-06", habit: "noReels", subtype: "yes" },
      ],
    });
    expect(d.days["2025-10-06"]).toEqual({ training: ["gym"], create: ["published"], noReels: ["done"] });
  });
  it("rejects files that aren't backups", () => {
    expect(() => normalize({ foo: 1 })).toThrow();
  });
  it("keeps the previous day until 4:00, weeks start Monday", () => {
    expect(appToday(4, new Date(2025, 9, 9, 1, 30))).toBe("2025-10-08");
    expect(weekStart("2025-10-12")).toBe("2025-10-06");
  });
});

describe("study time and practice sheets", () => {
  it("adds study blocks and counts full hours toward the goal", () => {
    const days = { "2025-10-06": { study: ["30", "45"] }, "2025-10-07": { study: ["60"] } };
    expect(goalCounts(days).studyHours).toBe(2); // 135 min
    expect(studyTotals(days, ["2025-10-06", "2025-10-07"])).toEqual({ min: 135, blocks: 3 });
  });
  it("counts Bögen and the pass rate of the last 10", () => {
    const days = {
      "2025-10-06": { driving: ["fail", "fail", "pass"] },
      "2025-10-07": { driving: ["pass", "pass", "pass", "pass", "pass", "pass", "pass", "pass"] },
      "2025-10-01": { driving: ["done"] }, // old-style mark: studied, but no sheet
    };
    expect(goalCounts(days).driving).toBe(11);
    expect(sheetStats(days)).toEqual({ total: 11, passed: 9, recent: 10, recentPassed: 9 });
  });
  it("Study and lock-in are part of today's tree", () => {
    expect(dayProgress({ study: ["15"], noReels: ["done"] }, s)).toMatchObject({ done: 2, total: 9 });
  });
});
