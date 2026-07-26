// Brief §8.5: surname-form variants get an offer-only merge suggestion
// with the more-used name as canonical; qualifier variants (YOUNG X) and
// parenthetical variants (X (ON TV)) stay distinct with no offer.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';

function fixture() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. GYM - DAY')
    .blank()
    .cue('VICTOR')
    .dialogue('Again.')
    .blank()
    .cue('VALERIE')
    .dialogue('Watch me.')
    .blank()
    .slug('INT. GYM - LATER')
    .blank()
    .cue('VICTOR')
    .dialogue('Better.')
    .blank()
    .cue('YOUNG VALERIE')
    .dialogue('Wait for me!')
    .blank()
    .slug('EXT. STREET - DAY')
    .blank()
    .cue('VICTOR')
    .dialogue('Go home.')
    .blank()
    .cue('VALERIE')
    .dialogue('No.');
  sp.page()
    .slug('INT. APARTMENT - NIGHT')
    .blank()
    .cue('VICTOR')
    .dialogue('Lock the door.')
    .blank()
    .cue('VALERIE (ON TV)')
    .dialogue('...tonight at eleven.')
    .blank()
    .slug('INT. APARTMENT - LATER')
    .blank()
    .cue('VICTOR HALE')
    .dialogue('It ends now.')
    .blank()
    .cue('YOUNG VALERIE')
    .dialogue('Promise?')
    .blank()
    .cue('VALERIE')
    .dialogue('I promise.');
  return sp.build();
}

test('surname and channel variants offer; qualifier variants never do', async () => {
  const parsed = parseShow(await extractRuns(fixture()));

  assert.deepEqual(parsed.merge_offers, [
    { variant: 'VICTOR HALE', canonical: 'VICTOR' },
    { variant: 'VALERIE (ON TV)', canonical: 'VALERIE', channel: true },
  ]);
  assert.ok(!parsed.merge_offers.some((o) => o.variant === 'YOUNG VALERIE'));

  const names = parsed.characters.map((c) => c.name);
  assert.ok(names.includes('YOUNG VALERIE'));
  assert.ok(names.includes('VALERIE'));
  assert.ok(names.includes('VALERIE (ON TV)'));
  assert.ok(names.includes('VICTOR HALE'));
});
