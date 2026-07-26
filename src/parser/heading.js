// Scene-heading recognition. Slug test per brief §3.1: INT./EXT./I/E.
// prefix with the dot required (INTO is not INT.), all-caps, <= ~90 chars.
// Scene ids are STRINGS everywhere; drafts have 22A.

const SLUG_START = /^(INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.|INT\.|EXT\.)(\s|$)/;
const SCENE_NUM = /^\d{1,4}[A-Z]{0,2}$/;

export function isSlugText(text) {
  const t = text.trim();
  return (
    SLUG_START.test(t) &&
    /[A-Z]/.test(t) &&
    t === t.toUpperCase() &&
    t.length <= 90
  );
}

// Returns { num: string|null, heading: string } or null. Handles margin
// scene numbers as separate segments (left, right, or both) and the
// merged-run "14  INT. LAB - NIGHT" form. A trailing number is only
// treated as a scene id when it sits in the right margin as its own
// segment; "EXT. HIGHWAY 101 - DAY" keeps its 101.
export function parseHeading(line) {
  let segs = line.segments
    .map((s) => ({ x0: s.x0, text: s.text.trim() }))
    .filter((s) => s.text);
  if (!segs.length) return null;

  let num = null;
  if (segs.length > 1 && SCENE_NUM.test(segs[0].text)) {
    num = segs[0].text;
    segs = segs.slice(1);
  }
  const last = segs.at(-1);
  if (
    segs.length > 1 &&
    SCENE_NUM.test(last.text) &&
    last.x0 > 400 &&
    (num === null || last.text === num)
  ) {
    num ??= last.text;
    segs = segs.slice(0, -1);
  }

  let heading = segs.map((s) => s.text).join(' ').trim();
  if (num === null) {
    const m = heading.match(/^(\d{1,4}[A-Z]{0,2})[\s.]+(.+)$/);
    if (m && isSlugText(m[2].trim())) {
      num = m[1];
      heading = m[2].trim();
    }
  }
  if (!isSlugText(heading)) return null;
  return { num, heading };
}
