// Trigger vocabularies for the department scan, shaped as data on purpose
// (hub constitution law 8: declarative rule types a shared policy file can
// absorb later). Recall-biased everywhere: a false flag costs a click.

export const PLAYBACK_ACTION = [
  { name: 'singing', re: /\b(?:sings?|singing|sang|sung)\b/i },
  { name: 'humming', re: /\b(?:hums?|humming|hummed)\b/i },
  { name: 'song', re: /\bsongs?\b/i },
  { name: 'dancing', re: /\b(?:dances?|dancing|danced)\b/i },
  { name: 'karaoke', re: /\bkaraoke\b/i },
  { name: 'instrument', re: /\b(?:piano|guitar|jukebox|band|dj)\b/i },
  { name: 'music', re: /\b(?:music|needle drop|anthem|lullaby)\b/i },
];

export const SINGING_PAREN = /^\(\s*(?:sing(?:s|ing)?|hum(?:s|ming)?)\b/i;

export const PHONE_TRIGGERS = [
  {
    name: 'phone rings',
    re: /\b(?:phone|cell|mobile)\b.*\b(?:rings?|ringing|buzz(?:es|ing)?|vibrates?)\b|\b(?:rings?|ringing|buzz(?:es|ing)?)\b.*\b(?:phone|cell|mobile)\b/i,
  },
  { name: 'answers/dials', re: /\b(?:answers? the (?:phone|call)|dial(?:s|ing)|hangs? up|hanging up|redials?)\b/i },
  { name: 'speakerphone', re: /\bspeakerphone\b/i },
  { name: 'voicemail', re: /\bvoicemail\b/i },
  { name: 'video call', re: /\bfacetimes?\b|\bvideo calls?\b/i },
  { name: 'intercut phone', re: /\bINTERCUT\b.*\b(?:PHONE|CALL)\b/ },
];

// "Victor calls Dana." — the called party is named on the trigger line.
export const CALLS_NAME = /\b(?:calls|phones|dials|texts)\s+((?:[A-Z][a-zA-Z'\-]*)(?:\s+[A-Z][a-zA-Z'\-]*)*)/;
export const CALLS_NAME_STOP = new Set(['HE', 'SHE', 'THEY', 'HIM', 'HER', 'THEM', 'IT', 'BACK', 'OUT', 'AFTER', 'OVER', 'UP', 'IN', 'AGAIN']);

export const PHONE_PAREN = /^\(\s*(?:(?:into|on|over|through)\s+(?:the\s+)?(?:phone|speaker(?:phone)?|cell)|phone)\s*\)/i;

// Far-end markers on cue-band lines, matched against the RAW printed line
// (per Peter's ruling the printed channel variant IS the far-end marker).
export const FAR_END_CUE = /\((?:V\.O\.|O\.S\.|O\.C\.|FILTERED|OVER (?:THE )?PHONE|ON (?:THE )?PHONE|INTO PHONE)\)|'S (?:VOICE|TEXT|PHONE)\b/;

export const SFX_NOUNS = /\b(knock(?:ing|s)?|gunshots?|gunfire|shots?|explosions?|blasts?|booms?|sirens?|alarms?|doorbell|crash(?:es|ing)?|thuds?|screams?(?:ing)?|shatter(?:s|ing)?|honk(?:s|ing)?|buzz(?:es|ing)?|pings?|chimes?|clicks?|bangs?|slam(?:s|ming)?|footsteps|screech(?:es|ing)?|clatters?)\b/i;

export const REACTION_VERBS = /\b(?:hears?|reacts?|startle[sd]?|jumps?|spins?|turns? toward|freezes?|ducks?|flinch(?:es)?|whirls?|winces?|jolts?)\b/i;

// Caps runs that are never sound effects.
export const CAPS_IGNORE = new Set([
  'TV', 'POV', 'CU', 'ECU', 'MOS', 'OK', 'AM', 'PM', 'ID', 'DJ', 'VS',
  'II', 'III', 'IV', 'O.S.', 'V.O.', 'O.C.', "CONT'D", 'INT.', 'EXT.',
]);

export const VIDEO_TRIGGERS = {
  'phone-screen': [
    { name: 'phone screen', re: /\b(?:on the )?phone(?:'s)? screen\b/i },
    { name: 'insert phone', re: /\bINSERT\b[^a-z]*\bPHONE\b/ },
    { name: 'text message', re: /\btext message|\btext(?:s|ing)?\b|imessage/i },
    { name: 'we see the screen', re: /\bwe see (?:the |her |his |their )?screen\b|lock screen/i },
    { name: 'swipes/scrolls', re: /\b(?:swipes?|scroll(?:s|ing)?)\b/i },
  ],
  'tv-screen': [
    { name: 'on tv', re: /\bon (?:the )?tv\b|\bangle on the tv\b/i },
    { name: 'TV', re: /\bTV\b/ },
    { name: 'television', re: /television|newscast|news report|broadcast/i },
    { name: 'monitor', re: /\bmonitors?\b/i },
    { name: 'footage plays on', re: /footage plays on/i },
  ],
  'video-playback': [
    { name: 'footage', re: /\bfootage\b/i },
    { name: 'video', re: /\bvideo\b/i },
    { name: 'security cam', re: /security cam(?:era)?|cctv/i },
    { name: 'zoom', re: /\bzoom\b/i },
    { name: 'video call', re: /facetime|video call/i },
    { name: 'projection', re: /projector|screening|\bplayback\b/i },
    { name: 'insert screen', re: /\bINSERT\b[^a-z]*\bSCREEN\b/ },
    { name: 'device screen', re: /\blaptop\b|\bipad\b|\btablets?\b/i },
    { name: 'watches footage', re: /watch(?:es|ing)\s+(?:the\s+)?(?:footage|video|screen|clip|tape|feed)/i },
  ],
};
