# Screen contract - Ledger detail degraded

Compiled from `design/native-visual-lock-2026-09-13/LedgerDetailDegraded.dc.html`. This contract records the existing immutable `move-detail.v1` receipt behavior and J6 degraded fixture; it does not backfill missing history from current data.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Ledger — a receipt with gaps |
| Family | Ledger, switcher, account |
| Journey | J6 — The receipts; degraded pass |
| Frame | 390 x 844; iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | scrolls vertically; horizontal scrolling is forbidden. |
| Data route | GET /api/moves/:id |
| API contract | move-detail.v1 |
| Capability profile | `ledger` |

## State contract

- The receipt is immutable. Missing confidence, risk, and reasoning remain empty and are never copied from a current brief.
- Missing or unsafe timezone context must be stated; a client must not silently reinterpret the issued instant as local time.
- Follow-through is `Follow-through unknown`; outcome is `Not verified`. Neither may be inferred from the recommendation.
- Evidence classes stay distinct: Depth chart is used/live; Schedule strength is read-but-unused and carries no Live chip; Opponent roster is unavailable and names the provider limitation.
- The fairness note remains visible: losses stay in the Ledger and history is not rewritten to show only wins.

## Locked copy

- `The confidence band, the risk read and Omen’s reasoning were not stored with this receipt. They are left empty rather than filled from this week’s brief — a receipt states what was true when it was issued.`
- `Follow-through unknown` / `Not verified`
- `Yahoo did not hand back the transaction log for this week, so Omen cannot say whether you made this claim.`
- `Read, and it did not move this call.`
- `Unavailable. Yahoo does not expose other teams’ rosters for this league type, so Omen had no view of who else needed a back.`
- `This receipt is frozen as it was issued. Losses stay in the Ledger — a record that only shows wins is marketing.`

## Interaction and resilience requirements

- League switcher, Account, and tab-bar actions match `LedgerDetail-v1.md`.
- Interactive targets are at least 44pt on iOS and 48dp on Android.
- Dynamic Type/font scale and the long limitation copy reflow vertically without clipping or horizontal overflow.
- The evidence list may grow vertically; evidence text must not be truncated to preserve the 844pt fold.

## Source boundary

The behavior above is present in the degraded artboard and both native J6 fixtures. `move-detail.v1` owns the immutable snapshot, evidence-at-the-time categories, safely-known user action, measured outcome language, and explicit `issued_at_timezone`. No current source is re-read onto history.
