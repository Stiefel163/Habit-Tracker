# Comeback

A personal, mobile-first habit tracker for an exchange semester: sleep rhythm, training, Spanish, driving theory, content creation, supplements and no reels after waking. It's built for **fast logging** and **weekly consistency**, not streaks. The design reasoning is in [`docs/UX.md`](docs/UX.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # domain logic tests (sleep rhythm, weekly counts, day rollover)
npm run build        # static site in dist/ (deploy to Vercel, Netlify or GitHub Pages)
npm run build:single # one self-contained HTML file in dist-single/
```

On the phone, open the deployed URL and choose **Add to Home Screen**. The app then runs full-screen like a native app.

## Stack and structure

React 18 + TypeScript + Vite. There's no backend yet: data is saved in `localStorage` behind a small store interface.

```
src/
  lib/          date + clock helpers (local days, 4:00 rollover, Monday weeks)
  domain/       types, defaults, habit definitions, sleep evaluation, stats   ← pure, tested
  data/         DataStore interface, LocalStore, React StoreProvider
  components/   UI primitives (Sheet, Chips, Stepper, Switch, Ring, Toast)
  sheets/       the fast logging sheets, one per habit type
  views/        Today, Week, Month, Settings
supabase/schema.sql   tables + row-level security for cloud sync later
legacy/               the earlier pixel-forest prototype
```

### Data model

Every log is an `Entry`: `date`, `habit`, `subtype`, `detail`, `durationMin`, `value`, `state` (`done | partial | rest | skipped`), `note`, `data` (sleep times, supplements taken). Multiple entries per habit per day are allowed. Weekly targets count **days**. States that depend on settings (sleep tolerance, Spanish minimum, supplement list) are recomputed on read, so changing a setting updates history consistently.

### Adding Supabase later

1. Create a Supabase project and run `supabase/schema.sql`.
2. `npm i @supabase/supabase-js`, then write `src/data/supabaseStore.ts` implementing `DataStore` (`load`, `upsertEntry`, `deleteEntry`, `setNote`, `saveSettings`, `replaceAll`). Map `durationMin` ↔ `duration_min`.
3. Add a sign-in screen (magic link is enough) and swap the one line in `StoreProvider.tsx`:
   `const store: DataStore = new LocalStore();`
4. Import your existing data once via **Settings → Data → Restore** with a local backup.

## Backups

All data is stored on the device. Use **Settings → Data → Download backup** now and then, and always before switching phones or clearing the browser.
