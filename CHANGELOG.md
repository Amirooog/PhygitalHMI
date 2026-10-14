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

## Shared code
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
