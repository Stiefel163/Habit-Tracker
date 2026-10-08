import type { AppData, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  version: 2,
  appearance: "system",
  dayStartHour: 4,
  active: { sleep: true, training: true, spanish: true, driving: true, create: true, supplements: true, noReels: true },
  sports: ["Volleyball"],
  // Sized for the rest of the exchange (roughly Oct–Dec).
  goals: { gym: 36, swim: 10, sport: 8, spanish: 45, driving: 40, create: 30, published: 8, sleep: 60, supplements: 70, noReels: 60 },
};

export function emptyData(): AppData {
  return { version: 2, days: {}, settings: structuredClone(DEFAULT_SETTINGS) };
}

export function withDefaults(s: Partial<Settings> | undefined): Settings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s || s.version !== 2) return d;
  return { ...d, ...s, active: { ...d.active, ...s.active }, goals: { ...d.goals, ...s.goals }, sports: s.sports ?? d.sports };
}
