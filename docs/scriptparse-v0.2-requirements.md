# TechSpotter's requirements for scriptparse v0.2 (fold policy + anchors)

*From the TechSpotter session, 2026-07-26, answering Brief D §6 ("state what
the department scan needs from those APIs before anyone tags v0.2").
Committable everywhere: no script text.*

## The constraint that shapes everything

TechSpotter is browser-only by hard rule: 100 % client-side, zero network
after page load, the script never leaves the device. scriptparse is Python
(pdfplumber, pandas, pymupdf); it cannot execute in that environment, and no
amount of pinning changes that. TechSpotter therefore consumes scriptparse's
**behavior contract**, not its runtime: its own JS implementation must agree
with the package on every ruling, and v0.2's job is to make that agreement
testable instead of aspirational. Every requirement below follows from this.

## 1. Policy as data, not code

`policy.py` is fine as the Python API, but the tables it applies must live in
the package as a versioned data file (`policy.json` or similar): the channel
tag lexicon, the standard same-character tags, the stop-word list, the
furniture vocabulary, the distinct-performer exclusion rules. A JS bench can
mirror a data file exactly and test against it; it can only approximate a
Python function. Ship `policy_version` inside the data so any output (and any
`.sceneline` file) can record which policy produced it.

## 2. The fold signature

The fold is the thing all four benches live with, so:

- **Pure, deterministic, total.** `fold(printed_name) -> {base, channel|null}`,
  identity for non-variants, no I/O, no config outside the policy data.
- **Two tiers, explicit in the API.** The four standard tags (V.O., O.S.,
  O.C., CONT'D) collapse silently per spec §3.2: same character, not an
  offer. Channel variants ((ON THE PHONE), (INTERCUT), X'S TEXT) are
  offer-only per the MB TONY STARBUCK ruling. The API must not blur the
  tiers; TechSpotter's review rails render them differently.
- **Exclusions honored by construction.** Qualifier variants (YOUNG VALERIE)
  and gate-railed names (MERC #1) never fold. These already have
  fixture-backed tests in TechSpotter; the package should carry equivalents.
- **Batch form stays offer-only.** `fold_candidates(names) -> offers[]` feeds
  review UIs; no API that applies a fold without an operator decision.

## 3. One live divergence to settle in v0.2, with evidence

scriptparse v0.1.0 `BAD_WORDS` includes prepositions (IN, ON, AT, OF, WITH,
FOR). Peter ruled the opposite for TechSpotter on 2026-07-26: **prepositions
are not stop words** because epithet characters are built from them (MAN IN
BLACK, GIRL ON TRAIN, VOICE OF GOD); the list narrowed to conjunctions plus
the brief-named FROM. Today the benches disagree about whether MAN IN BLACK
is a character. That is precisely the drift the package exists to kill: the
ruling should land in v0.2's policy data, not stay a TechSpotter local. The
test is in TechSpotter's `test/acceptance.rejects.test.js`.

## 4. Anchors

- **Every artifact**, including refused cues and plain text lines. The
  department scan flags action lines and parentheticals, so moments need the
  anchor of the *matched line*, not just the scene heading. If line-level
  anchors exist, `sound`/`video` moments inherit source peek for free.
- **Pin the coordinate convention in the spec, not in code.** pdfplumber
  measures from top-left; pdf.js from bottom-left. Unless the spec states one
  convention (proposal: PDF user space, bottom-left origin, points,
  `{page, bbox: [x0, y0, x1, y1]}`), the benches will disagree by exactly
  `page_height - y` and every source peek will point at the wrong band.
- **Additive on the wire.** Anchors extend moments and parse artifacts as
  optional fields; readers without them keep working (spec §6 additive rule).

## 5. Interchange conformance corpus (v0.2 or v0.3, but design for it now)

`interchange.py` will be the reference implementation of the round-trip law;
TechSpotter must implement the same law in JS (M4). Ship a language-neutral
conformance corpus in the package: `.sceneline` fixtures with foreign and
`x-` blocks, lean/full pairs, v1 files, and expected deep-equal outcomes, so
any bench's test suite can consume the corpus directly. TechSpotter offers
its dependency-free synthetic PDF fixture generator (Node, zero deps,
`test/fixtures/` in this repo) as the shared generator for parser-level
corpus fixtures; the Python side only needs to read the PDFs it emits.

## 6. What Tablecut can already count on from TechSpotter's moments

Restating the contract Brief D §4 names, as commitments: category names are
stable (`playback` | `phone` | `sfx-reaction`; `phone-screen` | `tv-screen` |
`video-playback`), `dismissed` is emitted faithfully and dismissed moments
stay in the file, `page` is the printed page of the matched line, snippets
truncate to ≤120 chars in lean exports, and `characters` lists names as
printed (no local fold), so consumers apply the shared policy themselves.

## 7. Standing offer

If "no local parser code" is the end state Peter wants literally true, the
clean path is scriptparse growing a `js/` half: TechSpotter's parser moves
into the package repo, both implementations test against the same synthetic
corpus and policy data, and TechSpotter pins the package like everyone else.
That is a Peter-sized decision; until then, the corpus plus policy-as-data
keeps the implementations provably aligned.
