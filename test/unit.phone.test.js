// Peter's far-end ruling (2026-07-26): attribution on explicit signals
// only; printed channel-variant cue strings ARE the far-end markers.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { spotShow } from '../src/spot/index.js';

async function spotted() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. CAR - NIGHT')
    .blank()
    .cue('VICTOR')
    .paren('(into phone)')
    .dialogue('Where are you?')
    .blank()
    .slug('INT. OFFICE - DAY')
    .blank()
    .action('Victor calls Dana.')
    .blank()
    .cue('VICTOR')
    .dialogue('Pick up, pick up.')
    .blank()
    .cue('DANA')
    .dialogue('This better be good.')
    .blank()
    .slug('INT. APARTMENT - NIGHT')
    .blank()
    .action('The PHONE RINGS.')
    .blank()
    .cue('MARTA')
    .dialogue('Hello?')
    .blank()
    .cue('DANA (V.O.)')
    .dialogue('Do not hang up.')
    .blank()
    .slug('EXT. STREET - DAY')
    .blank()
    .transition('INTERCUT - PHONE CALL')
    .blank()
    .cue('VICTOR')
    .dialogue('Talk to me.');
  const parsed = parseShow(await extractRuns(sp.build()));
  return spotShow(parsed);
}

test('phone: paren attributes the speaker', async () => {
  const spot = await spotted();
  const s1 = spot.sound.moments.filter((m) => m.scene === '1');
  assert.equal(s1.length, 1);
  assert.equal(s1[0].category, 'phone');
  assert.equal(s1[0].trigger, '(into phone)');
  assert.deepEqual(s1[0].characters, ['VICTOR']);
});

test('phone: "calls NAME" attributes both named parties', async () => {
  const spot = await spotted();
  const s2 = spot.sound.moments.filter((m) => m.scene === '2');
  assert.equal(s2.length, 1);
  assert.ok(s2[0].characters.includes('VICTOR'));
  assert.ok(s2[0].characters.includes('DANA'));
});

test('phone: printed channel-variant cue is the far-end marker', async () => {
  const spot = await spotted();
  const s3 = spot.sound.moments.filter((m) => m.scene === '3');
  assert.equal(s3.length, 1);
  // MARTA answers the ring but has NO explicit signal on the trigger line;
  // the ruling forbids proximity attribution, so only the printed channel
  // variant attaches.
  assert.deepEqual(s3[0].characters, ['DANA (V.O.)']);
});

test('phone: INTERCUT - PHONE opens a moment', async () => {
  const spot = await spotted();
  const s4 = spot.sound.moments.filter((m) => m.scene === '4');
  assert.equal(s4.length, 1);
  assert.equal(s4[0].trigger, 'intercut phone');
});
