/* PhygitalHMI · Sliding Knob 2 (SK2) — the Ch4 design (Draft 21.11), tested in Ch5 after TB and SK1.
   Input: a plain Bluetooth mouse (the printed knob is not used in the test).
   - Slide = cursor x across the screen, split into equal zones, one per FILLED slot. Screen edges = rail end stops.
   - Turn  = wheel. One notch = one step (calibrate the notch size per mouse in Settings).
   - Press = middle button released with no turn in between.
   - Hold and turn = turning while the middle button is held (no time threshold).
   - Slide lock: 350 ms after a turn and the whole time the button is held.

   Slots, left to right: Driver temp · optional 1 · Media · optional 2 · Passenger temp.
   The optional slots are empty by default; an empty slot has no zone (the knob passes over it).
   Optional functions (set in Settings → Customize, parked only, R35): seat ventilation, navigation shortcut, drive mode.

   Gesture map (Ch4 Tables 4-5 and 4-7)            turn                  press                    hold and turn
     Driver temp                                    temperature 0.5 °C    driver seat heater       driver fan
     Media                                          volume                play / pause             next / previous track
     Passenger temp                                 temperature 0.5 °C    passenger seat heater    passenger fan
     Seat ventilation (optional)                    level 0–3             heating ↔ ventilation    —
     Navigation shortcut (optional)                 favourites (max 6)    start route              nearest chargers
     Drive mode (optional)                          drive mode            —                        stability control (Off only parked)
   Values stop at the ends of their range (R21). Turning a zone that is off switches it on.

   Digital layer (Ch4 Figure 4-6, Table 4-10): edge strip (dim when idle) · arrival hints for the 3 gestures (≈3 s) ·
   arc with previous/current/next values (≈2 s) · paler arc for the second value · on/off icon on press (≈1 s) ·
   unavailable: greyed item plus a reason (≈2 s). Shown over every screen. */
(() => {
'use strict';
const H = window.HMI;
if (!H) return;

/* ---------- settings (per device) ---------- */
const KEY = 'phmi.knob2';
const K = Object.assign({ notch: 185, invert: false, hideCursor: true, blockClicks: true, tutorial: false, opt1: '', opt2: '' },
  (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
const saveK = () => { try { localStorage.setItem(KEY, JSON.stringify(K)); } catch (e) { /* memory only */ } };
const LOCK_MS = 350, BURST_GAP = 150;

const msI = n => `<span class="ms" aria-hidden="true">${n}</span>`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tf = v => v <= 16 ? 'LO' : v >= 28 ? 'HI' : (v % 1 ? v.toFixed(1) : String(v)) + '°';
const LV = ['Off', 'Low', 'Medium', 'High'];
const TEMPS = []; for (let v = 16; v <= 28; v += 0.5) TEMPS.push(tf(v));
const FAN = ['1', '2', '3', '4', '5', '6', '7'];
const VOLS = Array.from({ length: 31 }, (_, i) => String(i));
const D = H.data;
const ROT = ['range', 'everyday', 'sport', 'snow'];
const trace = l => { if (window.PHMI_TRACE) window.PHMI_TRACE(l); };

/* ---------- functions ---------- */
const unavailable = (item, reason) => { const e = new Error(reason); e.na = { item, reason }; throw e; };
function climate(side) {
  const d = side === 'L', on = d ? 'dOn' : 'pOn', t = d ? 'dT' : 'pT', fan = d ? 'fan' : 'fanP', seat = 'seat' + side, vent = 'vent' + side;
  const who = d ? 'Driver' : 'Passenger';
  return {
    key: d ? 'driver' : 'passenger', n: who + ' temp', short: 'Temp', ic: d ? 'thermostat' : 'airline_seat_recline_normal', col: d ? '#FF7A45' : '#5BD08A',
    hints: [['Turn', 'Temperature'], ['Press', 'Seat heater'], ['Hold + turn', 'Fan']],
    turn(s, k) { const c = s.clim; c[on] = true; c[t] = clamp(c[t] + 0.5 * k, 16, 28); if (d && c.sync) c.pT = c.dT; if (!d) c.sync = false; },
    hturn(s, k) { const c = s.clim; c[on] = true; c.auto = false; c[fan] = clamp((c[fan] ?? c.fan) + k, 1, 7); },
    press(s) { const c = s.clim; if (c[seat]) c[seat] = 0; else { c[seat] = 3; c[vent] = 0; } return { icon: 'local_fire_department', on: !!c[seat], short: c[seat] ? 'On' : 'Off', label: 'Seat heater ' + (c[seat] ? 'on' : 'off') }; },
    main: s => ({ id: 'temp', head: who + ' temperature', items: TEMPS, cur: Math.round((s.clim[t] - 16) * 2), sub: s.clim[on] ? 'Fan ' + (s.clim[fan] ?? s.clim.fan) : 'Off · turn to switch on' }),
    second: s => ({ id: 'fan', head: who + ' fan', ic: 'mode_fan', items: FAN, cur: (s.clim[fan] ?? s.clim.fan) - 1 })
  };
}
const curTrack = m => {
  if (m.src === 'fm') { const f = D.fms.find(x => x.f === m.freq); return [f ? f.n : m.freq.toFixed(1) + ' FM', 'Radio']; }
  const x = m.src === 'usb' ? D.usb[m.usb] : D.tracks[m.track]; return [x.t, x.a];
};
const trackList = m => m.src === 'fm' ? D.fms.map(f => f.n) : (m.src === 'usb' ? D.usb : D.tracks).map(x => x.t);
const trackIdx = m => m.src === 'fm' ? Math.max(0, D.fms.findIndex(f => f.f === m.freq)) : m.src === 'usb' ? m.usb : m.track;
const FN = {
  driver: climate('L'),
  passenger: climate('R'),
  media: {
    key: 'media', n: 'Media', short: 'Media', ic: 'volume_up', col: '#A89BFF',
    hints: [['Turn', 'Volume'], ['Press', 'Play / pause'], ['Hold + turn', 'Next / previous track']],
    turn(s, k) { const m = s.media; m.mute = false; m.vol = clamp(m.vol + k, 0, 30); },
    hturn(s, k) {
      const m = s.media, n = trackList(m).length, i = clamp(trackIdx(m) + k, 0, n - 1);
      if (m.src === 'fm') { m.freq = D.fms[i].f; m.fm = i; } else if (m.src === 'usb') { m.usb = i; m.upos = 0; } else { if (i !== m.track) m.pos = 0; m.track = i; }
      m.playing = true;
    },
    press(s) { s.media.playing = !s.media.playing; return { icon: s.media.playing ? 'play_arrow' : 'pause', on: s.media.playing, short: s.media.playing ? 'Play' : 'Pause', label: s.media.playing ? 'Playing' : 'Paused' }; },
    main: s => ({ id: 'vol', head: 'Volume', ic: s.media.mute ? 'volume_off' : 'volume_up', items: VOLS, cur: s.media.vol, sub: curTrack(s.media)[0] }),
    second: s => ({ id: 'track-' + s.media.src, head: s.media.src === 'fm' ? 'Station' : 'Track', ic: 'queue_music', items: trackList(s.media), cur: trackIdx(s.media), sub: curTrack(s.media)[1] })
  },
  vent: {
    key: 'vent', n: 'Seat ventilation', short: 'Seat', ic: 'airline_seat_recline_extra', col: '#5AA2FF', opt: true,
    hints: [['Turn', 'Level 0–3'], ['Press', 'Heating ↔ ventilation']],
    mode: 'vent',
    turn(s, k) { const c = s.clim, f = this.mode === 'vent' ? 'ventL' : 'seatL', o = f === 'ventL' ? 'seatL' : 'ventL'; c[f] = clamp(c[f] + k, 0, 3); if (c[f]) c[o] = 0; },
    press(s) {
      const c = s.clim, lvl = Math.max(c.ventL, c.seatL);
      this.mode = this.mode === 'vent' ? 'heat' : 'vent';
      if (this.mode === 'vent') { c.ventL = lvl; c.seatL = 0; } else { c.seatL = lvl; c.ventL = 0; }
      return { icon: this.mode === 'vent' ? 'mode_fan' : 'local_fire_department', on: true, short: this.mode === 'vent' ? 'Vent' : 'Heat', label: this.mode === 'vent' ? 'Ventilation' : 'Heating' };
    },
    main(s) { const v = this.mode === 'vent'; return { id: 'lvl-' + this.mode, head: 'Driver seat ' + (v ? 'ventilation' : 'heating'), items: LV, cur: v ? s.clim.ventL : s.clim.seatL }; }
  },
  nav: {
    key: 'nav', n: 'Navigation', short: 'Nav', ic: 'near_me', col: '#4CC3E0', opt: true,
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
  drive: {
    key: 'drive', n: 'Drive mode', short: 'Drive', ic: 'directions_car', col: '#FFC24B', opt: true,
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
  }
};
const OPTIONAL = ['vent', 'nav', 'drive'];
const slots = () => ['driver', K.opt1, 'media', K.opt2, 'passenger'];
const active = () => slots().filter(Boolean).map(k => FN[k]);

/* ---------- digital layer: the dial (thesis Figure 5-4, wireframes 19 Oct 2026) ----------
   Shape follows the knob: quarter circle in the bottom corner at each rail end, half circle on the bottom edge
   in the middle and at assigned optional slots; an empty slot has no dial.
   Rings: inner = function icon (and on/off on press) · middle = main value · outer = second value, only during
   hold + turn, while the middle ring shrinks and dims. The whole value ring, with its ticks and numbers, rotates
   under a fixed marker (top centre on the half circle, the 45° line on the quarter circle).
   Motion: the dial follows the knob live while sliding, stretches toward the direction of travel and settles into
   the slot's shape with a short spring. Idle = edge strip only, dim. The dial fades about 2 s after the last action. */
const edge = document.createElement('div'); edge.id = 'kEdge'; edge.setAttribute('aria-hidden', 'true');
const dial = document.createElement('div'); dial.id = 'kDial'; dial.setAttribute('role', 'status'); dial.setAttribute('aria-live', 'polite');
const hint = document.createElement('div'); hint.id = 'kHint'; hint.setAttribute('aria-hidden', 'true');
document.body.append(edge, dial, hint);

let zone = null, lit = false, litT;
function drawEdge() {
  const A = active();
  edge.style.gridTemplateColumns = `repeat(${A.length}, 1fr)`;
  edge.innerHTML = A.map((p, i) => `<i style="${i === zone ? (lit ? `background:${p.col};box-shadow:0 0 18px ${p.col}` : `background:${p.col};opacity:.38`) : ''}"></i>`).join('');
}
function lightEdge() { lit = true; drawEdge(); clearTimeout(litT); litT = setTimeout(() => { lit = false; drawEdge(); }, 3000); }

/* springs: x moves toward t; a little overshoot, then settles (motion only, no transparency) */
const spring = x => ({ x, v: 0, t: x });
const SP = { cx: spring(0), a0: spring(0), a1: spring(180), rot: spring(0), rot2: spring(0), l2: spring(0), press: spring(0) };
let raf = 0, lastT = 0, visible = false, hideT, content = null;   // content: { fn, main, second, flash, na }
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

const R = { inner: 72, m0: 80, m1: 134, o0: 140, o1: 184 };
const pt = (cx, cy, r, a) => [cx + r * Math.cos(a * Math.PI / 180), cy - r * Math.sin(a * Math.PI / 180)];
function sector(cx, cy, r0, r1, a0, a1) {
  const big = a1 - a0 > 180 ? 1 : 0, [x0, y0] = pt(cx, cy, r1, a0), [x1, y1] = pt(cx, cy, r1, a1);
  if (r0 <= 0) return `M${cx},${cy} L${x0},${y0} A${r1},${r1} 0 ${big} 0 ${x1},${y1} Z`;
  const [x2, y2] = pt(cx, cy, r0, a1), [x3, y3] = pt(cx, cy, r0, a0);
  return `M${x0},${y0} A${r1},${r1} 0 ${big} 0 ${x1},${y1} L${x2},${y2} A${r0},${r0} 0 ${big} 1 ${x3},${y3} Z`;
}
// spacing from the widest label, so numbers never overlap (prev / current / next stay readable)
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
let CX = 0, CY = 0;
function drawDial() {
  if (!content) return;
  const W = window.innerWidth, vv = window.visualViewport, Hh = Math.round(vv && vv.height ? Math.min(vv.height, window.innerHeight) : window.innerHeight), p = content.fn;
  CX = SP.cx.x; CY = Hh;
  const a0 = SP.a0.x, a1 = SP.a1.x, idx = (a0 + a1) / 2, l2 = clamp(SP.l2.x, 0, 1.2), pr = clamp(SP.press.x, 0, 1.2);
  const stretch = clamp(Math.abs(SP.cx.v) / 3200, 0, 0.32), dir = Math.sign(SP.cx.v) || 1;
  // layer 2 open: middle ring shrinks and dims, outer ring grows in
  const m0 = R.m0, m1 = R.m1 - l2 * 34, o0 = R.o0 - l2 * 34 + (1 - l2) * 24, o1 = R.o1 - l2 * 10;
  const col = content.na ? '#8A9098' : p.col;
  const clip = sector(CX, CY, 0, R.o1 + 30, a0, a1);
  const [ix, iy] = pt(CX, CY, (l2 > 0.5 ? o1 : m1) + 12, idx);
  const tri = `<path d="M0,-9 L8,7 L-8,7 Z" class="kd-idx" style="fill:${col}" transform="translate(${ix} ${iy}) rotate(${270 - idx})"/>`;
  // icon and label sit inside the visible part of the inner disc: in the corner quarters they hug the inner side
  const span = a1 - a0, quarter = span < 135, leftQ = quarter && idx < 90;
  let cxI, cyI, anc = 'middle', lx, ly;
  if (!quarter) { [cxI, cyI] = pt(CX, CY, R.inner * 0.55, idx); lx = cxI; ly = cyI + 15; cyI -= 7; }
  else { cxI = CX + (leftQ ? 28 : -28); cyI = CY - 44; lx = CX + (leftQ ? 8 : -8); ly = CY - 16; anc = leftQ ? 'start' : 'end'; }
  const fill = pr > 0.02 ? (content.flash && content.flash.on ? col : '#5a5f68') : '#1B1F24';
  const label = pr > 0.5 && content.flash ? content.flash.short : p.short;
  dial.innerHTML = `<svg width="${W}" height="${Hh}" viewBox="0 0 ${W} ${Hh}" aria-hidden="true">
    <defs><clipPath id="kdClip"><path d="${clip}"/></clipPath></defs>
    <g transform="translate(${CX} ${CY}) scale(${1 + stretch} ${1 - stretch * 0.35}) translate(${-CX - dir * stretch * 40} ${-CY})">
      <path d="${sector(CX, CY, 0, R.o1 + 8, a0, a1)}" class="kd-bg"/>
      ${ring(content.main, SP.rot.x, m0, m1, a0, a1, idx, col, l2 > 0.05 ? 1 - 0.55 * Math.min(1, l2) : 1, l2 > 0.5)}
      ${l2 > 0.02 ? ring(content.second, SP.rot2.x, o0, o1, a0, a1, idx, col, Math.min(1, l2), false) : ''}
      <path d="${sector(CX, CY, 0, R.inner * (1 + pr * 0.08), a0, a1)}" style="fill:${fill}" class="kd-inner"/>
      <text x="${cxI}" y="${cyI}" class="kd-ic">${content.na ? 'block' : pr > 0.5 && content.flash ? content.flash.icon : p.ic}</text>
      <text x="${lx}" y="${ly}" class="kd-lbl" text-anchor="${anc}">${esc(label)}</text>
      ${tri}
    </g></svg>`;
}
const slotShape = z => {
  const n = active().length, W = window.innerWidth;
  if (z === 0) return { cx: 0, a0: 0, a1: 90 };
  if (z === n - 1) return { cx: W, a0: 90, a1: 180 };
  return { cx: (z + 0.5) / n * W, a0: 0, a1: 180 };
};
const curFn = () => { const A = active(); if (zone == null || zone >= A.length) zone = Math.max(0, Math.min(zone ?? 0, A.length - 1)); return A[zone]; };
function setTargets(sh) { SP.cx.t = sh.cx; SP.a0.t = sh.a0; SP.a1.t = sh.a1; }
function showDial(kind, extra) {
  const p = curFn(), s = H.state();
  const main = p.main(s), second = p.second ? p.second(s) : null;
  const wasHidden = !visible || !content || content.fn !== p;
  content = { fn: p, main, second, flash: kind === 'press' ? extra : null, na: kind === 'na' ? extra : null };
  if (!travelling) setTargets(slotShape(zone));
  SP.rot.t = main.cur; SP.rot2.t = second ? second.cur : 0;
  SP.l2.t = kind === 'second' ? 1 : 0;
  if (kind === 'press') { SP.press.t = 1; clearTimeout(showDial.pt); showDial.pt = setTimeout(() => { SP.press.t = 0; kick(); }, 1000); }
  if (wasHidden) { SP.rot.x = SP.rot.t; SP.rot2.x = SP.rot2.t; if (!visible) { SP.cx.x = SP.cx.t; SP.a0.x = SP.a0.t; SP.a1.x = SP.a1.t; } }
  dial.style.setProperty('--fc', p.col);
  visible = true; dial.classList.add('show');
  clearTimeout(hideT); hideT = setTimeout(hideDial, kind === 'na' ? 2200 : 2000);
  if (kind === 'na') showReason(extra); else if (kind !== 'arrive') hint.classList.remove('show');
  kick();
}
function hideDial() { if (travelling) return; visible = false; dial.classList.remove('show'); SP.l2.t = 0; kick(); }
let hintT;
function hintAt(html, col) {
  const n = active().length, W = window.innerWidth, x = zone === 0 ? 150 : zone === n - 1 ? W - 150 : (zone + 0.5) / n * W;
  hint.style.setProperty('--gc', col); hint.innerHTML = html;
  hint.style.left = clamp(x, 268, W - 268) + 'px'; hint.classList.add('show');
  clearTimeout(hintT); hintT = setTimeout(() => hint.classList.remove('show'), 3000);
}
function showHints() { const p = curFn(); hintAt(`<span class="kh-n">${msI(p.ic)}${esc(p.n)}</span>` + p.hints.map(([g, a]) => `<span><b>${g}</b> ${a}</span>`).join(''), p.col); }
function showReason(na) { hintAt(`<span class="kh-na"><b>${esc(na.item)}</b> ${esc(na.reason)}</span>`, '#F0605A'); }
window.addEventListener('resize', () => { if (zone !== null) { setTargets(slotShape(zone)); snap(); drawDial(); } });

/* ---------- run one gesture on the selected position ---------- */
function fire(g, k) {
  const A = active();
  if (zone === null || zone >= A.length) { zone = 0; drawEdge(); }
  if (TUT.on) { TUT.got(g); return; }
  const p = A[zone], st = H.state();
  if (!p[g]) { showDial('na', { item: g === 'press' ? 'Press' : 'Hold + turn', reason: 'not used on ' + p.n }); trace(g + ':' + p.key + ':none'); return; }
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

/* ---------- slide: the dial follows the knob live; zone = filled slot under the cursor ---------- */
let lastTurn = 0, held = false, downT = 0, travelling = false, settleT;
document.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  if (held && !(e.buttons & 4) && performance.now() - downT > 800) held = false;   // missed button-up: unstick
  if (held || performance.now() - lastTurn < LOCK_MS) return;
  const n = active().length, W = window.innerWidth, f = clamp(e.clientX / Math.max(1, W - 1), 0, 1);
  let z = Math.min(n - 1, Math.floor(f * n));
  if (zone !== null && z !== zone && Math.abs(f - (zone + 0.5) / n) < 0.5 / n + 0.03) z = zone;   // a little hysteresis at the borders
  if (z === zone) return;                                           // inside a zone the dial stays put: no jitter while turning
  zone = z;
  lightEdge();
  if (TUT.on) { TUT.slid(zone); return; }
  trace('slide:' + curFn().key);
  // the dial travels to the new slot: it stretches with its speed and settles into the slot's shape with a spring
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
  const total = Math.sign(acc) * Math.max(1, Math.floor(Math.abs(acc) / K.notch + 0.55));   // one notch = at least one step
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

/* ---------- tutorial: slide, turn, press, hold and turn (Settings → Knob · tutorial) ---------- */
const TUT = (() => {
  const STEPS = [
    { id: 'slide', t: 'Slide the knob all the way left', s: 'Each stop on the rail is one function. The far left is your temperature.' },
    { id: 'turn', t: 'Turn the knob', s: 'Turning changes the value: one click, one step.' },
    { id: 'press', t: 'Press the knob', s: 'A press switches something on or off, like the seat heater.' },
    { id: 'hturn', t: 'Hold it down and turn', s: 'Holding while you turn changes the second value, like the fan.' }
  ];
  const el = document.createElement('div'); el.id = 'kTut'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Knob tutorial');
  el.innerHTML = `<div class="kt-card">
    <svg class="kt-art" viewBox="0 0 360 150" aria-hidden="true">
      <line class="kt-rail" x1="30" y1="95" x2="330" y2="95"/>
      ${[30, 180, 330].map(x => `<line class="kt-gate" x1="${x}" y1="83" x2="${x}" y2="107"/>`).join('')}
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
    el.querySelector('.kt-s').textContent = st ? st.s : 'Hints appear every time the knob reaches a new position.';
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

/* ---------- customization page: the two optional slots (parked only, R35) ---------- */
const CFG = (() => {
  const el = document.createElement('div'); el.id = 'kCfg'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Customize the knob');
  document.body.appendChild(el);
  let draft = null, pick = null, watch;
  const NAMES = { '': 'Empty', vent: 'Seat ventilation', nav: 'Navigation shortcut', drive: 'Drive mode' };
  const ICONS = { '': 'add', vent: 'airline_seat_recline_extra', nav: 'near_me', drive: 'directions_car' };
  const card = (slot, i) => {
    const fixed = i % 2 === 0, k = fixed ? slot : draft[slot], f = fixed ? FN[k] : FN[k];
    if (fixed) return `<div class="cf-slot fixed" style="--gc:${f.col}">${msI(f.ic)}<b>${esc(f.n)}</b><small>${msI('lock')}Always here</small></div>`;
    return `<button class="cf-slot opt ${k ? 'set' : ''} ${pick === slot ? 'pick' : ''}" data-slot="${slot}" style="--gc:${k ? FN[k].col : 'var(--tx3)'}">${msI(ICONS[k])}<b>${esc(NAMES[k])}</b><small>Optional slot ${slot === 'opt1' ? 1 : 2}</small></button>`;
  };
  const draw = () => {
    const order = ['driver', 'opt1', 'media', 'opt2', 'passenger'];
    const other = pick && draft[pick === 'opt1' ? 'opt2' : 'opt1'];
    el.innerHTML = `<div class="cf-card">
      <header><h2>Customize the knob</h2><span>Three positions are fixed. Add up to two functions in the slots between them.</span></header>
      <div class="cf-rail">${order.map(card).join('')}</div>
      <div class="cf-track"></div>
      ${pick ? `<div class="cf-list"><span>Slot ${pick === 'opt1' ? 1 : 2}:</span>${Object.keys(NAMES).map(k => `<button class="${draft[pick] === k ? 'on' : ''}" data-fn="${k}" ${k && k === other ? 'disabled' : ''}>${msI(ICONS[k])}${esc(NAMES[k])}${k && k === other ? ' (in the other slot)' : ''}</button>`).join('')}</div>` : '<p class="cf-note">Tap an optional slot to choose its function. Empty slots are skipped by the knob.</p>'}
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
      if (H.state().car.moving) { close(); H.toast('lock', 'Car is moving: mapping unchanged'); return; }
      K.opt1 = draft.opt1; K.opt2 = draft.opt2; saveK(); close();
      zone = null; content = null; drawEdge(); H.render(); H.toast('tune', 'Knob slots saved');
      trace('config:' + (K.opt1 || '-') + ',' + (K.opt2 || '-'));
    }
  });
  return {
    open() {
      if (H.locked()) return H.toast('lock', 'Knob settings are locked during the test');
      if (H.state().car.moving) return H.toast('lock', 'Customize the knob only while parked');
      draft = { opt1: K.opt1, opt2: K.opt2 }; pick = null; draw(); el.hidden = false;
      clearInterval(watch); watch = setInterval(() => { if (H.state().car.moving) { close(); H.toast('lock', 'Car started moving: closed, mapping unchanged'); } }, 300);
    }
  };
})();

/* a fresh trial starts with nothing pending */
const reset0 = H.reset;
H.reset = function () { if (TUT.on) TUT.stop(); FN.nav.i = -1; FN.nav.list = 'fav'; FN.vent.mode = 'vent'; return reset0.apply(this, arguments); };

/* ---------- settings rows ---------- */
const applyCursor = () => document.documentElement.classList.toggle('knob-nocursor', !!K.hideCursor);
const seg = (act, opts, cur) => `<div class="seg">${opts.map(([k, l]) => `<button class="${cur === k ? 'on' : ''}" data-a="${act}" data-v="${k}" aria-pressed="${cur === k}">${l}</button>`).join('')}</div>`;
const stepper = (act, val) => `<div class="stepper"><button data-a="${act}" data-v="-" aria-label="Less"><span class="ms" aria-hidden="true">remove</span></button><b>${val}</b><button data-a="${act}" data-v="+" aria-label="More"><span class="ms" aria-hidden="true">add</span></button></div>`;
const guard = () => { if (!H.locked()) return false; H.toast('lock', 'Knob settings are locked during the test'); return true; };
H.extend({
  settings: () => {
    const named = [K.opt1, K.opt2].filter(Boolean).map(k => FN[k].n);
    return `
    <div class="srow"><div><div class="lbl">Knob · slots</div><div class="sub">Driver temp · ${named[0] && K.opt1 ? esc(FN[K.opt1].n) + ' · ' : ''}Media · ${K.opt2 ? esc(FN[K.opt2].n) + ' · ' : ''}Passenger temp</div></div><div class="seg"><button data-a="kcfg" data-v="">${H.state().car.moving ? 'Parked only' : 'Customize'}</button></div></div>
    <div class="srow"><div><div class="lbl">Knob · tutorial</div><div class="sub">Short lesson on the three gestures after the welcome screen</div></div>${seg('ktut', [['0', 'Off'], ['1', 'On']], K.tutorial ? '1' : '0')}<div class="seg"><button data-a="ktutnow" data-v="">Show now</button></div></div>
    <div class="srow"><div><div class="lbl">Knob · turn direction</div><div class="sub">Which way of turning raises the value</div></div>${seg('kinv', [['0', 'Normal'], ['1', 'Reversed']], K.invert ? '1' : '0')}</div>
    <div class="srow"><div><div class="lbl">Knob · notch size</div><div class="sub">Wheel distance for one step. Calibrate once per mouse</div></div><div class="rowr">${stepper('knotch', K.notch)}<div class="seg"><button data-a="kcal" data-v="">Calibrate</button></div></div></div>
    <div class="srow"><div><div class="lbl">Knob · mouse</div><div class="sub">Hide the cursor and ignore mouse clicks, so only slide, turn and press count</div></div>${seg('kmouse', [['1', 'Knob only'], ['0', 'Normal mouse']], K.blockClicks ? '1' : '0')}</div>`;
  },
  actions: {
    kcfg() { CFG.open(); },
    ktut(v) { if (guard()) return; K.tutorial = v === '1'; saveK(); },
    ktutnow() { if (guard()) return; TUT.start(); },
    kinv(v) { if (guard()) return; K.invert = v === '1'; saveK(); },
    knotch(v) { if (guard()) return; const d = K.notch < 20 ? 1 : 5; K.notch = clamp(K.notch + (v === '+' ? d : -d), 1, 400); saveK(); },
    kcal() { if (guard()) return; CAL.start(); },
    kmouse(v) { if (guard()) return; K.blockClicks = v === '1'; K.hideCursor = v === '1'; saveK(); applyCursor(); }
  }
});
applyCursor();
drawEdge();
H.render();
})();
