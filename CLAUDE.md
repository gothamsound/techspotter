# CLAUDE.md — TechSpotter

Standing brief for Claude Code sessions on this repo. The build instructions live
in `docs/techspotter-build-brief.md` — on a fresh repo, that brief IS the task
list; read it before writing any code. The interchange contract is
`docs/sceneline-interchange-v2.md`. When this file and those disagree, they win.

## What this is (one breath)

TechSpotter is a **browser-only script-breakdown applet** (GitHub Pages): drop a
screenplay PDF, get the **scene × character matrix** plus two department
spotting layers — **Sound** (playback / phone calls / sfx-reactions) and
**Video** (phone screens / TV screens / video playback). It's the prep bench of
a four-tool family: Sceneline runs the table read, Tablecut will shoot it,
TechSpotter preps it, sides-enlarger prints it for actors. They share one file
format: `.sceneline` interchange v2.

## Hard rules (never bend these)

1. **100 % local processing.** Zero network requests after page load — no CDNs,
   no fonts at runtime, no analytics, no telemetry. The script never leaves the
   machine. This is a commercial-trust requirement, not a preference.
2. **No screenplay, ever, in this repo** — no real PDFs, no dialogue text, no
   full-profile `.sceneline` files. Test fixtures are **generated synthetic
   PDFs** (the generator is committed; its output is not). `.gitignore` already
   blocks `*.pdf` and `*.sceneline` — keep it that way.
3. **Interchange round-trip law:** preserve every `extensions` block you don't
   own **value-identically** (deep-equal, not byte-compared). TechSpotter owns
   `sound` and `video`; everything else passes through untouched.
4. **The parser gates are hard-won — implement them faithfully, don't "improve"
   them.** Strict cue gates + surfaced rejects (never silently dropped), string
   scene ids, variants-are-distinct-actors, watermark/furniture rejection,
   bare-slug mode, loud zero-scene failure. Every rule in the brief §3 traces to
   a real character lost at a real live show.

## Doctrine

- **Matrix accuracy: precision-biased** (strict gates, review chips for rejects).
  **Department spotting: recall-biased** (over-flag with evidence; a false flag
  costs a click, a missed singing scene costs a live scramble). The review UI is
  the product; the detectors just fill it well.
- **Operator taps always win** over anything detected. Delete/merge are the
  expensive mistakes — make them two-step; add is one.
- **Loud failures only.** An empty parse, an image-only PDF, an unreadable
  `.sceneline` — say so plainly, never render an empty grid.

## Tech shape

Static site, plain HTML/JS/CSS or a light build. `pdf.js` bundled locally
(**text runs with coordinates** — layout position is load-bearing). SheetJS
bundled for XLSX. Parser is a **pure module** (text runs in → structured show
out), unit-testable in Node with the synthetic-fixture generator. Primary export
is `.sceneline` v2 (lean by default); CSV/XLSX secondary.

## Deployment

Live since 2026-07-26: public repo `gothamsound/techspotter` (this clone is
`origin`), GitHub Pages serving `main` at
https://gothamsound.github.io/techspotter/. Public history starts at the
sanitized root; keep it that way (no real-production strings in commits).
Footer on the page: "TechSpotter — all processing happens in your browser.
Your script never leaves your device."

## Working agreement

- Small, self-contained changes; every parser rule and detector keeps its
  fixture-backed test (brief §8 is the acceptance list).
- Surface open questions to Peter (lyrics-block handling and far-end-caller
  tagging are two he's flagged for review); don't silently resolve them.
- Peter co-manages direction; be critical, name tradeoffs, no glazing.

## Federation (scriptparse)

This bench consumes the shared parser/policy/interchange truth from the
private `gothamsound/scriptparse` repo (the hub). Standing law lives in the
hub's CLAUDE.md (the constitution) and binds this repo's agents too. The
rules that most often apply here:

- Parse/identity/interchange divergences are NEVER fixed locally. File a
  federation motion in scriptparse (issue template) with evidence, affected
  benches, and a proposed disposition; mention @claude to open litigation.
- Evidence in motions: fixtures by name + checksum, diffs, numbers. Never
  script text or real production strings.
- When a hub sync PR or federation issue arrives here: absorb it per this
  repo's own requirements docs, run this repo's gates, and comment the ack
  (or the objection) on the hub issue. Pin bumps are boring on purpose.
- Escalation is the hub's job: if litigation goes novel, the hub labels
  needs-peter. Don't ping Peter directly from here for federation matters.
