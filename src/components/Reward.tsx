import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useStore, type NewLog } from "../data/StoreProvider";
import { XP, diff, snapshot, weekResult, type RewardEvent } from "../domain/rpg";
import { appToday, weekStart } from "../lib/date";

interface Reward {
  title: string;
  sub?: string;
  events: RewardEvent[];
  undo: () => void;
  /** Runs when the overlay closes without Undo. */
  done?: () => void;
}

type RewardedLog = (l: NewLog, title: string, sub?: string, opts?: { replaces?: string }) => void;

const Ctx = createContext<RewardedLog>(() => {});

let audio: AudioContext | null = null;
/** A short, quiet two-note chime; three notes for bigger moments. */
function chime(big: boolean) {
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audio ??= new AC();
    const notes = big ? [659.25, 880, 1174.66] : [659.25, 987.77];
    notes.forEach((f, i) => {
      const o = audio!.createOscillator();
      const g = audio!.createGain();
      o.type = "sine";
      o.frequency.value = f;
      const t = audio!.currentTime + i * 0.09;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.05, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
      o.connect(g).connect(audio!.destination);
      o.start(t);
      o.stop(t + 0.4);
    });
  } catch {
    // No audio here. The visual reward is enough.
  }
}

/** Wraps logging: save the action, compare before/after, and show what it earned. */
export function RewardProvider({ children }: { children: ReactNode }) {
  const { addLog, removeLog } = useStore();
  const [reward, setReward] = useState<Reward | null>(null);

  const log = useCallback(
    (l: NewLog, title: string, sub?: string, opts?: { replaces?: string }) => {
      const { before, after, log: saved } = addLog(l);
      const today = appToday(after.settings.dayStartHour);
      const missions = weekResult(after.logs, weekStart(today), after.settings.targets).missions;
      const events = diff(snapshot(before, today), snapshot(after, today), l.kind, missions);
      const big = events.some((e) => e.type !== "xp");
      if (after.settings.sound) {
        chime(big);
        navigator.vibrate?.(big ? [18, 40, 28] : 14);
      }
      // A replacing log (an updated check-in) shows its gain like a new one; the old one is
      // tidied away once you move on, or stays if you undo.
      let undone = false;
      const replaces = opts?.replaces;
      setReward({
        title,
        sub,
        events,
        undo: () => {
          undone = true;
          removeLog(saved.id);
        },
        done: replaces ? () => !undone && removeLog(replaces) : undefined,
      });
    },
    [addLog, removeLog],
  );

  return (
    <Ctx.Provider value={log}>
      {children}
      {reward && (
        <RewardOverlay
          reward={reward}
          onClose={() => {
            reward.done?.();
            setReward(null);
          }}
        />
      )}
    </Ctx.Provider>
  );
}

export const useRewardedLog = () => useContext(Ctx);

function RewardOverlay({ reward, onClose }: { reward: Reward; onClose: () => void }) {
  const xp = reward.events.find((e): e is Extract<RewardEvent, { type: "xp" }> => e.type === "xp");
  const extras = reward.events.filter((e) => e.type !== "xp");
  const [shown, setShown] = useState(0);
  const [fill, setFill] = useState(xp?.before ?? 0);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btn.current?.focus();
    const target = xp?.amount ?? 0;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      setShown(Math.round(target * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const f = window.setTimeout(() => setFill(xp?.levelUp ? 1 : (xp?.after ?? 0)), 80);
    // Small wins close themselves; level-ups, ranks and milestones wait for you.
    const auto = extras.length ? 0 : window.setTimeout(onClose, 2600);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(f);
      if (auto) window.clearTimeout(auto);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="reward-root" onClick={onClose}>
      <div className="reward" role="status" aria-live="polite" onClick={(e) => e.stopPropagation()}>
        <p className="reward-title">{reward.title}</p>
        {reward.sub && <p className="reward-sub">“{reward.sub}”</p>}
        {xp && (
          <>
            <p className="reward-xp" aria-label={`plus ${xp.amount} XP`}>
              +{shown} <span>XP</span>
            </p>
            <p className="reward-skill">
              {xp.skill.icon} {xp.skill.name} · Lv {xp.skill.level}
            </p>
            <div className="bar gold" aria-hidden="true">
              <i style={{ width: `${Math.round(fill * 100)}%` }} />
            </div>
          </>
        )}
        {extras.length > 0 && (
          <ul className="reward-events">
            {extras.map((e, i) => (
              <li key={i} className={`ev ${e.type}`} style={{ animationDelay: `${300 + i * 140}ms` }}>
                {e.type === "level" && <>LEVEL UP · Level {e.level}</>}
                {e.type === "rank" && <>NEW RANK · {e.rank}</>}
                {e.type === "mission" && <>⭐ {e.label} mission complete</>}
                {e.type === "perfect" && <>WEEK CLEARED · +{XP.perfectWeek} bonus XP</>}
                {e.type === "achievement" && (
                  <>
                    {e.icon} Achievement · {e.label}
                  </>
                )}
                {e.type === "milestone" && <>🎬 Milestone · {e.label}</>}
              </li>
            ))}
          </ul>
        )}
        <div className="reward-actions">
          <button
            className="text-btn"
            onClick={() => {
              reward.undo();
              onClose();
            }}
          >
            Undo
          </button>
          <button ref={btn} className="primary" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
