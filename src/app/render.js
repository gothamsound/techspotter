// DOM rendering: state in, DOM out. Script text is untrusted input, so
// everything renders via textContent — no innerHTML anywhere.

function el(tag, cls) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  return n;
}

function sp(cls, text) {
  const n = el('span', cls);
  n.textContent = text;
  return n;
}

export function render(state, act) {
  const p = state.parsed;
  document.getElementById('tools').hidden = !p;
  document.getElementById('mxWrap').hidden = !p;
  if (!p) return;
  renderRejRail(state, act, document.getElementById('rejRail'));
  renderMergeRail(state, act, document.getElementById('mergeRail'));
  renderMatrix(state, act, document.getElementById('mx'));
  renderFoot(state, document.getElementById('foot'));
}

function renderRejRail(state, act, rail) {
  const rejects = state.parsed.rejects;
  rail.hidden = !rejects.length;
  rail.textContent = '';
  if (!rejects.length) return;
  rail.append(
    sp('cw-i', '⚑'),
    sp(
      'cw-t',
      `${rejects.length} cue-shaped line${rejects.length === 1 ? '' : 's'} the gate refused — tap to add as a character, × to dismiss`,
    ),
  );
  for (const r of rejects) {
    const pair = el('span', 'rj-pair');
    const chip = el('button', 'cw-chip');
    chip.textContent = `+ ${r.name}`;
    const note = el('i');
    note.textContent =
      r.reason + (r.occurrences.length > 1 ? ` ·×${r.occurrences.length}` : '');
    chip.append(note);
    chip.title = `Add ${r.name} to the matrix (scenes mark from its occurrences plus text search)`;
    chip.onclick = () => act.promote(r.name);
    const x = el('button', 'cw-x');
    x.textContent = '×';
    x.title = 'Dismiss — this line is junk';
    x.onclick = () => act.dismissReject(r.name, r.reason);
    pair.append(chip, x);
    rail.append(pair);
  }
}

function renderMergeRail(state, act, rail) {
  const offers = state.parsed.merge_offers;
  rail.hidden = !offers.length;
  rail.textContent = '';
  if (!offers.length) return;
  rail.append(
    sp('cw-i', '⇄'),
    sp('cw-t', 'same person? merge is two-tap (a wrong merge drops a performer) — × keeps them separate'),
  );
  for (const o of offers) {
    const chip = el('span', 'cw-chip mrg-chip');
    const v = el('b');
    v.textContent = o.variant;
    const c = el('b');
    c.textContent = o.canonical;
    chip.append(v, document.createTextNode(' → '), c);
    chip.title = `${o.canonical} is used in more scenes and stays as the column name`;
    const ok = el('button', 'cw-x mrgok');
    const armed =
      state.armed?.kind === 'merge' &&
      state.armed.key === `${o.variant}→${o.canonical}`;
    ok.textContent = armed ? 'confirm merge' : '⇄ merge';
    if (armed) ok.classList.add('armed');
    ok.onclick = () => act.merge(o.variant, o.canonical);
    const x = el('button', 'cw-x');
    x.textContent = '× separate';
    x.title = 'Different people — dismiss this suggestion';
    x.onclick = () => act.dismissOffer(o.variant, o.canonical);
    rail.append(chip, ok, x);
  }
}

function renderMatrix(state, act, table) {
  const p = state.parsed;
  table.textContent = '';
  const q = state.search.trim().toUpperCase();
  const chars = state.view.chars ? p.characters : [];
  const adding = state.bar?.mode === 'add' ? state.bar : null;

  const thead = el('thead');
  const trh = el('tr');
  const scnh = el('th', 'scnh');
  scnh.textContent = `SCENES (${p.scenes.length})`;
  trh.append(scnh);
  if (adding) {
    const th = el('th', 'pend-h');
    const rot = el('span', 'rot');
    rot.textContent = adding.name || 'NEW CHARACTER…';
    th.append(rot);
    trh.append(th);
  }
  for (const c of chars) {
    // the rotated label has a width-0 box (that is the column-width trick),
    // so the whole header cell is the click target, not the label
    const th = el('th', 'chh');
    th.title = `${c.name} — ${c.scene_count} scene${c.scene_count === 1 ? '' : 's'}. Click to rename; × to delete.`;
    th.onclick = () => act.startRename(c.name);
    const rot = el('span', 'rot');
    rot.textContent = c.name;
    const dx = el('button', 'delx');
    dx.textContent = '×';
    const armed = state.armed?.kind === 'delchar' && state.armed.key === c.name;
    if (armed) dx.classList.add('armed');
    dx.title = armed ? `Click again to delete ${c.name}` : `Delete ${c.name} (two-step)`;
    dx.onclick = (e) => {
      e.stopPropagation();
      act.deleteChar(c.name);
    };
    th.append(rot, dx);
    trh.append(th);
  }
  thead.append(trh);
  table.append(thead);

  const tbody = el('tbody');
  for (const scene of p.scenes) {
    const tr = el('tr');
    if (q && !sceneMatches(scene, q)) tr.classList.add('dim');
    const scn = el('td', 'scn');
    const s = el('div', 's');
    s.textContent = `#${scene.id} · pg ${scene.page}`;
    const sl = el('div', 'sl');
    sl.textContent = scene.heading;
    sl.title = scene.heading;
    scn.append(s, sl);
    tr.append(scn);
    if (adding) {
      const td = el('td', 'cell pend');
      if (adding.ids.has(scene.id)) td.classList.add('on');
      td.append(el('div', 'd'));
      td.onclick = () => act.togglePending(scene.id);
      tr.append(td);
    }
    for (const c of chars) {
      const td = el('td', 'cell');
      if (scene.characters_speaking.includes(c.name)) td.classList.add('on');
      td.append(el('div', 'd'));
      td.title = `${c.name} · scene ${scene.id}`;
      td.onclick = () => act.toggleCell(scene.id, c.name);
      tr.append(td);
    }
    tbody.append(tr);
  }
  table.append(tbody);
}

function sceneMatches(scene, q) {
  return (
    scene.id.toUpperCase().includes(q) ||
    scene.heading.toUpperCase().includes(q) ||
    scene.characters_speaking.some((n) => n.includes(q))
  );
}

function renderFoot(state, foot) {
  const p = state.parsed;
  foot.textContent = '';
  const stat = (label, value) => {
    const s = el('span');
    const b = el('b');
    b.textContent = String(value);
    s.append(b, document.createTextNode(` ${label}`));
    return s;
  };
  foot.append(
    stat('scenes', p.scenes.length),
    stat('characters', p.characters.length),
    stat('mode', ''),
  );
  foot.lastChild.querySelector('b').textContent = p.mode;
  if (p.rejects.length) foot.append(stat('reject chips to review', p.rejects.length));
  if (p.merge_offers.length) foot.append(stat('merge offers open', p.merge_offers.length));
}
