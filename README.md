# Comeback

A personal, mobile-first habit tracker for an exchange semester. You only track **done or not done**, and each check grows **today's tree**.

- **Today:** 7 habits, one tap each. Training lets you pick Gym, Swimming or your own sports (Volleyball, Hiking …). Create lets you pick "worked on content" and/or "published a video". Each check moves the tree through 6 stages (seed → sprout → sapling → young tree → tree → full tree with blossoms) and hangs a fruit in that habit's color.
- **Forest:** every day becomes a tree in a monthly calendar, sized by how much you did. Tap a day to fix it.
- **Goals:** semester goals (e.g. 36× Gym, 10× Swimming, 8 videos published) with progress bars. Each goal you reach brings an animal to your forest.
- **Settings:** turn habits on/off, manage your sports, change goal numbers, and back up your data.

There are no times, no streaks and no red "failed" states. The design notes are in [`docs/UX.md`](docs/UX.md).

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # domain tests (tree stages, goal counting, migration, day rollover)
npm run build        # static site in dist/ (deploy to Vercel, Netlify or GitHub Pages)
npm run build:single # one self-contained HTML file in dist-single/
```

On your phone, open the deployed URL and choose **Add to Home Screen**.

## Structure

React 18 + TypeScript + Vite. There's no backend: data is saved in `localStorage` behind a two-method store interface.

```
src/
  lib/date.ts        local days, 4:00 rollover, Monday weeks
  domain/            types, habits & goals, progress (tree stages, goal counts), migration   ← pure, tested
  data/              DataStore interface, LocalStore, StoreProvider
  components/        Tree (SVG), Sheet, Toast
  views/             Today, Forest, Goals, Settings
supabase/schema.sql  table for cloud sync later
legacy/              the earlier pixel-forest prototype
```

**Data model:** `days["2025-10-08"] = { training: ["gym", "sport:Volleyball"], spanish: ["done"], create: ["published"] }`. A habit is done when its list isn't empty. Data from the first, more detailed version is migrated automatically.

**Adding Supabase later:** run `supabase/schema.sql`, implement `DataStore` (`load`, `save`) with `@supabase/supabase-js`, add a magic-link sign-in, and swap the one line in `StoreProvider.tsx`.

## Accessibility

17px base text, touch targets of at least 56px, and contrast that meets WCAG AA in dark and light mode. State is shown with text and a check mark, never color alone. Toggles use `aria-pressed`, goal bars are real `progressbar`s, sheets move focus in and out, and reduced motion is respected. Every screen passes an axe-core scan with zero violations.

## Backups

Data lives only on the device: use **Settings → Backup** now and then.
