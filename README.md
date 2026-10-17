# Comeback

A personal, mobile-first habit tracker for an exchange semester. You only track **done or not done**, and each check grows **today's tree**.

- **Today:** 8 habits. Most are one tap; a few ask one quick thing:
  - **Training:** pick Gym, Swimming or your own sports (Volleyball, Hiking …).
  - **Study:** add blocks of 15 / 30 / 45 / 60 / 90 / 120 min. They add up, so you get both time and number of sessions.
  - **Driving theory:** after each practice sheet (Bogen), tap **Passed** or **Not passed**. You see sheets today, the total, and how many of your last 10 you passed.
  - **Create:** "worked on content" and/or "published a video".
  - **Morning lock-in:** an if-then routine. When you wake up: out of bed → breakfast → start something productive, with no scrolling.

  Each habit done moves the tree through 6 stages (seed → sprout → sapling → young tree → tree → full tree with blossoms) and hangs a fruit in that habit's color.
- **Lock in:** built for cutting cheap dopamine (Reels/TikTok) with *Atomic Habits*, David Goggins and Duolingo mechanics:
  - **Streak with freezes:** a day counts at 3 checks (configurable). Every 7 days earns a ❄️ that saves one missed day, so only missing twice breaks it.
  - **30-day reset:** reel-free days out of 30 (*Dopamine Nation*). A slip doesn't reset you to zero.
  - **"I feel the urge to scroll":** turn the urge into a rep (15-min study block, one Bogen, Spanish lesson, push-ups, walk, cold shower or a 10-minute wait). Study, Bogen and Spanish also log the habit. Opening `…#urge` jumps straight here, so an iOS Shortcut can send you here whenever Instagram opens.
  - **Cookie jar** (Goggins): automatic wins (urges beaten, full trees, Bögen passed, goals) plus your own.
  - **Accountability mirror:** a 2-minute review Saturday to Monday. Your "one change" shows during the next week.
  - **Phone setup:** a one-time checklist (charger outside the bedroom, the one sec app for Instagram, grayscale on triple-click with auto-off for the camera, focus mode, one offline adventure a week).
  - **Identity, fuel and eras:** "I'm someone who locks in", a daily line of your own fuel (add your favorite lyrics in Settings), and eras named after Kanye's albums from *The College Dropout* to *Donda*, unlocked by votes (checks + urges beaten).
  - On Today: a 🔥 chip, your fuel line, minimum ("2-minute") versions under each habit, and a "Don't miss twice" tag on anything you skipped yesterday.
- **Forest:** every day becomes a tree in a monthly calendar, sized by how much you did. Tap a day to fix it.
- **Goals:** semester goals (e.g. 36× Gym, 10× Swimming, 8 videos published) with progress bars. Each goal you reach brings an animal to your forest.
- **Settings:** turn habits on/off, manage your sports, change goal numbers, and back up your data.

Only study time and Bögen are counted; everything else is done or not done. There are no streaks and no red "failed" states. The design notes are in [`docs/UX.md`](docs/UX.md).

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

**Data model:** `days["2025-10-08"] = { training: ["gym", "sport:Volleyball"], study: ["45", "30"], driving: ["pass", "fail"], spanish: ["done"], create: ["published"] }`. A habit is done when its list isn't empty. Data from the first, more detailed version is migrated automatically.

**Adding Supabase later:** run `supabase/schema.sql`, implement `DataStore` (`load`, `save`) with `@supabase/supabase-js`, add a magic-link sign-in, and swap the one line in `StoreProvider.tsx`.

## Accessibility

17px base text, touch targets of at least 56px, and contrast that meets WCAG AA in dark and light mode. State is shown with text and a check mark, never color alone. Toggles use `aria-pressed`, goal bars are real `progressbar`s, sheets move focus in and out, and reduced motion is respected. Every screen passes an axe-core scan with zero violations.

## Backups

Data lives only on the device: use **Settings → Backup** now and then.
