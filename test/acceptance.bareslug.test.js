// Brief §8.2: an unnumbered table-read export gets sequential string ids;
// the same document with ONE numbered heading flips to numbered mode,
// where bare slugs inside action are context, never boundaries.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';

function bareFixture() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. EVIDENCE LAB - NIGHT')
    .blank()
    .cue('VICTOR')
    .dialogue('Talk to me.')
    .blank()
    .slug('EXT. ALLEY - NIGHT')
    .blank()
    .action('Rain.')
    .blank()
    .cue('DANA')
    .dialogue('He was here.')
    .blank()
    .slug('INT. DINER - DAY')
    .blank()
    .cue('VICTOR')
    .dialogue('Coffee. Black.');
  return sp.build();
}

function oneNumberedFixture() {
  const sp = new Screenplay();
  sp.page()
    .slugNumbered('5', 'INT. STATION - DAY')
    .blank()
    .action('Chaos. Phones ringing.')
    .blank()
    .cue('VICTOR')
    .dialogue('Quiet!')
    .blank()
    .action('He pins a map to the board.', 'INT. EVIDENCE LAB - NIGHT', 'is scrawled beneath a photo.')
    .blank()
    .cue('DANA')
    .dialogue('On it.');
  return sp.build();
}

test('bare-slug export: sequential string ids', async () => {
  const parsed = parseShow(await extractRuns(bareFixture()));
  assert.equal(parsed.mode, 'bare-slug');
  assert.deepEqual(
    parsed.scenes.map((s) => s.id),
    ['1', '2', '3'],
  );
  for (const s of parsed.scenes) assert.equal(typeof s.id, 'string');
  assert.deepEqual(parsed.scenes[0].characters_speaking, ['VICTOR']);
  assert.deepEqual(parsed.scenes[1].characters_speaking, ['DANA']);
  assert.deepEqual(parsed.scenes[2].characters_speaking, ['VICTOR']);
});

test('one numbered heading: bare slugs in action do not open scenes', async () => {
  const parsed = parseShow(await extractRuns(oneNumberedFixture()));
  assert.equal(parsed.mode, 'numbered');
  assert.equal(parsed.scenes.length, 1);
  assert.equal(parsed.scenes[0].id, '5');
  assert.deepEqual(parsed.scenes[0].characters_speaking, ['VICTOR', 'DANA']);
  assert.match(parsed.scenes[0].action_text, /INT\. EVIDENCE LAB - NIGHT/);
});
