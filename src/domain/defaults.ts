import type { AppData, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  version: 1,
  appearance: "system",
  dayStartHour: 4,
  active: {
    sleep: true,
    training: true,
    spanish: true,
    driving: true,
    create: true,
    supplements: true,
    noReels: true,
  },
  targets: {
    strength: 3,
    swim: 1,
    spanish: 4,
    driving: 5,
    create: 3,
    sleep: 5,
    supplements: 7,
    noReels: 7,
  },
  sleep: { bed: "23:00", wake: "07:00", toleranceMin: 30 },
  spanishMinMinutes: 10,
  supplements: [
    { id: "creatine", name: "Creatine", active: true },
    { id: "vitd", name: "Vitamin D", active: true },
    { id: "zinc", name: "Zinc", active: true },
    { id: "magnesium", name: "Magnesium", active: true },
  ],
  noReelsRule: "I got out of bed before starting endless Reels / TikTok / Shorts. Messages, music and quick checks are fine.",
};

export function emptyData(): AppData {
  return { entries: [], notes: [], settings: structuredClone(DEFAULT_SETTINGS) };
}

/** Fills in fields added in later versions so old saves keep working. */
export function migrateSettings(s: Partial<Settings> | undefined): Settings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s) return d;
  return {
    ...d,
    ...s,
    active: { ...d.active, ...s.active },
    targets: { ...d.targets, ...s.targets },
    sleep: { ...d.sleep, ...s.sleep },
    supplements: s.supplements ?? d.supplements,
  };
}
