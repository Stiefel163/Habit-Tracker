import { useState } from "react";
import { Tree } from "../components/Tree";
import { useStore } from "../data/StoreProvider";
import { activeHabits, dayProgress, forestStats, goalStates, isDone } from "../domain/progress";
import { addMonths, dayIndexInWeek, formatLong, formatMonth, fromKey, monthDays, monthKey, type DayKey } from "../lib/date";

export function ForestView({ today, openDay }: { today: DayKey; openDay: (d: DayKey) => void }) {
  const { data } = useStore();
  const s = data.settings;
  const [month, setMonth] = useState(monthKey(today));
  const days = monthDays(month);
  const lead = dayIndexInWeek(days[0]);
  const stats = forestStats(data, today);
  const animals = goalStates(data).filter((g) => g.reached);

  return (
    <div className="view">
      <header className="head">
        <div>
          <h1>Your forest</h1>
          <p className="muted">One tree per day. Every check makes it bigger.</p>
        </div>
      </header>

      <section className="stats">
        <div>
          <span className="big">{stats.trees}</span>
          <span className="muted small">trees planted</span>
        </div>
        <div>
          <span className="big">{stats.full}</span>
          <span className="muted small">full trees</span>
        </div>
        <div>
          <span className="big">{animals.length}</span>
          <span className="muted small">{animals.length === 1 ? "animal" : "animals"}</span>
        </div>
      </section>

      {animals.length > 0 && (
        <p className="residents" role="img" aria-label={`Animals living here: ${animals.map((a) => a.animalName).join(", ")}`}>
          {animals.map((a) => (
            <span key={a.id} title={a.animalName} aria-hidden="true">
              {a.animal}
            </span>
          ))}
        </p>
      )}

      <section className="panel">
        <div className="month-nav">
          <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
            ‹
          </button>
          <h2>{formatMonth(month)}</h2>
          <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month" disabled={month >= monthKey(today)}>
            ›
          </button>
        </div>
        <div className="forest-grid">
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i} className="fg-head" aria-hidden="true">
              {d}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`x${i}`} />
          ))}
          {days.map((d) => {
            const log = data.days[d];
            const { p, done, total } = dayProgress(log, s);
            const future = d > today;
            return (
              <button
                key={d}
                className={`fg-cell${d === today ? " today" : ""}`}
                disabled={future}
                onClick={() => openDay(d)}
                aria-label={`${formatLong(d)}: ${done} of ${total} done`}
              >
                {!future && <Tree p={p} done={activeHabits(s).filter((h) => isDone(log, h.id)).map((h) => h.id)} size={40} mini />}
                <span className="fg-num">{fromKey(d).getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
