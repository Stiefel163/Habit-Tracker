import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "./defaults";
import type { Entry } from "./types";
import { computeWorld, population, worldChange } from "./world";

const s = DEFAULT_SETTINGS;
let n = 0;
const e = (p: Partial<Entry> & Pick<Entry, "date" | "habit">): Entry => ({ id: String(n++), state: "done", createdAt: "", updatedAt: "", ...p });

// Week of Mon 2025-10-06: strength ×3, swim ×1, create ×3 → 3 targets hit = strong week
const strongWeek: Entry[] = [
  e({ date: "2025-10-06", habit: "training", subtype: "strength" }),
  e({ date: "2025-10-08", habit: "training", subtype: "strength" }),
  e({ date: "2025-10-10", habit: "training", subtype: "strength" }),
  e({ date: "2025-10-11", habit: "training", subtype: "swim" }),
  e({ date: "2025-10-06", habit: "create", subtype: "edit" }),
  e({ date: "2025-10-07", habit: "create", subtype: "script" }),
  e({ date: "2025-10-09", habit: "create", subtype: "post", value: 1 }),
];

describe("world", () => {
  it("a strong week brings the first animal, young", () => {
    const w = computeWorld(strongWeek, s, "2025-10-12");
    expect(w.strongWeeks).toBe(1);
    expect(w.population).toEqual([expect.objectContaining({ id: "squirrel#0", stage: 1 })]);
  });

  it("sessions grow groves and the cabin, videos add lights", () => {
    const w = computeWorld(strongWeek, s, "2025-10-12");
    expect(w.groves.find((g) => g.habit === "training")?.sessions).toBe(4);
    expect(w.cabin.stage).toBe(1); // 3 create sessions: foundation (next at 4)
    expect(w.cabin.videos).toBe(1);
  });

  it("a weak week takes nothing away", () => {
    const later = computeWorld([...strongWeek, e({ date: "2025-10-14", habit: "driving" })], s, "2025-10-19");
    expect(later.strongWeeks).toBe(1);
    expect(later.population.length).toBe(1);
  });

  it("families grow: babies arrive 4 strong weeks after their parents", () => {
    expect(population(4).some((r) => r.kid > 0)).toBe(false);
    const p5 = population(5);
    expect(p5.find((r) => r.id === "squirrel#1")).toMatchObject({ stage: 0, name: "Squirrel kit" });
    expect(population(7).find((r) => r.id === "squirrel#1")?.stage).toBe(2);
    expect(population(12).filter((r) => r.kid === 0)).toHaveLength(12);
  });

  it("announces arrivals", () => {
    const before = computeWorld(strongWeek.slice(0, 6), s, "2025-10-12");
    const after = computeWorld(strongWeek, s, "2025-10-12");
    expect(worldChange(before, after)).toMatch(/red squirrel moved into your forest/);
  });
});
