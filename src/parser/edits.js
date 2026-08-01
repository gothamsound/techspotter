// Operator edits (brief §3.3, §3.4, §6): the operator's click is always
// the authority. Add is one step; delete and merge are the expensive
// mistakes, so the UI makes them two-step and these ops stay explicit.
// The character roster survives edits: a character toggled out of every
// scene keeps their column until deliberately deleted.

import { deriveCharacters, findMergeOffers } from './characters.js';
import { derivePresence } from './presence.js';

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
  recompute(parsed);
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
  parsed.review_dismissed ??= [];
  parsed.review_dismissed.push({ kind: 'reject-chip', name, reason });
  return parsed;
}

export function toggleSpeaker(parsed, sceneId, name) {
  const scene = parsed.scenes.find((s) => s.id === sceneId);
  if (!scene) return parsed;
  const i = scene.characters_speaking.indexOf(name);
  if (i >= 0) scene.characters_speaking.splice(i, 1);
  else scene.characters_speaking.push(name);
  recompute(parsed);
  return parsed;
}

// Cell state machine (operator authority, one click advances the loop):
// empty -> speaking -> present (confirmed) -> empty -> ... with a
// suggestion entering the loop at confirmed. Every state is reachable
// from every state (Patrick's field report, 2026-07-31: presence must
// be settable in scenes where the parser suggested nothing, and
// reachable AGAIN after cycling past it).
export function cycleCell(parsed, sceneId, name) {
  const scene = parsed.scenes.find((s) => s.id === sceneId);
  if (!scene) return parsed;
  scene.present_confirmed ??= [];
  scene.present_dismissed ??= [];
  const speaking = scene.characters_speaking.includes(name);
  const confirmed = scene.present_confirmed.includes(name);
  const suggested = scene.present_suggest?.includes(name);
  if (speaking) {
    scene.characters_speaking.splice(scene.characters_speaking.indexOf(name), 1);
    scene.present_dismissed = scene.present_dismissed.filter((n) => n !== name);
    scene.present_confirmed.push(name);
  } else if (confirmed) {
    scene.present_confirmed.splice(scene.present_confirmed.indexOf(name), 1);
    if (!scene.present_dismissed.includes(name)) scene.present_dismissed.push(name);
  } else if (suggested) {
    scene.present_confirmed.push(name);
  } else {
    scene.present_dismissed = scene.present_dismissed.filter((n) => n !== name);
    scene.characters_speaking.push(name);
  }
  recompute(parsed);
  return parsed;
}

// Column order is operator territory: recompute preserves it, this
// nudges it. The characters array order IS the order; exports carry it
// (show.characters), imports restore it.
export function moveCharacter(parsed, name, dir) {
  const i = parsed.characters.findIndex((c) => c.name === name);
  const j = i + (dir < 0 ? -1 : 1);
  if (i < 0 || j < 0 || j >= parsed.characters.length) return parsed;
  const [c] = parsed.characters.splice(i, 1);
  parsed.characters.splice(j, 0, c);
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
  recompute(parsed);
  return parsed;
}

export function deleteCharacter(parsed, name) {
  for (const scene of parsed.scenes) {
    const i = scene.characters_speaking.indexOf(name);
    if (i >= 0) scene.characters_speaking.splice(i, 1);
    delete scene.dialogue_by_character[name];
  }
  parsed.characters = parsed.characters.filter((c) => c.name !== name);
  recompute(parsed);
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
  // Operator identity rulings ride the interchange (spec rev e): a
  // committed fold is a cast_aliases entry.
  parsed.cast_aliases ??= {};
  parsed.cast_aliases[variant] = canonical;
  recompute(parsed);
  return parsed;
}

export function dismissOffer(parsed, variant, canonical) {
  parsed.dismissed_offers ??= [];
  parsed.dismissed_offers.push({ variant, canonical });
  // null pins keep-separate: an explicit "different people" ruling (rev e).
  parsed.cast_aliases ??= {};
  parsed.cast_aliases[variant] = null;
  recompute(parsed);
  return parsed;
}

// Recomputes per-character scene lists from the scenes (the source of
// truth) while preserving the roster: operator-added or toggled-to-zero
// characters keep their column.
export function recompute(parsed) {
  const derived = new Map(deriveCharacters(parsed.scenes).map((c) => [c.name, c]));
  const roster = new Map(parsed.characters.map((c) => [c.name, c]));
  const names = new Set([...roster.keys(), ...derived.keys()]);
  // Order-stable: existing columns keep their position (operator
  // reordering and imported file order survive every edit); only
  // genuinely new names sort in by scene count, at the end.
  const order = new Map(parsed.characters.map((c, i) => [c.name, i]));
  parsed.characters = [...names]
    .map((name) => ({
      ...(roster.get(name) ?? {}),
      name,
      scenes: derived.get(name)?.scenes ?? [],
      scene_count: derived.get(name)?.scene_count ?? 0,
    }))
    .sort((a, b) => {
      const ia = order.get(a.name) ?? Infinity;
      const ib = order.get(b.name) ?? Infinity;
      return ia !== ib ? ia - ib : b.scene_count - a.scene_count;
    });
  const dismissed = parsed.dismissed_offers ?? [];
  parsed.merge_offers = findMergeOffers(parsed.characters).filter(
    (o) =>
      !dismissed.some(
        (d) => d.variant === o.variant && d.canonical === o.canonical,
      ),
  );
  derivePresence(parsed);
}

// Word-boundary search that survives names like "MERC #1": boundaries are
// simply "no letter/digit adjacent", so # and / inside names still match.
function boundaryRegex(name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`, 'i');
}
