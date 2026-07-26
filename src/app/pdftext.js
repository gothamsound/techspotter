// Browser-side extraction: the same pdf.js the tests use, bundled locally
// in vendor/ (zero network after page load).

import { getDocument, GlobalWorkerOptions } from '../../vendor/pdfjs/pdf.min.mjs';
import { normalizePage } from '../extract/runs.js';

GlobalWorkerOptions.workerSrc = new URL(
  '../../vendor/pdfjs/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export async function extractRunsFromBytes(bytes, onProgress) {
  const doc = await getDocument({
    data: bytes,
    useSystemFonts: true,
    isEvalSupported: false,
  }).promise;
  const pages = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    pages.push(normalizePage(await page.getTextContent()));
    onProgress?.(p, doc.numPages);
  }
  await doc.destroy();
  return pages;
}
