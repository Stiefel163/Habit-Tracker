# Comeback

A personal, mobile-first habit tracker for an exchange semester, built to be **as lean as possible**: you only ever see the few things that matter right now.

- **Modes (seasons):** 🎓 **Exam mode** (study 4×90 min, sleep on time, clean day), 🧱 **Build mode** (morning lock-in, training, study 2×60 min) and 🏔️ **Off-grid** (clean day, training). Switch in one tap; everything outside the mode's focus is paused, with no guilt. You can edit the focus (max 4) and the study blocks per mode.
- **Today:** a tree that grows with your focus (study grows it block by block), 2–4 focus rows, an "Urge to scroll? Turn it into a rep" button, and "Did something else too?" to log anything outside your focus.
- **Locked in** = all focus done. That's the one daily question.
- **Progress:** Kanye eras as your level (*The College Dropout* → *Donda*, one step per locked-in day), a streak where a ❄️ forgives one missed day (never miss twice), a forest calendar with one tree per day, and Goggins' cookie jar.
- **Adding habits back:** in Build mode, after 10 locked-in days out of the last 14, the app offers the next habit (supplements first, then driving theory, Spanish, create).
- **Sunday check-in:** one optional line, "one change for next week", shown all week.
- **Settings:** your clean-day rule (private, only "Clean day" shows on screen), fuel lines, phone setup checklist, habits, sports, appearance and backup.

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
  domain/            types, habits, modes & focus (locked in, streak, eras, ladder), progress, migration   ← pure, tested
  data/              DataStore interface, LocalStore, StoreProvider
  components/        Tree (SVG), Sheet, Toast, Urge (urge → rep, phone setup list)
  views/             Today, Progress (ForestView), Settings
supabase/schema.sql  table for cloud sync later
legacy/              the earlier pixel-forest prototype
```

**Data model:** `days["2025-10-08"] = { training: ["gym", "sport:Volleyball"], study: ["45", "30"], driving: ["pass", "fail"], spanish: ["done"], create: ["published"] }`. A habit is done when its list isn't empty. Data from the first, more detailed version is migrated automatically.

**Adding Supabase later:** run `supabase/schema.sql`, implement `DataStore` (`load`, `save`) with `@supabase/supabase-js`, add a magic-link sign-in, and swap the one line in `StoreProvider.tsx`.

## Accessibility

17px base text, touch targets of at least 56px, and contrast that meets WCAG AA in dark and light mode. State is shown with text and a check mark, never color alone. Toggles use `aria-pressed`, goal bars are real `progressbar`s, sheets move focus in and out, and reduced motion is respected. Every screen passes an axe-core scan with zero violations.

## Backups

Data lives only on the device: use **Settings → Backup** now and then.
