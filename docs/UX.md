# Comeback: UX decisions

The user knows what to do. The problem is **execution**: too many decisions, overwhelm, and procrastination in bed. Every feature below had to answer one question: *does this help him actually do the behavior?*

## Principles

1. **Logging in under 5 seconds.** Tap a card, and a bottom sheet opens with the last choices pre-selected. Most logs take two taps: pick the option, then Save. Rest day, "Took all" supplements and No-Reels each take one tap.
2. **Weekly beats daily.** Strength 3×, swim 1×, Spanish 4×, driving 5×, create 3×. None of these is daily, so the app counts *days per week* toward a target and never shows a daily streak.
3. **Nothing is red.** A habit you haven't logged is a neutral empty circle. "Not today" is a dashed circle. Partly done is a soft brass half-circle. A rest day is slate and counts as recovery, not failure.
4. **Restart is the default.** After a quiet day the top line says "Fresh start. Log one thing and today counts." There are no streak counters to lose.
5. **Remove decisions.** The line under the date names *one* next step: the weekly habit furthest behind schedule ("Next: Driving theory. 3 more this week, 4 days left."). That is the only coaching in the app.
6. **Undo, don't confirm.** Every log shows a toast with Undo. There are no "are you sure?" dialogs.

## Information architecture

| Tab | Job |
| --- | --- |
| **Today** | Log. Has 7 cards, a progress ring (logged / active) and the one-line focus. At the bottom is "One thing from today". Arrows step back to fill in a missed day. |
| **Week** | Am I on track? Shows targets with pips (2 / 3), daily basics (sleep on rhythm, supplements, no-reels) and a 7-day icon calendar. |
| **Month** | Am I getting more consistent? Shows a heatmap, a sleep-rhythm chart, totals compared with last month, and the Memories timeline. |
| **Settings** | Targets, active habits, sleep target and tolerance, supplements, the no-reels rule, day rollover, appearance and backup. |

## Habit-specific decisions

- **Sleep** is logged on the morning you wake up. It records the time you got into bed and the time you got out of bed, with optional actual sleep. A night counts as *on rhythm* only if **both** times are within ±30 min of 23:00 / 07:00, so 03:00–11:00 is 8 hours but not on rhythm. The month chart draws each night as a bar from bed to wake against the target bands, which shows bedtime trend, wake trend, duration and consistency in one picture.
- **Training** is one card. Strength, Swimming, Other and Rest are big tiles. Strength remembers your last split and duration. A real session replaces a rest day logged earlier that day.
- **Spanish** sessions under 10 min are saved but don't count toward the week. The sheet says so instead of silently dropping them.
- **Driving theory** takes minutes, questions, or both.
- **Create** treats *Post* as a separate event with a "videos published" count, shown on Week and Month, because publishing is the milestone that matters.
- **Supplements** has one card. All active items are pre-checked, so it's one tap on a normal day.
- **No Reels After Waking** is yes/no with the rule shown in the sheet. "Scrolled first" is logged as neutral and the toast says "Tomorrow is a new morning."
- **Day rollover at 4:00**, so a Spanish session at 00:30 counts for the evening it belongs to.

## Deliberately left out

Exercise-level workout logs, XP, badges, confetti, quotes, streak counters, notifications, task lists and deadlines, and more than one chart per screen.
