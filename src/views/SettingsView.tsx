import { useRef, useState, type ReactNode } from "react";
import { useToast } from "../components/Toast";
import { useStore } from "../data/StoreProvider";
import { emptyData } from "../domain/defaults";
import { normalize } from "../domain/migrate";
import type { Settings, WeeklyTargets } from "../domain/types";

function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="panel">
      <h2 className="section-title">{title}</h2>
      {hint && <p className="muted small">{hint}</p>}
      <div className="rows">{children}</div>
    </section>
  );
}

function Stepper({ label, value, onChange, min, max, step = 1 }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number }) {
  return (
    <div className="stepper">
      <button type="button" aria-label={`Lower ${label}`} disabled={value <= min} onClick={() => onChange(Math.max(min, value - step))}>
        −
      </button>
      <output aria-label={label}>{value}</output>
      <button type="button" aria-label={`Raise ${label}`} disabled={value >= max} onClick={() => onChange(Math.min(max, value + step))}>
        +
      </button>
    </div>
  );
}

const TARGETS: { key: keyof WeeklyTargets; label: string; max: number }[] = [
  { key: "strength", label: "🦾 Strength workouts", max: 7 },
  { key: "swim", label: "🏊 Swims", max: 7 },
  { key: "spanish", label: "🇪🇸 Spanish days", max: 7 },
  { key: "videos", label: "🎬 Published videos", max: 7 },
  { key: "bogen", label: "🚗 Bögen", max: 50 },
  { key: "focusHours", label: "🧠 Focus hours", max: 60 },
];

export function SettingsView() {
  const { data, updateSettings, replaceAll } = useStore();
  const toast = useToast();
  const s = data.settings;
  const set = (patch: Partial<Settings>) => updateSettings((x) => ({ ...x, ...patch }));
  const [cat, setCat] = useState("");
  const [paste, setPaste] = useState("");
  const [showText, setShowText] = useState(false);
  const [confirmErase, setConfirmErase] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const json = JSON.stringify(data);

  const restore = (text: string) => {
    try {
      replaceAll(normalize(JSON.parse(text)));
      toast("Backup restored");
      setPaste("");
    } catch {
      toast("That isn't a Comeback backup. Paste the whole copied text.");
    }
  };

  return (
    <div className="view">
      <header className="head">
        <h1>Settings</h1>
      </header>

      <Section title="Your vision" hint="Why you're doing this, in your own words. Shown on Home. Read it when you doubt yourself.">
        <textarea className="text-input area" rows={3} value={s.vision} onChange={(e) => set({ vision: e.target.value })} placeholder="Jim Goes: travel videos my way, not like every other travel account." aria-label="Your vision" maxLength={240} />
      </Section>

      <Section title="Weekly missions" hint="A new week starts every Monday. Completing a mission gives a star. Nothing is ever taken away.">
        {TARGETS.map((t) => (
          <div className="row" key={t.key}>
            <span>{t.label}</span>
            <Stepper label={t.label} value={s.targets[t.key]} min={0} max={t.max} onChange={(v) => set({ targets: { ...s.targets, [t.key]: v } })} />
          </div>
        ))}
      </Section>

      <Section title="Streak Shield" hint="Missing one Spanish day uses the Shield and your streak survives. It recharges after this many successful days.">
        <div className="row">
          <span>🛡 Recharge after</span>
          <Stepper label="days to recharge the shield" value={s.shieldEvery} min={3} max={14} onChange={(v) => set({ shieldEvery: v })} />
        </div>
      </Section>

      <Section title="Focus categories">
        {s.focusCategories.map((c) => (
          <div className="row" key={c}>
            <span>{c}</span>
            <button className="text-btn" onClick={() => set({ focusCategories: s.focusCategories.filter((x) => x !== c) })} aria-label={`Remove ${c}`}>
              Remove
            </button>
          </div>
        ))}
        <form
          className="add-row"
          onSubmit={(e) => {
            e.preventDefault();
            const c = cat.trim();
            if (c && !s.focusCategories.includes(c)) set({ focusCategories: [...s.focusCategories, c] });
            setCat("");
          }}
        >
          <input className="text-input" value={cat} onChange={(e) => setCat(e.target.value)} placeholder="New category" aria-label="New focus category" maxLength={24} />
          <button className="secondary" type="submit">
            Add
          </button>
        </form>
      </Section>

      <Section title="Feedback">
        <div className="row">
          <span>Sound & vibration on rewards</span>
          <button type="button" role="switch" aria-checked={s.sound} aria-label="Sound and vibration" className={`switch${s.sound ? " on" : ""}`} onClick={() => set({ sound: !s.sound })}>
            <span />
          </button>
        </div>
      </Section>

      <Section title="Backup" hint="Your data lives only on this device. Copy a backup now and then, and paste it here to move to a new phone or address.">
        <div className="btn-row">
          <button
            className="secondary"
            onClick={() => {
              const fallback = () => {
                setShowText(true);
                toast("Copying is blocked here. Select the text below and copy it.");
              };
              if (!navigator.clipboard?.writeText) return fallback();
              navigator.clipboard.writeText(json).then(() => toast("Backup copied"), fallback);
            }}
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
          <button className="secondary" onClick={() => setShowText(!showText)} aria-expanded={showText}>
            {showText ? "Hide backup text" : "Show backup text"}
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
              if (f) restore(await f.text());
              e.target.value = "";
            }}
          />
        </div>
        {showText && (
          <textarea
            className="text-input area mono-small"
            rows={4}
            readOnly
            value={json}
            aria-label="Your backup. Select all and copy."
            onFocus={(e) => e.currentTarget.select()}
          />
        )}
        <textarea className="text-input area" rows={2} value={paste} onChange={(e) => setPaste(e.target.value)} placeholder="Or paste a copied backup here" aria-label="Paste a backup" />
        {paste.trim() && (
          <button className="secondary" onClick={() => restore(paste)}>
            Restore pasted backup
          </button>
        )}
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
          <button className="text-btn left" onClick={() => setConfirmErase(true)}>
            Erase all data…
          </button>
        )}
      </Section>
    </div>
  );
}
