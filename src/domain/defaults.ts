import type { AppData, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  version: 3,
  dayStartHour: 4,
  targets: { strength: 3, swim: 1, spanish: 5, videos: 1, bogen: 10, focusHours: 10, clean: 5 },
  shieldEvery: 7,
  focusCategories: ["USask", "Creator", "Spanish", "LATAM / Career", "Econometrics", "Tax", "Other"],
  vision: "",
  sound: true,
};

export function emptyData(): AppData {
  return { version: 3, logs: [], wins: [], settings: structuredClone(DEFAULT_SETTINGS) };
}

export function withDefaults(s: Partial<Settings> | undefined): Settings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s || s.version !== 3) return d;
  return { ...d, ...s, targets: { ...d.targets, ...s.targets }, focusCategories: s.focusCategories ?? d.focusCategories };
}
