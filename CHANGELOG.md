# PhygitalHMI — changelog

Version names: `LINE-MAJOR.MINOR.PATCH` (e.g. `TB-3.0.0`).

| Part | Meaning |
|---|---|
| **LINE** | Which prototype. `TB` Touch Baseline · `SK` Sliding Knob (app lines SK1, SK2 and SK3) · `XP` experiments that never go to participants |
| **MAJOR** | Anything that changes a **task path**: where a control is, how many steps a task takes, what a control shows (label vs icon), gestures. **Trial data from different majors must not be pooled.** |
| **MINOR** | Visible change that leaves every task path intact: styling, new screens or options that are off by default, researcher tools. |
| **PATCH** | Bug fix. If a fix changes what a participant could do (e.g. a control that did not work), note it — trials run on the broken build for that task are invalid. |

Rules
- The build id is stamped into every trial and the CSV `build` column, together with theme and accent colour.
- Freeze a build before data collection starts: `tools/freeze.sh <app>` copies it with shared/ to `releases/<id>/`; change nothing in a frozen build until collection ends (fixes get a new version).
- Each app folder ships its `index.html` and `sw.js` together; the id in both must match.

## SK-3.0.0 (20 Oct 2026, frozen) — new app line SK3
Redesign after the 19 Oct test (TB → SK1 → SK2, 8 participants), from Amir's wireframe of 20 Oct.
- **Zone bar replaces the dock and the climate bar.** Five pills sit over the five knob zones (equal fifths of the screen): Driver temp · zone 2 · zone 3 · zone 4 · Passenger temp. Pills show live values; the active pill grows and lifts. Tapping a pill opens its page (touch still works).
- **Temperature colour:** temperature pills and their dial blend from light blue (16°) through neutral (22°) to light red (28°) at every 0.5° step; a side that is off is grey.
- **Dial kept from SK2** (quarter circle at the ends, half circle in the middle, three rings, spring motion); it now rises from the top edge of the zone bar.
- **Home:** media card · app tiles (Phone, Charging, Climate, Vehicle, Settings) · map. Home button in the rail under Lock / Unlock.
- **Customizable zones 2–4** (parked only), defaults Drive mode · Media · Phone. Options: Drive mode, Media, Phone (favourites, call / end), Navigation, Autopark (start < 10 km/h), Driver assist (gap, ACC, lane keep; Off only parked), Ambient light, Airflow & defrost, Windows & sunroof, Seat & massage. SK2's seat ventilation slot is dropped.
- Shared code: optional hooks in `HMI.extend` (`bar`, `home`, `railEnd`), `HMI.act()`, contacts in `HMI.data`; TB, SK1 and SK2 are unchanged. Researcher: SK3 trials counted in the participants list and CSV (`trials_SK3`); order label `SK3`.

## SK-2.2.1 (19 Oct 2026, frozen)
- Dial icon and label are now HTML over the dial instead of SVG text (iPad Safari did not reliably turn icon-font words into icons inside SVG).
- Both temperature positions use the thermostat icon. During hold + turn the inner disc shows the second value's icon and name (Fan, Track, Charge, ESP), as in the wireframe.

## TB-3.1.2 · SK-1.0.2 · SK-2.2.0 (19 Oct 2026, frozen)
- **Automatic session (all three apps, researcher panel → ▶ Run session):** runs every remaining Ch5 task and repetition in order for the selected participant. Each task shows the goal full screen with a countdown (3, 4 or 6 s, or "Tap Start"), then the trial runs; on success a check mark, then the next goal; a timeout or "End as not completed" also moves on. "Stop session" on the goal screen or in the panel stops it. At the end: "All tasks are done. Thank you!". While a goal screen is up, wheel and middle-button input is blocked, so the knob cannot change the start state. "Run one" still runs a single task.
- **SK2 dial settings (Settings):** Knob · dial position (corner dials inward, all dials up from the bottom edge, in 8 px steps) and Knob · dial size (dial 50–200 %, icon 50–250 %, Reset). Each change shows the dial as a preview; gesture hints move up with the dial.

## SK-2.1.2 (19 Oct 2026, frozen)
- Corner dials: the function icon and label now sit inside the visible part of the inner disc (they were cut off by the screen edge in the right corner). Both temperature positions read "Temp"; the dial is anchored to the visible bottom of the screen.

## SK-2.1.1 (19 Oct 2026, frozen)
- The dial no longer follows the cursor inside a zone. Cursor jitter while turning moved the dial left and right; now the dial stays fixed at its slot and only travels (with the stretch and spring) when the knob crosses into another zone. Slightly wider hysteresis at the zone borders.

## 19 Oct 2026, later: SK-2.1.0, TB-3.1.1, SK-1.0.1 (frozen in releases/)
- **SK-2.1.0:** new digital layer, the dial of thesis Figure 5-4 (Amir's wireframes). Task paths unchanged.
  - Shape follows the knob: quarter circle in the bottom corner at each rail end (marker on the 45° line), half circle on the bottom edge in the middle and at assigned optional slots (marker at top centre); empty slots have no dial.
  - Three rings: inner = function icon (on press: fills with the function colour and shows On/Off, Play/Pause …); middle = main value; outer = second value, only during hold + turn, while the middle ring shrinks and dims.
  - The whole value ring (ticks and numbers) rotates under the fixed marker; label spacing follows label width so neighbours never overlap.
  - Motion: the dial appears as soon as the knob slides (it previously appeared only after a turn), follows the knob live as a half circle, stretches toward the direction of travel, and settles into the slot's shape with a short spring. Idle = edge strip only, dim. Fades about 2 s after the last action. Unavailable actions grey the inner disc and show the reason above the dial. Gesture hints still appear on arrival.
  - The SK-2.0.0 build (simple arc, the Ch4 Figure 4-6 states) stays frozen in releases/SK-2.0.0/.
- **All apps:** the driver fan now starts at level 2, matching the task cards (Appendix چ, Table چ-1). This changes the T12 start state, hence the patch bumps TB-3.1.1 and SK-1.0.1.

## Ch5 test builds — frozen 19 Oct 2026 (releases/)
The Ch5 test runs three apps in a fixed order for every participant: **TB → SK1 → SK2** (Amir, 19 Oct). Input for SK1 and SK2: a plain Bluetooth mouse; press = middle button only.

- **TB-3.1.0** (`tb/`): Ch5 task set (below). No change to touch paths.
- **SK-1.0.0** (`sk/`, app line `SK1`): the 14 Oct concept, kept as it was (5 positions, 5 gestures, arc dial). Only the shared Ch5 task set and logging were added. Home-screen name "Knob 1".
- **SK-2.0.0** (`sk2/`, new app, app line `SK2`): the Ch4 design (Draft 21.11). Home-screen name "Knob 2".
  - Slots, left to right: Driver temp · optional 1 · Media · optional 2 · Passenger temp. Optional slots are empty by default and skipped by the knob; one slide zone per filled slot.
  - Three gestures: turn (main value), press (button released with no turn), hold and turn (second value). No double press, no long press, no screen-off mode.
  - Driver temp: temperature · seat heater on/off · driver fan. Media: volume · play/pause · next/previous track. Passenger temp: temperature · seat heater · passenger fan (new state `clim.fanP`).
  - Optional functions: seat ventilation (level 0–3 · heating ↔ ventilation), navigation shortcut (favourites max 6 · start route · nearest chargers), drive mode (modes · — · stability control, Off only when parked).
  - Values stop at both ends of their range; turning a zone that is off switches it on; slide locked 350 ms after a turn and while the button is held.
  - Digital layer (Ch4 Figure 4-6): dim edge strip when idle, lit for 3 s on arrival with the 3 gesture hints; arc with previous/current/next (2 s); paler arc for the second value; on/off icon on press (1 s); unavailable = greyed item and a reason (2 s).
  - Customization page (Settings → Knob · slots → Customize): rail picture with 5 slots, the 3 main slots locked, each optional slot picks Empty / Seat ventilation / Navigation shortcut / Drive mode. Opens only while parked; closes without saving if the car starts moving (R35).
  - Tutorial (Settings, off by default) teaches slide, turn, press, hold and turn. Notch calibration as in SK1.
- **Shared (all three):**
  - Ch5 task set, Table 5-1: T1 ×3, T12 ×3 (new: turn the fan up), T2, T5 ×3, T3, T9, T10. T4, T6, T11 hidden (kept in code). A "Next" button runs the next task and repetition for the selected participant in this app.
  - New CSV columns: `order` (TB-SK1-SK2), `rep`, `assisted` (researcher toggle, also on the last trial), `incomplete`, `err_wrong_position` (knob action at another position), `err_overshoot` (went past the target), `err_unintended` (count) and `unintended_fields`.
  - White flash at each task start, for syncing the video with the log.
  - Vehicle Parked / Moving switch in the researcher panel (for the parked-only rules).
  - The participant list counts trials for TB / SK1 / SK2; the condition label is kept per app.
- Tested in a browser: all Ch5 tasks succeed in TB by touch, and T1/T12/T5 (×3), T2 and T3 succeed in SK1 and SK2 by knob with zero touches.

## SK-1.0.0 — in progress
- dev.1: the same app as TB (shared/hmi.js) plus the knob layer (sk/knob.js, knob.css). A Bluetooth mouse inside the knob, read with the rules from the mouse probe: slide = cursor position across the screen in 4 equal zones (screen edges = end stops, small hysteresis), turn = wheel bursts with 1 step per ~185 px notch, press = middle button. Sideways movement is ignored for 350 ms after a turn.
- Positions: Temperature (press = Auto), Fan (press = A/C), Volume (press = mute), and a fourth position set while parked: seat heat (default), seat vent or passenger temperature.
- Digital layer: edge colour under the selected position, fading guide with all four positions and values, value pop-up above the knob.
- The knob's mouse cannot click the screen and its cursor is hidden ("Knob only", Settings). Knob actions are logged per trial (knob_actions, first_knob_s, k: entries in the path); mouse input is not counted as touches in SK.
- Tested headless with replayed iPad wheel events: T1, T2, T5 succeed by knob only.
- dev.2 (14 Oct 2026): five positions and five gestures, left to right. This replaces the dev.1 layout (task path change for knob trials; do not pool dev.1 and dev.2 knob data).
  | Position | Turn | Hold + turn | Hold (≥ 600 ms) | Press | Press twice |
  |---|---|---|---|---|---|
  | Driver climate | temperature (switches the zone on) | fan | zone on/off | seat heat | seat vent |
  | Drive | drive mode (Range → Snow) | stability control Off/1/2/3 | Custom | – | – |
  | Media | volume | next / previous | screen off / on | mute | – |
  | Navigation | favourites (preview on the map) | nearest chargers | cancel preview / end route | start route | – |
  | Passenger climate | as driver | | | | |
  Double press is only read on the climate positions, so a single press there waits 300 ms. Slide is locked while the knob is held. The pop-up lists the gestures of a position when the knob arrives on it. Hold time and double-press window are adjustable in Settings; the "fourth position" setting is removed. Screen off is a black layer; the knob's pop-ups still show on it and a touch wakes it.
  Tested headless (Playwright, replayed iPad notches, middle-button down/up timing): every gesture on all five positions; T1, T2, T3, T5, T10 succeed by knob only (0 touches).
- dev.3: on the iPad the knob's slide stopped responding after a press. Most likely cause: iPadOS does not send the middle-button release the way desktop browsers do, so the knob stayed "held" and the slide stayed locked. The release is now accepted from any mouse button-up (pointerup or mouseup), the hold clears itself when the cursor moves with no button down, and a 4 s safety net clears it in every case. Added `sk/?kdebug`, an on-screen readout of the raw mouse events, for checking this on the iPad. No change to the gestures or task paths.
- dev.4: new digital layer from Amir's wireframes (14 Oct 2026). An arc dial, a half disc that grows from the bottom edge right above the knob and moves with it between positions, replaces the five-card guide and the value pop-up. The values the knob turns through sit along the arc: centre = current, sides = next/previous, so a turn rolls the arc like a dial (temperatures, fan levels, drive modes, ESP, volume, tracks, favourites, chargers). It appears on any knob action and fades after 2 s; gesture hints show above it when the knob arrives at a position. The edge colour strip stays. The arc covers the climate bar briefly. No change to gestures or task paths.
- dev.5: knob tutorial (Settings → Knob · tutorial: Off by default, On, or Show now). After the start-up animation it teaches five steps, each waiting for the real gesture: slide far left, turn, press, hold + turn, press and hold. Gestures made during the tutorial change nothing in the car; touch Skip to leave. Logged as tutorial: entries in the trace. A researcher reset closes it.

## Shared code
- SK-1.0.0-dev.8: one wheel notch always counts as at least one step, whatever the mouse (a plain mouse sends one 3 px event per notch, the first probe mouse ~185 px spread over 4 events). New Settings → Knob · notch size → Calibrate: turn 5 single notches, the notch size is set to their median. Notch size can now go down to 1.
- TB-3.0.0-dev.9 / SK-1.0.0-dev.7: participants in researcher mode. A list shared by TB and SK on the same iPad: auto ID (P01…), name, age, gender, years driving, how often they drive, touchscreen-car experience, handedness, glasses, order (TB first / SK first, suggested by alternating), consent, notes; trial counts per app. Select a participant before running tasks (a warning appears if none is selected). Names stay on the iPad and in their own export (Export participants CSV); the trial CSV carries only the ID plus a new order column.
- TB-3.0.0-dev.8 / SK-1.0.0-dev.6: Settings page scrolls (it was clipped once the knob rows made it taller than the screen).
- TB-3.0.0-dev.7 / SK-1.0.0-dev.5: start-up animation every time the app opens (shared/boot.js, boot.css): the rail draws in, the knob slides to the centre, a ring pulses, then "Good morning/afternoon/evening · Welcome back" with battery, inside temperature and drive mode. About 3.6 s; touch to skip; not shown on researcher resets.
- TB-3.0.0-dev.6 / SK-1.0.0-dev.2: per-zone climate on/off (bar shows OFF), stability control (ESP Off/1/2/3, default 3) on the Vehicle drive tab, a Custom drive mode, two more charging stations, favourites and nearest-charger lists for the knob. TB tasks unchanged; all 9 rerun to success.
- TB-3.0.0-dev.5: the app moved to shared/hmi.js and shared/hmi.css so TB and SK run identical code; each app sets its build in HMI_CONFIG.

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
- dev.4: researcher mode in `shared/` (tasks.js, logger.js, researcher.js/.css), reusable by SK. Hold the clock 1 s (or Shift+R) to open. Run resets the app, shows the instruction, times from Start, logs every touch with screen and action, ends on the goal state, after 120 s, or by the researcher. Optional occlusion with TSOT. Theme and accent are logged per trial and Settings are locked while a trial runs. CSV export via the iPad share sheet, copy, or download. All 9 tasks run to success in a headless test.
