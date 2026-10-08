import { useRef, useState, type ReactNode } from "react";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { emptyData } from "../domain/defaults";
import { GOALS, HABITS } from "../domain/habits";
import { normalize } from "../domain/migrate";
import type { Settings } from "../domain/types";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2 className="section-title">{title}</h2>
      {hint && <p className="muted small">{hint}</p>}
      <div className="rows">{children}</div>
    </section>
  );
}

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch${checked ? " on" : ""}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export function SettingsView() {
  const { data, updateSettings, replaceAll } = useStore();
  const toast = useToast();
  const s = data.settings;
  const set = (patch: Partial<Settings>) => updateSettings((x) => ({ ...x, ...patch }));
  const [sport, setSport] = useState("");
  const [confirmErase, setConfirmErase] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const json = JSON.stringify(data);

  return (
    <div className="view">
      <header className="head">
        <h1>Settings</h1>
      </header>

      <Section title="Habits" hint="Turn off what you don't need right now. Your history stays.">
        {HABITS.map((h) => (
          <div className="row" key={h.id}>
            <span>
              <span aria-hidden="true">{h.icon}</span> {h.name}
            </span>
            <Switch checked={s.active[h.id]} label={h.name} onChange={(v) => set({ active: { ...s.active, [h.id]: v } })} />
          </div>
        ))}
      </Section>

      <Section title="Your sports" hint="Shown when you tap Training. Gym and swimming are always there.">
        {s.sports.map((name) => (
          <div className="row" key={name}>
            <span>🏐 {name}</span>
            <button className="text-btn" onClick={() => set({ sports: s.sports.filter((x) => x !== name) })} aria-label={`Remove ${name}`}>
              Remove
            </button>
          </div>
        ))}
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            const n = sport.trim();
            if (n && !s.sports.includes(n)) set({ sports: [...s.sports, n] });
            setSport("");
          }}
        >
          <input className="text-input" value={sport} onChange={(e) => setSport(e.target.value)} placeholder="e.g. Hiking" aria-label="New sport" maxLength={24} />
          <button className="secondary" type="submit">
            Add
          </button>
        </form>
      </Section>

      <Section title="Goals" hint="How many times by the end of your exchange.">
        {GOALS.filter((g) => s.active[g.habit]).map((g) => (
          <div className="row" key={g.id}>
            <label htmlFor={`goal-${g.id}`}>
              <span aria-hidden="true">{g.animal}</span> {g.label}
            </label>
            <div className="stepper">
              <button type="button" aria-label={`Lower ${g.label} goal`} onClick={() => set({ goals: { ...s.goals, [g.id]: Math.max(1, s.goals[g.id] - 1) } })}>
                −
              </button>
              <input
                id={`goal-${g.id}`}
                type="number"
                inputMode="numeric"
                min={1}
                value={s.goals[g.id]}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!Number.isNaN(v) && v > 0) set({ goals: { ...s.goals, [g.id]: v } });
                }}
              />
              <button type="button" aria-label={`Raise ${g.label} goal`} onClick={() => set({ goals: { ...s.goals, [g.id]: s.goals[g.id] + 1 } })}>
                +
              </button>
            </div>
          </div>
        ))}
      </Section>

      <Section title="Appearance">
        <div className="seg" role="radiogroup" aria-label="Appearance">
          {(["system", "dark", "light"] as const).map((a) => (
            <button key={a} role="radio" aria-checked={s.appearance === a} className={s.appearance === a ? "on" : ""} onClick={() => set({ appearance: a })}>
              {a[0].toUpperCase() + a.slice(1)}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Backup" hint="Your data lives only on this device. Copy a backup now and then.">
        <div className="btn-row">
          <button
            className="secondary"
            onClick={() =>
              navigator.clipboard?.writeText(json).then(
                () => toast("Backup copied"),
                () => toast("Copying isn't allowed here. Use Download."),
              )
            }
          >
            Copy backup
          </button>
          <button
            className="secondary"
            onClick={() => {
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
              a.download = `comeback-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(a.href);
            }}
          >
            Download
          </button>
          <button className="secondary" onClick={() => file.current?.click()}>
            Restore from file
          </button>
          <input
            ref={file}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                replaceAll(normalize(JSON.parse(await f.text())));
                toast("Backup restored");
              } catch {
                toast("That file isn't a Comeback backup.");
              }
              e.target.value = "";
            }}
          />
        </div>
        {confirmErase ? (
          <div className="btn-row">
            <button
              className="danger"
              onClick={() => {
                replaceAll(emptyData());
                setConfirmErase(false);
                toast("Everything erased");
              }}
            >
              Yes, erase everything
            </button>
            <button className="secondary" onClick={() => setConfirmErase(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="text-btn" onClick={() => setConfirmErase(true)}>
            Erase all data…
          </button>
        )}
      </Section>
    </div>
  );
}
