import { useMemo, useState } from "react";
import { Tree } from "../components/Tree";
import { useStore } from "../data/StoreProvider";
import { computeStreak, cookies, dayFocus, eraOf, lockedInDays, urgesBeaten } from "../domain/focus";
import { addMonths, dayIndexInWeek, formatLong, formatMonth, fromKey, monthDays, monthKey, type DayKey } from "../lib/date";

/** Your progress in one place: the era you're in, the forest you grew, the cookies you earned. */
export function ForestView({ today, openDay }: { today: DayKey; openDay: (d: DayKey) => void }) {
  const { data, update } = useStore();
  const [month, setMonth] = useState(monthKey(today));
  const days = monthDays(month);
  const lead = dayIndexInWeek(days[0]);
  const locked = lockedInDays(data, today);
  const { era, next, toNext, progress, index } = eraOf(locked);
  const streak = computeStreak(data, today);
  const jar = useMemo(() => cookies(data, today), [data, today]);
  const [win, setWin] = useState("");
  const firstDay = Object.keys(data.days).sort()[0] ?? today;

  return (
    <div className="view">
      <header className="head">
        <div>
          <h1>Progress</h1>
          <p className="muted">{data.settings.identity}</p>
        </div>
      </header>

      <section className="era-card">
        <p className="muted small">Era {index + 1} of 7</p>
        <h2 className="era-name">{era.name}</h2>
        <div
          className="bar"
          role="progressbar"
          aria-label={next ? `${toNext} locked-in days to ${next.name}` : "Final era reached"}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
        >
          <i style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="muted small">{next ? `${toNext} more locked-in ${toNext === 1 ? "day" : "days"} to ${next.name}` : "You made it to the last era."}</p>
        <div className="era-stats">
          <div>
            <span className="big">🔥 {streak.days}</span>
            <span className="muted small">day streak · ❄️ {streak.freezes}</span>
          </div>
          <div>
            <span className="big">{locked}</span>
            <span className="muted small">days locked in</span>
          </div>
          <div>
            <span className="big">{urgesBeaten(data)}</span>
            <span className="muted small">urges beaten</span>
          </div>
        </div>
        <p className="muted small">A day is locked in when your focus is done. Miss one, and a ❄️ saves the streak. Only missing twice breaks it.</p>
      </section>

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
            const future = d > today;
            const f = dayFocus(data, d);
            return (
              <button
                key={d}
                className={`fg-cell${d === today ? " today" : ""}${f.lockedIn ? " locked" : ""}`}
                disabled={future}
                onClick={() => openDay(d)}
                aria-label={`${formatLong(d)}: ${f.done} of ${f.total} focus done${f.lockedIn ? ", locked in" : ""}`}
              >
                {!future && d >= firstDay && <Tree p={f.p} done={f.focus.filter((_, i) => f.parts[i] >= 1).map((h) => h.id)} size={40} mini />}
                <span className="fg-num">{fromKey(d).getDate()}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2 className="section-title">Cookie jar 🍪</h2>
        {jar.length ? (
          <ul className="cookies">
            {jar.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Wins land here automatically. Add hard things you got through, for the days you doubt yourself.</p>
        )}
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            const t = win.trim();
            if (!t) return;
            update((d) => ({ ...d, wins: [...d.wins, { date: today, text: t }] }));
            setWin("");
          }}
        >
          <input className="text-input" value={win} onChange={(e) => setWin(e.target.value)} placeholder="e.g. Hiked the national park" aria-label="Add a win" maxLength={100} />
          <button className="secondary" type="submit">
            Add
          </button>
        </form>
      </section>
    </div>
  );
}
