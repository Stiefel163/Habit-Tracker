import type { DayKey } from "../lib/date";
import { formatDuration } from "../lib/time";
import { CREATE_TYPES, SPANISH_TYPES, STRENGTH_SPLITS, TRAINING_TYPES, labelOf } from "./habits";
import { evaluateSleep } from "./sleep";
import type { CardState, Entry, EntryState, HabitId, Settings, SleepData, SupplementData } from "./types";

export function activeSupplements(s: Settings) {
  return s.supplements.filter((x) => x.active);
}

/**
 * States that depend on settings (tolerance, minimum minutes, supplement list)
 * are recomputed on read, so changing a setting updates history consistently.
 */
export function entryState(e: Entry, s: Settings): EntryState {
  switch (e.habit) {
    case "sleep":
      return evaluateSleep(e.data as SleepData, s.sleep).onRhythm ? "done" : "partial";
    case "spanish":
      return (e.durationMin ?? 0) >= s.spanishMinMinutes ? "done" : "partial";
    case "training":
      return e.subtype === "rest" ? "rest" : "done";
    case "supplements": {
      const taken = (e.data as SupplementData | undefined)?.taken ?? [];
      const act = activeSupplements(s);
      if (taken.length === 0) return "skipped";
      return act.every((x) => taken.includes(x.id)) ? "done" : "partial";
    }
    case "noReels":
      return e.subtype === "yes" ? "done" : "skipped";
    default:
      return "done";
  }
}

/** Does this entry count toward the weekly target? */
export function counts(e: Entry, s: Settings): boolean {
  return entryState(e, s) === "done";
}

export const isStrength = (e: Entry) => e.habit === "training" && e.subtype === "strength";
export const isSwim = (e: Entry) => e.habit === "training" && e.subtype === "swim";

const RANK: Record<CardState, number> = { empty: 0, skipped: 1, partial: 2, rest: 3, done: 4 };

export interface CardSummary {
  state: CardState;
  line: string;
}

export function cardSummary(habit: HabitId, list: Entry[], s: Settings): CardSummary {
  if (list.length === 0) return { state: "empty", line: emptyLine(habit) };
  const state = list.map((e) => entryState(e, s)).reduce<CardState>((a, b) => (RANK[b] > RANK[a] ? b : a), "empty");

  switch (habit) {
    case "sleep": {
      const e = list[list.length - 1];
      const d = e.data as SleepData;
      const ev = evaluateSleep(d, s.sleep);
      return { state, line: `${d.bed} → ${d.wake} · ${formatDuration(ev.sleepMin)} · ${ev.verdict}` };
    }
    case "training": {
      const parts = list.map((e) => {
        if (e.subtype === "rest") return "Rest day";
        const t = e.subtype === "strength" && e.detail ? `Strength · ${labelOf(STRENGTH_SPLITS, e.detail)}` : labelOf(TRAINING_TYPES, e.subtype);
        return [t, e.durationMin ? formatDuration(e.durationMin) : ""].filter(Boolean).join(" · ");
      });
      return { state, line: parts.join("  +  ") };
    }
    case "spanish": {
      const min = sum(list.map((e) => e.durationMin ?? 0));
      const types = uniq(list.map((e) => labelOf(SPANISH_TYPES, e.subtype))).join(", ");
      const short = state === "partial" ? ` · under ${s.spanishMinMinutes} min` : "";
      return { state, line: `${formatDuration(min)} · ${types}${short}` };
    }
    case "driving": {
      const min = sum(list.map((e) => e.durationMin ?? 0));
      const q = sum(list.map((e) => e.value ?? 0));
      return { state, line: [min ? formatDuration(min) : "", q ? `${q} questions` : ""].filter(Boolean).join(" · ") || "Session" };
    }
    case "create": {
      const min = sum(list.map((e) => e.durationMin ?? 0));
      const types = uniq(list.map((e) => labelOf(CREATE_TYPES, e.subtype))).join(", ");
      const vids = sum(list.filter((e) => e.subtype === "post").map((e) => e.value ?? 1));
      const posted = vids ? ` · ${vids} video${vids > 1 ? "s" : ""} published` : "";
      return { state, line: `${min ? formatDuration(min) + " · " : ""}${types}${posted}` };
    }
    case "supplements": {
      const e = list[list.length - 1];
      const taken = (e.data as SupplementData | undefined)?.taken ?? [];
      const act = activeSupplements(s);
      const n = act.filter((x) => taken.includes(x.id)).length;
      if (n === 0) return { state, line: "Not today" };
      return { state, line: n === act.length ? `All ${n} taken` : `${n} of ${act.length} taken` };
    }
    case "noReels": {
      const e = list[list.length - 1];
      return { state, line: e.subtype === "yes" ? "Got up first" : "Not this morning" };
    }
  }
}

function emptyLine(h: HabitId): string {
  switch (h) {
    case "sleep":
      return "Log last night";
    case "training":
      return "Strength, swim, other or rest";
    case "supplements":
      return "Tap to confirm";
    case "noReels":
      return "Out of bed before scrolling?";
    default:
      return "Tap to log a session";
  }
}

export function sum(a: number[]) {
  return a.reduce((x, y) => x + y, 0);
}

function uniq(a: string[]) {
  return [...new Set(a.filter(Boolean))];
}

export function entriesOn(entries: Entry[], date: DayKey, habit?: HabitId) {
  return entries.filter((e) => e.date === date && (!habit || e.habit === habit));
}
