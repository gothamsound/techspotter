// Heading edge cases that don't need a PDF: merged-run numbering, the
// HIGHWAY 101 trap, I/E. and INT./EXT. prefixes, INTO is not INT.

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHeading, isSlugText } from '../src/parser/heading.js';

function line(...segments) {
  return {
    segments: segments.map(([x0, text]) => ({ x0, x1: x0 + text.length * 7.2, text })),
  };
}

test('margin scene numbers, both sides', () => {
  const h = parseHeading(line([60, '22A'], [108, 'INT. LAB - NIGHT'], [552, '22A']));
  assert.deepEqual(h, { num: '22A', heading: 'INT. LAB - NIGHT' });
});

test('trailing right-margin number only', () => {
  const h = parseHeading(line([108, 'EXT. ROOF - DAY'], [552, '7']));
  assert.deepEqual(h, { num: '7', heading: 'EXT. ROOF - DAY' });
});

test('merged-run leading number', () => {
  const h = parseHeading(line([60, '14  INT. LAB - NIGHT']));
  assert.deepEqual(h, { num: '14', heading: 'INT. LAB - NIGHT' });
});

test('HIGHWAY 101 keeps its number, stays unnumbered', () => {
  const h = parseHeading(line([108, 'EXT. HIGHWAY 101 - DAY']));
  assert.deepEqual(h, { num: null, heading: 'EXT. HIGHWAY 101 - DAY' });
});

test('I/E. and INT./EXT. prefixes parse', () => {
  assert.ok(parseHeading(line([108, 'I/E. CAR - MOVING'])));
  assert.ok(parseHeading(line([108, 'INT./EXT. TRUCK - DAY'])));
});

test('INTO is not INT.', () => {
  assert.equal(parseHeading(line([108, 'INTO THE WOODS'])), null);
  assert.equal(isSlugText('INTO THE WOODS'), false);
});

test('mixed case is not a slug', () => {
  assert.equal(parseHeading(line([108, 'Int. Lab - Night'])), null);
});
