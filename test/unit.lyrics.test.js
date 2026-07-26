// Peter's lyrics ruling (2026-07-26): four signals, contiguous flagged
// lines coalesce into ONE playback moment per block, ranked confidence,
// one dismiss kills the block.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { spotShow } from '../src/spot/index.js';

async function spotted() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. STAGE - NIGHT')
    .blank()
    .cue('VALERIE')
    .paren('(singing)')
    .dialogue('Happy birthday to you', 'happy birthday to you', 'happy birthday dear Victor')
    .blank()
    .slug('INT. NURSERY - NIGHT')
    .blank()
    .cue('DANA')
    .dialogueItalic('Row row row your boat,', 'gently down the stream.')
    .blank()
    .slug('INT. CAR - DAY')
    .blank()
    .cue('VICTOR')
    .dialogue('"And the wheels go round,"', '"round into the dark,"')
    .blank()
    .slug('INT. CAMPFIRE - NIGHT')
    .blank()
    .cue('DANA')
    .dialogue('And the river runs', 'down to the valley', 'where nobody goes')
    .blank()
    .slug('INT. OFFICE - DAY')
    .blank()
    .cue('VICTOR')
    .dialogue('I already told you everything.', "It was dark. I could not see.")
    .blank()
    .cue('DANA')
    .dialogue('You good', 'Yeah');
  const parsed = parseShow(await extractRuns(sp.build()));
  return spotShow(parsed);
}

test('lyrics: each signal fires, one coalesced moment per block', async () => {
  const spot = await spotted();
  const playback = (id) =>
    spot.sound.moments.filter((m) => m.scene === id && m.category === 'playback');

  const s1 = playback('1');
  assert.equal(s1.length, 1);
  assert.equal(s1[0].trigger, '(singing)');
  assert.equal(s1[0].confidence, 'high');
  assert.deepEqual(s1[0].characters, ['VALERIE']);
  assert.ok(s1[0].line_anchors.length >= 3);

  const s2 = playback('2');
  assert.equal(s2.length, 1);
  assert.equal(s2[0].trigger, 'italic lyrics');
  assert.equal(s2[0].confidence, 'medium');

  const s3 = playback('3');
  assert.equal(s3.length, 1);
  assert.equal(s3[0].trigger, 'quoted lyrics');

  const s4 = playback('4');
  assert.equal(s4.length, 1);
  assert.equal(s4[0].trigger, 'verse shape');
  assert.equal(s4[0].confidence, 'low');
});

test('lyrics: ordinary dialogue and short two-line exchanges never flag', async () => {
  const spot = await spotted();
  assert.deepEqual(
    spot.sound.moments.filter((m) => m.scene === '5'),
    [],
  );
});
