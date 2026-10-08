import { describe, expect, it } from "vitest";
import { appToday, weekStart } from "../lib/date";
import { DEFAULT_SETTINGS } from "./defaults";
import { evaluateSleep } from "./sleep";
import { focusLine, periodStats } from "./stats";
import { cardSummary } from "./status";
import type { Entry } from "./types";

const s = DEFAULT_SETTINGS;
let n = 0;
const e = (p: Partial<Entry> & Pick<Entry, "date" | "habit">): Entry => ({
  id: String(n++),
  state: "done",
  createdAt: "",
  updatedAt: "",
  ...p,
});

describe("sleep rhythm", () => {
  it("is on rhythm within ±30 min", () => {
    const r = evaluateSleep({ bed: "23:20", wake: "06:45" }, s.sleep);
    expect(r.onRhythm).toBe(true);
    expect(r.inBedMin).toBe(445);
  });
  it("handles bedtimes after midnight", () => {
    const r = evaluateSleep({ bed: "00:15", wake: "07:00" }, s.sleep);
    expect(r.bedDelta).toBe(75);
    expect(r.onRhythm).toBe(false);
    expect(r.verdict).toBe("Bed +1h 15m");
  });
  it("does not reward 8 hours at the wrong time", () => {
    const r = evaluateSleep({ bed: "03:00", wake: "11:00" }, s.sleep);
    expect(r.sleepMin).toBe(480);
    expect(r.onRhythm).toBe(false);
  });
  it("uses actual sleep when given", () => {
    expect(evaluateSleep({ bed: "23:00", wake: "07:00", sleepMin: 420 }, s.sleep).sleepMin).toBe(420);
  });
});

describe("dates", () => {
  it("keeps the previous day until 4:00", () => {
    expect(appToday(4, new Date(2025, 9, 9, 1, 30))).toBe("2025-10-08");
    expect(appToday(4, new Date(2025, 9, 9, 4, 0))).toBe("2025-10-09");
  });
  it("weeks start on Monday", () => {
    expect(weekStart("2025-10-12")).toBe("2025-10-06"); // Sunday
    expect(weekStart("2025-10-06")).toBe("2025-10-06");
  });
});

describe("weekly stats", () => {
  const week = ["2025-10-06", "2025-10-07", "2025-10-08", "2025-10-09", "2025-10-10", "2025-10-11", "2025-10-12"];
  const entries: Entry[] = [
    e({ date: "2025-10-06", habit: "training", subtype: "strength", detail: "push", durationMin: 60 }),
    e({ date: "2025-10-06", habit: "spanish", subtype: "lesson", durationMin: 30 }),
    e({ date: "2025-10-07", habit: "spanish", subtype: "vocab", durationMin: 5 }), // under minimum
    e({ date: "2025-10-08", habit: "training", subtype: "rest", state: "rest" }),
    e({ date: "2025-10-08", habit: "create", subtype: "post", value: 2 }),
    e({ date: "2025-10-09", habit: "training", subtype: "swim", durationMin: 45 }),
    e({ date: "2025-10-09", habit: "training", subtype: "strength", detail: "pull", durationMin: 60 }),
  ];
  it("counts days, ignores rest and short sessions", () => {
    const st = periodStats(week, entries, s);
    expect(st.strength).toBe(2);
    expect(st.swim).toBe(1);
    expect(st.spanish).toBe(1);
    expect(st.spanishMin).toBe(35);
    expect(st.videos).toBe(2);
  });
  it("shows a rest day as rest, not failure", () => {
    expect(cardSummary("training", entries.filter((x) => x.date === "2025-10-08" && x.habit === "training"), s).state).toBe("rest");
  });
  it("suggests the habit most behind schedule", () => {
    const line = focusLine("2025-10-09", entries, s);
    expect(line).toMatch(/Driving theory/);
  });
});
