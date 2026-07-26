// Video department detectors (brief §5): phone-screen, tv-screen,
// video-playback. One category per line within the layer (most specific
// wins); overlaps with the Sound layer are expected and correct
// (FaceTime = phone + video-playback).

import { VIDEO_TRIGGERS } from './lexicon.js';
import { lineAnchor, snippetAt, characterNames, namesOnLine, makeMoment } from './util.js';

const CATEGORY_ORDER = ['phone-screen', 'tv-screen', 'video-playback'];

export function spotVideo(parsed, opts = {}) {
  const names = characterNames(parsed);
  const moments = [];
  for (const scene of parsed.scenes) {
    scene.lines.forEach((rec, i) => {
      if (rec.band === 'dialogue' || rec.band === 'cue' || rec.band === 'rejected-cue') return;
      for (const category of CATEGORY_ORDER) {
        const hit = VIDEO_TRIGGERS[category].find((t) => t.re.test(rec.text));
        if (!hit) continue;
        moments.push(
          makeMoment(scene, category, {
            snippet: snippetAt(scene, i),
            page: rec.page,
            characters: namesOnLine(rec.text, names),
            trigger: hit.name,
            confidence: 'high',
            anchor: lineAnchor(rec, opts.sourceDoc),
          }),
        );
        break;
      }
    });
  }
  return { moments };
}
