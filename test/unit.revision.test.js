// Peter's revision-star ruling (2026-07-26, real-script pass): margin
// asterisks mark revised lines, not text. A starred cue is still that
// character; a starred heading still parses; nothing chips on a star.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';

async function parsed() {
  const sp = new Screenplay();
  sp.page()
    .slugNumbered('7', 'INT. LAB - NIGHT')
    .star()
    .blank()
    .action('Victor circles the table.')
    .star()
    .blank()
    .cue('VICTOR')
    .star()
    .dialogue('Run it again.')
    .star()
    .blank()
    .cue('TONY STARBUCK *')
    .dialogue('Not a chance.')
    .blank()
    .cue('DANA')
    .dialogue('Boys. Focus.');
  return parseShow(await extractRuns(sp.build()));
}

test('revision stars: starred cues seat, starred headings parse, no chips', async () => {
  const p = await parsed();
  assert.equal(p.scenes.length, 1);
  assert.equal(p.scenes[0].id, '7');
  assert.equal(p.scenes[0].heading, 'INT. LAB - NIGHT');
  assert.deepEqual(p.scenes[0].characters_speaking, ['VICTOR', 'TONY STARBUCK', 'DANA']);
  assert.deepEqual(p.rejects, []);
});
