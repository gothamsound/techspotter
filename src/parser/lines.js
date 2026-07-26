// Groups normalized runs into lines (y-clusters) with x-ordered segments.
// A segment break is a gap wider than any plausible word space; pdf.js
// splits long items at space-width gaps, so those rejoin here, while
// side-by-side layout (dual dialogue, margin scene numbers) stays split.

const Y_TOL = 2;
const SEG_GAP = 14; // ~2 Courier-12 characters
const CHAR_W = 7.2;

export function groupLines(runs) {
  const sorted = runs
    .filter((r) => r.str.trim() !== '')
    .sort((a, b) => b.y - a.y || a.x - b.x);
  const clusters = [];
  for (const run of sorted) {
    const line = clusters.at(-1);
    if (line && Math.abs(line.y - run.y) <= Y_TOL) line.runs.push(run);
    else clusters.push({ y: run.y, runs: [run] });
  }
  return clusters.map(finishLine);
}

function finishLine({ y, runs }) {
  runs.sort((a, b) => a.x - b.x);
  const segments = [];
  for (const run of runs) {
    const w = run.width || run.str.length * CHAR_W;
    const seg = segments.at(-1);
    if (seg && run.x - seg.x1 < SEG_GAP) {
      seg.text += (run.x - seg.x1 > 3 ? ' ' : '') + run.str;
      seg.x1 = run.x + w;
    } else {
      segments.push({ x0: run.x, x1: run.x + w, text: run.str });
    }
  }
  return {
    y,
    minX: segments[0].x0,
    maxX: segments.at(-1).x1,
    segments,
    text: segments.map((s) => s.text).join('  '),
  };
}
