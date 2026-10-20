/* PhygitalHMI · Sliding Knob 3 (SK3) — redesign after the 19 Oct 2026 test (TB → SK1 → SK2).
   What changed from SK2 (Amir's wireframe, 20 Oct 2026):
   - The dock and the climate bar are gone. Their apps are tiles on the home screen; Home sits in the rail under Lock.
   - The bottom bar is the ZONE BAR: five pills, one per knob zone, always visible, showing live values.
       Driver temp · slot 1 · slot 2 · slot 3 · Passenger temp
     The three middle slots are customizable (defaults: Drive mode · Media · Phone).
   - Temperature pills (and their dial) are coloured by the temperature: light blue (16°) → neutral (22°) → light red (28°).
   - The SK2 dial is kept as it was (rings, quarter circle at the ends, half circle in the middle, spring motion);
     it now rises from the top of the zone bar, above the active pill, and the active pill grows.
   Input is unchanged from SK2: plain mouse; slide = cursor x (five equal zones), turn = wheel, press = middle button
   released with no turn in between, hold + turn = turning while the middle button is held.

   Gesture map                     turn                       press                     hold + turn
     Driver / passenger temp       temperature 0.5 °C         seat heater               fan
     Drive mode                    drive mode                 —                         stability control (Off only parked)
     Media                         volume                     play / pause              next / previous track
     Phone                         favourite contacts         call / end                —
     Navigation                    favourites                 start route               nearest chargers
     Autopark                      spot: right / left / ahead start / stop (< 10 km/h)  parallel / perpendicular
     Driver assist                 following distance 1–4     adaptive cruise on / off  lane keep (Off only parked)
     Ambient light                 brightness                 on / off                  colour
     Airflow & defrost             airflow direction          front defrost             fresh / recirculate
     Windows & sunroof             open the selected one      close all                 select window / sunroof
     Seat & massage                intensity 1–5              on / off                  program  */
(() => {
'use strict';
const H = window.HMI;
if (!H) return;

/* ---------- settings (per device) ---------- */
const KEY = 'phmi.knob3';
const K = Object.assign({ notch: 185, invert: false, hideCursor: true, blockClicks: true, tutorial: false, s1: 'drive', s2: 'media', s3: 'phone', dialX: 0, dialY: 0, dialSize: 100, iconSize: 100 },
  (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
const saveK = () => { try { localStorage.setItem(KEY, JSON.stringify(K)); } catch (e) { /* memory only */ } };
const LOCK_MS = 350, BURST_GAP = 150;

const msI = n => `<span class="ms" aria-hidden="true">${n}</span>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tf = v => v <= 16 ? 'LO' : v >= 28 ? 'HI' : (v % 1 ? v.toFixed(1) : String(v)) + '°';
const TEMPS = []; for (let v = 16; v <= 28; v += 0.5) TEMPS.push(tf(v));
const FAN = ['1', '2', '3', '4', '5', '6', '7'];
const VOLS = Array.from({ length: 31 }, (_, i) => String(i));
const D = H.data;
const ROT = ['range', 'everyday', 'sport', 'snow'];
const trace = l => { if (window.PHMI_TRACE) window.PHMI_TRACE(l); };

/* temperature colour: 16 light blue → 22 neutral → 28 light red, smooth at every 0.5° */
function tcol(t) {
  const s = [[16, [125, 184, 255]], [22, [201, 205, 211]], [28, [255, 138, 128]]];
  t = clamp(t, 16, 28); const i = t <= 22 ? 0 : 1, f = (t - s[i][0]) / 6;
  const c = s[i][1].map((v, k) => Math.round(v + (s[i + 1][1][k] - v) * f));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

/* state of the new SK3 functions; recreated with every fresh trial */
const X0 = () => ({ fav: 0, side: 0, ptype: 0, parking: false, acc: false, gap: 2, lka: 2, ambOn: true, amb: 6, ambC: 0, defrost: false,
  wsel: 0, open: [0, 0, 0, 0, 0], massOn: false, mass: 2, prog: 0 });
const X = s => s.x3 || (s.x3 = X0());
if (Array.isArray(window.PHMI_WATCH)) window.PHMI_WATCH.push('x3.side', 'x3.ptype', 'x3.parking', 'x3.acc', 'x3.gap', 'x3.lka', 'x3.ambOn', 'x3.amb', 'x3.ambC',
  'x3.defrost', 'x3.open', 'x3.massOn', 'x3.mass', 'x3.prog');

/* ---------- functions ---------- */
const unavailable = (item, reason) => { const e = new Error(reason); e.na = { item, reason }; throw e; };
function climate(side) {
  const d = side === 'L', on = d ? 'dOn' : 'pOn', t = d ? 'dT' : 'pT', fan = d ? 'fan' : 'fanP', seat = 'seat' + side, vent = 'vent' + side;
  const who = d ? 'Driver' : 'Passenger';
  return {
    key: d ? 'driver' : 'passenger', n: who + ' temp', short: 'Temp', short2: 'Fan', ic: 'thermostat', col: '#C9CDD3', temp: true, go: ['go', 'climate'],
    colF: s => s.clim[on] ? tcol(s.clim[t]) : '#8A9098',
    pill: s => {
      const c = s.clim;
      if (!c[on]) return `<b>OFF</b><small>${who.toUpperCase()}</small>`;
      return `<b>${c[t] <= 16 ? 'LO' : c[t] >= 28 ? 'HI' : (c[t] % 1 ? c[t].toFixed(1) : c[t])}<sup>°</sup></b><small>${c[seat] ? msI('local_fire_department') : ''}FAN ${c[fan] ?? c.fan}</small>`;
    },
    hints: [['Turn', 'Temperature'], ['Press', 'Seat heater'], ['Hold + turn', 'Fan']],
    turn(s, k) { const c = s.clim; c[on] = true; c[t] = clamp(c[t] + 0.5 * k, 16, 28); if (d && c.sync) c.pT = c.dT; if (!d) c.sync = false; },
    hturn(s, k) { const c = s.clim; c[on] = true; c.auto = false; c[fan] = clamp((c[fan] ?? c.fan) + k, 1, 7); },
    press(s) { const c = s.clim; if (c[seat]) c[seat] = 0; else { c[seat] = 3; c[vent] = 0; } return { icon: 'local_fire_department', on: !!c[seat], short: c[seat] ? 'On' : 'Off', label: 'Seat heater ' + (c[seat] ? 'on' : 'off') }; },
    main: s => ({ id: 'temp', head: who + ' temperature', items: TEMPS, cur: Math.round((s.clim[t] - 16) * 2) }),
    second: s => ({ id: 'fan', head: who + ' fan', ic: 'mode_fan', items: FAN, cur: (s.clim[fan] ?? s.clim.fan) - 1 })
  };
}
const curTrack = m => {
  if (m.src === 'fm') { const f = D.fms.find(x => x.f === m.freq); return [f ? f.n : m.freq.toFixed(1) + ' FM', 'Radio']; }
  const x = m.src === 'usb' ? D.usb[m.usb] : D.tracks[m.track]; return [x.t, x.a];
};
const trackList = m => m.src === 'fm' ? D.fms.map(f => f.n) : (m.src === 'usb' ? D.usb : D.tracks).map(x => x.t);
const trackIdx = m => m.src === 'fm' ? Math.max(0, D.fms.findIndex(f => f.f === m.freq)) : m.src === 'usb' ? m.usb : m.track;

const FAVS = [['mom', 'Mom'], ['sara', 'Sara Moh.'], ['office', 'Office'], ['reza', 'Reza K.']];
const PSIDE = ['Right', 'Left', 'Ahead'], PTYPE = ['Parallel', 'Perpendicular'];
const LKA = ['Off', 'Warn', 'Assist'];
const AMBC = [['Ice', '#9FD8FF'], ['Amber', '#FFC07A'], ['Violet', '#C3A2FF'], ['Rose', '#FF9FB8'], ['Mint', '#8FE3B8']];
const AMBV = Array.from({ length: 11 }, (_, i) => i * 10 + '%');
const AIRK = ['face', 'both', 'feet', 'wind'], AIRN = ['Face', 'Face & feet', 'Feet', 'Windscreen'], AIRI = ['airline_seat_recline_normal', 'airline_seat_legroom_normal', 'airline_seat_legroom_extra', 'windshield_defrost_front'];
const WIN = ['Sunroof', 'Driver', 'Passenger', 'Rear left', 'Rear right'], OPENS = ['Closed', '25%', '50%', '75%', 'Open'];
const PROG = ['Wave', 'Pulse', 'Lumbar', 'Stretch'];
let parkT;

const FN = {
  driver: climate('L'),
  passenger: climate('R'),
  drive: {
    key: 'drive', n: 'Drive mode', short: 'Drive', short2: 'ESP', ic: 'directions_car', col: '#FFC24B', go: ['go', 'vehicle'],
    pill: s => `${msI(D.dmodes[s.car.mode].ic)}<b>${esc(D.dmodes[s.car.mode].n)}</b>`,
    hints: [['Turn', 'Drive mode'], ['Hold + turn', 'Stability control']],
    turn(s, k) {
      const c = s.car, i = ROT.indexOf(c.mode), j = clamp((i < 0 ? 1 : i) + k, 0, ROT.length - 1), m = D.dmodes[ROT[j]];
      Object.assign(c, { mode: ROT[j], regen: m.regen, steer: m.steer, ride: m.ride });
    },
    hturn(s, k) {
      const c = s.car, to = clamp(c.esp + k, 0, 3);
      if (to === 0 && c.moving) { c.esp = Math.max(1, c.esp); unavailable('ESP Off', 'Off only when parked'); }
      c.esp = to;
    },
    main: s => ({ id: 'dmode', head: 'Drive mode', ic: D.dmodes[s.car.mode].ic, items: ROT.map(k => D.dmodes[k].n), cur: Math.max(0, ROT.indexOf(s.car.mode)) }),
    second: s => ({ id: 'esp', head: 'Stability control', ic: 'car_crash', items: D.esp.map(e => e === 'Off' ? 'Off' : 'ESP ' + e), cur: s.car.esp })
  },
  media: {
    key: 'media', n: 'Media', short: 'Media', short2: 'Track', ic: 'volume_up', col: '#A89BFF', go: ['go', 'media'],
    pill: s => `${msI(s.media.playing ? 'graphic_eq' : 'pause')}<b>${esc(curTrack(s.media)[0])}</b><small>${s.media.mute ? 'MUTED' : 'VOL ' + s.media.vol}</small>`,
    hints: [['Turn', 'Volume'], ['Press', 'Play / pause'], ['Hold + turn', 'Next / previous track']],
    turn(s, k) { const m = s.media; m.mute = false; m.vol = clamp(m.vol + k, 0, 30); },
    hturn(s, k) {
      const m = s.media, n = trackList(m).length, i = clamp(trackIdx(m) + k, 0, n - 1);
      if (m.src === 'fm') { m.freq = D.fms[i].f; m.fm = i; } else if (m.src === 'usb') { m.usb = i; m.upos = 0; } else { if (i !== m.track) m.pos = 0; m.track = i; }
      m.playing = true;
    },
    press(s) { s.media.playing = !s.media.playing; return { icon: s.media.playing ? 'play_arrow' : 'pause', on: s.media.playing, short: s.media.playing ? 'Play' : 'Pause', label: s.media.playing ? 'Playing' : 'Paused' }; },
    main: s => ({ id: 'vol', head: 'Volume', ic: s.media.mute ? 'volume_off' : 'volume_up', items: VOLS, cur: s.media.vol }),
    second: s => ({ id: 'track-' + s.media.src, head: s.media.src === 'fm' ? 'Station' : 'Track', ic: 'queue_music', items: trackList(s.media), cur: trackIdx(s.media) })
  },
  phone: {
    key: 'phone', n: 'Phone', short: 'Phone', ic: 'call', col: '#5BD08A', go: ['go', 'phone'],
    pill: s => s.phone.call ? `${msI('call')}<b>${esc(s.phone.call.name.split(' ')[0])}</b><small>IN CALL</small>` : `${msI('call')}<b>Phone</b><small>${esc(D.contacts[FAVS[X(s).fav][0]].n)}</small>`,
    hints: [['Turn', 'Favourite contacts'], ['Press', 'Call / end call']],
    turn(s, k) { if (s.phone.call) unavailable('Contacts', 'In a call: press to end it first'); const x = X(s); x.fav = clamp(x.fav + k, 0, FAVS.length - 1); },
    press(s) {
      if (s.phone.call) { H.act('pend'); return { icon: 'call_end', on: false, short: 'End', label: 'Call ended' }; }
      const id = FAVS[X(s).fav][0]; H.act('pcall', id);
      return { icon: 'call', on: true, short: 'Call', label: 'Calling ' + D.contacts[id].n };
    },
    main: s => s.phone.call ? { id: 'incall', head: 'In call', ic: 'call', items: [s.phone.call.name.split(' ')[0]], cur: 0 }
      : { id: 'fav', head: 'Favourites', ic: 'star', items: FAVS.map(f => f[1]), cur: X(s).fav }
  },
  nav: {
    key: 'nav', n: 'Navigation', short: 'Nav', short2: 'Charge', ic: 'near_me', col: '#4CC3E0', go: ['go', 'nav'],
    pill: s => s.nav.mode === 'route' && s.nav.dest ? `${msI('navigation')}<b>${esc(D.poi[s.nav.dest].n)}</b><small>ON ROUTE</small>` : `${msI('near_me')}<b>Navigation</b>`,
    hints: [['Turn', 'Favourites'], ['Press', 'Start route'], ['Hold + turn', 'Nearest chargers']],
    list: 'fav', i: -1,
    pick(s, list, k) {
      const ids = list === 'ev' ? D.chargers : D.favorites.slice(0, 6);
      if (this.list !== list) { this.list = list; this.i = -1; }
      this.i = clamp(this.i < 0 ? 0 : this.i + k, 0, ids.length - 1);
      const n = s.nav; n.sel = ids[this.i]; n.mode = 'preview'; s.screen = 'nav'; s.sheet = null;
    },
    turn(s, k) { this.pick(s, 'fav', k); },
    hturn(s, k) { this.pick(s, 'ev', k); },
    press(s) {
      const n = s.nav;
      if (n.mode !== 'preview' || !n.sel) unavailable('Start route', 'Turn to choose a destination first');
      n.dest = n.sel; n.mode = 'route'; n.t0 = Date.now(); s.screen = 'nav'; this.i = -1;
      return { icon: 'navigation', on: true, short: 'Go', label: 'Route started' };
    },
    main(s) {
      const ids = this.list === 'ev' ? D.chargers : D.favorites.slice(0, 6), n = s.nav;
      if (n.mode === 'route' && n.dest) return { id: 'route', head: 'On route', items: [D.poi[n.dest].n], cur: 0 };
      return { id: 'nav-' + this.list, head: 'Favourites', ic: 'star', items: ids.map(i => D.poi[i].n), cur: Math.max(0, this.i) };
    },
    second(s) { return { id: 'nav-ev', head: 'Nearest chargers', ic: 'ev_station', items: D.chargers.map(i => D.poi[i].n), cur: Math.max(0, this.list === 'ev' ? this.i : 0) }; }
  },
  park: {
    key: 'park', n: 'Autopark', short: 'Park', short2: 'Type', ic: 'local_parking', col: '#6FB7FF', go: ['go', 'vehicle'],
    pill: s => { const x = X(s); return x.parking ? `${msI('local_parking')}<b>Parking…</b><small>HANDS OFF</small>` : `${msI('local_parking')}<b>Autopark</b><small>${PSIDE[x.side].toUpperCase()} · ${PTYPE[x.ptype].toUpperCase()}</small>`; },
    hints: [['Turn', 'Spot side'], ['Press', 'Start / stop'], ['Hold + turn', 'Parallel / perpendicular']],
    turn(s, k) { const x = X(s); if (x.parking) unavailable('Spot', 'Parking is running: press to stop'); x.side = clamp(x.side + k, 0, 2); },
    hturn(s, k) { const x = X(s); if (x.parking) unavailable('Type', 'Parking is running: press to stop'); x.ptype = clamp(x.ptype + k, 0, 1); },
    press(s) {
      const x = X(s);
      clearTimeout(parkT);
      if (x.parking) { x.parking = false; return { icon: 'stop_circle', on: false, short: 'Stop', label: 'Autopark stopped' }; }
      if (s.car.moving) unavailable('Autopark', 'Slow down below 10 km/h');
      x.parking = true;
      parkT = setTimeout(() => { if (X(H.state()).parking) { X(H.state()).parking = false; H.render(); H.toast('local_parking', 'Parked'); } }, 6000);
      return { icon: 'local_parking', on: true, short: 'Start', label: 'Autopark started' };
    },
    main: s => ({ id: 'pside', head: 'Parking spot', ic: 'local_parking', items: PSIDE, cur: X(s).side }),
    second: s => ({ id: 'ptype', head: 'Parking type', ic: 'garage', items: ['Parallel', 'Perpend.'], cur: X(s).ptype })
  },
  adas: {
    key: 'adas', n: 'Driver assist', short: 'Assist', short2: 'Lane', ic: 'speed', col: '#F2A93B', go: ['go', 'vehicle'],
    pill: s => { const x = X(s); return `${msI('speed')}<b>${x.acc ? 'ACC on' : 'Assist'}</b><small>GAP ${x.gap} · LANE ${LKA[x.lka].toUpperCase()}</small>`; },
    hints: [['Turn', 'Following distance'], ['Press', 'Adaptive cruise on / off'], ['Hold + turn', 'Lane keeping']],
    turn(s, k) { const x = X(s); x.gap = clamp(x.gap + k, 1, 4); },
    hturn(s, k) { const x = X(s), to = clamp(x.lka + k, 0, 2); if (to === 0 && s.car.moving) unavailable('Lane keep Off', 'Off only when parked'); x.lka = to; },
    press(s) { const x = X(s); x.acc = !x.acc; return { icon: 'speed', on: x.acc, short: x.acc ? 'On' : 'Off', label: 'Adaptive cruise ' + (x.acc ? 'on' : 'off') }; },
    main: s => ({ id: 'gap', head: 'Following distance', ic: 'straighten', items: ['1', '2', '3', '4'], cur: X(s).gap - 1 }),
    second: s => ({ id: 'lka', head: 'Lane keeping', ic: 'road', items: LKA, cur: X(s).lka })
  },
  amb: {
    key: 'amb', n: 'Ambient light', short: 'Light', short2: 'Colour', ic: 'emoji_objects', col: '#C3A2FF', go: ['go', 'settings'],
    colF: s => AMBC[X(s).ambC][1],
    pill: s => { const x = X(s); return `<span class="ms" aria-hidden="true" style="color:${AMBC[x.ambC][1]}">emoji_objects</span><b>${x.ambOn ? AMBV[x.amb] : 'Off'}</b><small>${AMBC[x.ambC][0].toUpperCase()}</small>`; },
    hints: [['Turn', 'Brightness'], ['Press', 'On / off'], ['Hold + turn', 'Colour']],
    turn(s, k) { const x = X(s); x.ambOn = true; x.amb = clamp(x.amb + k, 0, 10); },
    hturn(s, k) { const x = X(s); x.ambOn = true; x.ambC = clamp(x.ambC + k, 0, AMBC.length - 1); },
    press(s) { const x = X(s); x.ambOn = !x.ambOn; return { icon: 'emoji_objects', on: x.ambOn, short: x.ambOn ? 'On' : 'Off', label: 'Ambient light ' + (x.ambOn ? 'on' : 'off') }; },
    main: s => ({ id: 'amb', head: 'Brightness', ic: 'brightness_6', items: AMBV, cur: X(s).amb }),
    second: s => ({ id: 'ambc', head: 'Colour', ic: 'palette', items: AMBC.map(c => c[0]), cur: X(s).ambC })
  },
  air: {
    key: 'air', n: 'Airflow & defrost', short: 'Air', short2: 'Intake', ic: 'air', col: '#8FD3FF', go: ['go', 'climate'],
    pill: s => { const i = Math.max(0, AIRK.indexOf(s.clim.mode)); return X(s).defrost ? `${msI('windshield_defrost_front')}<b>Defrost</b><small>FRONT ON</small>` : `${msI(AIRI[i])}<b>${AIRN[i]}</b><small>${s.clim.recirc ? 'RECIRCULATE' : 'FRESH AIR'}</small>`; },
    hints: [['Turn', 'Airflow direction'], ['Press', 'Front defrost'], ['Hold + turn', 'Fresh air / recirculate']],
    turn(s, k) { const c = s.clim, i = Math.max(0, AIRK.indexOf(c.mode)); c.mode = AIRK[clamp(i + k, 0, 3)]; c.auto = false; },
    hturn(s, k) { s.clim.recirc = k > 0; },
    press(s) { const x = X(s); x.defrost = !x.defrost; return { icon: 'windshield_defrost_front', on: x.defrost, short: x.defrost ? 'On' : 'Off', label: 'Front defrost ' + (x.defrost ? 'on' : 'off') }; },
    main: s => ({ id: 'air', head: 'Airflow', ic: 'air', items: ['Face', 'Both', 'Feet', 'Screen'], cur: Math.max(0, AIRK.indexOf(s.clim.mode)) }),
    second: s => ({ id: 'intake', head: 'Air intake', ic: 'autorenew', items: ['Fresh', 'Recirc.'], cur: s.clim.recirc ? 1 : 0 })
  },
  win: {
    key: 'win', n: 'Windows & sunroof', short: 'Window', short2: 'Select', ic: 'window', col: '#B9C3CF', go: ['go', 'vehicle'],
    pill: s => { const x = X(s); return `${msI(x.wsel ? 'window' : 'roofing')}<b>${WIN[x.wsel]}</b><small>${OPENS[x.open[x.wsel] / 25].toUpperCase()}</small>`; },
    hints: [['Turn', 'Open / close'], ['Press', 'Close all'], ['Hold + turn', 'Select window']],
    turn(s, k) { const x = X(s); x.open = x.open.slice(); x.open[x.wsel] = clamp(x.open[x.wsel] + 25 * k, 0, 100); },
    hturn(s, k) { const x = X(s); x.wsel = clamp(x.wsel + k, 0, WIN.length - 1); },
    press(s) { const x = X(s); x.open = [0, 0, 0, 0, 0]; return { icon: 'lock', on: true, short: 'Close', label: 'Closing all windows' }; },
    main: s => ({ id: 'wopen-' + X(s).wsel, head: WIN[X(s).wsel], ic: X(s).wsel ? 'window' : 'roofing', items: OPENS, cur: X(s).open[X(s).wsel] / 25 }),
    second: s => ({ id: 'wsel', head: 'Select', ic: 'window', items: ['Roof', 'Driver', 'Pass.', 'Rear L', 'Rear R'], cur: X(s).wsel })
  },
  seat: {
    key: 'seat', n: 'Seat & massage', short: 'Massage', short2: 'Program', ic: 'airline_seat_recline_extra', col: '#FF9E7A', go: ['go', 'climate'],
    pill: s => { const x = X(s); return `${msI('airline_seat_recline_extra')}<b>${x.massOn ? PROG[x.prog] : 'Massage'}</b><small>${x.massOn ? 'LEVEL ' + x.mass : 'OFF'}</small>`; },
    hints: [['Turn', 'Intensity'], ['Press', 'On / off'], ['Hold + turn', 'Program']],
    turn(s, k) { const x = X(s); x.massOn = true; x.mass = clamp(x.mass + k, 1, 5); },
    hturn(s, k) { const x = X(s); x.massOn = true; x.prog = clamp(x.prog + k, 0, PROG.length - 1); },
    press(s) { const x = X(s); x.massOn = !x.massOn; return { icon: 'airline_seat_recline_extra', on: x.massOn, short: x.massOn ? 'On' : 'Off', label: 'Massage ' + (x.massOn ? 'on' : 'off') }; },
    main: s => ({ id: 'mass', head: 'Intensity', ic: 'airline_seat_recline_extra', items: ['1', '2', '3', '4', '5'], cur: X(s).mass - 1 }),
    second: s => ({ id: 'prog', head: 'Program', ic: 'tune', items: PROG, cur: X(s).prog })
  }
};
const OPTIONAL = ['drive', 'media', 'phone', 'nav', 'park', 'adas', 'amb', 'air', 'win', 'seat'];
const fixSlots = () => {   // three distinct, known functions
  const used = [];
  ['s1', 's2', 's3'].forEach((k, i) => { if (!FN[K[k]] || !OPTIONAL.includes(K[k]) || used.includes(K[k])) K[k] = ['drive', 'media', 'phone', 'nav', 'park'].find(f => !used.includes(f)); used.push(K[k]); });
};
fixSlots();
const slots = () => ['driver', K.s1, K.s2, K.s3, 'passenger'];
const active = () => slots().map(k => FN[k]);
const NZ = 5;
const colOf = (p, s) => p.colF ? p.colF(s || H.state()) : p.col;

/* ---------- zone bar: five pills over the five knob zones ---------- */
let zone = null, lit = false, litT;
function paintBar(s) {
  const bar = document.getElementById('bar');
  if (!bar.querySelector('.zb3')) bar.innerHTML = `<div class="zb3">${active().map((_, i) => `<button class="zp" data-i="${i}" type="button"><span class="zp-in"></span></button>`).join('')}</div>`;
  const A = active();
  bar.querySelectorAll('.zp').forEach((el, i) => {
    const p = A[i], on = p.temp ? s.clim[p.key === 'driver' ? 'dOn' : 'pOn'] : true, col = colOf(p, s);
    const cls = 'zp' + (p.temp ? ' tp' : '') + (p.temp && !on ? ' off' : '') + (i === zone && lit ? ' act' : '');
    if (el.className !== cls) el.className = cls;
    el.dataset.a = p.go[0]; el.dataset.v = p.go[1];
    el.setAttribute('aria-label', p.n);
    el.style.setProperty('--pc', col);
    const html = p.pill(s), inn = el.firstElementChild;
    if (inn._h !== html) { inn.innerHTML = html; inn._h = html; }
  });
}
function lightEdge() { lit = true; paintBar(H.state()); clearTimeout(litT); litT = setTimeout(() => { lit = false; paintBar(H.state()); }, 2600); }

/* ---------- home: media card · app tiles · map (wireframe 20 Oct 2026); Home in the rail under Lock ---------- */
const tile = (a, v, ic, t, sub) => `<button class="t3 glass" data-a="${a}" data-v="${v}">${msI(ic)}<span><b>${t}</b><small>${esc(sub)}</small></span></button>`;
function home3(orig, s) {
  const c = s.clim, car = s.car;
  return `<div class="home3">${orig()}<div class="tiles3">
    ${tile('go', 'phone', 'call', 'Phone', s.phone.call ? 'In call · ' + s.phone.call.name : 'Recents')}
    ${tile('vgo', 'charge', car.charging ? 'battery_charging_full' : 'ev_station', 'Charging', Math.floor(car.soc) + '%' + (car.charging ? ' · charging' : car.plugged ? ' · plugged in' : ''))}
    ${tile('go', 'climate', 'mode_fan', 'Climate', c.auto ? 'Auto' : 'Fan ' + c.fan + (c.ac ? ' · A/C' : ''))}
    ${tile('go', 'vehicle', 'directions_car', 'Vehicle', D.dmodes[car.mode].n + (s.locked ? ' · locked' : ''))}
    ${tile('go', 'settings', 'settings', 'Settings', 'Knob zones')}
  </div></div>`;
}
const railEnd = s => `<button class="lock home3b${s.screen === 'home' ? ' on' : ''}" data-a="go" data-v="home" aria-label="Home" aria-current="${s.screen === 'home' ? 'page' : 'false'}">${msI('home')}</button>`;

/* ---------- digital layer: the SK2 dial (thesis Figure 5-4), unchanged in look and motion ----------
   Quarter circle at each end zone, half circle in the middle zones; inner disc = icon, middle ring = main value,
   outer ring = second value during hold + turn. The ring rotates under a fixed marker; spring motion with stretch.
   SK3: the dial sits on the top edge of the zone bar, above the active pill. */
const dial = document.createElement('div'); dial.id = 'kDial'; dial.setAttribute('role', 'status'); dial.setAttribute('aria-live', 'polite');
const hint = document.createElement('div'); hint.id = 'kHint'; hint.setAttribute('aria-hidden', 'true');
document.body.append(dial, hint);

const spring = x => ({ x, v: 0, t: x });
const SP = { cx: spring(0), a0: spring(0), a1: spring(180), rot: spring(0), rot2: spring(0), l2: spring(0), press: spring(0) };
let raf = 0, lastT = 0, visible = false, hideT, content = null;
function animate(now) {
  const dt = Math.min(0.032, (now - (lastT || now)) / 1000 || 0.016); lastT = now;
  let moving = false;
  for (const k in SP) {
    const s = SP[k], stiff = k === 'cx' ? 210 : k === 'l2' || k === 'press' ? 260 : 190, damp = k === 'cx' ? 19 : 22;
    const a = stiff * (s.t - s.x) - damp * s.v;
    s.v += a * dt; s.x += s.v * dt;
    if (Math.abs(s.t - s.x) > 0.01 || Math.abs(s.v) > 0.01) moving = true; else { s.x = s.t; s.v = 0; }
  }
  drawDial();
  raf = moving ? requestAnimationFrame(animate) : 0;
  if (!moving) lastT = 0;
}
const kick = () => { if (!raf) raf = requestAnimationFrame(animate); };
const snap = () => { for (const k in SP) { SP[k].x = SP[k].t; SP[k].v = 0; } };

const R0 = { inner: 72, m0: 80, m1: 134, o0: 140, o1: 184 };
let R = R0;
const sizeR = () => { const f = (K.dialSize || 100) / 100; R = {}; for (const k in R0) R[k] = R0[k] * f; };
sizeR();
const pt = (cx, cy, r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy - r * Math.sin(a * Math.PI / 180)];
function sector(cx, cy, r0, r1, a0, a1) {
  const big = a1 - a0 > 180 ? 1 : 0, [x0, y0] = pt(cx, cy, r1, a0), [x1, y1] = pt(cx, cy, r1, a1);
  if (r0 <= 0) return `M${cx},${cy} L${x0},${y0} A${r1},${r1} 0 ${big} 0 ${x1},${y1} Z`;
  const [x2, y2] = pt(cx, cy, r0, a1), [x3, y3] = pt(cx, cy, r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 ${big} 0 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${big} 1 ${x3},${y3} Z`;
}
const stepFor = (items, rm, fs) => { const L = Math.min(11, Math.max(...items.map(t => String(t).length))); return Math.max(16, (L * fs * 0.62 + 14) / rm * 180 / Math.PI); };
function ring(list, rotF, r0, r1, a0, a1, idx, col, op, small) {
  if (!list) return '';
  const rm = (r0 + r1) / 2, fs = small ? 12 : Math.min(17, (r1 - r0) * 0.34), step = stepFor(list.items, rm, fs * 1.2);
  let s = `<path d="${sector(CX, CY, r0, r1, a0, a1)}" class="kd-band" opacity="${op}"/>`;
  let marks = '';
  list.items.forEach((t, i) => {
    const ang = idx - (i - rotF) * step;
    if (ang < a0 - step || ang > a1 + step) return;
    const [x, y] = pt(CX, CY, rm, ang), on = Math.abs(i - rotF) < 0.5;
    const [tx0, ty0] = pt(CX, CY, r1 - 4, ang + step / 2), [tx1, ty1] = pt(CX, CY, r1 - 11, ang + step / 2);
    marks += `<line x1="${tx0}" y1="${ty0}" x2="${tx1}" y2="${ty1}" class="kd-tick"/>`;
    const lbl = String(t).length > 11 ? String(t).slice(0, 10) + '…' : String(t);
    marks += `<text x="${x}" y="${y}" transform="rotate(${90 - ang} ${x} ${y})" class="kd-num${on ? ' on' : ''}" font-size="${on ? fs * 1.25 : fs}"${on ? ` style="fill:${col}"` : ''}>${esc(lbl)}</text>`;
  });
  return s + `<g clip-path="url(#kdClip)" opacity="${op}">${marks}</g>`;
}
const barTop = () => { const b = document.getElementById('bar'); return b ? b.getBoundingClientRect().top : window.innerHeight; };
let CX = 0, CY = 0;
function drawDial() {
  if (!content) return;
  const W = window.innerWidth, vv = window.visualViewport, Hh = Math.round(vv && vv.height ? Math.min(vv.height, window.innerHeight) : window.innerHeight), p = content.fn;
  CX = SP.cx.x; CY = Math.min(Hh, barTop()) - (K.dialY || 0);   // on the top edge of the zone bar; Settings → dial position moves it up
  const a0 = SP.a0.x, a1 = SP.a1.x, idx = (a0 + a1) / 2, l2 = clamp(SP.l2.x, 0, 1.2), pr = clamp(SP.press.x, 0, 1.2);
  const stretch = clamp(Math.abs(SP.cx.v) / 3200, 0, 0.32), dir = Math.sign(SP.cx.v) || 1;
  const m0 = R.m0, m1 = R.m1 - l2 * 34, o0 = R.o0 - l2 * 34 + (1 - l2) * 24, o1 = R.o1 - l2 * 10;
  const col = content.na ? '#8A9098' : colOf(p);
  const clip = sector(CX, CY, 0, R.o1 + 30, a0, a1);
  const [ix, iy] = pt(CX, CY, (l2 > 0.5 ? o1 : m1) + 12, idx);
  const tri = `<path d="M0,-9 L8,7 L-8,7 Z" class="kd-idx" style="fill:${col}" transform="translate(${ix} ${iy}) rotate(${270 - idx})"/>`;
  const span = a1 - a0, quarter = span < 135, leftQ = quarter && idx < 90;
  let cxI, cyI, anc = 'middle', lx, ly;
  if (!quarter) { [cxI, cyI] = pt(CX, CY, R.inner * 0.55, idx); lx = cxI; ly = cyI + 15; cyI -= 7; }
  else { const f = R.inner / 72; cxI = CX + (leftQ ? 28 : -28) * f; cyI = CY - 44 * f; lx = CX + (leftQ ? 8 : -8) * f; ly = CY - 16 * f; anc = leftQ ? 'start' : 'end'; }
  const isz = (K.iconSize || 100) / 100;
  const lightFill = pr > 0.02 && content.flash && content.flash.on && p.colF;   // temperature colours are light: dark icon on them
  const fill = pr > 0.02 ? (content.flash && content.flash.on ? col : '#5a5f68') : '#1B1F24';
  const layer2 = l2 > 0.5 && content.second;
  const label = pr > 0.5 && content.flash ? content.flash.short : layer2 ? (p.short2 || p.short) : p.short;
  const fg = lightFill ? '#0B0C0E' : '#fff';
  dial.innerHTML = `<svg width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" aria-hidden="true">
    <defs><clipPath id="kdClip"><path d="${clip}"/></clipPath></defs>
    <g transform="translate(${CX} ${CY}) scale(${1 + stretch} ${1 - stretch * 0.35}) translate(${-CX - dir * stretch * 40} ${-CY})">
      <path d="${sector(CX, CY, 0, R.o1 + 8, a0, a1)}" class="kd-bg"/>
      ${ring(content.main, SP.rot.x, m0, m1, a0, a1, idx, col, l2 > 0.05 ? 1 - 0.55 * Math.min(1, l2) : 1, l2 > 0.5)}
      ${l2 > 0.02 ? ring(content.second, SP.rot2.x, o0, o1, a0, a1, idx, col, Math.min(1, l2), false) : ''}
      <path d="${sector(CX, CY, 0, R.inner * (1 + pr * 0.08), a0, a1)}" style="fill:${fill}" class="kd-inner"/>
      ${tri}
    </g></svg>
    <span class="kd-ic ms" aria-hidden="true" style="left:${cxI}px;top:${cyI}px;font-size:${26 * isz}px;color:${fg}">${content.na ? 'block' : pr > 0.5 && content.flash ? content.flash.icon : layer2 ? (content.second.ic || p.ic) : p.ic}</span>
    <span class="kd-lbl" style="left:${lx}px;top:${ly}px;font-size:${12 * isz}px;color:${fg};transform:translate(${anc === 'start' ? '0' : anc === 'end' ? '-100%' : '-50%'}, -50%)">${esc(label)}</span>`;
}
const zoneX = z => (z + 0.5) / NZ * window.innerWidth;
const slotShape = z => {
  const W = window.innerWidth, dx = K.dialX || 0;
  if (z === 0) return { cx: dx, a0: 0, a1: 90 };
  if (z === NZ - 1) return { cx: W - dx, a0: 90, a1: 180 };
  return { cx: zoneX(z), a0: 0, a1: 180 };
};
const curFn = () => { if (zone == null) zone = 0; return active()[zone]; };
function setTargets(sh) { SP.cx.t = sh.cx; SP.a0.t = sh.a0; SP.a1.t = sh.a1; }
function showDial(kind, extra) {
  const p = curFn(), s = H.state();
  const main = p.main(s), second = p.second ? p.second(s) : null;
  const wasHidden = !visible || !content || content.fn !== p;
  content = { fn: p, main, second, flash: kind === 'press' ? extra : null, na: kind === 'na' ? extra : null };
  setTargets(slotShape(zone));
  SP.rot.t = main.cur; SP.rot2.t = second ? second.cur : 0;
  SP.l2.t = kind === 'second' ? 1 : 0;
  if (kind === 'press') { SP.press.t = 1; clearTimeout(showDial.pt); showDial.pt = setTimeout(() => { SP.press.t = 0; kick(); }, 1000); }
  if (wasHidden) { SP.rot.x = SP.rot.t; SP.rot2.x = SP.rot2.t; if (!visible) { SP.cx.x = SP.cx.t; SP.a0.x = SP.a0.t; SP.a1.x = SP.a1.t; } }
  dial.style.setProperty('--fc', colOf(p, s));
  visible = true; dial.classList.add('show');
  clearTimeout(hideT); hideT = setTimeout(hideDial, kind === 'na' ? 2200 : 2000);
  if (kind === 'na') showReason(extra); else if (kind !== 'arrive') hint.classList.remove('show');
  kick();
}
function preview() { if (zone == null) zone = 0; setTargets(slotShape(zone)); showDial('main'); snap(); drawDial(); }
function hideDial() { visible = false; dial.classList.remove('show'); SP.l2.t = 0; kick(); }
let hintT;
function hintAt(html, col) {
  const W = window.innerWidth, x = zone === 0 ? 150 : zone === NZ - 1 ? W - 150 : zoneX(zone);
  hint.style.setProperty('--gc', col); hint.innerHTML = html;
  hint.style.bottom = Math.round(window.innerHeight - barTop() + (K.dialY || 0) + R.o1 + 16) + 'px';
  hint.style.left = clamp(x, 268, W - 268) + 'px'; hint.classList.add('show');
  clearTimeout(hintT); hintT = setTimeout(() => hint.classList.remove('show'), 3000);
}
function showHints() { const p = curFn(); hintAt(`<span class="kh-n">${msI(p.ic)}${esc(p.n)}</span>` + p.hints.map(([g, a]) => `<span><b>${g}</b> ${a}</span>`).join(''), colOf(p)); }
function showReason(na) { hintAt(`<span class="kh-na"><b>${esc(na.item)}</b> ${esc(na.reason)}</span>`, '#F0605A'); }
window.addEventListener('resize', () => { if (zone !== null) { setTargets(slotShape(zone)); snap(); drawDial(); } });

/* ---------- run one gesture on the selected zone ---------- */
function fire(g, k) {
  if (zone === null) zone = 0;
  if (TUT.on) { TUT.got(g); return; }
  const p = active()[zone], st = H.state();
  lit = true; clearTimeout(litT); litT = setTimeout(() => { lit = false; paintBar(H.state()); }, 2600);
  if (!p[g]) { showDial('na', { item: g === 'press' ? 'Press' : 'Hold + turn', reason: 'not used on ' + p.n }); paintBar(st); trace(g + ':' + p.key + ':none'); return; }
  try {
    const r = p[g](st, k);
    H.render();
    showDial(g === 'press' ? 'press' : g === 'hturn' ? 'second' : 'main', r);
    trace(g + ':' + p.key + (k ? (k > 0 ? '+' : '') + k : ''));
  } catch (e) {
    if (!e.na) throw e;
    H.render(); showDial('na', e.na); trace(g + ':' + p.key + ':unavailable');
  }
}

/* ---------- slide: five equal zones; inside a zone the dial stays put ---------- */
let lastTurn = 0, held = false, downT = 0;
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  if (held && !(e.buttons & 4) && performance.now() - downT > 800) held = false;
  if (held || performance.now() - lastTurn < LOCK_MS) return;
  const W = window.innerWidth, f = clamp(e.clientX / Math.max(1, W - 1), 0, 1);
  let z = Math.min(NZ - 1, Math.floor(f * NZ));
  if (zone !== null && z !== zone && Math.abs(f - (zone + 0.5) / NZ) < 0.5 / NZ + 0.03) z = zone;
  if (z === zone) return;
  zone = z;
  lightEdge();
  if (TUT.on) { TUT.slid(zone); return; }
  trace('slide:' + curFn().key);
  showDial('arrive');
  setTargets(slotShape(zone));
  showHints();
  clearTimeout(hideT); hideT = setTimeout(hideDial, 2600);
  kick();
}, { passive: true });

/* ---------- turn / hold and turn ---------- */
let acc = 0, emitted = 0, lastWheelT = 0, turnedWhileHeld = false;
const CAL = (() => {
  const el = document.createElement('div'); el.id = 'kCal'; el.hidden = true; document.body.appendChild(el);
  let on = false, sums = [], cur = 0, endT;
  const draw = () => { el.innerHTML = `<div class="kc-box"><b>Calibrating the knob</b><span>Turn the wheel one notch at a time, slowly: ${sums.length + (cur ? 1 : 0)} / 5</span><div class="kc-dots">${[0, 1, 2, 3, 4].map(i => `<i class="${i < sums.length ? 'ok' : ''}"></i>`).join('')}</div><button type="button">Cancel</button></div>`; el.querySelector('button').onclick = stop; };
  const stop = () => { on = false; el.hidden = true; clearTimeout(endT); };
  const close = () => {
    if (cur) { sums.push(cur); cur = 0; }
    draw();
    if (sums.length >= 5) { K.notch = Math.max(1, Math.round(sums.slice().sort((a, b) => a - b)[2])); saveK(); stop(); H.render(); H.toast('tune', 'Notch size set to ' + K.notch); }
  };
  return {
    get on() { return on; },
    start() { on = true; sums = []; cur = 0; el.hidden = false; draw(); },
    feed(e, fresh) { if (fresh && cur) close(); if (!on) return; cur += Math.abs(e.deltaY) * (e.deltaMode === 1 ? 33 : 1); clearTimeout(endT); endT = setTimeout(close, BURST_GAP + 20); draw(); }
  };
})();
document.addEventListener('wheel', e => {
  e.preventDefault();
  const now = performance.now(), fresh = now - lastWheelT > BURST_GAP;
  if (fresh) { acc = 0; emitted = 0; }
  lastWheelT = now; lastTurn = now;
  if (CAL.on) { CAL.feed(e, fresh); return; }
  const unit = e.deltaMode === 1 ? K.notch / 3 : 1;
  acc += -e.deltaY * unit * (K.invert ? -1 : 1);
  if (!acc) return;
  const total = Math.sign(acc) * Math.max(1, Math.floor(Math.abs(acc) / K.notch + 0.55));
  const k = total - emitted;
  if (!k) return;
  emitted = total;
  const h = held || (e.buttons & 4) > 0;
  if (h) turnedWhileHeld = true;
  fire(h ? 'hturn' : 'turn', k);
}, { passive: false });

/* ---------- press: middle button released with no turn in between ---------- */
let stuckT;
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || e.button !== 1) return;
  e.preventDefault();
  held = true; downT = performance.now(); turnedWhileHeld = false;
  clearTimeout(stuckT); stuckT = setTimeout(() => { held = false; }, 6000);
}, true);
function release(e) {
  if (!held || (e && e.pointerType && e.pointerType !== 'mouse')) return;
  held = false; clearTimeout(stuckT);
  if (turnedWhileHeld) return;
  fire('press');
}
document.addEventListener('pointerup', release, true);
document.addEventListener('mouseup', e => { if (e.button === 1) release(e); }, true);
document.addEventListener('pointercancel', () => { held = false; }, true);
window.addEventListener('blur', () => { held = false; });
document.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }, true);
document.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); }, true);

/* the knob's mouse never clicks the screen (touch is not affected) */
let mouseDown = false;
document.addEventListener('pointerdown', e => { mouseDown = e.pointerType === 'mouse'; }, true);
document.addEventListener('click', e => {
  if (K.blockClicks && mouseDown && !e.target.closest('#rp, #rovl, #kTut, #kCal, #kCfg')) { e.stopPropagation(); e.preventDefault(); }
}, true);

/* ---------- tutorial (Settings → Knob · tutorial) ---------- */
const TUT = (() => {
  const STEPS = [
    { id: 'slide', t: 'Slide the knob all the way left', s: 'Each zone in the bottom bar is one function. The far left is your temperature.' },
    { id: 'turn', t: 'Turn the knob', s: 'Turning changes the value: one click, one step.' },
    { id: 'press', t: 'Press the knob', s: 'A press switches something on or off, like the seat heater.' },
    { id: 'hturn', t: 'Hold it down and turn', s: 'Holding while you turn changes the second value, like the fan.' }
  ];
  const el = document.createElement('div'); el.id = 'kTut'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Knob tutorial');
  el.innerHTML = `<div class="kt-card">
    <svg class="kt-art" viewBox="0 0 360 150" aria-hidden="true">
      <line class="kt-rail" x1="30" y1="95" x2="330" y2="95"/>
      ${[30, 105, 180, 255, 330].map(x => `<line class="kt-gate" x1="${x}" y1="83" x2="${x}" y2="107"/>`).join('')}
      <g class="kt-knob"><circle class="kt-fill" cx="180" cy="95" r="30"/><circle class="kt-hold" cx="180" cy="95" r="38" pathLength="100"/>
        <path class="kt-turn" d="M150 60 A44 44 0 0 1 214 58" pathLength="100"/><path class="kt-turn-h" d="M206 50 l10 8 l-12 4"/>
        <path class="kt-down" d="M180 20 v22 M171 34 l9 9 l9 -9"/></g>
      <path class="kt-left" d="M120 40 h-60 M72 30 l-12 10 l12 10"/>
    </svg>
    <div class="kt-dots"></div><h2 class="kt-t"></h2><p class="kt-s"></p>
    <button class="kt-skip" type="button">Skip</button></div>`;
  document.body.appendChild(el);
  let i = 0, on = false, busy = false;
  const show = () => {
    const st = STEPS[i];
    el.dataset.step = st ? st.id : 'done';
    el.querySelector('.kt-dots').innerHTML = STEPS.map((_, n) => `<i class="${n < i ? 'ok' : n === i ? 'cur' : ''}"></i>`).join('');
    el.querySelector('.kt-t').textContent = st ? st.t : 'You are ready';
    el.querySelector('.kt-s').textContent = st ? st.s : 'The bottom bar always shows what each zone controls.';
    el.querySelector('.kt-skip').textContent = st ? 'Skip' : 'Done';
  };
  const stop = () => { on = false; el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 300); trace('tutorial:end:' + i); };
  const pass = () => {
    if (busy) return; busy = true; el.classList.add('ok'); trace('tutorial:' + STEPS[i].id);
    setTimeout(() => { el.classList.remove('ok'); busy = false; i++; show(); if (i >= STEPS.length) setTimeout(() => { if (on && i >= STEPS.length) stop(); }, 2600); }, 750);
  };
  el.querySelector('.kt-skip').addEventListener('click', stop);
  return {
    get on() { return on; },
    start() { if (H.locked()) return; i = 0; on = true; busy = false; show(); el.hidden = false; requestAnimationFrame(() => el.classList.add('show')); trace('tutorial:start'); if (zone === 0) setTimeout(() => { if (on && i === 0) pass(); }, 900); },
    stop,
    slid(z) { if (on && STEPS[i] && STEPS[i].id === 'slide' && z === 0) pass(); },
    got(g) { if (on && STEPS[i] && g === STEPS[i].id) pass(); }
  };
})();
const startTut = () => { if (K.tutorial) TUT.start(); };
if (window.PHMI_BOOTED) setTimeout(startTut, 200); else window.addEventListener('phmi:booted', startTut, { once: true });

/* ---------- customization page: the three middle zones (parked only) ---------- */
const CFG = (() => {
  const el = document.createElement('div'); el.id = 'kCfg'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Customize the knob zones');
  document.body.appendChild(el);
  let draft = null, pick = null, watch;
  const card = (slot, i) => {
    const fixed = i === 0 || i === 4;
    if (fixed) { const f = FN[slot]; return `<div class="cf-slot fixed" style="--gc:#C9CDD3">${msI(f.ic)}<b>${esc(f.n)}</b><small>${msI('lock')}Always here</small></div>`; }
    const f = FN[draft[slot]];
    return `<button class="cf-slot opt set ${pick === slot ? 'pick' : ''}" data-slot="${slot}" style="--gc:${f.col}">${msI(f.ic)}<b>${esc(f.n)}</b><small>Zone ${i + 1} · tap to change</small></button>`;
  };
  const draw = () => {
    const order = ['driver', 's1', 's2', 's3', 'passenger'];
    const others = pick ? ['s1', 's2', 's3'].filter(k => k !== pick).map(k => draft[k]) : [];
    el.innerHTML = `<div class="cf-card">
      <header><h2>Customize the knob zones</h2><span>The two temperature zones are fixed. Choose a function for each of the three zones between them.</span></header>
      <div class="cf-rail">${order.map(card).join('')}</div>
      <div class="cf-track"></div>
      ${pick ? `<div class="cf-list"><span>Zone ${order.indexOf(pick) + 1}:</span>${OPTIONAL.map(k => `<button class="${draft[pick] === k ? 'on' : ''}" data-fn="${k}" ${others.includes(k) ? 'disabled' : ''}>${msI(FN[k].ic)}${esc(FN[k].n)}</button>`).join('')}</div>` : '<p class="cf-note">Tap a middle zone to choose its function. Each function can be in one zone only.</p>'}
      <footer><button class="cf-btn" data-c="cancel">Cancel</button><button class="cf-btn pri" data-c="save">Save</button></footer>
      <p class="cf-note">Changes are possible only while the car is parked.</p></div>`;
  };
  const close = () => { el.hidden = true; clearInterval(watch); draft = null; pick = null; };
  el.addEventListener('click', e => {
    const s = e.target.closest('[data-slot]'), f = e.target.closest('[data-fn]'), c = e.target.closest('[data-c]');
    if (s) { pick = pick === s.dataset.slot ? null : s.dataset.slot; draw(); }
    if (f && !f.disabled) { draft[pick] = f.dataset.fn; pick = null; draw(); }
    if (c && c.dataset.c === 'cancel') close();
    if (c && c.dataset.c === 'save') {
      if (H.state().car.moving) { close(); H.toast('lock', 'Car is moving: zones unchanged'); return; }
      Object.assign(K, draft); fixSlots(); saveK(); close();
      zone = null; content = null; hideDial(); H.render(); H.toast('tune', 'Knob zones saved');
      trace('config:' + [K.s1, K.s2, K.s3].join(','));
    }
  });
  return {
    open() {
      if (H.locked()) return H.toast('lock', 'Knob settings are locked during the test');
      if (H.state().car.moving) return H.toast('lock', 'Customize the knob only while parked');
      draft = { s1: K.s1, s2: K.s2, s3: K.s3 }; pick = null; draw(); el.hidden = false;
      clearInterval(watch); watch = setInterval(() => { if (H.state().car.moving) { close(); H.toast('lock', 'Car started moving: closed, zones unchanged'); } }, 300);
    }
  };
})();

/* a fresh trial starts with nothing pending */
const reset0 = H.reset;
H.reset = function () {
  if (TUT.on) TUT.stop();
  clearTimeout(parkT); FN.nav.i = -1; FN.nav.list = 'fav';
  const r = reset0.apply(this, arguments); X(H.state()); H.renderBar(); return r;
};

/* ---------- settings rows ---------- */
const applyCursor = () => document.documentElement.classList.toggle('knob-nocursor', !!K.hideCursor);
const seg = (act, opts, cur) => `<div class="seg">${opts.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-a="${act}" data-v="${k}" aria-pressed="${cur === k}">${l}</button>`).join('')}</div>`;
const stepper = (act, val) => `<div class="stepper"><button data-a="${act}" data-v="-" aria-label="Less"><span class="ms" aria-hidden="true">remove</span></button><b>${val}</b><button data-a="${act}" data-v="+" aria-label="More"><span class="ms" aria-hidden="true">add</span></button></div>`;
const guard = () => { if (!H.locked()) return false; H.toast('lock', 'Knob settings are locked during the test'); return true; };
H.extend({
  bar: s => { paintBar(s); return null; },
  home: home3,
  railEnd,
  settings: () => `
    <div class="srow"><div><div class="lbl">Knob · zones</div><div class="sub">Driver temp · ${esc(FN[K.s1].n)} · ${esc(FN[K.s2].n)} · ${esc(FN[K.s3].n)} · Passenger temp</div></div><div class="seg"><button data-a="kcfg" data-v="">${H.state().car.moving ? 'Parked only' : 'Customize'}</button></div></div>
    <div class="srow"><div><div class="lbl">Knob · dial position</div><div class="sub">Corner dials inward (→) and all dials up from the zone bar (↑)</div></div><div class="rowr"><span class="sub">→</span>${stepper('kdx', (K.dialX || 0) + ' px')}<span class="sub">↑</span>${stepper('kdy', (K.dialY || 0) + ' px')}</div></div>
    <div class="srow"><div><div class="lbl">Knob · dial size</div><div class="sub">Size of the dial and of its icon</div></div><div class="rowr"><span class="sub">Dial</span>${stepper('kds', (K.dialSize || 100) + '%')}<span class="sub">Icon</span>${stepper('kis', (K.iconSize || 100) + '%')}<div class="seg"><button data-a="kdreset" data-v="">Reset</button></div></div></div>
    <div class="srow"><div><div class="lbl">Knob · tutorial</div><div class="sub">Short lesson on the three gestures after the welcome screen</div></div>${seg('ktut', [['0', 'Off'], ['1', 'On']], K.tutorial ? '1' : '0')}<div class="seg"><button data-a="ktutnow" data-v="">Show now</button></div></div>
    <div class="srow"><div><div class="lbl">Knob · turn direction</div><div class="sub">Which way of turning raises the value</div></div>${seg('kinv', [['0', 'Normal'], ['1', 'Reversed']], K.invert ? '1' : '0')}</div>
    <div class="srow"><div><div class="lbl">Knob · notch size</div><div class="sub">Wheel distance for one step. Calibrate once per mouse</div></div><div class="rowr">${stepper('knotch', K.notch)}<div class="seg"><button data-a="kcal" data-v="">Calibrate</button></div></div></div>
    <div class="srow"><div><div class="lbl">Knob · mouse</div><div class="sub">Hide the cursor and ignore mouse clicks, so only slide, turn and press count</div></div>${seg('kmouse', [['1', 'Knob only'], ['0', 'Normal mouse']], K.blockClicks ? '1' : '0')}</div>`,
  actions: {
    kcfg() { CFG.open(); },
    kdx(v) { if (guard()) return; K.dialX = clamp((K.dialX || 0) + (v === '+' ? 8 : -8), -80, 240); saveK(); preview(); },
    kdy(v) { if (guard()) return; K.dialY = clamp((K.dialY || 0) + (v === '+' ? 8 : -8), -120, 400); saveK(); preview(); },
    kds(v) { if (guard()) return; K.dialSize = clamp((K.dialSize || 100) + (v === '+' ? 10 : -10), 50, 200); saveK(); sizeR(); preview(); },
    kis(v) { if (guard()) return; K.iconSize = clamp((K.iconSize || 100) + (v === '+' ? 10 : -10), 50, 250); saveK(); preview(); },
    kdreset() { if (guard()) return; Object.assign(K, { dialX: 0, dialY: 0, dialSize: 100, iconSize: 100 }); saveK(); sizeR(); preview(); },
    ktut(v) { if (guard()) return; K.tutorial = v === '1'; saveK(); },
    ktutnow() { if (guard()) return; TUT.start(); },
    kinv(v) { if (guard()) return; K.invert = v === '1'; saveK(); },
    knotch(v) { if (guard()) return; const d = K.notch < 20 ? 1 : 5; K.notch = clamp(K.notch + (v === '+' ? d : -d), 1, 400); saveK(); },
    kcal() { if (guard()) return; CAL.start(); },
    kmouse(v) { if (guard()) return; K.blockClicks = v === '1'; K.hideCursor = v === '1'; saveK(); applyCursor(); }
  }
});
X(H.state());
applyCursor();
H.render();
})();
