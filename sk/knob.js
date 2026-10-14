/* PhygitalHMI · Sliding Knob (SK) — knob input and its digital layer.
   The knob holds a Bluetooth mouse. Rules from the mouse probe on the iPad (14 Oct 2026):
   - Slide  = cursor position across the screen width → 4 equal zones. The screen edges are the rail's end stops,
              so the knob re-syncs at every end (relative movement is lost at the edge; pointer lock is unsupported).
   - Turn   = mouse wheel. iPadOS smooths one notch into ~4 pixel events summing ≈185 px → 1 step per notch.
   - Press  = middle button (wheel press) → on/off within the selected group.
   - Lock   = sideways movement is ignored for a moment after each turn, so turning never changes the position.
   Digital layer (Ch3): edge colour, fading guide, value pop-up. */
(() => {
'use strict';
const H = window.HMI;
if (!H) return;

/* ---------- settings (per device) ---------- */
const KEY = 'phmi.knob';
const K = Object.assign({ notch: 185, invert: false, custom: 'seat', hideCursor: true, blockClicks: true },
  (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
const saveK = () => { try { localStorage.setItem(KEY, JSON.stringify(K)); } catch (e) { /* memory only */ } };
const LOCK_MS = 350, BURST_GAP = 150;

const SEAT = 'M7 3c1 0 2 1 2 2l1 9h7a2 2 0 0 1 2 2v2H9a2 2 0 0 1-2-1.6L5 6c-.2-1.6.7-3 2-3zM9 18v3M17 18v3M13.5 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6M17 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6M20.5 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6';
const VENT = 'M7 3c1 0 2 1 2 2l1 9h7a2 2 0 0 1 2 2v2H9a2 2 0 0 1-2-1.6L5 6c-.2-1.6.7-3 2-3zM9 18v3M17 18v3M17 2.5v7M14 4.2l6 3.6M20 4.2l-6 3.6';
const icon = g => g.path ? `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${g.path}"/></svg>` : `<span class="ms" aria-hidden="true">${g.ic}</span>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const tf = v => v <= 16 ? 'LO' : v >= 28 ? 'HI' : (v % 1 ? v.toFixed(1) : String(v)) + '°';
const LV = ['Off', 'Low', 'Medium', 'High'];

/* groups: what one step and one press do, and how the value is shown */
const G = {
  temp: { n: 'Temperature', ic: 'thermostat', col: '#FF7A45', press: 'Auto',
    step(s, k) { const c = s.clim; c.dT = clamp(c.dT + 0.5 * k, 16, 28); if (c.sync) c.pT = c.dT; },
    tap(s) { s.clim.auto = !s.clim.auto; },
    val: s => tf(s.clim.dT), sub: s => s.clim.auto ? 'Auto on' : 'Driver', lvl: s => (s.clim.dT - 16) / 12 },
  fan: { n: 'Fan', ic: 'mode_fan', col: '#4CC3E0', press: 'A/C',
    step(s, k) { const c = s.clim; c.auto = false; c.fan = clamp(c.fan + k, 1, 7); },
    tap(s) { s.clim.ac = !s.clim.ac; },
    val: s => s.clim.auto ? 'AUTO' : s.clim.fan + ' / 7', sub: s => 'A/C ' + (s.clim.ac ? 'on' : 'off'), lvl: s => s.clim.auto ? 0 : s.clim.fan / 7 },
  vol: { n: 'Volume', ic: 'volume_up', col: '#A89BFF', press: 'Mute',
    step(s, k) { const m = s.media; m.mute = false; m.vol = clamp(m.vol + k, 0, 30); },
    tap(s) { s.media.mute = !s.media.mute; },
    val: s => s.media.mute ? 'Muted' : String(s.media.vol), sub: () => 'Media', lvl: s => s.media.mute ? 0 : s.media.vol / 30 },
  seat: { n: 'Seat heat', path: SEAT, col: '#FF9F43', press: 'On/off',
    step(s, k) { const c = s.clim; c.seatL = clamp(c.seatL + k, 0, 3); if (c.seatL) c.ventL = 0; },
    tap(s) { const c = s.clim; if (c.seatL) { mem.seat = c.seatL; c.seatL = 0; } else { c.seatL = mem.seat || 2; c.ventL = 0; } },
    val: s => LV[s.clim.seatL], sub: () => 'Driver', lvl: s => s.clim.seatL / 3 },
  vent: { n: 'Seat vent', path: VENT, col: '#5AA2FF', press: 'On/off',
    step(s, k) { const c = s.clim; c.ventL = clamp(c.ventL + k, 0, 3); if (c.ventL) c.seatL = 0; },
    tap(s) { const c = s.clim; if (c.ventL) { mem.vent = c.ventL; c.ventL = 0; } else { c.ventL = mem.vent || 2; c.seatL = 0; } },
    val: s => LV[s.clim.ventL], sub: () => 'Driver', lvl: s => s.clim.ventL / 3 },
  ptemp: { n: 'Passenger temp', ic: 'airline_seat_recline_normal', col: '#5BD08A', press: 'Sync',
    step(s, k) { const c = s.clim; c.pT = clamp(c.pT + 0.5 * k, 16, 28); c.sync = false; },
    tap(s) { const c = s.clim; c.sync = !c.sync; if (c.sync) c.pT = c.dT; },
    val: s => tf(s.clim.pT), sub: s => s.clim.sync ? 'Synced with driver' : 'Passenger', lvl: s => (s.clim.pT - 16) / 12 }
};
const CUSTOM = { seat: 'Seat heat', vent: 'Seat vent', ptemp: 'Passenger temp' };
const mem = { seat: 2, vent: 2 };
const order = () => ['temp', 'fan', 'vol', CUSTOM[K.custom] ? K.custom : 'seat'];

/* ---------- digital layer ---------- */
const edge = document.createElement('div'); edge.id = 'kEdge'; edge.setAttribute('aria-hidden', 'true');
const guide = document.createElement('div'); guide.id = 'kGuide'; guide.setAttribute('aria-hidden', 'true');
const pop = document.createElement('div'); pop.id = 'kPop'; pop.setAttribute('role', 'status'); pop.setAttribute('aria-live', 'polite');
document.body.append(edge, guide, pop);

let zone = null;
function drawEdge() {
  edge.innerHTML = order().map((g, i) => `<i style="${i === zone ? `background:${G[g].col};box-shadow:0 0 18px ${G[g].col}` : ''}"></i>`).join('');
}
let guideT;
function showGuide() {
  const s = H.state();
  guide.innerHTML = order().map((g, i) => `<div class="kg${i === zone ? ' on' : ''}" style="--gc:${G[g].col}">${icon(G[g])}<span><b>${G[g].n}</b><small>${G[g].val(s)}</small></span></div>`).join('');
  guide.classList.add('show');
  clearTimeout(guideT); guideT = setTimeout(() => guide.classList.remove('show'), 1400);
}
let popT;
function showPop(g, pressed) {
  const s = H.state(), x = (zone + 0.5) / 4 * window.innerWidth;
  pop.style.left = clamp(x, 150, window.innerWidth - 150) + 'px';
  pop.style.setProperty('--gc', G[g].col);
  pop.innerHTML = `<div class="kh">${icon(G[g])}<span>${G[g].n}</span>${pressed ? `<em>${G[g].press}</em>` : ''}</div>
    <div class="kv">${G[g].val(s)}</div>
    <div class="kbar"><i style="width:${Math.round(clamp(G[g].lvl(s), 0, 1) * 100)}%"></i></div>
    <div class="ks">${G[g].sub(s)}</div>`;
  pop.classList.add('show');
  clearTimeout(popT); popT = setTimeout(() => pop.classList.remove('show'), 1600);
}
const trace = l => { if (window.PHMI_TRACE) window.PHMI_TRACE(l); };

/* ---------- slide: cursor position → zone (with a little hysteresis at the borders) ---------- */
let lastTurn = 0;
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  if (performance.now() - lastTurn < LOCK_MS) return;           // locked while turning
  const f = clamp(e.clientX / Math.max(1, window.innerWidth - 1), 0, 1);
  let z = Math.min(3, Math.floor(f * 4));
  if (zone !== null && z !== zone && Math.abs(f - (zone + 0.5) / 4) < 0.125 + 0.02) z = zone;
  if (z === zone) return;
  zone = z;
  drawEdge(); showGuide();
  trace('slide:' + order()[zone]);
}, { passive: true });

/* ---------- turn: wheel bursts → steps ---------- */
let acc = 0, emitted = 0, lastWheelT = 0;
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
  if (zone === null) { zone = 0; drawEdge(); }
  const g = order()[zone];
  G[g].step(H.state(), k);
  H.render();
  showPop(g, false); showGuide();
  trace('turn:' + g + (k > 0 ? '+' : '') + k);
}, { passive: false });

/* ---------- press: middle button ---------- */
document.addEventListener('pointerdown', e => {
  if (e.pointerType !== 'mouse') return;
  if (e.button === 1) {
    e.preventDefault();
    if (zone === null) { zone = 0; drawEdge(); }
    const g = order()[zone];
    G[g].tap(H.state());
    H.render();
    showPop(g, true); showGuide();
    trace('press:' + g);
  }
}, true);
document.addEventListener('mousedown', e => { if (e.button === 1) e.preventDefault(); }, true);
/* the knob's mouse should never click the screen: block its clicks (touch is not affected) */
let mouseDown = false;
document.addEventListener('pointerdown', e => { mouseDown = e.pointerType === 'mouse'; }, true);
document.addEventListener('click', e => {
  if (K.blockClicks && mouseDown && !e.target.closest('#rp, #rovl')) { e.stopPropagation(); e.preventDefault(); }
}, true);

/* ---------- settings rows (set while parked; locked during a trial) ---------- */
const applyCursor = () => document.documentElement.classList.toggle('knob-nocursor', !!K.hideCursor);
const seg = (act, opts, cur) => `<div class="seg">${opts.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-a="${act}" data-v="${k}" aria-pressed="${cur === k}">${l}</button>`).join('')}</div>`;
H.extend({
  settings: () => `
    <div class="srow"><div><div class="lbl">Knob · fourth position</div><div class="sub">The position the driver sets while parked</div></div>${seg('kcustom', Object.entries(CUSTOM), K.custom)}</div>
    <div class="srow"><div><div class="lbl">Knob · turn direction</div><div class="sub">Which way of turning raises the value</div></div>${seg('kinv', [['0', 'Normal'], ['1', 'Reversed']], K.invert ? '1' : '0')}</div>
    <div class="srow"><div><div class="lbl">Knob · notch size</div><div class="sub">Wheel distance for one step (measured: 185)</div></div>
      <div class="stepper"><button data-a="knotch" data-v="-" aria-label="Smaller"><span class="ms" aria-hidden="true">remove</span></button><b>${K.notch}</b><button data-a="knotch" data-v="+" aria-label="Larger"><span class="ms" aria-hidden="true">add</span></button></div></div>
    <div class="srow"><div><div class="lbl">Knob · mouse</div><div class="sub">Hide the cursor and ignore mouse clicks, so only the knob's slide, turn and press count</div></div>${seg('kmouse', [['1', 'Knob only'], ['0', 'Normal mouse']], K.blockClicks ? '1' : '0')}</div>`,
  actions: {
    kcustom(v) { if (H.locked()) return H.toast('lock', 'Knob settings are locked during the test'); if (CUSTOM[v]) { K.custom = v; saveK(); drawEdge(); } },
    kinv(v) { if (H.locked()) return H.toast('lock', 'Knob settings are locked during the test'); K.invert = v === '1'; saveK(); },
    knotch(v) { if (H.locked()) return H.toast('lock', 'Knob settings are locked during the test'); K.notch = clamp(K.notch + (v === '+' ? 5 : -5), 60, 400); saveK(); },
    kmouse(v) { if (H.locked()) return H.toast('lock', 'Knob settings are locked during the test'); K.blockClicks = v === '1'; K.hideCursor = v === '1'; saveK(); applyCursor(); }
  }
});
applyCursor();
drawEdge();
H.render();   // show the new Settings rows if Settings is open
})();
