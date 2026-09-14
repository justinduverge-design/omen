# What each artboard is made of

**The canvas is the reference for the actual screens.** An artboard shows *what goes where*. This
page adds the other two things a builder needs and a picture cannot carry: **why** a block is there,
and **what data makes it work**.

Every contract below is verified against `Blueprints/api-routes.md` plus the 2026-09-14 binding
work in this branch. Where a contract remains capped or storage-gated, it says so directly; a
builder must render that honest state rather than infer a happier one.

**Read order for a builder:** this page → the artboard → the governing spec in the Rule column.

---

## Experience model added 2026-09-14

The verified route binding is necessary, but the native build also inherits the destination job. These are governing rules for the contracts in `Blueprints/specs/design/screen-contracts/`:

- **Command** is the general manager's desk: an aerial, light, weekly brief across matchup, roster pressure, waiver opportunity, trade openings, league movement, and recent evidence. It routes to depth; it does not become the detailed surface for every domain.
- **Omen** is the single weekly play: start, sit, pickup, drop, or trade. When there is no defensible single play, the page explains why holding is the recommendation instead of filling the screen with a weak move.
- **Trade** is the argument-settler: the place a manager opens when the league chat is debating fairness, value, veto, or whether to make the offer. It must show both sides and state the caveat.
- **League** is the scout room: standings pressure, opponent needs, trade openings, waiver context, and activity. It surfaces intelligence quality, including provider gaps, rather than hiding asymmetry.
- **Ledger** is the receipts: verified outcomes, self-reported action, and unknown follow-through stay visually and semantically separate.

## Onboarding & connection

| Artboard | Data | Rule | Notes |
|---|---|---|---|
| `SignIn` | `GET /api/session` → `session.v1` | `m4-auth-providers-v1-brief.md` | Five providers enabled on Supabase: email, Google, Apple, Discord, passkeys. Marks carry brand colour, buttons stay neutral — registry §2.3. |
| `EmailCode` | Supabase OTP — **not an Omen route** | same | Six digits, 10-minute expiry. The invisible capture field is a deliberate, permanently allowlisted exception (`M13-PrimitiveDebt`). |
| `ConnectLeague` | `GET /api/platforms/state` → `platform-provider-state.v1` | `omen-mobile-onboarding-connection-contract-v1.md` | State is opaque: recovery action and error code only, **never credentials or Vault IDs**. |
| `EspnConnect` | `POST /api/platforms/espn/connect` | facts-of-record #6 | Consent before the sheet. Cookie **names** are shown; a cookie **value** is never displayed, logged, or echoed. Anywhere. Ever. |
| `ConnectFailed` | `platform-provider-state.v1`, recovery action | #6, and `known_issues.md` on ESPN fragility | 401 is the common case and it means stale cookies, not a broken league. Other leagues stay live. |

## Command Center

| Artboard | Data | Rule | Notes |
|---|---|---|---|
| `CommandCenter` | `dashboard-summary.v1` + `league-overview.v1` + `waiver-analysis.v1` + `moves-history.v2` | pages workshop — Small Council | Headline rotates on `game_week.phase`. **Every section fails independently**; a dead matchup read sits beside live standings. Ledger rows require explicit `platform` and `league_id`. |
| `CommandQuiet` | `GET /api/dashboard/quiet-week` → `quiet-week.v1` | voice fence, workshop lines 55–57 | Neutral variant. Playful is permitted **only** here, and only when the server has positive quiet-week evidence. |
| `CommandQuietStraight` | `GET /api/dashboard/quiet-week` → `quiet-week.v1` | same | Predicate is now server-owned: straight fires on loss, injured starter, provider failure, or unknown quiet inputs. Copy stays locked to the artboard. |
| `CommandNoLeague` | `dashboard-summary.v1`, no active connection | — | Zero state. Not an error state — nothing dashed or struck through. |
| `ReportPill` | `GET /api/beta/reports/schema`; `POST /api/beta/reports` → `beta-report.v1` | `W1-B` | Metadata-only route exists. Sends screen, app/build/OS/device, provider connection state, recent scrubbed error codes and a user note. **Never league data, rosters, screenshots or credentials.** Storage SQL is review-only until migration approval. |

## Omen

| Artboard | Data | Rule | Notes |
|---|---|---|---|
| `OmenCall` | `POST /api/omen/mvp-move` with `contract_version: "omen-decision-brief.v2"` → `omen-decision-brief.v2` | D-band, workshop | v2 exists behind explicit negotiation. It returns a band plus drivers and strips numeric confidence from the response. v1 remains available for old clients. |
| `OmenEvidence` | same, expanded | §5.2 evidence categories | Each entry carries its own `kind` — `verified` / `projection` / `model` / `inference` / `limitation`. **A projection is never rendered as a fact.** |
| `StartSitClear` | `GET /api/start-sit/detail` → `start-sit-detail.v1`, `state: "clear_decision"` | visual briefs §5 | |
| `StartSitIncomplete` | same, `state: "incomplete_data"` | §5 | An unverified scoring format is stated as a limitation and **never assumed to be PPR**. |

## League & waiver

| Artboard | Data | Rule | Notes |
|---|---|---|---|
| `LeagueTable` | `GET /api/league/overview` → `league-overview.v1` | scout's-nest order, facts #16 as amended 2026-09-14 | Order is **strip → Table → Trade targets → Waiver → Activity**. `playoff_picture.settings_known` is `true` on Sleeper only; ESPN and Yahoo are unproven. |
| `LeagueWaiver` | `GET /api/waivers/analysis` → `waiver-analysis.v1`, `state: "confirmed_opportunity"` | D5, visual briefs §6 | `best_move.bid` is `null` — **never `0`** — when any input is missing. **Claim probability is never returned, for any league.** |
| `WaiverNoMove` | same, `state: "no_credible_move"` or `"no_low_cost_drop"` | §6.2/§6.3 | Both states already exist in the contract and are the most under-used thing in it. |
| `WaiverNotDetermined` | same, `waiver_system.system: "not_determined"` | §6.2 gate | FAAB appears only for a positively-determined FAAB league; priority only for a determined priority league; **neither** for `not_determined` — which is what ESPN and Yahoo return today. |
| `LeagueDegraded` | `league-overview.v1`, per-section `status: "unavailable"` | independent section failure | The list is **unread, not empty**, and the screen must say which. |
| `LeagueNoRosters` | `league-overview.v1` + trade constraint | "no rosters, no trade call" | A **permanent provider limit for that league**, not an outage. Do not build a retry for it. |

## Trade

| Artboard | Data | Rule | Notes |
|---|---|---|---|
| `TradeBuild` | `GET /api/trade/capabilities`; `POST /api/trade/compare` → `trade-compare.v2` | trade workshop | Free and public; `league_context` + bearer opts into personalised analysis. Current capability says `max_teams: 2`. Three-team controls must render unavailable until that changes. |
| `TradeRoster` | `trade-capabilities.v1` + `trade-compare.v2` `league_context`, rosters via `league-overview.v1` | — | Three-team support is verified as **unsupported** for now: `three_team.supported: false`, `reason: "multi_team_comparison_not_implemented"`. |
| `TradeVerdict` | `trade-compare.v2`, four verdict states | §9.2 | |
| `TradeNeedsContext` | `trade-compare.v2`, `close_needs_context` / `insufficient_data` | §9.2 | Both states are live in production and verified. |
| `TradeShare` | `POST /api/trade/share` → `trade-share.v1` | — | 30-day hash, Redis in production, no auth and no provider data. Names are off by default on the card. |

## Ledger, switcher, account

| Artboard | Data | Rule | Notes |
|---|---|---|---|
| `Ledger` | `GET /api/moves?contract_version=moves-history.v2&platform={platform}&league_id={league_id}` → `moves-history.v2` | — | `C4` resolves to a scoped index on the existing route. v2 omits hit-rate summary, requires league scope, and maps raw stored `win`/`loss` to `worked`/`did_not_work`/`not_verified`. |
| `LedgerDetail` | `GET /api/moves/:id` → `move-detail.v1` | visual briefs §7 | Immutable snapshot. The stored `outcome` column holds raw `win`/`loss` and **is translated, never surfaced raw**. `issued_at` carries `issued_at_timezone`. |
| `SwitchSheet` | `GET /api/leagues` → `league-directory.v1`; `POST /api/leagues/active` | `omen-league-switcher-contract-v1.md` | Platform groups ordered by followed-league count — `orderPlatformsByFollowCount` is the single authority and **clients must not re-sort**. |
| `SwitchLoading` | mid-`POST /api/leagues/active` | §10.3 | The response's `refresh` list names the surfaces to re-read. **The previous team's numbers are discarded, never reused while loading.** |
| `Account` | `dashboard-summary.v1`; `GET /api/user/export`; `DELETE /api/user/delete` | — | Delete requires the exact string `DELETE MY OMEN DATA`. Export excludes OAuth tokens, ESPN cookies and Vault ids. |

---

## The five former stop-and-ask items, resolved

These were the only places a builder previously had to stop. They are now concrete local bindings:

1. **`omen-decision-brief.v2`** exists by explicit request on `POST /api/omen/mvp-move`. It returns
   `confidence.band` and `confidence.drivers`; it does not surface a numeric confidence.
2. **Quiet-week straight** is server-owned in `quiet-week.v1`. Neutral requires all positive quiet
   evidence; straight fires on loss, injured starter, provider failure, or unknown inputs.
3. **Ledger index** is `moves-history.v2` on `GET /api/moves` with required `platform` and
   `league_id`; it is scoped and outcome-safe.
4. **Three-team trade** is not a hidden build path. `trade-capabilities.v1` says `max_teams: 2` and
   `three_team.supported: false`, so three-team artboard controls render unavailable.
5. **Report pill** has `beta-report.v1` for metadata-only reports. The route exists; storage SQL is
   present for review and still needs migration approval before production use.

## Two rules that outrank the artboards

- **Ship order.** `data-stub` and `data-mock` stay in both token files until `C3` lands the hatch and
  dashed treatments as locked components. An artboard drawing them is progress toward that, **not
  permission to delete the colours**.
- **Honest states are not optional decoration.** Every degraded artboard here corresponds to a real
  `state` value the contract already returns. If a builder cannot reach one of these states in a
  test, that is a finding about the build, not a reason to drop the screen.

## Device floor

D11 is measured at **390×844**. iPhone SE (375×667) scrolls and that is accepted — founder,
2026-09-14. iPad is declared in `TARGETED_DEVICE_FAMILY` and deferred.
