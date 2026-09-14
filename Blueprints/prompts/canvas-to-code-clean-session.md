# Clean-session kickoff — `slops-canvas-to-code` over the native visual lock

**Prepared:** 2026-09-14 · **Founder instruction:** run this in a clean session, not as a
continuation.

## Why a clean session, stated so nobody shortcuts it

`slops-canvas-to-code` compiles an artboard into a build contract with a per-element acceptance
checklist. Its value is that the contract is derived from **the file**, not from a conversation that
remembers what the file was meant to say. A session that authored those artboards cannot do that
honestly — it will fill gaps from memory and produce a contract that looks complete and is not.

The skill exists because of a real failure it quotes: *"When I tried to build the pages with codex I
ran out of rate limits because I didn't do the job exactly like the canvas presented it, forgot
placements and icons. It was bad."* A contract written from memory reproduces that.

---

## Paste this into the new session

```text
Read Blueprints/prompts/kickoff-l2.md and follow it.

TASK — run slops-canvas-to-code over the native visual lock canvas and emit one
build contract per artboard.

SUBJECT
  design/native-visual-lock-2026-09-13/ — 30 artboards, plus _shared.css and
  canvas.json. This is the screen artifact of record (facts-of-record #20) and
  supersedes design/app-rework-canvas/ for every screen it holds.

READ FIRST, IN THIS ORDER
  1. design/native-visual-lock-2026-09-13/README.md — scroll behaviour per
     screen, the CSS rule, and the still-open gaps
  2. Blueprints/specs/mobile/omen-native-design-system-registry-v1.md
     §§2.1-2.6 — tokens, the type ramp, the spacing scale, and the two colour
     exceptions
  3. Blueprints/specs/mobile/omen-native-visual-lock-v1.md — D1-D8
  4. Blueprints/handoffs/2026-09-13-registry-amendment-01-and-contract-lane.md
     — the whole pass, including §13 "what remains"
  5. Direction/current_sprint.md lane V — C1-C7, U1-U4, and the two V items

  Do NOT read the session that authored these artboards. Derive the contract
  from the files.

WHAT TO EMIT
  One contract per artboard, in the shape slops-canvas-to-code defines. Every
  element gets a named semantic token, a role from the §2.4 ramp, spacing from
  the §2.5 scale, a resolved approved component, and the literal string for
  every control and state. Icons require a named symbol — "an icon here" is the
  exact ambiguity this skill exists to remove.

ORDER — follow the sprint dependency, not the folder
  U1 first: OmenCall, OmenEvidence.
  Then U3: CommandCenter, CommandQuiet, CommandQuietStraight, CommandNoLeague,
  LeagueTable, LeagueWaiver, TradeBuild, TradeRoster, TradeVerdict.
  Then U4: Ledger, LedgerDetail.
  Onboarding and the honest states last — they are the largest group and the
  least blocking.

KNOWN GAPS — do not silently fill them
  · Annotation overlays are NOT drawn. The vocabulary exists in _shared.css
    (.anno, .annokey) and no artboard uses it. If a contract needs a hit area
    or a redline, say the artboard does not specify it.
  · 44pt touch targets on the switcher +, chevron and favourite star are a
    build-brief concern, deliberately not in artboard geometry. Carry the
    requirement into the contract; do not infer a size from the drawing.
  · Dynamic Type at 200% is undefined. Scoreboard numerals break first.
  · The 17 scrolling artboards are unverified for horizontal overflow.
  · slops-taste may have moved values. Re-read _shared.css; do not trust any
    number quoted in a handoff over the file.

HARD CONSTRAINTS
  · Contracts only. No screen code, no OmenColor.*, no OmenTypography.*.
  · The ship-order gate is live: data-stub and data-mock may not be deleted
    from either token file in any commit that does not also land the hatch and
    dashed treatments as locked components. A contract may specify them; it may
    not authorise the deletion.
  · Never edit CSS inside an artboard. _shared.css is the source. Run
    node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check
    before committing anything in that folder.
  · Do not push to main. Do not merge.

CLOSE-OUT
  Per Blueprints/definition-of-done.md, plus the four gates from the repo root.
  truth-gate must run from the L0 root with omen nested at slops-saloon/omen —
  from a standalone clone it returns ~117 false P0s that are purely a layout
  artifact.
```

---

## What the new session should find already true

- 30 artboards, every class used defined in `_shared.css`, parity 30/30.
- 13 declared-fits artboards at **0px overflow**; 17 declared scrolling.
- Type on a single 14-step ramp, floor 10. Spacing on a base-2 scale.
- Two colour exceptions only: fantasy providers and identity providers.
- `C7` closed. `C2` verified. `C1`, `C3`–`C6` READY. `U1`–`U4` each blocked on
  their C row.

If any of that is not true when the session starts, something landed in between — **read the file,
not this page.**
