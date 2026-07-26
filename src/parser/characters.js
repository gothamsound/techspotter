// Character identity (brief §3.3): variants are distinct performers by
// default; same-person guesses are offer-only merge suggestions.

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

// Offer-only merge suggestions: the shorter name's tokens must be a
// PREFIX of the longer name's (extra tokens sit in surname position).
// A leading qualifier (YOUNG VALERIE vs VALERIE) is not a prefix match,
// so it never offers. Qualified names (with parentheticals) never offer.
// Canonical = the name used in more scenes.
export function findMergeOffers(characters) {
  const offers = [];
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
  return offers;
}
