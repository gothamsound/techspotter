// Browser-side extraction: the same pdf.js LEGACY build the tests use,
// bundled locally in vendor/ (zero network after page load). Legacy, not
// modern: the modern build calls Promise.withResolvers (Safari 17.4+) and
// URL.parse (Safari 18+) unguarded, which killed every pre-iOS-18 device.
// See vendor/pdfjs/README.md before bumping.

import { getDocument, GlobalWorkerOptions } from '../../vendor/pdfjs/pdf.min.mjs';
import { normalizePage } from '../extract/runs.js';

// WebKit gap, found in the field on iOS 18.7 (b0730a stack screenshot):
// pdf.js getTextContent does `for await (const chunk of readableStream)`,
// and ReadableStream async iteration only shipped in Safari 26. Safari
// 15.4 through 18.x (every iPhone that cannot take iOS 26 is parked on
// 18.7 forever) throws "undefined is not a function" at the first page.
// core-js does not cover web streams, so the legacy build sails through.
// Standard MDN-shape polyfill, main thread only: the worker's one
// for-await sits in a try with pdf.js's own inflate fallback.
if (typeof ReadableStream !== 'undefined' &&
    !ReadableStream.prototype[Symbol.asyncIterator]) {
  ReadableStream.prototype.values ??= function ({ preventCancel = false } = {}) {
    const reader = this.getReader();
    return {
      async next() {
        try {
          const result = await reader.read();
          if (result.done) reader.releaseLock();
          return result;
        } catch (e) {
          reader.releaseLock();
          throw e;
        }
      },
      async return(value) {
        if (!preventCancel) {
          const cancel = reader.cancel(value);
          reader.releaseLock();
          await cancel;
        } else {
          reader.releaseLock();
        }
        return { done: true, value };
      },
      [Symbol.asyncIterator]() {
        return this;
      },
    };
  };
  ReadableStream.prototype[Symbol.asyncIterator] = ReadableStream.prototype.values;
}

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
