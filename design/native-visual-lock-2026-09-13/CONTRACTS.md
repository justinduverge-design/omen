# What each artboard is made of

**The canvas is the reference for the actual screens.** An artboard shows *what goes where*. This
page adds the other two things a builder needs and a picture cannot carry: **why** a block is there,
and **what data makes it work**.

Every contract below is verified against `Blueprints/api-routes.md`. Where a contract does **not**
exist, it says so and names the sprint item that creates it — **those are the only places a builder
is allowed to not know, and they must be raised, not invented.**

**Read order for a builder:** this page → the artboard → the governing spec in the Rule column.

---

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
| `CommandCenter` | `dashboard-summary.v1` + `league-overview.v1` + `waiver-analysis.v1` + `moves-history.v1` | pages workshop — Small Council | Headline rotates on `game_week.phase`. **Every section fails independently**; a dead matchup read sits beside live standings. |
| `CommandQuiet` | same, quiet predicate | voice fence, workshop lines 55–57 | Neutral variant. Playful is permitted **only** here. |
| `CommandQuietStraight` | same | same | **⚠ The switching predicate does not exist.** Copy is locked; the server-side trigger is owed by `V-QuietWeekStraight`. A builder must not infer it from the client. |
| `CommandNoLeague` | `dashboard-summary.v1`, no active connection | — | Zero state. Not an error state — nothing dashed or struck through. |
| `ReportPill` | **no contract yet** | `W1-B` | Sends screen, app version, provider. **Never league data.** Route unbuilt. |

## Omen

| Artboard | Data | Rule | Notes |
|---|---|---|---|
| `OmenCall` | `POST /api/omen/mvp-move` → **`omen-decision-brief.v2`** | D-band, workshop | **⚠ v2 does not exist yet — `C1` creates it.** v1 ships a numeric confidence; the artboard shows a band. Do not build against v1 and do not keep the numeral. |
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
| `TradeBuild` | `POST /api/trade/compare` → `trade-compare.v2` | trade workshop | Free and public; `league_context` + bearer opts into personalised analysis. |
| `TradeRoster` | `trade-compare.v2` `league_context`, rosters via `league-overview.v1` | — | **⚠ Three-team support is unverified.** Probe before building the capped-at-three shape. |
| `TradeVerdict` | `trade-compare.v2`, four verdict states | §9.2 | |
| `TradeNeedsContext` | `trade-compare.v2`, `close_needs_context` / `insufficient_data` | §9.2 | Both states are live in production and verified. |
| `TradeShare` | `POST /api/trade/share` → `trade-share.v1` | — | 30-day hash, Redis in production, no auth and no provider data. Names are off by default on the card. |

## Ledger, switcher, account

| Artboard | Data | Rule | Notes |
|---|---|---|---|
| `Ledger` | `GET /api/moves` → `moves-history.v1` | — | **⚠ `C4` must verify** whether this already satisfies the index before anyone specifies `moves-index.v1`. Cheapest outcome is that it does. |
| `LedgerDetail` | `GET /api/moves/:id` → `move-detail.v1` | visual briefs §7 | Immutable snapshot. The stored `outcome` column holds raw `win`/`loss` and **is translated, never surfaced raw**. `issued_at` carries `issued_at_timezone`. |
| `SwitchSheet` | `GET /api/leagues` → `league-directory.v1`; `POST /api/leagues/active` | `omen-league-switcher-contract-v1.md` | Platform groups ordered by followed-league count — `orderPlatformsByFollowCount` is the single authority and **clients must not re-sort**. |
| `SwitchLoading` | mid-`POST /api/leagues/active` | §10.3 | The response's `refresh` list names the surfaces to re-read. **The previous team's numbers are discarded, never reused while loading.** |
| `Account` | `dashboard-summary.v1`; `GET /api/user/export`; `DELETE /api/user/delete` | — | Delete requires the exact string `DELETE MY OMEN DATA`. Export excludes OAuth tokens, ESPN cookies and Vault ids. |

---

## The five places a builder must stop and ask

Everything else on this page is settled. These are not:

1. **`omen-decision-brief.v2` does not exist.** `C1`. Building `OmenCall` against v1 gets you a
   numeric confidence the artboard does not have.
2. **The quiet-week straight predicate does not exist.** `V-QuietWeekStraight`. The copy is locked;
   *when it fires* is not.
3. **The Ledger index is unverified.** `C4`.
4. **Three-team trade support is unverified** on every provider. Probe first.
5. **The report-pill route does not exist.** `W1-B`.

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
