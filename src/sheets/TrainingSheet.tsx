import { useState } from "react";
import { Chips, NoteField, NumberChips, Sheet } from "../components/ui";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { STRENGTH_SPLITS, TRAINING_MINUTES, TRAINING_TYPES, labelOf } from "../domain/habits";
import { entriesOn } from "../domain/status";
import type { Entry } from "../domain/types";
import { formatDuration } from "../lib/time";
import { LoggedList, lastEntry, type SheetProps } from "./common";

type Kind = "strength" | "swim" | "other";

const DEFAULT_MIN: Record<Kind, number> = { strength: 60, swim: 45, other: 30 };

function describe(e: Entry) {
  if (e.subtype === "rest") return "Rest day";
  const t = e.subtype === "strength" && e.detail ? `Strength · ${labelOf(STRENGTH_SPLITS, e.detail)}` : labelOf(TRAINING_TYPES, e.subtype);
  return [t, e.durationMin ? formatDuration(e.durationMin) : "", e.note ?? ""].filter(Boolean).join(" · ");
}

export function TrainingSheet({ date, onClose }: SheetProps) {
  const { data, saveEntry, removeEntry } = useStore();
  const toast = useToast();
  const today = entriesOn(data.entries, date, "training");
  const [kind, setKind] = useState<Kind | null>(null);
  const [split, setSplit] = useState<string | undefined>();
  const [minutes, setMinutes] = useState<number | undefined>();
  const [note, setNote] = useState("");

  const pick = (id: string) => {
    if (id === "rest") {
      today.filter((e) => e.subtype === "rest").forEach((e) => removeEntry(e.id));
      const e = saveEntry({ date, habit: "training", subtype: "rest", state: "rest" });
      onClose();
      toast("Rest day logged. Recovery counts.", () => removeEntry(e.id));
      return;
    }
    const k = id as Kind;
    const last = lastEntry(data.entries, "training", (e) => e.subtype === k);
    setKind(k);
    setSplit(k === "strength" ? (last?.detail ?? "push") : undefined);
    setMinutes(last?.durationMin ?? DEFAULT_MIN[k]);
    setNote("");
  };

  const save = () => {
    if (!kind) return;
    // A real session replaces a rest day logged earlier the same day.
    today.filter((e) => e.subtype === "rest").forEach((e) => removeEntry(e.id));
    const e = saveEntry({
      date,
      habit: "training",
      subtype: kind,
      detail: kind === "strength" ? split : undefined,
      durationMin: minutes,
      note: note.trim() || undefined,
      state: "done",
    });
    onClose();
    toast(`${describe(e).split(" · ").slice(0, 2).join(" · ")} logged`, () => removeEntry(e.id));
  };

  return (
    <Sheet title="Training" onClose={onClose}>
      <LoggedList items={today.map((e) => ({ id: e.id, text: describe(e) }))} onRemove={removeEntry} />
      {today.length > 0 && !kind && <div className="field-label">Add another</div>}

      {!kind && (
        <div className="tiles">
          {TRAINING_TYPES.map((t) => (
            <button key={t.id} className={`tile${t.id === "rest" ? " rest" : ""}`} onClick={() => pick(t.id)}>
              <span className="tile-icon" aria-hidden="true">
                {t.icon}
              </span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      )}

      {kind && (
        <>
          <button className="back-link" onClick={() => setKind(null)}>
            ‹ {labelOf(TRAINING_TYPES, kind)}
          </button>
          {kind === "strength" && <Chips label="Split" options={STRENGTH_SPLITS} value={split} onChange={setSplit} />}
          <NumberChips label="Duration" unit="min" choices={TRAINING_MINUTES} value={minutes} onChange={setMinutes} allowNone />
          <NoteField value={note} onChange={setNote} placeholder={kind === "other" ? "What did you do? (optional)" : "Note (optional)"} />
          <button className="primary" onClick={save}>
            Log {labelOf(TRAINING_TYPES, kind).toLowerCase()}
          </button>
        </>
      )}
    </Sheet>
  );
}
