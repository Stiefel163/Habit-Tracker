import { emptyData, withDefaults } from "./defaults";
import type { ActivityLog, AppData, Split, Win } from "./types";

let n = 0;
const id = () => `m${Date.now().toString(36)}${(n++).toString(36)}`;
const at = (date: string) => `${date}T12:00:00.000Z`;
const SPLITS: Split[] = ["push", "pull", "legs", "upper", "lower", "full", "other"];

interface V1Entry {
  date: string;
  habit: string;
  subtype?: string;
  detail?: string;
  durationMin?: number;
  state?: string;
  note?: string;
}

/** First version: detailed sessions. */
function fromV1(raw: { entries?: V1Entry[] }): AppData {
  const d = emptyData();
  for (const e of raw.entries ?? []) {
    const base = { id: id(), date: e.date, at: at(e.date) };
    if (e.habit === "training" && e.subtype === "strength")
      d.logs.push({ ...base, kind: "strength", split: SPLITS.includes(e.detail as Split) ? (e.detail as Split) : undefined, minutes: e.durationMin });
    else if (e.habit === "training" && e.subtype === "swim") d.logs.push({ ...base, kind: "swim", minutes: e.durationMin });
    else if (e.habit === "spanish" && e.state === "done") d.logs.push({ ...base, kind: "spanish", better: e.note ?? "", minutes: e.durationMin });
    else if (e.habit === "create" && e.subtype === "post") d.logs.push({ ...base, kind: "video", better: e.note ?? "" });
    else if (e.habit === "create" && e.durationMin) d.logs.push({ ...base, kind: "focus", minutes: e.durationMin, category: "Creator" });
  }
  d.legacy = raw;
  return d;
}

/** Second version: one small object per day ("done" lists). */
function fromV2(raw: { days?: Record<string, Record<string, string[]>>; wins?: Win[] }): AppData {
  const d = emptyData();
  for (const [date, log] of Object.entries(raw.days ?? {})) {
    const base = () => ({ id: id(), date, at: at(date) });
    const t = log.training ?? [];
    if (t.includes("gym")) d.logs.push({ ...base(), kind: "strength" });
    if (t.includes("swim")) d.logs.push({ ...base(), kind: "swim" });
    if (log.spanish?.length) d.logs.push({ ...base(), kind: "spanish", better: "" });
    const sheets = (log.driving ?? []).filter((x) => x === "pass" || x === "fail").length;
    if (sheets) d.logs.push({ ...base(), kind: "bogen", count: sheets });
    const study = (log.study ?? []).reduce((a, x) => a + (parseInt(x, 10) || 0), 0);
    if (study >= 15) d.logs.push({ ...base(), kind: "focus", minutes: study, category: "USask" });
    if (log.create?.includes("published")) d.logs.push({ ...base(), kind: "video", better: "" });
  }
  d.wins = Array.isArray(raw.wins) ? raw.wins : [];
  d.legacy = raw;
  return d;
}

const KINDS = new Set(["strength", "swim", "spanish", "video", "bogen", "focus", "clean"]);

/** Accepts any saved or backed-up version and returns current data. */
export function normalize(raw: unknown): AppData {
  const r = raw as Omit<Partial<AppData>, "version"> & { version?: number; entries?: V1Entry[]; days?: unknown };
  if (r && r.version === 3 && Array.isArray(r.logs)) {
    const logs = (r.logs as ActivityLog[]).filter((l) => l && KINDS.has(l.kind) && typeof l.date === "string");
    return { version: 3, logs, wins: Array.isArray(r.wins) ? r.wins : [], settings: withDefaults(r.settings), legacy: r.legacy };
  }
  if (r && r.version === 2 && r.days && typeof r.days === "object") return fromV2(r as Parameters<typeof fromV2>[0]);
  if (r && Array.isArray(r.entries)) return fromV1(r);
  throw new Error("Unknown data format");
}
