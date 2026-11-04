import { useMemo, useState } from "react";
import { Bar } from "../components/Bar";
import { LogSheet, type LogKindUI } from "../components/LogSheets";
import { Sheet } from "../components/Sheet";
import { useStore } from "../data/StoreProvider";
import { MAX_LEVEL, RANKS, cleanCount, cookieJar, formatHours, journey, playerOf, playerXpToNext, spanishStreak, statsFor, validLogs, weekResult, type Cookie, type Player } from "../domain/rpg";
import { formatShort, weekDays, weekStart, type DayKey } from "../lib/date";

const fmt = (n: number) => n.toLocaleString("en-US");

export function HomeView({ today, goSettings }: { today: DayKey; goSettings: () => void }) {
  const { data } = useStore();
  const s = data.settings;
  const [open, setOpen] = useState<LogKindUI | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);
  const logs = useMemo(() => validLogs(data.logs), [data.logs]);
  const player = useMemo(() => playerOf(data, today), [data, today]);
  const streak = spanishStreak(logs, today, s.shieldEvery);
  const week = weekResult(logs, weekStart(today), s.targets);
  const todayStats = statsFor(logs, new Set([today]));
  const weekStats = statsFor(logs, new Set(weekDays(weekStart(today))));
  const spanishNext = journey(logs, "spanish").length + (streak.todayDone ? 0 : 1);
  const videoNext = journey(logs, "video").length + 1;

  const cleanToday = logs.find((l) => l.kind === "clean" && l.date === today);
  const cleanN = cleanToday && cleanToday.kind === "clean" ? cleanCount(cleanToday) : null;
  const quick: { kind: LogKindUI; icon: string; label: string; sub: string; done: boolean; wide?: boolean }[] = [
    { kind: "strength", icon: "🦾", label: "Strength", sub: todayStats.strength ? "✓ today" : `${weekStats.strength} / ${s.targets.strength} this week`, done: !!todayStats.strength },
    { kind: "swim", icon: "🏊", label: "Swim", sub: todayStats.swim ? "✓ today" : `${weekStats.swim} / ${s.targets.swim} this week`, done: !!todayStats.swim },
    { kind: "spanish", icon: "🇪🇸", label: "Spanish Day", sub: streak.todayDone ? `✓ Day ${spanishNext}` : `Day ${spanishNext} / 100`, done: streak.todayDone },
    { kind: "video", icon: "🎬", label: "Publish Video", sub: `Next: #${videoNext}`, done: false },
    { kind: "bogen", icon: "🚗", label: "Bögen", sub: todayStats.bogen ? `${todayStats.bogen} today` : `${weekStats.bogen} / ${s.targets.bogen} this week`, done: false },
    { kind: "focus", icon: "🧠", label: "Focus Hours", sub: todayStats.focusMin ? `${formatHours(todayStats.focusMin)} today` : `${formatHours(weekStats.focusMin)} this week`, done: false },
    { kind: "clean", icon: "🧘", label: "Clean Day", sub: cleanN === null ? `Social media · gooning · sleep · ${weekStats.clean} / ${s.targets.clean} this week` : `${cleanN === 3 ? "✓ " : ""}${cleanN} / 3 kept today · tap to change`, done: cleanN === 3, wide: true },
  ];

  return (
    <div className="view">
      <button className="player tap" onClick={() => setPlayerOpen(true)} aria-haspopup="dialog" aria-label={`Level ${player.level} ${player.rank}. Show what comes next`}>
        <span className="player-top">
          <span className="level">LEVEL {player.level}</span>
          <span className="muted small">Next ›</span>
        </span>
        <span className="rank">{player.rank}</span>
        <Bar value={player.progress} label={`Level ${player.level}: ${player.into} of ${player.need} XP`} />
        <span className="xp-line">
          <span>
            {fmt(player.into)} / {fmt(player.need)} XP
          </span>
          <span className="muted">{fmt(player.xp)} total</span>
        </span>
      </button>

      <section aria-label="Quick log">
        <h2 className="section-title">Quick log</h2>
        <ul className="quick">
          {quick.map((q) => (
            <li key={q.kind} className={q.wide ? "wide" : undefined}>
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

      {s.vision ? (
        <p className="vision">“{s.vision}”</p>
      ) : (
        <button className="text-btn left" onClick={goSettings}>
          Write down your vision ›
        </button>
      )}

      <CookieCard today={today} />

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

      {open && <LogSheet kind={open} today={today} onClose={() => setOpen(null)} />}
      {playerOpen && <PlayerSheet player={player} onClose={() => setPlayerOpen(false)} />}
    </div>
  );
}

/** XP still needed to get from the current state to `level`. */
function xpToLevel(p: Player, level: number) {
  let need = p.need - p.into;
  for (let l = p.level + 1; l < level; l++) need += playerXpToNext(l);
  return need;
}

function PlayerSheet({ player, onClose }: { player: Player; onClose: () => void }) {
  const nextRank = RANKS.find((r) => r.from > player.level);
  return (
    <Sheet title={`Level ${player.level} · ${player.rank}`} onClose={onClose}>
      {player.level < MAX_LEVEL && (
        <div className="mini-stats two">
          <div>
            <strong>{fmt(player.need - player.into)} XP</strong>
            <span>to level {player.level + 1}</span>
          </div>
          {nextRank && (
            <div>
              <strong>{fmt(xpToLevel(player, nextRank.from))} XP</strong>
              <span>
                to {nextRank.name} (Lv {nextRank.from})
              </span>
            </div>
          )}
        </div>
      )}
      <ol className="ranks">
        {RANKS.map((r, i) => {
          const to = RANKS[i + 1] ? RANKS[i + 1].from - 1 : MAX_LEVEL;
          const state = player.level >= r.from && player.level <= to ? "current" : player.level > to ? "past" : "future";
          return (
            <li key={r.name} className={state} aria-current={state === "current" ? "step" : undefined}>
              <span>
                {state === "past" ? "✓ " : ""}
                {r.name}
              </span>
              <span className="small">{r.from === to ? `Lv ${r.from}` : `Lv ${r.from}–${to}`}</span>
            </li>
          );
        })}
      </ol>
      <p className="muted small">{fmt(player.xp)} XP total. Every real action counts, nothing is ever taken away.</p>
    </Sheet>
  );
}

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** One thing you already did, every time you open the app. Tap it to see the whole jar. */
function CookieCard({ today }: { today: DayKey }) {
  const { data } = useStore();
  const jar = useMemo(() => cookieJar(data, today), [data, today]);
  const [pick, setPick] = useState(() => Math.random());
  const [all, setAll] = useState<Cookie[] | null>(null);
  const idx = jar.length ? Math.floor(pick * jar.length) % jar.length : -1;
  const c = idx >= 0 ? jar[idx] : null;

  const another = () => {
    if (jar.length < 2) return;
    let n = Math.random();
    while (Math.floor(n * jar.length) === idx) n = Math.random();
    setPick(n);
  };
  const openJar = () => setAll(shuffle(jar));

  return (
    <>
      {c ? (
        <section className="cookie" aria-label="Cookie jar">
          <button className="cookie-body" key={c.key} onClick={openJar} aria-haspopup="dialog" aria-live="polite">
            <span className="cookie-tag">
              <span>
                {c.tag}
                {c.date && <span className="muted"> · {formatShort(c.date)}</span>}
              </span>
              <span className="muted" aria-label={`${jar.length} in the jar, show all`}>
                🍪 {jar.length} ›
              </span>
            </span>
            <span className="cookie-text">{c.text}</span>
          </button>
          {jar.length > 1 && (
            <button className="secondary small-btn" onClick={another}>
              Another one ↻
            </button>
          )}
        </section>
      ) : (
        <section className="cookie empty" aria-label="Cookie jar">
          <p className="cookie-tag">🍪 Cookie jar</p>
          <p>Your wins land here. Start with one you already earned, like the scholarship.</p>
          <button className="text-btn left" onClick={openJar}>
            Add a win ›
          </button>
        </section>
      )}
      {all && <JarSheet items={all} today={today} onClose={() => setAll(null)} />}
    </>
  );
}

function JarSheet({ items, today, onClose }: { items: Cookie[]; today: DayKey; onClose: () => void }) {
  const { update } = useStore();
  const [win, setWin] = useState("");
  const [added, setAdded] = useState<Cookie[]>([]);
  const shown = [...added, ...items];
  return (
    <Sheet
      title={
        <>
          Cookie jar 🍪 <span className="of">{shown.length}</span>
        </>
      }
      onClose={onClose}
    >
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          const text = win.trim();
          if (!text) return;
          update((d) => ({ ...d, wins: [...d.wins, { date: today, text }] }));
          setAdded((a) => [{ key: `new-${a.length}`, date: today, tag: "🍪 Your win", text }, ...a]);
          setWin("");
        }}
      >
        <input className="text-input" value={win} onChange={(e) => setWin(e.target.value)} placeholder="Add a win, e.g. Got the scholarship" aria-label="Add a win" maxLength={120} />
        <button className="secondary" type="submit">
          Add
        </button>
      </form>
      <ul className="jar">
        {shown.map((x) => (
          <li key={x.key}>
            <span className="cookie-tag">
              <span>
                {x.tag}
                {x.date && <span className="muted"> · {formatShort(x.date)}</span>}
              </span>
            </span>
            <span className="jar-text">{x.text}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
