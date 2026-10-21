/* PhygitalHMI — Ctrl = touch mode (SK1, SK2, SK3; for the desktop / demo setup, 21 Oct 2026).
   While Ctrl is held, the mouse stops being the knob and works like a finger:
   - the cursor shows and clicks reach the screen (the knob layers check window.PHMI_CTRL.on);
   - slide (cursor x) and the middle button are ignored, so the knob zone stays where it was;
   - the wheel scrolls the list under the cursor (browser zoom with Ctrl + wheel is blocked).
   Releasing Ctrl returns to knob mode; the zone only changes when the knob slides again.
   Clicks in touch mode are not logged as touches (the researcher log ignores the mouse in SK apps). */
(() => {
'use strict';
const C = window.PHMI_CTRL = { on: false };
const css = document.createElement('style');
css.textContent = `
html.ctrl-touch.ctrl-touch, html.ctrl-touch.ctrl-touch * { cursor: default !important; }
html.ctrl-touch.ctrl-touch button, html.ctrl-touch.ctrl-touch [data-a] { cursor: pointer !important; }
#ctrlChip { position: fixed; left: 50%; top: calc(var(--safe-top, 28px) + 10px); z-index: 400; transform: translate(-50%, -10px); opacity: 0; pointer-events: none;
  display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 20px; font: 600 14px var(--font-ui, system-ui), sans-serif;
  color: #0B0C0E; background: var(--acc, #4CC3E0); box-shadow: 0 8px 24px rgba(0,0,0,.35); transition: opacity .15s, transform .2s; }
#ctrlChip.show { opacity: 1; transform: translate(-50%, 0); }
#ctrlChip small { font-weight: 500; opacity: .7; }`;
document.head.appendChild(css);
const chip = document.createElement('div'); chip.id = 'ctrlChip'; chip.setAttribute('role', 'status');
chip.innerHTML = '<span class="ms" aria-hidden="true" style="font-size:18px">touch_app</span>Touch mode<small>release Ctrl for the knob</small>';
document.body.appendChild(chip);

const set = on => {
  if (C.on === on) return;
  C.on = on;
  document.documentElement.classList.toggle('ctrl-touch', on);
  chip.classList.toggle('show', on);
};
window.addEventListener('keydown', e => { if (e.key === 'Control') set(true); }, true);
window.addEventListener('keyup', e => { if (e.key === 'Control') set(false); }, true);
window.addEventListener('blur', () => set(false));
document.addEventListener('visibilitychange', () => { if (document.hidden) set(false); });

// slide and middle button: swallowed before the knob layer sees them (listeners on window run before document)
window.addEventListener('pointermove', e => {
  if (e.pointerType !== 'mouse') return;
  if (C.on && !e.ctrlKey) set(false);          // missed keyup (e.g. released outside the window)
  if (C.on) e.stopPropagation();
}, true);
['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick'].forEach(ev => window.addEventListener(ev, e => {
  if (C.on && e.button === 1) { e.preventDefault(); e.stopPropagation(); }
}, true));

// wheel: scroll what is under the cursor, like a finger swipe; never zoom, never turn the knob
const scroller = el => {
  for (; el && el !== document.body; el = el.parentElement) {
    const s = getComputedStyle(el);
    if (/(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 1) return el;
  }
  return null;
};
window.addEventListener('wheel', e => {
  if (!C.on && !e.ctrlKey) return;
  set(true);
  e.preventDefault(); e.stopPropagation();
  const el = scroller(e.target);
  if (el) el.scrollBy({ top: e.deltaY * (e.deltaMode === 1 ? 33 : 1), left: e.deltaX });
}, { capture: true, passive: false });
})();
