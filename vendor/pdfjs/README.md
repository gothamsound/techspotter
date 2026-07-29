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
