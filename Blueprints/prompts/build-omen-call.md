# Build prompt — Omen call screen (`U1`)

**Contract:** `Blueprints/specs/design/screen-contracts/OmenCall-v1.md` (73 elements)
**Artboards:** `design/native-visual-lock-2026-09-13/OmenCall.dc.html`, `OmenEvidence.dc.html`
**Capability:** profile `omen_mvp`, expressed per `Blueprints/specs/design/capability-expression-v1.md`
**Frame:** 390 × 844. Scroll rule: **fits — 0px overflow.** iPhone SE 375 × 667 may scroll (accepted).

**Every box below must be checked before this work is submitted. An element that cannot be built as
specified is reported, not silently omitted.** Dropping an element is the documented failure this
prompt exists to prevent — it is what burned the rate limit last time.

## Chrome

- [ ] League switcher bar — crest/provider mark, team name (`name`), `PROVIDER · LEAGUE` (`micro`,
      `text-tertiary`), `chevron.down`, `plus` (`h3`, `accent`). Opens SwitchSheet / ConnectLeague.
- [ ] Screen header — eyebrow `Week N` (`micro`, `accent`), title `Omen` (`screen-title`).
- [ ] Account affordance, 44pt target. **The shipped contextual-help button is not in the artboard;
      keep it and report the conflict — do not delete a shipped affordance to match a picture.**
- [ ] Scope line — `Call · one per team`, right-aligned lock slot. See "omissions" below.
- [ ] Tab bar — Command / Omen (active, `accent`) / Trade / League. **League uses the crest-shield
      symbol (D4), not the people glyph.** `CanvasShield` already exists in the asset catalog.

## The call card

- [ ] Card surface: `surface-2 → surface-1` gradient, `accent-overlay` border, pad 14, gap 10.
- [ ] Call type (`micro`, `text-tertiary`) ← `payload.callType`.
- [ ] Call headline (`call` role, 24/26, weight 800) ← `payload.verdict`.
- [ ] Reasoning (`name` role, `text-secondary`) ← explanation, falling back to `move`.
- [ ] Confidence band — `OmenConfidenceBandLabel`: 14×2 `accent` rule + word. **No numeral, no
      gradient, no bar.** Absent band → render the unavailable-reason panel, never a fourth word.
- [ ] Risk — `OmenRiskLabel`. Low: `text-tertiary`, no container. Medium: outlined. High: filled
      `surface-3` + `▲` + **the label names the risk**, never "high" alone.

## Facts row — this is the capability expression, not decoration

- [ ] Each chip is one `OmenDecisionCapability`, in exactly one of the four classes.
- [ ] `state: live, used: true` → own symbol, `text-secondary`.
- [ ] `state: live, used: false` → `text-tertiary`, **no evidence styling**.
- [ ] `state: unavailable` (or `pending` at render) → **named**, `text-tertiary`,
      `evidence.unread-source` symbol. This is `U1`'s "names what Omen could not read".
- [ ] `state: not_requested` → **not rendered.** Absence of a claim is not a claim of absence.
- [ ] Screen does not re-rank the server's order and does not re-derive availability from signals.
- [ ] Symbols by name: `evidence.wind`, `evidence.travel-zones`, `evidence.rest-clock`,
      `evidence.unread-source`. All four exist as vector assets. **An unnamed icon is a failure.**

## Evidence block

- [ ] `OmenEvidenceRow` per line: key (`micro`, `text-tertiary`, 58pt column) + statement
      (`body-sm`, `text-secondary`). Statements are the server's; the screen composes none.
- [ ] `See the full argument →` (`label`, `accent`), 44pt target, opens OmenEvidence for the same
      decision id.
- [ ] Top hairline on the block.

## Actions and footer

- [ ] Primary — `Make this move in <PROVIDER>`; provider from league context, never hardcoded.
      **Never claims the move was sent: `submission: handoff_only`.**
- [ ] Secondary — `Not this week`; records declined locally, leaves the call in the Ledger as not
      followed. **`followed: null` is not `false`.**
- [ ] Footer — `Every call lands in the Ledger whether you take it or not.`

## Omissions — render without these, do not invent them

- [ ] `1 of 3` — **omitted.** No call index exists in `omen-decision-brief.v3`. `One per team` is a
      true product statement and does render.
- [ ] `Locked Tue 3:00` — **omitted.** No lock time in the envelope, and a client-computed one is a
      claim about the provider's schedule Omen cannot stand behind.

## Verification — required, not optional

- [ ] Full iOS suite green on the booted simulator (use the UDID form, not the name).
- [ ] Capture `omen.demo` **after fixing that scenario** — it currently mounts the Command Center.
- [ ] A **degraded** capture with ≥1 input `unavailable` and ≥1 `live, used: false`. A success-state
      screenshot cannot show whether this screen is honest.
- [ ] D11: measure the fold at 390 × 844 and state the overflow in px. Do not assert "fits".
- [ ] Re-run `slops-canvas-to-code` stage 3 against the artboard and record the drift.

## Do not

- Re-introduce a numeric confidence or a gradient meter anywhere.
- Rank alternatives — Omen decides or declines; other destinations explore.
- Delete `data-stub` / `data-mock` from either token file (ship-order gate; `C3` first).
- Invent a capability state the payload did not send.
