import { useMemo, useState } from "react";
import { Bar } from "../components/Bar";
import { useStore } from "../data/StoreProvider";
import {
  ACHIEVEMENTS,
  RANKS,
  VIDEO_MILESTONES,
  focusStats,
  formatHours,
  journey,
  masteryOf,
  playerOf,
  spanishStreak,
  totals,
  unlockedAchievements,
  validLogs,
  weekHistory,
} from "../domain/rpg";
import { addDays, formatShort, weekDays, type DayKey } from "../lib/date";

const plural = (n: number, word: string) => `${n} ${n === 1 ? word : word + "s"}`;

export function ProgressView({ today }: { today: DayKey }) {
  const { data, update } = useStore();
  const s = data.settings;
  const logs = useMemo(() => validLogs(data.logs), [data.logs]);
  const player = useMemo(() => playerOf(data, today), [data, today]);
  const t = totals(logs);
  const streak = spanishStreak(logs, today, s.shieldEvery);
  const spanish = journey(logs, "spanish");
  const videos = journey(logs, "video");
  const focus = focusStats(logs, today);
  const weeks = weekHistory(logs, today, s.targets).slice(0, 8);
  const unlocked = unlockedAchievements(t);
  const recent = (kind: string) => {
    const since = new Set(Array.from({ length: 28 }, (_, i) => addDays(today, -i)));
    return logs.filter((l) => l.kind === kind && since.has(l.date)).length;
  };
  const [openJourney, setOpenJourney] = useState<"spanish" | "video" | null>(null);
  const [allRanks, setAllRanks] = useState(false);
  const rankIdx = RANKS.reduce((a, r, i) => (player.level >= r.from ? i : a), 0);
  const shownRanks = allRanks ? RANKS.map((_, i) => i) : [...new Set([rankIdx, Math.min(rankIdx + 1, RANKS.length - 1), RANKS.length - 1])];
  // Unlocked achievements, plus the next one to chase in each skill.
  const nextPerMetric = new Set<string>();
  for (const a of ACHIEVEMENTS) if (!unlocked.has(a.id) && ![...nextPerMetric].some((id) => ACHIEVEMENTS.find((x) => x.id === id)!.metric === a.metric)) nextPerMetric.add(a.id);
  const shownAchievements = ACHIEVEMENTS.filter((a) => unlocked.has(a.id) || nextPerMetric.has(a.id));
  const [win, setWin] = useState("");
  const jar = [
    ...spanish.filter((x) => x.log.better).map((x) => ({ date: x.log.date, text: x.log.better, tag: `🇪🇸 Day ${x.n}` })),
    ...videos.filter((x) => x.log.better).map((x) => ({ date: x.log.date, text: x.log.better, tag: `🎬 Video #${x.n}` })),
    ...data.wins.map((w) => ({ date: w.date, text: w.text, tag: "🍪 Win" })),
  ].sort((a, b) => b.date.localeCompare(a.date));

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
        <div className="panel-head">
          <h2 className="section-title">Level {player.level} · {player.rank}</h2>
          <span className="muted small">{player.xp.toLocaleString("en-US")} XP</span>
        </div>
        <Bar value={player.progress} label={`Level progress ${Math.round(player.progress * 100)}%`} />
        <ol className="ranks">
          {shownRanks.map((i) => {
            const r = RANKS[i];
            const to = RANKS[i + 1] ? RANKS[i + 1].from - 1 : 100;
            const state = player.level >= r.from && player.level <= to ? "current" : player.level > to ? "past" : "future";
            return (
              <li key={r.name} className={state} aria-current={state === "current" ? "step" : undefined}>
                <span>{r.name}</span>
                <span className="muted small">{r.from === to ? `Lv ${r.from}` : `Lv ${r.from}–${to}`}</span>
              </li>
            );
          })}
        </ol>
        <button className="text-btn left" onClick={() => setAllRanks(!allRanks)} aria-expanded={allRanks}>
          {allRanks ? "Show less" : "See all 11 ranks"}
        </button>
      </section>

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

      <section className="panel">
        <div className="panel-head">
          <h2 className="section-title">🇪🇸 100 Days of Spanish</h2>
          <span className="big-num">{t.spanish} / 100</span>
        </div>
        <Bar value={t.spanish / 100} label={`${t.spanish} of 100 Spanish days`} />
        <p className="muted small">
          Current streak {streak.current} · best {streak.best} · 🛡 {streak.shield ? "ready" : `back in ${streak.toRecharge} days`}
        </p>
        {spanish.length > 0 && (
          <button className="text-btn left" onClick={() => setOpenJourney(openJourney === "spanish" ? null : "spanish")} aria-expanded={openJourney === "spanish"}>
            {openJourney === "spanish" ? "Hide" : "See"} what got better, day by day
          </button>
        )}
        {openJourney === "spanish" && (
          <ol className="journey">
            {spanish.map((x) => (
              <li key={x.log.id}>
                <span className="j-n">Day {x.n}</span>
                <span>{x.log.better || <em className="muted">no note</em>}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="section-title">🎬 Road to 100 Videos</h2>
          <span className="big-num">{t.videos} / 100</span>
        </div>
        <div className="road" aria-hidden="true">
          <i style={{ width: `${Math.min(100, t.videos)}%` }} />
          {VIDEO_MILESTONES.map((m) => (
            <b key={m} className={t.videos >= m ? "hit" : ""} style={{ left: `${m}%` }} title={`${m}`} />
          ))}
        </div>
        <p className="muted small">Milestones at {VIDEO_MILESTONES.join(", ")}</p>
        {videos.length > 0 && (
          <button className="text-btn left" onClick={() => setOpenJourney(openJourney === "video" ? null : "video")} aria-expanded={openJourney === "video"}>
            {openJourney === "video" ? "Hide" : "See"} your creator evolution
          </button>
        )}
        {openJourney === "video" && (
          <ol className="journey">
            {videos.map((x) => (
              <li key={x.log.id}>
                <span className="j-n">#{x.n}</span>
                <span>{x.log.better || <em className="muted">no note</em>}</span>
              </li>
            ))}
          </ol>
        )}
      </section>

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
                    <span className="muted small">{m.reached ? m.reached.label : "Just getting started"} · next: {m.next.label}</span>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      <section className="panel">
        <h2 className="section-title">Weeks</h2>
        <ul className="weeks">
          {weeks.map((w) => (
            <li key={w.start}>
              <span>
                {formatShort(w.start)} – {formatShort(weekDays(w.start)[6])}
              </span>
              <span className="stars-line" aria-label={`${w.stars} of ${w.missions.length} stars`}>
                {"⭐".repeat(w.stars)}
                <span className="dim">{"☆".repeat(Math.max(0, w.missions.length - w.stars))}</span>
              </span>
              <span className="w-rating">{w.rating ?? ""}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="section-title">Achievements</h2>
          <span className="muted small">
            {unlocked.size} / {ACHIEVEMENTS.length}
          </span>
        </div>
        <ul className="achievements">
          {shownAchievements.map((a) => (
            <li key={a.id} className={unlocked.has(a.id) ? "on" : ""}>
              <span aria-hidden="true">{a.icon}</span>
              <span>{a.label}</span>
              <span className="sr-only">{unlocked.has(a.id) ? "unlocked" : "locked"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="section-title">Cookie jar 🍪</h2>
        <p className="muted small">What got better, and the wins you've already earned. Read it when it gets hard.</p>
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            const text = win.trim();
            if (!text) return;
            update((d) => ({ ...d, wins: [...d.wins, { date: today, text }] }));
            setWin("");
          }}
        >
          <input className="text-input" value={win} onChange={(e) => setWin(e.target.value)} placeholder="e.g. Got the scholarship" aria-label="Add a win" maxLength={120} />
          <button className="secondary" type="submit">
            Add
          </button>
        </form>
        {jar.length > 0 && (
          <ul className="jar">
            {jar.slice(0, 40).map((c, i) => (
              <li key={i}>
                <span className="muted small">{c.tag}</span>
                <span>{c.text}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
