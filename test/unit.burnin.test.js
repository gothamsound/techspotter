// Burn-in stripping (Peter's real-script finding): per-page recipient
// stamps must not glue onto action lines. Repeated-position mixed-case
// text strips and surfaces; rotated text strips regardless of count;
// single capital letters are left for the brief's cue gate (test 8.4
// keeps its chip).

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';

function stamped(pages, opts = {}) {
  const sp = new Screenplay();
  const times = ['NIGHT', 'DAY', 'DUSK', 'DAWN', 'LATER', 'MORNING'];
  for (let i = 1; i <= pages; i++) {
    sp.page()
      .header(`${i}.`)
      .slugNumbered(String(i), `INT. EXAM ROOM - ${times[i % times.length]}`);
    sp.burnin('Tony Starbuck', { x: 108, y: 690, ...opts });
    // realistic: content varies and drifts per page; only the stamp
    // repeats. No line ends in a bare "N." token: a trailing printed-page
    // token on the stamp's line would (correctly) arm the running-header
    // exemption, which has its own test.
    sp.blank(1 + (i % 3))
      .action(`Nothing but the hum of fluorescent light in hour ${i} tonight.`)
      .blank()
      .cue('VICTOR')
      .dialogue(`Start clock number ${i} now.`);
  }
  return sp.build();
}

test('stamped burn-in strips from text and surfaces once', async () => {
  const p = parseShow(await extractRuns(stamped(5)));
  assert.equal(p.burn_ins.length, 1);
  assert.equal(p.burn_ins[0].text, 'Tony Starbuck');
  assert.equal(p.burn_ins[0].pages, 5);
  for (const sc of p.scenes) {
    assert.ok(!/Tony Starbuck/.test(sc.text), 'scene text must be clean');
    assert.match(sc.action_text, /Nothing but the hum/);
  }
  assert.ok(!p.characters.some((c) => /TONY/.test(c.name)));
  assert.ok(p.scenes.every((s) => !s.present_suggest.includes('TONY STARBUCK')));
});

test('below the page threshold nothing strips', async () => {
  const p = parseShow(await extractRuns(stamped(3)));
  assert.deepEqual(p.burn_ins, []);
  assert.match(p.scenes[0].text, /Tony Starbuck/);
});

test('rotated watermarks strip regardless of page count', async () => {
  const sp = new Screenplay();
  sp.page()
    .slug('INT. LAB - NIGHT')
    .blank()
    .action('Victor studies the board.');
  sp.burnin('Property of Pat Recipient', { x: 200, y: 400, rotate: true });
  sp.blank().cue('VICTOR').dialogue('Interesting.');
  const p = parseShow(await extractRuns(sp.build()));
  assert.equal(p.burn_ins.length, 1);
  assert.match(p.burn_ins[0].text, /Pat Recipient/);
  assert.ok(!/Pat Recipient/.test(p.scenes[0].text));
});
