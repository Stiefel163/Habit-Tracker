import { useMemo, useState } from "react";
import { Bar } from "../components/Bar";
import { Sheet } from "../components/Sheet";
import { useStore } from "../data/StoreProvider";
import {
  ACHIEVEMENTS,
  CLEAN_ITEMS,
  cleanCount,
  TIER_NAME,
  VIDEO_MILESTONES,
  achievementContext,
  ratingOf,
  statsFor,
  focusStats,
  formatDuration,
  formatHours,
  journey,
  masteryOf,
  playerOf,
  spanishStreak,
  totals,
  unlockedAchievements,
  validLogs,
  weekHistory,
  weekResult,
} from "../domain/rpg";
import { addDays, addMonths, dayIndexInWeek, formatLong, formatMonth, formatShort, monthDays, monthKey, weekDays, weekStart, type DayKey } from "../lib/date";
import type { ActivityLog } from "../domain/types";

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word + "s"}`;

export function ProgressView({ today }: { today: DayKey }) {
  const { data } = useStore();
  const s = data.settings;
  const logs = useMemo(() => validLogs(data.logs), [data.logs]);
  const player = useMemo(() => playerOf(data, today), [data, today]);
  const t = totals(logs);
  const streak = spanishStreak(logs, today, s.shieldEvery);
  const spanish = journey(logs, "spanish");
  const videos = journey(logs, "video");
  const focus = focusStats(logs, today);
  const recent = (kind: string) => {
    const since = new Set(Array.from({ length: 28 }, (_, i) => addDays(today, -i)));
    return logs.filter((l) => l.kind === kind && since.has(l.date)).length;
  };
  const [openJourney, setOpenJourney] = useState<"spanish" | "video" | null>(null);

  const skillStat: Record<string, string> = {
    strength: `${plural(t.strength, "workout")} · ${recent("strength")} in 4 weeks`,
    swimming: `${plural(t.swim, "swim")} · ${recent("swim")} in 4 weeks`,
    spanish: `${plural(t.spanish, "day")} · ${recent("spanish")} in 4 weeks`,
    creator: `${plural(t.videos, "video")} · ${formatHours(focus.byCategory.find(([c]) => c === "Creator")?.[1] ?? 0)} of creator work`,
    driving: `${t.bogen} Bögen total`,
    focus: `${formatHours(t.focusMin)} lifetime`,
  };

  return (
    <div className="view">
      <header className="head">
        <h1>Progress</h1>
        <p className="muted">The work that's making the person you're becoming.</p>
      </header>

      <section className="panel">
        <h2 className="section-title">🧠 Focus</h2>
        <div className="mini-stats four">
          <div>
            <strong>{formatHours(focus.today)}</strong>
            <span>today</span>
          </div>
          <div>
            <strong>{formatHours(focus.week)}</strong>
            <span>this week</span>
          </div>
          <div>
            <strong>{formatHours(focus.month)}</strong>
            <span>this month</span>
          </div>
          <div>
            <strong>{formatHours(focus.lifetime)}</strong>
            <span>lifetime</span>
          </div>
        </div>
        {focus.byCategory.length > 0 && (
          <>
            <p className="muted small">Rule of thumb: roughly 1,000–4,000 hours of focused work puts you in the top 1% of a field.</p>
            <ul className="mastery">
              {focus.byCategory.map(([c, min]) => {
                const m = masteryOf(min);
                return (
                  <li key={c}>
                    <div className="panel-head">
                      <span>{c}</span>
                      <span className="muted small">
                        {formatHours(min)} / {m.next.hours.toLocaleString("en-US")} h
                      </span>
                    </div>
                    <Bar value={m.progress} label={`${c}: ${formatHours(min)} of ${m.next.hours} hours`} thin />
                    <span className="muted small">
                      {m.reached ? m.reached.label : "Just getting started"} · next: {m.next.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <button className="panel tap" onClick={() => setOpenJourney("spanish")} aria-haspopup="dialog">
        <span className="panel-head">
          <span className="section-title">🇪🇸 100 Days of Spanish</span>
          <span className="big-num">{t.spanish} / 100</span>
        </span>
        <Bar value={t.spanish / 100} label={`${t.spanish} of 100 Spanish days`} />
        <span className="streak-line">
          <span className={`flame${streak.current ? " lit" : ""}`} aria-hidden="true">
            🔥
          </span>
          <span>
            <strong>{plural(streak.current, "day")}</strong> <span className="muted">streak · best {streak.best}</span>
          </span>
          <span className={`shield-pill${streak.shield ? " on" : ""}`}>🛡 {streak.shield ? "ready" : `in ${streak.toRecharge}`}</span>
        </span>
        <span className="muted small">{spanish.length ? "Tap for your log, day by day ›" : "Log your first Spanish day on Home."}</span>
      </button>

      <button className="panel tap" onClick={() => setOpenJourney("video")} aria-haspopup="dialog">
        <span className="panel-head">
          <span className="section-title">🎬 Road to 100 Videos</span>
          <span className="big-num">{t.videos} / 100</span>
        </span>
        <span className="road" aria-hidden="true">
          <i style={{ width: `${Math.min(100, t.videos)}%` }} />
          {VIDEO_MILESTONES.map((m) => (
            <b key={m} className={t.videos >= m ? "hit" : ""} style={{ left: `${m}%` }} />
          ))}
        </span>
        <span className="muted small">{videos.length ? "Tap for every video you posted ›" : `Milestones at ${VIDEO_MILESTONES.join(", ")}`}</span>
      </button>

      <CleanPanel logs={logs} today={today} />

      <section className="panel">
        <h2 className="section-title">Skills</h2>
        <ul className="skill-cards">
          {player.skills.map((k) => (
            <li key={k.id}>
              <div className="panel-head">
                <span className="sk-name">
                  <span aria-hidden="true">{k.icon}</span> {k.name}
                </span>
                <span className="sk-lv">Lv {k.level}</span>
              </div>
              <Bar value={k.progress} label={`${k.name}: ${k.into} of ${k.need} XP to level ${k.level + 1}`} thin />
              <span className="muted small">{skillStat[k.id]}</span>
            </li>
          ))}
        </ul>
      </section>

      <Periods logs={logs} today={today} />

      <Achievements today={today} />

      {openJourney === "spanish" && (
        <Sheet
          title={
            <>
              🇪🇸 Spanish log <span className="of">{spanish.length} / 100</span>
            </>
          }
          onClose={() => setOpenJourney(null)}
        >
          {spanish.length === 0 && <p className="muted">No Spanish days yet.</p>}
          <ol className="journey">
            {spanish.map((x) => (
              <li key={x.log.id}>
                <span className="j-n">Day {x.n}</span>
                <span className="j-body">
                  <span className="muted small">
                    {formatLong(x.log.date)}
                    {"minutes" in x.log && x.log.minutes ? ` · ${formatDuration(x.log.minutes)}` : ""}
                  </span>
                  <span>{x.log.better || <em className="muted">no note</em>}</span>
                </span>
              </li>
            ))}
          </ol>
        </Sheet>
      )}
      {openJourney === "video" && (
        <Sheet
          title={
            <>
              🎬 Your videos <span className="of">{videos.length} / 100</span>
            </>
          }
          onClose={() => setOpenJourney(null)}
        >
          {videos.length === 0 && <p className="muted">No videos yet.</p>}
          <ol className="journey">
            {videos.map((x) => (
              <li key={x.log.id}>
                <span className="j-n">#{x.n}</span>
                <span className="j-body">
                  <span className="muted small">{formatLong(x.log.date)}</span>
                  {"title" in x.log && x.log.title && <strong>{x.log.title}</strong>}
                  <span>{x.log.better || <em className="muted">no note</em>}</span>
                </span>
              </li>
            ))}
          </ol>
        </Sheet>
      )}
    </div>
  );
}

type Period = {
  key: string;
  label: string;
  days: DayKey[];
  stars: number;
  starsMax: number;
  rating: string | null;
  weekStart?: DayKey;
};

const activeDays = (logs: ActivityLog[], days: DayKey[]) => {
  const set = new Set(days);
  return new Set(logs.filter((l) => set.has(l.date)).map((l) => l.date)).size;
};

/** Past weeks or months: how good each one was. Tap one for the details. */
function Periods({ logs, today }: { logs: ActivityLog[]; today: DayKey }) {
  const { data } = useStore();
  const targets = data.settings.targets;
  const [mode, setMode] = useState<"week" | "month">("week");
  const [all, setAll] = useState(false);
  const [open, setOpen] = useState<Period | null>(null);
  const weeks = useMemo(() => weekHistory(logs, today, targets), [logs, today, targets]);

  const periods: Period[] = useMemo(() => {
    if (mode === "week")
      return weeks.map((w) => ({
        key: w.start,
        label: `${formatShort(w.start)} – ${formatShort(weekDays(w.start)[6])}`,
        days: weekDays(w.start),
        stars: w.stars,
        starsMax: w.missions.length,
        rating: w.rating,
        weekStart: w.start,
      }));
    const first = logs.reduce((a, l) => (l.date < a ? l.date : a), today);
    const out: Period[] = [];
    for (let m = monthKey(first); m <= monthKey(today); m = addMonths(m, 1)) {
      const ws = weeks.filter((w) => monthKey(w.start) === m);
      const stars = ws.reduce((a, w) => a + w.stars, 0);
      const avg = ws.length ? stars / ws.length : 0;
      const rating = ratingOf(Math.floor(avg), ws[0]?.missions.length ?? 6);
      out.push({
        key: m,
        label: formatMonth(m),
        days: monthDays(m),
        stars,
        starsMax: ws.reduce((a, w) => a + w.missions.length, 0),
        rating: rating ? rating.replace("WEEK", "MONTH") : null,
      });
    }
    return out.reverse();
  }, [mode, weeks, logs, today]);
  const shown = all ? periods : periods.slice(0, 6);
  const nowKey = mode === "week" ? weekStart(today) : monthKey(today);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="section-title">{mode === "week" ? "Your weeks" : "Your months"}</h2>
        <div className="seg" role="group" aria-label="Show weeks or months">
          {(["week", "month"] as const).map((m) => (
            <button
              key={m}
              className={mode === m ? "on" : ""}
              aria-pressed={mode === m}
              onClick={() => {
                setMode(m);
                setAll(false);
              }}
            >
              {m === "week" ? "Weeks" : "Months"}
            </button>
          ))}
        </div>
      </div>
      <ul className="weeks">
        {shown.map((p) => {
          const active = activeDays(logs, p.days);
          return (
            <li key={p.key}>
              <button className="period" onClick={() => setOpen(p)} aria-haspopup="dialog">
                <span className="p-label">
                  {p.label}
                  {p.key === nowKey && <span className="muted"> · now</span>}
                </span>
                <span className="muted small">›</span>
                {mode === "week" ? (
                  <span className="stars-line" aria-label={`${p.stars} of ${p.starsMax} stars`}>
                    {"⭐".repeat(p.stars)}
                    <span className="dim">{"☆".repeat(Math.max(0, p.starsMax - p.stars))}</span>
                  </span>
                ) : (
                  <span className="muted small">
                    ⭐ {p.stars} · {active} active {active === 1 ? "day" : "days"}
                  </span>
                )}
                <span className="w-rating">{p.rating ?? ""}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {periods.length > 6 && (
        <button className="text-btn left" onClick={() => setAll(!all)} aria-expanded={all}>
          {all ? "Show less" : `Show all ${periods.length}`}
        </button>
      )}
      {open && <PeriodSheet period={open} logs={logs} onClose={() => setOpen(null)} />}
    </section>
  );
}

function PeriodSheet({ period, logs, onClose }: { period: Period; logs: ActivityLog[]; onClose: () => void }) {
  const { data } = useStore();
  const st = statsFor(logs, new Set(period.days));
  const active = activeDays(logs, period.days);
  const week = period.weekStart ? weekResult(logs, period.weekStart, data.settings.targets) : null;
  const cells: [string, string, string][] = [
    ["🧠", formatHours(st.focusMin), "focus"],
    ["🦾", String(st.strength), st.strength === 1 ? "workout" : "workouts"],
    ["🏊", String(st.swim), st.swim === 1 ? "swim" : "swims"],
    ["🇪🇸", String(st.spanish), "Spanish days"],
    ["🎬", String(st.videos), st.videos === 1 ? "video" : "videos"],
    ["🚗", String(st.bogen), "Bögen"],
  ];
  return (
    <Sheet title={period.label} onClose={onClose}>
      <p className="period-sum">
        <strong>⭐ {period.stars}</strong>
        <span className="muted">
          {week ? ` / ${period.starsMax} stars` : " stars"} · {active} active {active === 1 ? "day" : "days"}
        </span>
      </p>
      {period.rating && <p className="w-rating">{period.rating}</p>}
      <div className="mini-stats">
        {cells.map(([i, v, u]) => (
          <div key={u}>
            <strong>
              <span aria-hidden="true">{i}</span> {v}
            </strong>
            <span>{u}</span>
          </div>
        ))}
      </div>
      {week && (
        <>
          <h3 className="section-title">Missions</h3>
          <ul className="missions">
            {week.missions.map((m) => (
              <li key={m.id} className={m.complete ? "complete" : ""}>
                <span className="m-label">
                  <span aria-hidden="true">{m.icon}</span> {m.label}
                </span>
                <Bar value={m.value / m.target} label={`${m.label}: ${m.value} of ${m.target}`} thin />
                <span className="m-num">
                  {m.complete ? "⭐" : ""} {m.value} / {m.target}
                  {m.unit === "h" ? " h" : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Sheet>
  );
}

/** Minecraft-style: you see the odd name, tap it to find out what it takes. */
function Achievements({ today }: { today: DayKey }) {
  const { data } = useStore();
  const unlocked = useMemo(() => unlockedAchievements(achievementContext(data, today)), [data, today]);
  const [open, setOpen] = useState<string | null>(null);
  const a = ACHIEVEMENTS.find((x) => x.id === open);
  return (
    <section className="panel">
      <div className="panel-head">
        <h2 className="section-title">Achievements</h2>
        <span className="muted small">
          {unlocked.size} / {ACHIEVEMENTS.length}
        </span>
      </div>
      <ul className="achievements">
        {ACHIEVEMENTS.map((x) => (
          <li key={x.id}>
            <button className={`ach${unlocked.has(x.id) ? " on" : ""}`} onClick={() => setOpen(x.id)} aria-haspopup="dialog">
              <span aria-hidden="true">{unlocked.has(x.id) ? x.icon : "🔒"}</span>
              <span>{x.name}</span>
              <span className="sr-only">{unlocked.has(x.id) ? "unlocked" : "locked"}</span>
            </button>
          </li>
        ))}
      </ul>
      {a && (
        <Sheet title={a.name} onClose={() => setOpen(null)}>
          <div className={`ach-detail${unlocked.has(a.id) ? " on" : ""}`}>
            <span className="ach-big" aria-hidden="true">
              {a.icon}
            </span>
            <span className={`tier-pill tier-${a.tier}`}>{TIER_NAME[a.tier]}</span>
            <p className="ach-how">{a.how}</p>
            <p className="ach-state">{unlocked.has(a.id) ? "✓ Unlocked" : "🔒 Not yet"}</p>
          </div>
        </Sheet>
      )}
    </section>
  );
}

/** Good behaviour: the last 7 days at a glance, and the clean-day streak. */
function CleanPanel({ logs, today }: { logs: ActivityLog[]; today: DayKey }) {
  const clean = new Map(logs.filter((l): l is Extract<ActivityLog, { kind: "clean" }> => l.kind === "clean").map((l) => [l.date, l]));
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const full = (d: DayKey) => {
    const l = clean.get(d);
    return !!l && cleanCount(l) === 3;
  };
  let streak = 0;
  for (let d = full(today) ? today : addDays(today, -1); full(d); d = addDays(d, -1)) streak++;
  const total = [...clean.values()].filter((l) => cleanCount(l) === 3).length;
  const [month, setMonth] = useState<string | null>(null);
  return (
    <>
      <section className="panel tap" onClick={() => setMonth(monthKey(today))}>
        <div className="panel-head">
          <h2 className="section-title">🧘 Clean days</h2>
          <span className="big-num">{total}</span>
        </div>
        <p>
          <strong>{plural(streak, "day")}</strong> <span className="muted">clean in a row</span>
        </p>
        <table className="clean-grid">
          <thead>
            <tr>
              <th />
              {days.map((d) => (
                <th key={d} scope="col">
                  {d === today
                    ? "Today"
                    : new Date(`${d}T12:00`).toLocaleDateString("en-US", {
                        weekday: "narrow",
                      })}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {CLEAN_ITEMS.map((c) => (
              <tr key={c.id}>
                <th scope="row">
                  <span aria-hidden="true">{c.icon}</span> {c.label}
                </th>
                {days.map((d) => {
                  const l = clean.get(d);
                  const st = !l ? "none" : l[c.id] ? "yes" : "no";
                  return (
                    <td key={d} className={`${st} c-${c.id}`} aria-label={`${d}: ${st === "none" ? "not logged" : st === "yes" ? "kept" : "missed"}`}>
                      <i />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <button
          className="text-btn left"
          onClick={(e) => {
            e.stopPropagation();
            setMonth(monthKey(today));
          }}
          aria-haspopup="dialog"
        >
          Month view ›
        </button>
      </section>
      {month && <CleanMonth clean={clean} today={today} month={month} setMonth={setMonth} />}
    </>
  );
}

/** A calendar per month: three coloured dots per day, filled when kept. */
function CleanMonth({ clean, today, month, setMonth }: { clean: Map<DayKey, Extract<ActivityLog, { kind: "clean" }>>; today: DayKey; month: string; setMonth: (m: string | null) => void }) {
  const first = [...clean.keys()].sort()[0];
  const min = first ? monthKey(first) : monthKey(today);
  const max = monthKey(today);
  const days = monthDays(month);
  const lead = dayIndexInWeek(days[0]);
  const inMonth = days.map((d) => clean.get(d)).filter((l): l is NonNullable<typeof l> => !!l);
  const kept = (id: (typeof CLEAN_ITEMS)[number]["id"]) => inMonth.filter((l) => l[id]).length;
  const fullDays = inMonth.filter((l) => cleanCount(l) === 3).length;
  return (
    <Sheet title="🧘 Clean days" onClose={() => setMonth(null)}>
      <div className="month-nav">
        <button className="icon-btn" onClick={() => setMonth(addMonths(month, -1))} disabled={month <= min} aria-label="Previous month">
          ‹
        </button>
        <strong>{formatMonth(month)}</strong>
        <button className="icon-btn" onClick={() => setMonth(addMonths(month, 1))} disabled={month >= max} aria-label="Next month">
          ›
        </button>
      </div>
      <ul className="clean-legend">
        {CLEAN_ITEMS.map((c) => (
          <li key={c.id}>
            <i className={`dot c-${c.id}`} /> {c.label} <span className="muted">· {kept(c.id)}×</span>
          </li>
        ))}
      </ul>
      <div className="cal" role="grid" aria-label={formatMonth(month)}>
        {["M", "T", "W", "T", "F", "S", "S"].map((w, i) => (
          <span key={i} className="cal-wd" aria-hidden="true">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`x${i}`} />
        ))}
        {days.map((d) => {
          const l = clean.get(d);
          const future = d > today;
          const label = !l ? "not logged" : CLEAN_ITEMS.map((c) => `${c.label} ${l[c.id] ? "kept" : "missed"}`).join(", ");
          return (
            <span
              key={d}
              className={`cal-day${d === today ? " today" : ""}${future ? " future" : ""}${l && cleanCount(l) === 3 ? " full" : ""}`}
              role="gridcell"
              aria-label={`${formatShort(d)}: ${future ? "upcoming" : label}`}
            >
              <span className="cal-n">{Number(d.slice(8))}</span>
              <span className="cal-dots" aria-hidden="true">
                {CLEAN_ITEMS.map((c) => (
                  <i key={c.id} className={`dot c-${c.id} ${!l ? "none" : l[c.id] ? "yes" : "no"}`} />
                ))}
              </span>
            </span>
          );
        })}
      </div>
      <p className="period-sum">
        <strong>{plural(fullDays, "clean day")}</strong> <span className="muted">this month · all three kept</span>
      </p>
    </Sheet>
  );
}
