/* ROSA scoring engine — pure functions, no DOM.
   Source: ROSA worksheet & scoring instructions (Sonne, Villalta & Andrews, 2012),
   "ROSA forms.pdf" pages 1–2, as supplied by the assessor. */
const ROSA = (() => {
  // ---- Lookup charts, transcribed from ROSA forms.pdf p.2 ----
  const TABLES = {
    A: { // rows: seat pan height + depth (2–8); cols: armrest + back support (2–9)
      name: 'Section A (Chair)', rowLabel: 'Seat pan height + depth', colLabel: 'Armrest + back support',
      rows: [2,3,4,5,6,7,8], cols: [2,3,4,5,6,7,8,9],
      cells: [
        [2,2,3,4,5,6,7,8],
        [2,2,3,4,5,6,7,8],
        [3,3,3,4,5,6,7,8],
        [4,4,4,4,5,6,7,8],
        [5,5,5,5,6,7,8,9],
        [6,6,6,7,7,8,8,9],
        [7,7,7,8,8,9,9,9]]
    },
    B: { // rows: phone + duration (0–6); cols: monitor + duration (0–7)
      name: 'Section B (Monitor & Telephone)', rowLabel: 'Phone + duration', colLabel: 'Monitor + duration',
      rows: [0,1,2,3,4,5,6], cols: [0,1,2,3,4,5,6,7],
      cells: [
        [1,1,1,2,3,4,5,6],
        [1,1,2,2,3,4,5,6],
        [1,2,2,3,3,4,6,7],
        [2,2,3,3,4,5,6,8],
        [3,3,4,4,5,6,7,8],
        [4,4,5,5,6,7,8,9],
        [5,5,6,7,8,8,9,9]]
    },
    C: { // rows: mouse + duration (0–7); cols: keyboard + duration (0–7)
      name: 'Section C (Mouse & Keyboard)', rowLabel: 'Mouse + duration', colLabel: 'Keyboard + duration',
      rows: [0,1,2,3,4,5,6,7], cols: [0,1,2,3,4,5,6,7],
      cells: [
        [1,1,1,2,3,4,5,6],
        [1,1,2,3,4,5,6,7],
        [1,2,2,3,4,5,6,7],
        [2,3,3,3,5,6,7,8],
        [3,4,4,5,5,6,7,8],
        [4,5,5,6,6,7,8,9],
        [5,6,6,7,7,8,8,9],
        [6,7,7,8,8,9,9,9]]
    },
    PM: { // rows: Section B (1–9); cols: Section C (1–9)
      name: 'Monitor & Peripherals', rowLabel: 'Monitor & Telephone (Section B)', colLabel: 'Mouse & Keyboard (Section C)',
      rows: [1,2,3,4,5,6,7,8,9], cols: [1,2,3,4,5,6,7,8,9],
      cells: [
        [1,2,3,4,5,6,7,8,9],
        [2,2,3,4,5,6,7,8,9],
        [3,3,3,4,5,6,7,8,9],
        [4,4,4,4,5,6,7,8,9],
        [5,5,5,5,5,6,7,8,9],
        [6,6,6,6,6,6,7,8,9],
        [7,7,7,7,7,7,7,8,9],
        [8,8,8,8,8,8,8,8,9],
        [9,9,9,9,9,9,9,9,9]]
    },
    FINAL: { // rows: Chair score (1–10); cols: Monitor & Peripherals (1–10)
      name: 'ROSA Final Score', rowLabel: 'Chair (Section A + duration)', colLabel: 'Peripherals & Monitor',
      rows: [1,2,3,4,5,6,7,8,9,10], cols: [1,2,3,4,5,6,7,8,9,10],
      cells: [
        [1,2,3,4,5,6,7,8,9,10],
        [2,2,3,4,5,6,7,8,9,10],
        [3,3,3,4,5,6,7,8,9,10],
        [4,4,4,4,5,6,7,8,9,10],
        [5,5,5,5,5,6,7,8,9,10],
        [6,6,6,6,6,6,7,8,9,10],
        [7,7,7,7,7,7,7,8,9,10],
        [8,8,8,8,8,8,8,8,9,10],
        [9,9,9,9,9,9,9,9,9,10],
        [10,10,10,10,10,10,10,10,10,10]]
    }
  };

  // ---- Worksheet items (p.1). base = pick one; add = tick any ----
  const AREAS = {
    chairHeight: { label: 'Chair height', section: 'A', base: [
        ['knees90', 'Knees at 90°', 1], ['tooLow', 'Too low — knee angle < 90°', 2],
        ['tooHigh', 'Too high — knee angle > 90°', 2], ['noFoot', 'No foot contact on ground', 3]],
      add: [['space', 'Insufficient space under desk — can’t cross legs', 1], ['nonAdj', 'Non-adjustable', 1]] },
    panDepth: { label: 'Pan depth', section: 'A', base: [
        ['ok', 'About 3 in (≈8 cm) between knee and seat edge', 1], ['long', 'Too long — less than 3 in of space', 2],
        ['short', 'Too short — more than 3 in of space', 2]],
      add: [['nonAdj', 'Non-adjustable', 1]] },
    armrests: { label: 'Armrests', section: 'A', base: [
        ['ok', 'Elbows supported in line with shoulder, shoulders relaxed', 1],
        ['bad', 'Too high (shoulders shrugged) / too low (arms unsupported)', 2]],
      add: [['hard', 'Hard or damaged surface', 1], ['wide', 'Too wide', 1], ['nonAdj', 'Non-adjustable', 1]] },
    backSupport: { label: 'Back support', section: 'A', base: [
        ['ok', 'Adequate lumbar support — reclined 95°–110°', 1],
        ['noLumbar', 'No lumbar support, or not in small of back', 2],
        ['angle', 'Angled too far back (>110°) or too far forward (<95°)', 2],
        ['none', 'No back support (e.g. stool) or worker leaning forward', 2]],
      add: [['surface', 'Work surface too high (shoulders shrugged)', 1], ['nonAdj', 'Back rest non-adjustable', 1]] },
    monitor: { label: 'Monitor', section: 'B', base: [
        ['ok', 'Arm’s length (40–75 cm), screen at eye level', 1], ['low', 'Too low (below 30°)', 2],
        ['high', 'Too high (neck extension)', 3]],
      add: [['far', 'Too far', 1], ['twist', 'Neck twist greater than 30°', 1], ['glare', 'Glare on screen', 1],
        ['docs', 'Documents — no holder', 1]] },
    phone: { label: 'Telephone', section: 'B', base: [
        ['ok', 'Headset / one hand on phone, neutral neck', 1], ['far', 'Too far of reach (outside 30 cm)', 2]],
      add: [['neck', 'Neck and shoulder hold', 2], ['handsFree', 'No hands-free options', 1]] },
    mouse: { label: 'Mouse', section: 'C', base: [
        ['ok', 'Mouse in line with shoulder', 1], ['reach', 'Reaching to mouse', 2]],
      add: [['surfaces', 'Mouse and keyboard on different surfaces', 2], ['pinch', 'Pinch grip on mouse', 1],
        ['palm', 'Palmrest in front of mouse', 1]] },
    keyboard: { label: 'Keyboard', section: 'C', base: [
        ['ok', 'Wrists straight, shoulders relaxed', 1], ['ext', 'Wrists extended / keyboard angle > 15°', 2]],
      add: [['dev', 'Deviation while typing', 1], ['high', 'Keyboard too high — shoulders shrugged', 1],
        ['overhead', 'Reaching to overhead items', 1], ['platform', 'Platform non-adjustable', 1]] }
  };
  // Valid area-score ranges implied by the worksheet (min base .. max base + all add-ons)
  const RANGE = {};
  for (const [k, a] of Object.entries(AREAS)) {
    const bases = a.base.map(b => b[2]);
    RANGE[k] = [Math.min(...bases), Math.max(...bases) + a.add.reduce((s, x) => s + x[2], 0)];
  }
  const DUR_KEYS = ['chairDur', 'monitorDur', 'phoneDur', 'mouseDur', 'keyboardDur'];
  const DURATION = [
    [-1, 'Less than 30 min continuously, or less than 1 h per day'],
    [0, '30 min – 1 h continuously, or 1–4 h per day'],
    [1, 'More than 1 h continuously, or more than 4 h per day']];

  function areaScore(key, obs) {
    const a = AREAS[key];
    if (!obs || !obs.base) return null;
    const b = a.base.find(x => x[0] === obs.base);
    if (!b) return null;
    return b[2] + (obs.add || []).reduce((s, id) => {
      const x = a.add.find(y => y[0] === id); return s + (x ? x[2] : 0);
    }, 0);
  }

  function lookup(tKey, row, col, opts) {
    const t = TABLES[tKey];
    let r = row, c = col, capped = false;
    const ri0 = t.rows.indexOf(r), ci0 = t.cols.indexOf(c);
    if (ri0 < 0 || ci0 < 0) {
      if (!opts.capOverflow) {
        return { error: `${t.name}: ${ri0 < 0 ? t.rowLabel + ' = ' + r : ''}${ri0 < 0 && ci0 < 0 ? ' and ' : ''}${ci0 < 0 ? t.colLabel + ' = ' + c : ''} is outside the chart (${t.rowLabel} ${t.rows[0]}–${t.rows.at(-1)}, ${t.colLabel} ${t.cols[0]}–${t.cols.at(-1)}).` };
      }
      r = Math.min(Math.max(r, t.rows[0]), t.rows.at(-1));
      c = Math.min(Math.max(c, t.cols[0]), t.cols.at(-1));
      capped = true;
    }
    const ri = t.rows.indexOf(r), ci = t.cols.indexOf(c);
    return { value: t.cells[ri][ci], row: r, col: c, ri, ci, capped, rawRow: row, rawCol: col };
  }

  /* input: { chairHeight, panDepth, armrests, backSupport, monitor, phone, mouse, keyboard (area scores),
              chairDur, monitorDur, phoneDur, mouseDur, keyboardDur (-1|0|1) }
     opts:  { capOverflow: false } */
  function calculate(input, opts = {}) {
    const errors = [], warnings = [], trace = [];
    const v = {};
    for (const k of Object.keys(AREAS)) {
      const x = input[k];
      if (x === null || x === undefined || x === '' || Number.isNaN(Number(x))) { errors.push(`${AREAS[k].label}: missing`); continue; }
      const n = Number(x);
      if (!Number.isInteger(n) || n < RANGE[k][0] || n > RANGE[k][1]) {
        errors.push(`${AREAS[k].label}: ${x} is not possible on the worksheet (valid ${RANGE[k][0]}–${RANGE[k][1]})`); continue;
      }
      v[k] = n;
    }
    const durLabels = { chairDur: 'Chair duration', monitorDur: 'Monitor duration', phoneDur: 'Telephone duration', mouseDur: 'Mouse duration', keyboardDur: 'Keyboard duration' };
    for (const k of DUR_KEYS) {
      const x = input[k];
      if (x === null || x === undefined || x === '' || Number.isNaN(Number(x))) { errors.push(`${durLabels[k]}: missing`); continue; }
      const n = Number(x);
      if (![-1, 0, 1].includes(n)) { errors.push(`${durLabels[k]}: ${x} must be −1, 0 or +1`); continue; }
      v[k] = n;
    }
    const res = { ok: false, errors, warnings, trace, values: v };
    if (errors.length) return res;

    const step = (o) => { trace.push(o); return o; };
    const look = (t, r, c, label) => {
      const l = lookup(t, r, c, opts);
      if (l.error) { errors.push(l.error); return null; }
      if (l.capped) warnings.push(`${TABLES[t].name}: (${r}, ${c}) is beyond the chart; the edge cell (${l.row}, ${l.col}) was used. Report this as a capped value.`);
      step({ kind: 'lookup', table: t, label, ...l });
      return l.value;
    };

    const aV = v.chairHeight + v.panDepth;
    const aH = v.armrests + v.backSupport;
    step({ kind: 'sum', label: 'Section A vertical axis', expr: `Chair height ${v.chairHeight} + Pan depth ${v.panDepth}`, value: aV });
    step({ kind: 'sum', label: 'Section A horizontal axis', expr: `Armrests ${v.armrests} + Back support ${v.backSupport}`, value: aH });
    const tA = look('A', aV, aH, 'Section A chart'); if (tA === null) return res;
    const chair = tA + v.chairDur;
    step({ kind: 'sum', label: 'Chair score', expr: `Chart A ${tA} + duration ${fmt(v.chairDur)}`, value: chair });

    const bH = v.monitor + v.monitorDur, bV = v.phone + v.phoneDur;
    step({ kind: 'sum', label: 'Section B horizontal axis', expr: `Monitor ${v.monitor} + duration ${fmt(v.monitorDur)}`, value: bH });
    step({ kind: 'sum', label: 'Section B vertical axis', expr: `Telephone ${v.phone} + duration ${fmt(v.phoneDur)}`, value: bV });
    const sB = look('B', bV, bH, 'Section B chart'); if (sB === null) return res;

    const cH = v.keyboard + v.keyboardDur, cV = v.mouse + v.mouseDur;
    step({ kind: 'sum', label: 'Section C horizontal axis', expr: `Keyboard ${v.keyboard} + duration ${fmt(v.keyboardDur)}`, value: cH });
    step({ kind: 'sum', label: 'Section C vertical axis', expr: `Mouse ${v.mouse} + duration ${fmt(v.mouseDur)}`, value: cV });
    const sC = look('C', cV, cH, 'Section C chart'); if (sC === null) return res;

    const pm = look('PM', sB, sC, 'Monitor & Peripherals chart'); if (pm === null) return res;
    const fin = look('FINAL', chair, pm, 'Final chart'); if (fin === null) return res;

    Object.assign(res, { ok: true, aV, aH, tableA: tA, chair, bH, bV, sectionB: sB, cH, cV, sectionC: sC, pm, final: fin,
      capped: warnings.length > 0 });
    return res;
  }

  function fromObservations(obs) { // obs: {chairHeight:{base,add}, ... , chairDur: n ...}
    const input = {};
    for (const k of Object.keys(AREAS)) input[k] = areaScore(k, obs[k]);
    for (const k of DUR_KEYS) input[k] = obs[k];
    return input;
  }

  function fmt(n) { return n > 0 ? '+' + n : n < 0 ? '−' + Math.abs(n) : '0'; }

  return { TABLES, AREAS, RANGE, DUR_KEYS, DURATION, areaScore, lookup, calculate, fromObservations, fmt };
})();
if (typeof module !== 'undefined') module.exports = ROSA;
