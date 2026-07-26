// Brief §8.4: a per-page watermark letter in the cue band is rejected as
// single-letter debris, aggregated to ONE chip (not one per page), and it
// must not steal the dialogue block it interrupts.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';

function fixture() {
  const sp = new Screenplay();
  const times = ['NIGHT', 'DAY', 'DUSK', 'DAWN', 'LATER', 'NIGHT'];
  for (let i = 1; i <= 6; i++) {
    // realistic page flow: content drifts and varies; only the watermark
    // letter repeats in the cue band (all-caps single glyph = the brief's
    // §3.2 gate territory, exempt from burn-in stripping)
    sp.page()
      .header(`${i}.`)
      .slugNumbered(String(i), `INT. SAFEHOUSE - ${times[i - 1]}`)
      .blank(1 + (i % 2))
      .cue('VICTOR')
      .dialogue(`We move at dawn, remember plan ${i}.`)
      .cue('S')
      .dialogue(`Stay close to me on stairwell ${i}.`);
  }
  return sp.build();
}

test('watermark letter: one aggregated chip, dialogue not stolen', async () => {
  const parsed = parseShow(await extractRuns(fixture()));

  const sChips = parsed.rejects.filter((r) => r.name === 'S');
  assert.equal(sChips.length, 1);
  assert.equal(sChips[0].reason, 'single letter (watermark?)');
  assert.equal(sChips[0].occurrences.length, 6);

  assert.deepEqual(
    parsed.characters.map((c) => c.name),
    ['VICTOR'],
  );
  assert.equal(parsed.characters[0].scene_count, 6);

  for (const scene of parsed.scenes) {
    assert.match(scene.dialogue_by_character.VICTOR, /We move at dawn/);
    assert.match(scene.dialogue_by_character.VICTOR, /Stay close to me/);
  }
});
