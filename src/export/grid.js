// Grid exports: matrix CSV and the XLSX sheet arrays (pure builders; the
// SheetJS write is a thin caller-side step). Cell language: S = speaks,
// P = present confirmed, p? = present suggested.

export function matrixRows(parsed) {
  const chars = parsed.characters.map((c) => c.name);
  const head = ['scene', 'heading', 'page', 'speaking', 'present', ...chars];
  const rows = parsed.scenes.map((sc) => [
    sc.id,
    sc.heading,
    sc.page ?? '',
    sc.characters_speaking.length,
    (sc.present_confirmed?.length ?? 0) + (sc.present_suggest?.length ?? 0),
    ...chars.map((n) =>
      sc.characters_speaking.includes(n)
        ? 'S'
        : sc.present_confirmed?.includes(n)
          ? 'P'
          : sc.present_suggest?.includes(n)
            ? 'p?'
            : '',
    ),
  ]);
  return [head, ...rows];
}

export function momentRows(moments) {
  const head = ['scene', 'category', 'snippet', 'page', 'trigger', 'confidence', 'characters', 'dismissed'];
  return [
    head,
    ...moments.map((m) => [
      m.scene,
      m.category,
      m.snippet,
      m.page ?? '',
      m.trigger ?? '',
      m.confidence ?? '',
      (m.characters ?? []).join(', '),
      m.dismissed ? 'true' : 'false',
    ]),
  ];
}

export function matrixCsv(parsed) {
  return matrixRows(parsed)
    .map((row) => row.map(csvCell).join(','))
    .join('\r\n');
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
