// Operator edits (brief §3.4, §6): the operator's click is always the
// authority. Add is one step; promoting a reject adds the name and marks
// its scenes from the recorded occurrences plus word-boundary text search.

import { deriveCharacters, findMergeOffers } from './characters.js';

export function textSearchScenes(parsed, name) {
  const re = boundaryRegex(name.trim());
  return parsed.scenes.filter((s) => re.test(s.text)).map((s) => s.id);
}

export function addCharacter(parsed, name, sceneIds = null) {
  const nm = name.trim().toUpperCase();
  const ids = new Set(sceneIds ?? textSearchScenes(parsed, nm));
  for (const scene of parsed.scenes) {
    if (ids.has(scene.id) && !scene.characters_speaking.includes(nm)) {
      scene.characters_speaking.push(nm);
    }
  }
  refresh(parsed);
  if (!parsed.characters.some((c) => c.name === nm)) {
    parsed.characters.push({ name: nm, scenes: [], scene_count: 0 });
  }
  return parsed;
}

export function promoteReject(parsed, name) {
  const matching = parsed.rejects.filter((r) => r.name === name);
  const ids = new Set(textSearchScenes(parsed, name));
  for (const r of matching) {
    for (const occ of r.occurrences) ids.add(occ.scene);
  }
  addCharacter(parsed, name, [...ids]);
  parsed.rejects = parsed.rejects.filter((r) => r.name !== name);
  return parsed;
}

function refresh(parsed) {
  parsed.characters = deriveCharacters(parsed.scenes);
  parsed.merge_offers = findMergeOffers(parsed.characters);
}

// Word-boundary search that survives names like "MERC #1": boundaries are
// simply "no letter/digit adjacent", so # and / inside names still match.
function boundaryRegex(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i');
}
