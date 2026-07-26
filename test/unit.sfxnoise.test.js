// Peter's sound ruling (2026-07-26): sound moments are only sounds a
// character reacts to, or performs (playback). Scenery sounds, montage
// caps, and intro caps without a reaction never flag. Adjacent caps
// flags with a reaction in reach coalesce into one moment.

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
    .action('The METAL DOOR groans open. Myron freezes.')
    .action('A RUSTY CHAIN swings against the frame.')
    .blank()
    .cue('MYRON')
    .dialogue('Hello?')
    .blank()
    .slug('EXT. STREET - NIGHT')
    .blank()
    .action('A distant GUNSHOT. Myron ducks.')
    .blank()
    .cue('MYRON')
    .dialogue('Go, go!')
    .blank()
    .slug('INT. BEDROOM - DAWN')
    .blank()
    .action('A siren wails somewhere far off in the sleeping city.')
    .blank()
    .cue('MYRON')
    .dialogue('Five more minutes.');
  const parsed = parseShow(await extractRuns(sp.build()));
  return spotShow(parsed);
}

test('montage caps and intro caps without reaction never flag', async () => {
  const spot = await spotted();
  assert.deepEqual(
    spot.sound.moments.filter((m) => m.scene === '1'),
    [],
  );
});

test('caps with a reaction in reach coalesce into one medium moment', async () => {
  const spot = await spotted();
  const s2 = spot.sound.moments.filter((m) => m.scene === '2');
  assert.equal(s2.length, 1);
  assert.equal(s2[0].confidence, 'medium');
  assert.match(s2[0].snippet, /METAL DOOR[\s\S]*RUSTY CHAIN/);
});

test('lexicon sound with reaction is high; without reaction it is nothing', async () => {
  const spot = await spotted();
  const s3 = spot.sound.moments.filter((m) => m.scene === '3');
  assert.equal(s3.length, 1);
  assert.equal(s3[0].trigger, 'gunshot');
  assert.equal(s3[0].confidence, 'high');
  assert.deepEqual(
    spot.sound.moments.filter((m) => m.scene === '4'),
    [],
  );
});
