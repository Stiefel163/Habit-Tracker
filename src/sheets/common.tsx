import type { Entry, HabitId } from "../domain/types";
import type { DayKey } from "../lib/date";

export interface SheetProps {
  date: DayKey;
  onClose: () => void;
}

/** Most recent entry of a habit (optionally filtered), used to prefill the last choices. */
export function lastEntry(entries: Entry[], habit: HabitId, pred: (e: Entry) => boolean = () => true): Entry | undefined {
  let best: Entry | undefined;
  for (const e of entries) {
    if (e.habit !== habit || !pred(e)) continue;
    if (!best || e.date > best.date || (e.date === best.date && e.updatedAt > best.updatedAt)) best = e;
  }
  return best;
}

export function LoggedList({ items, onRemove }: { items: { id: string; text: string }[]; onRemove: (id: string) => void }) {
  if (!items.length) return null;
  return (
    <ul className="logged">
      {items.map((i) => (
        <li key={i.id}>
          <span className="logged-dot" aria-hidden="true" />
          <span className="logged-text">{i.text}</span>
          <button className="text-btn" onClick={() => onRemove(i.id)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
