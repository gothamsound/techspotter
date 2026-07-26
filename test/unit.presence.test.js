// Non-speaking presence: named in action without a cue = suggested
// present (spec present_suggest); the cell cycle is suggested ->
// confirmed -> speaking -> empty (dismissed) -> speaking.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { cycleCell } from '../src/parser/edits.js';

async function parsed() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. LAB - NIGHT')
    .blank()
    .action('Victor works. Dana watches from the doorway.')
    .blank()
    .cue('VICTOR')
    .dialogue('Almost there.')
    .blank()
    .slug('EXT. ROOF - DAWN')
    .blank()
    .cue('DANA')
    .dialogue('He was here.')
    .blank()
    .cue('VICTOR')
    .dialogue('Noted.');
  return parseShow(await extractRuns(sp.build()));
}

test('presence: named in action without a cue suggests present', async () => {
  const p = await parsed();
  assert.deepEqual(p.scenes[0].present_suggest, ['DANA']);
  // Victor is named in action too, but he SPEAKS in scene 1: no suggestion.
  assert.ok(!p.scenes[0].present_suggest.includes('VICTOR'));
  assert.deepEqual(p.scenes[1].present_suggest, []);
});

test('presence: the cell cycle advances and dismissal sticks', async () => {
  const p = await parsed();
  cycleCell(p, '1', 'DANA'); // suggested -> confirmed
  assert.deepEqual(p.scenes[0].present_confirmed, ['DANA']);
  assert.deepEqual(p.scenes[0].present_suggest, []);
  cycleCell(p, '1', 'DANA'); // confirmed -> speaking
  assert.ok(p.scenes[0].characters_speaking.includes('DANA'));
  cycleCell(p, '1', 'DANA'); // speaking -> empty, suggestion dismissed
  assert.ok(!p.scenes[0].characters_speaking.includes('DANA'));
  assert.deepEqual(p.scenes[0].present_suggest, []);
  cycleCell(p, '1', 'DANA'); // empty -> speaking again
  assert.ok(p.scenes[0].characters_speaking.includes('DANA'));
});
