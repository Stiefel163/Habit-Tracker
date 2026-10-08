import { emptyData, migrateSettings } from "../domain/defaults";
import type { AppData, DayNote, Entry, Settings } from "../domain/types";
import type { DayKey } from "../lib/date";
import type { DataStore } from "./store";

const KEY = "comeback:v1";

/** localStorage-backed store. Keeps a full copy in memory and writes through. */
export class LocalStore implements DataStore {
  private data: AppData = emptyData();

  async load(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AppData>;
        this.data = {
          entries: Array.isArray(parsed.entries) ? parsed.entries : [],
          notes: Array.isArray(parsed.notes) ? parsed.notes : [],
          settings: migrateSettings(parsed.settings),
        };
      }
    } catch {
      // Storage blocked or corrupt: start empty rather than crash.
    }
    return structuredClone(this.data);
  }

  async upsertEntry(entry: Entry) {
    const i = this.data.entries.findIndex((e) => e.id === entry.id);
    if (i >= 0) this.data.entries[i] = entry;
    else this.data.entries.push(entry);
    this.persist();
  }

  async deleteEntry(id: string) {
    this.data.entries = this.data.entries.filter((e) => e.id !== id);
    this.persist();
  }

  async setNote(date: DayKey, text: string) {
    const clean = text.trim();
    this.data.notes = this.data.notes.filter((n) => n.date !== date);
    let note: DayNote | null = null;
    if (clean) {
      note = { date, text: clean, updatedAt: new Date().toISOString() };
      this.data.notes.push(note);
    }
    this.persist();
    return note;
  }

  async saveSettings(settings: Settings) {
    this.data.settings = settings;
    this.persist();
  }

  async replaceAll(data: AppData) {
    this.data = { entries: data.entries ?? [], notes: data.notes ?? [], settings: migrateSettings(data.settings) };
    this.persist();
  }

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Quota or privacy mode: the in-memory copy still works for this session.
    }
  }
}
