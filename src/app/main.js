// App wiring: ingest, state, actions, the add/rename bar, view toggles,
// text-size stepper. All state lives in memory; localStorage holds UI
// prefs only (text size), never script text.

import { parseShow, ParseError } from '../parser/parse.js';
import {
  addCharacter,
  promoteReject,
  dismissReject,
  cycleCell,
  renameCharacter,
  deleteCharacter,
  mergeCharacters,
  dismissOffer,
  textSearchScenes,
} from '../parser/edits.js';
import { openAndExtract } from './pdftext.js';
import { spotShow } from '../spot/index.js';
import { renderPeek } from './peek.js';
import { render } from './render.js';

const $ = (id) => document.getElementById(id);

const state = {
  parsed: null,
  spot: null,
  pdfDoc: null,
  search: '',
  view: { chars: true, sound: true, video: true },
  // bar: {mode:'add', name, ids:Set, dirty} | {mode:'rename', target, name}
  bar: null,
  armed: null, // two-tap tracking {kind, key, timer}
  openMoments: null, // {sceneId, layer}
};

function rerender() {
  render(state, act);
  syncBar();
}

function disarm() {
  if (state.armed) {
    clearTimeout(state.armed.timer);
    state.armed = null;
  }
}

// Delete and merge are the expensive mistakes: first tap arms (red),
// second tap within 3.5 s commits, anything else disarms.
function twoTap(kind, key, commit) {
  if (state.armed?.kind === kind && state.armed.key === key) {
    disarm();
    commit();
  } else {
    disarm();
    state.armed = {
      kind,
      key,
      timer: setTimeout(() => {
        state.armed = null;
        rerender();
      }, 3500),
    };
  }
  rerender();
}

const act = {
  toggleCell(sceneId, name) {
    disarm();
    cycleCell(state.parsed, sceneId, name);
    rerender();
  },
  togglePending(sceneId) {
    const bar = state.bar;
    if (!bar || bar.mode !== 'add') return;
    bar.dirty = true;
    if (bar.ids.has(sceneId)) bar.ids.delete(sceneId);
    else bar.ids.add(sceneId);
    rerender();
  },
  promote(name) {
    disarm();
    promoteReject(state.parsed, name);
    rerender();
  },
  dismissReject(name, reason) {
    disarm();
    dismissReject(state.parsed, name, reason);
    rerender();
  },
  merge(variant, canonical) {
    twoTap('merge', `${variant}→${canonical}`, () =>
      mergeCharacters(state.parsed, variant, canonical),
    );
  },
  dismissOffer(variant, canonical) {
    disarm();
    dismissOffer(state.parsed, variant, canonical);
    rerender();
  },
  deleteChar(name) {
    twoTap('delchar', name, () => deleteCharacter(state.parsed, name));
  },
  startRename(name) {
    disarm();
    state.bar = { mode: 'rename', target: name, name };
    rerender();
    $('abName').value = name;
    $('abName').focus();
    $('abName').select();
  },
  convertTextChannel(name) {
    twoTap('convtext', name, () => deleteCharacter(state.parsed, name));
  },
  keepTextChannel(name) {
    disarm();
    state.parsed.text_channel_kept ??= [];
    state.parsed.text_channel_kept.push(name);
    rerender();
  },
  toggleMoments(sceneId, layer) {
    disarm();
    const same =
      state.openMoments?.sceneId === sceneId && state.openMoments?.layer === layer;
    state.openMoments = same ? null : { sceneId, layer };
    rerender();
  },
  dismissMoment(moment) {
    moment.dismissed = !moment.dismissed;
    rerender();
  },
  async peekShow(evt, anchor, caption) {
    if (!state.pdfDoc || !anchor) return;
    const pk = $('peek');
    const token = (pk.dataset.token = String(Math.random()));
    $('peekCap').textContent = `${caption} — rendering…`;
    $('peekImg').removeAttribute('src');
    pk.hidden = false;
    positionPeek(pk, evt);
    try {
      const url = await renderPeek(state.pdfDoc, anchor);
      if (pk.dataset.token !== token || pk.hidden) return;
      $('peekImg').src = url;
      $('peekCap').textContent = caption;
      positionPeek(pk, evt);
    } catch {
      if (pk.dataset.token === token) {
        $('peekCap').textContent = `${caption} — could not render this region`;
      }
    }
  },
  peekHide() {
    $('peek').hidden = true;
  },
};

function positionPeek(pk, evt) {
  const pad = 16;
  const w = pk.offsetWidth || 480;
  const h = pk.offsetHeight || 160;
  let x = evt.clientX + pad;
  let y = evt.clientY + pad;
  if (x + w > window.innerWidth - pad) x = Math.max(pad, evt.clientX - w - pad);
  if (y + h > window.innerHeight - pad) y = Math.max(pad, evt.clientY - h - pad);
  pk.style.left = `${x}px`;
  pk.style.top = `${y}px`;
}

/* ---- add / rename bar ---- */

function openAddBar() {
  disarm();
  state.bar = { mode: 'add', name: '', ids: new Set(), dirty: false };
  rerender();
  $('abName').value = '';
  $('abName').focus();
}

function closeBar() {
  state.bar = null;
  $('abErr').textContent = '';
  rerender();
}

function syncBar() {
  const bar = state.bar;
  $('addBar').hidden = !bar;
  if (!bar) return;
  $('abIcon').textContent = bar.mode === 'add' ? '+' : '✎';
  $('abHint').textContent =
    bar.mode === 'add'
      ? 'scenes auto-mark by text search — tap cells in the amber column to adjust, then Save'
      : `renaming ${bar.target} — Enter saves, Esc cancels`;
  $('abSave').textContent = bar.mode === 'add' ? 'Save character' : 'Rename';
  $('abSave').disabled = !bar.name.trim();
}

function saveBar() {
  const bar = state.bar;
  if (!bar || !bar.name.trim()) return;
  const name = bar.name.trim().toUpperCase();
  try {
    if (bar.mode === 'add') {
      if (state.parsed.characters.some((c) => c.name === name)) {
        throw new Error(`${name} is already a column.`);
      }
      addCharacter(state.parsed, name, [...bar.ids]);
    } else {
      renameCharacter(state.parsed, bar.target, name);
    }
    closeBar();
  } catch (e) {
    $('abErr').textContent = e.message;
  }
}

$('addCharBtn').onclick = () => (state.bar?.mode === 'add' ? closeBar() : openAddBar());
$('abSave').onclick = saveBar;
$('abCancel').onclick = closeBar;
$('abName').addEventListener('input', () => {
  const bar = state.bar;
  if (!bar) return;
  bar.name = $('abName').value.toUpperCase();
  $('abErr').textContent = '';
  if (bar.mode === 'add' && !bar.dirty) {
    bar.ids = new Set(
      bar.name.trim() ? textSearchScenes(state.parsed, bar.name) : [],
    );
  }
  rerender();
});
$('abName').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveBar();
  if (e.key === 'Escape') closeBar();
});

/* ---- search + view toggles ---- */

$('search').addEventListener('input', () => {
  state.search = $('search').value;
  rerender();
});
$('vChars').addEventListener('change', () => {
  state.view.chars = $('vChars').checked;
  rerender();
});
for (const [id, key] of [['vSound', 'sound'], ['vVideo', 'video']]) {
  $(id).addEventListener('change', () => {
    state.view[key] = $(id).checked;
    if (!state.view[key] && state.openMoments?.layer === key) state.openMoments = null;
    rerender();
  });
}

/* ---- ingest ---- */

function setBar(frac) {
  $('dzBar').style.width = `${Math.round(frac * 100)}%`;
}

async function loadPdf(bytes, label) {
  $('errBar').hidden = true;
  const dz = $('dropzone');
  dz.classList.add('busy');
  $('dzProgress').hidden = false;
  setBar(0);
  let doc = null;
  try {
    let pages;
    ({ doc, pages } = await openAndExtract(bytes, (p, n) => setBar(p / n)));
    const parsed = parseShow(pages);
    await state.pdfDoc?.destroy();
    state.pdfDoc = doc;
    state.parsed = parsed;
    state.spot = spotShow(parsed, { sourceDoc: label });
    state.openMoments = null;
    state.bar = null;
    state.search = '';
    $('search').value = '';
    $('dzTitle').textContent = `Loaded: ${label} — ${pages.length} page${pages.length === 1 ? '' : 's'}, ${parsed.scenes.length} scenes`;
    rerender();
  } catch (e) {
    if (doc && doc !== state.pdfDoc) await doc.destroy().catch(() => {});
    const msg =
      e instanceof ParseError ? e.message : `Could not read this PDF. ${e.message || e}`;
    $('errBar').textContent = msg;
    $('errBar').hidden = false;
  } finally {
    dz.classList.remove('busy');
    $('dzProgress').hidden = true;
  }
}

async function loadFile(file) {
  if (!file) return;
  if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
    $('errBar').textContent = `${file.name} is not a PDF. Drop the screenplay PDF here.`;
    $('errBar').hidden = false;
    return;
  }
  loadPdf(new Uint8Array(await file.arrayBuffer()), file.name);
}

const dz = $('dropzone');
dz.addEventListener('click', () => $('fileInput').click());
$('ingestBtn').addEventListener('click', (e) => {
  e.stopPropagation();
  $('fileInput').click();
});
$('fileInput').addEventListener('change', () => {
  loadFile($('fileInput').files[0]);
  $('fileInput').value = '';
});
dz.addEventListener('dragover', (e) => {
  e.preventDefault();
  dz.classList.add('over');
});
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', (e) => {
  e.preventDefault();
  dz.classList.remove('over');
  loadFile(e.dataTransfer.files[0]);
});

/* ---- text-size stepper (localStorage: UI pref only) ---- */

const FS_STEPS = [0.85, 1, 1.15, 1.3, 1.5];
let fsIdx = Number(localStorage.getItem('ts-fs-idx') ?? 1);
if (!(fsIdx >= 0 && fsIdx < FS_STEPS.length)) fsIdx = 1;

function applyFs() {
  document.documentElement.style.setProperty('--fs-scale', FS_STEPS[fsIdx]);
  $('fsPct').textContent = `${Math.round(FS_STEPS[fsIdx] * 100)}%`;
  localStorage.setItem('ts-fs-idx', String(fsIdx));
}
$('fsMinus').onclick = () => {
  fsIdx = Math.max(0, fsIdx - 1);
  applyFs();
};
$('fsPlus').onclick = () => {
  fsIdx = Math.min(FS_STEPS.length - 1, fsIdx + 1);
  applyFs();
};
applyFs();

/* ---- synthetic demo (#demo): the full real pipeline over a generated
   PDF — no screenplay text anywhere near this ---- */

if (location.hash === '#demo') {
  const { demoPdf } = await import('./demo.js');
  $('demoBadge').hidden = false;
  loadPdf(demoPdf(), 'synthetic demo');
}
