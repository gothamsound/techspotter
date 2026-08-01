// Operator-edit ops through a real parse: toggle keeps the roster, rename
// moves identity, delete removes the column, merge unions scenes and
// dialogue and retires the offer, dismissed offers stay dismissed.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import {
  toggleSpeaker,
  renameCharacter,
  deleteCharacter,
  mergeCharacters,
  dismissOffer,
} from '../src/parser/edits.js';

async function parsedFixture() {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. LAB - NIGHT')
    .blank()
    .cue('VICTOR')
    .dialogue('Run it.')
    .blank()
    .cue('DANA')
    .dialogue('Running.')
    .blank()
    .slug('INT. LAB - LATER')
    .blank()
    .cue('VICTOR')
    .dialogue('Anything?')
    .blank()
    .slug('EXT. ROOF - DAWN')
    .blank()
    .cue('DANA')
    .dialogue('He was here.')
    .blank()
    .cue('VICTOR HALE')
    .dialogue('It ends now.');
  return parseShow(await extractRuns(sp.build()));
}

test('toggle: cell edits stick and a zeroed character keeps their column', async () => {
  const p = await parsedFixture();
  toggleSpeaker(p, '1', 'DANA');
  assert.ok(!p.scenes[0].characters_speaking.includes('DANA'));
  toggleSpeaker(p, '3', 'DANA');
  const dana = p.characters.find((c) => c.name === 'DANA');
  assert.equal(dana.scene_count, 0);
  toggleSpeaker(p, '2', 'DANA');
  assert.equal(p.characters.find((c) => c.name === 'DANA').scene_count, 1);
});

test('rename: identity moves, collision refuses', async () => {
  const p = await parsedFixture();
  renameCharacter(p, 'DANA', 'Det. Dana Cruz');
  assert.ok(p.characters.some((c) => c.name === 'DET. DANA CRUZ'));
  assert.ok(!p.characters.some((c) => c.name === 'DANA'));
  assert.ok(p.scenes[0].characters_speaking.includes('DET. DANA CRUZ'));
  assert.match(p.scenes[0].dialogue_by_character['DET. DANA CRUZ'], /Running\./);
  assert.throws(() => renameCharacter(p, 'DET. DANA CRUZ', 'VICTOR'), /already exists/);
});

test('delete: column and dialogue go, scenes stay', async () => {
  const p = await parsedFixture();
  deleteCharacter(p, 'DANA');
  assert.ok(!p.characters.some((c) => c.name === 'DANA'));
  assert.ok(!p.scenes.some((s) => s.characters_speaking.includes('DANA')));
  assert.equal(p.scenes.length, 3);
});

test('merge: scenes union, dialogue concatenates, offer retires', async () => {
  const p = await parsedFixture();
  assert.equal(p.merge_offers.length, 1);
  mergeCharacters(p, 'VICTOR HALE', 'VICTOR');
  assert.ok(!p.characters.some((c) => c.name === 'VICTOR HALE'));
  const victor = p.characters.find((c) => c.name === 'VICTOR');
  assert.deepEqual(victor.scenes, ['1', '2', '3']);
  assert.match(p.scenes[2].dialogue_by_character.VICTOR, /It ends now\./);
  assert.deepEqual(p.merge_offers, []);
});

test('dismissed offer stays dismissed across later edits', async () => {
  const p = await parsedFixture();
  dismissOffer(p, 'VICTOR HALE', 'VICTOR');
  assert.deepEqual(p.merge_offers, []);
  toggleSpeaker(p, '1', 'VICTOR');
  toggleSpeaker(p, '1', 'VICTOR');
  assert.deepEqual(p.merge_offers, []);
});

test('column order: operator moves survive recompute; new names append', async () => {
  const { moveCharacter, toggleSpeaker: toggle } = await import('../src/parser/edits.js');
  const p = await parsedFixture();
  const names = () => p.characters.map((c) => c.name);
  const start = names();
  assert.ok(start.length >= 2);
  moveCharacter(p, start[0], 1);
  const moved = names();
  assert.equal(moved[1], start[0]);
  // Any edit triggers recompute; the operator's order must hold.
  toggle(p, p.scenes[0].id, moved[0]);
  assert.deepEqual(names(), moved);
  // Edges are no-ops, not errors.
  moveCharacter(p, names()[0], -1);
  assert.deepEqual(names(), moved);
});
