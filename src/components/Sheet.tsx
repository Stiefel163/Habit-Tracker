import { useCallback, useEffect, useRef, type ReactNode } from "react";

const OUT_MS = 220;

/**
 * Bottom sheet. Swipe it down (it follows your finger), tap outside, press Escape or ✕ to close.
 * Closing always slides it away instead of cutting it off. Focus moves in and back out.
 */
export function Sheet({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const panel = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  const leaving = useRef(false);

  /** Slide out from wherever the sheet is now, then unmount. */
  const dismiss = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    const p = panel.current;
    const b = backdrop.current;
    if (!p || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return close.current();
    p.style.transition = `transform ${OUT_MS}ms cubic-bezier(.4,0,1,1)`;
    p.style.transform = "translateY(105%)";
    if (b) {
      b.style.transition = `opacity ${OUT_MS}ms ease`;
      b.style.opacity = "0";
    }
    window.setTimeout(() => close.current(), OUT_MS);
  }, []);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const p = panel.current!;
    p.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    // Swipe down to dismiss. Dragging starts only when pulling down from the top of the sheet,
    // so scrolling a long sheet still scrolls.
    let startY = 0;
    let startT = 0;
    let dy = 0;
    let dragging = false;
    let canDrag = false;
    const onStart = (e: TouchEvent) => {
      if (leaving.current || e.touches.length > 1) return;
      const t = e.target as HTMLElement;
      // Text fields and sliders keep their own gestures.
      canDrag = !t.closest("textarea, input[type=range]") && p.scrollTop <= 0;
      startY = e.touches[0].clientY;
      startT = performance.now();
      dy = 0;
      dragging = false;
    };
    const onMove = (e: TouchEvent) => {
      if (!canDrag || leaving.current) return;
      const d = e.touches[0].clientY - startY;
      if (!dragging) {
        if (d < 6 || p.scrollTop > 0) {
          if (d < -6) canDrag = false; // scrolling up: leave it to the browser
          return;
        }
        dragging = true;
        startY = e.touches[0].clientY;
        startT = performance.now();
        p.style.transition = "none";
      }
      e.preventDefault();
      dy = Math.max(0, e.touches[0].clientY - startY);
      // A touch of resistance makes it feel attached rather than loose.
      const pos = dy < 40 ? dy : 40 + (dy - 40) * 0.92;
      p.style.transform = `translateY(${pos}px)`;
      if (backdrop.current) backdrop.current.style.opacity = String(Math.max(0.15, 1 - pos / (p.offsetHeight || 600)));
    };
    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      const v = dy / Math.max(1, performance.now() - startT); // px per ms
      if (dy > Math.min(140, p.offsetHeight * 0.3) || (v > 0.5 && dy > 30)) return dismiss();
      p.style.transition = "transform 0.32s cubic-bezier(.2,.9,.25,1.15)";
      p.style.transform = "";
      if (backdrop.current) {
        backdrop.current.style.transition = "opacity 0.25s ease";
        backdrop.current.style.opacity = "";
      }
    };
    p.addEventListener("touchstart", onStart, { passive: true });
    p.addEventListener("touchmove", onMove, { passive: false });
    p.addEventListener("touchend", onEnd);
    p.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("keydown", onKey);
      p.removeEventListener("touchstart", onStart);
      p.removeEventListener("touchmove", onMove);
      p.removeEventListener("touchend", onEnd);
      p.removeEventListener("touchcancel", onEnd);
      document.body.style.overflow = "";
      prev?.focus({ preventScroll: true });
    };
  }, [dismiss]);

  return (
    <div className="sheet-root" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
      <div className="sheet-backdrop" ref={backdrop} onClick={dismiss} />
      <div className="sheet" ref={panel} tabIndex={-1}>
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-head">
          <h2 id="sheet-title">{title}</h2>
          <button className="icon-btn small" onClick={dismiss} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div className="sheet-foot">{footer}</div>}
      </div>
    </div>
  );
}
