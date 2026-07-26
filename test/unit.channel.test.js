// Peter's MB TONY STARBUCK-pass rulings (2026-07-26), TechSpotter
// presentation layer: channel variants offer a fold into their base
// (offer-only, never automatic); TEXT-channel cues are conversion
// candidates whose message content becomes a phone-screen video moment.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { textChannelNames } from '../src/parser/characters.js';
import { mergeCharacters } from '../src/parser/edits.js';
import { spotShow } from '../src/spot/index.js';

async function parsedFixture() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. LOFT - NIGHT')
    .blank()
    .cue('MYRON')
    .dialogue('Pick up. Pick up.')
    .blank()
    .cue('MYRON (ON THE PHONE)')
    .dialogue('Where is she?')
    .blank()
    .cue("MYRON'S TEXT")
    .dialogue('On my way. Do not move.')
    .blank()
    .cue("WIN'S VOICE")
    .dialogue('Articulate your position.')
    .blank()
    .cue('WIN')
    .dialogue('As I said.');
  return parseShow(await extractRuns(sp.build()));
}

test('ON THE PHONE collapses silently; VOICE offers; TEXT converts', async () => {
  const p = await parsedFixture();
  // Peter's ruling: INTERCUT / PRELAP / ON THE PHONE are ALWAYS the same
  // character — no separate column, no offer, dialogue accrues to the base.
  assert.ok(!p.characters.some((c) => c.name === 'MYRON (ON THE PHONE)'));
  assert.match(p.scenes[0].dialogue_by_character.MYRON, /Where is she\?/);
  const offers = p.merge_offers.filter((o) => o.channel);
  assert.deepEqual(offers, [
    { variant: "WIN'S VOICE", canonical: 'WIN', channel: true },
  ]);
  assert.ok(!p.merge_offers.some((o) => o.variant === "MYRON'S TEXT"));
});

test('TEXT-channel columns are conversion candidates', async () => {
  const p = await parsedFixture();
  assert.deepEqual(textChannelNames(p.characters), ["MYRON'S TEXT"]);
});

test('TEXT-channel cue emits a phone-screen moment with the message', async () => {
  const p = await parsedFixture();
  const spot = spotShow(p);
  const texts = spot.video.moments.filter((m) => m.trigger === 'text-channel cue');
  assert.equal(texts.length, 1);
  assert.equal(texts[0].category, 'phone-screen');
  assert.match(texts[0].snippet, /On my way\. Do not move\./);
  assert.deepEqual(texts[0].characters, ["MYRON'S TEXT"]);
});

test('committing a channel offer folds scenes and dialogue', async () => {
  const p = await parsedFixture();
  mergeCharacters(p, "WIN'S VOICE", 'WIN');
  assert.ok(!p.characters.some((c) => c.name === "WIN'S VOICE"));
  assert.match(p.scenes[0].dialogue_by_character.WIN, /Articulate your position\./);
});
