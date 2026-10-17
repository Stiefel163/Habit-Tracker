import { useMemo, useState } from "react";
import { MirrorCard, ResetCard, SetupSheet, StreakCard } from "../components/LockIn";
import { useStore } from "../data/StoreProvider";
import { cookies } from "../domain/lockin";
import type { DayKey } from "../lib/date";

export function LockInView({ today, openDay, onUrge }: { today: DayKey; openDay: (d: DayKey) => void; onUrge: () => void }) {
  const [setup, setSetup] = useState(false);
  return (
    <div className="view">
      <header className="head">
        <div>
          <h1>Lock in</h1>
          <p className="muted">Stay on track, beat the urge, don't miss twice.</p>
        </div>
      </header>
      <StreakCard date={today} today={today} setDate={openDay} />
      <ResetCard today={today} onUrge={onUrge} onSetup={() => setSetup(true)} />
      <MirrorCard today={today} />
      <CookieJar today={today} />
      {setup && <SetupSheet onClose={() => setSetup(false)} />}
    </div>
  );
}

/** Goggins' cookie jar: proof you've done hard things, for the days you doubt it. */
function CookieJar({ today }: { today: DayKey }) {
  const { data, update } = useStore();
  const jar = useMemo(() => cookies(data, today), [data, today]);
  const [text, setText] = useState("");
  return (
    <section className="panel">
      <h2 className="section-title">Cookie jar 🍪</h2>
      {jar.length ? (
        <ul className="cookies">
          {jar.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      ) : (
        <p className="muted small">Wins land here automatically. Add your own, too: hard things you got through.</p>
      )}
      <form
        className="add-row"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (!t) return;
          update((d) => ({ ...d, wins: [...d.wins, { date: today, text: t }] }));
          setText("");
        }}
      >
        <input className="text-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g. Hiked 20 km in Banff" aria-label="Add a win" maxLength={100} />
        <button className="secondary" type="submit">
          Add
        </button>
      </form>
    </section>
  );
}
