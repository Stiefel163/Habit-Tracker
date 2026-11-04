# Comeback

A real-life RPG. Productive real-world actions earn XP, level up skills, fill weekly missions and level up your character, from **Level 1 Crook** to **Level 100 Mafia Boss**.

**Core loop:** do a real action → log it in a few seconds → get XP → level up a skill → progress weekly missions → level up your character.

## What's in it

- **Home:** level, rank and XP bar, your vision line, a **cookie jar card** that always shows one thing you've already done (tap *Another one ↻* for a random other), the Spanish streak with its 🛡 Streak Shield, weekly missions (⭐ per completed mission), quick log buttons and skill levels.
- **Skills:** 🦾 Strength, 🏊 Swimming, 🇪🇸 Spanish, 🎬 Creator, 🚗 Driving Theory, 🧠 Focus.
- **Quick logs** (each under 5 seconds):
  - Strength workout (optional split and duration), +50 XP
  - Swim (optional duration), +40 XP
  - **Spanish Day**: one question, *"What got better today?"*, +25 XP. Max one per day. It counts toward **100 Days of Spanish**.
  - **Publish Video**: *"What got better with this video?"*, +100 XP, on the **Road to 100 Videos**. Editing time is logged as Focus hours in the Creator category, so input (hours) and output (videos) stay separate.
  - **Bögen**: a stepper for completed practice sheets, +10 XP each.
  - **Focus hours**: logged afterwards (no timer), by category, 25 XP per hour, minimum 15 min.
- **Spanish streak with a Streak Shield:** missing one day uses the Shield and the streak survives. Missing again before it recharges (7 successful days) breaks only the current streak. Days, XP and entries are never lost.
- **Weekly missions** (Monday to Sunday, configurable): 3 stars is a GOOD WEEK, 4 a STRONG WEEK, 5 LOCKED IN, 6 a PERFECT WEEK with +200 bonus XP. Nothing is subtracted.
- **Achievements** come automatically from logged actions only.
- **Progress:** player level and rank ladder, skills, 100 Days of Spanish and Road to 100 Videos (each with its full "what got better" journey), focus stats with a "road to 1,000 hours" per category, weekly history, achievements, and the cookie jar.
- **History:** every logged action by day. Tap ⋯ to remove a mistake.
- **Rewards:** XP count-up, a filling skill bar, level-up / rank-up / mission / milestone moments, and an optional subtle chime and vibration. No negative XP, no loot boxes, no shame screens.

**Anti-gaming:** one workout, one swim and one Spanish day per calendar day. Focus XP comes from total time, so splitting a session earns nothing extra. Bögen count actual sheets.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # game-rule tests (XP, levels, missions, streak shield, migration)
npm run build        # static site in dist/ (GitHub Pages, Vercel, Netlify)
npm run build:single # one self-contained HTML file in dist-single/
```

## Structure

React 18 + TypeScript + Vite. Data lives in `localStorage` behind a two-method store interface (`load`, `save`), ready to swap for Supabase.

```
src/
  lib/date.ts          local days, 4:00 rollover, Monday weeks
  domain/types.ts      storage model: ActivityLog (Strength, Swim, SpanishDay, PublishedVideo, DrivingLog, FocusLog), Settings
  domain/rpg.ts        game rules, all derived from logs: XP, Player, Skill, WeeklyMission, StreakState, Achievement, rewards
  domain/migrate.ts    loads any earlier version and keeps the original under `legacy`
  data/                DataStore, LocalStore, StoreProvider
  components/          Sheet, Bar, Toast, Reward (overlay + chime), LogSheets (the six quick logs)
  views/               Home, Progress, History, Settings
```

Levels, skills, missions, streaks and achievements are **computed from the activity log**, never stored. They can't drift out of sync, and changing a weekly target updates the whole history consistently.

## Backups

Data lives only on the device: use **Settings → Copy backup** now and then. To move to a new phone or address, paste the backup under **Settings → Backup**.

## On your phone

The app is published automatically to **https://stiefel163.github.io/Habit-Tracker/** by `.github/workflows/deploy.yml` on every push to `main`. It tests, builds and deploys to GitHub Pages in about 1–2 minutes.

1. One time: repo **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. On the iPhone, open the address in **Safari → Share → Add to Home Screen**. It opens full-screen with its own icon. Android: Chrome → ⋮ → *Add to Home screen*.
3. Updates arrive by themselves: close and reopen the app after a push. Your data stays on the phone. The app also opens offline.
