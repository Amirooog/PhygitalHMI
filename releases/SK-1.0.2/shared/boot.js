/* PhygitalHMI — start-up animation, shared by TB and SK.
   Runs once each time the app opens (not on researcher resets), like a car waking up:
   a rail draws in, the knob slides to its centre, a ring pulses, then a short welcome with the car's state.
   Tap to skip. When it ends it fires the 'phmi:booted' event (the SK tutorial waits for it). */
(() => {
'use strict';
const H = window.HMI;
const done = () => { window.PHMI_BOOTED = true; window.dispatchEvent(new Event('phmi:booted')); };
if (!H) return done();

const s = H.state(), h = new Date().getHours();
const hello = h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
const t = s.clim.dT, temp = t <= 16 ? 'LO' : t >= 28 ? 'HI' : (t % 1 ? t.toFixed(1) : t) + '°';
const mode = (H.data.dmodes && H.data.dmodes[s.car.mode]) ? H.data.dmodes[s.car.mode].n : '';
const info = [Math.floor(s.car.soc) + '%' + (s.car.charging ? ' charging' : ''), temp + ' inside', mode].filter(Boolean).join('  ·  ');

const el = document.createElement('div');
el.id = 'boot'; el.setAttribute('role', 'status'); el.setAttribute('aria-label', 'Welcome back');
el.innerHTML = `
  <svg class="b-logo" viewBox="0 0 240 120" aria-hidden="true">
    <circle class="b-ring" cx="120" cy="60" r="22"/>
    <line class="b-rail" x1="20" y1="60" x2="220" y2="60"/>
    <g class="b-gates">${[40, 80, 120, 160, 200].map(x => `<line x1="${x}" y1="52" x2="${x}" y2="68"/>`).join('')}</g>
    <circle class="b-knob" cx="120" cy="60" r="13"/>
  </svg>
  <div class="b-word">PHYGITAL</div>
  <div class="b-hello"><b>${hello}</b><span>Welcome back</span></div>
  <div class="b-info">${info}</div>`;
document.body.appendChild(el);

const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let ended = false;
function end() {
  if (ended) return; ended = true;
  el.classList.add('out');
  setTimeout(() => { el.remove(); done(); }, 520);
}
requestAnimationFrame(() => el.classList.add('go'));
const timer = setTimeout(end, reduce ? 1400 : 3600);
el.addEventListener('pointerdown', () => { clearTimeout(timer); end(); });
})();
