# Contract v2 Amendment Log

Date: 2026-09-29

## SignIn

**Proposal:** The provider list (Apple / Google / Discord / email, plus passkeys per the governing rule) is static configuration; it has no freshness dimension, but if a provider is disabled server-side the screen must not offer it — unspecified in v1 how the screen learns that.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added Freshness amendment to v2 contract.

**Proposal:** Cannot initiate OAuth by itself: the contract explicitly limits buttons to local UI state, so the actual OAuth handoff is bound by the implementing auth flow, not this contract. The tap→flow handoff is unspecified in v1.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added Limitations amendment to v2 contract.

**Proposal:** State strings section: "No explicit state string on this artboard; state is carried by the API contract above." The contract defines no loading state for the session check and no offline state. Unspecified in v1 — proposed: render the sign-in options optimistically while the session check resolves (fail-open to sign-in), rather than a blank wait.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** Unspecified in v1. No failure rendering for `GET /api/session` failing, and no retry semantics. Proposed: on session-check failure, show the sign-in screen as the safe default and retry the check silently on the next provider tap.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

## EmailCode

**Proposal:** JSON states list only `["nominal"]`. Expiry reached, resend throttled/rate-limited by Supabase, and offline — all unspecified in v1. Proposed: on expiry, replace the entry state with an explicit "code expired, send a new one" state rather than a generic error.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** Unspecified in v1: wrong code, expired code, and resend failure have no specified rendering. Proposed: inline error on the code field for wrong/expired codes (distinguishing the two, since the recovery differs), and a cooldown on "Send it again" — currently no rate-limit semantics, so a user can hammer resend.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

## ConnectLeague

**Proposal:** The `JD` avatar → signed-in user's profile (display name/initials). Which identity record supplies it is unspecified in v1.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added Provenance amendment to v2 contract.

**Proposal:** Per the Controls table, each `PlatformConnectionCard` does "Update only the named local UI state; no hidden network side effect" — actual navigation into the provider flow is bound by the implementing flow, unspecified in v1.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added Limitations amendment to v2 contract.

**Proposal:** JSON states are `["empty", "nominal"]`, but what "empty" means here is unspecified in v1 — proposed: first-run state with zero providers connected (which is also the expected initial condition, so "empty" may simply be nominal-with-nothing-connected; the contract should say so).
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** `GET /api/platforms/state` failing has no specified rendering. Unspecified in v1 — proposed: do not render "no connections" when the fetch failed; that would be indistinguishable from a true empty state.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** Unspecified in v1 for the state fetch. No retry semantics. Proposed: blocking error with retry, because every downstream screen depends on this state.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

## EspnConnect

**Proposal:** The contract specifies no error rendering for the consent step, and does not wire a failed `POST /api/platforms/espn/connect` to ConnectFailed. Unspecified in v1 — proposed: a failed connect POST routes to ConnectFailed with the provider error attached, rather than stranding the user on the consent screen.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

## ConnectFailed

**Proposal:** The artboard *is* the error state and renders it well. JSON adds a `"degraded"` state whose meaning is unspecified in v1 — proposed: degraded = partial failure (some leagues of the provider affected, or intermittent), error = this provider fully unusable. The contract should define the boundary.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** What renders when the 401 event details are missing (no timestamp, no league id)? Unspecified in v1 — proposed: fallback copy that omits the specifics rather than showing blanks.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** Reconnect itself failing is unspecified in v1 — proposed: stay on this screen with the event timestamp updated, not a second error screen.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

## CommandNoLeague

**Proposal:** The governing rule cleanly separates zero state from error state — good. But: if `GET /api/dashboard/summary` itself fails (backend unreachable), the screen cannot distinguish "no league" from "cannot reach backend." Unspecified in v1 — proposed: fetch failure must render as an error state with retry, never as "No league yet" (presenting empty on a failed fetch would be a false zero state).
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** Unspecified in v1 beyond the zero/error distinction in the governing rule. Proposed: on summary-fetch failure, an error rendering with retry; the "Connect a league" CTA remains available since connecting is still the user's path forward.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

**Proposal:** Contradiction flagged: the "See how Omen decides" button's action is "Open OmenEvidence for the same decision id" — but with no league connected, no decision exists and there is no decision id. The contract wires a control to a nonexistent object. Unspecified in v1 — proposed: define the no-decision target (a generic "how Omen decides" explainer) or gate the button on decision existence. See cross-screen notes.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

## Account

**Proposal:** The `JD` avatar → user profile initials; which identity record supplies it is unspecified in v1.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added Provenance amendment to v2 contract.

**Proposal:** JSON states list only `["nominal"]`. Connections list failing to load, a disconnect action failing mid-flight, export failing — all unspecified in v1. Proposed: disconnect needs defined semantics (optimistic with rollback, or confirm-then-mutate); the contract currently says nothing.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** Unspecified in v1 for export and delete failures. Proposed: delete must be confirmed and idempotent — and the identity split makes this load-bearing: `DELETE /api/user/delete` against split identity must define whether it deletes the `auth.users` record, the `public.users` record, provider connections, or all three. Currently unspecified; must be resolved in the identity redesign, not left to implementation.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

## ReportPill

**Proposal:** The schema is fetched first (`GET /api/beta/reports/schema`); a stale cached schema risks a rejected POST. Schema cache TTL is unspecified in v1.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added Freshness amendment to v2 contract.

**Proposal:** JSON includes an `"error"` state, but what renders when the schema fetch fails or the POST fails is unspecified in v1. Proposed: the pill is most needed exactly when things look wrong — which correlates with backend trouble — so define offline behavior explicitly (local queue with later send, or inline failure with retry). Currently neither is specified.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added Degraded states amendment to v2 contract.

**Proposal:** Unspecified in v1: POST failure, schema-fetch failure, and offline taps have no specified rendering or recovery. Proposed: never silently drop a user-initiated report; at minimum confirm receipt or explain the failure with a retry path.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added Error semantics amendment to v2 contract.

## CommandCenter

**Proposal:** **Matchup scoreboard** (`LIVE · Q2`, `64.8`, `119.6 – 114.2`, `PROJECTED · 5.4 AHEAD`, "Four of your starters left; two of theirs."): dashboard data during live games — stale means older than the last provider poll. *Unspecified in v1 — proposed:* cap dashboard score cache at ~60s; never reuse a cached score on a decision surface.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** Requirement states: nominal, partial, degraded. The experience contract specifies the policy: "Do not hide unavailable domains. If waivers, league activity, trades, or ledger evidence are unavailable, Command names the gap and keeps the rest of the desk useful." *Specified:* per-section independent failure with named gaps. *Unspecified in v1 — proposed:* the exact copy/shape of a named gap per section (a waiver-section gap vs a ledger-section gap), and whether a fully failed dashboard (all four contracts down) falls through to CommandQuietStraight or to a dedicated empty state.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** *Unspecified in v1:* retry behavior per section, whether failed sections retry independently or on screen refresh, and what "names the gap" renders as (copy, icon, carrier). *Proposed:* each failed section renders its gap inline with a retry affordance scoped to that section's contract; the screen never shows a full-screen error while any section has data.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## CommandQuiet

**Proposal:** *Unspecified in v1:* what renders if `GET /api/dashboard/quiet-week` fails outright. *Proposed:* a quiet-week route failure must never render the quiet verdict (that would be the voice-fence violation: silence mistaken for all-clear). Failure routes to CommandQuietStraight (the honest variant) or a retry, never to "Nothing worth waking you for."
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## CommandQuietStraight

**Proposal:** *Unspecified in v1:* retry/recovery path from the straight variant (unlike StartSitIncomplete, there is no "Retry ESPN" equivalent here). *Proposed:* when the trigger was provider failure, render a scoped retry for the failed domain; when the trigger was loss/injury, no retry is meaningful and the screen stands as the week's answer.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## SwitchSheet

**Proposal:** Team needs chips (`NEEDS RB`, `NEEDS WR`): decision-adjacent. *Unspecified in v1 — proposed:* roster-needs are derived at directory-read time and expire with the roster read; a needs chip older than the latest roster sync must not render.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Unspecified in v1:** where partner-chip eligibility comes from ("comparison remains capped to two teams by trade-capabilities.v1" references a contract not in the screen's api_contracts list).
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** Requirement states list only `nominal`. *Unspecified in v1:* empty directory (no connected leagues — likely routes to ConnectLeague via the `+` control), partial provider failure (one platform down), and POST failure. *Proposed:* per-platform sections fail independently with named gaps (consistent with the CommandCenter independent-failure rule); a fully empty directory renders the connect path, not an empty sheet.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** *Unspecified in v1:* what happens if `POST /api/leagues/active` fails (the row tap commits to "render SwitchLoading until the refresh list completes" — if the POST fails, SwitchLoading must not render). *Proposed:* failed POST keeps the sheet open with the failed row named; SwitchLoading only renders after a 2xx.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## SwitchLoading

**Proposal:** *Specified:* no stale-value reuse during league switch. *Unspecified in v1 — proposed:* a timeout bound — how long the loading state may persist before it becomes a failure (the requirement lists a `partial` state, suggesting the refresh list can partially complete).
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** Requirement states: loading, partial. *Specified:* the loading state and its copy. *Unspecified in v1 — proposed:* the `partial` state (some refresh-list items arrived, some didn't) needs defined copy and a decision: render CommandCenter with named gaps, or keep loading.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** *Unspecified in v1:* refresh failure, timeout, and provider failure mid-switch. *Proposed:* on failure, return to the previous league as active (the POST either fully commits or it doesn't — there is no half-switched state) and name the failure; never strand the user on a loading screen with no active league. Backend has no dedicated active-league test file (traceability index) — the commit/rollback semantics need a test before implementation.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## OmenCall

**Proposal:** *Unspecified in v1 — proposed:* the envelope must carry `computed_at`, the snapshot/projection vintage behind the call, and the provider lock time; the screen renders "as of" from those values and refuses to render a call whose inputs predate the latest injury report or snapshot.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** *Unspecified in v1 — proposed:* the mapping from requirement states to the no-play reasons (which reason renders under `degraded` vs `unavailable`), and whether a `degraded` OmenCall still renders a call (with named unread inputs, per the O-LINE pattern) or declines.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** *Unspecified in v1:* what the user sees when `POST /api/omen/mvp-move` fails outright (network, 5xx, timeout). *Proposed:* never render a cached call as current — a failed call fetch renders the unavailable state with the last-computed timestamp if one exists ("last call computed Tuesday 3:04 AM; couldn't refresh"), plus a retry scoped to the brief. Per the capability-expression latency rule ("advisory timeouts are represented as unavailable capability evidence rather than a spinner or invented fact"), a timed-out input renders as unread, not as a spinner.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## OmenEvidence

**Proposal:** *Specified:* the LIVE/SAMPLE tags on the rows. *Unspecified in v1 — proposed:* what LIVE and SAMPLE mean operationally — proposed: LIVE = read in the current decision computation (same `computed_at` as the call); SAMPLE = drawn from the nflverse snapshot with the snapshot date named. A row whose data predates the call's `computed_at` must not render as supporting the call.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** Requirement states: nominal, degraded, unavailable, partial — the widest in J2/J3. *Specified:* the row-class system degrades gracefully by construction (an unread input renders as a limitation row rather than breaking the screen). *Unspecified in v1 — proposed:* what `partial` means here (some rows unavailable?) vs `degraded` (brief structurally incomplete?), and the minimum viable argument — how many evidence rows must be present before the screen declines and routes back to OmenCall's no-play state.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** *Unspecified in v1:* failure to load the brief for the decision id (deep link, stale id). *Proposed:* OmenEvidence never fabricates an argument for a decision id it can't load — it routes back to OmenCall (which re-fetches or renders its own unavailable state). The "full argument" must always be the argument for *this* call; a mismatched brief is worse than none.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## StartSitClear

**Proposal:** Requirement states list only `nominal` — but the screen's own closest-call logic implies a monitoring dependency. *Unspecified in v1:* what renders if the 11:00 AM re-check fails or if projections go stale after render. *Proposed:* a stale clear-decision (inputs changed since render) must visibly expire — the "9 OF 9 OPTIMAL" claim has a half-life, and the screen needs an "as of" it doesn't currently have.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** *Unspecified in v1:* `GET /api/start-sit/detail` failure. *Proposed:* same rule as OmenCall — never render a cached "all clear" as current; failure renders unavailable with last-computed time, not a stale all-clear (a stale all-clear is the most dangerous failure in the set: it tells the user to do nothing on bad data).
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## StartSitIncomplete

**Proposal:** *Unspecified in v1 — proposed:* retry failure (recovery action itself fails) — proposed: after a failed retry, the screen names the failure and offers the manual path the copy already concedes ("make this week's call yourself — Omen will be back next week either way"); it must not loop the user through retries.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## TradeBuild

**Proposal:** **Partner need chips** ("NEEDS RB", "NEEDS WR", "NO HOLE", E025/E029/E033) — derived from roster reads + projections. Fresh at view time only; a need computed Tuesday decays as the week progresses (waivers, injuries, lineup changes). Stale = underlying roster read or snapshot older than the current week — unspecified in v1, proposed: the chips must carry the same timestamped provenance as the roster read.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Leg ranks** ("RB 8", "WR 3", "—" for Tyjae Spears, E051/E058/E065) — from the latest nflverse weekly snapshot (Tuesday 05:45 ET). Stale = a new week has begun without a new snapshot, or mid-week news (injury, depth-chart change) supersedes the snapshot. The contract shows the ranks with no data-as-of carrier — unspecified in v1, proposed: ranks render with the snapshot week.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Verdict card** ("Counter" / "LEANING" / *"Three-team deals fail on the middle team. Ask Chubb Rock for their 2027 second — you're taking the least certain asset."*, E068–E070) — model inference at compare time. Trade values decay as the week progresses: a Tuesday verdict is materially weaker by Sunday. The contract carries no generated-at timestamp on the verdict — unspecified in v1, proposed: the verdict renders "compared <time>" so a stale build is visible.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** Need chips: inference over provider roster reads + projections. Marked as Omen's read by the experience contract's spirit ("Show both sides … without reading hidden math"), but the contract never labels the chips as inference vs provider fact — unspecified in v1, proposed: need chips carry an inference marker.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** Verdict prose ("Three-team deals fail on the middle team…"): local-model generation (gemma3:4b route) grounded in compare outputs — which model produces the prose is unspecified in v1, proposed: the contract names the model route and requires the prose to cite the compare inputs it used.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** Value ranks are scoring-context-dependent (PPR vs standard vs half-PPR); the contract shows "RB 8" with no scoring carrier — cross-league comparisons can mislead. Unspecified in v1 — proposed: the value model is parameterized by the league's scoring settings and the verdict carries the scoring context.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** **Three-team tension:** the artboard renders a three-team build ("THREE TEAMS" kicker E015, three legs E044–E065) while capabilities cap `max_teams=2`, and E079 ("Copy all three legs & open ESPN") is *"Disabled while trade-capabilities.v1 reports max_teams=2"*. The three-team builder is a deferred candidate (ADR-001); under current capabilities the screen must not present the three-leg build as submittable. How `trade-compare.v2` scores a 3-team input when `max_teams=2` (reject vs pairwise) is unspecified in v1 — proposed: reject with a capabilities-shaped error, never a silent pairwise verdict.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** `partial` — named in the requirements JSON but **unspecified in v1**: no rendering is defined. Proposed: `partial` = compare returned with missing inputs (e.g. one roster unavailable); the screen renders what was used and names what was missing, per the experience contract's *"Close or insufficient-data trades must still help: name the missing context."*
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** If `POST /api/trade/compare` fails mid-build: the user's assembled legs are app state and must not be lost; the screen retries the compare without discarding the build. Unspecified in v1 — proposed.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

**Proposal:** If `GET /api/trade/capabilities` fails: the screen cannot know `max_teams` — fail closed (compare disabled with reason) rather than assuming 2. Unspecified in v1 — proposed.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

**Proposal:** "TYPE A TRADE" segment (E019, free-text input) vs "BUILD A TRADE": parse failures on the typed route must fall back to the builder with the typed text preserved, not a dead end. Unspecified in v1 — proposed.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## TradeRoster

**Proposal:** **Roster list** ("DAVANTE'S INFERNO / 12 PLAYERS", E045–E046) — the contract establishes the freshness pattern explicitly: *"Rosters read live from ESPN at 3:48 PM."* (E066) + `LIVE` LiveStatusMark (E067). This is the reference implementation for freshness carriers across J4. Stale = the provider read fails or ages; what "ages" means (minutes? until next open?) is unspecified in v1 — proposed: the LIVE mark downgrades to a timestamp after a defined threshold.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** Greyed "unlikely to move" rows + *"it is their only depth at a position they are thin in. You can still offer; Omen is telling you the odds, not stopping you."* (E063): model inference over roster construction — the contract correctly frames it as odds, not a block, and this framing must survive into the API: the response should mark these rows as inference with the reason (thin-at-position), not as provider flags. Which inputs feed the need model is unspecified in v1 — proposed: roster + projections + bye-week schedule.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** Roster reads are provider-shaped: ESPN/Sleeper/Yahoo expose different fields and refresh at different rates. "UNRANKED" vs provider-missing must stay distinct. Cross-provider field parity is unspecified in v1 — proposed: the roster adapter normalizes to a common shape and marks provider-native vs derived fields.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** No injury/availability signal on rows in v1 — a player "unlikely to move" because he's actually hurt reads the same as a depth reason. Unspecified in v1 — proposed: availability flags join the row when the data exists.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** `unavailable` — named in the requirements JSON but **rendering unspecified in v1**. Proposed: when the provider roster read fails, the screen keeps the partner selection and last-known timestamp (if any), shows retry, and never silently substitutes a cached roster as live — a stale roster presented as "LIVE" would be a trust violation. Cached rosters render with their original timestamp, never the LIVE mark.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** If `trade-capabilities.v1` reports the provider as unsupported for roster reads, the screen must say so plainly rather than spinning — unspecified in v1, proposed.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## TradeNeedsContext

**Proposal:** **HAVE: "Both players' season projections. LIVE"** (E041–E042) — projections from the latest nflverse weekly snapshot, marked LIVE. Stale = new week begun without a new snapshot, or superseding mid-week news. The contract marks projections LIVE but never defines the snapshot week — unspecified in v1, proposed: the HAVE row carries the snapshot week.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** Rankings ("RB 8" vs "WR 3") are derived from the snapshot + value model, not provider data — the "Show the ranking comparison anyway" secondary action (E054) must keep that labeling when it renders the comparison. The contract specifies the button; the labeling requirement on the resulting comparison is unspecified in v1 — proposed.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** The free-public-compare tier (TradeBuild governing rule) structurally lands here: no `league_context` ⇒ no rosters ⇒ `close_needs_context`. The screen cannot distinguish "user hasn't connected" from "provider read failed" unless the API says so — unspecified in v1, proposed: the MISSING rows carry a reason code (not-connected vs read-failed).
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** `partial` = `insufficient_data` — named in the API contract but **rendering unspecified in v1**: the literal strings only cover the close case (HAVE projections). Proposed: `insufficient_data` = even projections/rankings are missing or unusable; the screen names what's missing (e.g. unknown player, no snapshot coverage) and offers the typed correction path rather than the connect CTA.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** If `POST /api/trade/compare` itself fails (network/server), the screen must not render the "Not yet" verdict refusal — a transport failure is not `close_needs_context`. The distinction between API-error and verdict-refusal rendering is unspecified in v1 — proposed: transport errors get retry with the legs preserved; only a successful compare returning the `close_needs_context` / `insufficient_data` states renders this screen.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

**Proposal:** "Connect this league" has *"no hidden network side effect"* (E053) — it routes to ConnectLeague; after connection the compare must re-run automatically with the previously entered legs intact. Leg preservation across the connect flow is unspecified in v1 — proposed.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## TradeVerdict

**Proposal:** **RISK: "Chase has missed two games with a hip."** + "MEDIUM RISK" / "LIVE" — injury/availability data, the fastest-decaying input on this screen. The LIVE carrier is present but the injury fact carries no timestamp — unspecified in v1, proposed: injury facts render with as-of dates; a verdict older than the latest injury report is flagged.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** Verdict prose authorship (local model vs template) is unspecified in v1 — proposed: the contract names the prose source and requires every factual claim in the prose to trace to a cited input. "Taylor is the better asset in a vacuum" is a value-model claim and must be reproducible from the cited snapshot.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** "Ask Omen for a counter" failure: the original verdict stands; the counter request fails independently with retry. The two are not a transaction — unspecified in v1, proposed.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

**Proposal:** Copy-to-clipboard failure on "Copy the offer & open ESPN": the offer text must remain visible/selectable so the handoff can be completed manually. Unspecified in v1 — proposed.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## TradeShare

**Proposal:** **Card header "OMEN · WEEK 7"** (literals) — the week stamp is the share's freshness anchor and is specified. But the 30-day hash outlives the data: a share opened on day 29 carries a verdict computed from a 4-week-old snapshot with no staleness signal. Unspecified in v1 — proposed: the shared card and text both carry data-as-of (snapshot week + compare time), so a stale share is visibly stale.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** `error` — named in the requirements JSON but **rendering unspecified in v1**. Proposed: on `POST /api/trade/share` failure, the card still renders (it is built from the already-present verdict), the hash-link action is marked unavailable with retry, and "Copy as text instead" remains fully functional — the text path never depends on the share endpoint succeeding.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states amendment to v2 contract.

**Proposal:** **The text fallback must never lose the user's typed context**: the toggle selections (team name on/off, league name on/off) are the user's input on this screen. On share-generation failure, "Copy as text instead" must produce text reflecting the current toggle states — the toggles are not reset, and the copied text matches what the card shows. Unspecified in v1 — proposed as a hard rule.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

**Proposal:** If the verdict itself is missing (deep link into TradeShare without a compare in context): the screen cannot fabricate a share. Unspecified in v1 — proposed: route back to TradeBuild with the legs preserved if available; never render a share card with placeholder verdict text.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

**Proposal:** Clipboard failure on "Copy as text instead": the text must be displayed in a selectable view so it can be copied manually. Unspecified in v1 — proposed.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## LeagueTable

**Proposal:** **Matchup strip** (literal `LIVE · Q2`, `64.8` vs `51.2`): live in-game scores. Freshness requirement is minutes; a strip older than the current game state is actively misleading because the user may make start/sit-adjacent judgments from it. Stale = showing a final or a quarter-old score without a timestamp. *Unspecified in v1 — proposed:* strip carries the provider's game-clock timestamp and degrades to "last update <time>" when no live feed.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Trade targets** (`3 OPENINGS`, `Thin at RB, three startable receivers. You have the reverse.`): roster-driven; must refresh whenever any league roster changes (trades, waiver claims process Wednesday AM). A trade opening computed against pre-waiver rosters is stale after claims process. *Unspecified in v1 — proposed:* trade-opening reads carry the roster snapshot timestamp they were computed against.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Waiver teaser** (`BEST MOVE`, Jaylen Wright / drop Roschon Johnson, `CONFIDENT`, `LOW RISK`): this is the same decision as LeagueWaiver and shares its hard deadline (see LeagueWaiver freshness). **After the waiver deadline the teaser must not render as actionable** — it is a summary of a dead decision. *Unspecified in v1 — proposed:* post-deadline, the teaser collapses to "claimed / passed" outcome or hides.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** Acceptance checks require "provider, risk, data-source, confidence, and provenance carriers exactly as registry section 2.3 states" — so the contract *requires* provenance carriers on render; the exact per-element mapping is *unspecified in v1 — proposed* in §1 above.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** **Unspecified in v1 — proposed:** total route failure (`GET /api/league/overview` 500/timeout) and offline have no contract-specified screen; proposed: cached last-good render with a staleness banner naming the failing section, never a blank screen, and never silently serving cached waiver content past the deadline.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## LeagueWaiver

**Proposal:** **Stale handling (the critical rule):** *unspecified in v1 — proposed:* after TUE 3:00 AM the screen must never present the pre-deadline move as actionable. Proposed post-deadline behavior: the screen flips to outcome mode (claimed / lost the claim / passed) fed by the provider transactions feed, and the pre-deadline read is archived to the Ledger as the decision record. The contract's `LIVE` state string on the best move suggests liveness awareness, but no post-deadline state is specified.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Budget** (`YOUR BUDGET $63 OF $100`): must reflect the provider's current FAAB ledger; a budget read that predates a processed claim is stale. *Unspecified in v1 — proposed:* budget carries a read timestamp.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Player read** (Jaylen Wright `RB · TEN`, `11.4`; reason `Pollard is out three weeks and Wright took almost every backup snap on Sunday`): injury status (provider or news feed — *unspecified in v1*), snap data (nflverse — *proposed*), projection figure `11.4` (model inference over nflverse + matchup — *proposed*).
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** **`LIVE` chip**: appears on the best move; meaning of the chip (live provider read vs computed?) is *unspecified in v1 — proposed:* chip = the underlying data was read from a live source within the decision window, as opposed to cached/modelled.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** **FAAB vs rolling vs reverse-standings differ completely.** This artboard shows budget AND claim order AND a bid, which implies a hybrid or FAAB-with-priority league. For pure rolling-waiver leagues the budget element is meaningless; for pure FAAB the claim order is meaningless. Which elements render under a positively-determined non-hybrid system is *unspecified in v1 — proposed:* budget renders only when `waiver_system` includes FAAB; claim order renders only when it includes priority; the bid renders only under FAAB. (WaiverNotDetermined withholds all three until the system is known — the same gating should apply per-element once known.)
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** The screen cannot execute the claim — it advises; the user claims in the provider app. *Unspecified in v1:* whether the app deep-links to the provider claim flow.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** **Unspecified in v1 — proposed:** provider waiver-feed failure mid-week (no transactions/rosters feed) should surface the WaiverNotDetermined-style withholding for the affected elements while keeping the system-independent player read — mirroring that screen's "WHAT IS STILL TRUE / WHAT OMEN WILL NOT TELL YOU" split.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## LeagueDegraded

**Proposal:** The two live sections (matchup strip `LIVE · Q2`, standings table) keep LeagueTable freshness rules. The unavailable sections (trade targets, activity) show no data, so staleness does not apply — but **the partiality labels themselves must be fresh**: a section marked UNAVAILABLE after its feed recovers is a stale label. *Unspecified in v1 — proposed:* re-check cadence for failed sections and label timestamps.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Unspecified in v1 — proposed:** retry backoff/limits (don't hammer a refusing provider); what happens when retry succeeds for one failed section but not the other; offline-during-retry behavior.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## LeagueNoRosters

**Proposal:** Scope note: the limitation is per league *type* on the provider (Yahoo league type here), not per user — a different league on the same provider may have full data. *Unspecified in v1 — proposed:* the limitation is keyed to (provider, league-type) and re-evaluated if the league's type/settings change.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** **Unspecified in v1 — proposed:** what the user sees if they change league settings mid-season such that rosters become available (proposed: the screen exits this state automatically on the next successful roster read).
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## WaiverNoMove

**Proposal:** The "no move" verdict is as deadline-bound as a positive one: `Next read Tuesday 3:00 AM. Omen will wake you only if something changes.` The verdict "nothing beats what you have" is computed against the current free-agent pool and rosters; any roster change (injury news, a drop by a league-mate) can invalidate it. *Unspecified in v1 — proposed:* the verdict carries the timestamp of the pool snapshot it was computed against ("checked all 143 free agents" implies a full-pool scan — the scan time should be shown), and the "wake you only if something changes" promise needs a defined trigger set (provider transaction events, injury-status changes).
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** `WHAT IT WOULD HAVE COST — Claiming the best available means dropping Tyjae Spears, who is one Pollard injury from being startable.` — opportunity-cost reasoning over the user's bench (provider roster) + injury contingency (news/injury feed — *unspecified in v1*).
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** Watch-list conditions (`IF POLLARD SITS`, `IF GODWIN MISSES WEEK 8`) depend on injury-status feeds — provenance of the trigger is *unspecified in v1 — proposed:* name the injury source when the watch fires.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** **State-boundary ambiguity (flag):** the contract covers `state=no_credible_move or no_low_cost_drop` — two distinct situations (nothing worth adding vs. something worth adding but no safe drop) under one screen. The artboard copy covers the first ("Nothing on this wire beats what you have"). The second case's trigger boundary — how bad must the drop options be before `no_low_cost_drop` fires instead of `confirmed_opportunity` with a forced drop? — is *unspecified in v1 — proposed:* define the drop-cost threshold in the waiver-analysis contract.
- **Decision:** Accept
- **Reason:** Clarifies system boundaries and improves UX around platform constraints.
- **Diff:** Added 4. Limitations amendment to v2 contract.

**Proposal:** **Data still needed:** the verdict needs the full pool scan + roster + projection inputs to be complete — an *incomplete* scan must not render as "no move" (that would be the unread/empty confusion the J5 contracts forbid). *Unspecified in v1 — proposed:* if the pool scan itself failed, this screen must not render; that's a WaiverNotDetermined-class withholding.
- **Decision:** Accept
- **Reason:** Provides clear partial-failure paths rather than misleading empty states.
- **Diff:** Added 5. Degraded states (this screen IS the empty state) amendment to v2 contract.

**Proposal:** **Unspecified in v1 — proposed:** the trigger set for the wake (transaction events, injury news, claim-by-other); whether the wake is a push notification or an in-app flag; what the user sees if the Tuesday 3:00 AM re-read itself fails.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## WaiverNotDetermined

**Proposal:** *Unspecified in v1 — proposed:* re-determination cadence — the waiver-system setting should be re-queried on a schedule (e.g., each weekly read) rather than once, since league settings can change preseason.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Unspecified in v1 — proposed:** whether the user can manually declare their waiver system (user input as fallback provenance — but then bids must carry a "based on your declared system, unverified" carrier); what happens when the provider later returns a system mid-week (proposed: re-run the analysis, don't just fill in the withheld elements, since the player read may change under FAAB-vs-priority economics).
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## Ledger

**Proposal:** The Ledger is a historical record, not a live surface — freshness means **completeness**, not recency. `WEEK 7 / 1 OPEN` (`Start Stafford over Daniels`, `OUTCOME PENDING`, `YOU FOLLOWED IT`) vs `WEEKS 1–6 / 9 CLOSED`: an open move's outcome becomes closable when games finalize; a move stuck `OUTCOME PENDING` after its games are final is stale-completeness, not stale-data. *Unspecified in v1 — proposed:* outcome-resolution cadence (e.g., resolved on the next weekly read after the relevant games) and a "pending past expected resolution" flag.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **⚠ Flag — evidence linkage at the index level:** the contract requires per-entry outcome and follow-through, but **does not require each entry to cite the evidence the recommendation was based on**. The detail screen (LedgerDetail) carries "THE EVIDENCE AS IT STOOD THEN", but the index contract has no per-entry evidence carrier. *Unspecified in v1 — proposed:* each index entry carries at minimum the decision timestamp + a link to its immutable receipt (move-detail.v1), so the index is always traceable to evidence-at-decision-time without duplicating it.
- **Decision:** Accept
- **Reason:** Improves traceability and user trust by clearly sourcing data and inference.
- **Diff:** Added 2. Provenance amendment to v2 contract.

**Proposal:** **Unspecified in v1 — proposed:** total route failure and offline have no specified screen; proposed: cached last-good Ledger with an explicit "as of <time>" and no outcome re-computation from cache; never render an empty Ledger from a failed fetch (the J5 "unread, not empty" principle applies).
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## LedgerDetail

**Proposal:** **Unspecified in v1 — proposed:** receipt-not-found (bad/rotated id) and unauthorized (receipt for another user's league) have no specified handling; proposed: not-found and access-denied states that reveal nothing about the receipt's existence beyond the status.
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## LedgerDegraded

**Proposal:** The screen exists because outcome reads failed: `Four scoped calls exist, but move_outcomes could not be read.` The rows (calls, follow-through) are historical and stable; only the outcome column is missing. Re-read cadence for the failed outcome feed is *unspecified in v1 — proposed:* retry on a schedule and flip rows to their mapped outcomes when reads succeed, without rewriting any other row content.
- **Decision:** Accept
- **Reason:** Ensures data recency and prevents users from acting on stale information.
- **Diff:** Added 1. Freshness amendment to v2 contract.

**Proposal:** **Unspecified in v1 — proposed:** what happens when the call list itself fails (empty vs unread confusion — the J5 "unread, not empty" principle should apply: a failed call-list read must not render as an empty Ledger).
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## LedgerDetailDegraded

**Proposal:** **Unspecified in v1 — proposed:** receipt-not-found / access-denied handling (same proposal as LedgerDetail §6).
- **Decision:** Accept
- **Reason:** Standardizes error handling and retry logic for a safer user experience.
- **Diff:** Added 6. Error semantics amendment to v2 contract.

## Unchanged Screens

The following screens had no proposals or modifications, and remain at v1:
