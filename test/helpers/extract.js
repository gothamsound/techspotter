// Test-side extraction: run a fixture PDF through real pdf.js exactly the
// way the browser will, then normalize to parser input runs.

import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { normalizePage } from '../../src/extract/runs.js';

export async function extractRuns(pdfBytes) {
  const doc = await getDocument({
    data: pdfBytes,
    useSystemFonts: true,
    isEvalSupported: false,
    verbosity: 0,
  }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    pages.push(normalizePage(await page.getTextContent()));
  }
  await doc.destroy();
  return pages;
}
