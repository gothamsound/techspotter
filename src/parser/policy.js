// MIRROR of scriptparse policy.json, policy_version 2026.07.27b
// (scriptparse v0.2.1; absorbed per hub issue #33). The DATA object below
// is the hub file verbatim, notes included: never edit it locally. A
// divergence is a federation motion in scriptparse, not a local fix.
// The functions after it are the JS interpreter, mirroring policy.py
// (the Python reference interpreter) matching semantics.

export const POLICY = Object.freeze({
  policy_version: '2026.07.27b',
  _comment:
    'The cross-language fold/gate policy (scriptparse PR #2, frozen 2026-07-26; issue #11 rulings executed 2026-07-27). This file IS the contract: declarative lists, maps, and enumerated rule types only: a JS interpreter must be able to mirror it exactly. No regexes, no code. policy.py is the Python reference interpreter.',
  cue_stop_words: ['AND', 'OR', 'BUT', 'NOR', 'FROM'],
  _cue_stop_words_note:
    "Peter's 2026-07-26 ruling (the MAN IN BLACK case): prepositions are NOT stop words — epithet characters are built from them (MAN IN BLACK, GIRL ON TRAIN, VOICE OF GOD). Conjunctions + FROM only. A cue of 2+ words containing any of these is gate-rejected (reason: word '<W>').",
  standard_tags: [
    'V.O.',
    'O.S.',
    'O.C.',
    "CONT'D",
    'ON THE PHONE',
    'ON PHONE',
    'INTERCUT',
    'PRE-LAP',
    'PRELAP',
    'INTO PHONE',
    'OVER THE PHONE',
    'ON SPEAKER',
    'OVER SPEAKER',
    'SPEAKERPHONE',
  ],
  _standard_tags_note:
    'Tier 1: same character, collapses SILENTLY per interchange spec §3.2, never an offer. Matching is dot- and space-insensitive (V.O. == VO). Tier-assignment ruling (Peter, 2026-07-26, via the TechSpotter bench; issue #11): INTERCUT, PRELAP, and ON THE PHONE are ALWAYS the same character, so they moved here from the channel tier; spelling kin included (ON PHONE, PRE-LAP). Kin ruling (Peter, 2026-07-27; issue #22): the phone-device kin (INTO PHONE, OVER THE PHONE, ON SPEAKER, OVER SPEAKER, SPEAKERPHONE) follow ON THE PHONE here; same physics, the character is on a call. Tier is encoded by list membership.',
  channel_tags: [
    'ON TV',
    'ON SCREEN',
    'ON MONITOR',
    'ON VIDEO',
    'ON RADIO',
    'OVER RADIO',
    'FILTERED',
    'ON COMMS',
    'OVER COMMS',
  ],
  _channel_tags_note:
    'Tier 2: channel variants: same performer, different audio/picture channel. Fold-for-identity is OFFER-ONLY in any tool that would mutate a show (the MB TONY STARBUCK ruling); derivations (parts()) may fold freely because they never mutate show.characters. Full tier assignment ruled: #11 named the remainder (FILTERED, radio/TV/screen qualifiers, possessive VOICE); #22 kept ON COMMS / OVER COMMS here with the radio family (comms chatter is routinely a far-end voice that may not be a scene character; the human stays in the loop). Every tag in this list is assigned by explicit ruling.',
  possessive_channel_nouns: [
    'TEXT',
    'TEXTS',
    'VOICE',
    'VOICEMAIL',
    'VM',
    'POST',
    'POSTS',
    'DM',
    'DMS',
  ],
  _possessive_channel_nouns_note:
    "X'S TEXT / X'S VOICEMAIL: possessive channels, tier 2, same physics as the parenthetical form. X'S MOM does not fold: MOM is not a channel noun (a distinct performer by construction). DM/DMS joined 2026-07-27 (issue #11 execution, memo §3.2 gap): ruling 2 names X'S DM as TEXT-family.",
  channel_kinds: {
    'ON TV': 'tv',
    'ON SCREEN': 'screen',
    'ON MONITOR': 'screen',
    'ON VIDEO': 'screen',
    'ON RADIO': 'radio',
    'OVER RADIO': 'radio',
    FILTERED: 'filtered',
    'ON COMMS': 'comms',
    'OVER COMMS': 'comms',
    TEXT: 'text',
    TEXTS: 'text',
    POST: 'text',
    POSTS: 'text',
    DM: 'text',
    DMS: 'text',
    VOICE: 'voice',
    VOICEMAIL: 'voice',
    VM: 'voice',
  },
  _channel_kinds_note:
    "RULED IN (Peter, 2026-07-26; issue #11), per the litigation's recommended shape (memo v0.2-input-techspotter-channel-kind.md §3.1): an ADDITIVE sibling map keyed by the same tag/noun strings as channel_tags and possessive_channel_nouns; an interpreter that ignores this key behaves exactly as before. Vocabulary: phone / voice / text / tv / screen / radio / filtered / comms. TEXT-family (kind 'text') is the conversion class; what a kind MEANS is each bench's Layer 2. Silent-tier tags carry no kind: identity notation, not channels.",
  channel_kind_default: 'unknown',
  _channel_kind_default_note:
    'A channel-tier tag with no channel_kinds entry folds with this kind: a known unknown in every implementation, never a null each bench guesses about.',
  burn_in: {
    strip_rotated_runs: true,
    repeat_grid_pt: 24,
    repeat_quantizer: 'floor',
    repeat_space: 'anchor-bottom-left-pt',
    repeat_unit: 'word-lower-left',
    repeat_min_pages: 4,
    repeat_page_fraction: 0.5,
    repeat_fraction_rounding: 'ceil',
    repeat_requires_lowercase: true,
    repeat_exempt_trailing_page_token: true,
    single_capital_exempt: true,
  },
  _burn_in_note:
    "RULED IN (Peter, 2026-07-27; issue #16, memo v0.2-input-burnin-techspotter.md section 6). Rule type 'burn-in': two strip signals, both applied to words BEFORE line clustering (the ordering is the fix; stripping after clustering cannot un-merge a stamp from an action line or un-shred a rotated run). Signal 1: non-upright (rotated) runs strip unconditionally; screenplay body text is never rotated. Signal 2: repeated-position text strips when the same trimmed word sits in the same quantized cell (bucket = floor(coordinate / repeat_grid_pt), coordinates = the word's lower-left corner in spec section 3.5 anchor space, bottom-left origin, points, after any extractor boundary transform) on at least max(repeat_min_pages, ceil(pages * repeat_page_fraction)) of the document's PDF pages; candidate words then group per page by y-bucket and the group strips only if its joined text contains a lowercase letter. All-caps structure (cues, slugs) and single capital letters therefore never strip; the single-glyph cue gate keeps its territory (the S doctrine). Trailing-page-token exemption (issue #16 golden STOP, finding 1): a candidate group whose line's rightmost word on that page is a printed-page token (optional letter, digits, optional letter, period; e.g. '6.', '6A.') is a running header and never strips, however it repeats; the printed-page contract is load-bearing and headers are parseable furniture, not burn-in. Interpreters additionally read printed page numbers from PRE-strip lines so the contract never depends on any strip rule. Arithmetic is pinned to the letter because it is the cross-language cliff: floor is the only quantizer Python and JS mirror exactly (round() is banker's, Math.round is half-up), and anchor space keeps mixed-page-size documents from disagreeing about 'same position'. Stripped text is never silent: it lands on the show-level burn_ins rail beside rejected_cues.",
  qualifier_words: [
    'YOUNG',
    'OLD',
    'OLDER',
    'TEEN',
    'TEENAGE',
    'PRETEEN',
    'LITTLE',
    'ADULT',
    'FUTURE',
    'ELDERLY',
  ],
  _qualifier_words_note:
    'Tier 3: age/stage doubles are DISTINCT PERFORMERS — never fold, never offer (YOUNG VALERIE doctrine). Consumed by offer-builders; fold() itself never sees a bare qualifier name as a variant.',
  numbered_part_marker: '#',
  _numbered_part_marker_note:
    'Names carrying #N (MERC #1) are distinct numbered parts and never fold (gate-railed; the charset gate also refuses them as cues — they surface via the reject rail).',
  furniture_numbered_words: ['EPISODE', 'ACT', 'PART', 'CHAPTER', 'SCENE', 'DAY'],
  furniture_number_words: [
    'ONE',
    'TWO',
    'THREE',
    'FOUR',
    'FIVE',
    'SIX',
    'SEVEN',
    'EIGHT',
    'NINE',
    'TEN',
  ],
  _furniture_note:
    "Rule type 'numbered-furniture': <word> + (digits, optionally letter-suffixed, or a number word) is title furniture, never a character (EPISODE 102, ACT 2, DAY 3). DAY PLAYER is a real character: PLAYER is neither digits nor a number word.",
  transitions_non_character: [
    'CUT TO',
    'DISSOLVE TO',
    'FADE IN',
    'FADE OUT',
    'SMASH CUT TO',
    'HARD CUT TO',
    'MONTAGE',
    'END MONTAGE',
    'CONTINUED',
    "CONT'D",
    'THE END',
    'BACK TO',
    'TITLE',
    'SUPER',
    'INSERT',
    'CLOSE ON',
    'CHYRON',
    'OVER BLACK',
    'PROLOGUE',
    'TEASER',
    'ACT ONE',
    'ACT TWO',
    'ACT THREE',
    'ACT FOUR',
    'ACT FIVE',
    'TAG',
  ],
});

// ---------------------------------------------------------------------------
// Interpreter (mirrors policy.py). fold semantics: pure, deterministic,
// total — identity (tier null) for anything not positively recognized.

// Dot- and space-insensitive tag comparison form: 'V.O.' == 'VO',
// 'ON  THE PHONE' == 'ON THE PHONE' (policy.py _canon_tag).
export function canonTag(tag) {
  return tag.replace(/\./g, '').trim().replace(/\s+/g, ' ').toUpperCase();
}

const STANDARD_CANON = new Set(POLICY.standard_tags.map(canonTag));
const CHANNEL_CANON = new Set(POLICY.channel_tags.map(canonTag));
const KINDS_CANON = new Map(
  Object.entries(POLICY.channel_kinds).map(([k, v]) => [canonTag(k), v]),
);
const POSSESSIVE_NOUNS = new Set(POLICY.possessive_channel_nouns);

export const CUE_STOP_WORDS = new Set(POLICY.cue_stop_words);
export const BURN_IN = POLICY.burn_in;

const TRAILING_PAREN_RE = /\s*\(([^()]*)\)\s*$/;
const POSSESSIVE_RE = /^(.+?)['’]S\s+([A-Z]+)$/;

export function isStandardTag(tag) {
  return STANDARD_CANON.has(canonTag(tag));
}

function kindOf(channel) {
  return KINDS_CANON.get(canonTag(channel)) ?? POLICY.channel_kind_default;
}

// Classify one printed cue string -> {base, channel, tier, kind}.
// tier: 'standard' | 'channel' | null. Unknown parentheticals stop the
// fold (conservative by design); numbered parts (MERC #1) never fold.
export function foldName(printedName) {
  const name = (printedName ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
  const identity = { base: name, channel: null, tier: null, kind: null };
  if (!name) return identity;

  const marker = POLICY.numbered_part_marker;
  if (marker && new RegExp(`${escapeRe(marker)}\\d`).test(name)) return identity;

  let base = name;
  let channel = null;
  let sawStandard = false;
  for (;;) {
    const m = base.match(TRAILING_PAREN_RE);
    if (!m) break;
    const tag = canonTag(m[1]);
    if (STANDARD_CANON.has(tag)) {
      sawStandard = true;
      base = base.slice(0, m.index).trimEnd();
    } else if (CHANNEL_CANON.has(tag) && channel === null) {
      channel = tag;
      base = base.slice(0, m.index).trimEnd();
    } else {
      return identity; // unknown (or second channel) parenthetical
    }
  }

  if (channel === null) {
    const pm = base.match(POSSESSIVE_RE);
    if (pm && POSSESSIVE_NOUNS.has(pm[2])) {
      return { base: pm[1].trim(), channel: pm[2], tier: 'channel', kind: kindOf(pm[2]) };
    }
  }
  if (channel !== null) {
    return { base, channel, tier: 'channel', kind: kindOf(channel) };
  }
  if (sawStandard && base !== name) {
    return { base, channel: null, tier: 'standard', kind: null };
  }
  return identity;
}

// Rule type 'numbered-furniture': <word> + (digits, optionally
// letter-suffixed, or a number word) is title furniture, never a character.
const NUMBER_WORDS = new Set(POLICY.furniture_number_words);
const NUMBERED_WORDS = new Set(POLICY.furniture_numbered_words);

export function isNumberedFurniture(text) {
  const tokens = text.trim().toUpperCase().split(/\s+/);
  if (tokens.length !== 2 || !NUMBERED_WORDS.has(tokens[0])) return false;
  return /^\d+[A-Z]?$/.test(tokens[1]) || NUMBER_WORDS.has(tokens[1]);
}

const TRANSITIONS = new Set(POLICY.transitions_non_character);

export function isTransition(text) {
  return TRANSITIONS.has(text.trim().toUpperCase().replace(/[:.]+$/, ''));
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
