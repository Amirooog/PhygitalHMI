# PhygitalHMI — changelog

Version names: `LINE-MAJOR.MINOR.PATCH` (e.g. `TB-3.0.0`).

| Part | Meaning |
|---|---|
| **LINE** | Which prototype. `TB` Touch Baseline · `SK` Sliding Knob · `XP` experiments that never go to participants |
| **MAJOR** | Anything that changes a **task path**: where a control is, how many steps a task takes, what a control shows (label vs icon), gestures. **Trial data from different majors must not be pooled.** |
| **MINOR** | Visible change that leaves every task path intact: styling, new screens or options that are off by default, researcher tools. |
| **PATCH** | Bug fix. If a fix changes what a participant could do (e.g. a control that did not work), note it — trials run on the broken build for that task are invalid. |

Rules
- The build id is stamped into every trial and the CSV `build` column, together with theme and accent colour.
- Freeze a build before data collection starts: copy it to `releases/<id>-field/`, tag it, and change nothing until collection ends.
- Each app folder ships its `index.html` and `sw.js` together; the id in both must match.

## Earlier versions

TB-1.0.0 to TB-2.1.0 (20 Sep 2026) were built in the `cabin-hmi` repo. No participant data was collected on them.

## TB-3.0.0 — in progress
- Full rebuild in English (Persian to follow from the same tokens).
- Design direction D: persistent climate bar, side rail, map with matte-glass cards, dark and light themes with Auto, accent colour chosen in Settings.
- Climate: temperature scroll wheels (0.5° steps), icon tiles with level dashes, no ON/OFF text.
- Front/rear defrost are physical keys in both prototypes and are removed from the screen. Tasks T7 and T8 are dropped from the timed comparison (9 tasks remain).
- Top safe offset for the iPadOS status-bar blur, and a bottom offset with automatic fit for the installed app (Settings).
- Screens: Home, Navigation (search with on-screen keyboard, route preview, 40 s simulated drive, arrival), Media (Bluetooth / FM radio / USB, library, presets), Phone (recents, contacts, keypad, call screen), Climate, Vehicle (EV: drive modes Range/Everyday/Sport/Snow with regen, steering and ride; charging with limit, off-peak schedule, charge port), Settings.
- The car is an EV: battery level in the side rail, Vehicle in the dock.
- dev.3 checked headless: all 9 task end states reachable (T1–T6, T9–T11).
