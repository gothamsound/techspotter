// Shared helpers for the department detectors.

const round1 = (n) => Math.round(n * 10) / 10;

export function lineAnchor(record, sourceDoc) {
  return {
    source_doc: sourceDoc ?? null,
    page: record.sheet,
    bbox: [round1(record.x0), round1(record.y - 3), round1(record.x1), round1(record.y + 9)],
  };
}

export function blockAnchor(records, sourceDoc) {
  const anchors = records.map((r) => lineAnchor(r, sourceDoc));
  const bbox = [
    Math.min(...anchors.map((a) => a.bbox[0])),
    Math.min(...anchors.map((a) => a.bbox[1])),
    Math.max(...anchors.map((a) => a.bbox[2])),
    Math.max(...anchors.map((a) => a.bbox[3])),
  ];
  return {
    anchor: { source_doc: sourceDoc ?? null, page: records[0].sheet, bbox },
    line_anchors: anchors,
  };
}

export function snippetAt(scene, i) {
  const parts = [];
  for (const j of [i - 1, i, i + 1]) {
    const t = scene.lines[j]?.text?.trim();
    if (t) parts.push(t);
  }
  return parts.join('\n').slice(0, 240);
}

// Character names for attribution and caps-run exclusion: printed names
// plus their pre-parenthetical base forms.
export function characterNames(parsed) {
  const names = new Set();
  for (const c of parsed.characters) {
    names.add(c.name);
    names.add(c.name.replace(/\s*\(.*$/, '').trim());
  }
  names.delete('');
  return names;
}

// Known character names appearing on a line, matched case-insensitively at
// word boundaries (explicit-signal attribution: named on the trigger line).
export function namesOnLine(text, names) {
  const found = [];
  const upper = text.toUpperCase();
  for (const name of names) {
    if (name.length < 2) continue;
    const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?<![A-Za-z0-9])${esc}(?![A-Za-z0-9])`).test(upper)) {
      found.push(name);
    }
  }
  return found;
}

export function makeMoment(scene, category, opts) {
  return {
    scene: scene.id,
    category,
    snippet: opts.snippet,
    page: opts.page,
    characters: opts.characters ?? [],
    dismissed: false,
    trigger: opts.trigger,
    confidence: opts.confidence,
    anchor: opts.anchor,
    ...(opts.line_anchors ? { line_anchors: opts.line_anchors } : {}),
  };
}
