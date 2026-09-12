# Known issues — resolved

**Split out of `Direction/known_issues.md` on 2026-09-12.** Every section here is fixed, resolved,
or closed. They were costing roughly 13,000 tokens inside the always-read file, which every session
paid for before picking a task.

They are kept, not deleted: a resolved issue is the best record of how a class of defect behaves,
and several here were re-opened once already. Read this when a symptom looks familiar.

**Open issues stay in `Direction/known_issues.md`.**


## ✅ FIXED 2026-09-05 — two week calculations disagreed on every game day of the season

**Found while sweeping for date-dependent tests, after the founder asked whether the week
boundary respected the NFL's Tuesday-to-Monday week. It did not.**

`src/services/nflSchedule.js` contained **two** week calculations with different anchors:

| | Anchor | Rolls on |
|---|---|---|
| `getSeasonWeekInfo` / `getCurrentNflWeekContext` / `isOffSeason` | fixed `Date.UTC(season, 8, 5)`, UTC | whatever weekday Sept 5 is — **Saturday** in 2026 |
| `getNflGameWeek` | Labor Day + 1 day, Eastern | **Tuesday**, correctly |

**Measured, not estimated: they returned different week numbers on 33 of 78 in-season days —
42% — and the disagreement was every Saturday, Sunday and Monday.** That is every day NFL
games are played. A spot-check on a Tuesday agrees and misses the entire defect.

**Second, worse symptom.** Because the fixed anchor is five days before the real 2026 opener
(Thursday 09-10), `isOffSeason()` returned `false` on 2026-09-05, and the A4 scoring gate —
whose stated purpose is *"grading before kickoff would score games that have not happened"* —
reported **PASS five days early**. That is the same class of error as `facts-of-record.md` #10's
2026-08-27 correction, reaching a recorded conclusion for the second time.

**Fix:** one anchor. `seasonOpensAt(season)` returns the Tuesday after Labor Day, and both
functions derive from it. Verified: **0 of 78 disagreements**, and the A4 gate now reports
`FAIL — season=2026 raw_week=0 is_off_season=true`.

**Two properties a fixed calendar date could never have**, both now covered by tests:

1. An NFL week ends **Tuesday**, so Sunday's games belong to the week that is ending.
2. September 5 is a Saturday in 2026 and a Sunday in 2027 — a fixed date rolls the week on a
   different weekday every year, so the bug silently returns each season rather than staying
   fixed. Tests pin the Monday/Tuesday boundary across 2026, 2027 and 2028.

**Blast radius, checked rather than assumed.** Ten files call `getCurrentNflWeekContext`. Most
read only `.season`, which was always correct. Six read `.week`: `league.js` and `waivers.js`
use the safe `providerWeek || context.week` form, so the bad value was a fallback; `dashboard.js`
used `Number(context.week)` directly. **The Tuesday cron was never at risk** — it grades on
`move.week_num` stored at creation, and moves are stamped from the *provider's* reported week
(`src/routes/omen.js:239`), not from this function.

**Deliberate residual:** week 1's Tuesday and Wednesday precede Thursday kickoff, so this still
reports "in season" up to two days early — down from five. Closing that needs a real kickoff
timestamp, which is a schedule-data dependency rather than a calendar rule.

### A correction about how this was found

The A4 test that failed earlier the same day was written up as *"a time bomb that expired on
schedule"* and its failure was dismissed as the test asserting a stale world. **That was wrong.
The failing test was a true signal** — the gate really had flipped to PASS before kickoff — and
PR #400 made the test clock-independent, which was correct on its own terms, while the
accompanying claim that "the checker is correct" was not. The bug it was pointing at is what
this entry fixes. A test that starts failing on a date is not automatically an expired test;
it can be the first thing to notice that a date-derived value went wrong.

## ✅ FIXED 2026-09-05, verified 2026-09-06 — `POST /api/omen/mvp-move` hung forever and took the whole API down

> **Status corrected 2026-09-06.** This entry stood as 🔴 OPEN for a day after it was actually
> fixed. The write-up below was made during the hunt and its "prime suspect: PR #401" theory was
> **wrong**; the cause was found and fixed the same afternoon in **#404** (a search budget) and
> **#405** (a polynomial solver), and nobody came back to update the heading. The founder was right
> to remember it as fixed. The diagnosis is recorded in `src/services/tradeLineup.js`.
>
> **Cause.** `findTradeCandidate` solved the optimal lineup twice for every
> (own player × opponent player) pair, per opponent — ~5,600 exhaustive recursive searches in an
> eleven-team league. Measured before the fix: **177 seconds for two opponents**, extrapolating to
> roughly 15 minutes for a real league, all of it synchronous on the one thread Node uses to serve
> every request. That is the 100% CPU, no-logs, event-loop-dead signature exactly.
>
> **Why it started that day and had never happened before.** Every path into it is gated on a
> finite `projected_points`, and ESPN published no 2026 projections until week 1 went live. The
> code did not change; the data did.
>
> **Reachability, checked rather than assumed:** `findTradeCandidate` →
> `buildTradeCandidateForConnection` → `buildLiveOmenMvpMoveForUser` → `POST /api/omen/mvp-move`,
> and nothing else in `src/` calls any of them. That matches this entry's own measurement — three
> requests never completed and **all three were `mvp-move`** — and it is why the shadow-container
> replay in the entry below could not reproduce: that replay never called `mvp-move`.
>
> **Re-measured 2026-09-06** against the current code, same worst-case shapes:
>
> | League | Before | Now |
> |---|---|---|
> | 2 opponents, 16-man | 177,000 ms | **18 ms** |
> | 11 opponents, 16-man | ~15 min (extrapolated) | **61 ms** |
> | 16-team, 20-man | — | **114 ms** |
>
> A single lineup solve went from ~30 ms to **0.25 ms**.
>
> **One real residual, found while re-measuring and fixed 2026-09-06.** `TRADE_SEARCH_MAX_SOLVES`
> was left at **4,000**, a number sized against the *old* solver. At 0.25 ms per solve it tripped
> after ~98 ms — 5% of the 2s clock budget — and a budget trip returns **no suggestion at all**.
> A 16-team league on 20-man rosters needs 7,625 solves to search honestly, so the deepest leagues
> silently lost their trade suggestion while shallow ones kept theirs. Raised to 200,000 so the
> clock, which is what actually bounds event-loop blocking, is the binding constraint. The
> 11-team regression test sat under the old cap and could never have caught it; a deep-league test
> now pins it, and was verified to fail on the old value.

### Original write-up, kept because the measurement in it is good and the theory in it was wrong


**Symptom the founder saw:** "Omen couldn't reach the server", repeatedly, all day. It is not a
network problem and not an Omen-tab problem — the entire site goes down, including the marketing
page, because the API stops answering anything.

**Mechanism.** `POST /api/omen/mvp-move` enters an **infinite synchronous loop** and never returns.
Node's MainThread pins one core at 100% and the event loop is blocked completely, so every other
route hangs too. TCP still accepts (nginx is alive), which is why it presents as a 20s timeout
rather than a refused connection. The watchdog restarts the container minutes later; the next
person to open the Omen tab kills it again.

**Evidence, measured not inferred.** In three hours of production logs, **exactly three requests
never completed, and all three were `POST /api/omen/mvp-move`.** No other endpoint ever hangs.
At capture: `omen_api` 100% CPU, health `unhealthy`, load average 1.00 on a one-core box,
**650 watchdog events in six hours**.

**Where the loop is.** In both observed freezes the last thing logged is an ESPN response
resolving, after which the process goes silent forever. `/api/leagues` itself completes normally
(200, ~1.1s). So the loop is in the **synchronous recommendation build that runs after the awaited
provider data returns**, not in any network call.

**Prime suspect, not yet proven: PR #401.** It landed this morning, the same day the flapping
started, and it changed the season anchor so that today evaluates as `raw_week=0,
is_off_season=true` — which was not true yesterday. The schedule functions themselves were probed
directly and are fast and correct, so they are not the loop; the suspicion is a *consumer* of that
newly-zero week inside the recommendation build. **Unproven. Do not close this on the theory alone.**

**Not implicated, checked:** the league switcher and its `/api/leagues` calls (client-side change,
endpoint returns 200 every time), and PR #403.

### What was done to production

Evidence captured to `References/evidence/2026-09-05-mvp-move-hang/` (host snapshot + 6h of API
logs), then rolled back to yesterday's image, which predates #401 (verified: `seasonOpensAt` absent
from that image, present in the broken one).

| Tag | Image | What it is |
|---|---|---|
| `omen:main` | `6803ccebced9` | **now serving** — 2026-09-04 21:00 build |
| `omen:rollback-20260904` | `6803ccebced9` | same image, stable name |
| `omen:broken-20260905-mvpmove` | `f30c63534bd3` | the wedging build, preserved for diagnosis |

Verified after rollback: `/`, `/api/health`, `/api/ready` all 200 in ~150ms; CPU 0.01%.

> ### ⚠️ THE ROLLBACK IS NOT STICKY
> `:main` was **retagged locally on the box**. The next deploy that runs `docker compose pull` will
> fetch the broken image from GHCR and reintroduce the outage. **Do not merge to `main` and deploy
> until the loop is found**, or the rollback is undone silently. The watchdog only restarts and does
> not pull, so it will not undo this on its own.

**Still unverified:** whether mvp-move actually succeeds on the rolled-back build. It needs an
authenticated request; the founder opening the Omen tab is the test.

## ✅ FIXED — the API could be driven into an unrecoverable 100% CPU spin — found 2026-09-05, closed 2026-09-06

> **Status corrected 2026-09-06. This is the same bug as the entry above, not a second one.**
> It was written up separately because the hunt narrowed the spin to the wrong endpoints, and that
> mistake is worth keeping rather than deleting.
>
> **Where the endpoint list went wrong.** The reasoning was: morgan logs on response *finish*, so
> the culprit is whatever ran after the last logged request — giving `GET /api/leagues` or
> `POST /api/leagues/active`, later widened to five concurrent candidates. `POST /api/omen/mvp-move`
> was never in that set, because the Command Center fires it alongside the others and its own log
> line never arrived. The entry above had the measurement that settles it: three requests never
> completed and all three were `mvp-move`.
>
> **This also explains the failed reproduction below.** The shadow container replayed
> `/api/leagues`, `/api/dashboard/summary`, `/api/moves`, `/api/league/overview` and
> `POST /api/leagues/active` — 225 requests at high concurrency, never wedged. It never called
> `mvp-move`, which is the only route that reaches the exhaustive lineup search. The replay was
> sound; it was aimed at the wrong endpoint.
>
> **The lesson worth keeping:** "the last request to *complete*" does not identify the request
> that hung when the client fires several concurrently. The one that hung is the one with **no**
> log line — which is exactly the one that is hardest to notice is missing.
>
> The three mitigations below (CPU/memory caps, the watchdog, the client carousel fix) are real
> and stay. So does the "why it stayed down all night" section, which is the most valuable part of
> this entry and is unaffected by the misattribution.

### Original write-up, kept for the measurement and for the ruled-out list


**This is the serious half of the 2026-09-05 outage and it is NOT fixed.** The client loop
below has been fixed; this has not. Do not treat the outage as closed.

**Measured, not inferred.** `omen_api` was `Up 14 hours (unhealthy)` while serving nothing:

```
CPU 99.31%   MEM 391.2MiB / 3.823GiB (9.99%)   PIDS 12
```

Memory was **flat**, so this is not a leak or an exhausted pool — it is a synchronous spin
that never yields the event loop. The process could not even write a log line: the last entry
was `11:04:27`, and it was still pegged at `11:17`. Every Docker healthcheck in between
returned `Health check exceeded timeout (10s)`. nginx returned its own `504` after exactly
`proxy_read_timeout 60s`; a *crashed* container would have given an instant `502`, which is
how "wedged" was distinguished from "dead" without guessing.

**The trigger was 28 requests in nine seconds from a single phone.** Baseline was 5-6
requests/minute. That is not load — a fault this cheap to provoke is reachable by any user
with two leagues and a normal thumb.

**Where it is.** morgan logs on response *finish*, so every logged request completed. The
last completed request was `GET /api/league/overview`; the spin is in whatever ran next and
never returned, which the repeating cycle puts at `GET /api/leagues` or
`POST /api/leagues/active`. `src/routes/leagues.js` and `src/services/activeSelection.js` are
the surface. No unbounded `while` exists in `src/` (the two present are provably bounded), so
the likely shapes are a runaway regex over a provider payload, an unterminated recursion, or
a promise chain that starves the macrotask queue — the last of which would look exactly like
this and survive the client disconnecting, as this did.

**How to find it, next session.** Do not guess from reading. Capture a CPU profile *while
wedged*. A spin at 99% names its own function in one profile. Everything above is measurement;
the specific line is not yet known and must not be claimed until a profile shows it.

### Hunt attempt 1 — 2026-09-05 — FAILED to reproduce. What is now ruled out.

Recorded so the next attempt does not re-walk this ground. **None of this found the bug.**

**Reproduction attempted properly and did not trigger it.** A shadow container was run from the
same image on KVM1 (port 3001, capped `0.5` CPU / `1g`, `--inspect`), fed a real access token
minted through Supabase admin for a founder account with **eight leagues across all three
providers** — a superset of the two-league state that triggered production. Two replays were
driven against it: 72 requests at the production burst rate, then **225 requests at high
concurrency**, both interleaving `POST /api/leagues/active` between providers with
`/api/leagues`, `/api/dashboard/summary`, `/api/moves` and `/api/league/overview`, exactly the
observed cycle. Peak CPU after: **0.37%**, then **0.04%**. Never wedged. Shadow and token were
destroyed afterwards; production was never touched.

**Static search, all negative:**

- No `setInterval` anywhere in `src/` — so there is **no periodic background work**, and the
  spin must be request-triggered. Every `setTimeout` found is a one-shot abort/timeout.
- Only two `while` loops exist in `src/`, both provably terminating (`systemContracts.js:167`
  pushes until a length is reached; `sleeperDraftAccess.js:18` deletes a Map's first key).
- No `for(;;)`, no unbounded `for`. Every loop in the in-flight routes (`dashboard`, `moves`,
  `league`, `leagues`, `activeSelection`, `leagueFollows`) is `for...of` over a finite array.
- **No catastrophic-backtracking regex.** A search for nested quantifiers across `src/` returned
  one candidate, `parseVersion`'s `/^(\d+(?:\.\d+)*)/`, which is linear — `\d+` and `\.` cannot
  match the same character, so there is no ambiguity to backtrack through. The other two
  regexes in the path are simple literals.
- **The ESPN adapter and services contain no regex at all**, so the unusual SWID/cookie shape
  (`{48917711-FC65-...}`) is not being parsed by one.

**A correction to the original finding above.** The first write-up narrowed the spin to
`GET /api/leagues` or `POST /api/leagues/active`, reasoning that morgan logs on response finish
so the culprit must be whatever ran *after* the last logged request. That is wrong: the client
fired these **concurrently**, so any of the in-flight requests could be the one that never
returned. The candidate set is all five endpoints, not two.

**What to do differently next time.** Reading and load-replay have both been spent; do not
repeat them. Make the *next natural occurrence* diagnosable instead:

1. Add `--perf-basic-prof` to the production node command so V8 emits a JIT symbol map, and
   install `linux-perf` on KVM1.
2. Extend `omen-watchdog.sh` to run `perf record -F 99 -g -p <pid> -- sleep 10` **before** its
   `docker restart`, alongside the log capture it already does.
3. The next wedge then produces a profile naming the function, instead of only a restart.

Note the trade-offs before doing this: `--perf-basic-prof` carries some overhead and writes a
growing `/tmp/perf-<pid>.map`, and enabling `--inspect` on production would be a remote-code-
execution surface if ever reachable — `SIGUSR1` opens the inspector on demand and is the safer
variant. **This is a deliberate production change and should not be made in the week before
NFL Week 1 without the founder deciding the overhead is acceptable.**

**Mitigated, not fixed.** Three things now limit the blast radius, and none of them address
the cause:

1. `cpus: 0.85` / `mem_limit: 1g` / `pids_limit: 256` on `omen_api` (`cpus: 0.5` / `512m` on
   `omen_cron`) in `deploy/hostinger/docker-compose.prod.yml`. **KVM1 has exactly one core**,
   so an uncapped spin starves nginx and any watchdog along with it — the cap is what keeps
   the host able to heal itself.
2. `deploy/hostinger/omen-watchdog.{sh,service,timer}` on KVM1: restarts a container that is
   unhealthy-but-running, captures evidence *before* restarting, and **stops after 3 heals in
   an hour** so a crash loop escalates instead of hiding. Both paths were proven against a
   throwaway container, not assumed.
3. The client loop below no longer supplies the trigger.

### Why it stayed down all night, which is the more important lesson

Every detection layer worked. Kuma flagged all three monitors, GlitchTip opened issues #7
(`write EPIPE`) and #8 (`Request aborted`), and Discord delivered every alert. The site stayed
down anyway, because **nothing on the box could act on any of it.**

`restart: unless-stopped` restarts a container that EXITS. It does nothing for one that is
running and wedged. Docker's own healthcheck detects precisely that case and then only records
it. The gap was never detection — it was that detection had no remediator. **A healthcheck
nothing acts on is documentation, not availability.**

## ✅ FIXED 2026-09-05 — the Command Center carousel could turn one swipe into an unbounded commit loop

**The client half of the outage above.** `.onChange(of: selectedIndex)` in
`OmenLeagueCarousel.swift` committed the rested-on page; `commit()` then called
`reloadDirectoryPreservingPages()`, which **wrote `selectedIndex` again** to keep the user on
the same league across a reordered re-read — firing `.onChange` again.

The only brake was `guard !page.isActive`, which holds solely if the re-read reports that
league active. When it did not, the cycle ran unbounded. Production logs show it oscillating
between two leagues (alternating `league/overview` response sizes, `POST /api/leagues/active`
every ~1.3s).

**Fix:** `programmaticSelections`, a counter of pager moves the view model made *itself*,
consumed one per `.onChange` delivery. A counter rather than a boolean because `.onChange` is
delivered asynchronously — a flag cleared at the end of the reload is easily false again by the
time the change it caused arrives, which is exactly what makes this class of bug intermittent.
All three internal `selectedIndex` writes (`load`, `reloadDirectoryPreservingPages`,
`clampSelection`) now route through `selectIndexProgrammatically`.

**Regression test:** `testAReorderedRereadDoesNotTurnOneSwipeIntoACommitLoop` — needed a
purpose-built repository stub returning a *reordered* directory on the second read, because the
shared stub returns a fixed one and the reorder is the whole mechanism. **Verified to fail on
the unfixed code (2 writes instead of 1)**, not merely to pass on the fixed code.

**Android was checked and does not share the defect.** Its carousel is driven by
`pagerState.settledPage`, and the view model's `selectedIndex` does not feed back into the
pager, so the cycle does not close. `LaunchedEffect(pagerState, pages.size)` re-collecting on a
`pages.size` change is a nearby risk worth a look, but it is not this bug.

### Two process notes worth more than the fix

- **The first regression test was wrong and passed for the wrong reason.** It simulated
  `.onChange` firing after `load()` on a fixture where the index never changed — an event
  SwiftUI would never deliver. It failed, correctly, and rewriting it to reproduce the *reload*
  path is what made it real. A test that cannot fail on the broken code proves nothing.
- **The watchdog's own self-test found a bug in the watchdog.** Its heal counter was a single
  global file, so the test container spent `omen_api`'s heal budget. A real outage would have
  hit an exhausted brake and never been healed. The state file is now keyed per container.

### Unrelated, but true as of 2026-09-05

`PrimitiveEnforcementTests.testAppSourcesUseOmenPrimitivesInsteadOfRawSwiftUIOrColorLiterals`
**fails on a clean `main`** (confirmed by stashing all local work at `5ff94e3`). It predates
this session's changes and is not caused by them, but `main` currently ships a red suite.

> **Partially superseded 2026-09-06.** The **iOS** half of this is fixed: a full
> `-only-testing:OmenIOSTests` run on the Command Center typography pass is green, including
> `PrimitiveEnforcementTests`. The **Android** twin is still red, was not recorded here, and is
> broken out below.

## ✅ FIXED 2026-09-07 — Android `PrimitiveEnforcementTest` fails on `main`

`:core:designsystem:testDebugUnitTest` →
`PrimitiveEnforcementTest."app + feature Kotlin sources compose Omen primitives instead of raw
Material 3 or hex colors"` fails with **five** violations in **two** files, neither touched by the
2026-09-06 Command Center work:

- `app/auth/OmenAuthFlow.kt` — imports `material3.Button`, imports `material3.TextButton`, and
  carries a raw `Color(0xNNNNNNNN)` literal.
- `app/feature/connect/ConnectScreen.kt` — imports `material3.TextButton`, and carries a raw
  `Color(0xNNNNNNNN)` literal.

This is the **same defect class, in the same two screens**, that the iOS scanner caught in
`SignInView` / `ConnectView` and that was fixed there on 2026-09-05 by moving the primitives into
`DesignSystem/` rather than allowlisting the files. Android's fix is the mirror of that one: the
buttons belong in `:core:designsystem` as `Omen*` primitives, and the hex literals belong in
`OmenColor` where they get a light-mode value. **Do not allowlist either file** — the iOS
precedent is recorded in `PrimitiveEnforcementTests.allowlistedRelativePaths` and the reasoning
holds here: exempting a whole file for one line blanket-exempts every violation added to it later.

The raw color literals are the sharper half. A dark-only hex that ships is exactly the bug the
iOS scanner was written after — a near-black tile with dark text on a light background, which
made the Connect screen's provider names invisible in light mode. Android's Connect screen is the
same screen.

> **Fixed 2026-09-07, exactly as the paragraph above predicted.** The allowlist stayed empty.
> `OmenAuthPrimaryButton`, `OmenAuthTile` and `OmenCanvasTextAction` moved into
> `:core:designsystem` (`component/OmenAuthPrimitives.kt`), mirroring the iOS files; both hex
> literals became tokens (`Color(0xFF0A0A0B)` → `bg`, `Color(0xFF141416)` → `surface1`).
> `:core:designsystem:testDebugUnitTest` and `:app:testDebugUnitTest` are green.
>
> **`CanvasTextAction` existed twice, privately, in `OmenAuthFlow.kt` and `ConnectScreen.kt`,
> and the two copies had already drifted** — Auth's took `color`/`fontWeight`/`height`, Connect's
> hardcoded them and used `textTertiary.copy(alpha = 0.45f)` for disabled where Auth used a flat
> `textTertiary`. Character-for-character the same divergence the iOS merge found in
> `SignInView.swift` / `ConnectView.swift`. `private` is what let each copy stay invisible to the
> other author. Resolved to Auth's disabled colour, the same way iOS resolved it, so the two
> platforms do not re-diverge at the moment of being unified.
>
> **Three real rendering bugs were behind the hex literals, and only became visible once they
> were removed.** The `Color(0xFF0A0A0B)` background forced both screens dark regardless of the
> device theme, which is *why* nobody had seen them:
>
> 1. Connect's provider cards were near-black tiles — dark text on them, on a light page.
>    Now `surface1`. Evidence: `References/evidence/2026-09-07-espn-projections-and-android-primitives/android-connect-light-after.png`.
> 2. The **email glyph** bakes in the cream `#F5F0E8` and sat on a now-white tile. Tinted with
>    `textPrimary` at the call site — Discord and Google keep `Color.Unspecified` because they
>    are brand marks and must not be tinted.
> 3. **The same glyph bug exists on iOS, in two places**, found by looking rather than assumed:
>    `AuthEmail` (cream on `surface1`) and `AuthApple` (`#0A0A0B` on a `textPrimary` button that
>    is near-black in light mode — a black glyph on a black button). Both fixed with a
>    `tintsIcon` flag on `OmenAuthPrimaryButton` / `OmenAuthIconTile`.
> 4. **The back chevron was 2.12:1 in light mode** — under the 3:1 WCAG 1.4.11 floor for a
>    control, on a navigation affordance. `ic_canvas_chevron_left` strokes itself `#AEAEB2`,
>    which *is* `textSecondary`'s **dark** value; tinting with the token leaves dark
>    pixel-identical and answers `#6B7280` (4.63:1) in light. Measured at the pixel across the
>    two captures rather than judged by eye: `(174,174,178)` → `(107,114,128)` in light,
>    `(174,174,178)` → `(174,174,178)` in dark. `ic_canvas_chevron_right` took the same tint
>    (dark 3.31 → 7.69, light stays 4.83).
>
> A sweep for the rest of the class came back clean: no `Color.White`/`Color.Black`/named
> literals, no six-digit `Color(0x…)`, no `MaterialTheme.colorScheme` escapes anywhere under
> `app/src/main/kotlin`. The only remaining baked-theme drawable is `ic_launcher_monochrome`,
> which is an adaptive-icon layer the OS tints — not a UI glyph.

## ✅ FIXED 2026-09-07 — the Android primitive scanner could report a false PASS

`PrimitiveEnforcementTest` walks `app/src/main/kotlin` from a test that lives in
`:core:designsystem`. Gradle has no way to know that, so those files were **not task inputs** and
`:core:designsystem:testDebugUnitTest` marked itself UP-TO-DATE after an `app/`-only edit.

**Caught by tripping it.** A comment added to `OmenAuthFlow.kt` on 2026-09-07 contained a hex
literal in the banned shape — a genuine violation, in prose. The next
`:core:designsystem:testDebugUnitTest` reported **BUILD SUCCESSFUL**, because nothing in that
module had changed. The guardrail was green while the thing it guards was red.

Fixed in `core/designsystem/build.gradle.kts` by declaring the scanned trees as task inputs.
Proven rather than assumed: a violation injected into `app/` only → `FAILED`; reverted →
`SUCCESSFUL`. Before the fix both said `SUCCESSFUL`.

Two notes for whoever touches this next:

- `inputs.dir(...).optional(true)` **does not** tolerate a missing directory — Gradle still
  validates the path and fails task configuration with "Input file does not exist". `feature/`
  has no module yet, so the list is filtered to existing directories at configuration time and
  will pick `feature/` up automatically on the day it appears.
- The scanner matches banned literals **by pattern and cannot tell prose from code**, so a
  comment that quotes a hex literal to explain a fix will fail the build. Describe it in words
  instead. The comment in `OmenAuthFlow.kt` says so in place.

## ✅ FIXED 2026-09-07 — a dead ESPN connection reported `connected`

Founder, on a real device: "the team names aren't showing in the switcher for ESPN."

`c814312` had already fixed the name resolution the day before and was deployed. Measured rather
than re-derived: `GET /api/leagues` was run against **every** connected ESPN account, and six of
seven returned real team names ("The Titans of Slopsilonia", "Chasing Hurt Nabers", "Christian
Mingle"…). One did not — and it reported **`connection_state: "connected"`** while ESPN was
answering its discovery call with a `401`.

**`connectionState` tests whether the credential columns are POPULATED, not whether they work.**
A cookie that expired last week is still a cookie. So a dead ESPN connection produced a league
with no team name, no projections, and nothing anywhere telling the user to reconnect — it looked
exactly like a working connection whose data happened to be blank. *Presence is not liveness.*

A provider `401` now flips the reported state to `reconnect_required` and carries a notice that
says so. A read that merely **failed** (5xx, network) deliberately stays `connected` — a flaky
ESPN must not send a user to redo a connection that is fine, and there is a test pinning each.

**Second fix in the same pass: team names are trimmed.** ESPN stores what the owner typed,
padding included — the live read returned `"    Love Thy Lamb"` and `"The Bijan Incident "`.
Untrimmed, that padding is laid out, so a name renders visibly indented against every other row
in the switcher. The `location + nickname` branch was already trimmed; `team.name` was not, and
`team.name` is the branch that fires for these leagues.

## ✅ RESOLVED — FULLY, verified in production 2026-08-21 — production error reporting was silently dead — [#354](https://github.com/justinduverge-design/omen/issues/354)

**Fixed on KVM1 the same day, with founder approval.** `/opt/omen/deploy/hostinger/.env.production` now carries the GlitchTip `omen-backend` DSN with the UUID dashes stripped; exactly one line changed, backup at `~/env.production.bak-20260821-o8-before-sentry-fix`, and a key-only diff confirmed no other assignment was touched. Both containers recreated. Verified from inside `omen_api`: `enabled: true`, **`transport: true`** (it was `false` before), and an event sent from the production container landed in GlitchTip as **issue 3**, tagged `environment: production`.

**Code half also done — PR [#353](https://github.com/justinduverge-design/omen/pull/353) merged and deployed** (run `32530387393`). `GET /api/ready` → `checks.error_tracking` reports `valid: true`, `host: 100.98.81.0:8000`. A real ESPN 404 provoked inside the running production container grouped into GlitchTip issue 2, which now carries two events — one `development`, one **`production`**. Stored payload searched for the exact canary credentials: absent.

**Worth keeping, because the intermediate state was itself instructive:** for about fifteen minutes the DSN was fixed while the deployed image still predated #353. Proven rather than assumed by provoking a real ESPN 404 in production and observing that **nothing was captured** — the pipe was open and nothing was feeding it. "GlitchTip is receiving events" and "Omen's error paths are wired in production" are two different claims, and conflating them is what created both this issue and `O8`.

### Original finding, kept for the record

**Both `omen_api` and `omen_cron` on KVM1 carry `SENTRY_DSN` set to the literal placeholder `paste_the_value_here` with a real DSN glued onto the end** — 115 characters, byte-identical in both containers. Read directly from the running containers over Tailscale.

`paste_the_value_herehttps:` is not a legal URL scheme (the underscore is illegal), so `new URL()` throws and `@sentry/node` builds **no transport**. The guard was `enabled: Boolean(process.env.SENTRY_DSN)` and a placeholder-prefixed string is perfectly truthy, so the SDK reported `enabled: true` and **dropped every event in silence**. Reproduced locally against the exact production string: `enabled: true`, `transport: false`, envelopes received **0**.

**Omen has been reporting errors nowhere** — not to GlitchTip, not to sentry.io. This is the worst failure mode a monitoring tool has: a configuration mistake that is indistinguishable from "no errors are happening", and which every "is it set?" health check passes forever.

**Even corrected, that DSN targets sentry.io, not the GlitchTip instance `O1b` deployed.** `O1b` proved GlitchTip *accepts* events by POSTing to it directly from a terminal. That never proved Omen *sends* to it, and those are different claims — the same shape as `O8`'s own false Scope premise: proven at both ends, assumed across the middle.

**Guard shipped in PR [#353](https://github.com/justinduverge-design/omen/pull/353):** `describeSentryDsn()` validates rather than testing truthiness, matches the SDK's own key grammar so it cannot be looser than what it validates, logs loudly at boot when set-but-invalid, and is surfaced at `GET /api/ready` → `checks.error_tracking` (host and project id only, never the key). The production string now reports `valid: false, reason: "unparseable"` and disables the client honestly.

**Remaining is founder-only** (secrets + production restart): set `SENTRY_DSN` on both containers to the GlitchTip `omen-backend` DSN **with the UUID dashes stripped**, recreate them, and confirm `GET /api/ready` → `checks.error_tracking.valid: true`.

### ⚠️ GlitchTip project keys are dashed UUIDs; `@sentry/node` rejects them

GlitchTip mints keys as dashed UUIDs. The SDK's DSN grammar accepts only `[A-Za-z0-9_]` and rejects them outright with `Invalid Sentry Dsn`. **Strip the dashes** — GlitchTip accepts the undashed form. Confirmed live against `omen-backend`. This is not recorded in `O1b`'s handoff and would cost the next session the same hour.

## 🐛 Yahoo league binding was broken the whole time — found 2026-08-28 (FIXED)

**The entitlement landing exposed a defect that had been sitting behind it.** With Yahoo answering again, the first real `POST /api/yahoo/league` bind was **refused**: `getUserLeagues()` returned `[]` while the same raw call returned two leagues. The route validates the requested id against that list, so **every bind attempt failed** with `"leagueId is not one of your Yahoo leagues"` and the connection could never leave the pre-bind `league_id: "yahoo"` sentinel. Connected forever, usable never.

**Root cause: Yahoo serialises entities in two shapes, and the parsers accepted only one.** Measured against live traffic 2026-08-28 — not assumed:

| Endpoint | `[0]` shape | Parser | Was |
|---|---|---|---|
| `/league/{key}` | **flat object** | `getLeagueMetadata`, `getCurrentWeek` | broken |
| `/users;use_login=1/games;game_keys=nfl/leagues` | **flat object** | `getUserLeagues` | broken |
| `/users;…/leagues;league_keys={key}/teams` | **array** of single-key objects | `getMyTeamKey` | correct |

All three broken parsers did some form of `if (!Array.isArray(x)) return <empty>`. Fixed with a single shared `yahooAttrReader()` in `src/services/yahoo.js` that accepts either shape. `getMyTeamKey()` was correct but routed through the reader anyway so it cannot break if Yahoo flattens it later.

**Three things about how this was found are worth keeping.**

1. **The unit test passed throughout, because its fixture encoded the bug.** `test/yahoo.test.js` built `league[0]` as an array — the shape the parser expected — rather than the shape Yahoo sends. A fixture written from the implementation tests that the implementation is itself. **Fixtures for provider responses must come from captured traffic.** New fixtures are captured from real 2026-08-28 responses, and both shapes are now covered so neither can regress.
2. **Two of the three parsers had no direct unit coverage at all.** `getLeagueMetadata()` and `getCurrentWeek()` were exercised only through mocks in route tests, which is how one wrong assumption survived across three methods.
3. **Everything here degrades silently by design.** These parsers return `{}` / `null` / `[]` rather than throwing, so a partial Yahoo outage degrades gracefully. The cost is that a *wrong* parser is indistinguishable from an *empty* provider: nothing logged, nothing alerted, no Sentry event. The 403 era hid this completely — every call failed earlier, so the parsers never ran on real data. **When a provider comes back after an outage, re-verify the parse layer, not just the connection.**

**Also recorded: the first fix named the wrong endpoints.** The initial commit fixed `getUserLeagues()` and asserted in a code comment that `/league/{key}` used the array shape. That was an assumption, and it was wrong. Measuring all three endpoints — instead of fixing the one that failed — is what surfaced the other two broken parsers. The correction is in the code comments and in `decision_log.md` (2026-08-28).

---

## ✅ Yahoo entitlement is LIVE — 2026-08-28 (RESOLVED)

**Yahoo granted Fantasy Sports API access for app `ZcZJXm8V`.** Verified by a read-only probe run from inside the production `omen_api` container at ~17:21 ET on 2026-08-28, through the normal `getAuthenticatedYahooClient()` path:

```
conn: {"league_id":"yahoo","token_expires_at":"2026-08-21T21:28:45.02+00:00"}
Yahoo token refreshed  (userId e0bf3a6c-…)
OK /game/nfl                  {"game_key":"470","season":"2026", …}
OK /users;use_login=1/games   {"users":{"0":{"user":[…,{"games":{…}}]}}}
```

**Why this is conclusive.** These are the same two calls that returned 403 `"This application is not authorized to perform this action."` on 2026-08-21, and `/game/nfl` is public game metadata requiring no user scope — a 200 there is the entitlement itself, not a user grant. The stored token had already expired (`token_expires_at` 2026-08-21); the proactive refresh minted a fresh one mid-call and Yahoo **accepted** it. Valid credentials, fresh token, same app, same server — and now allowed. Nothing in this repo changed to cause it; Yahoo flipped it, exactly as the prior entry predicted was the only thing that could.

**Timing.** The prior entry set 2026-08-28 as the escalation date (cite envelope `A1D54813-9307-84ED-83EA-FC24FBE40785` and App ID `ZcZJXm8V`). Access landed on that date. **No escalation was sent and none is needed.**

**Both gates opened the same day.**

1. `YAHOO_ENABLED=true` appended to `/opt/omen/deploy/hostinger/.env.production` on KVM1 (backup: `.env.production.bak-20260828-before-yahoo-enable`), `omen_api` and `omen_cron` force-recreated. Verified: both containers report `YAHOO_ENABLED=true`, health is `ok`, and `GET /api/yahoo/auth` now returns **401** (`requireAuth`) instead of **503** (`YAHOO_ENABLED` gate) — the gate is lifted.
2. `YAHOO_CONNECTIONS_ENABLED = true` in `frontend/src/lib/yahooAuth.js`. Backend suite 880/880, frontend build clean.

**Still true, do not confuse with this:** the production Yahoo `platform_connections` row carries `league_id: "yahoo"`, the deliberate pre-bind sentinel documented below. The entitlement being live does **not** make that row usable — it needs a real league bound through `GET /api/yahoo/leagues` + `POST /api/yahoo/league`. `connected` ≠ `usable` (facts-of-record #12).

**If it ever goes dark again:** `GET /api/yahoo/access-probe` is the whole test (any 200 = granted, four 403s = revoked). Pausing requires **both** `YAHOO_ENABLED=false` and `YAHOO_CONNECTIONS_ENABLED=false` — either alone leaves a path that looks functional and is not.

---

## 📄 [RESOLVED 2026-08-28 — superseded by the entry above] Yahoo agreement executed, entitlement still dark — 2026-08-21

**The API Access and Use Agreement is signed by both parties.** Yahoo countersigned **2026-08-20** (Dipesh Raichura, Sr Dir Product Management); founder signed 2026-08-05; **effective date 2026-08-07**. Docusign envelope `A1D54813-9307-84ED-83EA-FC24FBE40785`. Developer: Valor Ventures LLC. Territory: **US and Canada**. API Access: **Read-Only**. Developer Application named as "Omen (https://slopssaloon.com/)".

**The entitlement has not switched on.** `GET /api/yahoo/access-probe` run live twice on 2026-08-21 (~16:00 and ~16:15 ET) returned **403 on all four calls**, including `/game/nfl`:

```json
{"probes":{"user_games":"Yahoo API error: 403","nfl_games":"Yahoo API error: 403",
           "nfl_leagues":"Yahoo API error: 403","public_game_meta":"Yahoo API error: 403"}}
```

**Do not read this as a new failure.** It is the same signature as 2026-08-13, one day after countersignature — consistent with ordinary provisioning lag between Docusign completion and API entitlement. Issue [#308](https://github.com/justinduverge-design/omen/issues/308) stays open and `facts-of-record.md` #11 stays as written: **access is still refused at the entitlement level**, and that entry does not change until a probe returns 200. Recording an approval ahead of a verified call is the exact error #11 was corrected for.

**Two hypotheses were eliminated in the process, both worth not re-testing.**

1. **The stored OAuth token is healthy.** The probe returned HTTP **200** with a probes body, not `500 "probe setup failed"`. That means `getAuthenticatedYahooClient()` succeeded, so `token_secret_id` and `token_expires_at` are both good. **The `P1-YahooReauth` token-level branch is not in play** — no reconnect is needed, and no `YAHOO_ENABLED` flip is needed to mint a token before probing. This is a clean read of the entitlement.
2. **The blank Homepage URL on `ZcZJXm8V` was not the cause.** Found empty during this session and filled in by the founder mid-session; the probe was re-run immediately afterward and returned the identical four 403s. A 403 on `/game/nfl` — public metadata, no user scope, no redirect — cannot be caused by app profile metadata. Filling it in was still worthwhile as approval-queue hygiene, but it is **not** a lever on this.

### CONFIRMED by Yahoo's own words — the 403 is an application authorization refusal

**`src/services/yahoo.js:54` threw `new Error(\`Yahoo API error: ${res.status}\`)` and dropped the response body on the floor.** Every Yahoo 403 conclusion recorded in this file and in `facts-of-record.md` #11 — including "refused at the app-entitlement level", which is written as settled — rests on three digits and no reason from Yahoo.

**At least four distinct failures return 403, with entirely different remedies:**

1. Fantasy Sports entitlement not granted (the standing assumption)
2. **Source IP blocked** — Yahoo blanket-403s datacenter/VPS ranges, and Omen deploys to Hostinger
3. Rate limiting / abuse throttle
4. Wrong-audience or malformed token

**Hypothesis 2 fits the evidence better than hypothesis 1 in one specific respect:** it explains why *two* separate approvals produced no change. An IP block is indifferent to approval state. It equally explains the blanket failure of `/game/nfl`, which has been read as the signature of an entitlement gate but is just as consistent with a network-level block.

**Baseline measured 2026-08-21 from a residential IP:** unauthenticated and bogus-token calls to `/fantasy/v2/game/nfl` both return **401**, not 403, with a readable JSON reason (`oauth_problem="unable_to_determine_oauth_type"` / `"token_rejected"`). So 401 is Yahoo's healthy-path credential rejection, and the server's 403-with-a-valid-token is categorically different.

**Fixed here.** `get()` now attaches `status`, `body` (first 2000 chars), and `www-authenticate` to the thrown error, and `/api/yahoo/access-probe` returns all three per call. Message prefix unchanged, so existing callers and `test/yahooAuthRoute.test.js` are unaffected; full suite 575/575.

### Both competing hypotheses were tested live on 2026-08-21. Result: entitlement CONFIRMED, IP block ELIMINATED.

**1. Source IP is NOT blocked — eliminated with evidence.** Over Tailscale to `omen-prod` (`srv1737978`): egress IP is **`2.25.182.1`**, and an **unauthenticated** call to `/fantasy/v2/game/nfl` returns **401** with the ordinary `oauth_problem="unable_to_determine_oauth_type"` body — byte-identical to the same call from a residential IP. Yahoo answers this server normally. No datacenter-range block, no throttle.

**2. Entitlement refusal CONFIRMED — Yahoo said it in words.** A read-only diagnostic inside the running `omen_api` container acquired a live token through the normal `getAuthenticatedYahooClient()` path and called `/game/nfl` directly:

```json
{"error": {"yahoo:uri": "/fantasy/v2/game/nfl?format=json",
           "description": "This application is not authorized to perform this action.",
           "detail": ""}}
```

**"This application is not authorized"** is application-scoped, not user-scoped and not network-scoped. This is the first time the diagnosis rests on Yahoo's own statement rather than on inference from a status code. The eight-day-old conclusion was correct; it simply had never been verified.

**The token path is fully healthy — stop suspecting it.** The stored token had expired (`token_expires_at: 2026-08-14T03:04:56Z`); the proactive refresh fired automatically mid-call, minted a fresh token, and Yahoo refused *that*. So: valid client credentials, valid fresh token, clean IP, correct app (`ZcZJXm8V`), executed agreement — and still refused at the application layer. **No code change and no founder action can move this.** Only Yahoo flipping the entitlement will.

### NOT A BUG — the Yahoo `league_id` of `"yahoo"` is a deliberate sentinel

**Recorded because it was briefly logged here as a bug on 2026-08-21 and retracted the same session.** A production diagnostic showed the Yahoo `platform_connections` row carrying the literal string `"yahoo"` in `league_id`, which looks like corruption. It is not.

`src/services/yahooAuth.js:69` writes it on purpose and says so inline: `league_id` is **NOT NULL**, so OAuth completion stores the platform name as a placeholder until a real league is bound. `hasUsableLeagueId()` in `src/services/omenReadiness.js:3-6` rejects exactly this shape:

```js
return Boolean(leagueId) && leagueId !== connection?.platform;
```

A `league_id` equal to its own platform is treated as unusable by design, so the row can never masquerade as ready. `GET /api/yahoo/leagues` + `POST /api/yahoo/league` bind the real dotted key (`449.l.123456`), and that route validates the id against the user's actual leagues before writing — it cannot persist a bad one.

**The lesson is the one this file keeps re-learning:** the value was called a bug from its appearance alone, without reading the code that writes it — the same error as diagnosing a 403 from its status code without reading the body. **Do not "fix" this sentinel.** Removing it would violate the NOT NULL constraint on every pre-bind Yahoo connection.

### DISPROVEN — the "prior approval attached to a deleted app" theory is wrong

**Measured 2026-08-21 by credential hash.** This file and `facts-of-record.md` #11 both state that the earlier Fantasy API approval "most likely attached to the **previous app, which was deleted** — deleting it destroyed the grant". **That was always an assumption, and it is now disproven.**

`YAHOO_CLIENT_ID` was SHA-256 hashed in four places and compared against the client ids of all five apps in the developer console:

| Source | SHA-256 | Resolves to |
| --- | --- | --- |
| Deployed (`omen_api` env, live) | `b1af77a2…4daa` | **`ZcZJXm8V`** |
| `~/.env.production` on KVM1 (**mtime 2026-06-08**) | `b1af77a2…4daa` | **`ZcZJXm8V`** |
| `~/.env.production.backup` on KVM1 (**mtime 2026-06-08**) | `b1af77a2…4daa` | **`ZcZJXm8V`** |
| `/opt/omen/deploy/hostinger/.env.production` | `b1af77a2…4daa` | **`ZcZJXm8V`** |

**All identical.** The June 8 files carry June 8 mtimes, so that is their content from the period the repo records Yahoo as working (Phase 2.17 shipped Yahoo `lastResult` on 2026-06-27; June real-account QA).

**Therefore: `ZcZJXm8V` is the same app that was deployed when Yahoo worked, and it is the app being refused now.** Nothing was deleted out from under the grant. The 2026-08-13 credential update recorded in `current_sprint.md:836` was a re-copy of the same client id or a secret-only rotation — **not** a switch to a different app.

**What this changes.** The situation is not "a new app needs a first-time approval". It is **an app that previously held working Fantasy API access and lost it.** That is a restore request, not an application, and it is the first explanation consistent with *every* fact — including the one that never fit: **two approvals producing no change.** If access is being revoked or lapsing at the app level, an approval that does not address the revocation would not help. *(That last inference is a hypothesis, flagged as such — the credential lineage above is measured; the mechanism behind the loss is not.)*

**Evidence grading, deliberately kept separate.** The credential lineage is **measured** (hashes, four sources, exact match). "Yahoo worked in May/June" is **from this repo's own records**, not re-measured today. Both support the conclusion; they are not the same grade of proof, and collapsing them is how the last three wrong Yahoo entries got written.

**Also corrected: the method recorded for identifying the deployed app does not reproduce.** `known_issues.md` states the deployed client id "was decoded (Yahoo embeds the App ID inside the client id as base64 `ai=<AppID>`)". Attempting that decode on the live value yields **no `ai=` field**. The conclusion `ZcZJXm8V` is right, but it was reached by a route that cannot be re-walked — **use the hash comparison above instead**, which is reproducible and never exposes the credential.

### The Yahoo developer account holds five apps, not two

Prior entries in this file (and `facts-of-record.md` #11) describe **two** Yahoo apps. `developer.yahoo.com/apps/` actually lists **five**, all named "Omen — The Fantasy Football Library". Three were unknown to every document in this repo:

| App ID | Redirect URI | Client type | Fantasy Sports permission offered? |
| --- | --- | --- | --- |
| **`ZcZJXm8V`** | `/api/yahoo/callback` — **deployed** | Confidential | **Yes** |
| `zj1r5hHC` | `/api/yahoo/callback` | — | No |
| `YHFdZulX` | `/api/yahoo/callback` | — | No |
| `qLO3I0k0` | `/api/auth/yahoo/callback` | — | No |
| `3GnEYhVE` | `/api/auth/yahoo/callback` | Public | No |

**This resolves the "will Yahoo turn on the right app?" worry in the reassuring direction.** On the four non-deployed apps the Fantasy Sports permission block is **not rendered at all** — it is not merely left unchecked. Yahoo's own console surfaces that option only on `ZcZJXm8V`, which is both the app whose client id is deployed and the app re-applied for on 2026-08-13. There is only one app Yahoo can plausibly provision, and it is the correct one.

**Do not delete the four unused apps.** Deleting an app is what destroyed the previous grant (see the 2026-08-13 entry below). Tidiness here costs more than it saves.

**One unrelated thing worth untangling later, not now:** `3GnEYhVE` is a **Public Client** carrying **TW Auction Read/Write**. That is the only write-scoped permission anywhere in Omen's Yahoo footprint, on an app Omen does not use, while Omen's contract is read-only. Not a live risk (no credentials deployed for it) and not touchable while an approval is pending on a sibling app.

### Yahoo attribution is contractually owed and was entirely absent

The Attribution clause requires three placements. As of 2026-08-21 an audit found **none of the three present** — not partially, zero.

- **Web footer — NOW ADDRESSED.** `frontend/src/components/layout/Footer.jsx` gained a `YahooAttribution` line ("Fantasy data provided by Yahoo Fantasy", hyperlinked to an official Yahoo Fantasy page). It renders **conditionally on `YAHOO_CONNECTIONS_ENABLED`**, because Omen currently displays no Yahoo data and an unconditional line would be a false statement on every page, sitting beside the non-affiliation line. It lights up on the same flag flip that re-enables Yahoo. Deliberately over-inclusive after that flip (all pages, not only Yahoo-bearing ones) — over-attributing is not a breach, under-attributing is.
- **Store listing — NOW ADDRESSED in copy.** "This application uses fantasy data provided by Yahoo Fantasy." added to `Blueprints/specs/mobile/omen-store-listing-copy-v1.md`. Note the spec previously told Apple submitters to drop "the trailing attribution line"; that instruction meant the **trademark/non-affiliation** line and has been clarified, because the Yahoo sentence must survive into the App Store description. The existing non-affiliation disclaimer is a **different clause serving the opposite purpose** and does not discharge this one.
- **Mobile in-app — NOW ADDRESSED.** The clause requires attribution inside the app, in an "About", "Legal", or similar informational section. There is no Legal or About screen in either native app, and **creating one would need its own screen contract and Figma approval** under `omen-native-delivery-governance-v1.md` §2-§4. **Help + Support is the existing "similar informational section"**, so the attribution was added there instead — `OmenHelpSupportView.swift` and `OmenHelpSupportScreen.kt` — using existing `OmenCard` / `bodySmall` / `textSecondary` tokens, no new components and no new screen. Gated on `ConnectProvider.yahoo.availability == .available`, the native mirror of the web's `YAHOO_CONNECTIONS_ENABLED`, so it turns on with Yahoo rather than claiming Yahoo data while Yahoo is on hold. The exact sentence is pinned by a test on both platforms — it is contractual wording, and "improving" it is a breach.

---

## ✅ Reconciled against GitHub — 2026-08-19

Founder-requested pass, run after `O7` closed. Every entry was checked against `main`, merged PRs, and open issues rather than re-read. **Entries now carry a GitHub issue number where one exists, so this file and GitHub say the same thing.**

**What the pass found.**

- **One contradiction, in the wrong direction.** `facts-of-record.md` #11 claimed Yahoo API access *"was re-approved… the developer application is live again"* while this file had recorded the opposite since 2026-08-13 — a live-verified 403 on all four probe calls, entitlement refused, issue [#308](https://github.com/justinduverge-design/omen/issues/308) open. The optimistic version was sitting in the **higher-authority** file that agents read first. Corrected in `facts-of-record.md`, with the provenance kept rather than overwritten.
- **One entry describing code that no longer exists.** src/omen_gdpr.js (retired 2026-07-13) was listed as "remains present"; it was deleted by PR [#119](https://github.com/justinduverge-design/omen/pull/119) ("retire orphan gdpr") — it was an orphan, never mounted, so no capability was lost. Corrected below.
- **Four real issues that lived only in this file** are now GitHub issues: [#338](https://github.com/justinduverge-design/omen/issues/338) fonts, [#339](https://github.com/justinduverge-design/omen/issues/339) backend Sentry breadcrumbs, [#340](https://github.com/justinduverge-design/omen/issues/340) contrast, [#341](https://github.com/justinduverge-design/omen/issues/341) Android status bar.
- **This file was more honest than the sprint queue.** Every entry marked FIXED or RESOLVED here was verified genuinely fixed against `main`. The stale record was `S8` in `current_sprint.md`, which advertised "six open Dependabot PRs" when there were **zero** — all six resolved on 2026-08-11 exactly as S8's own verdicts prescribed, and the status never advanced.

**The gap that allowed it, stated plainly.** `scripts/check-sprint-staleness.js` compares the sprint queue against merged PRs. **Nothing compares this file against `facts-of-record.md`, and nothing compares either against GitHub issues.** Yahoo had an open issue, a facts-of-record entry, and an entry here, and no mechanism ever looked at all three together. The contradiction was not missed through carelessness — nothing was watching. Until a checker exists, this reconciliation must be re-run by hand: **treat it as recurring, not one-off.**

**Rule going forward:** an entry here that is real and unresolved gets a GitHub issue, and the issue number goes in the heading. If it is not worth an issue, it is not worth an entry.

## Security — Frontend Sentry did not scrub OAuth `code` / `state` (found 2026-08-17) — ✅ FIXED

**Severity was moderate. Fixed 2026-08-17**, verified live same day. Found during `O1b` verification against the new Sentry account — invisible until a real event was exercised through the client.

**Original defect:** `frontend/src/lib/sentry.js:61` scrubbed query parameters using `SENSITIVE_KEY_PATTERN` (`/password|cookie|token|secret|swid|espn_s2|vault/i`), which contains **no `code` and no `state`**, while the backend had a dedicated `SENSITIVE_QUERY_PARAMETER_PATTERN` including `^(code|state)$`. Reachable via Yahoo and Discord OAuth returns, which land on frontend routes carrying `?code=&state=`. `Direction/decision_log.md` (OAuth-artifacts entry) and `Direction/sprints_completed.md:134` both asserted the covered behavior without distinguishing the two halves — **the documentation was as much the risk as the code**, since it would let a reviewer conclude the path was covered.

**Fix:** `frontend/src/lib/sentry.js` gained its own `SENSITIVE_QUERY_PARAMETER_PATTERN` mirroring `src/middleware/sentry.js:8`, plus `scrubBreadcrumbUrls` covering the `url` / `from` / `to` breadcrumb fields — a second gap found while fixing the first, on the *same* reachable page, so fixing only `request.url` would have left the leak open.

**Verification** (live client `beforeSend` / `beforeBreadcrumb`, the same method that found it): `?code=AUTHCODE123&state=ST8&espn_s2=LEAK&team=Ravens` → all three sensitive params `[scrubbed]`, benign `team=Ravens` preserved; all three breadcrumb URL fields scrubbed; **zero leaks** across the whole probe set. Regressions held: ESPN-credential URLs still drop the event entirely, console breadcrumbs still drop, relative URLs still scrub correctly, query-less URLs pass through untouched. Backend `npm test` **563/563**, frontend build clean, `npm audit` 0.

**Standing lesson:** both the 2026-07-24 code review and the Phase 1.2 handoff called this scrubbing complete, and both were written by *reading* the code. One synthetic payload through the shipping function surfaced the gap in minutes. For any claim of the form "sensitive data never reaches X", **execute it**.

## ✅ RESOLVED 2026-08-22 — Android bottom navigation broke at large font scale

**Found and fixed the same day, so it never needed a GitHub issue.** Recorded here because the
defect was real, shipped, and app-wide — and because the *way* it was found is the point.

At Android **font scale 2.0** (the accessibility maximum) the bottom navigation bar's labels
overflow their items: **"Command" wraps to "Comma / nd"** and spills below its own row, and
**"League" is clipped at the right screen edge**. The icons stay put; only the labels break.

**This is app-wide, not a Help + Support defect.** It was found while capturing
`M4-Help-Support-Implementation` font-scale evidence, but the Help + Support content itself
reflows correctly at 2.0 — the cards grow, the text wraps, nothing clips. The break is in the
nav that sits under every screen.

**It is production code, not a screenshot-mode artifact.** `OmenBottomNav` in
`mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/OmenAndroidApp.kt:505` and the
screenshot-mode `FauxBottomNav` in `.../app/screenshot/ScreenshotScenarios.kt` are structurally
identical — the same `NavigationBarItem` with `label = { Text(destination.label, style =
OmenTheme.typography.label.toTextStyle()) }` and **no `maxLines`, `softWrap`, or `overflow`
handling**. Verified by reading both call sites, not inferred from the capture.

Evidence: `References/evidence/2026-08-22-m4-help-support-native/android-medium-phone-help-support-available-fontscale-2.0.png`
(broken) against `...-fontscale-1.3.png` and `...-available.png` (both fine). So the failure
appears somewhere between scale 1.3 and 2.0.

**Not iOS.** The iOS tab bar was rendered at `accessibility-extra-extra-extra-large` in the same
pass and does not exhibit it — SwiftUI's `TabView` truncates rather than overflowing.

### The fix

`maxLines = 1`, `softWrap = false`, `overflow = TextOverflow.Ellipsis` on the nav label, applied
to **both** `OmenBottomNav` and the screenshot-mode `FauxBottomNav` so the evidence keeps
representing what ships.

Four items cannot show full labels at 2× on a phone, so the real choice was *how it degrades*:
predictable ellipsis inside the item, or text drawn outside its bounds. **Meaning is preserved
for screen-reader users either way** — Compose keeps the full string in the semantics tree even
when it is visually ellipsized, and each item's icon carries its own `contentDescription`.

**Verified by re-rendering, not by a test.** `android-medium-phone-help-support-available-fontscale-2.0.png`
now shows `Comm…` contained inside its own item and `League` no longer clipped at the screen edge.
Nothing here is assertable without looking at the pixels, which is why it survived until someone did.

Android `:app:assembleDebug` SUCCESS, `:core:designsystem:testDebugUnitTest` and
`:app:testDebugUnitTest` green, `:app:connectedDebugAndroidTest` **53/53** after the change.

## Resolved Gaps

- **"No authenticated screenshot — Supabase sandbox limitation" is resolved**, not an unfixable constraint. Five past phases (1.5d, 1.7, 1.8, 1.12, 2.18) each independently hit and documented this gap because the fix existed but was undocumented and hardcoded to one page. `.agents/skills/run-slops-saloon/driver_protected_route.cjs` (+ frontend/src/lib/authBypass.cjs (removed)) now generalizes it to any `ProtectedRoute`-gated route with zero real Supabase credentials, zero backend, and zero network call. See `.agents/skills/run-slops-saloon/SKILL.md` ("Authenticated protected-route screenshots") before writing "known gap" for this again — add a `routes/<id>.cjs` config instead.
