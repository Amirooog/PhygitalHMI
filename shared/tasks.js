/* PhygitalHMI — timed tasks, shared by TB, SK1 and SK2.
   Each task: id, level, the instruction read to the participant, and a success check
   ok(state, startState, data) run against the app state while the trial is running.
   IDs keep the original numbering from the field-study protocol; T7 and T8 (defrost)
   were dropped because defrost is a physical key in every prototype.

   Ch5 run (Table 5-1): ch5 = order in the run list, reps = repetitions (each starts from the same state).
   pos   = knob position the task belongs to (knob actions elsewhere count as err_wrong_position)
   over  = overshoot check (went past the target), counted each time it becomes true
   allow = state fields the task is expected to change (any other change counts as err_unintended)
   Tasks without ch5 (T4, T6, T11) stay in the code but are hidden from the Ch5 run list. */
window.PHMI_TASKS = [
  { id: 'T1', lv: 'L1', ch5: 1, reps: 3, pos: 'driver', text: 'Raise the driver temperature by 2 degrees.',
    ok: (s, b) => s.clim.dT === b.clim.dT + 2,
    over: (s, b) => s.clim.dT > b.clim.dT + 2,
    allow: ['clim.dT', 'clim.dOn'] },
  { id: 'T12', lv: 'L1', ch5: 2, reps: 3, pos: 'driver', text: 'Turn the fan up.',
    ok: (s, b) => s.clim.fan >= b.clim.fan + 1,
    allow: ['clim.fan', 'clim.auto'] },
  { id: 'T2', lv: 'L1', ch5: 3, reps: 1, pos: 'driver', text: 'Turn on the driver seat heater.',
    ok: s => s.clim.seatL > 0,
    allow: ['clim.seatL', 'clim.ventL'] },
  { id: 'T5', lv: 'L2', ch5: 4, reps: 3, pos: 'media', text: 'Turn the volume down.',
    ok: (s, b) => s.media.vol < b.media.vol || s.media.mute,
    allow: ['media.vol', 'media.mute'] },
  { id: 'T3', lv: 'L1', ch5: 5, reps: 1, pos: 'media', text: 'Skip to the next song.',
    ok: (s, b, d) => s.media.src === 'bt' && s.media.track === (b.media.track + 1) % d.tracks.length,
    allow: ['media.track', 'media.playing'] },
  { id: 'T9', lv: 'EXT', ch5: 6, reps: 1, text: 'Call Sara Mohammadi.',
    ok: s => !!(s.phone.call && s.phone.call.cid === 'sara'),
    allow: ['phone.call'] },
  { id: 'T10', lv: 'EXT', ch5: 7, reps: 1, text: 'Start navigation to Milad Tower.',
    ok: s => s.nav.mode === 'route' && s.nav.dest === 'milad',
    allow: ['nav.mode', 'nav.dest'] },
  /* kept, not in the Ch5 run */
  { id: 'T4', lv: 'L1', text: 'Change the audio source from Bluetooth to radio.',
    ok: s => s.media.src === 'fm', allow: ['media.src'] },
  { id: 'T6', lv: 'L2', text: 'Direct the airflow to the feet only.',
    ok: s => s.clim.mode === 'feet' && !s.clim.auto, allow: ['clim.mode', 'clim.auto'] },
  { id: 'T11', lv: 'EXT', text: 'Play the song “The Lake” by Kamyar Nouri.',
    ok: (s, b, d) => s.media.src === 'bt' && d.tracks[s.media.track].t === 'The Lake' && s.media.playing,
    allow: ['media.track', 'media.playing', 'media.src'] }
];

/* state fields watched for unintended changes (screen, sheets, positions in lists and timers are ignored) */
window.PHMI_WATCH = ['clim.dT', 'clim.pT', 'clim.fan', 'clim.fanP', 'clim.auto', 'clim.ac', 'clim.recirc', 'clim.sync', 'clim.mode',
  'clim.seatL', 'clim.seatR', 'clim.ventL', 'clim.ventR', 'clim.dOn', 'clim.pOn',
  'media.src', 'media.vol', 'media.mute', 'media.playing', 'media.track', 'media.usb', 'media.freq',
  'car.mode', 'car.esp', 'car.regen', 'car.steer', 'car.ride', 'phone.call', 'nav.mode', 'nav.dest'];
