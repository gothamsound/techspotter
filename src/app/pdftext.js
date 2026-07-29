// Browser-side extraction: the same pdf.js LEGACY build the tests use,
// bundled locally in vendor/ (zero network after page load). Legacy, not
// modern: the modern build calls Promise.withResolvers (Safari 17.4+) and
// URL.parse (Safari 18+) unguarded, which killed every pre-iOS-18 device.
// See vendor/pdfjs/README.md before bumping.

import { getDocument, GlobalWorkerOptions } from '../../vendor/pdfjs/pdf.min.mjs';
import { normalizePage } from '../extract/runs.js';

GlobalWorkerOptions.workerSrc = new URL(
  '../../vendor/pdfjs/pdf.worker.min.mjs',
  import.meta.url,
).toString();

// Returns the extracted runs AND the live document handle: the doc stays
// open for the session so source peek can render page regions on demand.
export async function openAndExtract(bytes, onProgress) {
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
  return { doc, pages };
}
