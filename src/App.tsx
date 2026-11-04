import { useEffect, useState } from "react";
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

function Shell() {
  const { data, ready } = useStore();
  const today = useToday(data.settings.dayStartHour);
  const [tab, setTab] = useState<Tab>("home");
  const go = (t: Tab) => {
    setTab(t);
    window.scrollTo(0, 0);
  };

  if (!ready) return <div className="boot" />;
  return (
    <>
      <main className="main" id="main">
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
