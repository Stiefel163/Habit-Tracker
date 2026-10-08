import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Option } from "../domain/habits";

/** Bottom sheet. Closes on backdrop tap, Escape, or the handle. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const [closing, setClosing] = useState(false);
  const close = () => {
    setClosing(true);
    setTimeout(onClose, 180);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className={`sheet-root${closing ? " closing" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
      <div className="sheet-backdrop" onClick={close} />
      <div className="sheet">
        <button className="sheet-handle" onClick={close} aria-label="Close" />
        <div className="sheet-head">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={close} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
  format,
}: {
  options: readonly (Option | T)[];
  value: T | undefined;
  onChange: (v: T) => void;
  label?: string;
  format?: (v: T) => string;
}) {
  return (
    <div className="field">
      {label && <div className="field-label">{label}</div>}
      <div className="chips" role="radiogroup" aria-label={label}>
        {options.map((o) => {
          const id = (typeof o === "object" ? o.id : o) as T;
          const text = typeof o === "object" ? o.label : format ? format(o as T) : String(o);
          return (
            <button
              key={String(id)}
              type="button"
              role="radio"
              aria-checked={value === id}
              className={`chip${value === id ? " on" : ""}`}
              onClick={() => onChange(id)}
            >
              {text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NumberChips({
  label,
  choices,
  value,
  onChange,
  unit,
  allowNone,
}: {
  label: string;
  choices: number[];
  value: number | undefined;
  onChange: (v: number | undefined) => void;
  unit: string;
  allowNone?: boolean;
}) {
  const custom = value !== undefined && !choices.includes(value);
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) input.current?.focus();
  }, [editing]);
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="chips">
        {allowNone && (
          <button type="button" className={`chip${value === undefined ? " on" : ""}`} onClick={() => onChange(undefined)}>
            –
          </button>
        )}
        {choices.map((c) => (
          <button key={c} type="button" className={`chip num${value === c ? " on" : ""}`} onClick={() => onChange(c)}>
            {c}
          </button>
        ))}
        {editing ? (
          <input
            ref={input}
            className="chip-input"
            type="number"
            inputMode="numeric"
            min={0}
            defaultValue={custom ? value : ""}
            aria-label={`Custom ${label}`}
            onBlur={(e) => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n) && n > 0) onChange(n);
              setEditing(false);
            }}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          />
        ) : (
          <button type="button" className={`chip num${custom ? " on" : ""}`} onClick={() => setEditing(true)}>
            {custom ? value : "…"}
          </button>
        )}
        <span className="chip-unit">{unit}</span>
      </div>
    </div>
  );
}

export function NoteField({ value, onChange, placeholder = "Note (optional)" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      className="text-input"
      value={value}
      maxLength={140}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Note"
    />
  );
}

export function Stepper({ value, onChange, min = 0, max = 14, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="stepper" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} aria-label={`Decrease ${label}`} disabled={value <= min}>
        −
      </button>
      <span className="mono">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} aria-label={`Increase ${label}`} disabled={value >= max}>
        +
      </button>
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className={`switch${checked ? " on" : ""}`} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

/** Segmented progress: one pill per target unit. */
export function Pips({ done, target }: { done: number; target: number }) {
  const n = Math.max(target, done);
  return (
    <div className="pips" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={i < done ? (i >= target ? "on extra" : "on") : ""} />
      ))}
    </div>
  );
}

export function Ring({ value, size = 44 }: { value: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring" aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        className="ring-fill"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, value))}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}
