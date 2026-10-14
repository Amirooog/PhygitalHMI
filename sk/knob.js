/* PhygitalHMI · Sliding Knob (SK) — knob input and its digital layer.
   The knob holds a Bluetooth mouse. Rules from the mouse probe on the iPad (14 Oct 2026):
   - Slide  = cursor position across the screen width → 5 equal positions. The screen edges are the rail's end stops,
              so the knob re-syncs at every end (relative movement is lost at the edge; pointer lock is unsupported).
   - Turn   = mouse wheel. iPadOS smooths one notch into ~4 pixel events summing ≈185 px → 1 step per notch.
   - Press  = middle button (wheel press).
   - Lock   = sideways movement is ignored while turning and while the knob is held down.

   SK-1.0.0-dev.2 · five positions, five gestures (left to right):
     1 Driver climate  turn: temperature   hold+turn: fan         hold: zone on/off   press: seat heat   double: seat vent
     2 Drive           turn: drive mode    hold+turn: ESP 0–3     hold: Custom
     3 Media           turn: volume        hold+turn: next/prev   hold: screen off    press: mute
     4 Navigation      turn: favourites    hold+turn: chargers    hold: cancel        press: start
     5 Passenger       same as driver
   Digital layer (Ch3): edge colour, fading guide, value pop-up with gesture hints. */
(() => {
'use strict';
const H = window.HMI;
if (!H) return;

/* ---------- settings (per device) ---------- */
const KEY = 'phmi.knob';
const K = Object.assign({ notch: 185, invert: false, hideCursor: true, blockClicks: true, longMs: 600, dblMs: 300 },
  (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
delete K.custom;                                                    // dev.1 setting, no longer used
const saveK = () => { try { localStorage.setItem(KEY, JSON.stringify(K)); } catch (e) { /* memory only */ } };
const LOCK_MS = 350, BURST_GAP = 150;

const SEAT = 'M7 3c1 0 2 1 2 2l1 9h7a2 2 0 0 1 2 2v2H9a2 2 0 0 1-2-1.6L5 6c-.2-1.6.7-3 2-3zM9 18v3M17 18v3M13.5 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6M17 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6M20.5 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6';
const VENT = 'M7 3c1 0 2 1 2 2l1 9h7a2 2 0 0 1 2 2v2H9a2 2 0 0 1-2-1.6L5 6c-.2-1.6.7-3 2-3zM9 18v3M17 18v3M17 2.5v7M14 4.2l6 3.6M20 4.2l-6 3.6';
const svgI = p => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${p}"/></svg>`;
const msI = n => `<span class="ms" aria-hidden="true">${n}</span>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tf = v => v <= 16 ? 'LO' : v >= 28 ? 'HI' : (v % 1 ? v.toFixed(1) : String(v)) + '°';
const LV = ['Off', 'Low', 'Medium', 'High'];
const D = H.data;
const ROT = ['range', 'everyday', 'sport', 'snow'];                 // modes on the turn; Custom sits on the hold
const seatCycle = l => [3, 0, 1, 2][l];                             // same order as the touch tile: High → Off → Low → Medium

/* ---------- black screen (Media · hold) ---------- */
const black = document.createElement('div'); black.id = 'kBlack'; black.hidden = true;
black.innerHTML = '<span>Screen off · touch the screen or hold the knob on Media to wake</span>';
let dark = false;
const setDark = on => { dark = on; black.hidden = !on; };
black.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { setDark(false); trace('wake:touch'); } });

/* ---------- climate zone (driver 'L' / passenger 'R') ---------- */
function climZone(side) {
  const d = side === 'L', on = d ? 'dOn' : 'pOn', t = d ? 'dT' : 'pT';
  const who = d ? 'Driver' : 'Passenger';
  const setT = (c, v) => { c[t] = v; if (d && c.sync) c.pT = c.dT; if (!d) c.sync = false; };
  return {
    n: who, ic: d ? 'thermostat' : 'airline_seat_recline_normal', col: d ? '#FF7A45' : '#5BD08A', dbl: true,
    hints: [['Turn', 'Temperature'], ['Hold + turn', 'Fan'], ['Hold', 'On / off'], ['Press', 'Seat heat'], ['Press twice', 'Seat vent']],
    turn(s, k) { const c = s.clim; c[on] = true; setT(c, clamp(c[t] + 0.5 * k, 16, 28)); return 'Temperature'; },
    hturn(s, k) { const c = s.clim; c[on] = true; c.auto = false; c.fan = clamp(c.fan + k, 1, 7); this.view = 'fan'; return 'Fan'; },
    long(s) { const c = s.clim; c[on] = !c[on]; return c[on] ? 'On' : 'Off'; },
    press(s) { const c = s.clim; c['seat' + side] = seatCycle(c['seat' + side]); if (c['seat' + side]) c['vent' + side] = 0; this.view = 'seat'; return 'Seat heat'; },
    dbl(s) { const c = s.clim; c['vent' + side] = seatCycle(c['vent' + side]); if (c['vent' + side]) c['seat' + side] = 0; this.view = 'vent'; return 'Seat vent'; },
    show(s) {
      const c = s.clim, v = this.view; this.view = null;
      if (v === 'fan') return { ic: msI('mode_fan'), val: c.fan + ' / 7', sub: 'Fan · both zones', lvl: c.fan / 7 };
      if (v === 'seat') return { ic: svgI(SEAT), val: LV[c['seat' + side]], sub: who + ' seat heat', lvl: c['seat' + side] / 3 };
      if (v === 'vent') return { ic: svgI(VENT), val: LV[c['vent' + side]], sub: who + ' seat vent', lvl: c['vent' + side] / 3 };
      if (!c[on]) return { val: 'OFF', sub: who + ' climate off · turn to switch on', lvl: 0, txt: true };
      return { val: tf(c[t]), sub: c.auto ? 'Auto · fan ' + c.fan : 'Fan ' + c.fan, lvl: (c[t] - 16) / 12 };
    },
    small: s => s.clim[on] ? tf(s.clim[t]) : 'Off'
  };
}

/* ---------- the five positions ---------- */
const nav = { i: -1, list: 'fav' };                                 // where the turn is in the favourites / chargers list
const P = [
  climZone('L'),
  { n: 'Drive', ic: 'directions_car', col: '#FFC24B',
    hints: [['Turn', 'Drive mode'], ['Hold + turn', 'Stability (ESP)'], ['Hold', 'Custom']],
    turn(s, k) {
      const c = s.car, i = ROT.indexOf(c.mode), j = clamp((i < 0 ? 1 : i) + k, 0, ROT.length - 1), m = D.dmodes[ROT[j]];
      Object.assign(c, { mode: ROT[j], regen: m.regen, steer: m.steer, ride: m.ride }); return 'Drive mode';
    },
    hturn(s, k) { s.car.esp = clamp(s.car.esp + k, 0, 3); this.view = 'esp'; return 'Stability'; },
    long(s) { s.car.mode = 'custom'; return 'Custom'; },
    show(s) {
      const v = this.view; this.view = null;
      if (v === 'esp') return { ic: msI('car_crash'), val: 'ESP ' + D.esp[s.car.esp], sub: s.car.esp ? 'Stability control level ' + s.car.esp : 'Stability control off', lvl: s.car.esp / 3 };
      const m = D.dmodes[s.car.mode];
      return { ic: msI(m.ic), val: m.n, sub: 'ESP ' + D.esp[s.car.esp], lvl: s.car.mode === 'custom' ? 1 : (ROT.indexOf(s.car.mode) + 1) / ROT.length };
    },
    small: s => D.dmodes[s.car.mode].n },
  { n: 'Media', ic: 'volume_up', col: '#A89BFF',
    hints: [['Turn', 'Volume'], ['Hold + turn', 'Next / previous'], ['Hold', 'Screen off'], ['Press', 'Mute']],
    turn(s, k) { const m = s.media; m.mute = false; m.vol = clamp(m.vol + k, 0, 30); return 'Volume'; },
    hturn(s, k) { for (let n = Math.abs(k); n--;) skip(s.media, k > 0); this.view = 'track'; return k > 0 ? 'Next' : 'Previous'; },
    long() { setDark(!dark); return dark ? 'Screen off' : 'Screen on'; },
    press(s) { s.media.mute = !s.media.mute; return s.media.mute ? 'Muted' : 'Unmuted'; },
    show(s) {
      const m = s.media, v = this.view; this.view = null;
      if (v === 'track') { const t = curTrack(m); return { ic: msI('queue_music'), val: t[0], sub: t[1], lvl: 0, txt: true }; }
      return { ic: msI(m.mute ? 'volume_off' : 'volume_up'), val: m.mute ? 'Muted' : String(m.vol), sub: curTrack(m)[0], lvl: m.mute ? 0 : m.vol / 30 };
    },
    small: s => s.media.mute ? 'Muted' : 'Vol ' + s.media.vol },
  { n: 'Navigation', ic: 'near_me', col: '#4CC3E0',
    hints: [['Turn', 'Favourites'], ['Hold + turn', 'Nearest chargers'], ['Press', 'Start'], ['Hold', 'Cancel']],
    turn(s, k) { return pick(s, 'fav', k); },
    hturn(s, k) { return pick(s, 'ev', k); },
    press(s) {
      const n = s.nav;
      if (n.mode === 'preview' && n.sel) { n.dest = n.sel; n.mode = 'route'; n.t0 = Date.now(); s.screen = 'nav'; nav.i = -1; return 'Started'; }
      return 'Turn to choose';
    },
    long(s) {
      const n = s.nav; nav.i = -1;
      if (n.mode === 'preview') { n.sel = null; n.mode = n.dest ? 'route' : 'idle'; return 'Cancelled'; }
      if (n.dest) { n.dest = null; n.sel = null; n.mode = 'idle'; return 'Route ended'; }
      return 'Nothing to cancel';
    },
    show(s) {
      const n = s.nav, id = n.mode === 'preview' ? n.sel : n.dest, p = id && D.poi[id];
      if (!p) return { ic: msI('near_me'), val: 'No route', sub: 'Turn for favourites', lvl: 0, txt: true };
      const km = ((Math.abs(p.x) + Math.abs(p.y)) / 1000).toFixed(1);
      const list = nav.list === 'ev' ? D.chargers : D.favorites;
      return { ic: msI(nav.list === 'ev' ? 'ev_station' : n.mode === 'route' ? 'navigation' : 'star'), val: p.n,
        sub: n.mode === 'route' ? 'On route · hold to end' : `${p.c} · ${km} km · press to start`,
        lvl: n.mode === 'route' ? 1 : (nav.i + 1) / list.length, txt: true };
    },
    small: s => s.nav.mode === 'route' ? D.poi[s.nav.dest].n : s.nav.mode === 'preview' ? D.poi[s.nav.sel].n : 'No route' },
  climZone('R')
];
P.forEach((p, i) => { p.view = null; p.key = ['driver', 'drive', 'media', 'nav', 'passenger'][i]; });

function pick(s, list, k) {
  const ids = list === 'ev' ? D.chargers : D.favorites;
  if (nav.list !== list) { nav.list = list; nav.i = -1; }
  nav.i = clamp(nav.i + (nav.i < 0 ? Math.max(1, k) : k), 0, ids.length - 1);
  const n = s.nav; n.sel = ids[nav.i]; n.mode = 'preview'; s.screen = 'nav'; s.sheet = null;
  return list === 'ev' ? 'Charger' : 'Favourite';
}
function curTrack(m) {
  if (m.src === 'fm') { const f = D.fms.find(x => x.f === m.freq); return [f ? f.n : m.freq.toFixed(1) + ' FM', 'Radio']; }
  const t = m.src === 'usb' ? D.usb[m.usb] : D.tracks[m.track];
  return [t.t, t.a];
}
function skip(m, fwd) {
  if (m.src === 'fm') { const i = D.fms.findIndex(x => x.f === m.freq), j = (Math.max(0, i) + (fwd ? 1 : D.fms.length - 1)) % D.fms.length; m.freq = D.fms[j].f; m.fm = j; return; }
  if (m.src === 'usb') { m.usb = (m.usb + (fwd ? 1 : D.usb.length - 1)) % D.usb.length; m.upos = 0; }
  else { m.track = (m.track + (fwd ? 1 : D.tracks.length - 1)) % D.tracks.length; m.pos = 0; }
  m.playing = true;
}

/* ---------- digital layer ---------- */
const edge = document.createElement('div'); edge.id = 'kEdge'; edge.setAttribute('aria-hidden', 'true');
const guide = document.createElement('div'); guide.id = 'kGuide'; guide.setAttribute('aria-hidden', 'true');
const pop = document.createElement('div'); pop.id = 'kPop'; pop.setAttribute('role', 'status'); pop.setAttribute('aria-live', 'polite');
document.body.append(black, edge, guide, pop);

let zone = null;
function drawEdge() {
  edge.innerHTML = P.map((p, i) => `<i style="${i === zone ? `background:${p.col};box-shadow:0 0 18px ${p.col}` : ''}"></i>`).join('');
}
let guideT;
function showGuide() {
  const s = H.state();
  guide.innerHTML = P.map((p, i) => `<div class="kg${i === zone ? ' on' : ''}" style="--gc:${p.col}">${msI(p.ic)}<span><b>${p.n}</b><small>${p.small(s)}</small></span></div>`).join('');
  guide.classList.add('show');
  clearTimeout(guideT); guideT = setTimeout(() => guide.classList.remove('show'), 1400);
}
let popT;
function showPop(label, withHints) {
  const p = P[zone], s = H.state(), v = p.show(s), x = (zone + 0.5) / P.length * window.innerWidth;
  pop.style.left = clamp(x, 150, window.innerWidth - 150) + 'px';
  pop.style.setProperty('--gc', p.col);
  pop.innerHTML = `<div class="kh">${v.ic || msI(p.ic)}<span>${p.n}</span>${label ? `<em>${label}</em>` : ''}</div>
    <div class="kv${v.txt ? ' txt' : ''}">${v.val}</div>
    <div class="kbar"><i style="width:${Math.round(clamp(v.lvl, 0, 1) * 100)}%"></i></div>
    <div class="ks">${v.sub}</div>
    ${withHints ? `<ul class="khint">${p.hints.map(([g, a]) => `<li><b>${g}</b><span>${a}</span></li>`).join('')}</ul>` : ''}`;
  pop.classList.add('show');
  clearTimeout(popT); popT = setTimeout(() => pop.classList.remove('show'), withHints ? 2600 : 1600);
}
const trace = l => { if (window.PHMI_TRACE) window.PHMI_TRACE(l); };

/* run one gesture on the selected position */
function fire(g, k) {
  if (zone === null) { zone = 0; drawEdge(); }
  const p = P[zone];
  if (!p[g]) { showPop('', true); trace(g + ':' + p.key + ':none'); return; }   // gesture not used here: show what is
  const label = p[g](H.state(), k);
  H.render();
  showPop(label, false); showGuide();
  trace(g + ':' + p.key + (k ? (k > 0 ? '+' : '') + k : ''));
}

/* ---------- slide: cursor position → position (with a little hysteresis at the borders) ---------- */
let lastTurn = 0, held = false;
const HALF = 0.5 / 5;
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  if (held && !(e.buttons & 4) && performance.now() - downT > K.longMs + 200) held = false;   // missed button-up: unstick
  if (held || performance.now() - lastTurn < LOCK_MS) return;      // locked while turning or held
  const f = clamp(e.clientX / Math.max(1, window.innerWidth - 1), 0, 1);
  let z = Math.min(P.length - 1, Math.floor(f * P.length));
  if (zone !== null && z !== zone && Math.abs(f - (zone + 0.5) / P.length) < HALF + 0.02) z = zone;
  if (z === zone) return;
  zone = z;
  cancelTap();
  drawEdge(); showGuide(); showPop('', true);
  trace('slide:' + P[zone].key);
}, { passive: true });

/* ---------- turn / hold + turn: wheel bursts → steps ---------- */
let acc = 0, emitted = 0, lastWheelT = 0, turnedWhileHeld = false;
document.addEventListener('wheel', e => {
  e.preventDefault();
  const now = performance.now();
  if (now - lastWheelT > BURST_GAP) { acc = 0; emitted = 0; }
  lastWheelT = now; lastTurn = now;
  const unit = e.deltaMode === 1 ? K.notch / 3 : 1;               // line-mode wheels: ~3 lines per notch
  acc += -e.deltaY * unit * (K.invert ? -1 : 1);                   // wheel away from you = up = more
  const total = Math.sign(acc) * Math.floor(Math.abs(acc) / K.notch + 0.55);
  const k = total - emitted;
  if (!k) return;
  emitted = total;
  const h = held || (e.buttons & 4) > 0;
  if (h) { turnedWhileHeld = true; clearTimeout(longT); }
  cancelTap();
  fire(h ? 'hturn' : 'turn', k);
}, { passive: false });

/* ---------- press / double press / long press: middle button ---------- */
let downT = 0, longT, stuckT, longFired = false, tapT = null;
const cancelTap = () => { if (tapT) { clearTimeout(tapT); tapT = null; fire('press'); } };   // a pending single press is not lost
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse' || e.button !== 1) return;
  e.preventDefault();
  held = true; downT = performance.now(); longFired = false; turnedWhileHeld = false;
  clearTimeout(longT);
  clearTimeout(stuckT); stuckT = setTimeout(() => { held = false; }, 4000);   // safety net if the release never arrives
  longT = setTimeout(() => { if (held && !turnedWhileHeld) { longFired = true; if (tapT) { clearTimeout(tapT); tapT = null; } fire('long'); } }, K.longMs);
}, true);
function release(e) {
  if (!held || (e && e.pointerType && e.pointerType !== 'mouse')) return;   // iPadOS may report a different button on release
  held = false; clearTimeout(longT); clearTimeout(stuckT);
  if (longFired || turnedWhileHeld) return;
  if (zone === null) { zone = 0; drawEdge(); }
  const p = P[zone];
  if (!p.dbl) { fire('press'); return; }
  if (tapT) { clearTimeout(tapT); tapT = null; fire('dbl'); return; }   // second press in time → double
  tapT = setTimeout(() => { tapT = null; fire('press'); }, K.dblMs);
}
document.addEventListener('pointerup', release, true);
document.addEventListener('mouseup', e => { if (e.button === 1) release(e); }, true);
document.addEventListener('pointercancel', () => { held = false; clearTimeout(longT); clearTimeout(stuckT); }, true);

/* raw event readout for checking the knob on the iPad: open sk/?kdebug */
if (/[?&]kdebug/.test(location.search)) {
  const dbg = document.createElement('pre'); dbg.id = 'kDbg'; document.body.append(dbg);
  const lines = [];
  const log = (t, e) => { lines.unshift(`${(performance.now() / 1000).toFixed(2)} ${t} ${e.pointerType || ''} btn=${e.button ?? ''} btns=${e.buttons ?? ''}${e.deltaY != null ? ' dy=' + e.deltaY.toFixed(1) : ''} held=${held} zone=${zone}`); lines.length = Math.min(lines.length, 14); dbg.textContent = lines.join('\n'); };
  ['pointerdown', 'pointerup', 'pointercancel', 'mousedown', 'mouseup', 'auxclick', 'wheel'].forEach(t => document.addEventListener(t, e => log(t, e), { capture: true, passive: true }));
  let mv = 0; document.addEventListener('pointermove', e => { if (++mv % 15 === 0) log('move x=' + Math.round(e.clientX), e); }, { capture: true, passive: true });
}
window.addEventListener('blur', () => { held = false; clearTimeout(longT); });
document.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }, true);
document.addEventListener('auxclick', e => { if (e.button === 1) e.preventDefault(); }, true);

/* the knob's mouse should never click the screen: block its clicks (touch is not affected) */
let mouseDown = false;
document.addEventListener('pointerdown', e => { mouseDown = e.pointerType === 'mouse'; }, true);
document.addEventListener('click', e => {
  if (K.blockClicks && mouseDown && !e.target.closest('#rp, #rovl')) { e.stopPropagation(); e.preventDefault(); }
}, true);

/* a fresh trial starts with the screen on and nothing pending */
const reset0 = H.reset;
H.reset = function () { setDark(false); if (tapT) { clearTimeout(tapT); tapT = null; } nav.i = -1; P.forEach(p => { p.view = null; }); return reset0.apply(this, arguments); };

/* ---------- settings rows (set while parked; locked during a trial) ---------- */
const applyCursor = () => document.documentElement.classList.toggle('knob-nocursor', !!K.hideCursor);
const seg = (act, opts, cur) => `<div class="seg">${opts.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-a="${act}" data-v="${k}" aria-pressed="${cur === k}">${l}</button>`).join('')}</div>`;
const stepper = (act, val, unit) => `<div class="stepper"><button data-a="${act}" data-v="-" aria-label="Less"><span class="ms" aria-hidden="true">remove</span></button><b>${val}${unit || ''}</b><button data-a="${act}" data-v="+" aria-label="More"><span class="ms" aria-hidden="true">add</span></button></div>`;
const guard = () => { if (!H.locked()) return false; H.toast('lock', 'Knob settings are locked during the test'); return true; };
H.extend({
  settings: () => `
    <div class="srow"><div><div class="lbl">Knob · turn direction</div><div class="sub">Which way of turning raises the value</div></div>${seg('kinv', [['0', 'Normal'], ['1', 'Reversed']], K.invert ? '1' : '0')}</div>
    <div class="srow"><div><div class="lbl">Knob · notch size</div><div class="sub">Wheel distance for one step (measured: 185)</div></div>${stepper('knotch', K.notch)}</div>
    <div class="srow"><div><div class="lbl">Knob · hold time</div><div class="sub">How long to hold the knob down for a long press</div></div>${stepper('klong', K.longMs, ' ms')}</div>
    <div class="srow"><div><div class="lbl">Knob · double-press window</div><div class="sub">Time allowed between two presses (climate positions)</div></div>${stepper('kdbl', K.dblMs, ' ms')}</div>
    <div class="srow"><div><div class="lbl">Knob · mouse</div><div class="sub">Hide the cursor and ignore mouse clicks, so only the knob's slide, turn and press count</div></div>${seg('kmouse', [['1', 'Knob only'], ['0', 'Normal mouse']], K.blockClicks ? '1' : '0')}</div>`,
  actions: {
    kinv(v) { if (guard()) return; K.invert = v === '1'; saveK(); },
    knotch(v) { if (guard()) return; K.notch = clamp(K.notch + (v === '+' ? 5 : -5), 60, 400); saveK(); },
    klong(v) { if (guard()) return; K.longMs = clamp(K.longMs + (v === '+' ? 50 : -50), 400, 1200); saveK(); },
    kdbl(v) { if (guard()) return; K.dblMs = clamp(K.dblMs + (v === '+' ? 25 : -25), 200, 500); saveK(); },
    kmouse(v) { if (guard()) return; K.blockClicks = v === '1'; K.hideCursor = v === '1'; saveK(); applyCursor(); }
  }
});
applyCursor();
drawEdge();
H.render();   // show the new Settings rows if Settings is open
})();
