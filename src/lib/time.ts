/** Clock times are stored as "HH:MM" strings. */
export type Clock = string;

export function clockToMin(c: Clock): number {
  const [h, m] = c.split(":").map(Number);
  return h * 60 + m;
}

export function minToClock(min: number): Clock {
  const m = ((Math.round(min) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function shiftClock(c: Clock, delta: number): Clock {
  return minToClock(clockToMin(c) + delta);
}

/**
 * Bedtime on a continuous scale around midnight: 23:00 → -60, 00:30 → 30.
 * Anything from noon onward counts as "the evening before".
 */
export function bedRel(c: Clock): number {
  const m = clockToMin(c);
  return m >= 720 ? m - 1440 : m;
}

/** "7h 45m", "45m" */
export function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** "+45 min", "−1h 10m" */
export function formatDelta(min: number): string {
  const sign = min > 0 ? "+" : min < 0 ? "−" : "±";
  const a = Math.abs(Math.round(min));
  return a < 60 ? `${sign}${a} min` : `${sign}${formatDuration(a)}`;
}
