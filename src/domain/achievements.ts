import { addDays, dayIndexInWeek, type DayKey } from "../lib/date";

/** What one calendar day added up to. */
export interface DayAgg {
  strength: number;
  swim: number;
  spanish: number;
  videos: number;
  bogen: number;
  focusMin: number;
  /** How many of the six activities happened that day. */
  kinds: number;
}

/** Everything an achievement can look at. Built in rpg.ts from the activity log. */
export interface AchContext {
  total: Omit<DayAgg, "kinds"> & { logs: number };
  days: Map<DayKey, DayAgg>;
  bestStreak: number;
  perfectWeeks: number;
  bestWeekSwims: number;
  wins: number;
  level: number;
  /** Longest run of days in a row with anything logged. */
  activeRun: number;
  /** Came back after 7+ days without logging anything. */
  comeback: boolean;
  /** Good-behaviour check-ins: days kept per item, and the longest runs. */
  clean: { full: number; social: number; goon: number; sleep: number; run: number; goonRun: number; sleepRun: number };
  /** Local clock hour of each log, by kind, as it was logged. */
  hours: { kind: string; hour: number }[];
}

export type Tier = 1 | 2 | 3 | 4;
export const TIER_NAME: Record<Tier, string> = { 1: "Easy", 2: "Medium", 3: "Hard", 4: "Insane" };

export interface Achievement {
  id: string;
  icon: string;
  name: string;
  /** How to get it. Only shown when you tap it. */
  how: string;
  tier: Tier;
  test: (c: AchContext) => boolean;
}

const anyDay = (c: AchContext, f: (d: DayAgg) => boolean) => [...c.days.values()].some(f);
const weekendWarrior = (c: AchContext) =>
  [...c.days.entries()].some(([k, d]) => {
    if (dayIndexInWeek(k) !== 5 || !(d.strength || d.swim)) return false;
    const sun = c.days.get(addDays(k, 1));
    return !!sun && !!(sun.strength || sun.swim);
  });

/** Minecraft-style: odd names, some free, some brutal. Tap one to find out what it takes. */
export const ACHIEVEMENTS: Achievement[] = [
  // Easy
  { id: "hello", icon: "🥚", name: "Hello World", how: "Log your very first action.", tier: 1, test: (c) => c.total.logs >= 1 },
  { id: "first-lift", icon: "🦾", name: "Baby Steps, Heavy Ones", how: "Log your first strength workout.", tier: 1, test: (c) => c.total.strength >= 1 },
  { id: "first-swim", icon: "🪨", name: "Not a Rock", how: "Go for your first swim. Rocks sink. You didn't.", tier: 1, test: (c) => c.total.swim >= 1 },
  { id: "first-spanish", icon: "🌮", name: "Hola, Señor", how: "Log your first Spanish day.", tier: 1, test: (c) => c.total.spanish >= 1 },
  { id: "first-video", icon: "🎬", name: "Main Character Energy", how: "Publish your first video.", tier: 1, test: (c) => c.total.videos >= 1 },
  { id: "first-bogen", icon: "🚦", name: "Learner's Permit Vibes", how: "Finish your first Bogen.", tier: 1, test: (c) => c.total.bogen >= 1 },
  { id: "first-focus", icon: "🧠", name: "Big Brain Time", how: "Log your first focus session.", tier: 1, test: (c) => c.total.focusMin >= 15 },
  { id: "first-win", icon: "🍪", name: "Cookie Monster", how: "Put your first win in the cookie jar.", tier: 1, test: (c) => c.wins >= 1 },

  { id: "clean-1", icon: "🌱", name: "Touch Grass", how: "Keep all three on one day: low social media, no gooning, good sleep.", tier: 1, test: (c) => c.clean.full >= 1 },

  // Medium: odd combos
  { id: "amphibian", icon: "🐊", name: "Amphibian", how: "Lift and swim on the same day.", tier: 2, test: (c) => anyDay(c, (d) => d.strength > 0 && d.swim > 0) },
  { id: "bilingual-biceps", icon: "💪", name: "Bilingual Biceps", how: "Train and do Spanish on the same day.", tier: 2, test: (c) => anyDay(c, (d) => d.strength > 0 && d.spanish > 0) },
  { id: "gracias-camera", icon: "🎥", name: "Lights, Camera, Gracias", how: "Publish a video and do Spanish on the same day.", tier: 2, test: (c) => anyDay(c, (d) => d.videos > 0 && d.spanish > 0) },
  { id: "triple-stack", icon: "🍔", name: "Triple Stack", how: "Do 3 different activities in one day.", tier: 2, test: (c) => anyDay(c, (d) => d.kinds >= 3) },
  { id: "monk-mode", icon: "🧘", name: "Monk Mode", how: "Focus for 4 hours in one day.", tier: 2, test: (c) => anyDay(c, (d) => d.focusMin >= 240) },
  { id: "streak-7", icon: "🔥", name: "On Fire (Not Literally)", how: "Reach a 7-day Spanish streak.", tier: 2, test: (c) => c.bestStreak >= 7 },
  { id: "week-active", icon: "📅", name: "No Days Off", how: "Log something 7 days in a row.", tier: 2, test: (c) => c.activeRun >= 7 },
  { id: "weekend", icon: "🏖", name: "Weekend Warrior", how: "Lift or swim on both Saturday and Sunday of the same weekend.", tier: 2, test: weekendWarrior },
  { id: "aquaman", icon: "🧜", name: "Aquaman's Intern", how: "Swim 3 times in one week.", tier: 2, test: (c) => c.bestWeekSwims >= 3 },
  { id: "bogen-binge", icon: "📜", name: "Paper Cut Survivor", how: "Finish 10 Bögen in one day.", tier: 2, test: (c) => anyDay(c, (d) => d.bogen >= 10) },
  { id: "early", icon: "🌅", name: "Who Needs Sleep?", how: "Log a workout before 7 in the morning.", tier: 2, test: (c) => c.hours.some((h) => h.kind === "strength" && h.hour >= 4 && h.hour < 7) },
  { id: "vampire", icon: "🧛", name: "Vampire Hours", how: "Log focus between midnight and 4 am.", tier: 2, test: (c) => c.hours.some((h) => h.kind === "focus" && h.hour < 4) },
  { id: "comeback", icon: "💀", name: "The Comeback", how: "Log something after a week or more of nothing. That's the whole point of this app.", tier: 2, test: (c) => c.comeback },
  { id: "perfect-1", icon: "⭐", name: "Overachiever", how: "Clear a perfect week: every mission done.", tier: 2, test: (c) => c.perfectWeeks >= 1 },
  { id: "sleep-7", icon: "😴", name: "Sleep Is a Skill", how: "Keep good sleep times 7 days in a row.", tier: 2, test: (c) => c.clean.sleepRun >= 7 },
  { id: "phone-who", icon: "📵", name: "Phone Who?", how: "Keep social media low on 30 days.", tier: 2, test: (c) => c.clean.social >= 30 },
  { id: "hustler", icon: "🕴", name: "Promoted", how: "Reach Level 10 and stop being a Crook.", tier: 2, test: (c) => c.level >= 10 },

  // Hard
  { id: "monk-arc", icon: "🧘", name: "Monk Arc", how: "7 clean days in a row: all three kept, every day.", tier: 3, test: (c) => c.clean.run >= 7 },
  { id: "no-goon-30", icon: "🗿", name: "Built Different", how: "No gooning for 30 days in a row.", tier: 3, test: (c) => c.clean.goonRun >= 30 },
  { id: "jackpot", icon: "🎰", name: "Jackpot", how: "Do all six things in one day: lift, swim, Spanish, a video, Bögen and focus.", tier: 3, test: (c) => anyDay(c, (d) => d.kinds >= 6) },
  { id: "brain-exe", icon: "🫠", name: "brain.exe Has Stopped", how: "Focus for 8 hours in one day.", tier: 3, test: (c) => anyDay(c, (d) => d.focusMin >= 480) },
  { id: "streak-30", icon: "🌶", name: "Muy Caliente", how: "Reach a 30-day Spanish streak.", tier: 3, test: (c) => c.bestStreak >= 30 },
  { id: "month-active", icon: "🗓", name: "Thirty for Thirty", how: "Log something 30 days in a row.", tier: 3, test: (c) => c.activeRun >= 30 },
  { id: "gorilla", icon: "🦍", name: "Gorilla Mode", how: "Log 50 strength workouts.", tier: 3, test: (c) => c.total.strength >= 50 },
  { id: "dolphin", icon: "🐬", name: "Part Dolphin", how: "Swim 25 times.", tier: 3, test: (c) => c.total.swim >= 25 },
  { id: "algorithm", icon: "📈", name: "Algorithm, Notice Me", how: "Publish 10 videos.", tier: 3, test: (c) => c.total.videos >= 10 },
  { id: "examiner", icon: "🚗", name: "The Examiner Fears You", how: "Finish 250 Bögen.", tier: 3, test: (c) => c.total.bogen >= 250 },
  { id: "century", icon: "💯", name: "Century Brain", how: "Reach 100 focus hours in total.", tier: 3, test: (c) => c.total.focusMin >= 100 * 60 },
  { id: "perfect-5", icon: "🌟", name: "Allergic to Losing", how: "Clear 5 perfect weeks.", tier: 3, test: (c) => c.perfectWeeks >= 5 },

  // Insane
  { id: "monk-90", icon: "🏯", name: "Ascended", how: "90 clean days in a row. All three, every single day.", tier: 4, test: (c) => c.clean.run >= 90 },
  { id: "human", icon: "🤖", name: "Are You Even Human?", how: "Focus for 12 hours in one day.", tier: 4, test: (c) => anyDay(c, (d) => d.focusMin >= 720) },
  { id: "spanish-100", icon: "🇪🇸", name: "Basically Spanish Now", how: "Do 100 Spanish days.", tier: 4, test: (c) => c.total.spanish >= 100 },
  { id: "video-100", icon: "👑", name: "The Road Is Done", how: "Publish 100 videos.", tier: 4, test: (c) => c.total.videos >= 100 },
  { id: "streak-100", icon: "☄️", name: "Unkillable", how: "Reach a 100-day Spanish streak.", tier: 4, test: (c) => c.bestStreak >= 100 },
  { id: "top-1", icon: "🐐", name: "Top 1% Loading…", how: "Reach 1,000 focus hours in total.", tier: 4, test: (c) => c.total.focusMin >= 1000 * 60 },
  { id: "boss", icon: "🎩", name: "Made Man", how: "Reach Level 50: Capo.", tier: 4, test: (c) => c.level >= 50 },
];
