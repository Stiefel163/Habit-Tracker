import { useEffect, useMemo, useRef, useState } from "react";
import { ToastProvider, useToast } from "./components/Toast";
import { computeWorld, worldChange, type World } from "./domain/world";
import { StoreProvider, useStore } from "./data/StoreProvider";
import { appToday, type DayKey } from "./lib/date";
import { ForestView } from "./views/ForestView";
import { MonthView } from "./views/MonthView";
import { SettingsView } from "./views/SettingsView";
import { TodayView } from "./views/TodayView";
import { WeekView } from "./views/WeekView";

type Tab = "today" | "forest" | "week" | "month" | "settings";

const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  {
    id: "today",
    label: "Today",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" />
        <path d="M8.5 12.2l2.4 2.4 4.6-4.8" />
      </svg>
    ),
  },
  {
    id: "forest",
    label: "Forest",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 3l-5 8h3l-4 6h12l-4-6h3z" />
        <path d="M9 17v4M17 9l-3.5 5H16l-3 4h8l-3-4h2.5z" />
      </svg>
    ),
  },
  {
    id: "week",
    label: "Week",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 18V12M9.7 18V8M14.3 18v-7M19 18V6" />
      </svg>
    ),
  },
  {
    id: "month",
    label: "Month",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="15" rx="3" />
        <path d="M4 10h16M9 3v4M15 3v4" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
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

function Shell() {
  const { data, ready } = useStore();
  const s = data.settings;
  const today = useToday(s.dayStartHour);
  const [tab, setTab] = useState<Tab>("today");
  const toast = useToast();

  // Celebrate what the last log built (new animal, tree, cabin step …). Never on first load.
  const world = useMemo(() => computeWorld(data.entries, s, today), [data.entries, s, today]);
  const prevWorld = useRef<World | null>(null);
  useEffect(() => {
    if (!ready) return;
    const prev = prevWorld.current;
    prevWorld.current = world;
    if (!prev) return;
    const msg = worldChange(prev, world);
    if (msg) {
      const t = window.setTimeout(() => toast(msg), 2300);
      return () => window.clearTimeout(t);
    }
  }, [world, ready, toast]);
  const [date, setDate] = useState<DayKey>(today);

  // When the day rolls over, follow it (unless the user is looking at the past on purpose).
  const [lastToday, setLastToday] = useState(today);
  if (today !== lastToday) {
    if (date === lastToday) setDate(today);
    setLastToday(today);
  }

  useEffect(() => {
    const root = document.documentElement;
    if (s.appearance === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", s.appearance);
  }, [s.appearance]);

  const openDay = (d: DayKey) => {
    setDate(d);
    setTab("today");
    window.scrollTo(0, 0);
  };

  if (!ready) return <div className="boot" />;

  return (
    <>
      <main className="main">
        {tab === "today" && (
          <TodayView date={date} today={today} setDate={setDate} goSettings={() => setTab("settings")} goForest={() => setTab("forest")} world={world} />
        )}
        {tab === "forest" && <ForestView today={today} />}
        {tab === "week" && <WeekView today={today} openDay={openDay} />}
        {tab === "month" && <MonthView today={today} openDay={openDay} />}
        {tab === "settings" && <SettingsView />}
      </main>
      <nav className="tabbar" aria-label="Sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "on" : ""}
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => {
              if (t.id === "today" && tab === "today") setDate(today);
              setTab(t.id);
              window.scrollTo(0, 0);
            }}
          >
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
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}
