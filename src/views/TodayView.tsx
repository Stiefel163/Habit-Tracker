import { useState } from "react";
import { Sheet } from "../components/Sheet";
import { Tree } from "../components/Tree";
import { useStore } from "../data/StoreProvider";
import { CREATE_OPTIONS, SPORT_PREFIX, TRAINING_FIXED, activityLabel, type HabitDef } from "../domain/habits";
import { STAGES, activeHabits, dayProgress, isDone, stageOf } from "../domain/progress";
import type { HabitId } from "../domain/types";
import { formatLong, relativeLabel, weekDays, weekStart, weekdayShort, fromKey, type DayKey } from "../lib/date";

export function TodayView({ date, today, setDate }: { date: DayKey; today: DayKey; setDate: (d: DayKey) => void }) {
  const { data, setHabit } = useStore();
  const s = data.settings;
  const log = data.days[date];
  const { done, total, p } = dayProgress(log, s);
  const stage = stageOf(p);
  const doneIds = activeHabits(s).filter((h) => isDone(log, h.id)).map((h) => h.id);
  const [picker, setPicker] = useState<HabitId | null>(null);
  const left = total - done;

  const tap = (h: HabitDef) => {
    if (h.choice) setPicker(h.id);
    else setHabit(date, h.id, isDone(log, h.id) ? [] : ["done"]);
  };

  return (
    <div className="view">
      <header className="head">
        <div>
          <h1>{relativeLabel(date, today)}</h1>
          <p className="muted">{formatLong(date)}</p>
        </div>
        {date !== today && (
          <button className="pill-btn" onClick={() => setDate(today)}>
            Back to today
          </button>
        )}
      </header>

      <section className={`tree-card stage-${stage}`} aria-live="polite">
        <Tree p={p} done={doneIds} label={`${STAGES[stage]}: ${done} of ${total} habits done`} />
        <div className="tree-info">
          <p className="tree-count">
            <span className="big">{done}</span>
            <span className="of">/ {total}</span>
          </p>
          <p className="tree-stage">{STAGES[stage]}</p>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${p * 100}%` }} />
          </div>
          <p className="muted small">{left === 0 ? "Everything done. Full tree! 🌳" : `${left} more ${left === 1 ? "check" : "checks"} for a full tree`}</p>
        </div>
      </section>

      <ul className="habits">
        {activeHabits(s).map((h) => {
          const on = isDone(log, h.id);
          const items = log?.[h.id] ?? [];
          const sub = on && h.choice ? items.map(activityLabel).join(" + ") : h.hint;
          return (
            <li key={h.id}>
              <button
                className={`habit${on ? " on" : ""}`}
                onClick={() => tap(h)}
                aria-pressed={h.choice ? undefined : on}
                aria-haspopup={h.choice ? "dialog" : undefined}
                aria-label={`${h.name}: ${on ? "done" : "not done"}${on && h.choice ? `, ${sub}` : ""}`}
              >
                <span className="habit-icon" aria-hidden="true">
                  {h.icon}
                </span>
                <span className="habit-text">
                  <span className="habit-name">{h.name}</span>
                  <span className="habit-sub">{sub}</span>
                </span>
                <span className="check" aria-hidden="true" style={on ? { background: h.color, borderColor: h.color } : undefined}>
                  {on ? "✓" : ""}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <WeekStrip date={date} today={today} setDate={setDate} />

      {picker === "training" && <TrainingPicker date={date} onClose={() => setPicker(null)} />}
      {picker === "create" && <CreatePicker date={date} onClose={() => setPicker(null)} />}
    </div>
  );
}

function WeekStrip({ date, today, setDate }: { date: DayKey; today: DayKey; setDate: (d: DayKey) => void }) {
  const { data } = useStore();
  const s = data.settings;
  return (
    <section className="week">
      <h2 className="section-title">This week</h2>
      <ul className="week-row">
        {weekDays(weekStart(date)).map((d) => {
          const log = data.days[d];
          const { p, done, total } = dayProgress(log, s);
          const future = d > today;
          return (
            <li key={d}>
              <button
                className={`week-day${d === date ? " sel" : ""}${d === today ? " today" : ""}`}
                disabled={future}
                onClick={() => setDate(d)}
                aria-label={`${formatLong(d)}: ${done} of ${total} done`}
                aria-current={d === date ? "date" : undefined}
              >
                <Tree p={future ? 0 : p} done={activeHabits(s).filter((h) => isDone(log, h.id)).map((h) => h.id)} size={40} mini />
                <span>{weekdayShort(d).slice(0, 2)}</span>
                <span className="muted">{fromKey(d).getDate()}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ChoiceList({ options, selected, onToggle }: { options: { id: string; label: string; icon: string }[]; selected: string[]; onToggle: (id: string) => void }) {
  return (
    <ul className="choices">
      {options.map((o) => {
        const on = selected.includes(o.id);
        return (
          <li key={o.id}>
            <button className={`choice${on ? " on" : ""}`} aria-pressed={on} onClick={() => onToggle(o.id)}>
              <span aria-hidden="true">{o.icon}</span>
              <span className="choice-label">{o.label}</span>
              <span className="check" aria-hidden="true">
                {on ? "✓" : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function TrainingPicker({ date, onClose }: { date: DayKey; onClose: () => void }) {
  const { data, setHabit, updateSettings } = useStore();
  const selected = data.days[date]?.training ?? [];
  const [newSport, setNewSport] = useState("");
  const toggle = (id: string) => setHabit(date, "training", selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const options = [
    ...TRAINING_FIXED,
    ...data.settings.sports.map((name) => ({ id: SPORT_PREFIX + name, label: name, icon: "🏐" })),
  ];
  return (
    <Sheet title="What did you do?" onClose={onClose}>
      <ChoiceList options={options} selected={selected} onToggle={toggle} />
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          const name = newSport.trim();
          if (!name) return;
          if (!data.settings.sports.some((x) => x.toLowerCase() === name.toLowerCase())) updateSettings((st) => ({ ...st, sports: [...st.sports, name] }));
          const id = SPORT_PREFIX + name;
          if (!selected.includes(id)) setHabit(date, "training", [...selected, id]);
          setNewSport("");
        }}
      >
        <input className="text-input" value={newSport} onChange={(e) => setNewSport(e.target.value)} placeholder="Other sport, e.g. Hiking" aria-label="Add another sport" maxLength={24} />
        <button className="secondary" type="submit">
          Add
        </button>
      </form>
    </Sheet>
  );
}

function CreatePicker({ date, onClose }: { date: DayKey; onClose: () => void }) {
  const { data, setHabit } = useStore();
  const selected = data.days[date]?.create ?? [];
  const toggle = (id: string) => setHabit(date, "create", selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  return (
    <Sheet title="Create" onClose={onClose}>
      <ChoiceList options={CREATE_OPTIONS} selected={selected} onToggle={toggle} />
    </Sheet>
  );
}
