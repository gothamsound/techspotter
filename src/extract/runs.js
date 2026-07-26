// Normalizes a pdf.js TextContent object into the parser's input shape:
// one run per positioned text item, PDF user-space coordinates (origin
// bottom-left, y = baseline). Typographic quotes are folded to ASCII here
// because pdf.js maps Courier's quoteright to U+2019, which would trip the
// cue charset gate on legitimate apostrophe names.

export function normalizePage(textContent) {
  return textContent.items
    .filter((it) => typeof it.str === 'string' && it.str.trim() !== '')
    .map((it) => ({
      str: it.str.replace(/[‘’]/g, "'").replace(/[“”]/g, '"'),
      x: it.transform[4],
      y: it.transform[5],
      width: it.width || 0,
      font: it.fontName ?? null,
    }));
}
