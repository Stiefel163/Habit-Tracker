import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { emptyData } from "../domain/defaults";
import type { ActivityLog, AppData, Settings } from "../domain/types";
import { LocalStore } from "./localStore";
import type { DataStore } from "./store";

/** A log as the UI creates it; id and timestamp are added by the store. */
export type NewLog = ActivityLog extends infer L ? (L extends ActivityLog ? Omit<L, "id" | "at"> : never) : never;

interface StoreApi {
  data: AppData;
  ready: boolean;
  /** Save one real action. Returns the data before and after, for the reward screen. */
  addLog(log: NewLog): { before: AppData; after: AppData; log: ActivityLog };
  updateLog(id: string, patch: Partial<ActivityLog>): void;
  removeLog(id: string): void;
  updateSettings(fn: (s: Settings) => Settings): void;
  update(fn: (d: AppData) => AppData): void;
  replaceAll(d: AppData): void;
}

const Ctx = createContext<StoreApi | null>(null);

// Swap this line for a SupabaseStore later. Nothing else changes.
const store: DataStore = new LocalStore();

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

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

  const addLog = useCallback(
    (l: NewLog) => {
      const before = ref.current;
      const log = { ...l, id: newId(), at: new Date().toISOString() } as ActivityLog;
      const after = { ...before, logs: [...before.logs, log] };
      commit(after);
      return { before, after, log };
    },
    [commit],
  );
  const updateLog = useCallback(
    (id: string, patch: Partial<ActivityLog>) =>
      commit({ ...ref.current, logs: ref.current.logs.map((l) => (l.id === id ? ({ ...l, ...patch } as ActivityLog) : l)) }),
    [commit],
  );
  const removeLog = useCallback((id: string) => commit({ ...ref.current, logs: ref.current.logs.filter((l) => l.id !== id) }), [commit]);
  const updateSettings = useCallback((fn: (s: Settings) => Settings) => commit({ ...ref.current, settings: fn(ref.current.settings) }), [commit]);
  const update = useCallback((fn: (d: AppData) => AppData) => commit(fn(ref.current)), [commit]);
  const replaceAll = useCallback((d: AppData) => commit(d), [commit]);

  const api = useMemo(
    () => ({ data, ready, addLog, updateLog, removeLog, updateSettings, update, replaceAll }),
    [data, ready, addLog, updateLog, removeLog, updateSettings, update, replaceAll],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
