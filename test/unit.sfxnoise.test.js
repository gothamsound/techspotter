// Caps-convention noise control (Peter's real-script findings): montage
// caps runs are not sounds, and adjacent caps-only flags coalesce into
// one moment. Lexicon-based sounds stay per-line and high-confidence.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { spotShow } from '../src/spot/index.js';

async function spotted() {
  const sp = new Screenplay();
  sp.page()
    .slug('EXT. DRIVEWAY - VARIOUS - DAY')
    .blank()
    .action('MYRON SHOOTING HOOPS IN HIS DRIVEWAY OVER THE YEARS. With his')
    .action('DAD, alone, then late at night.')
    .blank()
    .cue('MYRON')
    .dialogue('One more.')
    .blank()
    .slug('INT. BASEMENT - NIGHT')
    .blank()
    .action('The METAL DOOR groans open somewhere above.')
    .action('A RUSTY CHAIN swings against the frame.')
    .blank()
    .cue('MYRON')
    .dialogue('Hello?')
    .blank()
    .slug('EXT. STREET - NIGHT')
    .blank()
    .action('A distant GUNSHOT. Myron ducks.')
    .action('A second GUNSHOT answers it.')
    .blank()
    .cue('MYRON')
    .dialogue('Go, go!');
  const parsed = parseShow(await extractRuns(sp.build()));
  return spotShow(parsed);
}

test('montage caps runs are not sounds; the leftover intro coalesces to one card', async () => {
  const spot = await spotted();
  const s1 = spot.sound.moments.filter((m) => m.scene === '1');
  assert.equal(s1.length, 1);
  assert.equal(s1[0].category, 'sfx-reaction');
  assert.equal(s1[0].trigger, 'DAD');
  assert.equal(s1[0].confidence, 'low');
});

test('adjacent caps-only lines coalesce into a single moment', async () => {
  const spot = await spotted();
  const s2 = spot.sound.moments.filter((m) => m.scene === '2');
  assert.equal(s2.length, 1);
  assert.match(s2[0].snippet, /METAL DOOR[\s\S]*RUSTY CHAIN/);
  assert.ok(s2[0].line_anchors.length === 2);
});

test('lexicon sounds stay per-line and high-confidence', async () => {
  const spot = await spotted();
  const s3 = spot.sound.moments.filter((m) => m.scene === '3');
  assert.equal(s3.length, 2);
  assert.ok(s3.every((m) => m.trigger === 'gunshot'));
  assert.deepEqual(
    s3.map((m) => m.confidence),
    ['high', 'medium'],
  );
});
