import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { emptyData } from "../domain/defaults";
import type { AppData, HabitId, Settings } from "../domain/types";
import type { DayKey } from "../lib/date";
import { LocalStore } from "./localStore";
import type { DataStore } from "./store";

interface StoreApi {
  data: AppData;
  ready: boolean;
  /** Set what was done for one habit on one day. An empty list means "not done". */
  setHabit(date: DayKey, habit: HabitId, items: string[]): void;
  updateSettings(fn: (s: Settings) => Settings): void;
  replaceAll(d: AppData): void;
}

const Ctx = createContext<StoreApi | null>(null);

// Swap this line for a SupabaseStore later. Nothing else changes.
const store: DataStore = new LocalStore();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const ref = useRef(data);
  const commit = useCallback((next: AppData) => {
    ref.current = next;
    setData(next);
    void store.save(next);
  }, []);

  useEffect(() => {
    store.load().then((d) => {
      ref.current = d;
      setData(d);
      setReady(true);
    });
  }, []);

  const setHabit = useCallback(
    (date: DayKey, habit: HabitId, items: string[]) => {
      const d = ref.current;
      const log = { ...(d.days[date] ?? {}) };
      if (items.length) log[habit] = items;
      else delete log[habit];
      const days = { ...d.days };
      if (Object.keys(log).length) days[date] = log;
      else delete days[date];
      commit({ ...d, days });
    },
    [commit],
  );

  const updateSettings = useCallback((fn: (s: Settings) => Settings) => commit({ ...ref.current, settings: fn(ref.current.settings) }), [commit]);
  const replaceAll = useCallback((d: AppData) => commit(d), [commit]);

  const api = useMemo(() => ({ data, ready, setHabit, updateSettings, replaceAll }), [data, ready, setHabit, updateSettings, replaceAll]);
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
