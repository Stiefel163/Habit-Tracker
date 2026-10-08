import { useMemo, useState } from "react";
import { Sheet, Switch } from "../components/ui";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { evaluateSleep } from "../domain/sleep";
import { entriesOn } from "../domain/status";
import type { SleepData } from "../domain/types";
import { addDays, weekdayShort } from "../lib/date";
import { formatDuration, shiftClock, type Clock } from "../lib/time";
import { lastEntry, type SheetProps } from "./common";

function TimeRow({ label, value, onChange, ok }: { label: string; value: Clock; onChange: (v: Clock) => void; ok: boolean }) {
  return (
    <div className="time-row">
      <div className="time-label">{label}</div>
      <div className="time-ctrl">
        <button type="button" className="round-btn" onClick={() => onChange(shiftClock(value, -15))} aria-label={`${label} 15 minutes earlier`}>
          −
        </button>
        <label className={`time-value mono${ok ? " ok" : ""}`}>
          {value}
          <input type="time" value={value} step={300} onChange={(e) => e.target.value && onChange(e.target.value)} aria-label={label} />
        </label>
        <button type="button" className="round-btn" onClick={() => onChange(shiftClock(value, 15))} aria-label={`${label} 15 minutes later`}>
          +
        </button>
      </div>
    </div>
  );
}

export function SleepSheet({ date, onClose }: SheetProps) {
  const { data, setSingle, removeEntry, restore } = useStore();
  const toast = useToast();
  const s = data.settings;
  const existing = entriesOn(data.entries, date, "sleep")[0];
  const prev = (existing ?? lastEntry(data.entries, "sleep"))?.data as SleepData | undefined;

  const [bed, setBed] = useState<Clock>(prev?.bed ?? s.sleep.bed);
  const [wake, setWake] = useState<Clock>(prev?.wake ?? s.sleep.wake);
  const [withSleep, setWithSleep] = useState(existing ? (existing.data as SleepData).sleepMin !== undefined : false);
  const ev0 = evaluateSleep({ bed, wake }, s.sleep);
  const [sleepMin, setSleepMin] = useState<number>((existing?.data as SleepData | undefined)?.sleepMin ?? Math.max(0, ev0.inBedMin - 15));

  const d: SleepData = useMemo(() => ({ bed, wake, ...(withSleep ? { sleepMin } : {}) }), [bed, wake, withSleep, sleepMin]);
  const ev = evaluateSleep(d, s.sleep);

  const save = () => {
    const { removed, added } = setSingle({ date, habit: "sleep", state: ev.onRhythm ? "done" : "partial", data: d });
    onClose();
    toast(ev.onRhythm ? "Sleep logged · on rhythm" : "Sleep logged", () => restore([added], removed));
  };

  return (
    <Sheet title="Sleep" onClose={onClose}>
      <p className="sheet-sub">
        Night before {weekdayShort(date)} · from {weekdayShort(addDays(date, -1))} evening. Target {s.sleep.bed} → {s.sleep.wake} (±{s.sleep.toleranceMin} min)
      </p>
      <TimeRow label="Into bed" value={bed} onChange={setBed} ok={ev.bedOk} />
      <TimeRow label="Out of bed" value={wake} onChange={setWake} ok={ev.wakeOk} />

      <div className="toggle-row">
        <span>Add actual sleep</span>
        <Switch checked={withSleep} onChange={setWithSleep} label="Add actual sleep" />
      </div>
      {withSleep && (
        <div className="time-row">
          <div className="time-label">Slept</div>
          <div className="time-ctrl">
            <button type="button" className="round-btn" onClick={() => setSleepMin((m) => Math.max(0, m - 15))} aria-label="15 minutes less">
              −
            </button>
            <span className="time-value mono">{formatDuration(sleepMin)}</span>
            <button type="button" className="round-btn" onClick={() => setSleepMin((m) => m + 15)} aria-label="15 minutes more">
              +
            </button>
          </div>
        </div>
      )}

      <div className={`verdict ${ev.onRhythm ? "done" : "partial"}`}>
        <strong>{ev.verdict}</strong>
        <span>
          {formatDuration(ev.sleepMin)} {withSleep ? "asleep" : "in bed"}
        </span>
      </div>

      <button className="primary" onClick={save}>
        Save sleep
      </button>
      {existing && (
        <button
          className="text-btn center"
          onClick={() => {
            removeEntry(existing.id);
            onClose();
          }}
        >
          Remove this night
        </button>
      )}
    </Sheet>
  );
}
