# Omen Native — contract work before build, v1

**Date:** 2026-09-13
**Purpose:** Sequence the contract and spec changes that must land *before* native screen code, so the visual lock and the five destinations get built once.
**Companions:** `omen-native-visual-lock-v1.md` (this session), `omen-app-pages-workshop-v1.md`, `omen-trade-page-workshop-v1.md`, `m1-league-screen-data-plan-v1.md`, `Blueprints/api-routes.md`, `omen-native-design-system-registry-v1.md`.

> Authored in an unofficial Cowork session: no active trust assignment, no L0 tree, no repo writes, no close-out gate run. This is a proposal to route into claimed sprint items.

---

## 0. The finding that shapes this plan

**The backend is further ahead than the design was.** Going in I expected to be specifying new endpoints. Reading `api-routes.md` instead shows the payloads for four of the five destinations already exist and already encode the honesty rules:

| Screen | Contract | State |
|---|---|---|
| Command Center | `league-overview.v1` + `waiver-analysis.v1` + move rows | Exists |
| League | `league-overview.v1` | Exists, Sleeper-complete, ESPN/Yahoo partial |
| Waiver | `waiver-analysis.v1` | Exists — already returns best move, displaced starter, **recommended drop with stated cost**, and up to three alternatives |
| Trade | `trade-compare.v2` + `trade-share.v1` | Exists, four verdict states |
| Ledger detail | `move-detail.v1` | Exists — immutable snapshot, categorised evidence, outcome in measured language |
| Omen brief | `OmenDecisionBriefPayload` | **Exists and is wrong** — see C1 |
| Ledger **list** | — | **Verify.** `move-detail.v1` is the receipt for one call. The Ledger screen needs an index. |

So this is mostly a small number of pointed contract changes plus a governance amendment — not a build-out. Two items are blocking, one is safety-gated, and the rest can run in parallel.

---

## 1. Sequence

```
C1 confidence bands ──┐
                      ├──► U1 Omen screen
C2 registry amendment ┤
                      ├──► U2 token + type swap ──► U3 Command / League / Trade
C3 data-source form ──┘                                    │
                                                           │
C4 ledger index ───────────────────────────────────────────┴──► U4 Ledger screen

C5 waiver copy contract ──► U3 (League)     C6 provider chip ring ──► U2
```

Nothing in the U row starts before its C row is merged.

---

## 2. Contract items

### C1 — Confidence bands. **Blocking. Breaking.**

The pages workshop locks confidence to bands with the vocabulary **Confident / Leaning / Coin flip**, and the workshop itself flags this as "a breaking change to shipped surfaces" against `OmenDecisionBriefPayload.confidence` and the `/omen` endpoints.

- Version the payload: `omen-decision-brief.v2`. Do not mutate v1 in place — web is live on it.
- `confidence: { band: "confident" | "leaning" | "coin_flip", drivers: string[] }`. The band never travels without its drivers; that pairing is the locked rule.
- **Delete the numeric field.** Do not keep it "for internal use" — a number in the payload becomes a number on a screen within two sprints.
- Decide where the band is computed. Server, not client: a client-side threshold is a model calibration living in the UI layer, which is the exact failure the ban on percentages exists to prevent.
- Migration note in `api-routes.md`, and a row in `Blueprints/handoffs/backend-to-frontend.md`.

**Verification:** a contract test asserting no numeric confidence field exists anywhere in the v2 response, and that `drivers` is non-empty for every band.

### C2 — Registry amendment for D7. **Blocking. Governance, not code.**

Literal brass-only contradicts registry §2.1, which classes data-semantic tokens as an invariant no theme may change.

1. §2.1 — split that row. `platform` stays invariant (D8). `risk`, `data-source`, `confidence` and `position` move to **"invariant in meaning, not in colour"**.
2. §2.3 — replace the colour table for those families with the form table in the visual lock §4.4.
3. §2.2 — mark the Light / system column **Withdrawn 2026-09-12 (D1)**; retain values for future packs.
4. `Direction/decision_log.md` — record D1 and D6–D8, with the Yahoo contrast measurement as evidence.

Write this before any token code. Without it the next agent reading the registry correctly puts crimson back.

### C3 — Data-source form treatments. **Safety-gated.**

`AGENT.md`: mock data must be clearly labelled and never presented as live advice. Today the marker is a colour. D7 removes the colour.

- Specify the three treatments as components, not descriptions: Live (solid `surface-3`), Sample/stub/mock (dashed border + 45° hatch), Unavailable (struck through, tertiary).
- Add them to `component-lock-v1.md` with fixed anatomy so both platforms build the same object.
- **Gate:** `data-stub` / `data-mock` colours may not be deleted from `OmenColor.kt` in any commit that does not also land these components. A commit that removes the colour first leaves mock data visually identical to live data — that is a P0, not a cosmetic regression.

**Verification:** a screenshot test per platform showing a mock row and a live row side by side, graded by `slops-native-ui-audit`.

### C4 — Ledger index contract. **Verify first, then specify.**

`move-detail.v1` is the receipt for one call. The Ledger screen is a list. Check whether an index route exists; if not:

- `GET /api/moves` → `moves-index.v1`: rows of `{ id, issued_at, issued_at_timezone, move_type, headline, followed, outcome, provenance }`.
- `provenance: "verified" | "self_reported"` is required on every row, never inferred, and the client must render the distinction. The workshop rule is that self-reported rows are never blended silently with verified ones.
- `followed: true | false | null` — `null` means not safely known, matching `move-detail.v1`'s "user action only when safely known".
- No aggregate hit-rate in v1. A percentage across mixed-provenance rows is a fabricated statistic.

### C5 — Waiver copy contract. **Non-blocking.**

`waiver-analysis.v1` already returns the drop and its cost. What it does not pin is voice, and D5 locks the row to reason → drop → outcome in the second person.

- Add a copy contract to the visual lock or a `ux-copy` note: who writes the reason string, server or client, and the sentence pattern.
- Recommend **server**. The reason must name the evidence it used; a client assembling that sentence from fields will eventually assemble one the evidence does not support.
- Include the honest-negative case: when `state` is `no_credible_move` or `no_low_cost_drop`, the row says so plainly. That state already exists in the contract and is currently the most under-used thing in it.

### C6 — Provider chip ring. **Non-blocking, tiny.**

Yahoo `#410093` measures 1.29:1 against `bg #1F1F1D` — invisible silhouette, and provider colour is now the only hue in the app. Add a `rgba(245,240,232,.22)` hairline to all three provider chips; declared hexes unchanged. Add the case to `OmenColorContrastTest`.

---

## 3. UI items

| # | Item | Depends on | Lane |
|---|---|---|---|
| U1 | Omen destination — one call, band, risk, evidence on tap | C1 | mobile |
| U2 | Token + typography swap; dark-only; provider ring | C2, C6 | mobile |
| U3 | Command Center seats, League four sections, Trade two paths | C3, C5, U2 | mobile |
| U4 | Ledger screen | C4, U2 | mobile |

Per the pages workshop, frontend splits into **two implementation sessions — one web, one mobile — and the mobile session covers both iOS and Android.** Nothing above is web-only.

---

## 4. Corrections this pass found in my own mockups

Recorded so they do not get built:

1. **Confidence shown as a number** in every mockup up to v8. Locked vocabulary is Confident / Leaning / Coin flip.
2. **Command Center built as a segmented control.** Locked as stacked council seats where only advisors with something to say appear.
3. **Trade-deadline activity item shown.** The contract states this signal is deliberately absent on every provider — `settings.trade_deadline` is a week number and the week→date conversion has not shipped.
4. **Waiver rendered as a flat ranked list.** `waiver-analysis.v1` returns one `best_move` plus alternatives with a tradeoff sentence each.

Items 1–3 are fixed in the published screens; item 4 is annotated rather than restructured.

---

## 5. Independent findings — separate tickets

| Finding | Surface |
|---|---|
| Raw UUID rendered as "Signed in" | Account sheet |
| Raw enum `START_SIT` in user-facing copy | Ledger seat |
| Content scrolls under the floating tab bar — missing bottom inset | Omen destination |
| Four tab glyphs mix outline and solid at different weights | Tab bar |
| Shipping app renders a pastel set that appears in no design document | truth-gate candidate |

---

## 6. Suggested claim order

1. **C2** — governance, no code, unblocks everything visual.
2. **C1** — breaking, so it wants the longest runway.
3. **C6 + U2** — the visible win. Dark-only plus type swap changes the whole app's read for a small diff.
4. **C3** then **U3**.
5. **C4** then **U4**.

C5 rides along with U3.

---

## 7. Gates

Every item above closes under `Blueprints/definition-of-done.md` with `Status: VERIFIED` and an `Evidence:` pointer, a `skill-usage-ledger.md` row, a `decision_log.md` entry, a dated handoff, and the four close-out gates. **A P0 from truth-gate blocks close-out.**

For this session, all four gates are **NOT RUN** except `check-kickoff-drift.js`, which passed at 13 entries in a standalone clone.
