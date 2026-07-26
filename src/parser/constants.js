// Layout bands and cue-gate vocabulary. Band edges are in PDF points for
// US-letter Courier-12 screenplay layout; tolerant ranges, tunable if a
// draft's margins drift.

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

// The four standard cue tags that collapse to the same character (brief
// §3.2). Any other trailing parenthetical is a distinct-performer
// qualifier (brief §3.3).
export const CUE_TAGS = new Set(['V.O.', 'O.S.', 'O.C.', "CONT'D"]);

// Words that mark a cue-shaped line as prose, not a character (brief §3.2).
// Strict on purpose: a real ELEANOR FROM HR lands on the reject rail with
// the gate named, never silently dropped.
export const CUE_STOP_WORDS = new Set([
  'AND', 'OR', 'BUT', 'FROM', 'WITH', 'TO', 'IF', 'AS', 'AT', 'ON', 'IN',
  'BY', 'OF', 'FOR', 'VS', 'VS.',
]);

const FURNITURE_RE = /^(EPISODE|ACT|PART|DAY|SCENE|CHAPTER|TEASER|COLD OPEN|TITLE|END OF)\b/;

export function isFurniture(text) {
  const t = text.trim();
  return (
    FURNITURE_RE.test(t) ||
    /TO:$/.test(t) ||
    /^FADE (IN|OUT)[:.]?$/.test(t) ||
    t === 'THE END' ||
    t === 'THE END.'
  );
}
