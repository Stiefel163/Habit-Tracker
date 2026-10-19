import { useRef, useState, type ReactNode } from "react";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { emptyData } from "../domain/defaults";
import { HABITS } from "../domain/habits";
import { SETUP } from "../components/Urge";
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
  const [line, setLine] = useState("");
  const [confirmErase, setConfirmErase] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const json = JSON.stringify(data);

  return (
    <div className="view">
      <header className="head">
        <h1>Settings</h1>
      </header>

      <Section title="Who you're becoming" hint="Shown on Progress. Every locked-in day is a vote for this.">
        <input
          className="text-input"
          value={s.identity}
          onChange={(e) => set({ identity: e.target.value })}
          aria-label="Identity statement"
          maxLength={80}
        />
      </Section>

      <Section title="Your fuel" hint="Lines that fire you up: lyrics, quotes, reminders. One shows each day.">
        {s.fuel.map((f, i) => (
          <div className="row" key={i}>
            <span className="fuel-item">“{f}”</span>
            <button className="text-btn" onClick={() => set({ fuel: s.fuel.filter((_, j) => j !== i) })} aria-label={`Remove line: ${f}`}>
              Remove
            </button>
          </div>
        ))}
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            const t = line.trim();
            if (t) set({ fuel: [...s.fuel, t] });
            setLine("");
          }}
        >
          <input className="text-input" value={line} onChange={(e) => setLine(e.target.value)} placeholder="Your favorite line" aria-label="New fuel line" maxLength={140} />
          <button className="secondary" type="submit">
            Add
          </button>
        </form>
      </Section>

      <Section title="Clean day" hint="Your rule. Only “Clean day” shows on the screen, so it stays private.">
        <textarea
          className="text-input area"
          rows={3}
          value={s.cleanRule}
          onChange={(e) => set({ cleanRule: e.target.value })}
          aria-label="What a clean day means to you"
          maxLength={200}
        />
      </Section>

      <Section title="Phone setup" hint="Set up once, so you need willpower less often. Tap a step when it's done.">
        <ul className="setup">
          {SETUP.map((x) => {
            const on = !!s.setup[x.id];
            return (
              <li key={x.id}>
                <button className={`setup-item${on ? " on" : ""}`} aria-pressed={on} onClick={() => set({ setup: { ...s.setup, [x.id]: !on } })}>
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
      </Section>

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
