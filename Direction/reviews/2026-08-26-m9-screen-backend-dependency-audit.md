# M9 screen contracts — backend dependency audit

**Date:** 2026-08-26
**Scope:** the four approved screen contracts named in `M9-NativeScreenBacklog` that have
never had their backend dependency checked — team/league switcher sheet (visual briefs
§10.2), Waiver Analysis (§6), Start/Sit detail (§5), Ledger **detail** (§7).
**Method:** read the approved contract, then read the live route and the provider adapter
it actually calls on `main`. Every claim below names the file and line it came from.
Nothing here is inferred from a shared code path.

**Baseline at audit time:** `npm test` **712/712** green on `main`.

---

## Summary table

| Screen | Endpoint exists? | Response carries every field? | Sleeper | ESPN | Yahoo | Verdict |
|---|---|---|---|---|---|---|
| §10.2 Switcher | **No** | — | discovery only | none | discovery only | **Real gap — build** |
| §6 Waiver Analysis | Partly | No | **not reachable** | **not reachable** | reachable | **Real gap — build** |
| §5 Start/Sit detail | Partly | No | not reachable | not reachable | not reachable | **Real gap — build** |
| §7 Ledger detail | **No** | — | n/a | n/a | n/a | **Real gap — build** |

No screen in this set needs zero backend work. That is a finding, not a convenience:
all four were approved against surfaces that do not exist.

---

## 1. §10.2 Global team/league switcher — **real gap, load-bearing**

**The contract asks for** (briefs §10.2/§10.3): every league the user has, grouped by
platform then alphabetical by league, each row showing team + league, a checkmark on the
selected one, multiple teams in one league retained under that league's grouping, and — on
selection — context applied *atomically to Command Center, Omen, League, Waiver Watch and
Ledger*.

**What exists on `main`:**

- `POST /api/platforms/sleeper/resolve` (`src/routes/platforms.js:432`) returns Sleeper
  leagues **but requires the caller to re-supply a username in the request body** every
  time. It is a connect-flow step, not a directory of what the user already has.
- `GET /api/yahoo/leagues` (`src/routes/yahoo.js:211`) returns Yahoo leagues, Yahoo-only.
- `POST /api/yahoo/league` (`src/routes/yahoo.js:228`) binds one Yahoo league.
- `GET /api/platforms`, `/status`, `/state` (`src/routes/platforms.js:397-417`) report
  *connection* state — one row per provider — not a league list.
- **There is no provider-neutral "list all my leagues" and no "set active league" route
  anywhere.** `grep -n "router\.(get|post|...)" src/routes/*.js` returns 55 routes; none
  of them is either one.

**Confirmed:** the prompt's suspicion is correct. This is the real gap.

**A second finding the contract depends on, not previously recorded.** Even with a
directory endpoint, "switching applies atomically to every personalized surface" is
**not achievable today**, because no consumer has a notion of a user-selected provider:

- `src/services/omen.js:1398` `pickLiveMvpConnections()` orders Sleeper → ESPN → Yahoo and
  documents that order as "a deterministic tie-break, not a ranking."
- `src/routes/league.js:22` `PLATFORM_ORDER` is `["espn","sleeper","yahoo"]` — a
  *different* fixed order.
- `src/routes/optimizer.js:73` `resolveActiveYahooLeagueId()` resolves Yahoo only, by
  `updated_at` recency.

Three surfaces, three different rules, none of them the user's choice. A switcher that
writes a selection nothing reads would be a fake control. Closing this gap therefore needs
a **shared selection resolver** as well as the two routes.

**Schema constraint, stated plainly.** `platform_connections` holds one row per
`(user_id, platform)` with a single `league_id`. It has no column for "which provider is
selected". Persisting an explicit cross-provider choice needs a column, and applying SQL
is the gated founder sequence (facts-of-record #8). Handled below by authoring review-only
SQL and degrading honestly at runtime, never by pretending the choice persisted.

---

## 2. §6 Waiver Analysis — **real gap; the known-good endpoint is Yahoo-only**

The prompt records `GET /api/optimizer/waivers` as existing. It does exist
(`src/routes/optimizer.js:206`) — **and it is Yahoo-only.** So is its sibling
`GET /api/optimizer/waiver` (`:245`). Both call `getAuthenticatedYahooClient()`
unconditionally and `yahoo.getAvailablePlayers()`; neither has a provider branch. A
Sleeper-only or ESPN-only user gets a Yahoo auth failure, not waiver analysis.

That matters more than it looks, because Yahoo's Fantasy API is **refused at the
app-entitlement level** (facts-of-record #11, issue #308). So today the only waiver
endpoint the app has works for exactly one provider, and that provider is dark.

**The ESPN adapter question, answered directly.** `fetchEspnWaiverPool` exists at
`src/adapters/espn.js:439`. It is **not** reachable through the optimizer route. Its one
production caller is `src/services/omen.js:896`, inside `POST /api/omen/mvp-move`. So ESPN
waiver data reaches the app only as *a single MVP move*, never as the Best Move +
alternatives + add/drop-cost structure §6.2–§6.4 requires. Sleeper is the same shape:
`fetchSleeperAvailablePlayers` (`src/adapters/sleeper.js:461`) feeds the MVP path only.

**Fields §6 needs that no current response carries:** deadline, availability-confirmed
state, the recommended drop *and its stated cost*, two-to-three ranked alternatives with a
tradeoff sentence each, and the named states (`availability_unknown`, `no_low_cost_drop`,
`no_credible_move`, `engine_limitation`).

---

## 3. §5 Start/Sit detail — **real gap; the endpoint exists but is a different feature**

`POST /api/start-sit` exists (`src/routes/startSit.js:155`) and works. But it is a
**stateless, unauthenticated, caller-supplied two-player comparator**: the client passes
`playerA`/`playerB` with a name, position and projected points, and gets back a winner, a
delta and an LLM sentence. It has no `requireAuth`, no provider call, no league.

Against §5 it is missing, concretely: the selected team/league line ("For Justin Titans ·
Dynasty Dogs"), week and kickoff times, the confidence label, the league scoring fact
("This league awards 0.5 PPR" — §5.2's first evidence category), "What could change this",
the `View evidence` payload, and the rule that the page opens on *the highest-priority
unresolved lineup decision* — which requires reading the user's actual roster.

It is not reachable for any provider, because it never touches a provider. Verified by
reading the whole file: it imports `optimizer` and `llm` and nothing else.

---

## 4. §7 Ledger detail — **real gap, no route at all**

`GET /api/moves` exists (`src/routes/moves.js:82`) and returns `moves-history.v1`. It is a
**list**. `normalizeMove()` (`:31`) projects exactly ten fields and there is **no
`GET /api/moves/:id`**.

§7 requires per-call: the immutable recommendation snapshot, selected team/league, scoring
period, an ISO timestamp **with a clear time zone** (§7.5), evidence-at-the-time separated
into league context / player-game fact / model input / Omen inference / limitation (§7.2),
user action *only when safely known*, observed outcome in measured language, and the seven
named states. None of that survives `normalizeMove`, and most is not selected from the
table.

**Related and worth recording:** `moves` rows are only ever written by the *feedback*
upsert (`src/routes/omen.js:339`). The recommendation itself is never persisted at
issue time. So "immutable snapshot" has no write path today — see the A6 section of this
session's handoff.

---

## What this means for the frontend

Building the four screens against `main` as it stands would strand all four. The switcher
is first because §10.1 makes the strip the control for every other personalized surface,
and `M5` slice C has already shipped the strip.
