import { bedRel, clockToMin, formatDelta } from "../lib/time";
import type { Settings, SleepData } from "./types";

export interface SleepEval {
  bedDelta: number; // minutes vs. target bedtime (+ = later)
  wakeDelta: number; // minutes vs. target wake time (+ = later)
  bedOk: boolean;
  wakeOk: boolean;
  onRhythm: boolean; // both within tolerance
  inBedMin: number; // time between getting into bed and getting up
  sleepMin: number; // actual sleep if given, else time in bed
  verdict: string; // short human text
}

/**
 * Rhythm beats duration: 03:00–11:00 is 8 hours but not "on rhythm".
 * Both bedtime and wake time must be within the tolerance.
 */
export function evaluateSleep(d: SleepData, s: Settings["sleep"]): SleepEval {
  const bed = bedRel(d.bed);
  const wake = clockToMin(d.wake);
  const bedDelta = bed - bedRel(s.bed);
  const wakeDelta = wake - clockToMin(s.wake);
  const tol = s.toleranceMin;
  const bedOk = Math.abs(bedDelta) <= tol;
  const wakeOk = Math.abs(wakeDelta) <= tol;
  const inBedMin = Math.max(0, wake - bed);
  const sleepMin = d.sleepMin ?? inBedMin;

  let verdict: string;
  if (bedOk && wakeOk) verdict = "On rhythm";
  else if (!bedOk && !wakeOk) verdict = `Bed ${formatDelta(bedDelta)} · up ${formatDelta(wakeDelta)}`;
  else if (!bedOk) verdict = `Bed ${formatDelta(bedDelta)}`;
  else verdict = `Up ${formatDelta(wakeDelta)}`;

  return { bedDelta, wakeDelta, bedOk, wakeOk, onRhythm: bedOk && wakeOk, inBedMin, sleepMin, verdict };
}
