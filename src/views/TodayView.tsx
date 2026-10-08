import { useEffect, useState } from "react";
import { Ring } from "../components/ui";
import { useStore } from "../data/StoreProvider";
import { HABITS } from "../domain/habits";
import { cardSummary, entriesOn } from "../domain/status";
import { focusLine, periodStats } from "../domain/stats";
import type { CardState, HabitId } from "../domain/types";
import type { World } from "../domain/world";
import { addDays, formatLong, relativeLabel, weekDays, weekStart, type DayKey } from "../lib/date";
import { NoReelsSheet } from "../sheets/NoReelsSheet";
import { SessionSheet } from "../sheets/SessionSheet";
import { SleepSheet } from "../sheets/SleepSheet";
import { SupplementsSheet } from "../sheets/SupplementsSheet";
import { TrainingSheet } from "../sheets/TrainingSheet";

const STATE_LABEL: Record<CardState, string> = {
  empty: "Not logged",
  done: "Done",
  partial: "Partly",
  rest: "Rest",
  skipped: "Not today",
};

function StateMark({ state }: { state: CardState }) {
  return (
    <span className={`mark ${state}`} aria-label={STATE_LABEL[state]}>
      {state === "done" ? "✓" : state === "rest" ? "–" : ""}
    </span>
  );
}

export function TodayView({
  date,
  today,
  setDate,
  goSettings,
  goForest,
  world,
}: {
  date: DayKey;
  today: DayKey;
  setDate: (d: DayKey) => void;
  goSettings: () => void;
  goForest: () => void;
  world: World;
}) {
  const { data } = useStore();
  const s = data.settings;
  const [open, setOpen] = useState<HabitId | null>(null);
  const active = HABITS.filter((h) => s.active[h.id]);
  const week = periodStats(weekDays(weekStart(date)), data.entries, s);

  const summaries = active.map((h) => ({ h, sum: cardSummary(h.id, entriesOn(data.entries, date, h.id), s) }));
  const logged = summaries.filter((x) => x.sum.state !== "empty").length;

  /** For an untouched weekly habit, the most useful line is where the week stands. */
  const weekLine = (id: HabitId): string | null => {
    const t = s.targets;
    switch (id) {
      case "training":
        return `Strength ${week.strength}/${t.strength} · Swim ${week.swim}/${t.swim} this week`;
      case "spanish":
        return `${week.spanish}/${t.spanish} this week · ${week.spanishMin} min`;
      case "driving":
        return `${week.driving}/${t.driving} this week`;
      case "create":
        return `${week.create}/${t.create} this week${week.videos ? ` · ${week.videos} posted` : ""}`;
      default:
        return null;
    }
  };

  return (
    <div className="view">
      <header className="today-head">
        <div className="day-nav">
          <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
            ‹
          </button>
          <div>
            <h1>{relativeLabel(date, today)}</h1>
            <p className="muted">{formatLong(date)}</p>
          </div>
          <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day" disabled={date >= today}>
            ›
          </button>
        </div>
        <div className="today-ring" aria-label={`${logged} of ${active.length} logged`}>
          <Ring value={active.length ? logged / active.length : 0} size={52} />
          <span className="mono">
            {logged}/{active.length}
          </span>
        </div>
      </header>

      {date === today ? (
        <p className="focus">{focusLine(today, data.entries, s)}</p>
      ) : (
        <button className="focus link" onClick={() => setDate(today)}>
          Logging for {formatLong(date)} · back to today ›
        </button>
      )}

      <button className={`forest-strip${world.thisWeek.strong ? " done" : ""}`} onClick={goForest}>
        <span className="fs-icon" aria-hidden="true">
          🌲
        </span>
        <span className="fs-text">
          {world.thisWeek.strong
            ? "Strong week ✓ · a new resident moved in"
            : `${world.thisWeek.hit}/${world.thisWeek.needed} targets → ${world.next}`}
        </span>
        <span className="fs-arrow" aria-hidden="true">
          ›
        </span>
      </button>

      <ul className="cards">
        {summaries.map(({ h, sum }) => {
          const wl = sum.state === "empty" ? weekLine(h.id) : null;
          return (
            <li key={h.id}>
              <button className={`card ${sum.state}`} onClick={() => setOpen(h.id)}>
                <span className="card-icon" aria-hidden="true">
                  {h.icon}
                </span>
                <span className="card-text">
                  <span className="card-title">{h.name}</span>
                  <span className="card-line">{wl ?? sum.line}</span>
                </span>
                <StateMark state={sum.state} />
              </button>
            </li>
          );
        })}
      </ul>

      <MemoryField date={date} />

      {open === "sleep" && <SleepSheet date={date} onClose={() => setOpen(null)} />}
      {open === "training" && <TrainingSheet date={date} onClose={() => setOpen(null)} />}
      {(open === "spanish" || open === "create" || open === "driving") && (
        <SessionSheet key={open} habit={open} date={date} onClose={() => setOpen(null)} />
      )}
      {open === "supplements" && (
        <SupplementsSheet
          date={date}
          onClose={() => setOpen(null)}
          onOpenSettings={() => {
            setOpen(null);
            goSettings();
          }}
        />
      )}
      {open === "noReels" && <NoReelsSheet date={date} onClose={() => setOpen(null)} />}
    </div>
  );
}

function MemoryField({ date }: { date: DayKey }) {
  const { data, setNote } = useStore();
  const saved = data.notes.find((n) => n.date === date)?.text ?? "";
  const [text, setText] = useState(saved);
  const [flash, setFlash] = useState(false);
  useEffect(() => setText(saved), [saved, date]);

  const commit = () => {
    if (text.trim() === saved) return;
    setNote(date, text);
    setFlash(true);
    setTimeout(() => setFlash(false), 1200);
  };

  return (
    <section className="memory">
      <label htmlFor="memory-input" className="memory-label">
        One thing from today <span className="muted">· optional</span>
      </label>
      <div className="memory-row">
        <input
          id="memory-input"
          className="text-input"
          value={text}
          maxLength={120}
          placeholder="Saw the northern lights."
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          enterKeyHint="done"
        />
        <span className={`saved${flash ? " show" : ""}`} aria-live="polite">
          {flash ? "Saved" : ""}
        </span>
      </div>
    </section>
  );
}
