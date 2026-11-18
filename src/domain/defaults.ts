import type { AppData, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  version: 3,
  dayStartHour: 4,
  targets: { strength: 3, swim: 1, spanish: 5, videos: 1, bogen: 10, focusHours: 20, clean: 5 },
  shieldEvery: 7,
  focusCategories: ["USask", "Creator", "Spanish", "LATAM / Career", "Econometrics", "Tax", "Other"],
  vision: "",
  sound: true,
  applied: ["focus-20"],
};

export function emptyData(): AppData {
  return { version: 3, logs: [], wins: [], settings: structuredClone(DEFAULT_SETTINGS) };
}

export function withDefaults(s: Partial<Settings> | undefined): Settings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s || s.version !== 3) return d;
  let out: Settings = { ...d, ...s, targets: { ...d.targets, ...s.targets }, focusCategories: s.focusCategories ?? d.focusCategories, applied: s.applied ?? [] };
  // Nov 2026: the weekly focus goal moves to 20 h (all categories together). Once only, so a later change in Settings sticks.
  if (!out.applied!.includes("focus-20")) out = { ...out, targets: { ...out.targets, focusHours: 20 }, applied: [...out.applied!, "focus-20"] };
  return out;
}
