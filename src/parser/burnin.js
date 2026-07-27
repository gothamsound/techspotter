// Burn-in / watermark stripping — the scriptparse `burn_in` policy rule
// (hub issue #16 ruling), interpreted at this bench's natural unit: the
// pdf.js text item (the policy pins word-lower-left; parity obligation is
// conformance outcomes, per hub issue #33). Two signals, both applied to
// runs BEFORE line clustering, both surfaced loudly:
// - rotated runs strip unconditionally: screenplay body text is never
//   rotated;
// - repeated-position text: the same trimmed text in the same quantized
//   cell (floor(coord / grid), lower-left, anchor space) on at least
//   max(min_pages, ceil(pages * fraction)) pages. Candidates group per
//   page by y-bucket; the group strips only if its joined text contains
//   a lowercase letter (all-caps structure — cues, slugs — and single
//   capital letters never strip: the single-glyph cue gate keeps its
//   territory). A group on a line whose rightmost run ends in a printed-
//   page token ("6.", "6A.") is a running header and never strips.
// Record shape rides interchange rev g (§2 rule 7): text, signal, pages
// (distinct), count (total), anchor (first seen).

import { BURN_IN as B } from './policy.js';

const PAGE_TOKEN_RE = /^[A-Za-z]?\d+[A-Za-z]?\.$/;
const cell = (v) => Math.floor(v / B.repeat_grid_pt);
const runKey = (run) => `${run.str.trim()}|${cell(run.x)}|${cell(run.y)}`;
const runEnd = (run) => run.x + (run.width || 0);

export function stripBurnIns(pages) {
  const seen = new Map(); // repeat key -> Set of page indexes
  pages.forEach((runs, p) => {
    for (const run of runs) {
      if (run.rot) continue;
      const key = runKey(run);
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key).add(p);
    }
  });
  const threshold = Math.max(
    B.repeat_min_pages,
    Math.ceil(pages.length * B.repeat_page_fraction),
  );

  const records = new Map(); // signal|text -> record
  const note = (signal, text, page, bbox) => {
    const id = `${signal}|${text}`;
    if (!records.has(id)) {
      records.set(id, {
        text,
        signal,
        pageSet: new Set(),
        count: 0,
        anchor: { page, bbox },
      });
    }
    const r = records.get(id);
    r.pageSet.add(page);
    r.count += 1;
  };

  const cleaned = pages.map((runs, p) => {
    const strip = new Set();

    // Signal 1: rotated runs, one whole-text record per page group.
    const rotated = runs.filter((r) => r.rot);
    if (B.strip_rotated_runs && rotated.length) {
      for (const r of rotated) strip.add(r);
      const text = rotated.map((r) => r.str.trim()).filter(Boolean).join(' ');
      const first = rotated[0];
      note('rotated', text, p + 1, [
        first.x,
        first.y - 3,
        Math.max(...rotated.map(runEnd)),
        first.y + 9,
      ]);
    }

    // Signal 2: repeated-position groups per y-bucket.
    const byBucket = new Map();
    for (const run of runs) {
      if (run.rot) continue;
      const b = cell(run.y);
      if (!byBucket.has(b)) byBucket.set(b, []);
      byBucket.get(b).push(run);
    }
    for (const line of byBucket.values()) {
      let cands = line.filter((r) => seen.get(runKey(r)).size >= threshold);
      if (B.single_capital_exempt) {
        cands = cands.filter((r) => !/^[A-Z]$/.test(r.str.trim()));
      }
      if (!cands.length) continue;
      cands.sort((a, b2) => a.x - b2.x);
      const joined = cands.map((r) => r.str.trim()).join(' ');
      if (B.repeat_requires_lowercase && !/[a-z]/.test(joined)) continue;
      if (B.repeat_exempt_trailing_page_token) {
        const rightmost = line.reduce((m, r) => (runEnd(r) > runEnd(m) ? r : m));
        const lastWord = rightmost.str.trim().split(/\s+/).at(-1) ?? '';
        if (PAGE_TOKEN_RE.test(lastWord)) continue; // running header
      }
      for (const r of cands) strip.add(r);
      note('repeated-position', joined, p + 1, [
        cands[0].x,
        cands[0].y - 3,
        Math.max(...cands.map(runEnd)),
        cands[0].y + 9,
      ]);
    }

    return runs.filter((r) => !strip.has(r));
  });

  const burnIns = [...records.values()].map(({ pageSet, ...r }) => ({
    text: r.text,
    signal: r.signal,
    pages: pageSet.size,
    count: r.count,
    anchor: r.anchor,
  }));
  return { pages: cleaned, burnIns };
}
