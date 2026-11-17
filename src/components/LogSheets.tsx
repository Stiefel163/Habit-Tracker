import { useState } from "react";
import { useStore } from "../data/StoreProvider";
import { CLEAN_ITEMS, MIN_FOCUS_MIN, SPLITS, XP, cleanCount, formatDuration, formatHours, focusStats, journey, statsFor, validLogs } from "../domain/rpg";
import type { ActivityLog, Split } from "../domain/types";
import { addDays, weekDays, weekStart, type DayKey } from "../lib/date";
import { useRewardedLog } from "./Reward";
import { Sheet } from "./Sheet";
import { useToast } from "./Toast";

export type LogKindUI = "strength" | "swim" | "spanish" | "video" | "bogen" | "focus" | "clean";

/** Today or yesterday, for when you log late. Defaults to today. */
function DayPick({ today, value, onChange }: { today: DayKey; value: DayKey; onChange: (d: DayKey) => void }) {
  const y = addDays(today, -1);
  return (
    <div className="seg" role="radiogroup" aria-label="Which day">
      {[
        [today, "Today"],
        [y, "Yesterday"],
      ].map(([d, label]) => (
        <button key={d} role="radio" aria-checked={value === d} className={value === d ? "on" : ""} onClick={() => onChange(d)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Chips<T extends string | number>({ label, options, value, onChange }: { label: string; options: { id: T; label: string }[]; value: T | undefined; onChange: (v: T | undefined) => void }) {
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {options.map((o) => (
          <button key={String(o.id)} className={`chip${value === o.id ? " on" : ""}`} aria-pressed={value === o.id} onClick={() => onChange(value === o.id ? undefined : o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

const DURATIONS = [30, 45, 60, 75, 90].map((m) => ({ id: m, label: `${m}′` }));

function onDay(logs: ActivityLog[], kind: ActivityLog["kind"], date: DayKey) {
  return validLogs(logs).find((l) => l.kind === kind && l.date === date);
}

export function LogSheet({ kind, today, onClose }: { kind: LogKindUI; today: DayKey; onClose: () => void }) {
  switch (kind) {
    case "strength":
      return <StrengthSheet today={today} onClose={onClose} />;
    case "swim":
      return <SwimSheet today={today} onClose={onClose} />;
    case "spanish":
      return <SpanishSheet today={today} onClose={onClose} />;
    case "video":
      return <VideoSheet today={today} onClose={onClose} />;
    case "bogen":
      return <BogenSheet today={today} onClose={onClose} />;
    case "focus":
      return <FocusSheet today={today} onClose={onClose} />;
    case "clean":
      return <CleanSheet today={today} onClose={onClose} />;
  }
}

function AlreadyDone({ text, onRemove }: { text: string; onRemove: () => void }) {
  return (
    <div className="done-box">
      <p>
        <strong>✓ Logged</strong> · {text}
      </p>
      <button className="text-btn" onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

function StrengthSheet({ today, onClose }: { today: DayKey; onClose: () => void }) {
  const { data, removeLog } = useStore();
  const reward = useRewardedLog();
  const [date, setDate] = useState(today);
  const [split, setSplit] = useState<Split | undefined>();
  const [minutes, setMinutes] = useState<number | undefined>();
  const done = onDay(data.logs, "strength", date);
  const save = () => {
    onClose();
    reward({ kind: "strength", date, split, minutes }, "STRENGTH WORKOUT", split ? SPLITS.find((s) => s.id === split)?.label : undefined);
  };
  return (
    <Sheet
      title="🦾 Strength"
      onClose={onClose}
      footer={
        !done && (
          <button className="primary" onClick={save}>
            Log workout · +{XP.strength} XP
          </button>
        )
      }
    >
      <DayPick today={today} value={date} onChange={setDate} />
      {done ? (
        <AlreadyDone text={done.kind === "strength" && done.split ? SPLITS.find((s) => s.id === done.split)!.label : "Workout"} onRemove={() => removeLog(done.id)} />
      ) : (
        <>
          <Chips label="Split (optional)" options={SPLITS} value={split} onChange={setSplit} />
          <Chips label="Duration (optional)" options={DURATIONS} value={minutes} onChange={setMinutes} />
        </>
      )}
    </Sheet>
  );
}

function SwimSheet({ today, onClose }: { today: DayKey; onClose: () => void }) {
  const { data, removeLog } = useStore();
  const reward = useRewardedLog();
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState<number | undefined>();
  const done = onDay(data.logs, "swim", date);
  return (
    <Sheet
      title="🏊 Swimming"
      onClose={onClose}
      footer={
        !done && (
          <button
            className="primary"
            onClick={() => {
              onClose();
              reward({ kind: "swim", date, minutes }, "SWIM", minutes ? formatDuration(minutes) : undefined);
            }}
          >
            Log swim · +{XP.swim} XP
          </button>
        )
      }
    >
      <DayPick today={today} value={date} onChange={setDate} />
      {done ? <AlreadyDone text="Swim" onRemove={() => removeLog(done.id)} /> : <Chips label="Duration (optional)" options={DURATIONS} value={minutes} onChange={setMinutes} />}
    </Sheet>
  );
}

function SpanishSheet({ today, onClose }: { today: DayKey; onClose: () => void }) {
  const { data, updateLog } = useStore();
  const reward = useRewardedLog();
  const [date, setDate] = useState(today);
  const done = onDay(data.logs, "spanish", date);
  const days = journey(data.logs, "spanish");
  const dayNo = done ? (days.find((x) => x.log.id === done.id)?.n ?? days.length) : days.filter((x) => x.log.date < date).length + 1;
  const [better, setBetter] = useState(done && done.kind === "spanish" ? done.better : "");
  const [minutes, setMinutes] = useState<number | undefined>();
  const ok = better.trim().length > 2;
  return (
    <Sheet
      title={
        <>
          🇪🇸 Day {dayNo} <span className="of">/ 100</span>
        </>
      }
      onClose={onClose}
      footer={
        done ? (
          <button
            className="primary"
            disabled={!ok}
            onClick={() => {
              updateLog(done.id, { better: better.trim() });
              onClose();
            }}
          >
            Save changes
          </button>
        ) : (
          <button
            className="primary"
            disabled={!ok}
            onClick={() => {
              onClose();
              reward({ kind: "spanish", date, better: better.trim(), minutes }, `DAY ${dayNo} / 100`, better.trim());
            }}
          >
            Complete Day {dayNo} · +{XP.spanish} XP
          </button>
        )
      }
    >
      <DayPick
        today={today}
        value={date}
        onChange={(d) => {
          setDate(d);
          const other = onDay(data.logs, "spanish", d);
          setBetter(other && other.kind === "spanish" ? other.better : "");
        }}
      />
      <label className="field">
        <span className="field-label big">What got better today?</span>
        <textarea
          className="text-input area"
          rows={3}
          value={better}
          onChange={(e) => setBetter(e.target.value)}
          placeholder="I can explain why I want to work in LATAM more naturally."
          maxLength={200}
        />
      </label>
      {!done && (
        <Chips
          label="Minutes (optional)"
          options={[10, 15, 20, 30, 45, 60].map((m) => ({
            id: m,
            label: `${m}′`,
          }))}
          value={minutes}
          onChange={setMinutes}
        />
      )}
    </Sheet>
  );
}

function VideoSheet({ today, onClose }: { today: DayKey; onClose: () => void }) {
  const { data } = useStore();
  const reward = useRewardedLog();
  const [date, setDate] = useState(today);
  const [better, setBetter] = useState("");
  const [title, setTitle] = useState("");
  const no = journey(data.logs, "video").length + 1;
  const ok = better.trim().length > 2;
  return (
    <Sheet
      title={
        <>
          🎬 Video #{no} <span className="of">/ 100</span>
        </>
      }
      onClose={onClose}
      footer={
        <button
          className="primary"
          disabled={!ok}
          onClick={() => {
            onClose();
            reward(
              {
                kind: "video",
                date,
                better: better.trim(),
                title: title.trim() || undefined,
              },
              `VIDEO #${no} PUBLISHED`,
              better.trim(),
            );
          }}
        >
          Publish #{no} · +{XP.video} XP
        </button>
      }
    >
      <DayPick today={today} value={date} onChange={setDate} />
      <label className="field">
        <span className="field-label big">What got better with this video?</span>
        <textarea className="text-input area" rows={3} value={better} onChange={(e) => setBetter(e.target.value)} placeholder="I made the pacing much faster." maxLength={200} />
      </label>
      <label className="field">
        <span className="field-label">Title (optional)</span>
        <input className="text-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
      </label>
      <p className="muted small">Editing time goes into Focus hours, category Creator. This is only for videos you actually published.</p>
    </Sheet>
  );
}

function BogenSheet({ today, onClose }: { today: DayKey; onClose: () => void }) {
  const { data } = useStore();
  const reward = useRewardedLog();
  const [date, setDate] = useState(today);
  const [count, setCount] = useState(1);
  const logs = validLogs(data.logs);
  const todayN = statsFor(logs, new Set([today])).bogen;
  const weekN = statsFor(logs, new Set(weekDays(weekStart(today)))).bogen;
  const total = statsFor(logs, new Set(logs.map((l) => l.date))).bogen;
  return (
    <Sheet
      title="🚗 Driving Theory"
      onClose={onClose}
      footer={
        <button
          className="primary"
          onClick={() => {
            onClose();
            reward({ kind: "bogen", date, count }, `${count} ${count === 1 ? "BOGEN" : "BÖGEN"}`);
          }}
        >
          Save · +{XP.bogen * count} XP
        </button>
      }
    >
      <DayPick today={today} value={date} onChange={setDate} />
      <div className="big-stepper">
        <button onClick={() => setCount((c) => Math.max(1, c - 1))} aria-label="One Bogen less" disabled={count <= 1}>
          −
        </button>
        <p aria-live="polite">
          <span className="num">{count}</span>
          <span className="unit">{count === 1 ? "Bogen" : "Bögen"}</span>
        </p>
        <button onClick={() => setCount((c) => Math.min(30, c + 1))} aria-label="One Bogen more">
          +
        </button>
      </div>
      <div className="mini-stats">
        <div>
          <strong>{todayN}</strong>
          <span>today</span>
        </div>
        <div>
          <strong>
            {weekN} / {data.settings.targets.bogen}
          </strong>
          <span>this week</span>
        </div>
        <div>
          <strong>{total}</strong>
          <span>total</span>
        </div>
      </div>
    </Sheet>
  );
}

function FocusSheet({ today, onClose }: { today: DayKey; onClose: () => void }) {
  const { data } = useStore();
  const reward = useRewardedLog();
  const lastFocus = [...data.logs].reverse().find((l) => l.kind === "focus");
  const [date, setDate] = useState(today);
  const [minutes, setMinutes] = useState(60);
  const [category, setCategory] = useState<string>(lastFocus && lastFocus.kind === "focus" ? lastFocus.category : (data.settings.focusCategories[0] ?? "Other"));
  const stats = focusStats(validLogs(data.logs), today);
  const xp = Math.round((minutes / 60) * XP.focusPerHour);
  return (
    <Sheet
      title="🧠 Log focus"
      onClose={onClose}
      footer={
        <button
          className="primary"
          onClick={() => {
            onClose();
            reward({ kind: "focus", date, minutes, category }, `${formatHours(minutes).toUpperCase()} FOCUS`, category);
          }}
        >
          Save · +{xp} XP
        </button>
      }
    >
      <DayPick today={today} value={date} onChange={setDate} />
      <div className="big-stepper">
        <button onClick={() => setMinutes((m) => Math.max(MIN_FOCUS_MIN, m - 15))} aria-label="15 minutes less" disabled={minutes <= MIN_FOCUS_MIN}>
          −
        </button>
        <p aria-live="polite">
          <span className="num">{formatDuration(minutes)}</span>
        </p>
        <button onClick={() => setMinutes((m) => Math.min(16 * 60, m + 15))} aria-label="15 minutes more">
          +
        </button>
      </div>
      <div className="chips" role="group" aria-label="Quick durations">
        {[30, 60, 90, 120, 180, 240].map((m) => (
          <button key={m} className={`chip${minutes === m ? " on" : ""}`} aria-pressed={minutes === m} onClick={() => setMinutes(m)}>
            {formatDuration(m)}
          </button>
        ))}
      </div>
      <div className="field">
        <span className="field-label">Category</span>
        <div className="chips" role="radiogroup" aria-label="Category">
          {data.settings.focusCategories.map((c) => (
            <button key={c} role="radio" aria-checked={category === c} className={`chip${category === c ? " on" : ""}`} onClick={() => setCategory(c)}>
              {c}
            </button>
          ))}
        </div>
      </div>
      <p className="muted small">
        Today {formatHours(stats.today)} · this week {formatHours(stats.week)} · lifetime {formatHours(stats.lifetime)}
      </p>
    </Sheet>
  );
}

/** Good behaviour: tap what you kept today. Saving again for the same day replaces it. */
function CleanSheet({ today, onClose }: { today: DayKey; onClose: () => void }) {
  const { data, updateLog } = useStore();
  const reward = useRewardedLog();
  const toast = useToast();
  const [date, setDate] = useState(today);
  const existing = onDay(data.logs, "clean", date) as Extract<ActivityLog, { kind: "clean" }> | undefined;
  const [kept, setKept] = useState<Record<string, boolean> | null>(null);
  const val = kept ?? {
    social: !!existing?.social,
    goon: !!existing?.goon,
    sleep: !!existing?.sleep,
  };
  const n = cleanCount(val as { social: boolean; goon: boolean; sleep: boolean });
  const before = existing ? cleanCount(existing) : 0;
  const gain = Math.max(0, n - before) * XP.cleanEach;
  const [pops, setPops] = useState<Record<string, number>>({});
  const save = () => {
    onClose();
    const v = { social: !!val.social, goon: !!val.goon, sleep: !!val.sleep };
    const title = n === 3 ? "CLEAN DAY" : `${n} / 3 KEPT`;
    const sub = n === 3 ? "All three. That's the hard part." : undefined;
    // Anything newly kept gets the full reward moment, also when you add it later.
    if (gain > 0) reward({ kind: "clean", date, ...v }, title, sub, existing ? { replaces: existing.id } : undefined);
    else if (existing) {
      updateLog(existing.id, v);
      toast(`Updated · ${n} / 3`);
    } else reward({ kind: "clean", date, ...v }, title, sub);
  };
  return (
    <Sheet
      title="🧘 Clean Day"
      onClose={onClose}
      footer={
        <button className="primary" onClick={save}>
          {gain > 0 ? `Save · +${gain} XP` : existing ? "Update" : "Save"}
        </button>
      }
    >
      <DayPick
        today={today}
        value={date}
        onChange={(d) => {
          setDate(d);
          setKept(null);
        }}
      />
      <p className="field-label big">What did you keep?</p>
      <ul className="clean-list">
        {CLEAN_ITEMS.map((c) => (
          <li key={c.id}>
            <button
              className={`clean-item${val[c.id] ? " on" : ""}`}
              role="switch"
              aria-checked={!!val[c.id]}
              onClick={() => {
                const on = !val[c.id];
                setKept({ ...val, [c.id]: on });
                if (on) {
                  setPops((p) => ({ ...p, [c.id]: (p[c.id] ?? 0) + 1 }));
                  if (data.settings.sound) navigator.vibrate?.(10);
                }
              }}
            >
              <span aria-hidden="true">{c.icon}</span>
              <span>{c.label}</span>
              <span className="clean-check" aria-hidden="true">
                {val[c.id] ? "✓" : ""}
              </span>
              {!!pops[c.id] && val[c.id] && (
                <span className="xp-pop" key={pops[c.id]} aria-hidden="true">
                  +{XP.cleanEach} XP
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      <p className="muted small">Be honest, nobody else sees this. {XP.cleanEach} XP for each one you kept. Nothing is taken away for the rest.</p>
    </Sheet>
  );
}
