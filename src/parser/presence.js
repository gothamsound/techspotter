// Non-speaking presence (spec `present_suggest`): a character named in a
// scene's action who has no cue there is suggested present. Suggestions
// only for plain (unqualified) names; a speaking channel variant of the
// same base suppresses the suggestion. Operator state rides per scene as
// present_confirmed / present_dismissed.

export function derivePresence(parsed) {
  const plain = parsed.characters
    .map((c) => c.name)
    .filter((n) => n.length >= 2 && !n.includes('(') && !/'S /.test(n));
  for (const scene of parsed.scenes) {
    const confirmed = new Set(scene.present_confirmed ?? []);
    const dismissed = new Set(scene.present_dismissed ?? []);
    const speakingBases = new Set(
      scene.characters_speaking.map((n) => n.replace(/\s*\(.*$/, '').trim()),
    );
    scene.present_suggest = plain.filter((name) => {
      if (speakingBases.has(name) || confirmed.has(name) || dismissed.has(name)) {
        return false;
      }
      return nameRegex(name).test(scene.action_text);
    });
  }
  return parsed;
}

function nameRegex(name) {
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`, 'i');
}
