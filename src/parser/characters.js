// Character identity (brief §3.3): variants are distinct performers by
// default; same-person guesses are offer-only merge suggestions.

import { CHANNEL_QUALS, VOICE_CHANNEL_RE, TEXT_CHANNEL_RE } from './constants.js';

export function deriveCharacters(scenes) {
  const map = new Map();
  for (const sc of scenes) {
    for (const name of sc.characters_speaking) {
      if (!map.has(name)) map.set(name, { name, scenes: [] });
      map.get(name).scenes.push(sc.id);
    }
  }
  return [...map.values()]
    .map((c) => ({ ...c, scene_count: c.scenes.length }))
    .sort((a, b) => b.scene_count - a.scene_count);
}

// Offer-only merge suggestions, two families, neither ever automatic:
// - surname form: the shorter name's tokens are a PREFIX of the longer
//   name's (extra tokens sit in surname position). A leading qualifier
//   (YOUNG VALERIE) is not a prefix match, so it never offers.
//   Canonical = the name used in more scenes.
// - channel form (interim fold-class mirror, offer-only): a recognized
//   channel qualifier or possessive VOICE whose base exists as a plain
//   character offers a fold into the base. TEXT-family possessives are
//   NOT offered here: they are conversion candidates (video cues).
export function findMergeOffers(characters) {
  const offers = [];
  const names = new Set(characters.map((c) => c.name));
  const plain = characters.filter((c) => !c.name.includes('('));
  for (const longer of plain) {
    const lt = longer.name.split(' ');
    if (lt.length < 2) continue;
    for (const shorter of plain) {
      const st = shorter.name.split(' ');
      if (st.length >= lt.length) continue;
      if (!st.every((t, i) => lt[i] === t)) continue;
      const extras = lt.slice(st.length);
      if (!extras.every((t) => /^[A-Z][A-Z'.\-]*$/.test(t))) continue;
      const [canonical, variant] =
        shorter.scene_count >= longer.scene_count
          ? [shorter, longer]
          : [longer, shorter];
      offers.push({ variant: variant.name, canonical: canonical.name });
    }
  }
  for (const c of characters) {
    if (TEXT_CHANNEL_RE.test(c.name)) continue;
    const qual = c.name.match(/^(.+?)\s*\(([^()]+)\)$/);
    if (qual && CHANNEL_QUALS.has(qual[2].trim()) && names.has(qual[1].trim())) {
      offers.push({ variant: c.name, canonical: qual[1].trim(), channel: true });
      continue;
    }
    const voice = c.name.match(VOICE_CHANNEL_RE);
    if (voice && names.has(voice[1])) {
      offers.push({ variant: c.name, canonical: voice[1], channel: true });
    }
  }
  return offers;
}

// Columns that Peter's text-channel ruling marks as conversion candidates:
// a text on a screen is a video cue, not a performer. Offer-only; the
// operator's two-tap convert deletes the column, the video moment stands.
export function textChannelNames(characters) {
  return characters.map((c) => c.name).filter((n) => TEXT_CHANNEL_RE.test(n));
}
