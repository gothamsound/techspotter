# Vendored pdf.js

`pdfjs-dist` **5.6.205**, **legacy** build (`legacy/build/pdf.min.mjs` +
`legacy/build/pdf.worker.min.mjs`), copied verbatim from `node_modules`.

## Why legacy, not modern

The modern build calls `Promise.withResolvers()` (Safari/iOS 17.4+) and
`URL.parse()` (Safari/iOS 18+) with no feature detection, on the core
document-open path. On any older iOS device (every iOS browser is WebKit)
that surfaced as "Could not read this PDF. undefined is not a function."
The legacy build carries core-js polyfills for both, and it is the build
the Node test suite runs (`test/helpers/extract.js`), so browser and tests
exercise the same code. Payload cost is ~60 KB main / ~100 KB worker,
irrelevant for a local-only bundle.

## Refreshing

```sh
npm install pdfjs-dist@<version>
cp node_modules/pdfjs-dist/legacy/build/pdf.min.mjs vendor/pdfjs/
cp node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs vendor/pdfjs/
```

Always copy from `legacy/build/`, never `build/`. After a bump, sanity-check
in Node 20 (it also lacks `Promise.withResolvers`, so it is a convenient
stand-in for older Safari) and grep the new files for unguarded modern APIs
before shipping.

## The gap the legacy build does NOT cover

`getTextContent` iterates a `ReadableStream` with `for await`, and
ReadableStream async iteration only shipped in Safari 26: Safari
15.4-18.x throws "undefined is not a function" at the first page (field
case: iOS 18.7, the terminal branch for every iPhone that cannot take
iOS 26). core-js never patches web streams, so the legacy build is no
help, and Node has been async-iterable since 16, so a Node smoke run
does not catch it either; strip
`ReadableStream.prototype[Symbol.asyncIterator]` in the smoke script to
cover it. The fix is the polyfill at the top of `src/app/pdftext.js`
(main thread only; the worker's one `for await` sits in a try with
pdf.js's own inflate fallback). Keep the polyfill when bumping pdf.js.
