# Handoff — M9 backend gap closure

**Date:** 2026-08-26
**Agent:** Claude (unattended backend session)
**Branch:** `feat/m9-backend-gap-closure`
**Status:** one PR, **open and unmerged by instruction. Nothing deployed. No SQL applied.**
**Tests:** `npm test` **812/812**, from a measured **712/712** baseline at session start.

---

## What this session was for

Finish every piece of agent-buildable **backend** work so that when the native
screens get built, nothing is waiting on a missing endpoint. Backend only — no
native screen was implemented, and `M5` slices F and G stay blocked.

**A7B was not touched.** No remote staging runner, storage, infrastructure,
cron, timer, database, SQL, provider credential, dependency, publication,
deployment, or production change. `src/services/footballData/**` is byte-identical
to `main`.

---

## Step 1 — the audit, which is the input to the frontend work

Full document: `Direction/reviews/2026-08-26-m9-screen-backend-dependency-audit.md`.

| Screen | Endpoint existed? | Carried every field? | Sleeper | ESPN | Yahoo | Verdict |
|---|---|---|---|---|---|---|
| §10.2 Switcher | **No** | — | discovery only | none | discovery only | real gap |
| §6 Waiver Analysis | Partly | No | **not reachable** | **not reachable** | reachable | real gap |
| §5 Start/Sit detail | Partly | No | not reachable | not reachable | not reachable | real gap |
| §7 Ledger detail | **No** | — | n/a | n/a | n/a | real gap |

**No screen in this set needed zero backend work**, which is itself the finding:
all four were approved against surfaces that did not exist.

Three things the audit found that were not in the brief:

1. **The switcher gap is bigger than a missing route.** Three surfaces resolved
   "which league is active" three different ways — `omen.js` sleeper→espn→yahoo,
   `league.js` espn→sleeper→yahoo, `optimizer.js` Yahoo-only by `updated_at` —
   and none was the user's choice. A switcher writing a selection nothing reads
   would have been a fake control.
2. **`GET /api/optimizer/waivers` is Yahoo-only.** The brief listed it as
   existing, which is true and materially incomplete: both it and
   `/api/optimizer/waiver` call `getAuthenticatedYahooClient()` unconditionally,
   and Yahoo is entitlement-refused (facts-of-record #11). The app's only waiver
   endpoint served one provider, and that provider is dark.
3. **`fetchEspnWaiverPool` is real but was not reachable through the optimizer
   route.** Its one production caller is `src/services/omen.js:896`, inside
   `POST /api/omen/mvp-move`, where it can only ever yield a single MVP move.

---

## Step 2 — what was built

| Route | Contract | Providers proven |
|---|---|---|
| `GET /api/leagues` | `league-directory.v1` | Sleeper, ESPN, Yahoo |
| `POST /api/leagues/active` | `league-active-selection.v1` | Sleeper, ESPN, Yahoo |
| `GET /api/waivers/analysis` | `waiver-analysis.v1` | Sleeper, ESPN, Yahoo |
| `GET /api/start-sit/detail` | `start-sit-detail.v1` | Sleeper, ESPN, Yahoo |
| `GET /api/moves/:id` | `move-detail.v1` | n/a |

Every one is documented in `Blueprints/api-routes.md`. Each provider claim is
proven against **that provider's own adapter**, not inferred from a shared path:
the Sleeper tests assert the exact `fetchSleeperLeague` / `buildNormalizedRoster`
/ `fetchSleeperAvailablePlayers` call sequence, the ESPN tests assert
`fetchEspnWaiverPool` and `buildNormalizedRoster` with the team id, and the Yahoo
tests go through `getUserLeagues` and the normalized Yahoo roster.

New services: `activeSelection.js`, `waiverAnalysis.js`, `startSitDetail.js`,
`scoringRuleSnapshot.js`, `scoringReconciliation.js`.

### Two real defects found by writing the tests

- **`token_expires_at` was omitted from the waiver route's connection query.**
  `isOmenReadyConnection()` treats an absent expiry as expired, so **every** Yahoo
  connection would have read as unusable. Found because the Yahoo test returned
  404 instead of 200.
- **`Number(null)` is 0, and 0 is finite.** My own `finite()` helper in the
  reconciliation service turned an *unreported* provider score into a real zero
  and reported a mismatch against it. This is the exact shape of the B2-D-S0
  projection bug the codebase already carries a comment about — reintroduced by
  someone who had read that comment twenty minutes earlier. Caught by a test
  asserting a **state**, not a number.

### Security

Every provider error path is provoked with a fake cookie value and the emitted
response bytes are searched for it. No ESPN cookie value appears in any response,
log line, or error payload (facts-of-record #6). No FAAB amount, waiver priority,
or claim probability is ever produced (§6.2) — also grep-asserted.

---

## Step 3 — A6

**The item's own `What is wrong:` line was already false on `main`.**
`src/omen_tuesday_cron.js:194` selects `scoring`, and `scoreMove` uses
`move.scoring || "PPR"` and refuses a contract-required row. The real remaining
defect was narrower and invisible from the description: **the contract engine was
orphaned.** `calculateContractScore` had no production caller, and `scoreMove`
*threw* on a contract row rather than evaluating it.

Delivered:

- `scoringRuleSnapshot.js` — provider-neutral derivation. Sleeper is mapped key
  by key so a new Sleeper key surfaces as **unmapped** rather than guessed at, and
  any unmapped non-zero rule makes the whole contract `ambiguous`. A zero-valued
  reception rule is kept, because standard scoring is literally `rec: 0`.
  Hashing is order-independent and carries rules only — no credential, roster, or
  league identity.
- `scoringReconciliation.js` — all seven states, and it fails closed:
  `provider_restricted` and `ambiguous` can never reach `exact` whatever the
  numbers say.
- `scoreMove` grades a contract-required row **by its contract**. A row it cannot
  reconcile is deferred with its state recorded and `scored_at` left **null**, so
  a later run can still grade it.

**Review-only SQL. Nothing applied, to staging or production.**

### What remains behind the EXTERNAL blocker

- **ESPN** derives `provider_restricted`: no provider-granted path to capture and
  retain its complete private rule snapshot. Not worked around.
- **Yahoo** derives `pending`: API refused at the application-entitlement level.

### What remains agent-resolvable and was NOT done, with the reason

- ~~**The capture path.**~~ **CLOSED by the other session, hours after this was
  written.** PR #372 merged `persistLiveRecommendation` (`src/routes/omen.js:130`),
  which persists every issued live recommendation and refuses to issue one when
  persistence fails. Verified against `main`, not taken from the PR description.
  **The two halves fit together and neither is complete alone:** #372 writes
  `scoring_contract: null` with the metadata beside it, and this branch builds the
  derivation that produces the body that column wants. **Next concrete step:** wire
  `deriveScoringSnapshot()` into `scoringPersistenceMetadata()`.
- **Contract grading against real facts.** The current Tuesday source publishes
  aggregate fantasy points, not per-event facts, so a contract row reconciles to
  `unsupported` with its missing facts named. That is the seam `A7B` plugs into.
  Deliberately not worked around by scoring a missing fact as zero.

---

## Step 4 — B2-D3-S2

**`Direction/release_readiness.md` §"Not Deployed / Not Merged" is now empty.**

Its deploy step had **nothing to carry**. All six items were on `main` since
2026-06-03/04, verified individually by symbol and commit rather than trusted
from the file, and `GET https://slopssaloon.com/api/version` answered **live from
production** on 2026-08-26 — one of the six, demonstrably deployed. B2-D3-S closed
2026-08-02 (PR #259). Zero PRs open.

**That section was wrong for roughly twelve weeks, and `B-FREEZE` was blocked on
it the whole time.**

Founder deploy note: `Direction/reviews/2026-08-26-b2d3s2-deploy-note.md` — what
deploys, what the risk actually is, and what to check afterward.

---

## Verification

- `npm test` **812/812** (baseline 712/712, +100)
- `npm audit --omit=dev --audit-level=moderate` — **0 production vulnerabilities**
- `git diff --check` clean
- `node scripts/check-sprint-staleness.js` — **no findings**; coverage block read
- `package.json` / `package-lock.json` **byte-identical to `main`**
- No native file touched; no deploy; no production change; no secret; no
  migration applied

---

## What I would tell the next session

**The queue was wrong about existence in both directions in one session.**
`A6` claimed a defect that was fixed; `B2-D3-S2` claimed work was undeployed that
was live in production. The standing lesson — grep `main` in either direction —
held. What is new is that the two failures cost differently, and the
*defect*-shaped one is the more dangerous: it would have been satisfying to fix,
and fixing it would have produced a confident, well-tested no-op while the real
problem stayed invisible.

**A task description precise enough to act on is not evidence the thing it
describes is still true.**

And one on scope: the prompt supplied four "already known, do not rediscover"
facts. One of them was materially incomplete in a way that inverted the
deliverable. Checking it cost one `sed`.
