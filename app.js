(() => {
'use strict';
const R = ROSA;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const KEY = 'rosa-individual-v1';

const AREA_KEYS = Object.keys(R.AREAS);
const COLS = [
  ['chairHeight', 'Chair height'], ['panDepth', 'Pan depth'], ['armrests', 'Armrests'], ['backSupport', 'Back support'], ['chairDur', 'Chair duration'],
  ['monitor', 'Monitor'], ['monitorDur', 'Monitor duration'], ['phone', 'Telephone'], ['phoneDur', 'Telephone duration'],
  ['mouse', 'Mouse'], ['mouseDur', 'Mouse duration'], ['keyboard', 'Keyboard'], ['keyboardDur', 'Keyboard duration']];
const SECTIONS = [
  ['A', 'Section A — Chair', ['chairHeight', 'panDepth', 'armrests', 'backSupport'], [['chairDur', 'Time in chair']]],
  ['B', 'Section B — Monitor and telephone', ['monitor', 'phone'], [['monitorDur', 'Monitor use'], ['phoneDur', 'Telephone use']]],
  ['C', 'Section C — Mouse and keyboard', ['mouse', 'keyboard'], [['mouseDur', 'Mouse use'], ['keyboardDur', 'Keyboard use']]]];
const DUR_SHORT = { '-1': '< 1 h/day or < 30 min at a time', '0': '1–4 h/day or 30–60 min at a time', '1': '> 4 h/day or > 1 h at a time' };
const TIERNAME = { low: 'Low', medium: 'Medium', high: 'High' };

// ---------- state ----------
const blankEntry = () => ({ pid: '', obs: {}, scores: {}, durs: {}, editing: null });
let S = { mode: 'check', cutLow: 2, cutMed: 4, overflow: 'flag', saved: [], cur: blankEntry() };
try { const s = JSON.parse(localStorage.getItem(KEY) || 'null'); if (s) S = { ...S, ...s, cur: { ...blankEntry(), ...(s.cur || {}) } }; } catch (e) {}
let saveT;
const persist = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }, 200); };

// ---------- scoring ----------
const opts = () => ({ capOverflow: S.overflow === 'cap' });
function inputOf(e = S.cur, mode = S.mode) {
  const input = {};
  if (mode === 'check') AREA_KEYS.forEach(k => input[k] = R.areaScore(k, e.obs[k]));
  else AREA_KEYS.forEach(k => input[k] = e.scores[k] ?? null);
  R.DUR_KEYS.forEach(k => input[k] = e.durs[k] ?? null);
  return input;
}
const tier = f => f == null ? null : f <= S.cutLow ? 'low' : f <= S.cutMed ? 'medium' : 'high';
const fmtD = v => R.fmt(v);
const isMissing = res => res.errors.some(e => /missing/.test(e));

// ---------- form ----------
function buildForm() {
  let h = '';
  for (const [sk, title, areas, durs] of SECTIONS) {
    h += `<section class="sect"><div class="secthead"><h3>${esc(title)}</h3><span class="num" id="sec-${sk}"></span></div>`;
    for (const k of areas) {
      const a = R.AREAS[k];
      if (S.mode === 'check') {
        h += `<fieldset class="area"><legend><span>${esc(a.label)}</span><span class="areascore" id="as-${k}"></span></legend>`;
        a.base.forEach(([id, lab, p]) => h += `<label class="opt"><input type="radio" name="b-${k}" value="${id}"><span>${esc(lab)}</span><span class="pts">${p}</span></label>`);
        h += `<div class="addlab">Add if present</div>`;
        a.add.forEach(([id, lab, p]) => h += `<label class="opt"><input type="checkbox" name="a-${k}" value="${id}"><span>${esc(lab)}</span><span class="pts">+${p}</span></label>`);
        h += `</fieldset>`;
      } else {
        const [lo, hi] = R.RANGE[k];
        h += `<div class="stepper" data-k="${k}"><span class="lab">${esc(a.label)}<span class="rng">${lo}–${hi}</span></span><span class="ctl"><button type="button" data-step="-1" aria-label="Lower ${esc(a.label)}">−</button><span class="val" id="sv-${k}" aria-live="polite">–</span><button type="button" data-step="1" aria-label="Raise ${esc(a.label)}">+</button></span></div>`;
      }
    }
    for (const [dk, dl] of durs) {
      h += `<div class="dur" data-k="${dk}"><span class="lab">Duration · ${esc(dl)}</span><div class="choices">${[-1, 0, 1].map(v => `<button type="button" data-v="${v}" aria-pressed="false"><span class="v">${fmtD(v)}</span><span class="d">${DUR_SHORT[v]}</span></button>`).join('')}</div></div>`;
    }
    h += `</section>`;
  }
  $('#form').innerHTML = h;
  $('#modeHint').textContent = S.mode === 'check'
    ? 'Tick what you observe. Each area score is added up for you.'
    : 'Enter the area scores you already wrote on the ROSA sheet.';
  $('#m-check').setAttribute('aria-selected', String(S.mode === 'check'));
  $('#m-scores').setAttribute('aria-selected', String(S.mode === 'scores'));
  syncForm();
}
function syncForm() {
  const e = S.cur;
  $('#pid').value = e.pid;
  if (S.mode === 'check') {
    AREA_KEYS.forEach(k => {
      $$(`input[name="b-${k}"]`).forEach(i => i.checked = e.obs[k]?.base === i.value);
      $$(`input[name="a-${k}"]`).forEach(i => i.checked = (e.obs[k]?.add || []).includes(i.value));
    });
  }
  render();
}
$('#form').addEventListener('change', ev => {
  const t = ev.target; let m;
  const o = S.cur.obs;
  if ((m = t.name?.match(/^b-(\w+)$/))) o[m[1]] = { add: [], ...(o[m[1]] || {}), base: t.value };
  else if ((m = t.name?.match(/^a-(\w+)$/))) o[m[1]] = { base: null, ...(o[m[1]] || {}), add: $$(`input[name="a-${m[1]}"]:checked`).map(i => i.value) };
  render(); persist();
});
$('#form').addEventListener('click', ev => {
  const st = ev.target.closest('[data-step]');
  if (st) {
    const k = st.closest('.stepper').dataset.k; const [lo, hi] = R.RANGE[k];
    const cur = S.cur.scores[k];
    const next = cur == null ? (+st.dataset.step > 0 ? lo : lo) : Math.min(hi, Math.max(lo, cur + +st.dataset.step));
    S.cur.scores[k] = next; render(); persist(); return;
  }
  const d = ev.target.closest('.dur button');
  if (d) {
    const k = d.closest('.dur').dataset.k; const v = +d.dataset.v;
    S.cur.durs[k] = S.cur.durs[k] === v ? null : v; render(); persist();
  }
});
$('#pid').addEventListener('input', e => { S.cur.pid = e.target.value; persist(); });
function setMode(m) {
  if (m === S.mode) return;
  if (m === 'scores') { // carry checklist answers across as area scores
    AREA_KEYS.forEach(k => { const v = R.areaScore(k, S.cur.obs[k]); if (v != null) S.cur.scores[k] = v; });
  }
  S.mode = m; buildForm(); persist();
}
$('#m-check').onclick = () => setMode('check');
$('#m-scores').onclick = () => setMode('scores');

// ---------- render ----------
function chartHTML(tKey, hit) {
  const t = R.TABLES[tKey];
  const ri = hit ? hit.ri : -1, ci = hit ? hit.ci : -1;
  let h = `<div class="chart"><h4><span>${esc(t.name)}</span>${hit ? `<span class="num">${hit.value}</span>` : ''}</h4><div class="chartscroll"><table class="mx"><thead><tr><th class="corner"></th>`;
  t.cols.forEach((c, j) => h += `<th class="${j === ci ? 'ax' : ''}" scope="col">${c}</th>`);
  h += '</tr></thead><tbody>';
  t.rows.forEach((r, i) => {
    h += `<tr><th class="${i === ri ? 'ax' : ''}" scope="row">${r}</th>`;
    t.cells[i].forEach((v, j) => h += `<td class="${i === ri && j === ci ? 'hit' : (i === ri || j === ci) ? 'ax' : ''}">${v}</td>`);
    h += '</tr>';
  });
  return h + `</tbody></table></div><p class="axlab">Rows: ${esc(t.rowLabel)} · Columns: ${esc(t.colLabel)}</p></div>`;
}
function traceHTML(res) {
  return `<ol class="trace">${res.trace.map((s, i) => {
    if (s.kind === 'sum') return `<li><span class="i">${i + 1}</span><span class="e"><b>${esc(s.label)}</b> = ${esc(s.expr)}</span><span class="r">${s.value}</span></li>`;
    const t = R.TABLES[s.table];
    return `<li><span class="i">${i + 1}</span><span class="e"><b>${esc(s.label)}</b>: row ${s.rawRow} (${esc(t.rowLabel)}), column ${s.rawCol}${s.capped && s.rawCol !== s.col ? '→' + s.col + ' (capped)' : ''} (${esc(t.colLabel)})</span><span class="r">${s.value}</span></li>`;
  }).join('')}</ol>`;
}
function render() {
  const input = inputOf();
  const res = R.calculate(input, opts());
  // area scores and steppers
  AREA_KEYS.forEach(k => {
    if (S.mode === 'check') { const el = $('#as-' + k); if (el) el.textContent = input[k] == null ? '' : 'Score ' + input[k]; }
    else {
      const el = $('#sv-' + k); if (!el) return;
      el.textContent = input[k] ?? '–';
      const st = $(`.stepper[data-k="${k}"]`); const [lo, hi] = R.RANGE[k];
      st.querySelector('[data-step="-1"]').disabled = input[k] == null || input[k] <= lo;
      st.querySelector('[data-step="1"]').disabled = input[k] != null && input[k] >= hi;
    }
  });
  $$('.dur').forEach(d => $$('button', d).forEach(b => b.setAttribute('aria-pressed', String(S.cur.durs[d.dataset.k] === +b.dataset.v))));
  $('#sec-A').textContent = res.ok ? `Chair score ${res.chair}` : '';
  $('#sec-B').textContent = res.ok ? `Section B ${res.sectionB}` : '';
  $('#sec-C').textContent = res.ok ? `Section C ${res.sectionC}` : '';

  const t = res.ok ? tier(res.final) : null;
  const missing = res.errors.filter(e => /missing/.test(e)).map(e => e.replace(': missing', ''));
  const other = res.errors.filter(e => !/missing/.test(e));
  const hits = {}; res.trace.forEach(s => { if (s.kind === 'lookup') hits[s.table] = s; });
  $('#result').innerHTML = `
    <h3>ROSA final score${S.cur.pid ? ' · ' + esc(S.cur.pid) : ''}</h3>
    <div class="bigscore"><span class="n">${res.ok ? res.final : '–'}</span><div><span class="of">out of 10</span><br>${
      res.ok ? `<span class="chip ${t}">${TIERNAME[t]} risk</span>${res.final >= 5 ? ' <span class="small muted">at or above the action level of 5</span>' : ''}${res.capped ? ' <span class="chip cap">Capped</span>' : ''}`
      : missing.length ? `<span class="small muted">Still to answer: ${esc(missing.join(', '))}</span>` : ''}</div></div>
    ${other.length ? `<div class="notice err">${other.map(esc).join('<br>')}</div>` : ''}
    ${res.warnings.length ? `<div class="notice warn">${res.warnings.map(esc).join('<br>')}</div>` : ''}
    <div class="subscores">${[['Chair', 'chair'], ['Mon. & phone', 'sectionB'], ['Mouse & kb', 'sectionC'], ['Mon. & periph.', 'pm']].map(([l, k]) => `<div><div class="k">${l}</div><div class="v">${res.ok ? res[k] : '–'}</div></div>`).join('')}</div>
    ${res.trace.length ? `<details class="how" ${S.howOpen ? 'open' : ''} id="how"><summary>How this score was calculated</summary>${traceHTML(res)}<div class="charts">${['A', 'B', 'C', 'PM', 'FINAL'].map(k => chartHTML(k, hits[k])).join('')}</div></details>` : ''}`;
  const how = $('#how'); if (how) how.ontoggle = () => { S.howOpen = how.open; persist(); };

  $('#barN').textContent = res.ok ? res.final : '–';
  $('#barChip').innerHTML = res.ok ? `<span class="chip ${t}">${TIERNAME[t]}</span>` : missing.length ? `<span class="small muted">${missing.length} to answer</span>` : '<span class="chip err">Check</span>';
  $('#saveEntry').textContent = S.cur.editing ? 'Update entry' : 'Save entry';
}

// ---------- saved entries ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
function nextPid() {
  const ids = S.saved.map(s => s.pid);
  const m = ids.map(s => s.match(/^(.*?)(\d+)$/)).filter(Boolean);
  if (!m.length) return 'P-' + String(S.saved.length + 1).padStart(3, '0');
  const last = m[m.length - 1]; return last[1] + String(+last[2] + 1).padStart(last[2].length, '0');
}
function entryRecord(e) {
  const input = inputOf(e, S.mode);
  return { scores: Object.fromEntries(AREA_KEYS.map(k => [k, input[k]])), durs: { ...e.durs } };
}
function scoreSaved(s) { return R.calculate({ ...s.scores, ...s.durs }, opts()); }
$('#saveEntry').onclick = () => {
  const res = R.calculate(inputOf(), opts());
  if (isMissing(res)) { toast('Answer every item and duration first.'); $('#result').scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
  const pid = S.cur.pid.trim() || nextPid();
  const rec = { ...entryRecord(S.cur), pid, mode: S.mode, obs: S.mode === 'check' ? structuredClone(S.cur.obs) : null, saved: new Date().toISOString() };
  let msg;
  if (S.cur.editing && S.saved.some(s => s.id === S.cur.editing)) {
    const i = S.saved.findIndex(s => s.id === S.cur.editing); S.saved[i] = { ...S.saved[i], ...rec }; msg = `Updated ${pid}`;
  } else {
    const dup = S.saved.some(s => s.pid === pid);
    S.saved.push({ id: uid(), ...rec }); msg = `Saved ${pid}` + (dup ? ' (this ID was already saved once)' : '');
  }
  if (res.ok) msg += ` · ROSA ${res.final}`;
  S.cur = blankEntry(); buildForm(); renderSaved(); persist();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  toast(msg);
};
$('#newEntry').onclick = () => {
  const prev = structuredClone(S.cur);
  S.cur = blankEntry(); buildForm(); persist(); window.scrollTo({ top: 0, behavior: 'smooth' });
  toast('Form cleared', { label: 'Undo', fn: () => { S.cur = prev; buildForm(); persist(); } });
};
function renderSaved() {
  $('#savedCount').textContent = S.saved.length;
  if (!S.saved.length) { $('#saved').innerHTML = '<tbody><tr><td class="empty">No saved entries yet. Score a workstation and tap <b>Save entry</b>.</td></tr></tbody>'; $('#clearWrap').hidden = true; return; }
  $('#clearWrap').hidden = false;
  let h = '<thead><tr><th>ID</th><th>ROSA</th><th>Risk</th><th>Saved</th><th></th></tr></thead><tbody>';
  [...S.saved].reverse().forEach(s => {
    const r = scoreSaved(s); const t = r.ok ? tier(r.final) : null;
    const d = new Date(s.saved);
    h += `<tr class="${S.cur.editing === s.id ? 'cur' : ''}"><td><b>${esc(s.pid)}</b></td><td class="n">${r.ok ? r.final : '–'}</td><td>${r.ok ? `<span class="chip ${t}">${TIERNAME[t]}</span>${r.capped ? ' <span class="chip cap">Capped</span>' : ''}` : '<span class="chip err">Off chart</span>'}</td><td class="small muted">${d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</td><td><button class="link" data-edit="${s.id}">Edit</button><button class="link del" data-del="${s.id}" aria-label="Delete ${esc(s.pid)}">✕</button></td></tr>`;
  });
  $('#saved').innerHTML = h + '</tbody>';
}
$('#saved').addEventListener('click', ev => {
  const ed = ev.target.closest('[data-edit]'), del = ev.target.closest('[data-del]');
  if (ed) {
    const s = S.saved.find(x => x.id === ed.dataset.edit); if (!s) return;
    S.mode = s.mode === 'check' && s.obs ? 'check' : 'scores';
    S.cur = { pid: s.pid, obs: s.obs ? structuredClone(s.obs) : {}, scores: { ...s.scores }, durs: { ...s.durs }, editing: s.id };
    buildForm(); renderSaved(); persist(); window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(`Editing ${s.pid}. Tap Update entry when done.`);
  } else if (del) {
    const i = S.saved.findIndex(x => x.id === del.dataset.del); if (i < 0) return;
    const [gone] = S.saved.splice(i, 1); if (S.cur.editing === gone.id) S.cur.editing = null;
    renderSaved(); render(); persist();
    toast(`Deleted ${gone.pid}`, { label: 'Undo', fn: () => { S.saved.splice(i, 0, gone); renderSaved(); persist(); } });
  }
});
function askClear() {
  $('#clearWrap').innerHTML = `<span class="small">Delete all ${S.saved.length} saved entries?</span> <button class="btn danger" id="yesClr">Delete all</button><button class="btn ghost" id="noClr">Cancel</button>`;
  $('#noClr').onclick = resetClear;
  $('#yesClr').onclick = () => { S.saved = []; S.cur.editing = null; resetClear(); renderSaved(); render(); persist(); toast('All saved entries deleted'); };
}
function resetClear() { $('#clearWrap').innerHTML = '<button class="btn ghost danger" id="clearSaved">Delete all saved entries</button>'; $('#clearSaved').onclick = askClear; }
$('#clearSaved').onclick = askClear;

// ---------- export ----------
const HEAD = ['Participant ID', ...COLS.map(c => c[1]), 'Chair score', 'Section B score (monitor & telephone)', 'Section C score (mouse & keyboard)', 'Monitor & peripherals score', 'ROSA final score', 'Risk level', 'Saved', 'Notes'];
function rows() {
  return S.saved.map(s => {
    const r = scoreSaved(s);
    const vals = COLS.map(([k]) => (k.endsWith('Dur') ? s.durs[k] : s.scores[k]) ?? '');
    const out = r.ok ? [r.chair, r.sectionB, r.sectionC, r.pm, r.final, TIERNAME[tier(r.final)]] : ['', '', '', '', '', ''];
    const d = new Date(s.saved), p2 = n => String(n).padStart(2, '0');
    const when = `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
    return [s.pid, ...vals, ...out, when, [...r.errors, ...r.warnings].join(' | ')];
  });
}
const csvCell = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
$('#exportCsv').onclick = () => {
  if (!S.saved.length) { toast('Nothing saved yet.'); return; }
  const csv = '﻿' + [HEAD, ...rows()].map(r => r.map(csvCell).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  a.download = `ROSA_individual_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
$('#copyRows').onclick = async () => {
  if (!S.saved.length) { toast('Nothing saved yet.'); return; }
  const txt = [HEAD, ...rows()].map(r => r.join('\t')).join('\n');
  try { await navigator.clipboard.writeText(txt); toast('Copied. Paste into Excel or the batch scorer.'); }
  catch (e) { toast('Copy was blocked. Use Download CSV instead.'); }
};

// ---------- settings ----------
function renderSettings() {
  $('#cutLow').value = S.cutLow; $('#cutMed').value = S.cutMed;
  $('#medFrom').textContent = `${S.cutLow + 1} to`; $('#highFrom').textContent = `${S.cutMed + 1} to 10`;
  $$('input[name="overflow"]').forEach(i => i.checked = i.value === S.overflow);
}
function onCuts() {
  const lo = +$('#cutLow').value, md = +$('#cutMed').value;
  if (!Number.isInteger(lo) || !Number.isInteger(md) || lo < 1 || md <= lo || md > 9) { $('#tierErr').textContent = 'Low must end below Medium, and Medium must end at 9 or lower.'; return; }
  $('#tierErr').textContent = ''; S.cutLow = lo; S.cutMed = md;
  $('#medFrom').textContent = `${lo + 1} to`; $('#highFrom').textContent = `${md + 1} to 10`;
  render(); renderSaved(); persist();
}
$('#cutLow').oninput = onCuts; $('#cutMed').oninput = onCuts;
$$('input[name="overflow"]').forEach(i => i.onchange = () => { S.overflow = i.value; render(); renderSaved(); persist(); });

// ---------- toast ----------
let toastT;
function toast(msg, action) {
  const t = $('#toast'); t.innerHTML = `<span>${esc(msg)}</span>` + (action ? `<button>${esc(action.label)}</button>` : '');
  t.hidden = false; clearTimeout(toastT);
  if (action) t.querySelector('button').onclick = () => { action.fn(); t.hidden = true; };
  toastT = setTimeout(() => t.hidden = true, action ? 6000 : 2800);
}

// ---------- offline ----------
const net = () => $('#net').hidden = navigator.onLine;
addEventListener('online', net); addEventListener('offline', net); net();
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});

renderSettings(); buildForm(); renderSaved();
})();
