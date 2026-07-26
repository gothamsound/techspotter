// Minimal PDF writer for synthetic screenplay fixtures. ASCII text only,
// Courier 12 on US-letter pages, one Tj per positioned run so pdf.js hands
// back one text item per run with exact coordinates.

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

export function buildPdf(pages) {
  const objs = [];
  const kidIds = pages.map((_, i) => 5 + i * 2);
  objs.push('<< /Type /Catalog /Pages 2 0 R >>');
  objs.push(`<< /Type /Pages /Kids [${kidIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>');
  objs.push('<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Oblique >>');
  for (const page of pages) {
    const contentId = objs.length + 2;
    objs.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
    );
    const stream = page.runs
      .map((r) => `BT /${r.italic ? 'F2' : 'F1'} 12 Tf ${r.x} ${r.y} Td (${esc(r.text)}) Tj ET`)
      .join('\n');
    objs.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }

  let out = '%PDF-1.4\n';
  const offsets = [0];
  objs.forEach((body, i) => {
    offsets.push(out.length);
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefPos = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF\n`;
  return new TextEncoder().encode(out);
}
