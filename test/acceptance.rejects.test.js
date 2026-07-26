// Brief §8.3 plus the wide gate: cue-shaped lines that fail a gate are
// absent from the matrix but on the reject rail with the gate named, and
// one-click add (promoteReject) brings them in with their scenes marked.
// Furniture in cue position is structural: no character, no chip.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { promoteReject } from '../src/parser/edits.js';

function fixture() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. WAREHOUSE - NIGHT')
    .blank()
    .cue('EPISODE 101')
    .dialogue('Previously, on our show.')
    .blank()
    .cue('VICTOR')
    .dialogue('Everybody down!')
    .blank()
    .cue('MERC #1')
    .dialogue('Move! Move!')
    .blank()
    .slug('INT. HR OFFICE - DAY')
    .blank()
    .cue('ELEANOR FROM HR')
    .dialogue('Sign here, please.')
    .blank()
    .cue('VICTOR')
    .dialogue('Fine.')
    .blank()
    .slug('INT. KARAOKE BAR - NIGHT')
    .blank()
    .cue('GIRLS/CASSIDY')
    .paren('(singing)')
    .dialogue('Happy birthday to you...')
    .blank()
    .dualCue('LOLA', 'DENNY')
    .dialogue('What?')
    .blank()
    .cue('MAN IN BLACK')
    .dialogue('You were told not to come.');
  return sp.build();
}

test('gate rejects surface with reasons; matrix stays clean', async () => {
  const parsed = parseShow(await extractRuns(fixture()));

  // Epithet characters with prepositions are real (Peter's ruling): MAN IN
  // BLACK is a column, not a chip.
  assert.deepEqual(
    parsed.characters.map((c) => c.name).sort(),
    ['MAN IN BLACK', 'VICTOR'],
  );

  const byName = Object.fromEntries(parsed.rejects.map((r) => [r.name, r]));
  assert.ok(!('MAN IN BLACK' in byName));
  assert.equal(byName['MERC #1'].reason, "charset '#'");
  assert.deepEqual(
    byName['MERC #1'].occurrences.map((o) => o.scene),
    ['1'],
  );
  assert.equal(byName['ELEANOR FROM HR'].reason, "word 'FROM'");
  assert.equal(byName['GIRLS/CASSIDY'].reason, "charset '/'");
  assert.equal(byName['LOLA  DENNY'].reason, 'wide (dual dialogue?)');

  assert.ok(!('EPISODE 101' in byName));
  assert.ok(!parsed.characters.some((c) => c.name === 'EPISODE 101'));
});

test('one-click add: promoted reject joins the matrix with its scenes', async () => {
  const parsed = parseShow(await extractRuns(fixture()));

  promoteReject(parsed, 'MERC #1');
  const merc = parsed.characters.find((c) => c.name === 'MERC #1');
  assert.ok(merc);
  assert.deepEqual(merc.scenes, ['1']);
  assert.ok(!parsed.rejects.some((r) => r.name === 'MERC #1'));

  promoteReject(parsed, 'ELEANOR FROM HR');
  const eleanor = parsed.characters.find((c) => c.name === 'ELEANOR FROM HR');
  assert.deepEqual(eleanor.scenes, ['2']);
});
