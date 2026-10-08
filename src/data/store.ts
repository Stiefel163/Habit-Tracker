import type { DayKey } from "../lib/date";
import type { AppData, DayNote, Entry, Settings } from "../domain/types";

/**
 * The only thing the UI knows about persistence.
 *
 * Today: LocalStore (localStorage, works offline, zero setup).
 * Later: a SupabaseStore implementing the same interface (see supabase/schema.sql
 * and README) can be swapped in inside StoreProvider without touching any view.
 */
export interface DataStore {
  /** Load everything once at start. Data volume is tiny (a few thousand rows a year). */
  load(): Promise<AppData>;
  upsertEntry(entry: Entry): Promise<void>;
  deleteEntry(id: string): Promise<void>;
  setNote(date: DayKey, text: string): Promise<DayNote | null>;
  saveSettings(settings: Settings): Promise<void>;
  /** Replace all data (backup import). */
  replaceAll(data: AppData): Promise<void>;
}

export function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);
}
