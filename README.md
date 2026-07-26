# TechSpotter

Drop a screenplay PDF, get the scene-by-character matrix a table-read crew
preps from, plus two department spotting layers: Sound (playback, phone calls,
sound reactions) and Video (phone screens, TV screens, video playback).

**All processing happens in your browser. Your script never leaves this
machine.** After page load the site makes zero network requests: no CDNs, no
analytics, no telemetry.

Status: in build. The placeholder is live at
https://gothamsound.github.io/techspotter/

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
