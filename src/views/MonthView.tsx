import { useState } from "react";
import { useStore } from "../data/StoreProvider";
import { evaluateSleep } from "../domain/sleep";
import { entriesOn } from "../domain/status";
import { dayScore, periodStats, type PeriodStats } from "../domain/stats";
import type { Entry, Settings, SleepData } from "../domain/types";
import { addMonths, dayIndexInWeek, formatMonth, formatShort, fromKey, monthDays, monthKey, type DayKey } from "../lib/date";
import { bedRel, clockToMin, minToClock } from "../lib/time";

export function MonthView({ today, openDay }: { today: DayKey; openDay: (d: DayKey) => void }) {
  const { data } = useStore();
  const s = data.settings;
  const [month, setMonth] = useState(monthKey(today));
  const days = monthDays(month);
  const isCurrent = month === monthKey(today);
  const st = periodStats(days, data.entries, s);
  const prevMonth = addMonths(month, -1);
  const prev = periodStats(monthDays(prevMonth), data.entries, s);
  const notes = data.notes.filter((n) => monthKey(n.date) === month).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="view">
      <header className="period-head">
        <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} aria-label="Previous month">
          ‹
        </button>
        <div>
          <h1>{formatMonth(month).split(" ")[0]}</h1>
          <p className="muted">{formatMonth(month).split(" ")[1]}</p>
        </div>
        <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} aria-label="Next month" disabled={isCurrent}>
          ›
        </button>
      </header>

      <section className="panel">
        <Heatmap days={days} today={today} entries={data.entries} s={s} openDay={openDay} />
      </section>

      {s.active.sleep && (
        <section className="panel">
          <h2 className="panel-title">Sleep rhythm</h2>
          <SleepChart days={days} entries={data.entries} s={s} />
          <p className="muted small chart-foot">
            Each bar is one night, from into bed to out of bed. Bands mark your targets ±{s.sleep.toleranceMin} min.
          </p>
        </section>
      )}

      <section className="panel">
        <h2 className="panel-title">This month</h2>
        <MonthTotals st={st} prev={prev} prevLabel={formatMonth(prevMonth).split(" ")[0].slice(0, 3)} s={s} />
      </section>

      <section className="panel">
        <h2 className="panel-title">Memories</h2>
        {notes.length ? (
          <ul className="memories">
            {notes.map((n) => (
              <li key={n.date}>
                <button onClick={() => openDay(n.date)}>
                  <span className="mono muted">{formatShort(n.date)}</span>
                  <span>{n.text}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted small">Your "one thing from today" lines show up here, one per day.</p>
        )}
      </section>
    </div>
  );
}

function Heatmap({ days, today, entries, s, openDay }: { days: DayKey[]; today: DayKey; entries: Entry[]; s: Settings; openDay: (d: DayKey) => void }) {
  const lead = dayIndexInWeek(days[0]);
  return (
    <div className="heatmap">
      {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
        <span key={i} className="hm-head">
          {d}
        </span>
      ))}
      {Array.from({ length: lead }, (_, i) => (
        <span key={`x${i}`} />
      ))}
      {days.map((d) => {
        const future = d > today;
        const score = future ? 0 : dayScore(d, entries, s);
        const level = score === 0 ? 0 : score <= 0.25 ? 1 : score <= 0.5 ? 2 : score <= 0.75 ? 3 : 4;
        const t = entriesOn(entries, d, "training");
        const kind = t.some((e) => e.subtype === "strength") ? "strength" : t.some((e) => e.subtype === "swim") ? "swim" : t.some((e) => e.subtype === "other") ? "other" : null;
        return (
          <button
            key={d}
            className={`hm-cell l${level}${d === today ? " today" : ""}`}
            disabled={future}
            onClick={() => openDay(d)}
            aria-label={`${formatShort(d)}: ${Math.round(score * 100)}%`}
          >
            <span>{fromKey(d).getDate()}</span>
            {kind && <i className={`hm-dot ${kind}`} />}
          </button>
        );
      })}
      <div className="hm-legend muted small">
        <span>
          <i className="hm-dot strength" /> Strength
        </span>
        <span>
          <i className="hm-dot swim" /> Swim
        </span>
        <span className="hm-scale">
          less <i className="l1" />
          <i className="l2" />
          <i className="l3" />
          <i className="l4" /> more
        </span>
      </div>
    </div>
  );
}

function SleepChart({ days, entries, s }: { days: DayKey[]; entries: Entry[]; s: Settings }) {
  const nights = days
    .map((d, i) => {
      const e = entries.find((x) => x.date === d && x.habit === "sleep");
      if (!e) return null;
      const sd = e.data as SleepData;
      return { i, bed: bedRel(sd.bed), wake: clockToMin(sd.wake), ok: evaluateSleep(sd, s.sleep).onRhythm };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const tBed = bedRel(s.sleep.bed);
  const tWake = clockToMin(s.sleep.wake);
  const tol = s.sleep.toleranceMin;
  const lo = Math.min(tBed - 120, ...nights.map((n) => n.bed - 20));
  const hi = Math.max(tWake + 150, ...nights.map((n) => n.wake + 20));
  const W = 320;
  const H = 180;
  const left = 34;
  const colW = (W - left) / days.length;
  const y = (m: number) => ((m - lo) / (hi - lo)) * H;

  if (!nights.length) return <p className="muted small">No nights logged this month yet.</p>;

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="sleep-chart" role="img" aria-label="Bedtime and wake time per night">
      <rect x={left} y={y(tBed - tol)} width={W - left} height={y(tBed + tol) - y(tBed - tol)} className="band" />
      <rect x={left} y={y(tWake - tol)} width={W - left} height={y(tWake + tol) - y(tWake - tol)} className="band" />
      <text x={0} y={y(tBed) + 3} className="axis">
        {s.sleep.bed}
      </text>
      <text x={0} y={y(tWake) + 3} className="axis">
        {s.sleep.wake}
      </text>
      <text x={0} y={9} className="axis faint">
        {minToClock(lo)}
      </text>
      <text x={0} y={H} className="axis faint">
        {minToClock(hi)}
      </text>
      {nights.map((n) => (
        <rect
          key={n.i}
          x={left + n.i * colW + colW * 0.2}
          y={y(n.bed)}
          width={Math.max(2, colW * 0.6)}
          height={Math.max(2, y(n.wake) - y(n.bed))}
          rx={Math.min(3, colW * 0.3)}
          className={n.ok ? "bar ok" : "bar off"}
        />
      ))}
      {[0, 9, 19, days.length - 1].map((i) => (
        <text key={i} x={left + i * colW + colW / 2} y={H + 13} className="axis" textAnchor="middle">
          {i + 1}
        </text>
      ))}
    </svg>
  );
}

function MonthTotals({ st, prev, prevLabel, s }: { st: PeriodStats; prev: PeriodStats; prevLabel: string; s: Settings }) {
  const rows: { label: string; v: string; p: string; show: boolean }[] = [
    {
      label: st.sleepLogged ? `Sleep on rhythm · ${st.sleepOnRhythm}/${st.sleepLogged} nights` : "Sleep on rhythm",
      v: st.sleepLogged ? `${Math.round((st.sleepOnRhythm / st.sleepLogged) * 100)}%` : "–",
      p: prev.sleepLogged ? `${Math.round((prev.sleepOnRhythm / prev.sleepLogged) * 100)}%` : "–",
      show: s.active.sleep,
    },
    { label: "Strength sessions", v: String(st.strength), p: String(prev.strength), show: s.active.training },
    { label: "Swims", v: String(st.swim), p: String(prev.swim), show: s.active.training },
    { label: "Spanish minutes", v: String(st.spanishMin), p: String(prev.spanishMin), show: s.active.spanish },
    { label: "Driving sessions", v: String(st.driving), p: String(prev.driving), show: s.active.driving },
    { label: "Create sessions", v: String(st.create), p: String(prev.create), show: s.active.create },
    { label: "Videos posted", v: String(st.videos), p: String(prev.videos), show: s.active.create },
  ];
  return (
    <ul className="totals">
      {rows
        .filter((r) => r.show)
        .map((r) => (
          <li key={r.label}>
            <span>{r.label}</span>
            <span className="mono strong">{r.v}</span>
            <span className="mono muted small">
              {prevLabel} {r.p}
            </span>
          </li>
        ))}
    </ul>
  );
}
