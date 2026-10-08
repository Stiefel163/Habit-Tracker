import { useState } from "react";
import { Pips } from "../components/ui";
import { useStore } from "../data/StoreProvider";
import { CAL_ICON } from "../domain/habits";
import { counts, entriesOn } from "../domain/status";
import { periodStats, weeklyGoals } from "../domain/stats";
import type { Entry, Settings } from "../domain/types";
import { addDays, formatShort, fromKey, weekDays, weekStart, weekdayShort, type DayKey } from "../lib/date";
import { formatDuration } from "../lib/time";

/** Icons for one day, in a fixed order so columns line up across the week. */
export function dayIcons(day: Entry[], s: Settings): string[] {
  const out: string[] = [];
  const t = day.filter((e) => e.habit === "training");
  if (t.some((e) => e.subtype === "strength")) out.push(CAL_ICON.strength);
  if (t.some((e) => e.subtype === "swim")) out.push(CAL_ICON.swim);
  if (t.some((e) => e.subtype === "other")) out.push(CAL_ICON.other);
  if (t.length && t.every((e) => e.subtype === "rest")) out.push(CAL_ICON.rest);
  if (day.some((e) => e.habit === "spanish" && counts(e, s))) out.push(CAL_ICON.spanish);
  if (day.some((e) => e.habit === "driving")) out.push(CAL_ICON.driving);
  if (day.some((e) => e.habit === "create")) out.push(CAL_ICON.create);
  return out;
}

export function WeekView({ today, openDay }: { today: DayKey; openDay: (d: DayKey) => void }) {
  const { data } = useStore();
  const s = data.settings;
  const [start, setStart] = useState(weekStart(today));
  const days = weekDays(start);
  const st = periodStats(days, data.entries, s);
  const isCurrent = start === weekStart(today);
  const goals = weeklyGoals(s);

  const extra: Record<string, string> = {
    spanish: st.spanishMin ? `${st.spanishMin} min` : "",
    driving: [st.drivingMin ? `${st.drivingMin} min` : "", st.drivingQuestions ? `${st.drivingQuestions} qs` : ""].filter(Boolean).join(" · "),
    create: st.createMin ? `${formatDuration(st.createMin)}` : "",
  };

  return (
    <div className="view">
      <header className="period-head">
        <button className="icon-btn" onClick={() => setStart(addDays(start, -7))} aria-label="Previous week">
          ‹
        </button>
        <div>
          <h1>{isCurrent ? "This week" : "Week"}</h1>
          <p className="muted">
            {formatShort(days[0])} – {formatShort(days[6])}
          </p>
        </div>
        <button className="icon-btn" onClick={() => setStart(addDays(start, 7))} aria-label="Next week" disabled={isCurrent}>
          ›
        </button>
      </header>

      <section className="panel">
        <h2 className="panel-title">Targets</h2>
        <ul className="goal-list">
          {goals.map((g) => {
            const v = st[g.key];
            return (
              <li key={g.key} className={v >= g.target ? "hit" : ""}>
                <div className="goal-name">
                  <span>{g.name}</span>
                  {extra[g.key] && <span className="muted small">{extra[g.key]}</span>}
                </div>
                <Pips done={v} target={g.target} />
                <span className="goal-num mono">
                  {v} / {g.target}
                </span>
              </li>
            );
          })}
          {s.active.create && (
            <li className={st.videos > 0 ? "hit" : ""}>
              <div className="goal-name">
                <span>Videos posted</span>
              </div>
              <span />
              <span className="goal-num mono">{st.videos}</span>
            </li>
          )}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">Daily basics</h2>
        <ul className="goal-list">
          {s.active.sleep && (
            <li className={st.sleepOnRhythm >= s.targets.sleep ? "hit" : ""}>
              <div className="goal-name">
                <span>Sleep on rhythm</span>
                {st.avgBed && (
                  <span className="muted small">
                    avg {st.avgBed} → {st.avgWake}
                    {st.avgSleepMin ? ` · ${formatDuration(st.avgSleepMin)}` : ""}
                  </span>
                )}
              </div>
              <Pips done={st.sleepOnRhythm} target={s.targets.sleep} />
              <span className="goal-num mono">
                {st.sleepOnRhythm} / {s.targets.sleep}
              </span>
            </li>
          )}
          {s.active.supplements && (
            <li className={st.supplements >= s.targets.supplements ? "hit" : ""}>
              <div className="goal-name">
                <span>Supplements</span>
              </div>
              <Pips done={st.supplements} target={s.targets.supplements} />
              <span className="goal-num mono">
                {st.supplements} / {s.targets.supplements}
              </span>
            </li>
          )}
          {s.active.noReels && (
            <li className={st.noReels >= s.targets.noReels ? "hit" : ""}>
              <div className="goal-name">
                <span>No reels after waking</span>
              </div>
              <Pips done={st.noReels} target={s.targets.noReels} />
              <span className="goal-num mono">
                {st.noReels} / {s.targets.noReels}
              </span>
            </li>
          )}
        </ul>
      </section>

      <section className="panel">
        <h2 className="panel-title">Days</h2>
        <ul className="week-days">
          {days.map((d) => {
            const icons = dayIcons(entriesOn(data.entries, d), s);
            const note = data.notes.find((n) => n.date === d)?.text;
            const future = d > today;
            return (
              <li key={d}>
                <button className={`week-day${d === today ? " today" : ""}`} onClick={() => openDay(d)} disabled={future}>
                  <span className="wd">
                    {weekdayShort(d)} <span className="muted">{fromKey(d).getDate()}</span>
                  </span>
                  <span className="wd-icons">{icons.length ? icons.join(" ") : <span className="muted">{future ? "" : "·"}</span>}</span>
                  {note && <span className="wd-note">{note}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
