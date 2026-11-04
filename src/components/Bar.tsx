/** A progress bar. `value` is 0..1. Labelled for screen readers. */
export function Bar({ value, label, thin }: { value: number; label: string; thin?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div className={`bar${thin ? " thin" : ""}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
      <i style={{ width: `${pct}%` }} />
    </div>
  );
}
