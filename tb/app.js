/* PhygitalHMI · Touch Baseline (TB) — app logic.
   Screens: Home, Navigation, Media, Phone, Climate, Settings. Researcher mode and logging come next. */
(() => {
'use strict';

const BUILD = { id: 'TB-3.0.0-dev.3', line: 'TB', name: 'Touch Baseline' };

/* ---------- preferences (per device) ---------- */
const store = {
  get(k, d) { try { const v = localStorage.getItem('phmi.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('phmi.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked: keep in memory */ } }
};
const PREF = Object.assign({ theme: 'auto', accent: 'cyan', safeTop: 28, safeBottom: 0 }, store.get('pref', {}));
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
  { t: 'Harbor Lights', a: 'Ocean Hours', d: 249, h: 210 },
  { t: 'Morning North', a: 'Narvan', d: 198, h: 150 },
  { t: 'Alley Rain', a: 'Sepideh Rad', d: 254, h: 260 },
  { t: 'The Lake', a: 'Kamyar Nouri', d: 233, h: 175 },
  { t: 'Road Lights', a: 'Narvan', d: 187, h: 45 },
  { t: 'Breeze', a: 'Sepideh Rad', d: 176, h: 120 },
  { t: 'Orchard Lane', a: 'Kamyar Nouri', d: 201, h: 95 }
];
const USB = [
  { t: 'Road Tape 01', a: 'USB drive', d: 180, h: 0 },
  { t: 'Road Tape 02', a: 'USB drive', d: 195, h: 340 },
  { t: 'Road Tape 03', a: 'USB drive', d: 170, h: 320 }
];
const FMS = [
  { f: 88.4, n: 'City Traffic' }, { f: 95.5, n: 'Caspian Wave' }, { f: 98.2, n: 'News 24' },
  { f: 100.7, n: 'Classic 100' }, { f: 103.1, n: 'Sport FM' }, { f: 107.5, n: 'Tehran Talk' }
];
const SOURCES = { bt: { icon: 'bluetooth', name: 'Bluetooth', sub: "Amir's iPhone" }, fm: { icon: 'radio', name: 'FM radio', sub: '' }, usb: { icon: 'usb', name: 'USB', sub: 'Road Tapes' } };

const CON = [
  { id: 'mom', n: 'Mom', num: '0912 345 1180' }, { id: 'dad', n: 'Dad', num: '0912 345 2291' },
  { id: 'ali', n: 'Ali Rezaei', num: '0935 118 4402' }, { id: 'sara', n: 'Sara Mohammadi', num: '0919 620 7735' },
  { id: 'saram', n: 'Sara Moradi', num: '0912 870 1164' }, { id: 'reza', n: 'Reza Karimi', num: '0921 440 9021' },
  { id: 'maryam', n: 'Maryam Ahmadi', num: '0912 603 5518' }, { id: 'amir', n: 'Amir Hosseini', num: '0936 227 3310' },
  { id: 'negar', n: 'Negar Sadeghi', num: '0917 552 0876' }, { id: 'kaveh', n: 'Kaveh Moradi', num: '0912 991 4467' },
  { id: 'parisa', n: 'Parisa Jafari', num: '0938 314 2059' }, { id: 'hamed', n: 'Hamed Nazari', num: '0915 736 8812' },
  { id: 'leila', n: 'Leila Ebrahimi', num: '0912 205 6634' }, { id: 'babak', n: 'Babak Sharifi', num: '0935 480 1127' },
  { id: 'zahra', n: 'Zahra Kazemi', num: '0912 718 3390' }, { id: 'mohsen', n: 'Mohsen Taheri', num: '0919 402 6618' },
  { id: 'shirin', n: 'Shirin Farhadi', num: '0936 881 2045' }, { id: 'yas', n: 'Yasaman Rahimi', num: '0912 330 7781' },
  { id: 'office', n: 'Office', num: '021 8876 4410' }, { id: 'garage', n: 'Garage', num: '021 4432 9087' }
];
const CB = Object.fromEntries(CON.map(c => [c.id, c]));

/* places: x/y in metres from the car (east/south) */
const POI = [
  { id: 'home', n: 'Home', c: 'Saved place', x: -1800, y: 2400, saved: 1 },
  { id: 'work', n: 'Work', c: 'Saved place', x: 3200, y: -900, saved: 1 },
  { id: 'milad', n: 'Milad Tower', c: 'Landmark', x: -4200, y: 1500 },
  { id: 'miladh', n: 'Milad Hospital', c: 'Hospital', x: -6100, y: 2300 },
  { id: 'azadi', n: 'Azadi Tower', c: 'Landmark', x: -9800, y: 3200 },
  { id: 'tajrish', n: 'Tajrish Square', c: 'Square', x: 1200, y: -6800 },
  { id: 'tabiat', n: 'Tabiat Bridge', c: 'Park', x: 1500, y: -2600 },
  { id: 'bazaar', n: 'Grand Bazaar', c: 'Market', x: 800, y: 5200 },
  { id: 'ut', n: 'University of Tehran', c: 'University', x: -300, y: 2600 },
  { id: 'mehrabad', n: 'Mehrabad Airport', c: 'Airport', x: -10500, y: 4800 },
  { id: 'ikia', n: 'Imam Khomeini Airport', c: 'Airport', x: -12000, y: 38000 },
  { id: 'cafe', n: 'Narvan Café', c: 'Café', x: 600, y: -400 },
  { id: 'fuel', n: 'Fuel station', c: 'Fuel', x: -700, y: 900 },
  { id: 'ev', n: 'EV charging', c: 'Charging', x: 1900, y: 400 }
];
const PB = Object.fromEntries(POI.map(p => [p.id, p]));
const NAV_RECENT = ['tajrish', 'cafe', 'ut'];
const ROUTE_SECONDS = 40;      // simulated drive length, whatever the distance

/* EV: drive modes and battery */
const DMODES = {
  range:    { n: 'Range',    ic: 'eco',            d: 'Softer acceleration and climate for the most kilometres.', regen: 3, steer: 1, ride: 1, rng: 1.08 },
  everyday: { n: 'Everyday', ic: 'directions_car', d: 'Balanced response for daily driving.',                    regen: 2, steer: 2, ride: 2, rng: 1 },
  sport:    { n: 'Sport',    ic: 'speed',          d: 'Sharper throttle, firmer steering and suspension.',        regen: 2, steer: 3, ride: 3, rng: 0.9 },
  snow:     { n: 'Snow',     ic: 'ac_unit',        d: 'Gentle torque and extra traction control on slippery roads.', regen: 1, steer: 1, ride: 2, rng: 0.95 }
};
const DSET = {
  regen: { n: 'Regenerative braking', v: ['Low', 'Medium', 'High'] },
  steer: { n: 'Steering', v: ['Light', 'Standard', 'Firm'] },
  ride:  { n: 'Ride', v: ['Soft', 'Standard', 'Firm'] }
};
const BATTERY_KWH = 77, CHARGE_KW = 11, KM_PER_PCT = 4.6, CHARGE_DEMO_SPEED = 60;   // demo: charging runs 60× faster than real

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
    screen: 'home', sheet: null, locked: false, zoom: 1,
    clim: { dT: 22, pT: 22, fan: 3, auto: false, ac: true, recirc: false, sync: false, mode: 'face',
            seatL: 0, seatR: 0, ventL: 0, ventR: 0, wheel: false },
    media: { src: 'bt', playing: true, track: 0, pos: 37, usb: 0, upos: 0, fm: 1, freq: 95.5, vol: 14, mute: false },
    phone: { tab: 'recents', open: null, dial: '', call: null,
             rec: [{ cid: 'mom', k: 'Incoming', w: '10:12' }, { cid: 'office', k: 'Outgoing', w: 'Yesterday' },
                   { cid: 'ali', k: 'Missed', w: 'Yesterday' }, { cid: 'kaveh', k: 'Outgoing', w: 'Monday' },
                   { cid: 'parisa', k: 'Incoming', w: 'Sunday' }] },
    nav: { mode: 'idle', q: '', sel: null, dest: null, t0: 0 },
    car: { tab: 'drive', mode: 'everyday', regen: 2, steer: 2, ride: 2,
           soc: 68, limit: 80, plugged: true, charging: true, schedule: false, port: false }
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
const initials = n => esc(n.split(' ').map(p => p[0]).slice(0, 2).join(''));
const cur = () => S.media.src === 'usb' ? USB[S.media.usb] : TRACKS[S.media.track];
const curPos = () => S.media.src === 'usb' ? S.media.upos : S.media.pos;

/* ---------- theme ---------- */
const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;
const themeNow = () => PREF.theme === 'auto' ? (mq && mq.matches ? 'light' : 'dark') : PREF.theme;
function applyTheme() {
  const r = document.documentElement;
  r.dataset.theme = themeNow();
  r.dataset.accent = PREF.accent;
  r.style.setProperty('--safe-top', PREF.safeTop + 'px');
  fit();
}

/* ---------- screen fit (installed app on iPad) ----------
   In a home-screen app, iPadOS can already keep a strip free at the bottom of the window.
   Padding for the home indicator on top of that leaves a blank band, so pad only what the
   window has not already given up, then add the manual Bottom offset from Settings. */
let FIT = '';
const probe = document.createElement('div');
probe.style.cssText = 'position:fixed;top:0;left:0;width:0;visibility:hidden;pointer-events:none;padding-bottom:env(safe-area-inset-bottom,0px)';
document.body.appendChild(probe);
function fit() {
  const vv = window.visualViewport;
  const H = Math.round(vv && vv.height ? vv.height : window.innerHeight), W = Math.round(window.innerWidth);
  const landscape = W >= H;
  const full = landscape ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  const reserved = Math.max(0, full - H);                 // space the OS keeps outside our window
  const inset = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true
    || (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches);
  const base = standalone ? Math.max(0, inset - reserved) : inset;
  const want = base + (PREF.safeBottom || 0);
  const b = Math.max(0, want);
  const extra = Math.max(0, -want);                        // negative offset: stretch the page into the strip below
  const r = document.documentElement.style;
  r.setProperty('--sab', b + 'px');
  r.setProperty('--vh', (H + extra) + 'px');
  FIT = `${standalone ? 'app' : 'browser'} · window ${W}×${H} · screen ${screen.width}×${screen.height} · inset ${Math.round(inset)} · reserved ${reserved} · bottom ${b}`;
}
window.addEventListener('resize', fit);
if (window.visualViewport) window.visualViewport.addEventListener('resize', fit);
window.addEventListener('orientationchange', () => setTimeout(fit, 350));

if (mq) { const f = () => { applyTheme(); if (S.screen === 'settings') render(); }; mq.addEventListener ? mq.addEventListener('change', f) : mq.addListener(f); }

/* ---------- rail ---------- */
const hm = () => { const d = new Date(); return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0'); };
function renderRail() {
  $('#rail').innerHTML = `
    <span class="clock" id="clk">${hm()}</span>
    <span class="wx">${ms('sunny')}27°</span>
    <button class="batt-rail${S.car.charging ? ' chg' : ''}" ${A('vgo', 'charge')} aria-label="Battery ${Math.floor(S.car.soc)} percent${S.car.charging ? ', charging' : ''}">${ms(S.car.charging ? 'battery_charging_full' : 'battery_full')}<span id="railSoc">${Math.floor(S.car.soc)}%</span></button>
    ${ms('signal_cellular_alt', 'st')}
    ${S.phone.call ? `<button class="rcall" ${A('go', 'phone')} aria-label="Call in progress">${ms('call')}</button>` : ''}
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
  const items = [['home', 'home', 'Home'], ['nav', 'near_me', 'Navigation'], ['media', 'music_note', 'Media'], ['phone', 'call', 'Phone'], ['climate', 'mode_fan', 'Climate'], ['vehicle', 'directions_car', 'Vehicle']];
  const dk = ([k, ic, lbl]) => `<button class="${S.screen === k ? 'on' : ''}" ${A('go', k)} aria-label="${lbl}" aria-current="${S.screen === k ? 'page' : 'false'}">${ms(ic)}<u></u></button>`;
  $('#bar').innerHTML = `
    <div class="grp">${tp('d')}${seat('L')}</div>
    <div class="dock">${items.map(dk).join('')}<span class="div"></span>${dk(['settings', 'settings', 'Settings'])}</div>
    <div class="grp"><button class="bb" ${A('volpop')} aria-label="Volume ${m.mute ? 'muted' : m.vol}">${ms(m.mute ? 'volume_off' : 'volume_up')}</button>${seat('R')}${tp('p')}</div>`;
}

/* ---------- home ---------- */
function home() {
  const m = S.media, fm = m.src === 'fm', tr = cur(), pos = curPos(), st = FMS[m.fm];
  const n = S.nav, onRoute = n.mode === 'route';
  const r = onRoute ? routeInfo() : null;
  return `<section class="media glass" aria-label="Now playing">
      <div class="top">
        <button class="chip" ${A('srcsheet')}>${ms(SOURCES[m.src].icon)}${SOURCES[m.src].name}${ms('expand_more')}</button>
        <button class="iconbtn" ${A('go', 'media')} aria-label="Open media">${ms('queue_music')}</button>
      </div>
      ${fm ? `<div class="art radio">${ms('radio')}</div>` : `<div class="art" style="${artBg(tr.h)}"></div>`}
      <div><div class="title">${fm ? m.freq.toFixed(1) + ' FM' : esc(tr.t)}</div><div class="artist">${fm ? esc(st.n) : esc(tr.a)}</div></div>
      ${fm ? '<div></div>' : `<div>
        <div class="prog"><i id="pbar" style="width:${pos / tr.d * 100}%"></i></div>
        <div class="times"><span id="ptime">${mmss(pos)}</span><span id="prem">-${mmss(tr.d - pos)}</span></div>
      </div>`}
      <div class="transport">
        <button ${A('mprev')} aria-label="Previous">${ms('skip_previous')}</button>
        <button class="pp" ${A('mplay')} aria-label="${m.playing ? 'Pause' : 'Play'}">${ms(m.playing ? 'pause' : 'play_arrow')}</button>
        <button ${A('mnext')} aria-label="Next">${ms('skip_next')}</button>
      </div>
    </section>
    ${onRoute
      ? `<button class="search glass" ${A('go', 'nav')}>${ms('near_me')}<span>${esc(PB[n.dest].n)} · <b id="hMin">${r.min}</b> min</span></button>`
      : `<button class="search glass" ${A('nsearch')}>${ms('search')}Where to?</button>`}
    <div class="zoom">
      <button class="glass" ${A('zoom', '+')} aria-label="Zoom in">${ms('add')}</button>
      <button class="glass" ${A('zoom', '-')} aria-label="Zoom out">${ms('remove')}</button>
    </div>
    <div class="car" aria-hidden="true"><span>${ms('navigation')}</span></div>`;
}

/* ---------- media ---------- */
function srcSheet() {
  const m = S.media;
  return `<div class="sheet-bg" ${A('closesheet')}><div class="sheet glass" role="dialog" aria-label="Choose audio source">
    <div class="sh">Choose audio source</div>
    ${Object.entries(SOURCES).map(([k, s]) => `<button class="row ${m.src === k ? 'on' : ''}" ${A('setsrc', k)}>${ms(s.icon)}<span class="gr"><span class="t1">${s.name}</span><span class="t2">${k === 'fm' ? esc(FMS[m.fm].n) : s.sub}</span></span>${m.src === k ? ms('check') : ''}</button>`).join('')}
  </div></div>`;
}
function media() {
  const m = S.media, fm = m.src === 'fm';
  const srcBtn = `<button class="chip" ${A('srcsheet')}>${ms(SOURCES[m.src].icon)}${SOURCES[m.src].name}${ms('expand_more')}</button>`;
  let left, right;
  if (fm) {
    const st = FMS[m.fm];
    left = `<section class="now glass">
      <div class="top">${srcBtn}</div>
      <div class="fmbody"><div class="freq">${m.freq.toFixed(1)}<small> MHz</small></div><div class="artist">${esc(st.n)} · Stereo</div></div>
      <div class="transport wide">
        <button ${A('fmseek', '-')} aria-label="Seek down">${ms('skip_previous')}</button>
        <button ${A('fmtune', '-')} aria-label="Tune down">${ms('chevron_left')}</button>
        <button class="pp" ${A('mplay')} aria-label="${m.playing ? 'Pause' : 'Play'}">${ms(m.playing ? 'pause' : 'play_arrow')}</button>
        <button ${A('fmtune', '+')} aria-label="Tune up">${ms('chevron_right')}</button>
        <button ${A('fmseek', '+')} aria-label="Seek up">${ms('skip_next')}</button>
      </div></section>`;
    right = `<section class="list glass"><h2>Presets</h2><div class="presets">${FMS.map((s, i) =>
      `<button class="tile${Math.abs(m.freq - s.f) < .05 ? ' acc' : ''}" ${A('fmpre', i)}><b>${s.f.toFixed(1)}</b><span class="lbl">${esc(s.n)}</span></button>`).join('')}</div></section>`;
  } else {
    const list = m.src === 'usb' ? USB : TRACKS, idx = m.src === 'usb' ? m.usb : m.track, tr = list[idx], pos = curPos();
    left = `<section class="now glass">
      <div class="top">${srcBtn}</div>
      <div class="nbody"><div class="art" style="${artBg(tr.h)}"></div>
        <div class="meta"><div class="title">${esc(tr.t)}</div><div class="artist">${esc(tr.a)}</div>
          <div class="prog"><i id="pbar" style="width:${pos / tr.d * 100}%"></i></div>
          <div class="times"><span id="ptime">${mmss(pos)}</span><span id="prem">-${mmss(tr.d - pos)}</span></div></div></div>
      <div class="transport">
        <button ${A('mprev')} aria-label="Previous">${ms('skip_previous')}</button>
        <button class="pp" ${A('mplay')} aria-label="${m.playing ? 'Pause' : 'Play'}">${ms(m.playing ? 'pause' : 'play_arrow')}</button>
        <button ${A('mnext')} aria-label="Next">${ms('skip_next')}</button>
      </div></section>`;
    right = `<section class="list glass"><h2>${m.src === 'usb' ? 'USB drive' : 'Library'}</h2><div class="scroll" data-scroll="lib">${list.map((s, i) =>
      `<button class="row ${i === idx ? 'on' : ''}" ${A('mtrack', i)}><span class="art sm" style="${artBg(s.h)}"></span><span class="gr"><span class="t1">${esc(s.t)}</span><span class="t2">${esc(s.a)}</span></span><span class="meta">${i === idx && m.playing ? ms('graphic_eq') : mmss(s.d)}</span></button>`).join('')}</div></section>`;
  }
  return `<div class="mgrid">${left}${right}</div>`;
}

/* ---------- phone ---------- */
const callStatus = () => { const e = (Date.now() - S.phone.call.t0) / 1000; return e < 2.5 ? 'Calling…' : mmss(e - 2.5); };
function phone() {
  const p = S.phone;
  if (p.call) {
    const c = p.call;
    return `<div class="callscr glass">
      <span class="av big">${initials(c.name)}</span>
      <div class="nm">${esc(c.name)}</div><div class="st">${esc(c.num)}</div><div class="st" id="ctime">${callStatus()}</div>
      <div class="cbtns">
        <button class="tile${c.mute ? ' acc' : ''}" ${A('pmute')} aria-pressed="${c.mute}">${ms('mic_off')}<span class="lbl">Mute</span></button>
        <button class="tile${c.spk ? ' acc' : ''}" ${A('pspk')} aria-pressed="${c.spk}">${ms('volume_up')}<span class="lbl">Speaker</span></button>
        <button class="tile end" ${A('pend')}>${ms('call_end')}<span class="lbl">End</span></button>
      </div></div>`;
  }
  const tab = (k, ic, l) => `<button class="tile${p.tab === k ? ' sel' : ''}" ${A('ptab', k)} aria-pressed="${p.tab === k}">${ms(ic)}<span class="lbl">${l}</span></button>`;
  let body;
  if (p.tab === 'recents') {
    body = `<h2>Recents</h2><div class="scroll" data-scroll="rec">${p.rec.map(r => {
      const c = CB[r.cid];
      return `<button class="row" ${A('pcall', r.cid || 'num:' + r.num)}><span class="av">${c ? initials(c.n) : ms('dialpad')}</span><span class="gr"><span class="t1${r.k === 'Missed' ? ' miss' : ''}">${esc(c ? c.n : r.num)}</span><span class="t2">${r.k}</span></span><span class="meta">${esc(r.w)}</span></button>`;
    }).join('')}</div>`;
  } else if (p.tab === 'contacts') {
    const list = [...CON].sort((a, b) => a.n.localeCompare(b.n));
    body = `<h2>Contacts</h2><div class="scroll" data-scroll="con">${list.map(c => `<button class="row${p.open === c.id ? ' on' : ''}" ${A('popen', c.id)} aria-expanded="${p.open === c.id}"><span class="av">${initials(c.n)}</span><span class="gr"><span class="t1">${esc(c.n)}</span></span>${ms(p.open === c.id ? 'expand_less' : 'expand_more')}</button>
      ${p.open === c.id ? `<div class="cdet"><button class="btn go" ${A('pcall', c.id)}>${ms('call')}Call mobile<span class="num">${esc(c.num)}</span></button></div>` : ''}`).join('')}</div>`;
  } else {
    body = `<div class="kp"><div class="kpd"><div class="dnum">${esc(p.dial) || '&nbsp;'}</div>
        <div class="acts"><button class="btn go" ${A('pdial')}>${ms('call')}Call</button><button class="btn" ${A('pdel')} aria-label="Delete">${ms('backspace')}</button></div></div>
      <div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(k => `<button class="key" ${A('pkey', k)}>${k}</button>`).join('')}</div></div>`;
  }
  return `<div class="pgrid"><div class="ptabs">${tab('recents', 'history', 'Recents')}${tab('contacts', 'person', 'Contacts')}${tab('keypad', 'dialpad', 'Keypad')}</div>
    <section class="pcard glass">${body}</section></div>`;
}

/* ---------- navigation ---------- */
/* Route is drawn on the stylised map: car near the centre of the free area, destination placed by its
   offset in metres (scaled to fit), L-shaped path. Real distance = |x| + |y|. */
function geom(id) {
  const p = PB[id], el = $('#main');
  const W = el.clientWidth, H = el.clientHeight;
  const sx = W * 0.6, sy = H * 0.45;
  const kx = p.x < 0 ? (sx - 40) / -p.x : (W - 40 - sx) / Math.max(1, p.x);
  const ky = p.y < 0 ? (sy - 110) / -p.y : (H - 250 - sy) / Math.max(1, p.y);   // keep the pin above the route card
  const k = Math.min(0.06, kx, ky);
  const dx = sx + p.x * k, dy = sy + p.y * k;
  let pts = [[sx, sy], [sx, dy], [dx, dy]].filter((q, i, a) => i === 0 || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, cum, L: cum[cum.length - 1] || 1, metres: Math.abs(p.x) + Math.abs(p.y), W, H };
}
function posAt(G, d) {
  d = clamp(d, 0, G.L);
  let i = 1; while (i < G.cum.length - 1 && G.cum[i] < d) i++;
  const a = G.pts[i - 1], b = G.pts[i] || a, seg = (G.cum[i] - G.cum[i - 1]) || 1, k = (d - G.cum[i - 1]) / seg;
  return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, h: Math.atan2(b[1] - a[1], b[0] - a[0]), i };
}
function routeInfo(id) {
  const n = S.nav, active = !id && n.mode === 'route';
  const G = geom(id || n.dest || n.sel);
  const prog = active ? clamp((Date.now() - n.t0) / (ROUTE_SECONDS * 1000), 0, 1) : 0;
  const q = posAt(G, prog * G.L);
  const rem = (1 - prog) * G.metres;
  const min = rem < 60 ? 0 : Math.max(1, Math.round(rem / 450));
  const at = new Date(Date.now() + Math.max(min, 1) * 60000);
  const toCorner = q.i < G.pts.length - 1 ? (G.cum[q.i] - prog * G.L) / G.L * G.metres : rem;
  let turn = 'F';
  if (q.i < G.pts.length - 1) {
    const a = G.pts[q.i - 1], b = G.pts[q.i], c = G.pts[q.i + 1];
    turn = ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) > 0 ? 'R' : 'L';
  }
  return { G, prog, q, min, km: (rem / 1000).toFixed(1), arr: at.getHours() + ':' + String(at.getMinutes()).padStart(2, '0'), toCorner, turn };
}
const distStr = m => m >= 1000 ? (m / 1000).toFixed(1) + ' km' : Math.max(0, Math.round(m / 50) * 50) + ' m';
function manText(r) {
  if (r.turn === 'F') return [distStr(r.toCorner), 'to ' + PB[S.nav.dest].n];
  return ['In ' + distStr(r.toCorner), r.turn === 'R' ? 'turn right' : 'turn left'];
}
function routeSvg(r, active) {
  const G = r.G, pts = G.pts.map(p => p.join(',')).join(' ');
  const end = G.pts[G.pts.length - 1];
  return `<svg class="route" width="${G.W}" height="${G.H}" viewBox="0 0 ${G.W} ${G.H}" aria-hidden="true">
      <polyline points="${pts}" class="rglow"/><polyline points="${pts}" class="rline"/>
      ${active ? `<polyline id="doneP" points="" class="rdone"/>` : ''}
    </svg>
    <div class="pin" style="left:${end[0]}px;top:${end[1]}px" aria-hidden="true">${ms('location_on')}</div>`;
}
function nav() {
  const n = S.nav;
  const zoom = `<div class="zoom">
      <button class="glass" ${A('zoom', '+')} aria-label="Zoom in">${ms('add')}</button>
      <button class="glass" ${A('zoom', '-')} aria-label="Zoom out">${ms('remove')}</button></div>`;
  const carAt = (x, y, deg) => `<div class="carM" id="carM" style="transform:translate(${x}px,${y}px) rotate(${deg}deg)" aria-hidden="true"><span>${ms('navigation')}</span></div>`;
  const el = $('#main'), cx = el.clientWidth * 0.6, cy = el.clientHeight * 0.45;
  if (n.mode === 'idle') {
    return `<button class="search glass navs" ${A('nsearch')}>${ms('search')}Where to?</button>${zoom}${carAt(cx, cy, 0)}`;
  }
  if (n.mode === 'search') {
    const q = n.q.trim().toLowerCase();
    const items = q ? POI.filter(p => p.n.toLowerCase().includes(q)) : [...POI.filter(p => p.saved), ...NAV_RECENT.map(i => PB[i])];
    const rows = items.length ? items.map(p => `<button class="row" ${A('npick', p.id)}>${ms(p.saved ? 'home' : (!q && NAV_RECENT.includes(p.id)) ? 'history' : 'location_on')}<span class="gr"><span class="t1">${esc(p.n)}</span><span class="t2">${esc(p.c)}</span></span><span class="meta">${((Math.abs(p.x) + Math.abs(p.y)) / 1000).toFixed(1)} km</span></button>`).join('')
      : `<div class="empty">No places match that search</div>`;
    const K = [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']];
    return `<section class="srch glass" aria-label="Search places">
        <div class="qrow"><div class="qbox">${ms('search')}<span>${esc(n.q)}</span><i class="caret"></i>${n.q ? '' : '<span class="ph">Where to?</span>'}</div>
          <button class="iconbtn" ${A('nclose')} aria-label="Close search">${ms('close')}</button></div>
        <h2>${q ? 'Results' : 'Saved and recent'}</h2>
        <div class="scroll" data-scroll="nres">${rows}</div>
        <div class="kb">${K.map(r => `<div class="kr">${r.map(k => `<button class="key" ${A('nkey', k)}>${k}</button>`).join('')}</div>`).join('')}
          <div class="kr"><button class="key w" ${A('nkey', ' ')}>space</button><button class="key m" ${A('ndel')} aria-label="Delete">${ms('backspace')}</button></div></div>
      </section>${carAt(cx, cy, 0)}`;
  }
  if (n.mode === 'preview') {
    const p = PB[n.sel], r = routeInfo(n.sel);
    return `${routeSvg(r, false)}${carAt(r.G.pts[0][0], r.G.pts[0][1], 0)}${zoom}
      <section class="ncard glass" aria-label="Route preview"><div><div class="t1">${esc(p.n)}</div><div class="t2">${esc(p.c)}</div></div>
        <div class="stats"><div><b>${r.min}</b><span>min</span></div><div><b>${r.km}</b><span>km</span></div><div><b>${r.arr}</b><span>Arrival</span></div></div>
        <div class="acts"><button class="btn pri" ${A('nstart')}>${ms('near_me')}Start</button><button class="btn" ${A('ncancel')}>Cancel</button></div></section>`;
  }
  if (n.mode === 'route') {
    const p = PB[n.dest], r = routeInfo(), mt = manText(r);
    return `${routeSvg(r, true)}${carAt(r.q.x, r.q.y, r.q.h * 180 / Math.PI + 90)}
      <div class="man" aria-live="polite">${ms(r.turn === 'R' ? 'turn_right' : r.turn === 'L' ? 'turn_left' : 'flag', '')}<div><b id="manD">${mt[0]}</b><span id="manT">${esc(mt[1])}</span></div></div>
      ${zoom}
      <section class="ncard glass" aria-label="Route"><div class="t1">${esc(p.n)}</div>
        <div class="stats"><div><b id="nArr">${r.arr}</b><span>Arrival</span></div><div><b id="nMin">${r.min}</b><span>min</span></div><div><b id="nKm">${r.km}</b><span>km</span></div></div>
        <div class="acts"><button class="btn dng" ${A('nend')}>${ms('close')}End route</button></div></section>`;
  }
  const p = PB[n.dest];
  return `${zoom}${carAt(cx, cy, 0)}<section class="ncard glass"><div class="t2">You have arrived</div><div class="t1">${esc(p.n)}</div>
    <div class="acts"><button class="btn pri" ${A('nend')}>${ms('check')}Done</button></div></section>`;
}

/* ---------- climate ---------- */
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

/* ---------- vehicle: drive modes and charging ---------- */
const rangeKm = () => Math.round(S.car.soc * KM_PER_PCT * DMODES[S.car.mode].rng);
function chargeEta() {
  const v = S.car, pct = Math.max(0, v.limit - v.soc);
  const min = Math.round(pct / 100 * BATTERY_KWH / CHARGE_KW * 60);
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}
function chargeStatus() {
  const v = S.car;
  if (!v.plugged) return 'Not plugged in';
  if (v.soc >= v.limit) return `Charged to ${v.limit}%`;
  if (v.schedule && !v.charging) return 'Waiting for off-peak · starts 23:00';
  return v.charging ? `Charging · ${chargeEta()} to ${v.limit}%` : 'Charging paused';
}
function vehicle() {
  const v = S.car;
  const tabs = [['drive', 'tune', 'Drive modes'], ['charge', 'ev_station', 'Charging']]
    .map(([k, ic, l]) => `<button class="${v.tab === k ? 'on' : ''}" ${A('vtab', k)} aria-pressed="${v.tab === k}">${ms(ic)}${l}</button>`).join('');
  let body;
  if (v.tab === 'drive') {
    const md = DMODES[v.mode];
    const modes = Object.entries(DMODES).map(([k, m]) =>
      `<button class="tile mtile${v.mode === k ? ' sel' : ''}" ${A('dmode', k)} aria-pressed="${v.mode === k}">${ms(m.ic)}<span class="lbl">${m.n}</span></button>`).join('');
    const stc = k => {
      const s = DSET[k], lv = v[k];
      return `<div class="stc">
        <button ${A('dset', k + ':-')} aria-label="${s.n} lower" ${lv <= 1 ? 'disabled' : ''}>${ms('chevron_left')}</button>
        <div><span class="lbl">${s.n}</span><b>${s.v[lv - 1].toUpperCase()}</b>${dashes(3, lv)}</div>
        <button ${A('dset', k + ':+')} aria-label="${s.n} higher" ${lv >= 3 ? 'disabled' : ''}>${ms('chevron_right')}</button></div>`;
    };
    body = `<div class="vgrid">
      <div class="modes">${modes}</div>
      <section class="vhero">
        <div class="vtitle">${ms(md.ic)}<div><h2>${md.n}</h2><p>${md.d}</p></div></div>
        <div class="pill big">${ms('route')}Estimated range <b>${rangeKm()} km</b></div>
        <div class="stcs">${stc('regen')}${stc('steer')}${stc('ride')}</div>
      </section></div>`;
  } else {
    const soc = Math.floor(v.soc);
    body = `<div class="cgrid2">
      <section class="vhero">
        <div class="socrow"><div class="soc"><span id="socBig">${soc}</span><small>%</small></div>
          <div class="socmeta"><b id="socRange">${rangeKm()} km</b><span>estimated range</span></div></div>
        <div class="battbar"><i id="socBar" style="width:${v.soc}%"></i><span class="lim" style="left:${v.limit}%" aria-hidden="true"></span></div>
        <div class="battlbl"><span>0%</span><span>Limit ${v.limit}%</span><span>100%</span></div>
        <div class="cstat${v.charging ? ' on' : ''}" id="cStat">${ms(v.charging ? 'bolt' : v.plugged ? 'power' : 'power_off')}<span class="ctext">${chargeStatus()}</span></div>
        <div class="acts">
          ${v.plugged ? `<button class="btn ${v.charging ? '' : 'pri'}" ${A('charge')} ${v.soc >= v.limit ? 'disabled' : ''}>${ms(v.charging ? 'pause' : 'bolt')}${v.charging ? 'Stop charging' : 'Start charging'}</button>` : ''}
          <button class="btn" ${A('cport')}>${ms(v.port ? 'lock' : 'ev_station')}${v.port ? 'Close charge port' : 'Open charge port'}</button>
        </div>
      </section>
      <section class="vside">
        <div class="stc wide">
          <button ${A('climit', '-')} aria-label="Lower charge limit" ${v.limit <= 50 ? 'disabled' : ''}>${ms('chevron_left')}</button>
          <div><span class="lbl">Charge limit</span><b>${v.limit}%</b><span class="hint">${v.limit > 90 ? 'Best for long trips' : 'Best for daily use'}</span></div>
          <button ${A('climit', '+')} aria-label="Raise charge limit" ${v.limit >= 100 ? 'disabled' : ''}>${ms('chevron_right')}</button></div>
        <button class="tile wide2${v.schedule ? ' acc' : ''}" ${A('csched')} aria-pressed="${v.schedule}">${ms('schedule')}<span class="lbl">Off-peak charging · 23:00–06:00</span>${dashes(1, v.schedule ? 1 : 0)}</button>
        <div class="kv"><div><b>${v.charging ? CHARGE_KW : 0} kW</b><span>Power</span></div><div><b>${v.charging ? 16 : 0} A</b><span>Current</span></div><div><b>${v.plugged ? 'AC' : '–'}</b><span>Type</span></div></div>
      </section></div>`;
  }
  return `<div class="panel">
    <div class="head"><h1>${ms('directions_car')}Vehicle</h1><div class="seg">${tabs}</div></div>
    ${body}
  </div>`;
}

/* ---------- settings ---------- */
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
    <div class="srow"><div><div class="lbl">Bottom offset</div><div class="sub">Removes a blank band under the bar, or adds space if the bar sits too low</div></div>
      <div class="stepper"><button ${A('safebottom', '-')} aria-label="Less">${ms('remove')}</button><b>${PREF.safeBottom > 0 ? '+' : ''}${PREF.safeBottom} px</b><button ${A('safebottom', '+')} aria-label="More">${ms('add')}</button></div></div>
    <div class="about"><span>${BUILD.name} · ${esc(FIT)}</span><span>${BUILD.id}</span></div>
  </div>`;
}

/* ---------- render ---------- */
let lastScreen = null;
function render() {
  applyTheme();
  renderRail();
  renderBar();
  const view = { home, nav, media, phone, climate, vehicle, settings }[S.screen];
  const anim = S.screen !== lastScreen;
  lastScreen = S.screen;
  const main = $('#main');
  const keep = {}; main.querySelectorAll('[data-scroll]').forEach(e => { keep[e.dataset.scroll] = e.scrollTop; });
  main.innerHTML = `<div class="scr"${anim ? '' : ' style="animation:none"'}>${view()}${S.sheet === 'src' ? srcSheet() : ''}</div>`;
  main.querySelectorAll('[data-scroll]').forEach(e => { if (keep[e.dataset.scroll] != null) e.scrollTop = keep[e.dataset.scroll]; });
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
  go(v) { S.screen = v; S.sheet = null; $('#pop').hidden = true; },
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
  tog(k) { const c = S.clim; c[k] = !c[k]; if (k === 'sync' && c.sync) c.pT = c.dT; },
  fan(v) { const c = S.clim; c.auto = false; c.fan = v === '+' ? Math.min(7, c.fan + 1) : v === '-' ? Math.max(1, c.fan - 1) : +v; },
  mode(v) { S.clim.mode = v; S.clim.auto = false; },

  mplay() { S.media.playing = !S.media.playing; },
  mnext() {
    const m = S.media;
    if (m.src === 'fm') return ACT.fmseek('+');
    if (m.src === 'usb') { m.usb = (m.usb + 1) % USB.length; m.upos = 0; } else { m.track = (m.track + 1) % TRACKS.length; m.pos = 0; }
    m.playing = true;
    if (S.screen !== 'media' && S.screen !== 'home') toast(ms('skip_next'), cur().t);
  },
  mprev() {
    const m = S.media;
    if (m.src === 'fm') return ACT.fmseek('-');
    if (m.src === 'usb') { if (m.upos > 3) m.upos = 0; else { m.usb = (m.usb + USB.length - 1) % USB.length; m.upos = 0; } }
    else { if (m.pos > 3) m.pos = 0; else { m.track = (m.track + TRACKS.length - 1) % TRACKS.length; m.pos = 0; } }
    m.playing = true;
  },
  mtrack(v) { const m = S.media; if (m.src === 'usb') { m.usb = +v; m.upos = 0; } else { m.track = +v; m.pos = 0; } m.playing = true; },
  srcsheet() { if (S.screen !== 'home' && S.screen !== 'media') S.screen = 'media'; S.sheet = 'src'; },
  closesheet() { S.sheet = null; },
  setsrc(v) { S.media.src = v; S.media.playing = true; S.sheet = null; toast(ms(SOURCES[v].icon), 'Source · ' + SOURCES[v].name); },
  fmpre(v) { const m = S.media; m.fm = +v; m.freq = FMS[v].f; m.playing = true; },
  fmtune(v) {
    const m = S.media;
    m.freq = Math.round(clamp(m.freq + (v === '+' ? 0.1 : -0.1), 87.5, 108) * 10) / 10;
    const i = FMS.findIndex(s => Math.abs(s.f - m.freq) < .05); if (i >= 0) m.fm = i;
  },
  fmseek(v) {
    const m = S.media, up = v === '+';
    const c = up ? FMS.find(s => s.f > m.freq + .05) || FMS[0] : [...FMS].reverse().find(s => s.f < m.freq - .05) || FMS[FMS.length - 1];
    m.fm = FMS.indexOf(c); m.freq = c.f; m.playing = true;
  },
  volpop() { const p = $('#pop'); if (p.hidden) showVol(); else p.hidden = true; },
  vol(v) { const m = S.media; if (v === 'mute') m.mute = !m.mute; else { m.mute = false; m.vol = clamp(m.vol + (v === '+' ? 1 : -1), 0, 30); } showVol(); },

  ptab(v) { S.phone.tab = v; S.phone.open = null; },
  popen(v) { S.phone.open = S.phone.open === v ? null : v; },
  pcall(v) {
    if (S.phone.call) return;
    const c = v.startsWith('num:') ? null : CB[v];
    const num = c ? c.num : v.slice(4);
    S.phone.call = { cid: c ? c.id : null, num, name: c ? c.n : num, t0: Date.now(), mute: false, spk: false };
    S.screen = 'phone';
  },
  pkey(v) { if (S.phone.dial.length < 14) S.phone.dial += v; },
  pdel() { S.phone.dial = S.phone.dial.slice(0, -1); },
  pdial() {
    const d = S.phone.dial.replace(/\s/g, ''); if (!d) return;
    const c = CON.find(x => x.num.replace(/\s/g, '') === d);
    ACT.pcall(c ? c.id : 'num:' + S.phone.dial);
  },
  pmute() { S.phone.call.mute = !S.phone.call.mute; },
  pspk() { S.phone.call.spk = !S.phone.call.spk; },
  pend() { const c = S.phone.call; S.phone.rec.unshift({ cid: c.cid, num: c.num, k: 'Outgoing', w: 'Now' }); S.phone.call = null; },

  nsearch() { S.screen = 'nav'; S.nav.mode = 'search'; S.nav.q = ''; },
  nclose() { S.nav.mode = S.nav.dest ? 'route' : 'idle'; },
  nkey(v) { if (S.nav.q.length < 30) S.nav.q += v; },
  ndel() { S.nav.q = S.nav.q.slice(0, -1); },
  npick(v) { S.nav.sel = v; S.nav.mode = 'preview'; },
  nstart() { const n = S.nav; n.dest = n.sel; n.mode = 'route'; n.t0 = Date.now(); },
  ncancel() { S.nav.sel = null; S.nav.mode = S.nav.dest ? 'route' : 'idle'; },
  nend() { const n = S.nav; n.dest = null; n.sel = null; n.mode = 'idle'; },
  zoom(v) { S.zoom = clamp(S.zoom * (v === '+' ? 1.25 : 0.8), 0.5, 2.5); },

  vgo(v) { S.screen = 'vehicle'; S.car.tab = v; S.sheet = null; },
  vtab(v) { S.car.tab = v; },
  dmode(v) {
    const m = DMODES[v]; if (!m) return;
    Object.assign(S.car, { mode: v, regen: m.regen, steer: m.steer, ride: m.ride });
    toast(ms(m.ic), 'Drive mode · ' + m.n);
  },
  dset(v) { const [k, d] = v.split(':'); S.car[k] = clamp(S.car[k] + (d === '+' ? 1 : -1), 1, 3); },
  charge() { const c = S.car; if (c.soc < c.limit) c.charging = !c.charging; },
  climit(v) {
    const c = S.car;
    c.limit = clamp(c.limit + (v === '+' ? 5 : -5), 50, 100);
    if (c.soc >= c.limit) c.charging = false;
  },
  csched(){ const c = S.car; c.schedule = !c.schedule; if (c.schedule) c.charging = false; },
  cport() { S.car.port = !S.car.port; toast(ms('ev_station'), S.car.port ? 'Charge port open' : 'Charge port closed'); },

  theme(v) { PREF.theme = v; savePref(); },
  accent(v) { if (ACCENTS[v]) { PREF.accent = v; savePref(); } },
  safetop(v) { PREF.safeTop = clamp(PREF.safeTop + (v === '+' ? 4 : -4), 0, 80); savePref(); },
  safebottom(v) { PREF.safeBottom = clamp(PREF.safeBottom + (v === '+' ? 4 : -4), -60, 60); savePref(); }
};

$('#app').addEventListener('click', e => {
  const wi = e.target.closest('.wi');
  if (wi) { const w = wi.closest('.wheel'); w._prog = false; w.scrollTo({ top: +wi.dataset.i * IH, behavior: 'smooth' }); return; }
  const el = e.target.closest('[data-a]');
  if (!el || !ACT[el.dataset.a]) return;
  if (el.dataset.a === 'closesheet' && e.target !== el) return;   // taps inside the sheet don't close it
  ACT[el.dataset.a](el.dataset.v);
  if (el.closest('#pop')) { renderBar(); return; }                // keep the volume popover open
  render();
});
document.addEventListener('gesturestart', e => e.preventDefault());

/* ---------- 1 s tick: clock, song progress, call timer ---------- */
setInterval(() => {
  const k = $('#clk'); if (k) k.textContent = hm();
  const ct = $('#ctime'); if (ct && S.phone.call) ct.textContent = callStatus();
  const v = S.car;
  if (v.charging && v.plugged) {
    v.soc = Math.min(v.limit, v.soc + CHARGE_KW / BATTERY_KWH / 3600 * 100 * CHARGE_DEMO_SPEED);
    if (v.soc >= v.limit) { v.charging = false; if (S.screen === 'vehicle') render(); else renderRail(); toast(ms('battery_full'), `Charged to ${v.limit}%`); }
    else {
      const set = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
      set('railSoc', Math.floor(v.soc) + '%'); set('socBig', Math.floor(v.soc)); set('socRange', rangeKm() + ' km');
      const bar = $('#socBar'); if (bar) bar.style.width = v.soc + '%';
      const cs = $('#cStat .ctext'); if (cs) cs.textContent = chargeStatus();
    }
  }
  const m = S.media; if (!m.playing || m.src === 'fm') return;
  const usb = m.src === 'usb', tr = cur();
  if (usb) m.upos++; else m.pos++;
  if (curPos() >= tr.d) {
    if (usb) { m.usb = (m.usb + 1) % USB.length; m.upos = 0; } else { m.track = (m.track + 1) % TRACKS.length; m.pos = 0; }
    if (S.screen === 'home' || S.screen === 'media') render();
    return;
  }
  const pb = $('#pbar');
  if (pb) { const pos = curPos(); pb.style.width = (pos / tr.d * 100) + '%'; $('#ptime').textContent = mmss(pos); $('#prem').textContent = '-' + mmss(tr.d - pos); }
}, 1000);

/* ---------- simulated drive: move the car, update the guidance ---------- */
let lastLeg = -1, lastUi = 0;
function navFrame(ts) {
  const n = S.nav;
  if (n.mode === 'route') {
    const r = routeInfo();
    if (r.prog >= 1) { n.mode = 'arrived'; if (S.screen === 'nav' || S.screen === 'home') render(); }
    else if (S.screen === 'nav') {
      const car = $('#carM');
      if (car) car.style.transform = `translate(${r.q.x}px,${r.q.y}px) rotate(${r.q.h * 180 / Math.PI + 90}deg)`;
      const done = $('#doneP');
      if (done) done.setAttribute('points', r.G.pts.slice(0, r.q.i).concat([[r.q.x, r.q.y]]).map(p => p.join(',')).join(' '));
      if (r.q.i !== lastLeg) { lastLeg = r.q.i; render(); }
      else if (ts - lastUi > 400) {
        lastUi = ts;
        const mt = manText(r), set = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        set('manD', mt[0]); set('manT', mt[1]); set('nMin', r.min); set('nKm', r.km); set('nArr', r.arr);
      }
    } else if (S.screen === 'home' && ts - lastUi > 1000) {
      lastUi = ts; const e = $('#hMin'); if (e) e.textContent = r.min;
    }
  }
  requestAnimationFrame(navFrame);
}
requestAnimationFrame(navFrame);

window.addEventListener('resize', () => { if (S.screen === 'nav') render(); else document.querySelectorAll('.wheel').forEach(w => wheelTo(w, w.dataset.wheel === 'd' ? S.clim.dT : S.clim.pT)); });

render();

/* offline support once installed */
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(r => {
    r.update();
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') r.update(); });
  }).catch(() => {});
}
})();
