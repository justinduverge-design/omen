# Screen contract - LedgerDegraded (v2)

> **Version:** v2
> **Date:** 2026-09-29
> **Status:** Supersedes LedgerDegraded-v1.md. Includes intelligence pass amendments.


Compiled from `design/native-visual-lock-2026-09-13/LedgerDegraded.dc.html`. This contract records the existing `moves-history.v2` and J6 degraded behavior; it does not add a backend state.

## Build binding

| Field | Value |
|---|---|
| Artboard title | The Ledger — outcomes unread |
| Family | Ledger, switcher, account |
| Journey | J6 — The receipts; degraded pass |
| Frame | 390 x 844; iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls vertically; horizontal scrolling is forbidden. |
| Data route | GET /api/moves?contract_version=moves-history.v2&platform={platform}&league_id={league_id} |
| API contract | moves-history.v2 |
| Capability profile | `ledger` |

## State contract

- This is not an empty Ledger. Four scoped calls exist, but `move_outcomes` could not be read.
- Every unread result is labelled `Not verified`; it must never be translated to `Didn’t work`, zero, or an inferred outcome.
- Follow-through remains independently `Followed · Self-reported`, `You passed · Self-reported`, or `Follow-through unknown`.
- `League scoring was read and did not change any row here` is a live-but-unused input, not unavailable evidence.
- The unavailable sentence appears before the rows so truncation cannot hide why their outcomes are unverified.

## Locked copy

- `Move outcomes`
- `Omen could not read how these calls turned out for this league. Every row below says “Not verified” because nobody checked — not because the call was wrong.`
- `Followed` / `Self-reported` / `Not verified`
- `Follow-through unknown` / `Outcome pending`
- `Yahoo did not hand back the transaction, so Omen does not know whether you made this move.`
- `League scoring was read and did not change any row here.`

## Interaction and resilience requirements

- Rows remain tappable and open the immutable `move-detail.v1` receipt for their id.
- League switcher, Account, and tab-bar actions match `Ledger-v1.md`.
- Interactive targets are at least 44pt on iOS and 48dp on Android.
- Dynamic Type/font scale and long localized copy reflow vertically without clipping or horizontal overflow.
- At the 390 x 844 floor the canvas may scroll vertically; at 375 x 667 scrolling is expected.

## Source boundary

The behavior above is already present in the degraded artboard and the iOS/Android J6 fixtures. It is consistent with `moves-history.v2`, which preserves `followed: null`, maps unverifiable outcomes to `not_verified`, and keeps provenance explicit. This contract does not authorize a new API field or fabricated provider result.

## v2 Amendments

The following intelligence pass amendments apply to this screen contract:

### 1. Freshness
The screen exists because outcome reads failed: `Four scoped calls exist, but move_outcomes could not be read.` The rows (calls, follow-through) are historical and stable; only the outcome column is missing. Re-read cadence for the failed outcome feed is *unspecified in v1 — proposed:* retry on a schedule and flip rows to their mapped outcomes when reads succeed, without rewriting any other row content.

### 6. Error semantics
**Unspecified in v1 — proposed:** what happens when the call list itself fails (empty vs unread confusion — the J5 "unread, not empty" principle should apply: a failed call-list read must not render as an empty Ledger).
