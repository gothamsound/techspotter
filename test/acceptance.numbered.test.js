// Brief §8.1: numbered draft, 5 scenes incl. 22A. Ids stay strings,
// speakers correct, CONT'D collapses, printed page comes from the header
// zone (a body sentence ending in a number never wins).

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';

function fixture() {
  const sp = new Screenplay();
  sp.page()
    .header('"MYSHOW" - Ep. 101', 108)
    .header('12.')
    .slugNumbered('12', 'INT. EVIDENCE LAB - NIGHT')
    .blank()
    .action('Victor stares at the tox screen.')
    .blank()
    .cue('VICTOR')
    .dialogue("Bro, I'm 18.")
    .blank()
    .cue('DANA')
    .dialogue('Run it again.')
    .blank()
    .slugNumbered('13', 'EXT. PARKING GARAGE - NIGHT')
    .blank()
    .action('Dana circles a sedan.')
    .blank()
    .cue('DANA')
    .dialogue('Pop the trunk.')
    .blank()
    .slugNumbered('14', 'INT. LAB - NIGHT')
    .blank()
    .cue('VICTOR')
    .paren('(reading)')
    .dialogue('Match confirmed.')
    .blank()
    .cue("VICTOR (CONT'D)")
    .dialogue('Call it in.');
  sp.page()
    .header('"MYSHOW" - Ep. 101', 108)
    .header('13.')
    .slugNumbered('22A', 'INT. STATION - BULLPEN - DAY')
    .blank()
    .cue('NORA')
    .dialogue('Where is he?')
    .blank()
    .cue('VICTOR')
    .dialogue('Gone.')
    .blank()
    .slugNumbered('23', 'EXT. RIVERBANK - DAWN')
    .blank()
    .action('A search line combs the reeds.')
    .blank()
    .cue('DANA')
    .dialogue('Over here!')
    .blank()
    .transition('CUT TO:');
  return sp.build();
}

test('numbered draft: string ids incl. 22A, correct speakers', async () => {
  const parsed = parseShow(await extractRuns(fixture()));

  assert.equal(parsed.mode, 'numbered');
  assert.deepEqual(
    parsed.scenes.map((s) => s.id),
    ['12', '13', '14', '22A', '23'],
  );
  for (const s of parsed.scenes) assert.equal(typeof s.id, 'string');

  const byId = Object.fromEntries(parsed.scenes.map((s) => [s.id, s]));
  assert.deepEqual(byId['12'].characters_speaking, ['VICTOR', 'DANA']);
  assert.deepEqual(byId['13'].characters_speaking, ['DANA']);
  assert.deepEqual(byId['14'].characters_speaking, ['VICTOR']);
  assert.deepEqual(byId['22A'].characters_speaking, ['NORA', 'VICTOR']);
  assert.deepEqual(byId['23'].characters_speaking, ['DANA']);

  assert.match(byId['12'].dialogue_by_character.VICTOR, /Bro, I'm 18\./);
  assert.match(byId['14'].dialogue_by_character.VICTOR, /Call it in\./);

  assert.equal(byId['12'].page, 12);
  assert.equal(byId['22A'].page, 13);

  assert.deepEqual(parsed.rejects, []);
  assert.deepEqual(parsed.merge_offers, []);
  assert.deepEqual(
    parsed.characters.map((c) => c.name),
    ['VICTOR', 'DANA', 'NORA'],
  );
});
