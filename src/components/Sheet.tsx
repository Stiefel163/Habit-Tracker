import { useEffect, useRef, type ReactNode } from "react";

/** Bottom sheet. Closes on backdrop tap, Escape, or the Done button. Focus moves into it. */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      prev?.focus();
    };
  }, []);
  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" ref={panel} tabIndex={-1}>
        <div className="sheet-handle" aria-hidden="true" />
        <h2 id="sheet-title">{title}</h2>
        <div className="sheet-body">{children}</div>
        <button className="primary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
