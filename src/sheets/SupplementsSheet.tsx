import { useState } from "react";
import { Sheet } from "../components/ui";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { activeSupplements, entriesOn } from "../domain/status";
import type { SupplementData } from "../domain/types";
import type { SheetProps } from "./common";

export function SupplementsSheet({ date, onClose, onOpenSettings }: SheetProps & { onOpenSettings: () => void }) {
  const { data, setSingle, restore } = useStore();
  const toast = useToast();
  const list = activeSupplements(data.settings);
  const existing = entriesOn(data.entries, date, "supplements")[0];
  const [taken, setTaken] = useState<string[]>(
    existing ? ((existing.data as SupplementData).taken ?? []) : list.map((x) => x.id),
  );
  const all = list.length > 0 && list.every((x) => taken.includes(x.id));

  const save = (ids: string[]) => {
    const act = list.filter((x) => ids.includes(x.id)).map((x) => x.id);
    const state = act.length === 0 ? "skipped" : act.length === list.length ? "done" : "partial";
    const { removed, added } = setSingle({ date, habit: "supplements", state, data: { taken: act } });
    onClose();
    toast(act.length === 0 ? "Marked as not today" : act.length === list.length ? "Supplements done" : `${act.length} of ${list.length} logged`, () =>
      restore([added], removed),
    );
  };

  if (!list.length) {
    return (
      <Sheet title="Supplements" onClose={onClose}>
        <p className="sheet-sub">No active supplements yet.</p>
        <button className="primary" onClick={onOpenSettings}>
          Set up in Settings
        </button>
      </Sheet>
    );
  }

  return (
    <Sheet title="Supplements" onClose={onClose}>
      <ul className="checklist">
        {list.map((x) => {
          const on = taken.includes(x.id);
          return (
            <li key={x.id}>
              <button
                className={`check-row${on ? " on" : ""}`}
                aria-pressed={on}
                onClick={() => setTaken((t) => (on ? t.filter((i) => i !== x.id) : [...t, x.id]))}
              >
                <span className="box" aria-hidden="true">
                  {on ? "✓" : ""}
                </span>
                {x.name}
              </button>
            </li>
          );
        })}
      </ul>
      <button className="primary" onClick={() => save(taken)} disabled={taken.length === 0}>
        {all ? "Took all" : `Save ${taken.filter((t) => list.some((x) => x.id === t)).length} of ${list.length}`}
      </button>
      <button className="text-btn center" onClick={() => save([])}>
        Not today
      </button>
    </Sheet>
  );
}
