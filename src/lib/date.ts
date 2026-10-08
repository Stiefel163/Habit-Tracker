/** Dates are stored as local calendar days: "YYYY-MM-DD". */
export type DayKey = string;

const pad = (n: number) => String(n).padStart(2, "0");

export function toKey(d: Date): DayKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DayKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

/**
 * "Today" in the app's sense. Before `dayStartHour` (default 4:00) it is still
 * yesterday, so a Spanish session at 00:30 lands on the evening it belongs to.
 */
export function appToday(dayStartHour: number, now = new Date()): DayKey {
  const d = new Date(now);
  if (d.getHours() < dayStartHour) d.setDate(d.getDate() - 1);
  return toKey(d);
}

/** Monday of the week containing `key`. */
export function weekStart(key: DayKey): DayKey {
  const d = fromKey(key);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return toKey(d);
}

export function weekDays(startKey: DayKey): DayKey[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startKey, i));
}

export function monthKey(key: DayKey): string {
  return key.slice(0, 7);
}

export function monthDays(month: string): DayKey[] {
  const [y, m] = month.split("-").map(Number);
  const count = new Date(y, m, 0).getDate();
  return Array.from({ length: count }, (_, i) => `${month}-${pad(i + 1)}`);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export function dayIndexInWeek(key: DayKey): number {
  return (fromKey(key).getDay() + 6) % 7;
}

const WEEKDAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function weekdayShort(key: DayKey): string {
  return WEEKDAY_SHORT[dayIndexInWeek(key)];
}

export function formatLong(key: DayKey): string {
  return fromKey(key).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function formatShort(key: DayKey): string {
  return fromKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function formatMonth(month: string): string {
  return fromKey(`${month}-01`).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

export function relativeLabel(key: DayKey, today: DayKey): string {
  if (key === today) return "Today";
  if (key === addDays(today, -1)) return "Yesterday";
  return fromKey(key).toLocaleDateString("en-US", { weekday: "long" });
}
