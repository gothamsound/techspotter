// Sound department detectors (brief §4): playback, phone, sfx-reaction.
// Recall-biased with structural noise control: lyrics coalesce to one
// moment per block (Peter's ruling), and a line claimed by playback or
// phone is not re-flagged as sfx (priority: playback > phone > sfx).

import {
  PLAYBACK_ACTION,
  SINGING_PAREN,
  PHONE_TRIGGERS,
  CALLS_NAME,
  CALLS_NAME_STOP,
  PHONE_PAREN,
  FAR_END_CUE,
  SFX_NOUNS,
  REACTION_VERBS,
  CAPS_IGNORE,
} from './lexicon.js';
import {
  lineAnchor,
  blockAnchor,
  snippetAt,
  characterNames,
  namesOnLine,
  makeMoment,
} from './util.js';

export function spotSound(parsed, opts = {}) {
  const names = characterNames(parsed);
  const moments = [];
  for (const scene of parsed.scenes) {
    const claimed = new Set();
    spotPlayback(scene, names, claimed, moments, opts);
    spotPhone(scene, names, claimed, moments, opts);
    spotSfx(scene, names, claimed, moments, opts);
  }
  return { moments };
}

/* ---- playback ---- */

const LYRIC_SIGNALS = [
  { key: 'paren', trigger: '(singing)', confidence: 'high' },
  { key: 'italic', trigger: 'italic lyrics', confidence: 'medium' },
  { key: 'quoted', trigger: 'quoted lyrics', confidence: 'medium' },
  { key: 'shape', trigger: 'verse shape', confidence: 'low' },
];

function spotPlayback(scene, names, claimed, moments, opts) {
  // Action-line lexicon hits: one moment per matched line.
  scene.lines.forEach((rec, i) => {
    if (rec.band !== 'action') return;
    for (const t of PLAYBACK_ACTION) {
      const m = rec.text.match(t.re);
      if (!m) continue;
      claimed.add(i);
      moments.push(
        makeMoment(scene, 'playback', {
          snippet: snippetAt(scene, i),
          page: rec.page,
          characters: namesOnLine(rec.text, names),
          trigger: m[0].toLowerCase(),
          confidence: 'high',
          anchor: lineAnchor(rec, opts.sourceDoc),
        }),
      );
      break;
    }
  });

  // Lyrics blocks over dialogue lines: four signals, coalesced (ruling).
  const flags = scene.lines.map(() => new Set());
  let singing = false;
  scene.lines.forEach((rec, i) => {
    if (rec.band === 'paren') {
      if (SINGING_PAREN.test(rec.text.trim())) {
        singing = true;
        flags[i].add('paren');
      }
      return;
    }
    if (rec.band !== 'dialogue') {
      singing = false;
      return;
    }
    const t = rec.text.trim();
    if (singing) flags[i].add('paren');
    if (rec.altFont) flags[i].add('italic');
    if (/^["'“‘]/.test(t)) flags[i].add('quoted-candidate');
    if (t.length <= 32 && !/[.?!:;]$/.test(t)) flags[i].add('shape-candidate');
  });
  promoteRuns(scene.lines, flags, 'quoted-candidate', 'quoted', 2);
  promoteRuns(scene.lines, flags, 'shape-candidate', 'shape', 3);

  // Coalesce contiguous flagged dialogue/paren lines into one moment.
  let block = [];
  const flush = () => {
    if (!block.length) return;
    const recs = block.map(({ rec }) => rec);
    const sigs = new Set(block.flatMap(({ f }) => [...f]));
    const strongest = LYRIC_SIGNALS.find((s) => sigs.has(s.key));
    const { anchor, line_anchors } = blockAnchor(recs, opts.sourceDoc);
    block.forEach(({ i }) => claimed.add(i));
    moments.push(
      makeMoment(scene, 'playback', {
        snippet: recs.map((r) => r.text.trim()).join('\n').slice(0, 240),
        page: recs[0].page,
        characters: [...new Set(recs.map((r) => r.speaker).filter(Boolean))],
        trigger: strongest.trigger,
        confidence: strongest.confidence,
        anchor,
        line_anchors,
      }),
    );
    block = [];
  };
  scene.lines.forEach((rec, i) => {
    const active = [...flags[i]].some((f) =>
      ['paren', 'italic', 'quoted', 'shape'].includes(f),
    );
    if (active) block.push({ rec, i, f: flags[i] });
    else if (rec.band !== 'paren') flush();
  });
  flush();
}

function promoteRuns(lines, flags, candidate, promoted, minRun) {
  let run = [];
  const commit = () => {
    if (run.length >= minRun) run.forEach((i) => flags[i].add(promoted));
    run = [];
  };
  lines.forEach((rec, i) => {
    if (flags[i].has(candidate)) run.push(i);
    else if (rec.band === 'dialogue') commit();
    else if (rec.band !== 'paren') commit();
  });
  commit();
}

/* ---- phone ---- */

function spotPhone(scene, names, claimed, moments, opts) {
  const sceneMoments = [];
  scene.lines.forEach((rec, i) => {
    if (claimed.has(i)) return;
    const isParen = rec.band === 'paren';
    if (isParen) {
      if (!PHONE_PAREN.test(rec.text.trim())) return;
      claimed.add(i);
      sceneMoments.push(
        makeMoment(scene, 'phone', {
          snippet: snippetAt(scene, i),
          page: rec.page,
          characters: rec.speaker ? [rec.speaker] : [],
          trigger: rec.text.trim().toLowerCase(),
          confidence: 'high',
          anchor: lineAnchor(rec, opts.sourceDoc),
        }),
      );
      return;
    }
    if (rec.band === 'dialogue' || rec.band === 'cue') return;

    let trigger = null;
    for (const t of PHONE_TRIGGERS) {
      if (t.re.test(rec.text)) {
        trigger = t.name;
        break;
      }
    }
    const chars = new Set(namesOnLine(rec.text, names));
    const callm = rec.text.match(CALLS_NAME);
    if (callm) {
      const called = callm[1].toUpperCase().trim();
      if (!CALLS_NAME_STOP.has(called)) {
        trigger ??= `calls ${called}`;
        if (names.has(called)) chars.add(called);
      }
    }
    if (!trigger) return;
    claimed.add(i);
    sceneMoments.push(
      makeMoment(scene, 'phone', {
        snippet: snippetAt(scene, i),
        page: rec.page,
        characters: [...chars],
        trigger,
        confidence: 'high',
        anchor: lineAnchor(rec, opts.sourceDoc),
      }),
    );
  });

  // Far-end attribution (ruling): printed channel-variant cue lines in a
  // phone scene attach as printed — the annotation IS the far-end marker.
  if (sceneMoments.length) {
    const farEnds = scene.lines
      .filter((r) => (r.band === 'cue' || r.band === 'rejected-cue') && FAR_END_CUE.test(r.text))
      .map((r) => r.text.trim());
    for (const m of sceneMoments) {
      for (const fe of farEnds) {
        if (!m.characters.includes(fe)) m.characters.push(fe);
      }
    }
  }
  moments.push(...sceneMoments);
}

/* ---- sfx-reaction ---- */

function spotSfx(scene, names, claimed, moments, opts) {
  scene.lines.forEach((rec, i) => {
    if (rec.band !== 'action' || claimed.has(i)) return;
    const noun = rec.text.match(SFX_NOUNS);
    const caps = capsRuns(rec, names);
    if (!noun && !caps.length) return;
    const next = scene.lines[i + 1];
    const reacts =
      REACTION_VERBS.test(rec.text) || (next && REACTION_VERBS.test(next.text));
    const confidence = noun ? (reacts ? 'high' : 'medium') : reacts ? 'medium' : 'low';
    moments.push(
      makeMoment(scene, 'sfx-reaction', {
        snippet: snippetAt(scene, i),
        page: rec.page,
        characters: namesOnLine(rec.text, names),
        trigger: noun ? noun[0].toLowerCase() : caps[0],
        confidence,
        anchor: lineAnchor(rec, opts.sourceDoc),
      }),
    );
  });
}

// The caps convention (brief §4.3): all-caps runs inside MIXED-case action
// sentences, excluding character names, slugs, and known abbreviations.
const CAPS_RUN = /(?<![A-Za-z])([A-Z][A-Z'.\-]+(?:\s+[A-Z][A-Z'.\-]+)*)(?![a-z])/g;

function capsRuns(rec, names) {
  const text = rec.text;
  if (text === text.toUpperCase()) return [];
  const runs = [];
  for (const m of text.matchAll(CAPS_RUN)) {
    const run = m[1].trim();
    if (CAPS_IGNORE.has(run)) continue;
    if (names.has(run)) continue;
    if (run.split(/\s+/).every((w) => names.has(w))) continue;
    runs.push(run);
  }
  return runs;
}
