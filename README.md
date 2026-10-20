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
| `sk/` | Sliding Knob 1 (SK1): the 14 Oct concept, installs as "Knob 1" |
| `sk2/` | Sliding Knob 2 (SK2): the Ch4 design, installs as "Knob 2" |
| `sk3/` | Sliding Knob 3 (SK3): redesign after the 19 Oct test — zone bar instead of dock and climate bar, home tiles, 3 customizable zones; installs as "Knob 3" |
| `xp/` | Experiments that never go to participants, one subfolder each (e.g. `xp/mouse-probe/`) |
| `releases/` | Frozen copies made with `tools/freeze.sh` before data collection, e.g. `releases/SK-2.0.0/sk2/`. Never edited. |

## Naming rules

- Lowercase letters, digits and hyphens only. No spaces.
- Working folders never carry a version number. The version lives in each app's `BUILD` file and in a git tag (`TB-3.0.0`).
- Only frozen field builds in `releases/` have a version in the folder name.
- Folder name = prototype line: `tb`, `sk`, `xp`.

## Versions

See `CHANGELOG.md`. Format `LINE-MAJOR.MINOR.PATCH`. A MAJOR change alters a task path; trial data from different majors is never pooled.
