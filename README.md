# TechSpotter

Drop a screenplay PDF, get the scene-by-character matrix plus two department
spotting layers: Sound (playback, phone calls, sound reactions) and Video
(phone screens, TV screens, video playback).

**All processing happens in your browser. Your script never leaves your
device.** After page load the site makes zero network requests: no CDNs, no
analytics, no telemetry.

Live at https://gothamsound.github.io/techspotter/ — drop a PDF, review the
matrix, correct the parser with clicks. A fully synthetic demo show (generated
in your browser, no script text anywhere) is at
https://gothamsound.github.io/techspotter/#demo

The Sound and Video spotting layers are live: 🔊 playback / phone /
sfx-reaction and 🎬 phone-screen / tv-screen / video-playback badges per
scene, each with evidence (snippet, page, trigger) and per-moment dismiss.
In build: exports (.sceneline v2, CSV/XLSX, print).

## Development

```
npm install
npm test
```

Tests run in Node against synthetic screenplay PDFs generated in memory by
`test/fixtures/` at test time. No real screenplay material may ever enter this
repo: `.gitignore` blocks `*.pdf` and `*.sceneline`, and fixtures are always
generated, never copied.

## Docs

- `docs/techspotter-build-brief.md`: the build brief (parser rules, department
  detectors, acceptance tests)
- `docs/sceneline-interchange-v2.md`: the `.sceneline` interchange format
  shared with the sibling tools (Sceneline, Tablecut, sides-enlarger)
