/* PhygitalHMI — trial log, shared by TB and SK.
   Trials are kept on this device (localStorage) and exported as CSV.
   Both apps live on the same site, so they share one log; the build and app columns tell them apart. */
window.PHMI_LOG = (() => {
  const KEY = 'phmi.trials', MAX = 2000;
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; } };
  const write = a => { try { localStorage.setItem(KEY, JSON.stringify(a.slice(0, MAX))); return true; } catch (e) { return false; } };
  let mem = read();

  const COLS = ['build', 'app', 'participant', 'condition', 'order', 'task', 'level', 'result', 'duration_s', 'first_touch_s',
    'touches', 'misses', 'knob_actions', 'first_knob_s', 'screens', 'path', 'theme', 'accent', 'occlusion', 'tsot_s', 'open_intervals', 'touches_occluded',
    'started_at', 'trial_id'];
  const q = v => { v = v == null ? '' : String(v); return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const s2 = ms => ms == null ? '' : (ms / 1000).toFixed(2);

  return {
    all: () => mem,
    add(rec) { mem.unshift(rec); return write(mem); },
    clear() { mem = []; write(mem); },
    csv() {
      const rows = [...mem].reverse().map(r => [
        r.build, r.app, r.participant, r.condition, r.order || '', r.task, r.level, r.result, s2(r.durationMs), s2(r.firstTouchMs),
        r.touches, r.misses, r.knob || 0, s2(r.firstKnobMs), (r.screens || []).join(' > '), (r.path || []).map(p => p.a + (p.o ? '*' : '')).join(' > '),
        r.theme, r.accent, r.occlusion, s2(r.tsotMs), r.openIntervals ?? '', r.touchesOccluded ?? '', r.startedAt, r.id
      ].map(q).join(','));
      return [COLS.join(','), ...rows].join('\n');
    },
    fileName: () => `phygitalhmi-trials-${new Date().toISOString().slice(0, 10)}.csv`,
    /* iPad: share sheet (Files, AirDrop, Mail). Elsewhere: a normal download. */
    async exportCsv() {
      const name = this.fileName(), text = this.csv();
      try {
        const f = new File([text], name, { type: 'text/csv' });
        if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'PhygitalHMI trials' }); return 'shared'; }
      } catch (e) { if (e && e.name === 'AbortError') return 'cancelled'; }
      const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return 'downloaded';
    },
    async copyCsv() { try { await navigator.clipboard.writeText(this.csv()); return true; } catch (e) { return false; } }
  };
})();
