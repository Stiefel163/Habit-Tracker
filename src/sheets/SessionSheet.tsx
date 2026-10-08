import { useState } from "react";
import { Chips, NoteField, NumberChips, Sheet, Stepper } from "../components/ui";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { CREATE_TYPES, HABIT_BY_ID, MINUTE_CHOICES, QUESTION_CHOICES, SPANISH_TYPES, labelOf, type Option } from "../domain/habits";
import { entriesOn } from "../domain/status";
import type { Entry } from "../domain/types";
import { formatDuration } from "../lib/time";
import { LoggedList, lastEntry, type SheetProps } from "./common";

type SessionHabit = "spanish" | "create" | "driving";

const TYPES: Partial<Record<SessionHabit, Option[]>> = { spanish: SPANISH_TYPES, create: CREATE_TYPES };

function describe(e: Entry): string {
  const types = TYPES[e.habit as SessionHabit];
  return [
    types ? labelOf(types, e.subtype) : "",
    e.durationMin ? formatDuration(e.durationMin) : "",
    e.habit === "driving" && e.value ? `${e.value} questions` : "",
    e.habit === "create" && e.subtype === "post" ? `${e.value ?? 1} published` : "",
    e.note ?? "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Spanish, Create and Driving Theory: pick a type (if any), minutes, done. */
export function SessionSheet({ date, onClose, habit }: SheetProps & { habit: SessionHabit }) {
  const { data, saveEntry, removeEntry } = useStore();
  const toast = useToast();
  const s = data.settings;
  const types = TYPES[habit];
  const last = lastEntry(data.entries, habit);
  const today = entriesOn(data.entries, date, habit);

  const [type, setType] = useState<string | undefined>(types ? (last?.subtype ?? types[0].id) : undefined);
  const [minutes, setMinutes] = useState<number | undefined>(last?.durationMin ?? (habit === "create" ? 45 : 20));
  const [questions, setQuestions] = useState<number | undefined>(habit === "driving" ? last?.value : undefined);
  const [videos, setVideos] = useState(1);
  const [note, setNote] = useState("");

  const canSave = habit !== "driving" || minutes !== undefined || questions !== undefined;
  const short = habit === "spanish" && (minutes ?? 0) < s.spanishMinMinutes;

  const save = () => {
    if (!canSave) return;
    const e = saveEntry({
      date,
      habit,
      subtype: type,
      durationMin: minutes,
      value: habit === "driving" ? questions : habit === "create" && type === "post" ? videos : undefined,
      note: note.trim() || undefined,
      state: short ? "partial" : "done",
    });
    onClose();
    const msg =
      habit === "create" && type === "post"
        ? `Published ${videos === 1 ? "a video" : `${videos} videos`}. That's the hard part.`
        : `${HABIT_BY_ID[habit].name} logged`;
    toast(msg, () => removeEntry(e.id));
  };

  return (
    <Sheet title={HABIT_BY_ID[habit].name} onClose={onClose}>
      <LoggedList items={today.map((e) => ({ id: e.id, text: describe(e) }))} onRemove={removeEntry} />
      {types && <Chips label="Type" options={types} value={type} onChange={setType} />}
      <NumberChips label="Minutes" unit="min" choices={MINUTE_CHOICES} value={minutes} onChange={setMinutes} allowNone={habit === "driving"} />
      {habit === "driving" && (
        <NumberChips label="Practice questions" unit="qs" choices={QUESTION_CHOICES} value={questions} onChange={setQuestions} allowNone />
      )}
      {habit === "create" && type === "post" && (
        <div className="field row-between">
          <div className="field-label">Videos published</div>
          <Stepper label="videos published" value={videos} onChange={setVideos} min={1} max={10} />
        </div>
      )}
      <NoteField value={note} onChange={setNote} />
      {short && <p className="hint">Sessions under {s.spanishMinMinutes} min are saved, but don't count toward the week.</p>}
      <button className="primary" onClick={save} disabled={!canSave}>
        {today.length ? "Log another session" : "Log session"}
      </button>
    </Sheet>
  );
}
