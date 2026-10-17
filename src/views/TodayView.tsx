import { useState } from "react";
import { Sheet } from "../components/Sheet";
import { Tree } from "../components/Tree";
import { useStore } from "../data/StoreProvider";
import { CREATE_OPTIONS, SHEET_PASS_RULE, SPORT_PREFIX, STUDY_BLOCKS, TRAINING_FIXED, activityLabel, type HabitDef } from "../domain/habits";
import { STAGES, activeHabits, dayProgress, formatMin, isDone, sheetStats, sheetsOf, stageOf, studyMinutes, studyTotals } from "../domain/progress";
import { computeStreak, fuelFor, missedYesterday } from "../domain/lockin";
import type { DayLog, HabitId } from "../domain/types";
import { reviewWeek } from "../components/LockIn";
import { dayIndexInWeek } from "../lib/date";
import { formatLong, relativeLabel, weekDays, weekStart, weekdayShort, fromKey, type DayKey } from "../lib/date";

export function TodayView({ date, today, setDate, goLockIn }: { date: DayKey; today: DayKey; setDate: (d: DayKey) => void; goLockIn: () => void }) {
  const { data, setHabit } = useStore();
  const streak = computeStreak(data, today);
  const missed = date === today ? missedYesterday(data, date) : new Set<HabitId>();
  const mirrorDue = date === today && [0, 5, 6].includes(dayIndexInWeek(today)) && !data.reviews[reviewWeek(today)];
  const s = data.settings;
  const log = data.days[date];
  const { done, total, p } = dayProgress(log, s);
  const stage = stageOf(p);
  const doneIds = activeHabits(s).filter((h) => isDone(log, h.id)).map((h) => h.id);
  const [picker, setPicker] = useState<HabitId | null>(null);
  const left = total - done;

  const tap = (h: HabitDef) => {
    if (h.kind === "check") setHabit(date, h.id, isDone(log, h.id) ? [] : ["done"]);
    else setPicker(h.id);
  };

  return (
    <div className="view">
      <header className="head">
        <div>
          <h1>{relativeLabel(date, today)}</h1>
          <p className="muted">{formatLong(date)}</p>
        </div>
        {date !== today ? (
          <button className="pill-btn" onClick={() => setDate(today)}>
            Back to today
          </button>
        ) : (
          <button className={`flame-chip${streak.todayMet ? " lit" : ""}`} onClick={goLockIn} aria-label={`${streak.days} day streak. Open Lock in`}>
            <span aria-hidden="true">🔥</span> {streak.days}
          </button>
        )}
      </header>
      {date === today && s.fuel.length > 0 && <p className="fuel-line">“{fuelFor(s.fuel, today)}”</p>}
      {mirrorDue && (
        <button className="mirror-prompt" onClick={goLockIn}>
          🪞 Accountability mirror is due · 2 min ›
        </button>
      )}

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
          const sub = on ? doneLine(h, log) ?? h.hint : h.hint;
          const opens = h.kind !== "check";
          const twice = !on && missed.has(h.id);
          return (
            <li key={h.id}>
              <button
                className={`habit${on ? " on" : ""}`}
                onClick={() => tap(h)}
                aria-pressed={opens ? undefined : on}
                aria-haspopup={opens ? "dialog" : undefined}
                aria-label={`${h.name}: ${on ? "done" : "not done"}${on && opens ? `, ${sub}` : ""}${twice ? ". Missed yesterday: don't miss twice" : ""}`}
              >
                <span className="habit-icon" aria-hidden="true">
                  {h.icon}
                </span>
                <span className="habit-text">
                  <span className="habit-name">
                    {h.name}
                    {twice && <span className="twice">Don't miss twice</span>}
                  </span>
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
      {picker === "study" && <StudyPicker date={date} onClose={() => setPicker(null)} />}
      {picker === "driving" && <SheetsPicker date={date} onClose={() => setPicker(null)} />}
    </div>
  );
}

/** The line under a done habit: what you actually did. */
function doneLine(h: HabitDef, log: DayLog | undefined): string | null {
  switch (h.kind) {
    case "choice":
      return (log?.[h.id] ?? []).map(activityLabel).join(" + ");
    case "minutes": {
      const n = log?.study?.length ?? 0;
      return `${formatMin(studyMinutes(log))} · ${n} ${n === 1 ? "block" : "blocks"}`;
    }
    case "sheets": {
      const s = sheetsOf(log);
      if (!s.length) return "Studied";
      const passed = s.filter((x) => x === "pass").length;
      return `${s.length} ${s.length === 1 ? "sheet" : "sheets"} · ${passed} passed`;
    }
    default:
      return null;
  }
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

function StudyPicker({ date, onClose }: { date: DayKey; onClose: () => void }) {
  const { data, setHabit } = useStore();
  const blocks = data.days[date]?.study ?? [];
  const week = studyTotals(data.days, weekDays(weekStart(date)));
  const add = (m: number) => setHabit(date, "study", [...blocks, String(m)]);
  const remove = (i: number) => setHabit(date, "study", blocks.filter((_, j) => j !== i));
  return (
    <Sheet title="Study" onClose={onClose}>
      <div className="sum" aria-live="polite">
        <span className="sum-big">{formatMin(studyMinutes(data.days[date]))}</span>
        <span className="muted">today · {formatMin(week.min)} this week</span>
      </div>
      <p className="muted small">Tap once per study block. Blocks add up.</p>
      <div className="blocks">
        {STUDY_BLOCKS.map((m) => (
          <button key={m} className="block-btn" onClick={() => add(m)} aria-label={`Add ${m} minutes`}>
            +{m}
            <span>min</span>
          </button>
        ))}
      </div>
      {blocks.length > 0 && (
        <ul className="logged">
          {blocks.map((b, i) => (
            <li key={i}>
              <span>Block {i + 1} · {b} min</span>
              <button className="text-btn" onClick={() => remove(i)} aria-label={`Remove block ${i + 1}, ${b} minutes`}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

function SheetsPicker({ date, onClose }: { date: DayKey; onClose: () => void }) {
  const { data, setHabit } = useStore();
  const items = data.days[date]?.driving ?? [];
  const today = sheetsOf(data.days[date]);
  const all = sheetStats(data.days);
  const add = (r: "pass" | "fail") => setHabit(date, "driving", [...items.filter((x) => x === "pass" || x === "fail"), r]);
  const undo = () => {
    const idx = items.map((x) => x === "pass" || x === "fail").lastIndexOf(true);
    if (idx >= 0) setHabit(date, "driving", items.filter((_, j) => j !== idx));
  };
  const studiedOnly = items.length > 0 && today.length === 0;
  return (
    <Sheet title="Driving theory" onClose={onClose}>
      <div className="sum" aria-live="polite">
        <span className="sum-big">
          {today.length} {today.length === 1 ? "sheet" : "sheets"}
        </span>
        <span className="muted">
          today · {today.filter((x) => x === "pass").length} passed
        </span>
      </div>
      <p className="muted small">After each practice sheet (Bogen), tap the result. Passed = {SHEET_PASS_RULE}.</p>
      <div className="sheet-btns">
        <button className="result pass" onClick={() => add("pass")}>
          <span aria-hidden="true">✓</span> Passed
        </button>
        <button className="result fail" onClick={() => add("fail")}>
          <span aria-hidden="true">✗</span> Not passed
        </button>
      </div>
      {today.length > 0 && (
        <p className="sheet-dots" aria-label={`Today: ${today.map((x) => (x === "pass" ? "passed" : "not passed")).join(", ")}`}>
          {today.map((x, i) => (
            <span key={i} className={x} aria-hidden="true">
              {x === "pass" ? "✓" : "✗"}
            </span>
          ))}
          <button className="text-btn" onClick={undo}>
            Undo last
          </button>
        </p>
      )}
      <div className="readiness">
        <div>
          <span className="sum-mid">{all.total}</span>
          <span className="muted small">sheets total</span>
        </div>
        <div>
          <span className="sum-mid">{all.recent ? `${all.recentPassed}/${all.recent}` : "–"}</span>
          <span className="muted small">passed of your last {all.recent || 10}</span>
        </div>
      </div>
      <button
        className={`studied${studiedOnly ? " on" : ""}`}
        aria-pressed={studiedOnly}
        onClick={() => setHabit(date, "driving", studiedOnly ? [] : today.length ? items : ["done"])}
        disabled={today.length > 0}
      >
        {studiedOnly ? "✓ " : ""}Studied without a full sheet
      </button>
    </Sheet>
  );
}
