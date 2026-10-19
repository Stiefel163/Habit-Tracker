import { useEffect, useMemo, useRef, useState } from "react";
import { ToastProvider, useToast } from "./components/Toast";
import { StoreProvider, useStore } from "./data/StoreProvider";
import { appToday, type DayKey } from "./lib/date";
import { ForestView } from "./views/ForestView";
import { SettingsView } from "./views/SettingsView";
import { TodayView } from "./views/TodayView";
import { UrgeSheet } from "./components/Urge";
import { computeStreak, eraOf, lockedInDays } from "./domain/focus";

type Tab = "today" | "forest" | "settings";

const ICON_PROPS = { viewBox: "0 0 24 24", "aria-hidden": true } as const;
const TABS: { id: Tab; label: string; icon: JSX.Element }[] = [
  {
    id: "today",
    label: "Today",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 21v-7" />
        <path d="M12 14c-4 0-6-3-6-6 3 0 6 2 6 6zM12 12c0-4 2.5-7 6.5-7 0 4-2.5 7-6.5 7z" />
      </svg>
    ),
  },
  {
    id: "forest",
    label: "Progress",
    icon: (
      <svg {...ICON_PROPS}>
        <circle cx="8" cy="9" r="4.5" />
        <path d="M8 13.5V20" />
        <circle cx="16.5" cy="11" r="3.5" />
        <path d="M16.5 14.5V20M4 20h16" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg {...ICON_PROPS}>
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

/** A short message when you lock in or reach a new era. Nothing ever scolds. */
function useCelebrations(today: DayKey) {
  const { data, ready } = useStore();
  const toast = useToast();
  const streak = useMemo(() => computeStreak(data, today), [data, today]);
  const era = useMemo(() => eraOf(lockedInDays(data, today)).index, [data, today]);
  const prev = useRef<{ met: boolean; era: number } | null>(null);

  useEffect(() => {
    if (!ready) return;
    const before = prev.current;
    prev.current = { met: streak.todayMet, era };
    if (!before) return;
    if (era > before.era) toast(`New era: ${eraOf(lockedInDays(data, today)).era.name}. Stay hard.`);
    else if (streak.todayMet && !before.met) toast(`🔥 Locked in. ${streak.days}-day streak.`);
  }, [streak, era, ready, toast, data, today]);
}

function Shell() {
  const { data, ready } = useStore();
  const s = data.settings;
  const today = useToday(s.dayStartHour);
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState<DayKey>(today);
  const [urge, setUrge] = useState(false);
  useCelebrations(today);

  // Deep link: an iOS Shortcut can open “…#urge” whenever Instagram is opened.
  useEffect(() => {
    const check = () => {
      if (window.location.hash === "#urge") {
        setUrge(true);
        try {
          history.replaceState(null, "", window.location.pathname + window.location.search);
        } catch {
          // Some embedded viewers block history changes; the sheet still opens.
        }
      }
    };
    check();
    window.addEventListener("hashchange", check);
    return () => window.removeEventListener("hashchange", check);
  }, []);

  // Follow the calendar when the day rolls over, unless you're looking at a past day on purpose.
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

  const go = (t: Tab) => {
    if (t === "today" && tab === "today") setDate(today);
    setTab(t);
    window.scrollTo(0, 0);
  };

  if (!ready) return <div className="boot" />;

  return (
    <>
      <main className="main" id="main">
        {tab === "today" && <TodayView date={date} today={today} setDate={setDate} onUrge={() => setUrge(true)} />}
        {tab === "forest" && (
          <ForestView
            today={today}
            openDay={(d) => {
              setDate(d);
              go("today");
            }}
          />
        )}
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
      {urge && <UrgeSheet date={today} onClose={() => setUrge(false)} />}
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
