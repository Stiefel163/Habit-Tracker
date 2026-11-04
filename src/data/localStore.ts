import { emptyData } from "../domain/defaults";
import { normalize } from "../domain/migrate";
import type { AppData } from "../domain/types";
import type { DataStore } from "./store";

const KEY = "comeback:v3";
const OLD_KEYS = ["comeback:v2", "comeback:v1"];

export class LocalStore implements DataStore {
  async load(): Promise<AppData> {
    try {
      // Older versions stay untouched under their own keys, so a migration can never destroy them.
      const raw = localStorage.getItem(KEY) ?? OLD_KEYS.map((k) => localStorage.getItem(k)).find(Boolean);
      if (raw) return normalize(JSON.parse(raw));
    } catch {
      // Storage blocked or unreadable: start fresh instead of crashing.
    }
    return emptyData();
  }

  async save(data: AppData) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Quota or private mode: the in-memory copy still works for this session.
    }
  }
}
