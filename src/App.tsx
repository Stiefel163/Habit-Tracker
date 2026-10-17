import { useEffect, useMemo, useRef, useState } from "react";
import { ToastProvider, useToast } from "./components/Toast";
import { StoreProvider, useStore } from "./data/StoreProvider";
import { dayProgress, goalStates } from "./domain/progress";
import { appToday, type DayKey } from "./lib/date";
import { ForestView } from "./views/ForestView";
import { GoalsView } from "./views/GoalsView";
import { SettingsView } from "./views/SettingsView";
import { TodayView } from "./views/TodayView";
import { LockInView } from "./views/LockInView";
import { UrgeSheet } from "./components/LockIn";
import { computeStreak } from "./domain/lockin";

type Tab = "today" | "lockin" | "forest" | "goals" | "settings";

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
    id: "lockin",
    label: "Lock in",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M12 21c-4 0-7-2.7-7-6.6 0-3.4 2.4-5.4 3.8-7.4.4 1.8 1.3 2.8 2.4 3.3C11.7 7 12.6 4.6 14.6 3c.1 3 3.4 5.5 4.2 8.6.2.9.2 1.8.2 2.8C19 18.3 16 21 12 21z" />
      </svg>
    ),
  },
  {
    id: "forest",
    label: "Forest",
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
    id: "goals",
    label: "Goals",
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M6 21V4M6 4h11l-2.5 4L17 12H6" />
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

/** A short, friendly message when something is achieved. Nothing ever scolds. */
function useCelebrations(date: DayKey, today: DayKey) {
  const { data, ready } = useStore();
  const toast = useToast();
  const reached = useMemo(() => goalStates(data).filter((g) => g.reached), [data]);
  const full = dayProgress(data.days[date], data.settings).p >= 1;
  const streak = useMemo(() => computeStreak(data, today), [data, today]);
  const prev = useRef<{ goals: string[]; full: boolean; date: DayKey; met: boolean } | null>(null);

  useEffect(() => {
    if (!ready) return;
    const before = prev.current;
    prev.current = { goals: reached.map((g) => g.id), full, date, met: streak.todayMet };
    if (!before) return;
    const fresh = reached.find((g) => !before.goals.includes(g.id));
    if (fresh) toast(`${fresh.animal} Goal reached: ${fresh.target}× ${fresh.label}! A ${fresh.animalName.toLowerCase()} moved into your forest.`);
    else if (full && !before.full && before.date === date) toast("🌳 Full tree! Everything done today.");
    else if (streak.todayMet && !before.met) toast(`🔥 ${streak.days}-day streak. Stay hard.`);
  }, [reached, full, date, ready, toast, streak]);
}

function Shell() {
  const { data, ready } = useStore();
  const s = data.settings;
  const today = useToday(s.dayStartHour);
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState<DayKey>(today);
  const [urge, setUrge] = useState(false);
  useCelebrations(date, today);

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
        {tab === "today" && <TodayView date={date} today={today} setDate={setDate} goLockIn={() => go("lockin")} />}
        {tab === "lockin" && (
          <LockInView
            today={today}
            onUrge={() => setUrge(true)}
            openDay={(d) => {
              setDate(d);
              go("today");
            }}
          />
        )}
        {tab === "forest" && (
          <ForestView
            today={today}
            openDay={(d) => {
              setDate(d);
              go("today");
            }}
          />
        )}
        {tab === "goals" && <GoalsView today={today} />}
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
