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

// Cue tags that collapse SILENTLY to the same character: the brief §3.2
// four, plus Peter's ruling (2026-07-26): INTERCUT, PRELAP, and ON THE
// PHONE are ALWAYS the same character (with spelling kin). Any other
// trailing parenthetical is a distinct-performer qualifier (brief §3.3)
// or an offer-only channel variant.
export const CUE_TAGS = new Set([
  'V.O.', 'O.S.', 'O.C.', "CONT'D",
  'ON THE PHONE', 'ON PHONE', 'INTERCUT', 'PRE-LAP', 'PRELAP',
]);

// Words that mark a cue-shaped line as prose, not a character (brief §3.2).
// Conjunctions plus the brief-named FROM only. Prepositions are NOT stop
// words (Peter, 2026-07-26): epithet characters are built from them (MAN
// IN BLACK, GIRL ON TRAIN, VOICE OF GOD). ELEANOR FROM HR remains the
// known false positive the reject rail exists to catch.
export const CUE_STOP_WORDS = new Set([
  'AND', 'OR', 'BUT', 'FROM', 'TO', 'IF', 'VS', 'VS.',
]);

// INTERIM MIRROR of the scriptparse v0.2 fold classes (Peter's rulings,
// 2026-07-26, MB TONY STARBUCK pass; federation motion filed). Used for
// OFFER-ONLY suggestions, never automatic folds. Delete this block and
// consume the shared policy data when scriptparse v0.2 ships.
// (ON THE PHONE / INTERCUT / PRELAP moved to CUE_TAGS by the same ruling:
// they collapse silently now, no offer needed.)
export const CHANNEL_QUALS = new Set([
  'OVER PHONE', 'OVER THE PHONE', 'INTO PHONE',
  'ON SPEAKER', 'SPEAKERPHONE', 'FILTERED', 'ON RADIO',
  'OVER RADIO', 'ON TV', 'ON THE TV', 'ON MONITOR', 'ON VIDEO', 'ON SCREEN',
]);
// Possessive channels that ARE performed (a voice is acted): offer a fold.
export const VOICE_CHANNEL_RE = /^(.+)'S VOICE$/;
// Possessive channels that are NOT performances: a text on a screen is a
// video cue, not a character (Peter's ruling). Offered as a conversion.
export const TEXT_CHANNEL_RE = /^(.+)'S (?:TEXTS?|POSTS?|DMS?)$/;

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
