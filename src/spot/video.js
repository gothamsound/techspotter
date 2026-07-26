// Video department detectors (brief §5): phone-screen, tv-screen,
// video-playback. One category per line within the layer (most specific
// wins); overlaps with the Sound layer are expected and correct
// (FaceTime = phone + video-playback).

import { VIDEO_TRIGGERS } from './lexicon.js';
import { TEXT_CHANNEL_RE } from '../parser/constants.js';
import { lineAnchor, blockAnchor, snippetAt, characterNames, namesOnLine, makeMoment } from './util.js';

const CATEGORY_ORDER = ['phone-screen', 'tv-screen', 'video-playback'];

export function spotVideo(parsed, opts = {}) {
  const names = characterNames(parsed);
  const moments = [];
  for (const scene of parsed.scenes) {
    scene.lines.forEach((rec, i) => {
      // A TEXT-channel cue is a message shown on screen: phone-screen
      // moment with the message content as evidence (Peter's ruling; the
      // moment stands whether or not the operator converts the column).
      if (rec.band === 'cue' && rec.cue && TEXT_CHANNEL_RE.test(rec.cue)) {
        const body = [];
        for (let j = i + 1; j < scene.lines.length; j++) {
          const r = scene.lines[j];
          if (r.band !== 'dialogue' && r.band !== 'paren') break;
          body.push(r);
        }
        const recs = [rec, ...body];
        const { anchor, line_anchors } = blockAnchor(recs, opts.sourceDoc);
        moments.push(
          makeMoment(scene, 'phone-screen', {
            snippet: recs.map((r) => r.text.trim()).join('\n').slice(0, 240),
            page: rec.page,
            characters: [rec.cue],
            trigger: 'text-channel cue',
            confidence: 'high',
            anchor,
            line_anchors,
          }),
        );
        return;
      }
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
