import type { AppData, Settings } from "./types";

export const DEFAULT_SETTINGS: Settings = {
  version: 2,
  appearance: "system",
  dayStartHour: 4,
  active: { sleep: true, noReels: true, reelFree: true, training: true, study: true, spanish: true, driving: true, create: true, supplements: true },
  sports: ["Volleyball"],
  // Sized for the rest of the exchange (roughly Oct–Dec).
  goals: { gym: 36, swim: 10, sport: 8, studyHours: 100, spanish: 45, driving: 60, create: 30, published: 8, sleep: 60, supplements: 70, noReels: 60, reelFree: 60 },
  dailyGoal: 3,
  identity: "I'm someone who locks in.",
  fuel: [
    "Stay hard.",
    "When your mind says you're done, you're only at 40%.",
    "Callus your mind: do the thing you don't feel like doing.",
    "The feed doesn't know your goals. You do.",
    "Treat today like a track on the album you're making.",
    "Create like nobody's watching. Publish like everybody is.",
  ],
  setup: {},
};

export function emptyData(): AppData {
  return { version: 2, days: {}, urges: {}, wins: [], reviews: {}, settings: structuredClone(DEFAULT_SETTINGS) };
}

export function withDefaults(s: Partial<Settings> | undefined): Settings {
  const d = structuredClone(DEFAULT_SETTINGS);
  if (!s || s.version !== 2) return d;
  return {
    ...d,
    ...s,
    active: { ...d.active, ...s.active },
    goals: { ...d.goals, ...s.goals },
    sports: s.sports ?? d.sports,
    fuel: s.fuel ?? d.fuel,
    setup: { ...d.setup, ...s.setup },
  };
}
