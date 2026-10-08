import type { AppData } from "../domain/types";

/**
 * The only thing the UI knows about persistence. Data is tiny (one small object per day),
 * so the whole document is loaded once and saved on change.
 *
 * Today: LocalStore. Later: a SupabaseStore with the same two methods
 * (see supabase/schema.sql) can be swapped in inside StoreProvider.
 */
export interface DataStore {
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
}
