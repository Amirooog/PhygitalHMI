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
SES.condition = SES['cond_' + H.app] || H.app;          // the condition is kept per app (TB, SK, SK2 share this storage)
const saveSes = () => { SES['cond_' + H.app] = SES.condition;  try { localStorage.setItem(SKEY, JSON.stringify(SES)); } catch (e) { /* in memory only */ } };

/* ---------- participants (shared by TB and SK on this iPad) ----------
   Names and background stay on this iPad and in their own CSV; the trial log only carries the ID (P01…),
   so trial data can be shared or analysed without names. */
const PKEY = 'phmi.participants';
const ORDER = 'TB-SK1-SK2';   // fixed order for every participant (Amir, 19 Oct 2026)
const PF = [   // field, label, kind, options
  ['name', 'Name', 'text'], ['age', 'Age', 'num'],
  ['gender', 'Gender', 'seg', ['Female', 'Male', 'Other / prefer not']],
  ['years', 'Years driving', 'num'],
  ['drives', 'Drives', 'seg', ['Daily', 'Weekly', 'Rarely']],
  ['touchcar', 'Touchscreen car', 'seg', ['None', 'Sometimes', 'Regularly']],
  ['hand', 'Handedness', 'seg', ['Right', 'Left']],
  ['glasses', 'Glasses / lenses', 'seg', ['No', 'Yes']],
  ['consent', 'Consent signed', 'seg', ['No', 'Yes']],
  ['notes', 'Notes', 'area']
];
const PPL = (() => { try { return JSON.parse(localStorage.getItem(PKEY) || '[]'); } catch (e) { return []; } })();
const savePpl = () => { try { localStorage.setItem(PKEY, JSON.stringify(PPL)); return true; } catch (e) { return false; } };
const pById = id => PPL.find(p => p.id === id);
const nextId = () => { let n = PPL.length + 1, id; do { id = 'P' + String(n++).padStart(2, '0'); } while (pById(id)); return id; };
let editing = null;   // participant being edited (a copy), or null

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
  if (/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  if (e.shiftKey && (e.key === 'R' || e.key === 'r')) rp.hidden ? openPanel() : closePanel();
});
function openPanel() { renderPanel(); rp.hidden = false; }
function closePanel() { rp.hidden = true; }

/* ---------- touch log (only while a trial runs; taps on the clock are never counted) ---------- */
H.root.addEventListener('pointerdown', e => {
  if (!trial || !trial.running || e.target.closest('.clock')) return;
  if (e.pointerType === 'mouse' && /^SK/.test(H.app)) return;   // in SK the mouse is the knob: logged through PHMI_TRACE, never as a touch
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

/* ---------- knob actions (SK): slide to a new position, turn one step, press ---------- */
window.PHMI_TRACE = label => {
  if (!trial || !trial.running) return;
  const t = Math.round(performance.now() - trial.start);
  trial.knob++;
  if (trial.firstKnob == null) trial.firstKnob = t;
  const m = /^(turn|hturn|press|dbl|long):([a-z]+)/.exec(label);
  if (m && trial.task.pos && m[2] !== trial.task.pos) trial.errPos++;
  if (trial.path.length < 400) trial.path.push({ t, a: 'k:' + label, s: H.state().screen });
};

/* ---------- running a task ---------- */
const repsDone = (id) => LOG.all().filter(r => r.participant === SES.participant && r.app === H.app && r.task === id).length;
function nextCh5() {
  for (const k of TASKS.filter(x => x.ch5).sort((a, b) => a.ch5 - b.ch5)) if (repsDone(k.id) < k.reps) return k;
  return null;
}
const flash = document.createElement('div'); flash.id = 'rflash'; flash.setAttribute('aria-hidden', 'true'); document.body.appendChild(flash);
function startTask(id) {
  const task = TASKS.find(x => x.id === id);
  if (!task) return;
  const rep = repsDone(id) + 1;
  closePanel();
  H.reset();
  ovl.innerHTML = `<div class="rbox">
      <div class="rk">${task.id} · ${task.lv}${task.reps ? ' · ' + rep + ' of ' + task.reps : ''}</div>
      <div class="rq">${esc(task.text)}</div>
      ${SES.occ.on ? '<div class="rn">The screen will go dark at intervals. Keep going.</div>' : ''}
      <button class="rgo" type="button">Start</button>
    </div>`;
  ovl.hidden = false;
  ovl.querySelector('.rgo').onclick = () => {
    ovl.hidden = true;
    flash.classList.remove('go'); void flash.offsetWidth; flash.classList.add('go');   // white flash: syncs the video with the log
    const p = H.prefs();
    trial = {
      task, rep, base: clone(H.state()), start: performance.now(), startedAt: new Date().toISOString(),
      touches: 0, misses: 0, first: null, knob: 0, firstKnob: null, path: [], running: true, theme: p.theme, accent: p.accent, occ: null,
      assisted: false, errPos: 0, errOver: 0, wasOver: false, changed: new Set()
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
    participant: SES.participant || '—', condition: SES.condition || '', order: ORDER,
    task: trial.task.id, level: trial.task.lv, rep: trial.rep, result,
    assisted: trial.assisted ? 1 : 0, incomplete: result === 'success' ? 0 : 1,
    errWrongPos: trial.errPos, errOvershoot: trial.errOver, errUnintended: trial.changed.size, unintended: [...trial.changed].join(' '),
    durationMs: Math.round(end - trial.start), firstTouchMs: trial.first,
    touches: trial.touches, misses: trial.misses, knob: trial.knob, firstKnobMs: trial.firstKnob,
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
  const st = H.state(), tk = trial.task;
  if (tk.over) { const o = !!tk.over(st, trial.base); if (o && !trial.wasOver) trial.errOver++; trial.wasOver = o; }
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  for (const f of (window.PHMI_WATCH || [])) {
    if ((tk.allow || []).includes(f)) continue;
    if (JSON.stringify(get(st, f)) !== JSON.stringify(get(trial.base, f))) trial.changed.add(f);
  }
  if (tk.ok(st, trial.base, H.data)) finish('success');
  else if (performance.now() - trial.start > TIMEOUT) finish('timeout');
}, 150);

/* ---------- participant panel parts ---------- */
const trialsOf = id => { const n = { TB: 0, SK1: 0, SK2: 0 }; LOG.all().forEach(r => { const a = r.app === 'SK' ? 'SK1' : r.app; if (r.participant === id && n[a] != null) n[a]++; }); return n; };
function msgP(t) { const m = rp.querySelector('#pMsg'); if (m) m.textContent = t || ''; }
function readForm() {
  if (!editing) return;
  rp.querySelectorAll('[data-pf]').forEach(el => { editing[el.dataset.pf] = el.value.trim(); });
}
function field([f, label, kind, opts]) {
  const v = editing[f] == null ? '' : editing[f];
  if (kind === 'seg') return `<div class="pfl"><span>${label}</span><div class="rfr">${opts.map(o => `<button class="rb ${v === o ? 'a' : ''}" data-r="pset" data-f="${f}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div></div>`;
  if (kind === 'area') return `<label class="wide">${label}<textarea data-pf="${f}" rows="2">${esc(v)}</textarea></label>`;
  return `<label class="${kind === 'num' ? 'sm' : ''}">${label}<input data-pf="${f}" value="${esc(v)}" ${kind === 'num' ? 'inputmode="numeric"' : 'autocomplete="off" autocapitalize="words"'}></label>`;
}
function participantBlock() {
  if (editing) {
    const isNew = !pById(editing.id);
    return `<section class="pform"><h4>${isNew ? 'New participant' : 'Edit participant'} · ${esc(editing.id)}</h4>
      <div class="rfr">${PF.slice(0, 2).map(field).join('')}${field(PF[3])}</div>
      ${PF.filter(x => x[2] === 'seg').map(field).join('')}
      ${field(PF[PF.length - 1])}
      <div class="rfr"><button class="rb a" data-r="psave">Save and select</button><button class="rb" data-r="pcancel">Cancel</button>${isNew ? '' : `<button class="rb x" data-r="pdel" data-v="${esc(editing.id)}">Delete</button>`}</div>
      <div id="pMsg" class="rnote"></div>
      <p class="rnote">Every participant uses the apps in the same order: TB, then SK1, then SK2. Names stay on this iPad and in the participants file only — the trial log uses the ID.</p></section>`;
  }
  const cur = pById(SES.participant);
  const curLine = cur
    ? `<div class="pcur"><b>${esc(cur.id)} · ${esc(cur.name)}</b><span>${[cur.age && cur.age + ' y', cur.gender, ORDER, cur.consent === 'Yes' ? 'consent ✓' : 'NO CONSENT YET'].filter(Boolean).map(esc).join(' · ')}</span>
        <div class="rfr"><button class="rb" data-r="pedit" data-v="${esc(cur.id)}">Edit</button></div></div>`
    : `<div class="pcur warn"><b>${SES.participant ? esc(SES.participant) + ' (not in the list)' : 'No participant selected'}</b><span>Add or select a participant before running tasks.</span></div>`;
  const rows = PPL.map(p => { const n = trialsOf(p.id); return `<tr class="${p.id === SES.participant ? 'on' : ''}"><td>${esc(p.id)}</td><td>${esc(p.name)}</td><td>${esc(p.age || '')}</td><td>${p.consent === 'Yes' ? '✓' : '—'}</td><td>${n.TB} / ${n.SK1} / ${n.SK2}</td>
      <td class="pact"><button class="rb ${p.id === SES.participant ? 'a' : ''}" data-r="psel" data-v="${esc(p.id)}">${p.id === SES.participant ? 'Selected' : 'Select'}</button><button class="rb" data-r="pedit" data-v="${esc(p.id)}">Edit</button></td></tr>`; }).join('');
  return `<section><h4>Participant</h4>${curLine}
    <div class="rtw"><table><thead><tr><th>ID</th><th>Name</th><th>Age</th><th>Consent</th><th>Trials TB / SK1 / SK2</th><th></th></tr></thead><tbody>
      ${rows || '<tr><td colspan="6" class="rnote">No participants yet.</td></tr>'}</tbody></table></div>
    <div class="rfr"><button class="rb a" data-r="pnew">+ New participant</button><button class="rb" data-r="pexport" ${PPL.length ? '' : 'disabled'}>Export participants CSV</button></div>
    <div id="pMsg" class="rnote"></div></section>`;
}
function pplCsv() {
  const q = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const cols = ['id', 'name', 'age', 'gender', 'years', 'drives', 'touchcar', 'hand', 'glasses', 'order', 'consent', 'notes', 'created'];
  const head = ['id', 'name', 'age', 'gender', 'years_driving', 'drives', 'touchscreen_car', 'handedness', 'glasses', 'order', 'consent', 'notes', 'created_at', 'trials_TB', 'trials_SK1', 'trials_SK2'];
  return [head.join(','), ...PPL.map(p => { const n = trialsOf(p.id); return [...cols.map(c => q(c === 'order' ? ORDER : p[c])), n.TB, n.SK1, n.SK2].join(','); })].join('\n');
}
async function shareCsv(name, text) {
  try {
    const f = new File([text], name, { type: 'text/csv' });
    if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: name }); return 'Shared.'; }
  } catch (e) { if (e && e.name === 'AbortError') return ''; }
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return 'Downloaded ' + name;
}

/* ---------- panel ---------- */
const s1 = ms => ms == null ? '—' : (ms / 1000).toFixed(1);
function renderPanel() {
  const keepY = (rp.querySelector('.rbody') || {}).scrollTop || 0;
  const R = LOG.all();
  const live = trial && trial.running
    ? `<div class="rlive"><b>Running ${trial.task.id} — ${esc(trial.task.text)}</b>
        <span class="rnote" id="rLive">${trial.touches} touches · ${s1(performance.now() - trial.start)} s${trial.occ ? ' · occlusion on' : ''}</span>
        <div class="rfr"><button class="rb ${trial.assisted ? 'a' : ''}" data-r="assist">${trial.assisted ? 'Help given ✓' : 'Mark help given'}</button><button class="rb x" data-r="abort">End as not completed</button><button class="rb" data-r="close">Back to participant</button></div></div>`
    : (R[0] ? `<div class="rlive"><b class="res-${R[0].result}">${R[0].task} · ${R[0].result} · ${s1(R[0].durationMs)} s · ${R[0].touches} touches (${R[0].misses} missed)${R[0].knob ? ' · ' + R[0].knob + ' knob' : ''}${R[0].tsotMs != null ? ' · TSOT ' + s1(R[0].tsotMs) + ' s' : ''}</b><span class="rnote">rep ${R[0].rep || '—'} · errors: position ${R[0].errWrongPos ?? '—'}, overshoot ${R[0].errOvershoot ?? '—'}, unintended ${R[0].errUnintended ?? '—'} · ${esc(note)}</span>
        <div class="rfr"><button class="rb ${R[0].assisted ? 'a' : ''}" data-r="assistlast">${R[0].assisted ? 'Help given ✓ (tap to undo)' : 'Mark help given'}</button></div></div>` : '');
  rp.innerHTML = `<div class="rpi">
    <header><b>Researcher · ${esc(H.app)} · ${esc(H.build)}</b><button class="rb" data-r="close">Close</button></header>
    <div class="rbody">
      ${live}
      ${participantBlock(R)}
      <section><h4>Session</h4>
        <div class="rfr"><label>Condition<input id="rC" value="${esc(SES.condition)}" autocomplete="off"></label>
          <button class="rb" data-r="reset">Reset app to start state</button></div>
        <div class="rfr"><span class="rnote">Vehicle (for the parked-only rules)</span><button class="rb ${H.state().car.moving ? '' : 'a'}" data-r="moving" data-v="0">Parked</button><button class="rb ${H.state().car.moving ? 'a' : ''}" data-r="moving" data-v="1">Moving</button></div>
        <p class="rnote">Theme and accent are recorded with every trial and locked while it runs. Set them in Settings before the session.</p>
      </section>
      <section><h4>Occlusion</h4>
        <div class="rfr"><button class="rb ${SES.occ.on ? '' : 'a'}" data-r="occ" data-v="0">Off</button><button class="rb ${SES.occ.on ? 'a' : ''}" data-r="occ" data-v="1">On</button>
          <label class="sm">Visible ms<input id="rO" inputmode="numeric" value="${SES.occ.open}"></label>
          <label class="sm">Dark ms<input id="rX" inputmode="numeric" value="${SES.occ.closed}"></label></div>
        <p class="rnote">Touch keeps working while the screen is dark. TSOT = total visible time until the task was finished. Check the interval values against ISO 16673 before reporting them.</p>
      </section>
      ${(() => {
        const nx = nextCh5(), busy = trial && trial.running;
        const row = k => { const d = repsDone(k.id); return `<div class="rtr"><span class="rc">${k.id}<small>${k.lv}</small></span><span class="rd">${esc(k.text)}${k.reps ? `<small class="rrep ${d >= k.reps ? 'ok' : ''}">${Math.min(d, k.reps)} of ${k.reps} done${d > k.reps ? ' (+' + (d - k.reps) + ' extra)' : ''}</small>` : ''}</span><button class="rb ${nx && nx.id === k.id ? 'a' : ''}" data-r="run" data-v="${k.id}" ${busy ? 'disabled' : ''}>Run ${k.reps ? (d + 1) : ''}</button></div>`; };
        return `<section><h4>Ch5 tasks · ${esc(SES.participant || 'no participant')} · ${esc(H.app)}</h4>
          ${nx ? `<button class="rb a rnext" data-r="run" data-v="${nx.id}" ${busy ? 'disabled' : ''}>Next: ${nx.id} · ${esc(nx.text)} · ${repsDone(nx.id) + 1} of ${nx.reps}</button>` : '<p class="rnote">All Ch5 tasks done for this participant in this app.</p>'}
          <div class="rtl">${TASKS.filter(k => k.ch5).sort((a, b) => a.ch5 - b.ch5).map(row).join('')}</div>
          <details class="rmore"><summary>Other tasks (not in the Ch5 run)</summary><div class="rtl">${TASKS.filter(k => !k.ch5).map(row).join('')}</div></details>
        </section>`;
      })()}
      <section><h4>Trials on this iPad (${R.length})</h4>
        <div class="rtw"><table><thead><tr><th>Build</th><th>P</th><th>Task</th><th>Rep</th><th>Result</th><th>Time s</th><th>Touches</th><th>Miss</th><th>Knob</th><th>TSOT s</th><th>Theme</th></tr></thead><tbody>
        ${R.slice(0, 60).map(r => `<tr><td>${esc(r.build)}</td><td>${esc(r.participant)}</td><td>${r.task}</td><td>${r.rep || ''}</td><td class="res-${r.result}">${r.result}${r.assisted ? ' · help' : ''}</td><td>${s1(r.durationMs)}</td><td>${r.touches}</td><td>${r.misses}</td><td>${r.knob || 0}</td><td>${s1(r.tsotMs)}</td><td>${esc(r.theme)}/${esc(r.accent)}</td></tr>`).join('') || '<tr><td colspan="11" class="rnote">No trials yet. Run a task above.</td></tr>'}
        </tbody></table></div>
        <div class="rfr"><button class="rb a" data-r="export">Export CSV</button><button class="rb" data-r="copy">Copy CSV</button><button class="rb x" data-r="clear" ${R.length ? '' : 'disabled'}>Delete all trials</button></div>
        <div id="rMsg" class="rnote"></div>
      </section>
      <p class="rnote">Open this panel: press and hold the clock for 1 s, or Shift+R on a keyboard. A trial ends by itself when the goal is reached, or after ${TIMEOUT / 1000} s.</p>
    </div></div>`;
  rp.querySelector('.rbody').scrollTop = keepY;
  const num = (v, d) => { v = parseInt(v, 10); return v >= 200 && v <= 10000 ? v : d; };
  rp.querySelector('#rC').onchange = e => { SES.condition = e.target.value.trim(); saveSes(); };
  rp.querySelector('#rO').onchange = e => { SES.occ.open = num(e.target.value, 1500); saveSes(); };
  rp.querySelector('#rX').onchange = e => { SES.occ.closed = num(e.target.value, 1500); saveSes(); };
}
rp.addEventListener('click', async e => {
  if (e.target === rp) { closePanel(); return; }
  const b = e.target.closest('[data-r]'); if (!b || b.disabled) return;
  const r = b.dataset.r, v = b.dataset.v, msg = t => { const m = rp.querySelector('#rMsg'); if (m) m.textContent = t; };
  const c = rp.querySelector('#rC');
  if (c) { SES.condition = c.value.trim(); saveSes(); }
  if (editing) readForm();
  if (r === 'close') closePanel();
  if (r === 'pnew') { editing = { id: nextId(), order: ORDER, consent: 'No', created: new Date().toISOString() }; renderPanel(); }
  if (r === 'pedit') { const p = pById(v); if (p) { editing = clone(p); renderPanel(); } }
  if (r === 'pset') { readForm(); editing[b.dataset.f] = v; renderPanel(); }
  if (r === 'pcancel') { editing = null; renderPanel(); }
  if (r === 'psave') {
    if (!(editing.name || '').trim()) { msgP('Enter a name first.'); return; }
    const i = PPL.findIndex(p => p.id === editing.id);
    if (i >= 0) PPL[i] = editing; else PPL.push(editing);
    SES.participant = editing.id; saveSes();
    msgP(savePpl() ? '' : 'Could not save on this iPad — storage is full or blocked.');
    editing = null; renderPanel();
  }
  if (r === 'pdel') {
    const p = pById(v);
    if (p && confirm(`Delete ${p.id} (${p.name})? Their trials stay in the log under ${p.id}.`)) {
      PPL.splice(PPL.indexOf(p), 1); savePpl(); if (SES.participant === p.id) { SES.participant = ''; saveSes(); } editing = null; renderPanel();
    }
  }
  if (r === 'psel') { SES.participant = v; saveSes(); renderPanel(); }
  if (r === 'pexport') msgP(await shareCsv('phygitalhmi-participants-' + new Date().toISOString().slice(0, 10) + '.csv', pplCsv()));
  if (r === 'run') { if (!pById(SES.participant) && !confirm('No participant selected. Run anyway?')) return; startTask(v); }
  if (r === 'abort') finish('abandoned');
  if (r === 'assist' && trial) { trial.assisted = !trial.assisted; renderPanel(); }
  if (r === 'assistlast') { const last = LOG.all()[0]; if (last) { LOG.update(last.id, { assisted: last.assisted ? 0 : 1 }); renderPanel(); } }
  if (r === 'moving') { H.state().car.moving = v === '1'; H.render(); renderPanel(); }
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
  const l = rp.querySelector('#rLive'); if (l) l.textContent = `${trial.touches} touches · ${trial.knob} knob · ${s1(performance.now() - trial.start)} s${trial.occ ? ' · occlusion on' : ''}`;
}, 500);

/* let the app ask whether a trial is running (e.g. to hold back a reload) */
H.trialRunning = () => !!(trial && trial.running);
})();
