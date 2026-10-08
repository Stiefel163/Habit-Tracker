import { useRef, useState, type ReactNode } from "react";
import { Chips, Stepper, Switch } from "../components/ui";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { newId } from "../data/store";
import { DEFAULT_SETTINGS } from "../domain/defaults";
import { HABITS } from "../domain/habits";
import type { AppData, Settings, Targets } from "../domain/types";

function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="panel settings-section">
      <h2 className="panel-title">{title}</h2>
      {hint && <p className="muted small section-hint">{hint}</p>}
      <div className="settings-rows">{children}</div>
    </section>
  );
}

function Row({ label, children, sub }: { label: string; children: ReactNode; sub?: string }) {
  return (
    <div className="settings-row">
      <div>
        <div>{label}</div>
        {sub && <div className="muted small">{sub}</div>}
      </div>
      {children}
    </div>
  );
}

const TARGET_ROWS: { key: keyof Targets; label: string; sub: string; max: number }[] = [
  { key: "strength", label: "Strength training", sub: "sessions per week", max: 7 },
  { key: "swim", label: "Swimming", sub: "sessions per week", max: 7 },
  { key: "spanish", label: "Spanish", sub: "days per week", max: 7 },
  { key: "driving", label: "Driving theory", sub: "days per week", max: 7 },
  { key: "create", label: "Create", sub: "days per week", max: 7 },
  { key: "sleep", label: "Sleep on rhythm", sub: "nights per week", max: 7 },
  { key: "supplements", label: "Supplements", sub: "days per week", max: 7 },
  { key: "noReels", label: "No reels after waking", sub: "mornings per week", max: 7 },
];

export function SettingsView() {
  const { data, updateSettings, importData } = useStore();
  const toast = useToast();
  const s = data.settings;
  const set = (patch: Partial<Settings>) => updateSettings((x) => ({ ...x, ...patch }));
  const [newSupp, setNewSupp] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exportJson = JSON.stringify(data, null, 2);

  return (
    <div className="view">
      <header className="plain-head">
        <h1>Settings</h1>
      </header>

      <Section title="Habits" hint="Turn off what isn't relevant right now. History stays.">
        {HABITS.map((h) => (
          <Row key={h.id} label={`${h.icon}  ${h.name}`}>
            <Switch checked={s.active[h.id]} onChange={(v) => set({ active: { ...s.active, [h.id]: v } })} label={h.name} />
          </Row>
        ))}
      </Section>

      <Section title="Weekly targets" hint="Weekly consistency over perfect streaks. Set targets you can hit on a normal week.">
        {TARGET_ROWS.map((r) => (
          <Row key={r.key} label={r.label} sub={r.sub}>
            <Stepper label={r.label} value={s.targets[r.key]} max={r.max} onChange={(v) => set({ targets: { ...s.targets, [r.key]: v } })} />
          </Row>
        ))}
      </Section>

      <Section title="Sleep">
        <Row label="Target bedtime">
          <input className="time-input mono" type="time" value={s.sleep.bed} onChange={(e) => e.target.value && set({ sleep: { ...s.sleep, bed: e.target.value } })} />
        </Row>
        <Row label="Target wake-up">
          <input className="time-input mono" type="time" value={s.sleep.wake} onChange={(e) => e.target.value && set({ sleep: { ...s.sleep, wake: e.target.value } })} />
        </Row>
        <Chips<number>
          label="Tolerance (± minutes)"
          options={[15, 30, 45, 60]}
          value={s.sleep.toleranceMin}
          onChange={(v) => set({ sleep: { ...s.sleep, toleranceMin: v } })}
        />
      </Section>

      <Section title="Spanish">
        <Row label="Minimum session" sub="shorter sessions are saved but don't count">
          <Chips<number> options={[5, 10, 15, 20]} value={s.spanishMinMinutes} onChange={(v) => set({ spanishMinMinutes: v })} format={(v) => `${v}m`} />
        </Row>
      </Section>

      <Section title="Supplements" hint="Your normal setup. Logging pre-checks all active ones.">
        {s.supplements.map((x) => (
          <Row key={x.id} label={x.name}>
            <div className="row-actions">
              <button
                className="text-btn"
                onClick={() => set({ supplements: s.supplements.filter((y) => y.id !== x.id) })}
                aria-label={`Delete ${x.name}`}
              >
                Delete
              </button>
              <Switch
                checked={x.active}
                label={x.name}
                onChange={(v) => set({ supplements: s.supplements.map((y) => (y.id === x.id ? { ...y, active: v } : y)) })}
              />
            </div>
          </Row>
        ))}
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            const name = newSupp.trim();
            if (!name) return;
            set({ supplements: [...s.supplements, { id: newId(), name, active: true }] });
            setNewSupp("");
          }}
        >
          <input className="text-input" placeholder="Add supplement" value={newSupp} onChange={(e) => setNewSupp(e.target.value)} maxLength={30} />
          <button className="secondary" type="submit">
            Add
          </button>
        </form>
      </Section>

      <Section title="No reels after waking" hint="What counts as success? Keep it to one clear rule.">
        <textarea className="text-input area" rows={3} value={s.noReelsRule} onChange={(e) => set({ noReelsRule: e.target.value })} maxLength={240} />
      </Section>

      <Section title="General">
        <Row label="Day rolls over at" sub="logging at 1:00 still counts for the evening before">
          <Chips<number> options={[0, 2, 4, 5]} value={s.dayStartHour} onChange={(v) => set({ dayStartHour: v })} format={(v) => `${v}:00`} />
        </Row>
        <Chips<Settings["appearance"]>
          label="Appearance"
          options={[
            { id: "system", label: "System" },
            { id: "dark", label: "Dark" },
            { id: "light", label: "Light" },
          ]}
          value={s.appearance}
          onChange={(v) => set({ appearance: v })}
        />
      </Section>

      <Section title="Data" hint="Everything is stored on this device. Make a backup now and then, or before switching phones.">
        <div className="btn-row">
          <button
            className="secondary"
            onClick={() => {
              const blob = new Blob([exportJson], { type: "application/json" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `comeback-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Download backup
          </button>
          <button
            className="secondary"
            onClick={() =>
              navigator.clipboard?.writeText(exportJson).then(
                () => toast("Backup copied"),
                () => toast("Copy isn't allowed here. Use Download."),
              )
            }
          >
            Copy backup
          </button>
          <button className="secondary" onClick={() => fileRef.current?.click()}>
            Restore…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                const parsed = JSON.parse(await f.text()) as AppData;
                if (!Array.isArray(parsed.entries)) throw new Error();
                importData(parsed);
                toast(`Restored ${parsed.entries.length} entries`);
              } catch {
                toast("That file isn't a Comeback backup.");
              }
              e.target.value = "";
            }}
          />
        </div>
        {confirmReset ? (
          <div className="btn-row">
            <button
              className="danger"
              onClick={() => {
                importData({ entries: [], notes: [], settings: structuredClone(DEFAULT_SETTINGS) });
                setConfirmReset(false);
                toast("All data erased");
              }}
            >
              Erase everything
            </button>
            <button className="secondary" onClick={() => setConfirmReset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="text-btn" onClick={() => setConfirmReset(true)}>
            Erase all data…
          </button>
        )}
      </Section>
    </div>
  );
}
