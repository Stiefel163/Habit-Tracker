import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RewardProvider } from "./components/Reward";
import { ToastProvider } from "./components/Toast";
import { StoreProvider, useStore } from "./data/StoreProvider";
import { appToday, type DayKey } from "./lib/date";
import { HistoryView } from "./views/HistoryView";
import { HomeView } from "./views/HomeView";
import { ProgressView } from "./views/ProgressView";
import { SettingsView } from "./views/SettingsView";

type Tab = "home" | "progress" | "history" | "settings";

const I = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg {...I}>
        <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
      </svg>
    ),
  },
  {
    id: "progress",
    label: "Progress",
    icon: (
      <svg {...I}>
        <path d="M4 20V14M10 20V9M16 20V12M22 20V4" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "History",
    icon: (
      <svg {...I}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 7.5V12l3 2" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg {...I}>
        <path d="M5 7h9M18 7h1M5 17h1M10 17h9" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </svg>
    ),
  },
];

function useToday(dayStartHour: number): DayKey {
  const [today, setToday] = useState(() => appToday(dayStartHour));
  useEffect(() => {
    const tick = () => setToday(appToday(dayStartHour));
    tick();
    const id = window.setInterval(tick, 60_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [dayStartHour]);
  return today;
}

/**
 * Swipe left/right anywhere on a page to move to the next/previous tab. The page follows the
 * finger; vertical scrolling, open sheets, text fields and sliders are left alone.
 */
function useSwipeTabs(main: React.RefObject<HTMLElement>, ready: boolean, tab: Tab, onSwitch: (t: Tab, dir: number) => void) {
  const state = useRef({ tab, onSwitch });
  state.current = { tab, onSwitch };
  useEffect(() => {
    const m = main.current;
    if (!m) return;
    let x0 = 0;
    let y0 = 0;
    let t0 = 0;
    let dx = 0;
    let mode: "idle" | "pending" | "x" | "y" = "idle";
    const idx = () => TABS.findIndex((t) => t.id === state.current.tab);
    const reset = (animate: boolean) => {
      m.style.transition = animate ? "transform 0.3s cubic-bezier(.2,.9,.25,1.1), opacity 0.25s ease" : "none";
      m.style.transform = "";
      m.style.opacity = "";
    };
    const onStart = (e: TouchEvent) => {
      const t = e.target as HTMLElement;
      if (e.touches.length > 1 || t.closest(".sheet-root, .reward-root, input, textarea, select")) {
        mode = "idle";
        return;
      }
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
      t0 = performance.now();
      dx = 0;
      mode = "pending";
    };
    const onMove = (e: TouchEvent) => {
      if (mode === "idle" || mode === "y") return;
      const ddx = e.touches[0].clientX - x0;
      const ddy = e.touches[0].clientY - y0;
      if (mode === "pending") {
        if (Math.abs(ddx) < 10 && Math.abs(ddy) < 10) return;
        // Clearly sideways locks to a tab swipe; anything else is a normal scroll.
        mode = Math.abs(ddx) > Math.abs(ddy) * 1.3 ? "x" : "y";
        if (mode === "y") return;
        x0 = e.touches[0].clientX;
        m.style.transition = "none";
      }
      e.preventDefault();
      dx = e.touches[0].clientX - x0;
      const i = idx();
      const atEdge = (dx > 0 && i === 0) || (dx < 0 && i === TABS.length - 1);
      const shown = atEdge ? dx * 0.25 : dx;
      m.style.transform = `translateX(${shown}px)`;
      m.style.opacity = String(1 - Math.min(0.5, Math.abs(shown) / window.innerWidth));
    };
    const onEnd = () => {
      if (mode !== "x") {
        mode = "idle";
        return;
      }
      mode = "idle";
      const i = idx();
      const v = Math.abs(dx) / Math.max(1, performance.now() - t0);
      const next = dx < 0 ? i + 1 : i - 1;
      const far = Math.abs(dx) > window.innerWidth * 0.25 || (v > 0.35 && Math.abs(dx) > 40);
      if (!far || next < 0 || next >= TABS.length) return reset(true);
      const d = dx < 0 ? 1 : -1;
      m.style.transition = "transform 0.16s cubic-bezier(.4,0,1,1), opacity 0.16s ease";
      m.style.transform = `translateX(${-d * 35}%)`;
      m.style.opacity = "0";
      window.setTimeout(() => state.current.onSwitch(TABS[next].id, d), 150);
    };
    m.addEventListener("touchstart", onStart, { passive: true });
    m.addEventListener("touchmove", onMove, { passive: false });
    m.addEventListener("touchend", onEnd);
    m.addEventListener("touchcancel", onEnd);
    return () => {
      m.removeEventListener("touchstart", onStart);
      m.removeEventListener("touchmove", onMove);
      m.removeEventListener("touchend", onEnd);
      m.removeEventListener("touchcancel", onEnd);
    };
  }, [main, ready]);
}

function Shell() {
  const { data, ready } = useStore();
  const today = useToday(data.settings.dayStartHour);
  const [tab, setTab] = useState<Tab>("home");
  const main = useRef<HTMLElement>(null);
  /** Where the new tab slides in from: 1 = from the right, -1 = from the left, 0 = no slide. */
  const dir = useRef(0);
  const go = (t: Tab) => {
    dir.current = 0;
    setTab(t);
  };
  // Scroll to the top after the new tab has rendered, and slide it in after a swipe.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    const m = main.current;
    if (!m || !dir.current) return;
    m.style.transition = "none";
    m.style.transform = `translateX(${dir.current * 22}%)`;
    m.style.opacity = "0.4";
    void m.offsetWidth;
    m.style.transition = "transform 0.3s cubic-bezier(.2,.9,.25,1), opacity 0.25s ease";
    m.style.transform = "";
    m.style.opacity = "";
    dir.current = 0;
  }, [tab]);
  useSwipeTabs(main, ready, tab, (t, d) => {
    dir.current = d;
    setTab(t);
  });

  if (!ready) return <div className="boot" />;
  return (
    <>
      <main className="main" id="main" ref={main}>
        {tab === "home" && <HomeView today={today} goSettings={() => go("settings")} />}
        {tab === "progress" && <ProgressView today={today} />}
        {tab === "history" && <HistoryView today={today} />}
        {tab === "settings" && <SettingsView />}
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} className={tab === t.id ? "on" : ""} aria-current={tab === t.id ? "page" : undefined} onClick={() => go(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <RewardProvider>
          <Shell />
        </RewardProvider>
      </ToastProvider>
    </StoreProvider>
  );
}
