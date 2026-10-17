import { useEffect, useMemo, useState } from "react";
import { useStore } from "../data/StoreProvider";
import { RESET_DAYS, URGE_ACTIONS, computeStreak, cookies, eraOf, fuelFor, resetState, urgesBeaten, votes, type StreakMark } from "../domain/lockin";
import { dayProgress } from "../domain/progress";
import type { Review } from "../domain/types";
import { addDays, dayIndexInWeek, fromKey, weekDays, weekStart, weekdayShort, type DayKey } from "../lib/date";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";

const MARK_ICON: Record<StreakMark, string> = { met: "🔥", frozen: "❄️", missed: "·", pending: "○", none: "" };
const MARK_LABEL: Record<StreakMark, string> = { met: "streak day", frozen: "freeze used", missed: "missed", pending: "not yet", none: "" };

/** Identity, fuel, streak, era. The "why" and the "keep going" in one card. */
export function StreakCard({ date, today, setDate }: { date: DayKey; today: DayKey; setDate: (d: DayKey) => void }) {
  const { data } = useStore();
  const s = data.settings;
  const streak = useMemo(() => computeStreak(data, today), [data, today]);
  const { era, next, toNext } = eraOf(votes(data));
  const need = Math.max(0, s.dailyGoal - dayProgress(data.days[today], s).done);

  return (
    <section className="streak-card">
      <p className="identity">{s.identity}</p>
      {s.fuel.length > 0 && <p className="fuel">“{fuelFor(s.fuel, today)}”</p>}
      <div className="streak-top">
        <p className="flame" aria-label={`${streak.days} day streak`}>
          <span aria-hidden="true">🔥</span>
          <span className="flame-num">{streak.days}</span>
          <span className="muted">day streak</span>
        </p>
        <p className="freezes" aria-label={`${streak.freezes} streak freezes saved`}>
          <span aria-hidden="true">❄️</span> {streak.freezes}
        </p>
      </div>
      <ol className="streak-week" aria-label="This week">
        {weekDays(weekStart(today)).map((d) => {
          const m: StreakMark = d > today ? "none" : streak.marks[d] ?? "none";
          return (
            <li key={d}>
              <button
                className={`sw ${m}${d === date ? " sel" : ""}`}
                disabled={d > today}
                onClick={() => setDate(d)}
                aria-label={`${weekdayShort(d)} ${fromKey(d).getDate()}: ${MARK_LABEL[m] || "upcoming"}`}
                aria-current={d === date ? "date" : undefined}
              >
                <span className="sw-day">{weekdayShort(d).slice(0, 2)}</span>
                <span className="sw-mark" aria-hidden="true">
                  {MARK_ICON[m]}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="muted small">
        {streak.todayMet ? "Today counts. Streak extended." : `${need} more ${need === 1 ? "check" : "checks"} today keeps the streak alive.`}
        {" "}Every 7 days earns a ❄️ that saves one missed day.
      </p>
      <p className="era">
        <span className="muted small">Era</span> <strong>{era.name}</strong>
        {next && <span className="muted small"> · {toNext} votes to {next.name}</span>}
      </p>
    </section>
  );
}

/** The 30-day reset plus the button for the moment it matters. */
export function ResetCard({ today, onUrge, onSetup }: { today: DayKey; onUrge: () => void; onSetup: () => void }) {
  const { data, updateSettings } = useStore();
  const r = resetState(data, today);
  const beaten = urgesBeaten(data);
  const setupDone = SETUP.filter((x) => data.settings.setup[x.id]).length;

  return (
    <section className="reset-card">
      {!r.started ? (
        <>
          <h2 className="section-title">30-day reset</h2>
          <p>No Reels, TikTok or Shorts feed for 30 days. Posting, DMs and the camera are fine.</p>
          <button className="secondary" onClick={() => updateSettings((s) => ({ ...s, resetStart: today }))}>
            Start the reset today
          </button>
        </>
      ) : (
        <>
          <div className="reset-top">
            <h2 className="section-title">{r.finished ? "Reset complete" : `Reset · day ${r.day} of ${RESET_DAYS}`}</h2>
            <span className="reset-num">
              {r.clean}/{RESET_DAYS}
            </span>
          </div>
          <div
            className="bar"
            role="progressbar"
            aria-label={`${r.clean} reel-free days of ${RESET_DAYS}`}
            aria-valuemin={0}
            aria-valuemax={RESET_DAYS}
            aria-valuenow={r.clean}
          >
            <i style={{ width: `${(r.clean / RESET_DAYS) * 100}%` }} />
          </div>
          <p className="muted small">
            {r.finished ? "30 days done. Decide your rules from here, on purpose." : "Reel-free days count. A slip doesn't reset you to zero."}
          </p>
        </>
      )}
      <button className="urge-btn" onClick={onUrge}>
        I feel the urge to scroll
      </button>
      <div className="reset-foot">
        <span className="muted small">
          {beaten} {beaten === 1 ? "urge" : "urges"} beaten
        </span>
        <button className="text-btn" onClick={onSetup}>
          Phone setup {setupDone}/{SETUP.length}
        </button>
      </div>
    </section>
  );
}

/** Urge → something good. The urge becomes a rep instead of a scroll. */
export function UrgeSheet({ date, onClose }: { date: DayKey; onClose: () => void }) {
  const { data, setHabit, update } = useStore();
  const toast = useToast();
  const [action, setAction] = useState<(typeof URGE_ACTIONS)[number] | null>(null);
  const [started, setStarted] = useState(0);
  const [now, setNow] = useState(Date.now());
  const jar = useMemo(() => cookies(data, date), [data, date]);
  const [cookie] = useState(() => (jar.length ? jar[Math.floor(Math.random() * jar.length)] : ""));

  useEffect(() => {
    if (!action?.minutes) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [action]);

  const finish = (id: string, sheet?: "pass" | "fail") => {
    const log = data.days[date];
    if (id === "study") setHabit(date, "study", [...(log?.study ?? []), "15"]);
    if (id === "spanish") setHabit(date, "spanish", ["done"]);
    if (id === "bogen" && sheet) setHabit(date, "driving", [...(log?.driving ?? []).filter((x) => x === "pass" || x === "fail"), sheet]);
    update((d) => ({ ...d, urges: { ...d.urges, [date]: [...(d.urges[date] ?? []), id] } }));
    onClose();
    toast(`Urge beaten #${urgesBeaten(data) + 1}. Stay hard. 🔥`);
  };

  const left = action?.minutes ? Math.max(0, action.minutes * 60 - Math.floor((now - started) / 1000)) : 0;

  return (
    <Sheet title={action ? `${action.icon} ${action.label}` : "Urge noticed. Good."} onClose={onClose} closeLabel="Close">
      {!action ? (
        <>
          <p className="urge-line">When your mind says you need the feed, you're only at 40%. Turn this urge into a rep.</p>
          {cookie ? (
            <p className="cookie">
              <span aria-hidden="true">🍪</span> {cookie}
            </p>
          ) : (
            <p className="cookie">
              <span aria-hidden="true">🍪</span> Your cookie jar is empty. This urge can be the first cookie.
            </p>
          )}
          <ul className="urge-actions">
            {URGE_ACTIONS.map((a) => (
              <li key={a.id}>
                <button
                  className="urge-action"
                  onClick={() => {
                    setAction(a);
                    setStarted(Date.now());
                    setNow(Date.now());
                  }}
                >
                  <span aria-hidden="true">{a.icon}</span>
                  {a.label}
                </button>
              </li>
            ))}
          </ul>
          <button className="text-btn" onClick={() => finish("passed")}>
            It already passed
          </button>
        </>
      ) : (
        <>
          {action.minutes > 0 && (
            <p className="timer" role="timer" aria-live="off">
              {String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}
            </p>
          )}
          <p className="urge-line">{action.minutes ? (left ? "Go. Phone face down. Come back when the time is up." : "Time's up. Is the urge gone?") : "Go do it now. Come back and tap below."}</p>
          {action.id === "bogen" ? (
            <div className="sheet-btns">
              <button className="result pass" onClick={() => finish("bogen", "pass")}>
                <span aria-hidden="true">✓</span> Passed
              </button>
              <button className="result fail" onClick={() => finish("bogen", "fail")}>
                <span aria-hidden="true">✗</span> Not passed
              </button>
            </div>
          ) : (
            <button className="urge-btn" onClick={() => finish(action.id)}>
              Done: urge beaten
            </button>
          )}
          <button className="text-btn" onClick={() => setAction(null)}>
            Pick something else
          </button>
        </>
      )}
    </Sheet>
  );
}

/** One-time phone setup. Environment beats willpower. */
export const SETUP = [
  {
    id: "charger",
    title: "Phone sleeps outside the bedroom",
    how: "Charge it in the kitchen or hallway. A cheap alarm clock wakes you instead.",
  },
  {
    id: "tiktok",
    title: "TikTok off the phone",
    how: "Delete the app. Not on the laptop either: the laptop is for work.",
  },
  {
    id: "insta",
    title: "Instagram only for posting and DMs",
    how: "Install the free app “one sec” and add Instagram. It shows a short pause with a way out before the app opens. In a 6-week study, people cancelled about 1 in 3 openings and tried to open the app 37% less often.",
  },
  {
    id: "gray",
    title: "Grayscale that doesn't get in your way",
    how: "iPhone: Settings → Accessibility → Accessibility Shortcut → Color Filters. Now a triple-click on the side button switches gray on and off. Bonus: Shortcuts → Automation → App “Camera” is opened → Set Color Filters off; is closed → on. Android: add the Bedtime mode or grayscale tile to Quick Settings.",
  },
  {
    id: "redirect",
    title: "Instagram opens Comeback first",
    how: "iPhone Shortcuts → Automation → App “Instagram” is opened → Open URL: your Comeback link with #urge at the end. You land on the urge screen and decide on purpose.",
  },
  {
    id: "focus",
    title: "Focus mode for study blocks",
    how: "Create a “Study” Focus that silences everything except family. Turn it on with every block.",
  },
  {
    id: "offline",
    title: "One offline adventure a week",
    how: "Like the national park: plan one outing a week with the phone in airplane mode. Busy and outside, you don't miss the feed.",
  },
];

export function SetupSheet({ onClose }: { onClose: () => void }) {
  const { data, updateSettings } = useStore();
  const toggle = (id: string) => updateSettings((s) => ({ ...s, setup: { ...s.setup, [id]: !s.setup[id] } }));
  return (
    <Sheet title="Phone setup" onClose={onClose}>
      <p className="muted small">Set up once, so you need willpower less often. Tap a step when it's done.</p>
      <ul className="setup">
        {SETUP.map((x) => {
          const on = !!data.settings.setup[x.id];
          return (
            <li key={x.id}>
              <button className={`setup-item${on ? " on" : ""}`} aria-pressed={on} onClick={() => toggle(x.id)}>
                <span className="check" aria-hidden="true">
                  {on ? "✓" : ""}
                </span>
                <span>
                  <strong>{x.title}</strong>
                  <span className="muted small">{x.how}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

/** Which week a review belongs to: the weekend reviews this week, Monday reviews last week. */
export function reviewWeek(date: DayKey): DayKey {
  return dayIndexInWeek(date) === 0 ? addDays(weekStart(date), -7) : weekStart(date);
}

/** Goggins' accountability mirror, shown Saturday to Monday until done. */
export function MirrorCard({ today }: { today: DayKey }) {
  const { data, update } = useStore();
  const key = reviewWeek(today);
  const due = [0, 5, 6].includes(dayIndexInWeek(today)) && !data.reviews[key];
  const [r, setR] = useState<Review>({ good: "", trigger: "", change: "" });
  const last = Object.keys(data.reviews)
    .sort()
    .filter((k) => k >= addDays(weekStart(today), -7))
    .pop();

  if (!due) {
    return last && data.reviews[last].change ? (
      <p className="this-week">
        <span className="muted small">This week's change</span> {data.reviews[last].change}
      </p>
    ) : null;
  }
  const field = (k: keyof Review, label: string, ph: string) => (
    <label className="mirror-field">
      <span>{label}</span>
      <input className="text-input" value={r[k]} onChange={(e) => setR({ ...r, [k]: e.target.value })} placeholder={ph} maxLength={120} />
    </label>
  );
  return (
    <section className="panel mirror">
      <h2 className="section-title">Accountability mirror · 2 min</h2>
      {field("good", "What went well this week?", "Passed 6 Bögen")}
      {field("trigger", "What pulled you off track?", "Scrolling in bed after 23:00")}
      {field("change", "One change for next week", "Phone in the kitchen at 22:30")}
      <button className="primary" disabled={!r.change.trim()} onClick={() => update((d) => ({ ...d, reviews: { ...d.reviews, [key]: r } }))}>
        Save
      </button>
    </section>
  );
}
