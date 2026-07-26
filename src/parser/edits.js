// Operator edits (brief §3.3, §3.4, §6): the operator's click is always
// the authority. Add is one step; delete and merge are the expensive
// mistakes, so the UI makes them two-step and these ops stay explicit.
// The character roster survives edits: a character toggled out of every
// scene keeps their column until deliberately deleted.

import { deriveCharacters, findMergeOffers } from './characters.js';

export function textSearchScenes(parsed, name) {
  const re = boundaryRegex(name.trim());
  return parsed.scenes.filter((s) => re.test(s.text)).map((s) => s.id);
}

export function addCharacter(parsed, name, sceneIds = null) {
  const nm = name.trim().toUpperCase();
  if (!nm) return parsed;
  const ids = new Set(sceneIds ?? textSearchScenes(parsed, nm));
  for (const scene of parsed.scenes) {
    if (ids.has(scene.id) && !scene.characters_speaking.includes(nm)) {
      scene.characters_speaking.push(nm);
    }
  }
  if (!parsed.characters.some((c) => c.name === nm)) {
    parsed.characters.push({ name: nm, scenes: [], scene_count: 0, added: true });
  }
  refresh(parsed);
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

export function dismissReject(parsed, name, reason = null) {
  parsed.rejects = parsed.rejects.filter(
    (r) => !(r.name === name && (reason === null || r.reason === reason)),
  );
  return parsed;
}

export function toggleSpeaker(parsed, sceneId, name) {
  const scene = parsed.scenes.find((s) => s.id === sceneId);
  if (!scene) return parsed;
  const i = scene.characters_speaking.indexOf(name);
  if (i >= 0) scene.characters_speaking.splice(i, 1);
  else scene.characters_speaking.push(name);
  refresh(parsed);
  return parsed;
}

export function renameCharacter(parsed, oldName, newName) {
  const nm = newName.trim().toUpperCase();
  if (!nm || nm === oldName) return parsed;
  if (parsed.characters.some((c) => c.name === nm)) {
    throw new Error(`"${nm}" already exists. Merge instead of renaming onto it.`);
  }
  for (const scene of parsed.scenes) {
    const i = scene.characters_speaking.indexOf(oldName);
    if (i >= 0) scene.characters_speaking[i] = nm;
    if (oldName in scene.dialogue_by_character) {
      scene.dialogue_by_character[nm] = scene.dialogue_by_character[oldName];
      delete scene.dialogue_by_character[oldName];
    }
  }
  const entry = parsed.characters.find((c) => c.name === oldName);
  if (entry) entry.name = nm;
  refresh(parsed);
  return parsed;
}

export function deleteCharacter(parsed, name) {
  for (const scene of parsed.scenes) {
    const i = scene.characters_speaking.indexOf(name);
    if (i >= 0) scene.characters_speaking.splice(i, 1);
    delete scene.dialogue_by_character[name];
  }
  parsed.characters = parsed.characters.filter((c) => c.name !== name);
  refresh(parsed);
  return parsed;
}

export function mergeCharacters(parsed, variant, canonical) {
  for (const scene of parsed.scenes) {
    const i = scene.characters_speaking.indexOf(variant);
    if (i >= 0) {
      scene.characters_speaking.splice(i, 1);
      if (!scene.characters_speaking.includes(canonical)) {
        scene.characters_speaking.push(canonical);
      }
    }
    if (variant in scene.dialogue_by_character) {
      const prev = scene.dialogue_by_character[canonical];
      scene.dialogue_by_character[canonical] = prev
        ? `${prev}\n${scene.dialogue_by_character[variant]}`
        : scene.dialogue_by_character[variant];
      delete scene.dialogue_by_character[variant];
    }
  }
  parsed.characters = parsed.characters.filter((c) => c.name !== variant);
  refresh(parsed);
  return parsed;
}

export function dismissOffer(parsed, variant, canonical) {
  parsed.dismissed_offers ??= [];
  parsed.dismissed_offers.push({ variant, canonical });
  refresh(parsed);
  return parsed;
}

// Recomputes per-character scene lists from the scenes (the source of
// truth) while preserving the roster: operator-added or toggled-to-zero
// characters keep their column.
function refresh(parsed) {
  const derived = new Map(deriveCharacters(parsed.scenes).map((c) => [c.name, c]));
  const roster = new Map(parsed.characters.map((c) => [c.name, c]));
  const names = new Set([...roster.keys(), ...derived.keys()]);
  parsed.characters = [...names]
    .map((name) => ({
      ...(roster.get(name) ?? {}),
      name,
      scenes: derived.get(name)?.scenes ?? [],
      scene_count: derived.get(name)?.scene_count ?? 0,
    }))
    .sort((a, b) => b.scene_count - a.scene_count);
  const dismissed = parsed.dismissed_offers ?? [];
  parsed.merge_offers = findMergeOffers(parsed.characters).filter(
    (o) =>
      !dismissed.some(
        (d) => d.variant === o.variant && d.canonical === o.canonical,
      ),
  );
}

// Word-boundary search that survives names like "MERC #1": boundaries are
// simply "no letter/digit adjacent", so # and / inside names still match.
function boundaryRegex(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i');
}
