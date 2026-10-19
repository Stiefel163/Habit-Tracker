import { useState } from "react";
import { Sheet } from "../components/Sheet";
import { Tree } from "../components/Tree";
import { useStore } from "../data/StoreProvider";
import { MAX_FOCUS, checkInWeek, cleanDays, computeStreak, dayFocus, fuelFor, nextHabit, studyTarget } from "../domain/focus";
import { CREATE_OPTIONS, HABITS, SHEET_PASS_RULE, SPORT_PREFIX, STUDY_BLOCKS, TRAINING_FIXED, activityLabel, type HabitDef } from "../domain/habits";
import { STAGES, activeHabits, formatMin, isDone, sheetStats, sheetsOf, stageOf, studyMinutes, studyTotals } from "../domain/progress";
import type { DayLog, HabitId, Mode, ModeId } from "../domain/types";
import { addDays, formatLong, relativeLabel, weekDays, weekStart, type DayKey } from "../lib/date";

export function TodayView({ date, today, setDate, onUrge }: { date: DayKey; today: DayKey; setDate: (d: DayKey) => void; onUrge: () => void }) {
  const { data, setHabit, update } = useStore();
  const s = data.settings;
  const log = data.days[date];
  const f = dayFocus(data, date);
  const stage = stageOf(f.p);
  const streak = computeStreak(data, today);
  const [picker, setPicker] = useState<HabitId | null>(null);
  const [modeOpen, setModeOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [change, setChange] = useState("");
  const left = f.total - f.done;
  const doneIds = f.focus.filter((_, i) => f.parts[i] >= 1).map((h) => h.id);
  const focusIds = new Set(f.focus.map((h) => h.id));
  const extras = activeHabits(s).filter((h) => !focusIds.has(h.id));
  const extrasDone = extras.filter((h) => isDone(log, h.id));
  const next = date === today ? nextHabit(data, today) : null;
  const ciWeek = date === today ? checkInWeek(today) : null;
  const hasHistory = Object.keys(data.days).some((d) => d < weekStart(today));
  const checkInDue = ciWeek !== null && hasHistory && !data.reviews[ciWeek];
  const lastChange = data.reviews[addDays(weekStart(today), -7)]?.change || (ciWeek ? data.reviews[ciWeek]?.change : "");

  const tap = (h: HabitDef) => {
    if (h.kind === "check") setHabit(date, h.id, isDone(log, h.id) ? [] : ["done"]);
    else setPicker(h.id);
  };

  const row = (h: HabitDef) => {
    if (h.id === "study" && focusIds.has("study")) return <StudyRow key={h.id} date={date} mode={f.mode} onOpen={() => setPicker("study")} />;
    const on = isDone(log, h.id);
    const opens = h.kind !== "check";
    const clean = h.id === "reelFree" ? cleanDays(data, date) : 0;
    const sub =
      h.id === "reelFree" ? (clean ? `${clean} clean ${clean === 1 ? "day" : "days"} in the last 30` : "Tap when today was clean") : on ? doneLine(h, log) ?? h.hint : h.hint;
    return (
      <li key={h.id}>
        <button
          className={`habit${on ? " on" : ""}`}
          onClick={() => {
            setExtrasOpen(false);
            tap(h);
          }}
          aria-pressed={opens ? undefined : on}
          aria-haspopup={opens ? "dialog" : undefined}
          aria-label={`${h.name}: ${on ? "done" : "not done"}${on && opens ? `, ${sub}` : ""}`}
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
          <span className={`flame-chip${streak.todayMet ? " lit" : ""}`} aria-label={`${streak.days} day streak`}>
            <span aria-hidden="true">🔥</span> {streak.days}
          </span>
        )}
      </header>

      <div className="mode-row">
        <button className="mode-chip" onClick={() => setModeOpen(true)} aria-haspopup="dialog">
          <span aria-hidden="true">{f.mode.icon}</span> {f.mode.name} <span aria-hidden="true">›</span>
        </button>
        {date === today && (
          <button className="text-btn" onClick={() => setDate(addDays(today, -1))}>
            Fill in yesterday
          </button>
        )}
      </div>
      {date === today && s.fuel.length > 0 && <p className="fuel-line">“{fuelFor(s.fuel, today)}”</p>}

      <section className={`tree-card stage-${stage}`} aria-live="polite">
        <Tree p={f.p} done={doneIds} label={`${STAGES[stage]}: ${f.done} of ${f.total} focus habits done`} />
        <div className="tree-info">
          <p className="tree-count">
            <span className="big">{f.done}</span>
            <span className="of">/ {f.total}</span>
          </p>
          <p className="tree-stage">{left === 0 ? "Locked in 🔥" : STAGES[stage]}</p>
          <div className="bar" aria-hidden="true">
            <i style={{ width: `${f.p * 100}%` }} />
          </div>
          <p className="muted small">{left === 0 ? "Everything that matters today: done." : `${left} more to lock in today`}</p>
        </div>
      </section>

      {lastChange && date === today && (
        <p className="this-week">
          <span className="muted small">This week's one change</span> {lastChange}
        </p>
      )}

      <ul className="habits">{f.focus.map(row)}</ul>

      <button className="urge-btn" onClick={onUrge}>
        Urge to scroll? Turn it into a rep
      </button>

      {extras.length > 0 && (
        <button className="extras-btn" onClick={() => setExtrasOpen(true)} aria-haspopup="dialog">
          {extrasDone.length ? `Also done: ${extrasDone.map((h) => h.name).join(", ")}` : "Did something else too? Log it"}
          <span aria-hidden="true"> ›</span>
        </button>
      )}

      {next?.ready && (
        <section className="panel next-up">
          <p>
            <strong>{next.locked} of the last 14 days locked in.</strong> Ready to add {next.habit.icon} {next.habit.name} to your focus?
          </p>
          <button
            className="secondary"
            onClick={() =>
              update((d) => {
                const m = d.settings.modes[f.mode.id];
                return { ...d, settings: { ...d.settings, modes: { ...d.settings.modes, [m.id]: { ...m, focus: [...m.focus, next.habit.id] } } } };
              })
            }
          >
            Add {next.habit.name}
          </button>
        </section>
      )}

      {checkInDue && ciWeek && (
        <section className="panel checkin">
          <h2 className="section-title">Sunday check-in · 30 seconds</h2>
          <label className="mirror-field">
            <span>One change for next week (optional)</span>
            <input className="text-input" value={change} onChange={(e) => setChange(e.target.value)} placeholder="Phone in the kitchen at 23:00" maxLength={100} />
          </label>
          <div className="btn-row">
            <button className="secondary" onClick={() => update((d) => ({ ...d, reviews: { ...d.reviews, [ciWeek]: { change: change.trim() } } }))}>
              Keep {f.mode.name}
            </button>
            <button
              className="text-btn"
              onClick={() => {
                update((d) => ({ ...d, reviews: { ...d.reviews, [ciWeek]: { change: change.trim() } } }));
                setModeOpen(true);
              }}
            >
              Switch mode
            </button>
          </div>
        </section>
      )}

      {extrasOpen && (
        <Sheet title="Also done today" onClose={() => setExtrasOpen(false)}>
          <p className="muted small">Not in focus right now, but it still counts for the forest.</p>
          <ul className="habits">{extras.map(row)}</ul>
        </Sheet>
      )}
      {modeOpen && <ModeSheet date={today} onClose={() => setModeOpen(false)} />}
      {picker === "training" && <TrainingPicker date={date} onClose={() => setPicker(null)} />}
      {picker === "create" && <CreatePicker date={date} onClose={() => setPicker(null)} />}
      {picker === "study" && <StudyPicker date={date} onClose={() => setPicker(null)} />}
      {picker === "driving" && <SheetsPicker date={date} onClose={() => setPicker(null)} />}
    </div>
  );
}

/** Study in focus: one tap per finished block. The tree grows with every block. */
function StudyRow({ date, mode, onOpen }: { date: DayKey; mode: Mode; onOpen: () => void }) {
  const { data, setHabit } = useStore();
  const entries = data.days[date]?.study ?? [];
  const min = studyMinutes(data.days[date]);
  const target = studyTarget(mode);
  const on = min >= target;

  const setTotal = (total: number) => {
    if (total >= min) return setHabit(date, "study", [...entries, String(total - min)]);
    const out: string[] = [];
    let acc = 0;
    for (const e of entries) {
      const v = parseInt(e, 10) || 0;
      if (acc + v <= total) {
        out.push(e);
        acc += v;
      } else {
        if (total - acc > 0) out.push(String(total - acc));
        break;
      }
    }
    setHabit(date, "study", out);
  };

  return (
    <li>
      <div className={`habit study-row${on ? " on" : ""}`}>
        <button className="study-main" onClick={onOpen} aria-haspopup="dialog" aria-label={`Study: ${formatMin(min)} of ${formatMin(target)}. Open study details`}>
          <span className="habit-icon" aria-hidden="true">
            📚
          </span>
          <span className="habit-text">
            <span className="habit-name">Study</span>
            <span className="habit-sub">
              {formatMin(min)} of {formatMin(target)}
            </span>
          </span>
        </button>
        <div className="slots" role="group" aria-label={`Study blocks of ${mode.blockMin} minutes`}>
          {Array.from({ length: mode.studyBlocks }, (_, i) => {
            const fill = Math.max(0, Math.min(1, (min - i * mode.blockMin) / mode.blockMin));
            const full = fill >= 1;
            return (
              <button
                key={i}
                className={`slot${full ? " full" : fill > 0 ? " part" : ""}`}
                style={{ ["--fill" as string]: `${Math.round(fill * 100)}%` }}
                aria-pressed={full}
                aria-label={`Block ${i + 1}, ${mode.blockMin} minutes: ${full ? "done" : "not done"}`}
                onClick={() => setTotal(full ? i * mode.blockMin : (i + 1) * mode.blockMin)}
              >
                {full ? "✓" : mode.blockMin}
              </button>
            );
          })}
        </div>
      </div>
    </li>
  );
}

const MODE_ORDER: ModeId[] = ["exam", "build", "offgrid"];

/** Switch the season you're in, and choose its few focus habits. */
function ModeSheet({ date, onClose }: { date: DayKey; onClose: () => void }) {
  const { data, update } = useStore();
  const s = data.settings;
  const current = dayFocus(data, date).mode;
  const switchTo = (id: ModeId) =>
    update((d) => ({
      ...d,
      settings: { ...d.settings, modeLog: [...d.settings.modeLog.filter((e) => e.date !== date), { date, mode: id }] },
    }));
  const setMode = (patch: Partial<Mode>) =>
    update((d) => ({ ...d, settings: { ...d.settings, modes: { ...d.settings.modes, [current.id]: { ...d.settings.modes[current.id], ...patch } } } }));
  const toggleFocus = (h: HabitId) => {
    const has = current.focus.includes(h);
    if (!has && current.focus.length >= MAX_FOCUS) return;
    setMode({ focus: has ? current.focus.filter((x) => x !== h) : [...current.focus, h] });
  };

  return (
    <Sheet title="What season are you in?" onClose={onClose}>
      <ul className="modes">
        {MODE_ORDER.map((id) => {
          const m = s.modes[id];
          const on = id === current.id;
          return (
            <li key={id}>
              <button className={`mode-card${on ? " on" : ""}`} aria-pressed={on} onClick={() => switchTo(id)}>
                <span className="mode-icon" aria-hidden="true">
                  {m.icon}
                </span>
                <span>
                  <strong>{m.name}</strong>
                  <span className="muted small">{m.why}</span>
                  <span className="mode-focus">{m.focus.map((h) => HABITS.find((x) => x.id === h)?.name).join(" · ")}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <h3 className="section-title">
        Focus in {current.name} · max {MAX_FOCUS}
      </h3>
      <div className="focus-chips">
        {activeHabits(s).map((h) => {
          const on = current.focus.includes(h.id);
          return (
            <button key={h.id} className={`fchip${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggleFocus(h.id)} disabled={!on && current.focus.length >= MAX_FOCUS}>
              <span aria-hidden="true">{h.icon}</span> {h.name}
            </button>
          );
        })}
      </div>
      {current.focus.includes("study") && (
        <div className="row">
          <span>
            Study per day: {current.studyBlocks} × {current.blockMin} min = {formatMin(studyTarget(current))}
          </span>
          <div className="stepper">
            <button type="button" aria-label="One block less" onClick={() => setMode({ studyBlocks: Math.max(1, current.studyBlocks - 1) })}>
              −
            </button>
            <input type="number" readOnly value={current.studyBlocks} aria-label="Study blocks per day" />
            <button type="button" aria-label="One block more" onClick={() => setMode({ studyBlocks: Math.min(8, current.studyBlocks + 1) })}>
              +
            </button>
          </div>
        </div>
      )}
      {current.focus.includes("study") && (
        <div className="seg four" role="radiogroup" aria-label="Block length">
          {[30, 45, 60, 90].map((m) => (
            <button key={m} role="radio" aria-checked={current.blockMin === m} className={current.blockMin === m ? "on" : ""} onClick={() => setMode({ blockMin: m })}>
              {m} min
            </button>
          ))}
        </div>
      )}
    </Sheet>
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
