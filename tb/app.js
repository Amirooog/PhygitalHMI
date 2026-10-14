/* PhygitalHMI · Touch Baseline (TB) — app logic.
   Screens built so far: Home, Climate, Settings. Navigation, Media and Phone are placeholders. */
(() => {
'use strict';

const BUILD = { id: 'TB-3.0.0-dev', line: 'TB', name: 'Touch Baseline' };

/* ---------- preferences (per device) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('phmi.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('phmi.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked: keep in memory */ } }
};
const PREF = Object.assign({ theme: 'auto', accent: 'cyan', safeTop: 28 }, store.get('pref', {}));
const savePref = () => store.set('pref', PREF);

const ACCENTS = {
  cyan:   { name: 'Cyan',   dark: '#4CC3E0', light: '#0F7E9C' },
  amber:  { name: 'Amber',  dark: '#F2A93B', light: '#B86E00' },
  green:  { name: 'Green',  dark: '#5BD08A', light: '#1E8A4C' },
  violet: { name: 'Violet', dark: '#A89BFF', light: '#5B4BD1' },
  coral:  { name: 'Coral',  dark: '#FF8A75', light: '#C2412C' }
};

/* ---------- content ---------- */
const TRACKS = [
  { t: 'Low Sun Drive', a: 'The Fairlanes', d: 212, h: 30 },
  { t: 'Glass Harbor', a: 'Mina Vale', d: 226, h: 190 },
  { t: 'Nightline', a: 'Ardalan Trio', d: 241, h: 205 },
  { t: 'Paper Satellites', a: 'Ocean Hours', d: 269, h: 280 },
  { t: 'Kish Blue', a: 'Mina Vale', d: 221, h: 195 },
  { t: 'Slow Orbit', a: 'Ardalan Trio', d: 305, h: 230 },
  { t: 'Afterglow Avenue', a: 'The Fairlanes', d: 238, h: 15 },
  { t: 'Harbor Lights', a: 'Ocean Hours', d: 249, h: 210 }
];

/* custom vehicle symbols (stroke icons, 24×24) */
const P = {
  seatH: 'M7 3c1 0 2 1 2 2l1 9h7a2 2 0 0 1 2 2v2H9a2 2 0 0 1-2-1.6L5 6c-.2-1.6.7-3 2-3zM9 18v3M17 18v3M13.5 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6M17 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6M20.5 3c-.9 1.2.9 2.4 0 3.6s.9 2.4 0 3.6',
  seatV: 'M7 3c1 0 2 1 2 2l1 9h7a2 2 0 0 1 2 2v2H9a2 2 0 0 1-2-1.6L5 6c-.2-1.6.7-3 2-3zM9 18v3M17 18v3M17 2.5v7M14 4.2l6 3.6M20 4.2l-6 3.6',
  wheel: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM3.5 10H10M14 10h6.5M12 14v7',
  face: 'M7 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zM8.5 8v6h4l2 6M8.5 11h3M21 8h-6M17 6l-2 2 2 2',
  both: 'M7 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zM8.5 8v6h4l2 6M8.5 11h3M21 8h-6M17 6l-2 2 2 2M22 19h-5M19 17l-2 2 2 2',
  feet: 'M7 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zM8.5 8v6h4l2 6M8.5 11h3M22 19h-5M19 17l-2 2 2 2',
  wind: 'M7 4.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zM8.5 8v6h4l2 6M8.5 11h3M14 2l7 7M22 19h-5M19 17l-2 2 2 2'
};

/* ---------- state ---------- */
function fresh() {
  return {
    screen: 'home', locked: false, zoom: 1,
    clim: { dT: 22, pT: 22, fan: 3, auto: false, ac: true, recirc: false, sync: false, mode: 'face',
            seatL: 0, seatR: 0, ventL: 0, ventR: 0, wheel: false },
    media: { playing: true, track: 0, pos: 37, vol: 14, mute: false }
  };
}
let S = fresh();

/* ---------- helpers ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ms = (name, cls = '') => `<span class="ms${cls ? ' ' + cls : ''}" aria-hidden="true">${name}</span>`;
const svg = k => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[k]}"/></svg>`;
const A = (a, v) => `data-a="${a}"${v !== undefined ? ` data-v="${v}"` : ''}`;
const dashes = (n, lit) => `<span class="dashes">${Array.from({ length: n }, (_, i) => `<i class="${i < lit ? 'on' : ''}"></i>`).join('')}</span>`;
const tempFmt = v => v <= 16 ? 'LO' : v >= 28 ? 'HI' : (v % 1 ? v.toFixed(1) : String(v)) + '°';
const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
const artBg = h => `background:linear-gradient(140deg,hsl(${h} 45% 58%),hsl(${(h + 25) % 360} 50% 30%) 55%,hsl(${(h + 40) % 360} 40% 12%))`;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const levelName = n => ['Off', 'Low', 'Medium', 'High'][n];

/* ---------- theme ---------- */
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
const themeNow = () => PREF.theme === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : PREF.theme;
function applyTheme() {
  const r = document.documentElement;
  r.dataset.theme = themeNow();
  r.dataset.accent = PREF.accent;
  r.style.setProperty('--safe-top', PREF.safeTop + 'px');
}
if (mq) { const f = () => { applyTheme(); if (S.screen === 'settings') render(); }; mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); }

/* ---------- rail ---------- */
const hm = () => { const d = new Date(); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
function renderRail() {
  $('#rail').innerHTML = `
    <span class="clock" id="clk">${hm()}</span>
    <span class="wx">${ms('sunny')}27°</span>
    ${ms('signal_cellular_alt', 'st')}
    ${ms('bluetooth', 'st')}
    <hr>
    <button class="rb" ${A('noop')} aria-label="Notifications">${ms('notifications')}</button>
    <button class="rb" ${A('noop')} aria-label="Profile">${ms('person')}</button>
    <span class="grow"></span>
    <button class="lock ${!S.locked ? 'on' : ''}" ${A('lock', 'unlock')} aria-label="Unlock" aria-pressed="${!S.locked}">${ms('lock_open')}</button>
    <button class="lock ${S.locked ? 'on' : ''}" ${A('lock', 'lock')} aria-label="Lock" aria-pressed="${S.locked}">${ms('lock')}</button>`;
}

/* ---------- climate bar ---------- */
function renderBar() {
  const c = S.clim, m = S.media;
  const tp = side => {
    const v = side === 'd' ? c.dT : c.pT, who = side === 'd' ? 'Driver' : 'Passenger';
    return `<div class="tpill">
      <button class="down" ${A('temp', side + '-')} aria-label="${who} temperature down">${ms('expand_more')}</button>
      <span class="tval"><b>${tempFmt(v)}${ms('mode_fan')}</b><small>${c.auto ? 'AUTO' : 'FAN ' + c.fan}</small></span>
      <button class="up" ${A('temp', side + '+')} aria-label="${who} temperature up">${ms('expand_less')}</button>
    </div>`;
  };
  const seat = L => {
    const lv = c['seat' + L], who = L === 'L' ? 'Driver' : 'Passenger';
    return `<button class="bb${lv ? ' heat' : ''}" ${A('seat', 'seat' + L)} aria-label="${who} seat heat, ${levelName(lv)}">${svg('seatH')}${dashes(3, lv)}</button>`;
  };
  const items = [['home', 'home', 'Home'], ['nav', 'near_me', 'Navigation'], ['media', 'music_note', 'Media'], ['phone', 'call', 'Phone'], ['climate', 'mode_fan', 'Climate']];
  const dk = ([k, ic, lbl]) => `<button class="${S.screen === k ? 'on' : ''}" ${A('go', k)} aria-label="${lbl}" aria-current="${S.screen === k ? 'page' : 'false'}">${ms(ic)}<u></u></button>`;
  $('#bar').innerHTML = `
    <div class="grp">${tp('d')}${seat('L')}</div>
    <div class="dock">${items.map(dk).join('')}<span class="div"></span>${dk(['settings', 'settings', 'Settings'])}</div>
    <div class="grp"><button class="bb" ${A('volpop')} aria-label="Volume ${m.mute ? 'muted' : m.vol}">${ms(m.mute ? 'volume_off' : 'volume_up')}</button>${seat('R')}${tp('p')}</div>`;
}

/* ---------- screens ---------- */
function home() {
  const m = S.media, tr = TRACKS[m.track];
  return `<section class="media glass" aria-label="Now playing">
      <div class="top">
        <button class="chip" ${A('go', 'media')}>${ms('bluetooth')}Bluetooth${ms('expand_more')}</button>
        <button class="iconbtn" ${A('go', 'media')} aria-label="Library">${ms('queue_music')}</button>
      </div>
      <div class="art" style="${artBg(tr.h)}"></div>
      <div><div class="title">${esc(tr.t)}</div><div class="artist">${esc(tr.a)}</div></div>
      <div>
        <div class="prog"><i id="pbar" style="width:${m.pos / tr.d * 100}%"></i></div>
        <div class="times"><span id="ptime">${mmss(m.pos)}</span><span id="prem">-${mmss(tr.d - m.pos)}</span></div>
      </div>
      <div class="transport">
        <button ${A('mprev')} aria-label="Previous">${ms('skip_previous')}</button>
        <button class="pp" ${A('mplay')} aria-label="${m.playing ? 'Pause' : 'Play'}">${ms(m.playing ? 'pause' : 'play_arrow')}</button>
        <button ${A('mnext')} aria-label="Next">${ms('skip_next')}</button>
      </div>
    </section>
    <button class="search glass" ${A('go', 'nav')}>${ms('search')}Where to?</button>
    <div class="zoom">
      <button class="glass" ${A('zoom', '+')} aria-label="Zoom in">${ms('add')}</button>
      <button class="glass" ${A('zoom', '-')} aria-label="Zoom out">${ms('remove')}</button>
    </div>
    <div class="car" aria-hidden="true"><span>${ms('navigation')}</span></div>`;
}

const WV = []; for (let v = 28; v >= 16; v -= 0.5) WV.push(v);   // warmer at the top
const IH = 44;
function climate() {
  const c = S.clim;
  const tileCls = (on, kind) => on ? ' ' + kind : '';
  const zone = s => {
    const L = s === 'd' ? 'L' : 'R', who = s === 'd' ? 'Driver' : 'Passenger', v = s === 'd' ? c.dT : c.pT;
    const heat = c['seat' + L], vent = c['vent' + L];
    let tiles = `
      <button class="tile${tileCls(heat, 'heat')}" ${A('seat', 'seat' + L)} aria-label="${who} seat heat, ${levelName(heat)}">${svg('seatH')}<span class="lbl">Seat heat</span>${dashes(3, heat)}</button>
      <button class="tile${tileCls(vent, 'vent')}" ${A('seat', 'vent' + L)} aria-label="${who} seat ventilation, ${levelName(vent)}">${svg('seatV')}<span class="lbl">Seat vent</span>${dashes(3, vent)}</button>`;
    if (s === 'd') tiles += `<button class="tile wide${tileCls(c.wheel, 'heat')}" ${A('tog', 'wheel')} aria-label="Heated wheel" aria-pressed="${c.wheel}">${svg('wheel')}<span class="lbl">Heated wheel</span>${dashes(1, c.wheel ? 1 : 0)}</button>`;
    return `<section class="zone" aria-label="${who}">
      <div class="who">${ms(s === 'd' ? 'person' : 'airline_seat_recline_normal')}${who}</div>
      <div class="wwrap"><div class="wheel" data-wheel="${s}" tabindex="0" role="slider" aria-label="${who} temperature" aria-valuemin="16" aria-valuemax="28" aria-valuenow="${v}">
        <div class="sp"></div>${WV.map((x, i) => `<div class="wi" data-i="${i}">${tempFmt(x)}</div>`).join('')}<div class="sp"></div>
      </div></div>
      <div class="tiles">${tiles}</div>
    </section>`;
  };
  const bars = [1, 2, 3, 4, 5, 6, 7].map(i => `<button ${A('fan', i)} aria-label="Fan ${i}"><i class="${!c.auto && c.fan >= i ? 'on' : ''}" style="height:${28 + i * 10}%"></i></button>`).join('');
  const flows = [['face', 'Face'], ['both', 'Face & feet'], ['feet', 'Feet'], ['wind', 'Windscreen']]
    .map(([k, l]) => `<button class="tile${c.mode === k && !c.auto ? ' sel' : ''}" ${A('mode', k)} aria-pressed="${c.mode === k}">${svg(k)}<span class="lbl">${l}</span></button>`).join('');
  const sys = [['ac', 'ac_unit', 'A/C'], ['auto', 'hdr_auto', 'Auto'], ['recirc', 'autorenew', 'Recirculate'], ['sync', 'link', 'Sync']]
    .map(([k, ic, l]) => `<button class="tile${tileCls(c[k], 'acc')}" ${A('tog', k)} aria-pressed="${c[k]}">${ms(ic)}<span class="lbl">${l}</span></button>`).join('');
  return `<div class="panel">
    <div class="head"><h1>${ms('mode_fan')}Climate</h1><span class="pill">${ms('thermostat')}Outside 27°</span></div>
    <div class="cgrid">
      ${zone('d')}
      <section class="air" aria-label="Air">
        <div><div class="sec">${ms('mode_fan')}Fan speed</div>
          <div class="fan">
            <button ${A('fan', '-')} aria-label="Fan down">${ms('remove')}</button>
            <span class="bars">${bars}</span>
            <span class="val">${c.auto ? 'A' : c.fan}</span>
            <button ${A('fan', '+')} aria-label="Fan up">${ms('add')}</button>
          </div></div>
        <div><div class="sec">${ms('air')}Airflow</div><div class="row4">${flows}</div></div>
        <div><div class="sec">${ms('tune')}System</div><div class="row4">${sys}</div></div>
      </section>
      ${zone('p')}
    </div>
  </div>`;
}

function settings() {
  const th = themeNow();
  const seg = [['auto', 'brightness_auto', 'Auto'], ['light', 'light_mode', 'Light'], ['dark', 'dark_mode', 'Dark']]
    .map(([k, ic, l]) => `<button class="${PREF.theme === k ? 'on' : ''}" ${A('theme', k)} aria-pressed="${PREF.theme === k}">${ms(ic)}${l}</button>`).join('');
  const sw = Object.entries(ACCENTS)
    .map(([k, a]) => `<button class="${PREF.accent === k ? 'on' : ''}" ${A('accent', k)} aria-label="${a.name}" aria-pressed="${PREF.accent === k}"><span style="background:${a[th]}"></span></button>`).join('');
  return `<div class="set">
    <div class="srow"><div><div class="lbl">Appearance</div><div class="sub">Auto follows the iPad's light or dark setting</div></div><div class="seg">${seg}</div></div>
    <div class="srow"><div><div class="lbl">Accent colour</div><div class="sub">${ACCENTS[PREF.accent].name}</div></div><div class="swatches">${sw}</div></div>
    <div class="srow"><div><div class="lbl">Top offset</div><div class="sub">Keeps controls clear of the blurred band at the top of the screen</div></div>
      <div class="stepper"><button ${A('safetop', '-')} aria-label="Less">${ms('remove')}</button><b>${PREF.safeTop} px</b><button ${A('safetop', '+')} aria-label="More">${ms('add')}</button></div></div>
    <div class="about"><span>${BUILD.name}</span><span>${BUILD.id}</span></div>
  </div>`;
}

function soon(icon, title) {
  return `<div class="soon glass"><div>${ms(icon)}<b>${title}</b>Being rebuilt for TB-3.0.0</div></div>`;
}

/* ---------- render ---------- */
let lastScreen = null;
function render() {
  applyTheme();
  renderRail();
  renderBar();
  const view = {
    home, climate, settings,
    nav: () => soon('near_me', 'Navigation'),
    media: () => soon('music_note', 'Media'),
    phone: () => soon('call', 'Phone')
  }[S.screen];
  const anim = S.screen !== lastScreen;
  lastScreen = S.screen;
  $('#main').innerHTML = `<div class="scr"${anim ? '' : ' style="animation:none"'}>${view()}</div>`;
  $('#map').style.backgroundSize = [70, 70, 350, 350].map(n => (n * S.zoom) + 'px ' + (n * S.zoom) + 'px').join(', ');
  initWheels();
}

/* ---------- temperature wheels ---------- */
function wheelStyle(w) {
  const mid = w.scrollTop + w.clientHeight / 2;
  w.querySelectorAll('.wi').forEach(it => {
    const d = ((it.offsetTop + IH / 2) - mid) / IH, a = Math.min(Math.abs(d), 3);
    it.style.transform = `rotateX(${(-d * 18).toFixed(1)}deg) scale(${(1 - a * 0.14).toFixed(3)})`;
    it.style.opacity = Math.max(0.15, 1 - a * 0.33).toFixed(2);
    it.style.color = Math.abs(d) < 0.5 ? 'var(--tx)' : d < 0 ? 'var(--hot)' : 'var(--cool)';
    it.style.fontWeight = Math.abs(d) < 0.5 ? '400' : '300';
  });
}
function wheelTo(w, v, smooth) {
  const i = WV.indexOf(v);
  w._prog = true;
  if (smooth && w.scrollTo) w.scrollTo({ top: i * IH, behavior: 'smooth' }); else w.scrollTop = i * IH;
  w._last = i;
  wheelStyle(w);
  clearTimeout(w._pt); w._pt = setTimeout(() => { w._prog = false; }, smooth ? 400 : 80);
}
function initWheels() {
  document.querySelectorAll('.wheel').forEach(w => {
    wheelTo(w, w.dataset.wheel === 'd' ? S.clim.dT : S.clim.pT);
    w.addEventListener('scroll', () => {
      wheelStyle(w);
      clearTimeout(w._t);
      w._t = setTimeout(() => wheelCommit(w), 140);
    }, { passive: true });
  });
}
function wheelCommit(w) {
  if (w._prog || !w.isConnected) return;
  const v = WV[clamp(Math.round(w.scrollTop / IH), 0, WV.length - 1)], c = S.clim;
  if (w.dataset.wheel === 'd') {
    if (v === c.dT) return;
    c.dT = v;
    if (c.sync) { c.pT = v; const o = document.querySelector('.wheel[data-wheel="p"]'); if (o) wheelTo(o, v, true); }
  } else {
    if (v === c.pT) return;
    c.pT = v; c.sync = false;
  }
  w.setAttribute('aria-valuenow', v);
  renderBar();
}

/* ---------- feedback ---------- */
let toT;
function toast(iconHtml, text) {
  const e = $('#toast');
  e.innerHTML = iconHtml + '<span>' + esc(text) + '</span>';
  e.classList.remove('show'); void e.offsetWidth; e.classList.add('show');
  clearTimeout(toT); toT = setTimeout(() => e.classList.remove('show'), 1500);
}
let popT;
function showVol() {
  const m = S.media, p = $('#pop');
  p.className = 'glass';
  p.innerHTML = `<button ${A('vol', '-')} aria-label="Volume down">${ms('remove')}</button>
    <button ${A('vol', 'mute')} aria-label="${m.mute ? 'Unmute' : 'Mute'}">${ms(m.mute ? 'volume_off' : 'volume_up')}</button>
    <span class="vb"><i style="width:${m.mute ? 0 : m.vol / 30 * 100}%"></i></span><b>${m.mute ? '–' : m.vol}</b>
    <button ${A('vol', '+')} aria-label="Volume up">${ms('add')}</button>`;
  p.hidden = false;
  clearTimeout(popT); popT = setTimeout(() => { p.hidden = true; }, 3000);
}

/* ---------- actions ---------- */
const ACT = {
  noop() {},
  go(v) { S.screen = v; $('#pop').hidden = true; },
  lock(v) { S.locked = v === 'lock'; toast(ms(S.locked ? 'lock' : 'lock_open'), S.locked ? 'Locked' : 'Unlocked'); },
  temp(v) {
    const c = S.clim, d = v[1] === '+' ? 0.5 : -0.5;
    if (v[0] === 'd') { c.dT = clamp(c.dT + d, 16, 28); if (c.sync) c.pT = c.dT; }
    else { c.pT = clamp(c.pT + d, 16, 28); c.sync = false; }
  },
  seat(k) {
    const c = S.clim, side = k.slice(-1);
    c[k] = [3, 0, 1, 2][c[k]];
    if (c[k]) { if (k.startsWith('seat')) c['vent' + side] = 0; else c['seat' + side] = 0; }
    if (S.screen !== 'climate') toast(svg(k.startsWith('seat') ? 'seatH' : 'seatV'), `${side === 'L' ? 'Driver' : 'Passenger'} seat ${k.startsWith('seat') ? 'heat' : 'vent'} · ${levelName(c[k])}`);
  },
  tog(k) {
    const c = S.clim; c[k] = !c[k];
    if (k === 'sync' && c.sync) c.pT = c.dT;
  },
  fan(v) {
    const c = S.clim; c.auto = false;
    c.fan = v === '+' ? Math.min(7, c.fan + 1) : v === '-' ? Math.max(1, c.fan - 1) : +v;
  },
  mode(v) { S.clim.mode = v; S.clim.auto = false; },
  mplay() { S.media.playing = !S.media.playing; },
  mnext() { const m = S.media; m.track = (m.track + 1) % TRACKS.length; m.pos = 0; m.playing = true; },
  mprev() { const m = S.media; if (m.pos > 3) m.pos = 0; else { m.track = (m.track + TRACKS.length - 1) % TRACKS.length; m.pos = 0; } m.playing = true; },
  volpop() { const p = $('#pop'); if (p.hidden) showVol(); else p.hidden = true; },
  vol(v) { const m = S.media; if (v === 'mute') m.mute = !m.mute; else { m.mute = false; m.vol = clamp(m.vol + (v === '+' ? 1 : -1), 0, 30); } showVol(); },
  zoom(v) { S.zoom = clamp(S.zoom * (v === '+' ? 1.25 : 0.8), 0.5, 2.5); },
  theme(v) { PREF.theme = v; savePref(); },
  accent(v) { if (ACCENTS[v]) { PREF.accent = v; savePref(); } },
  safetop(v) { PREF.safeTop = clamp(PREF.safeTop + (v === '+' ? 4 : -4), 0, 80); savePref(); }
};

$('#app').addEventListener('click', e => {
  const wi = e.target.closest('.wi');
  if (wi) { const w = wi.closest('.wheel'); w._prog = false; w.scrollTo({ top: +wi.dataset.i * IH, behavior: 'smooth' }); return; }
  const el = e.target.closest('[data-a]');
  if (!el || !ACT[el.dataset.a]) return;
  ACT[el.dataset.a](el.dataset.v);
  if (el.closest('#pop')) { renderBar(); return; }   // keep the volume popover open
  render();
});
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- 1 s tick: clock and song progress ---------- */
setInterval(() => {
  const k = $('#clk'); if (k) k.textContent = hm();
  const m = S.media; if (!m.playing) return;
  const tr = TRACKS[m.track];
  m.pos++;
  if (m.pos >= tr.d) { m.track = (m.track + 1) % TRACKS.length; m.pos = 0; if (S.screen === 'home') render(); return; }
  const pb = $('#pbar'); if (pb) { pb.style.width = (m.pos / tr.d * 100) + '%'; $('#ptime').textContent = mmss(m.pos); $('#prem').textContent = '-' + mmss(tr.d - m.pos); }
}, 1000);

window.addEventListener('resize', () => document.querySelectorAll('.wheel').forEach(w => wheelTo(w, w.dataset.wheel === 'd' ? S.clim.dT : S.clim.pT)));

render();

/* offline support once installed */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => {
    r.update();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') r.update(); });
  }).catch(() => {});
}
})();
