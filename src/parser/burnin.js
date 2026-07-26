// Burn-in / watermark stripping (Peter's real-script finding, 2026-07-26:
// a per-page recipient stamp glued itself onto action lines). Two signals,
// both stripped BEFORE line grouping and both surfaced loudly:
// - rotated runs: screenplay body text is never rotated;
// - the same MIXED-CASE text at the same position on most pages: stamped
//   furniture (recipient names are mixed case; screenplay structure that
//   legitimately repeats — cues, slugs, single watermark letters — is all
//   caps and therefore exempt, which also keeps the brief's §3.2
//   single-glyph cue gate in charge of its own territory).

const MIN_PAGES = 4;
const Q = 24; // position quantum in points

export function stripBurnIns(pages) {
  const seen = new Map(); // key -> Set of page indexes
  pages.forEach((runs, p) => {
    for (const run of runs) {
      if (run.y > 720 || run.rot) continue;
      const key = burnKey(run);
      if (!seen.has(key)) seen.set(key, new Set());
      seen.get(key).add(p);
    }
  });

  const threshold = Math.max(MIN_PAGES, Math.ceil(pages.length / 2));
  const isRepeated = (run) =>
    eligible(run.str) && (seen.get(burnKey(run))?.size ?? 0) >= threshold;

  const stamped = new Map(); // text -> Set of 1-based pages
  const rotated = new Map(); // 1-based page -> [texts in stream order]
  const cleaned = pages.map((runs, p) =>
    runs.filter((run) => {
      if (run.rot) {
        if (!rotated.has(p + 1)) rotated.set(p + 1, []);
        rotated.get(p + 1).push(run.str.trim());
        return false;
      }
      if (run.y <= 720 && isRepeated(run)) {
        const t = run.str.trim();
        if (!stamped.has(t)) stamped.set(t, new Set());
        stamped.get(t).add(p + 1);
        return false;
      }
      return true;
    }),
  );

  const burnIns = [...stamped.entries()].map(([text, pageSet]) => ({
    text,
    pages: pageSet.size,
    dismissed: false,
  }));
  if (rotated.size) {
    const firstPage = Math.min(...rotated.keys());
    burnIns.push({
      text: rotated.get(firstPage).filter(Boolean).join(' '),
      pages: rotated.size,
      dismissed: false,
    });
  }
  return { pages: cleaned, burnIns };
}

function burnKey(run) {
  return `${run.str.trim()}|${Math.round(run.x / Q)}|${Math.round(run.y / Q)}`;
}

function eligible(str) {
  const t = str.trim();
  return t.length >= 2 && t !== t.toUpperCase();
}
