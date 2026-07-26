// The round-trip law (spec §3, CLAUDE.md hard rule 3): foreign extension
// blocks and unknown top-level fields survive import -> edit -> export
// VALUE-IDENTICALLY (deep-equal). Plus profiles, v1 acceptance, loud
// failures, and cast_aliases riding operator rulings.

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { spotShow } from '../src/spot/index.js';
import { mergeCharacters, dismissOffer, toggleSpeaker } from '../src/parser/edits.js';
import { buildSceneline, parseSceneline, IngestError } from '../src/export/sceneline.js';

async function freshShow() {
  const sp = new Screenplay();
  sp.page()
    .slugNumbered('12', 'INT. LAB - NIGHT')
    .blank()
    .action('Victor works the console. A distant GUNSHOT. Everyone ducks.')
    .blank()
    .cue('VICTOR')
    .dialogue('Run it again, and this time keep every channel open for me.')
    .blank()
    .cue('VICTOR HALE')
    .dialogue('It ends now.')
    .blank()
    .cue('DANA')
    .paren('(singing)')
    .dialogue(
      'Happy birthday to you, happy birthday to you,',
      'happy birthday dear Victor of the evidence lab,',
      'happy birthday, happy birthday, happy birthday to you.',
    );
  const parsed = parseShow(await extractRuns(sp.build()));
  const spot = spotShow(parsed, { sourceDoc: 'fixture.pdf' });
  return { parsed, spot };
}

const FOREIGN_EXT = {
  treatments: { 12: { mode: 'composite', why: 'rapid-fire', source: 'tablecut' } },
  seats: { rig: 'A', map: [{ seat: 1, mic: 'HH-3', cam: 2 }] },
  'x-mystery': { deep: { nested: [1, 2, { a: 'b', c: null }], flag: true } },
};
const FOREIGN_TOP = { future_field: { version: 9, data: ['keep', 'me'] } };

test('round-trip law: foreign blocks survive import -> edit -> export deep-equal', async () => {
  const { parsed, spot } = await freshShow();
  const original = buildSceneline(parsed, spot, {
    profile: 'full',
    sourceFile: 'fixture.pdf',
    created: '2026-07-26T00:00:00Z',
  });
  original.extensions = { ...original.extensions, ...structuredClone(FOREIGN_EXT) };
  Object.assign(original, structuredClone(FOREIGN_TOP));

  const imported = parseSceneline(JSON.stringify(original));
  toggleSpeaker(imported.parsed, '12', 'DANA');
  imported.spot.sound.moments[0].dismissed = true;

  const out = buildSceneline(imported.parsed, imported.spot, {
    profile: 'full',
    sourceFile: 'fixture.pdf',
    created: '2026-07-26T01:00:00Z',
    foreign: imported.foreign,
  });

  assert.deepEqual(out.extensions.treatments, FOREIGN_EXT.treatments);
  assert.deepEqual(out.extensions.seats, FOREIGN_EXT.seats);
  assert.deepEqual(out.extensions['x-mystery'], FOREIGN_EXT['x-mystery']);
  assert.deepEqual(out.future_field, FOREIGN_TOP.future_field);

  const scene = out.show.scenes.find((s) => s.scene === '12');
  assert.ok(!scene.speakers.includes('DANA'));
  assert.equal(out.extensions.sound.moments[0].dismissed, true);
});

test('profiles: lean omits text and truncates snippets to 120', async () => {
  const { parsed, spot } = await freshShow();
  const lean = buildSceneline(parsed, spot, { profile: 'lean', sourceFile: 'f.pdf', created: 'x' });
  const full = buildSceneline(parsed, spot, { profile: 'full', sourceFile: 'f.pdf', created: 'x' });

  assert.equal(lean.source.profile, 'lean');
  for (const s of lean.show.scenes) {
    assert.ok(!('dialogue_text' in s) && !('action_text' in s));
  }
  assert.ok(full.show.scenes.every((s) => 'dialogue_text' in s && 'action_text' in s));
  for (const m of [...lean.extensions.sound.moments, ...lean.extensions.video.moments]) {
    assert.ok(m.snippet.length <= 120);
  }
  const longFull = full.extensions.sound.moments.some((m) => m.snippet.length > 120);
  assert.ok(longFull, 'fixture should have a >120 char snippet to prove truncation');
});

test('cast_aliases: committed folds and keep-separate pins ride the file', async () => {
  const { parsed, spot } = await freshShow();
  mergeCharacters(parsed, 'VICTOR HALE', 'VICTOR');
  dismissOffer(parsed, 'YOUNG X', 'X');
  const out = buildSceneline(parsed, spot, { sourceFile: 'f.pdf', created: 'x' });
  assert.equal(out.show.cast_aliases['VICTOR HALE'], 'VICTOR');
  assert.equal(out.show.cast_aliases['YOUNG X'], null);
});

test('v1 files import; newer interchange and junk fail loudly', async () => {
  const v1 = {
    format: 'sceneline',
    source: { title: 'T' },
    show: {
      characters: ['A', 'B'],
      scenes: [{ scene: '1', scene_heading: 'INT. X - DAY', page_start: 1, speakers: ['A'] }],
    },
  };
  const got = parseSceneline(JSON.stringify(v1));
  assert.equal(got.interchange, 1);
  assert.deepEqual(got.parsed.scenes[0].characters_speaking, ['A']);
  assert.ok(got.parsed.characters.some((c) => c.name === 'B'));

  assert.throws(
    () => parseSceneline(JSON.stringify({ ...v1, interchange: 3 })),
    (e) => e instanceof IngestError && e.code === 'newer',
  );
  assert.throws(
    () => parseSceneline('not json {'),
    (e) => e instanceof IngestError && e.code === 'bad-json',
  );
  assert.throws(
    () => parseSceneline(JSON.stringify({ format: 'sceneline', show: { scenes: [] } })),
    (e) => e instanceof IngestError && e.code === 'empty',
  );
});
