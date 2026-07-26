// Character-cue gates (brief §3.2). Strict, precision-biased, and loud:
// a cue-shaped line that fails a gate is surfaced as a reject with the
// gate named, provided it passes the noise filter (cue-positioned AND
// followed by dialogue-band text). Furniture is structural, never a chip.

import { bandOf, CUE_TAGS, CUE_STOP_WORDS, isFurniture } from './constants.js';

export function evaluateCue(line, nextLine, ctx) {
  if (bandOf(line.minX) !== 'cue') return null;
  const raw = line.text.trim();
  if (!/[A-Z]/.test(raw) || raw !== raw.toUpperCase()) return null;

  const { name, qualified } = stripCueTags(raw);
  if (!name || !/[A-Z]/.test(name)) return null;
  if (isFurniture(name) || ctx.furniture.has(name) || ctx.furniture.has(raw)) {
    return null;
  }

  const followed =
    nextLine && ['dialogue', 'paren'].includes(bandOf(nextLine.minX));
  const gate = failGate(line, name);
  if (gate) {
    return followed ? { reject: gate } : null;
  }
  if (!followed) return null;
  return { accept: { name, qualified } };
}

function failGate(line, name) {
  if (line.segments.length >= 2) {
    return {
      name: line.text.trim(),
      code: 'wide',
      reason: 'wide (dual dialogue?)',
    };
  }
  const base = qualifiedBase(name);
  const bad = [...base].find((c) => !/[A-Z0-9 .'\-]/.test(c));
  if (bad) {
    return { name, code: 'charset', reason: `charset '${bad}'` };
  }
  const stop = base.split(/\s+/).find((t) => CUE_STOP_WORDS.has(t));
  if (stop) {
    return { name, code: 'stopword', reason: `word '${stop}'` };
  }
  if (base.replace(/[\s.]/g, '').length === 1) {
    return { name, code: 'single-glyph', reason: 'single letter (watermark?)' };
  }
  return null;
}

// Strips trailing parentheticals. The four standard tags (V.O., O.S.,
// O.C., CONT'D) collapse to the same character; anything else is a
// distinct-performer qualifier kept in the name (brief §3.3).
function stripCueTags(text) {
  let name = text.trim();
  const quals = [];
  for (;;) {
    const m = name.match(/^(.*?)[ \t]*\(([^()]*)\)$/);
    if (!m || !m[1].trim()) break;
    const tag = m[2].trim();
    name = m[1].trim();
    if (!CUE_TAGS.has(tag)) quals.unshift(tag);
  }
  if (!quals.length) return { name, qualified: false };
  return { name: `${name} (${quals.join(') (')})`, qualified: true };
}

function qualifiedBase(name) {
  return name.replace(/\s*\(.*$/, '').trim();
}
