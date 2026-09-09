# Honest states canvas

Ten artboards covering the **states each backend contract can actually return** for the four
approved-but-unbuilt screens, plus League, the switcher and the Trade rebuild.

Canvas: https://claude.ai/code/artifact/7dc02ced-d715-46d1-9633-cd0fb838e42e

## Why this canvas exists

The existing `design/app-rework-canvas/` covers the happy path. This one covers what the API says
when it cannot give a happy path — which is where Omen's builds have repeatedly gone wrong: a
fabricated PPR label, a bid of `0` where the contract says `null`, a confident number with no
basis. Every artboard here is drawn from `Blueprints/api-routes.md`, not from a design idea.

| Artboard | Contract | State |
| :--- | :--- | :--- |
| `Main` | `waiver-analysis.v1` | `confirmed_opportunity`, FAAB determined — bid with basis |
| `WaiverNotDetermined` | `waiver-analysis.v1` | waiver system `not_determined` — the §6.2 gate: move renders, bid does not |
| `WaiverNoMove` | `waiver-analysis.v1` | `no_credible_move`, priority league, Yahoo's no-projections limitation |
| `StartSitClear` | `start-sit-detail.v1` | `clear_decision` — evidence `kind` chips |
| `StartSitIncomplete` | `start-sit-detail.v1` | `incomplete_data` — scoring format unread, never assumed PPR |
| `LedgerDetail` | `move-detail.v1` | followed-and-missed receipt; pre-A6 row naming the PPR fallback |
| `LeagueDegraded` | `league-overview.v1` | matchup `unavailable` beside live standings — independent failure |
| `SwitcherSheet` | `league-directory.v1` | three connection states; server-ordered platform groups |
| `TradeRoster` | `trade-compare.v2` | roster-based builder, 2/3-team shapes |
| `TradeNeedsContext` | `trade-compare.v2` | `close_needs_context`, unauthenticated (200, not 401) |

## Before building any of these

Run **`slops-canvas-to-code`** against the artboard first — it compiles the artboard into a screen
contract with a per-element acceptance checklist, then diffs the built screen against it. That is
the skill written for this exact failure, and it is now routed in
`Blueprints/playbooks/skill-activation-runbook.md`.

Then **`slops-native-ui-audit`** for the verdict. The two answer different questions: canvas-to-code
asks whether the screen matches its artboard, native-ui-audit asks whether the screen is any good.
Do not use `slops-ui-ux-audit` here — it is the web auditor.

## Not in this canvas, deliberately

Store listing assets (they come after the app is presentable), `off_season` / `no_decision` on every
screen, `player_unavailable` on Start/Sit, the healthy full League overview (`app-rework-canvas`
already carries a matchup + standings screen), and Trade share output and counters.

**All sample data is invented.** No real league, team or player figure here was read from a provider.
