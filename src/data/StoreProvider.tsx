import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { emptyData } from "../domain/defaults";
import type { AppData, Entry, Settings } from "../domain/types";
import type { DayKey } from "../lib/date";
import { LocalStore } from "./localStore";
import { newId, type DataStore } from "./store";

export type NewEntry = Omit<Entry, "id" | "createdAt" | "updatedAt"> & { id?: string };

interface StoreApi {
  data: AppData;
  ready: boolean;
  /** Insert or update one session. Returns the saved entry. */
  saveEntry(e: NewEntry): Entry;
  removeEntry(id: string): void;
  /** Replace all entries of one habit on one day (sleep, supplements, no-reels are one per day). */
  setSingle(e: NewEntry): { removed: Entry[]; added: Entry };
  /** Put back entries removed by an action (used by Undo). */
  restore(remove: Entry[], add: Entry[]): void;
  setNote(date: DayKey, text: string): void;
  updateSettings(fn: (s: Settings) => Settings): void;
  importData(d: AppData): void;
}

const Ctx = createContext<StoreApi | null>(null);

// Swap this line for a SupabaseStore later. Nothing else changes.
const store: DataStore = new LocalStore();

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setDataState] = useState<AppData>(emptyData);
  const [ready, setReady] = useState(false);
  const ref = useRef(data);
  const commit = (next: AppData) => {
    ref.current = next;
    setDataState(next);
  };

  useEffect(() => {
    store.load().then((d) => {
      commit(d);
      setReady(true);
    });
  }, []);

  const saveEntry = useCallback((e: NewEntry) => {
    const d = ref.current;
    const now = new Date().toISOString();
    const existing = e.id ? d.entries.find((x) => x.id === e.id) : undefined;
    const full: Entry = { ...e, id: e.id ?? newId(), createdAt: existing?.createdAt ?? now, updatedAt: now };
    void store.upsertEntry(full);
    commit({ ...d, entries: existing ? d.entries.map((x) => (x.id === full.id ? full : x)) : [...d.entries, full] });
    return full;
  }, []);

  const removeEntry = useCallback((id: string) => {
    void store.deleteEntry(id);
    commit({ ...ref.current, entries: ref.current.entries.filter((x) => x.id !== id) });
  }, []);

  const setSingle = useCallback((e: NewEntry) => {
    const d = ref.current;
    const now = new Date().toISOString();
    const old = d.entries.filter((x) => x.date === e.date && x.habit === e.habit);
    old.forEach((x) => void store.deleteEntry(x.id));
    const full: Entry = { ...e, id: newId(), createdAt: old[0]?.createdAt ?? now, updatedAt: now };
    void store.upsertEntry(full);
    commit({ ...d, entries: [...d.entries.filter((x) => !old.includes(x)), full] });
    return { removed: old, added: full };
  }, []);

  const restore = useCallback((remove: Entry[], add: Entry[]) => {
    const ids = new Set(remove.map((x) => x.id));
    remove.forEach((x) => void store.deleteEntry(x.id));
    add.forEach((x) => void store.upsertEntry(x));
    commit({ ...ref.current, entries: [...ref.current.entries.filter((x) => !ids.has(x.id)), ...add] });
  }, []);

  const setNote = useCallback((date: DayKey, text: string) => {
    void store.setNote(date, text);
    const clean = text.trim();
    const d = ref.current;
    commit({
      ...d,
      notes: [...d.notes.filter((n) => n.date !== date), ...(clean ? [{ date, text: clean, updatedAt: new Date().toISOString() }] : [])],
    });
  }, []);

  const updateSettings = useCallback((fn: (s: Settings) => Settings) => {
    const next = fn(ref.current.settings);
    void store.saveSettings(next);
    commit({ ...ref.current, settings: next });
  }, []);

  const importData = useCallback((incoming: AppData) => {
    void store.replaceAll(incoming).then(() => store.load().then(commit));
  }, []);

  const api = useMemo(
    () => ({ data, ready, saveEntry, removeEntry, setSingle, restore, setNote, updateSettings, importData }),
    [data, ready, saveEntry, removeEntry, setSingle, restore, setNote, updateSettings, importData],
  );
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useStore(): StoreApi {
  const v = useContext(Ctx);
  if (!v) throw new Error("useStore must be used inside StoreProvider");
  return v;
}
