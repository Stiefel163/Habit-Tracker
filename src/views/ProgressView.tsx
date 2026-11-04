import { useMemo, useState } from "react";
import { Bar } from "../components/Bar";
import { Sheet } from "../components/Sheet";
import { useStore } from "../data/StoreProvider";
import {
  ACHIEVEMENTS,
  VIDEO_MILESTONES,
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
} from "../domain/rpg";
import { addDays, formatLong, formatShort, weekDays, type DayKey } from "../lib/date";

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
  const weeks = weekHistory(logs, today, s.targets).slice(0, 8);
  const unlocked = unlockedAchievements(t);
  const recent = (kind: string) => {
    const since = new Set(Array.from({ length: 28 }, (_, i) => addDays(today, -i)));
    return logs.filter((l) => l.kind === kind && since.has(l.date)).length;
  };
  const [openJourney, setOpenJourney] = useState<"spanish" | "video" | null>(null);
  // Unlocked achievements, plus the next one to chase in each skill.
  const nextPerMetric = new Set<string>();
  for (const a of ACHIEVEMENTS) if (!unlocked.has(a.id) && ![...nextPerMetric].some((id) => ACHIEVEMENTS.find((x) => x.id === id)!.metric === a.metric)) nextPerMetric.add(a.id);
  const shownAchievements = ACHIEVEMENTS.filter((a) => unlocked.has(a.id) || nextPerMetric.has(a.id));

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

      {openJourney === "spanish" && (
        <Sheet title={<>🇪🇸 Spanish log <span className="of">{spanish.length} / 100</span></>} onClose={() => setOpenJourney(null)}>
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
        <Sheet title={<>🎬 Your videos <span className="of">{videos.length} / 100</span></>} onClose={() => setOpenJourney(null)}>
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
