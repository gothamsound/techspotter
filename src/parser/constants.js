// Layout bands and furniture gates. Band edges are in PDF points for
// US-letter Courier-12 screenplay layout; tolerant ranges, tunable if a
// draft's margins drift. Cue vocabulary (tags, stop words, fold classes)
// lives in policy.js — the scriptparse policy mirror — not here.

import { isNumberedFurniture, isTransition } from './policy.js';

export const BANDS = {
  headerY: 720, // y strictly above this = running-header zone (top ~72 pt); y=720 is the 1-inch body top and belongs to the body
  action: [72, 150],
  dialogue: [150, 208],
  paren: [208, 248],
  cue: [248, 380],
};

export function bandOf(x) {
  if (x >= BANDS.cue[0] && x < BANDS.cue[1]) return 'cue';
  if (x >= BANDS.paren[0] && x < BANDS.paren[1]) return 'paren';
  if (x >= BANDS.dialogue[0] && x < BANDS.dialogue[1]) return 'dialogue';
  if (x >= BANDS.action[0] && x < BANDS.action[1]) return 'action';
  return 'other';
}

// Title/structure furniture, never a character. The numbered form
// (EPISODE 102, ACT 2, DAY 3) and the transition list are policy rules
// (numbered-furniture pins DAY PLAYER as a real character: PLAYER is
// neither digits nor a number word). The prefix words are brief-local
// precision: structure headings that lead longer furniture lines
// (TEASER ..., TITLE CARD ..., END OF ACT ONE). DAY is deliberately not
// a prefix word — only DAY <number> is furniture.
const FURNITURE_PREFIX_RE =
  /^(EPISODE|ACT|PART|SCENE|CHAPTER|TEASER|COLD OPEN|TITLE|END OF)\b/;

export function isFurniture(text) {
  const t = text.trim();
  return (
    FURNITURE_PREFIX_RE.test(t) ||
    isNumberedFurniture(t) ||
    isTransition(t) ||
    /TO:$/.test(t) ||
    /^FADE (IN|OUT)[:.]?$/.test(t) ||
    t === 'THE END' ||
    t === 'THE END.'
  );
}
