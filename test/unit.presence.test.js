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

test('presence: the cell cycle loops with every state reachable', async () => {
  const p = await parsed();
  cycleCell(p, '1', 'DANA'); // suggested -> confirmed
  assert.deepEqual(p.scenes[0].present_confirmed, ['DANA']);
  assert.deepEqual(p.scenes[0].present_suggest, []);
  cycleCell(p, '1', 'DANA'); // confirmed -> empty, dismissal sticks
  assert.deepEqual(p.scenes[0].present_confirmed, []);
  assert.ok(!p.scenes[0].characters_speaking.includes('DANA'));
  assert.deepEqual(p.scenes[0].present_suggest, []);
  cycleCell(p, '1', 'DANA'); // empty -> speaking
  assert.ok(p.scenes[0].characters_speaking.includes('DANA'));
  cycleCell(p, '1', 'DANA'); // speaking -> present again (the Patrick loop)
  assert.ok(!p.scenes[0].characters_speaking.includes('DANA'));
  assert.deepEqual(p.scenes[0].present_confirmed, ['DANA']);
});

test('presence: settable where the parser suggested nothing', async () => {
  const p = await parsed();
  // WANDA is never named in scene 2's action: no suggestion exists.
  assert.ok(!p.scenes[1].present_suggest?.includes('WANDA'));
  cycleCell(p, '2', 'WANDA'); // empty -> speaking
  cycleCell(p, '2', 'WANDA'); // speaking -> present, no lines
  assert.ok(!p.scenes[1].characters_speaking.includes('WANDA'));
  assert.deepEqual(p.scenes[1].present_confirmed, ['WANDA']);
});
