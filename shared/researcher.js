/* PhygitalHMI — researcher mode, shared by TB and SK.
   Needs window.HMI from the app (see tb/app.js) plus PHMI_TASKS and PHMI_LOG.
   Open the panel: press and hold the clock in the side rail for 1 s, or Shift+R on a keyboard.

   A trial: Run → the app resets to its start state → the instruction is shown full screen →
   the clock starts on "Start" → every touch inside the app is logged → the trial ends by itself
   when the task's goal state is reached, or after 120 s (timeout), or when the researcher ends it.
   Optional occlusion (ISO 16673 style): the screen goes dark in fixed cycles while touch keeps working;
   total shutter-open time (TSOT) is logged as a visual-demand measure. */
(() => {
'use strict';
const H = window.HMI, TASKS = window.PHMI_TASKS, LOG = window.PHMI_LOG;
if (!H || !TASKS || !LOG) { console.warn('Researcher mode: missing HMI, tasks or log'); return; }

const TIMEOUT = 120000;
const SKEY = 'phmi.session';
const SES = Object.assign({ participant: 'P01', condition: H.app, occ: { on: false, open: 1500, closed: 1500 } },
  (() => { try { return JSON.parse(localStorage.getItem(SKEY) || '{}'); } catch (e) { return {}; } })());
const saveSes = () => { try { localStorage.setItem(SKEY, JSON.stringify(SES)); } catch (e) { /* in memory only */ } };

let trial = null, note = '';
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));

/* ---------- DOM ---------- */
const rp = document.createElement('div'); rp.id = 'rp'; rp.hidden = true; rp.setAttribute('role', 'dialog'); rp.setAttribute('aria-label', 'Researcher panel');
const ovl = document.createElement('div'); ovl.id = 'rovl'; ovl.hidden = true;
const occ = document.createElement('div'); occ.id = 'rocc'; occ.setAttribute('aria-hidden', 'true');
document.body.append(rp, ovl, occ);

/* ---------- opening the panel ---------- */
let lp;
H.root.addEventListener('pointerdown', e => {
  if (!e.target.closest('.clock')) return;
  lp = setTimeout(openPanel, 900);
}, true);
['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => H.root.addEventListener(ev, () => clearTimeout(lp), true));
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.shiftKey && (e.key === 'R' || e.key === 'r')) rp.hidden ? openPanel() : closePanel();
});
function openPanel() { renderPanel(); rp.hidden = false; }
function closePanel() { rp.hidden = true; }

/* ---------- touch log (only while a trial runs; taps on the clock are never counted) ---------- */
H.root.addEventListener('pointerdown', e => {
  if (!trial || !trial.running || e.target.closest('.clock')) return;
  const t = Math.round(performance.now() - trial.start);
  const el = e.target.closest('[data-a]'), wh = e.target.closest('.wheel');
  const lbl = el ? el.dataset.a + (el.dataset.v !== undefined ? ':' + el.dataset.v : '') : wh ? 'wheel:' + wh.dataset.wheel : 'miss';
  const blind = !!(trial.occ && !trial.occ.open);
  trial.touches++;
  if (lbl === 'miss') trial.misses++;
  if (blind) trial.occ.touches++;
  if (trial.first == null) trial.first = t;
  if (trial.path.length < 400) trial.path.push(blind ? { t, a: lbl, s: H.state().screen, o: 1 } : { t, a: lbl, s: H.state().screen });
}, true);

/* ---------- running a task ---------- */
function startTask(id) {
  const task = TASKS.find(x => x.id === id);
  if (!task) return;
  closePanel();
  H.reset();
  ovl.innerHTML = `<div class="rbox">
      <div class="rk">${task.id} · ${task.lv}</div>
      <div class="rq">${esc(task.text)}</div>
      ${SES.occ.on ? '<div class="rn">The screen will go dark at intervals. Keep going.</div>' : ''}
      <button class="rgo" type="button">Start</button>
    </div>`;
  ovl.hidden = false;
  ovl.querySelector('.rgo').onclick = () => {
    ovl.hidden = true;
    const p = H.prefs();
    trial = {
      task, base: clone(H.state()), start: performance.now(), startedAt: new Date().toISOString(),
      touches: 0, misses: 0, first: null, path: [], running: true, theme: p.theme, accent: p.accent, occ: null
    };
    H.lock.trial = true;
    if (SES.occ.on) { trial.occ = { open: true, openAt: performance.now(), tsot: 0, intervals: 1, touches: 0, o: SES.occ.open, c: SES.occ.closed, timer: null }; occCycle(); }
  };
}
function occCycle() {
  const o = trial && trial.occ; if (!o || !trial.running) return;
  o.timer = setTimeout(() => {
    if (!trial || !trial.running) return;
    const now = performance.now();
    if (o.open) { o.tsot += now - o.openAt; o.open = false; occ.classList.add('on'); }
    else { o.open = true; o.openAt = now; o.intervals++; occ.classList.remove('on'); }
    occCycle();
  }, o.open ? o.o : o.c);
}
function occStop() {
  const o = trial && trial.occ; if (!o) return;
  clearTimeout(o.timer);
  if (o.open) o.tsot += performance.now() - o.openAt;
  o.open = true; occ.classList.remove('on');
}
function finish(result) {
  if (!trial || !trial.running) return;
  const end = performance.now();
  occStop();
  trial.running = false; H.lock.trial = false;
  const o = trial.occ;
  const rec = {
    id: 'T' + Date.now().toString(36), build: H.build, app: H.app,
    participant: SES.participant || '—', condition: SES.condition || '',
    task: trial.task.id, level: trial.task.lv, result,
    durationMs: Math.round(end - trial.start), firstTouchMs: trial.first,
    touches: trial.touches, misses: trial.misses,
    screens: [...new Set(trial.path.map(p => p.s))], path: trial.path,
    theme: trial.theme, accent: trial.accent,
    occlusion: o ? `${o.o}/${o.c}` : 'off', tsotMs: o ? Math.round(o.tsot) : null,
    openIntervals: o ? o.intervals : null, touchesOccluded: o ? o.touches : null,
    startedAt: trial.startedAt
  };
  note = LOG.add(rec) ? 'Saved on this iPad.' : 'Could not save — storage is full or blocked. Export now.';
  if (result === 'success') {
    ovl.innerHTML = '<div class="rdone"><span class="ms" aria-hidden="true">check</span></div>';
    ovl.hidden = false; ovl.classList.add('pass');
    setTimeout(() => { ovl.hidden = true; ovl.classList.remove('pass'); openPanel(); }, 950);
  } else openPanel();
}
setInterval(() => {
  if (!trial || !trial.running) return;
  if (trial.task.ok(H.state(), trial.base, H.data)) finish('success');
  else if (performance.now() - trial.start > TIMEOUT) finish('timeout');
}, 150);

/* ---------- panel ---------- */
const s1 = ms => ms == null ? '—' : (ms / 1000).toFixed(1);
function renderPanel() {
  const R = LOG.all();
  const live = trial && trial.running
    ? `<div class="rlive"><b>Running ${trial.task.id} — ${esc(trial.task.text)}</b>
        <span class="rnote" id="rLive">${trial.touches} touches · ${s1(performance.now() - trial.start)} s${trial.occ ? ' · occlusion on' : ''}</span>
        <div class="rfr"><button class="rb x" data-r="abort">End as not completed</button><button class="rb" data-r="close">Back to participant</button></div></div>`
    : (R[0] ? `<div class="rlive"><b class="res-${R[0].result}">${R[0].task} · ${R[0].result} · ${s1(R[0].durationMs)} s · ${R[0].touches} touches (${R[0].misses} missed)${R[0].tsotMs != null ? ' · TSOT ' + s1(R[0].tsotMs) + ' s' : ''}</b><span class="rnote">${esc(note)}</span></div>` : '');
  rp.innerHTML = `<div class="rpi">
    <header><b>Researcher · ${esc(H.app)} · ${esc(H.build)}</b><button class="rb" data-r="close">Close</button></header>
    <div class="rbody">
      ${live}
      <section><h4>Session</h4>
        <div class="rfr"><label>Participant<input id="rP" value="${esc(SES.participant)}" autocomplete="off" autocapitalize="characters"></label>
          <label>Condition<input id="rC" value="${esc(SES.condition)}" autocomplete="off"></label></div>
        <div class="rfr"><button class="rb" data-r="reset">Reset app to start state</button></div>
        <p class="rnote">Theme and accent are recorded with every trial and locked while it runs. Set them in Settings before the session.</p>
      </section>
      <section><h4>Occlusion</h4>
        <div class="rfr"><button class="rb ${SES.occ.on ? '' : 'a'}" data-r="occ" data-v="0">Off</button><button class="rb ${SES.occ.on ? 'a' : ''}" data-r="occ" data-v="1">On</button>
          <label class="sm">Visible ms<input id="rO" inputmode="numeric" value="${SES.occ.open}"></label>
          <label class="sm">Dark ms<input id="rX" inputmode="numeric" value="${SES.occ.closed}"></label></div>
        <p class="rnote">Touch keeps working while the screen is dark. TSOT = total visible time until the task was finished. Check the interval values against ISO 16673 before reporting them.</p>
      </section>
      <section><h4>Tasks</h4><div class="rtl">
        ${TASKS.map(k => `<div class="rtr"><span class="rc">${k.id}<small>${k.lv}</small></span><span class="rd">${esc(k.text)}</span><button class="rb a" data-r="run" data-v="${k.id}" ${trial && trial.running ? 'disabled' : ''}>Run</button></div>`).join('')}
      </div></section>
      <section><h4>Trials on this iPad (${R.length})</h4>
        <div class="rtw"><table><thead><tr><th>Build</th><th>P</th><th>Task</th><th>Result</th><th>Time s</th><th>Touches</th><th>Miss</th><th>TSOT s</th><th>Theme</th></tr></thead><tbody>
        ${R.slice(0, 60).map(r => `<tr><td>${esc(r.build)}</td><td>${esc(r.participant)}</td><td>${r.task}</td><td class="res-${r.result}">${r.result}</td><td>${s1(r.durationMs)}</td><td>${r.touches}</td><td>${r.misses}</td><td>${s1(r.tsotMs)}</td><td>${esc(r.theme)}/${esc(r.accent)}</td></tr>`).join('') || '<tr><td colspan="9" class="rnote">No trials yet. Run a task above.</td></tr>'}
        </tbody></table></div>
        <div class="rfr"><button class="rb a" data-r="export">Export CSV</button><button class="rb" data-r="copy">Copy CSV</button><button class="rb x" data-r="clear" ${R.length ? '' : 'disabled'}>Delete all trials</button></div>
        <div id="rMsg" class="rnote"></div>
      </section>
      <p class="rnote">Open this panel: press and hold the clock for 1 s, or Shift+R on a keyboard. A trial ends by itself when the goal is reached, or after ${TIMEOUT / 1000} s.</p>
    </div></div>`;
  const num = (v, d) => { v = parseInt(v, 10); return v >= 200 && v <= 10000 ? v : d; };
  rp.querySelector('#rP').onchange = e => { SES.participant = e.target.value.trim(); saveSes(); };
  rp.querySelector('#rC').onchange = e => { SES.condition = e.target.value.trim(); saveSes(); };
  rp.querySelector('#rO').onchange = e => { SES.occ.open = num(e.target.value, 1500); saveSes(); };
  rp.querySelector('#rX').onchange = e => { SES.occ.closed = num(e.target.value, 1500); saveSes(); };
}
rp.addEventListener('click', async e => {
  if (e.target === rp) { closePanel(); return; }
  const b = e.target.closest('[data-r]'); if (!b || b.disabled) return;
  const r = b.dataset.r, v = b.dataset.v, msg = t => { const m = rp.querySelector('#rMsg'); if (m) m.textContent = t; };
  const p = rp.querySelector('#rP'), c = rp.querySelector('#rC');
  if (p) { SES.participant = p.value.trim(); SES.condition = c.value.trim(); saveSes(); }
  if (r === 'close') closePanel();
  if (r === 'run') startTask(v);
  if (r === 'abort') finish('abandoned');
  if (r === 'reset') { H.reset(); closePanel(); }
  if (r === 'occ') { SES.occ.on = v === '1'; saveSes(); renderPanel(); }
  if (r === 'export') { const res = await LOG.exportCsv(); msg(res === 'shared' ? 'Shared.' : res === 'downloaded' ? 'Downloaded ' + LOG.fileName() : ''); }
  if (r === 'copy') msg(await LOG.copyCsv() ? 'CSV copied to the clipboard.' : 'Clipboard blocked here — use Export CSV.');
  if (r === 'clear') {
    if (confirm(`Delete all ${LOG.all().length} trials on this iPad? Export first if you need them.`) && confirm('This cannot be undone. Delete them?')) { LOG.clear(); note = ''; renderPanel(); }
  }
});
setInterval(() => {
  if (rp.hidden || !trial || !trial.running) return;
  const l = rp.querySelector('#rLive'); if (l) l.textContent = `${trial.touches} touches · ${s1(performance.now() - trial.start)} s${trial.occ ? ' · occlusion on' : ''}`;
}, 500);

/* let the app ask whether a trial is running (e.g. to hold back a reload) */
H.trialRunning = () => !!(trial && trial.running);
})();
