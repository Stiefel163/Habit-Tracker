import { useMemo, useState } from "react";
import { Bar } from "../components/Bar";
import { LogSheet, type LogKindUI } from "../components/LogSheets";
import { useStore } from "../data/StoreProvider";
import { formatHours, journey, playerOf, spanishStreak, statsFor, validLogs, weekResult } from "../domain/rpg";
import { weekDays, weekStart, type DayKey } from "../lib/date";

export function HomeView({ today, goSettings }: { today: DayKey; goSettings: () => void }) {
  const { data } = useStore();
  const s = data.settings;
  const [open, setOpen] = useState<LogKindUI | null>(null);
  const logs = useMemo(() => validLogs(data.logs), [data.logs]);
  const player = useMemo(() => playerOf(data, today), [data, today]);
  const streak = spanishStreak(logs, today, s.shieldEvery);
  const week = weekResult(logs, weekStart(today), s.targets);
  const todayStats = statsFor(logs, new Set([today]));
  const weekStats = statsFor(logs, new Set(weekDays(weekStart(today))));
  const spanishNext = journey(logs, "spanish").length + (streak.todayDone ? 0 : 1);
  const videoNext = journey(logs, "video").length + 1;

  const quick: { kind: LogKindUI; icon: string; label: string; sub: string; done: boolean }[] = [
    { kind: "strength", icon: "🦾", label: "Strength", sub: todayStats.strength ? "✓ today" : `${weekStats.strength} / ${s.targets.strength} this week`, done: !!todayStats.strength },
    { kind: "swim", icon: "🏊", label: "Swim", sub: todayStats.swim ? "✓ today" : `${weekStats.swim} / ${s.targets.swim} this week`, done: !!todayStats.swim },
    { kind: "spanish", icon: "🇪🇸", label: "Spanish Day", sub: streak.todayDone ? `✓ Day ${spanishNext}` : `Day ${spanishNext} / 100`, done: streak.todayDone },
    { kind: "video", icon: "🎬", label: "Publish Video", sub: `Next: #${videoNext}`, done: false },
    { kind: "bogen", icon: "🚗", label: "Bögen", sub: todayStats.bogen ? `${todayStats.bogen} today` : `${weekStats.bogen} / ${s.targets.bogen} this week`, done: false },
    { kind: "focus", icon: "🧠", label: "Focus Hours", sub: todayStats.focusMin ? `${formatHours(todayStats.focusMin)} today` : `${formatHours(weekStats.focusMin)} this week`, done: false },
  ];

  return (
    <div className="view">
      <section className="player" aria-label="Your character">
        <p className="level">LEVEL {player.level}</p>
        <h1 className="rank">{player.rank}</h1>
        <Bar value={player.progress} label={`Level ${player.level}: ${player.into} of ${player.need} XP`} />
        <p className="xp-line">
          <span>
            {player.into.toLocaleString("en-US")} / {player.need.toLocaleString("en-US")} XP
          </span>
          <span className="muted">{player.xp.toLocaleString("en-US")} total</span>
        </p>
        {s.vision ? (
          <p className="vision">“{s.vision}”</p>
        ) : (
          <button className="text-btn left" onClick={goSettings}>
            Write down your vision ›
          </button>
        )}
      </section>

      <section className={`streak${streak.current ? " lit" : ""}`} aria-label="Spanish streak">
        <span className="flame" aria-hidden="true">
          🔥
        </span>
        <div className="streak-main">
          <p className="streak-num">
            {streak.current} <span>{streak.current === 1 ? "day" : "days"}</span>
          </p>
          <p className="muted small">🇪🇸 Spanish streak · best {streak.best}</p>
        </div>
        <div className={`shield${streak.shield ? " on" : ""}`}>
          <span aria-hidden="true">🛡</span>
          <span className="small">{streak.shield ? "Shield ready" : `Back in ${streak.toRecharge}`}</span>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2 className="section-title">Weekly missions</h2>
          <span className="stars" aria-label={`${week.stars} of ${week.missions.length} stars`}>
            ⭐ {week.stars} / {week.missions.length}
            {week.rating && <strong> · {week.rating}</strong>}
          </span>
        </div>
        <ul className="missions">
          {week.missions.map((m) => (
            <li key={m.id} className={m.complete ? "complete" : ""}>
              <span className="m-label">
                <span aria-hidden="true">{m.icon}</span> {m.label}
              </span>
              <Bar value={m.value / m.target} label={`${m.label}: ${m.value} of ${m.target} ${m.unit}`} thin />
              <span className="m-num">
                {m.complete ? "⭐" : ""} {m.value} / {m.target}
                {m.unit === "h" ? " h" : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label="Quick log">
        <h2 className="section-title">Quick log</h2>
        <ul className="quick">
          {quick.map((q) => (
            <li key={q.kind}>
              <button className={`quick-btn${q.done ? " done" : ""}`} onClick={() => setOpen(q.kind)} aria-haspopup="dialog">
                <span className="q-icon" aria-hidden="true">
                  {q.icon}
                </span>
                <span className="q-label">+ {q.label}</span>
                <span className="q-sub">{q.sub}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2 className="section-title">Skills</h2>
        <ul className="skills">
          {player.skills.map((k) => (
            <li key={k.id}>
              <span className="sk-name">
                <span aria-hidden="true">{k.icon}</span> {k.name}
              </span>
              <span className="sk-lv">Lv {k.level}</span>
              <Bar value={k.progress} label={`${k.name} level ${k.level}: ${k.into} of ${k.need} XP`} thin />
            </li>
          ))}
        </ul>
      </section>

      {open && <LogSheet kind={open} today={today} onClose={() => setOpen(null)} />}
    </div>
  );
}
