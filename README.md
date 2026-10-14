# PhygitalHMI

Prototypes for the bachelor's thesis *Phygital Interaction Experience Design in the Car Cabin* (Amirmahdi Afzalkhani, University of Tehran, Kish International Campus).

Two prototypes run on an iPad, served by GitHub Pages:

- **TB — Touch Baseline.** A touch-only in-cabin screen, built to current industry practice. It is the comparison condition.
- **SK — Sliding Knob.** The thesis concept: a physical sliding knob (a modified Bluetooth mouse inside a 3D-printed knob) with the screen as confirmation surface.

Both share the same look, tasks and trial logging, so a TB-vs-SK comparison only differs in the input.

The earlier touch app (TB-1.x and TB-2.x) lives in the separate repo `cabin-hmi` and is kept unchanged.

## Folders

| Folder | What goes in it |
|---|---|
| `shared/` | Everything both prototypes use: `tokens.css` (colours, type, spacing), `icons/`, and later `tasks.js`, `logger.js`, `researcher.js` |
| `tb/` | Touch Baseline app (installs as its own home-screen app) |
| `sk/` | Sliding Knob app (installs as its own home-screen app) |
| `xp/` | Experiments that never go to participants, one subfolder each (e.g. `xp/mouse-probe/`) |
| `releases/` | Frozen copies made when data collection starts, e.g. `releases/TB-3.0.0-field/`. Never edited. |

## Naming rules

- Lowercase letters, digits and hyphens only. No spaces.
- Working folders never carry a version number. The version lives in each app's `BUILD` file and in a git tag (`TB-3.0.0`).
- Only frozen field builds in `releases/` have a version in the folder name.
- Folder name = prototype line: `tb`, `sk`, `xp`.

## Versions

See `CHANGELOG.md`. Format `LINE-MAJOR.MINOR.PATCH`. A MAJOR change alters a task path; trial data from different majors is never pooled.
