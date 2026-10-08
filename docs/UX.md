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
| **Forest** | The pixel world your sessions build, this week's progress toward a strong week, and the residents. |
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

## The forest (motivation layer)

A habit tracker alone only counts. The forest makes the effort *visible as something you build*. It has two rules that keep it from turning into punishment:

1. **It only grows.** Every session adds something, and nothing is ever taken away. A bad week builds nothing, but the next session picks up where you left off.
2. **Each area builds its own part**, so you can see where the effort went:
   - Training sessions grow a spruce grove, Spanish a maple grove and driving theory a birch grove. There's a new tree every 4 sessions, up to 6 per grove; after that the trees keep growing taller.
   - Create sessions build a cabin by the lake in 6 steps: foundation → walls → door & window → roof → chimney & warm light → porch.
   - Every **published video** adds a light to the string lights on the cabin. Publishing is the milestone, so it gets the most visible reward.
   - Supplement days and reel-free mornings plant wildflowers.
   - Weeks with enough on-rhythm nights brighten the northern lights.
   - A **strong week** (3 weekly targets hit) brings a new Canadian animal, in a fixed order: squirrel, hare, beaver, fox, loon, eagle, deer, wolf, elk, black bear, moose, grizzly. That's one per week for the rest of the semester. Animals arrive young and grow up with the next strong week. Four strong weeks later they have young.

The Today screen shows one line connecting the week to its reward ("2/3 targets → 🫎 Moose moves in"). When a log builds something, a toast says what it built. Seasons and day/night follow the real clock: maples turn red in autumn, snow falls in winter, bears hibernate in a den underground and loons migrate.

## Deliberately left out

Exercise-level workout logs, XP numbers, losing progress, badges, confetti, quotes, streak counters, notifications, task lists and deadlines, and more than one chart per screen.
