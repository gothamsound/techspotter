// Burn-in conformance against the hub corpus seed (scriptparse
// tests/test_burnin_evidence.py, issue #16 ruling; absorbed per issue
// #33). The hub's unit is the pdfplumber word; ours is the pdf.js text
// item. The parity obligation is conformance OUTCOMES, so each corpus
// case is rebuilt here at item granularity with the same synthetic text
// and the same asserted outcome. Fixture discipline mirrors the hub's:
// body prose varies per page from word one; cues and headings repeat at
// fixed positions on purpose (the mixed-case fence must spare them).

import test from 'node:test';
import assert from 'node:assert/strict';
import { Screenplay, X } from './fixtures/screenplay.js';
import { extractRuns } from './helpers/extract.js';
import { parseShow } from '../src/parser/parse.js';
import { groupLines } from '../src/parser/lines.js';
import { parseHeading } from '../src/parser/heading.js';

const STAMP = 'Prepared for A. Kessler - do not distribute';
const WATERMARK = 'Confidential Watermark';

const ACTIONS = ['Myron studies the readout, unimpressed.',
  'Across the bench, Myron thumbs the dial.',
  'A long beat while the plotter warms up.',
  'Rain taps the skylight and nobody looks up.',
  'The readout settles and everyone exhales.'];
const M_LINES = ['We keep the anchors honest.',
  'Bottom left origin, no exceptions.',
  'Quantize it and move on.',
  'Either the fixture proves it or it did not happen.',
  'Numbers, not vibes.'];
const W_LINES = ['Bottom left or bust.',
  'Flip at the boundary, never after.',
  'Read me the checksum.',
  'That stamp is not part of the scene.',
  'Ship the work order.'];

// One synthetic screenplay page: heading, action, two cues with dialogue.
// `stamp` lands on the first action line's baseline, left of the text
// margin — the "glued to the action line" form. `guest` adds a third
// speaker (the glue case needs a page whose recovery is visible in the
// speaker sets).
function page(sp, n, { stamp = null, numbered = true, guest = null } = {}) {
  const v = (n - 1) % 5;
  if (numbered) sp.slugNumbered(String(n), 'INT. LAB - NIGHT');
  else sp.slug('INT. LAB - NIGHT');
  sp.blank();
  if (stamp) sp.burnin(stamp, { x: 36, y: 696 });
  sp.action(ACTIONS[v]).blank();
  sp.cue('MYRON').dialogue(M_LINES[v]).blank();
  sp.cue('WANDA').dialogue(W_LINES[v]);
  if (guest) sp.blank().cue(guest).dialogue('Late to the bench, sorry.');
}

function build(pages, opts = {}) {
  const sp = new Screenplay();
  for (let n = 1; n <= pages; n++) {
    sp.page();
    page(sp, n, opts);
  }
  return sp.build();
}

function textHits(parsed, needle) {
  return parsed.scenes.reduce((sum, sc) => sum + sc.text.split(needle).length - 1, 0);
}

// Corpus: test_control_fixture_is_clean
test('control fixture is clean (negative control: nothing strips)', async () => {
  const p = parseShow(await extractRuns(build(5)));
  assert.deepEqual(p.characters.map((c) => c.name).sort(), ['MYRON', 'WANDA']);
  assert.equal(p.scenes.length, 5);
  assert.equal(textHits(p, STAMP), 0);
  assert.deepEqual(p.burn_ins, []);
});

// Corpus: test_stamped_pages_strip_to_a_surfaced_record
test('stamped pages strip to one surfaced record with anchor', async () => {
  const p = parseShow(await extractRuns(build(5, { stamp: STAMP })));
  assert.deepEqual(p.characters.map((c) => c.name).sort(), ['MYRON', 'WANDA']);
  assert.equal(textHits(p, STAMP), 0);
  const recs = p.burn_ins.filter((b) => b.signal === 'repeated-position');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].text, STAMP);
  assert.equal(recs[0].pages, 5);
  assert.equal(recs[0].count, 5);
  assert.equal(recs[0].anchor.page, 1);
  assert.ok(Array.isArray(recs[0].anchor.bbox));
});

// Corpus: test_rotated_watermark_no_longer_drops_a_speaker (3 placements)
for (const [label, x] of [['right-margin', 575], ['action-margin', 40], ['cue-band', 300]]) {
  test(`rotated watermark never drops a speaker (${label})`, async () => {
    const sp = new Screenplay();
    for (let n = 1; n <= 5; n++) {
      sp.page();
      page(sp, n);
      sp.burnin(WATERMARK, { x, y: 300, rotate: true });
    }
    const p = parseShow(await extractRuns(sp.build()));
    assert.deepEqual(p.characters.map((c) => c.name).sort(), ['MYRON', 'WANDA'], label);
    const speakers = new Set(p.scenes.flatMap((sc) => sc.characters_speaking));
    assert.ok(speakers.has('WANDA'));
    assert.equal(textHits(p, WATERMARK), 0);
    const recs = p.burn_ins.filter((b) => b.signal === 'rotated');
    assert.equal(recs.length, 1);
    assert.equal(recs[0].pages, 5);
    assert.equal(recs[0].text.replace(/ /g, ''), WATERMARK.replace(/ /g, ''));
  });
}

// Corpus: test_rotated_strip_happens_before_clustering — outcome form:
// rotated debris never reaches line clustering, so a single page (below
// any repeat threshold) still parses clean, chip-free, record surfaced.
test('rotated strip happens before clustering (single page, no debris)', async () => {
  const sp = new Screenplay();
  sp.page();
  page(sp, 1);
  sp.burnin(WATERMARK, { x: 575, y: 300, rotate: true });
  const p = parseShow(await extractRuns(sp.build()));
  assert.equal(p.scenes.length, 1);
  assert.deepEqual(p.rejects, []);
  assert.equal(textHits(p, WATERMARK), 0);
  assert.equal(p.burn_ins.filter((b) => b.signal === 'rotated').length, 1);
});

// Corpus: test_repeat_threshold_spares_short_documents
test('max(4, ceil(pages/2)) floor spares short documents', async () => {
  const p = parseShow(await extractRuns(build(3, { stamp: STAMP })));
  assert.equal(textHits(p, STAMP), 3);
  assert.deepEqual(p.burn_ins, []);
});

// Corpus: test_running_header_survives_and_page_start_reads (the Tier-3
// golden STOP, finding 1). Header prefix repeats mixed-case at a fixed
// position; the trailing page token varies and is a separate run on the
// same line — the trailing-page-token exemption keeps the header, and
// printed page numbers (offset from the sheet index so a sheet-index
// fallback cannot fake a pass) read from pre-strip lines.
test('running header survives; printed page numbers read pre-strip', async () => {
  const sp = new Screenplay();
  for (let n = 1; n <= 6; n++) {
    sp.page();
    sp.header('Escorted - 101 Pre-Table Draft (06/25/26)', X.headerTitle);
    sp.header(`${n + 2}.`, X.headerPage);
    page(sp, n, { stamp: STAMP });
  }
  const p = parseShow(await extractRuns(sp.build()));
  assert.deepEqual(p.scenes.map((sc) => sc.page), [3, 4, 5, 6, 7, 8]);
  const texts = p.burn_ins.map((b) => b.text);
  assert.ok(!texts.some((t) => t.includes('Pre-Table')), JSON.stringify(texts));
  assert.deepEqual(texts, [STAMP]);
  assert.ok(p.scenes.every((sc) => !sc.action_text.includes('Pre-Table')));
});

// Corpus: test_rotated_glue_on_heading_recovers_scene — the mb101
// mechanism (Tier-3 golden run, finding 2), plus the migration
// consequence issue #33 names as this bench's charter: a re-import of
// the fixed parse renumbers every scene after the recovery point and
// changes speaker sets by scene id. Bare slugs = ordinal ids, so the
// renumbering is visible.
test('rotated glue on a heading: scene recovers, renumbering surfaces', async () => {
  const sp = new Screenplay();
  // Casts vary after the glue point (mb101's shape) so the renumbering
  // consequence is visible in the speaker sets, not just the scene count.
  const guests = { 3: 'GLINDA', 4: 'HOLLIS' };
  for (let n = 1; n <= 5; n++) {
    sp.page();
    page(sp, n, { numbered: false, guest: guests[n] ?? null });
    if (n === 3) sp.burnin(WATERMARK, { x: 40, y: 719, rotate: true });
  }
  const pdf = sp.build();
  const rawPages = await extractRuns(pdf);

  // The mechanism, proven not assumed: WITH the debris treated as body
  // text (rot flag cleared), the page-3 heading line is unparseable.
  // pdf.js clips glyphs outside the MediaBox, so the debris is whatever
  // fragment of the watermark survived — read it from the runs.
  const fragment = rawPages[2].find((r) => r.rot).str.slice(0, 5);
  const polluted = rawPages.map((runs) => runs.map((r) => ({ ...r, rot: false })));
  const gluedLines = groupLines(polluted[2]).filter((l) => l.text.includes('INT.'));
  assert.ok(gluedLines.length >= 1);
  assert.ok(gluedLines.some((l) => l.text.includes(fragment)));
  assert.ok(!gluedLines.some((l) => parseHeading(l)));

  // Pre-fix consequence: the scene is lost, its speakers land in the
  // previous scene, and every later id points at different content.
  const before = parseShow(polluted);
  assert.equal(before.scenes.length, 4);
  assert.ok(before.scenes[1].characters_speaking.includes('GLINDA'));

  // With signal 1 the heading parses, the scene and its speakers come
  // back, ids after the recovery point renumber.
  const after = parseShow(rawPages);
  assert.equal(after.scenes.length, 5);
  assert.ok(after.scenes[2].heading.startsWith('INT. LAB'));
  assert.ok(after.scenes[2].characters_speaking.includes('GLINDA'));
  assert.ok(!after.scenes[1].characters_speaking.includes('GLINDA'));
  const speakersById = (p) => Object.fromEntries(
    p.scenes.map((sc) => [sc.id, [...sc.characters_speaking].sort()]),
  );
  assert.notDeepEqual(speakersById(after)['3'], speakersById(before)['3']);
  assert.notDeepEqual(speakersById(after)['4'], speakersById(before)['4']);
  assert.ok(after.burn_ins.some((b) => b.signal === 'rotated'));
});

// Corpus: test_all_caps_repeats_never_strip (the mixed-case fence)
test('all-caps repeats never strip', async () => {
  const sp = new Screenplay();
  for (let n = 1; n <= 5; n++) {
    sp.page();
    sp.header('SHOW CODE 102', X.headerTitle);
    page(sp, n);
  }
  const p = parseShow(await extractRuns(sp.build()));
  assert.deepEqual(p.burn_ins, []);
  assert.deepEqual(p.characters.map((c) => c.name).sort(), ['MYRON', 'WANDA']);
});

// Corpus: test_watermark_eaten_cue_is_silent_without_strip (hub #37,
// executed in scriptparse PR #38 — the Sceneline field validation's
// silent-loss class). A repeated-position glyph sits at one fixed spot;
// on ONE page a guest cue lands on that baseline, the way a real
// watermark crosses different lines on different pages. Pre-strip the
// glyph joins the cue's line cluster and drags minX out of the cue
// band, so the line never becomes a cue candidate and no reject is
// filed: the guest is absent from BOTH characters and rejects. The
// pre-strip parser is expressed through the policy's own short-document
// floor (3 pages < repeat_min_pages leaves signal 2 inert) — same
// fixture, same glyph, shipped defaults. With the strip armed (5 pages)
// the guest seats and the glyph surfaces on the burn_ins rail.
const GLYPH = 'draft';
const GLYPH_AT = { x: 120, y: 600 }; // cue baseline of the collision page

function collisionBuild(pages, collideAt) {
  const sp = new Screenplay();
  for (let n = 1; n <= pages; n++) {
    const v = (n - 1) % 5;
    sp.page();
    sp.slugNumbered(String(n), 'INT. LAB - NIGHT').blank();
    sp.burnin(GLYPH, GLYPH_AT);
    sp.action(ACTIONS[v]).blank();
    sp.cue('WANDA').dialogue(W_LINES[v]).blank();
    sp.cue('GLINDA').dialogue(M_LINES[v]);
    if (n === collideAt) {
      sp.blank().cue('MYRON').dialogue('One line, one page, one chance.');
    }
  }
  return sp.build();
}

test('watermark-eaten cue is silent without the strip; seated with it', async () => {
  // Without: the glyph survives, and the mechanism is proven, not
  // assumed — the glued cluster carries both texts and its minX falls
  // outside the cue band.
  const raw3 = await extractRuns(collisionBuild(3, 2));
  const glued = groupLines(raw3[1]).find((l) => l.text.includes('MYRON'));
  assert.ok(glued.text.includes(GLYPH), glued.text);
  assert.ok(glued.minX === GLYPH_AT.x && glued.minX < X.cue);
  const without = parseShow(raw3);
  assert.equal(without.scenes.length, 3);
  assert.ok(!without.characters.some((c) => c.name === 'MYRON'));
  assert.ok(!without.rejects.some((r) => r.name.includes('MYRON')));
  assert.deepEqual(without.characters.map((c) => c.name).sort(), ['GLINDA', 'WANDA']);
  assert.deepEqual(without.burn_ins, []);

  // With: same glyph, same collision, enough pages to arm signal 2.
  const withStrip = parseShow(await extractRuns(collisionBuild(5, 3)));
  assert.equal(withStrip.scenes.length, 5);
  assert.deepEqual(withStrip.characters.map((c) => c.name).sort(), ['GLINDA', 'MYRON', 'WANDA']);
  const seated = withStrip.scenes.find((sc) => sc.characters_speaking.includes('MYRON'));
  assert.equal(seated.id, '3');
  assert.equal(textHits(withStrip, GLYPH), 0);
  const recs = withStrip.burn_ins.filter((b) => b.signal === 'repeated-position');
  assert.equal(recs.length, 1);
  assert.equal(recs[0].text, GLYPH);
  assert.equal(recs[0].pages, 5);
});
