import { emptyData, withDefaults } from "./defaults";
import type { AppData, DayLog, HabitId } from "./types";

interface V1Entry {
  date: string;
  habit: HabitId;
  subtype?: string;
  state?: string;
}

/** Turns the first version's detailed sessions into simple done/not-done days. */
export function fromV1(raw: { entries?: V1Entry[] }): AppData {
  const data = emptyData();
  const add = (date: string, h: HabitId, item: string) => {
    const log: DayLog = (data.days[date] ??= {});
    const list = (log[h] ??= []);
    if (!list.includes(item)) list.push(item);
  };
  for (const e of raw.entries ?? []) {
    switch (e.habit) {
      case "training":
        if (e.subtype === "strength") add(e.date, "training", "gym");
        else if (e.subtype === "swim") add(e.date, "training", "swim");
        else if (e.subtype === "other") add(e.date, "training", "sport:Other");
        break;
      case "create":
        add(e.date, "create", e.subtype === "post" ? "published" : "worked");
        break;
      case "sleep":
      case "spanish":
      case "supplements":
        if (e.state === "done") add(e.date, e.habit, "done");
        break;
      case "noReels":
        if (e.subtype === "yes") add(e.date, "noReels", "done");
        break;
      default:
        add(e.date, e.habit, "done");
    }
  }
  return data;
}

export function normalize(raw: unknown): AppData {
  const r = raw as Partial<AppData> & { entries?: V1Entry[] };
  if (r && r.version === 2 && r.days && typeof r.days === "object") {
    return { version: 2, days: r.days, settings: withDefaults(r.settings) };
  }
  if (r && Array.isArray(r.entries)) return fromV1(r);
  throw new Error("Unknown data format");
}
