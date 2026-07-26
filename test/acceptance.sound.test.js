// Brief §8.6: sound categories + snippets are correct, and a character
// name in caps mid-action is NOT a sound effect.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { spotShow } from '../src/spot/index.js';

async function spotted() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. KARAOKE BAR - NIGHT')
    .blank()
    .action("She SINGS 'Happy Birthday' at the top of her lungs.")
    .blank()
    .cue('VALERIE')
    .dialogue('Thank you, thank you.')
    .blank()
    .slug('INT. LAB - NIGHT')
    .blank()
    .action('The PHONE RINGS. Marta freezes.')
    .blank()
    .cue('MARTA')
    .dialogue("Don't answer it.")
    .blank()
    .slug('EXT. ALLEY - NIGHT')
    .blank()
    .action('A distant GUNSHOT. Everyone ducks.')
    .blank()
    .cue('VICTOR')
    .dialogue('Down! Get down!')
    .blank()
    .slug('INT. STAIRWELL - NIGHT')
    .blank()
    .action('Suddenly VICTOR spins around.')
    .blank()
    .cue('VICTOR')
    .dialogue('Who is there?');
  const parsed = parseShow(await extractRuns(sp.build()));
  return { parsed, spot: spotShow(parsed, { sourceDoc: 'fixture.pdf' }) };
}

test('sound: playback, phone, sfx-reaction land in the right scenes', async () => {
  const { spot } = await spotted();
  const byScene = (id) => spot.sound.moments.filter((m) => m.scene === id);

  const s1 = byScene('1');
  assert.equal(s1.length, 1);
  assert.equal(s1[0].category, 'playback');
  assert.match(s1[0].snippet, /SINGS 'Happy Birthday'/);

  const s2 = byScene('2');
  assert.equal(s2.length, 1);
  assert.equal(s2[0].category, 'phone');
  assert.match(s2[0].snippet, /PHONE RINGS/);
  assert.ok(s2[0].characters.includes('MARTA'));

  const s3 = byScene('3');
  assert.equal(s3.length, 1);
  assert.equal(s3[0].category, 'sfx-reaction');
  assert.equal(s3[0].trigger, 'gunshot');
  assert.equal(s3[0].confidence, 'high');
  assert.match(s3[0].snippet, /GUNSHOT\. Everyone ducks\./);

  assert.deepEqual(byScene('4'), []);
});

test('sound: moments carry spec rev e anchors', async () => {
  const { spot } = await spotted();
  for (const m of spot.sound.moments) {
    assert.equal(m.anchor.source_doc, 'fixture.pdf');
    assert.equal(m.anchor.page, 1);
    const [x0, y0, x1, y1] = m.anchor.bbox;
    assert.ok(x0 < x1 && y0 < y1);
    assert.ok(y0 > 0 && y1 < 792);
    assert.equal(m.dismissed, false);
  }
});
