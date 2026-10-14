/* PhygitalHMI — timed tasks, shared by TB and SK.
   Each task: id, level, the instruction read to the participant, and a success check
   ok(state, startState, data) run against the app state while the trial is running.
   IDs keep the original numbering from the field-study protocol; T7 and T8 (defrost)
   were dropped because defrost is a physical key in both prototypes. */
window.PHMI_TASKS = [
  { id: 'T1', lv: 'L1', text: 'Raise the driver temperature by 2 degrees.',
    ok: (s, b) => s.clim.dT === b.clim.dT + 2 },
  { id: 'T2', lv: 'L1', text: 'Turn on the driver seat heater.',
    ok: s => s.clim.seatL > 0 },
  { id: 'T3', lv: 'L1', text: 'Skip to the next song.',
    ok: (s, b, d) => s.media.src === 'bt' && s.media.track === (b.media.track + 1) % d.tracks.length },
  { id: 'T4', lv: 'L1', text: 'Change the audio source from Bluetooth to radio.',
    ok: s => s.media.src === 'fm' },
  { id: 'T5', lv: 'L2', text: 'Turn the volume down.',
    ok: (s, b) => s.media.vol < b.media.vol || s.media.mute },
  { id: 'T6', lv: 'L2', text: 'Direct the airflow to the feet only.',
    ok: s => s.clim.mode === 'feet' && !s.clim.auto },
  { id: 'T9', lv: 'EXT', text: 'Call Sara Mohammadi.',
    ok: s => !!(s.phone.call && s.phone.call.cid === 'sara') },
  { id: 'T10', lv: 'EXT', text: 'Start navigation to Milad Tower.',
    ok: s => s.nav.mode === 'route' && s.nav.dest === 'milad' },
  { id: 'T11', lv: 'EXT', text: 'Play the song “The Lake” by Kamyar Nouri.',
    ok: (s, b, d) => s.media.src === 'bt' && d.tracks[s.media.track].t === 'The Lake' && s.media.playing }
];
