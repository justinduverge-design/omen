# Codex review comments — compiled and checked against `main` (2026-10-02)

Codex reviews every PR in this repo automatically and leaves inline comments marked **P1** (serious) or **P2** (lesser). They were rarely read before merge: of 620 comments, 30 are marked resolved on GitHub and 36 had code changed under them in the same PR. This file compiles them and checks the serious ones against today's `main` (`f8b09b84`), before any database change reaches production.

**Method.** All 620 inline comments by `chatgpt-codex-connector`, PRs #38–#513, were pulled through the GitHub API. Dropped as moot: 37 on PRs closed without merging, and 26 on files that no longer exist. Of the remaining 557, 206 are on planning docs and 41 on Android (paused); neither is a runtime risk. The rest, **94 P1 and 125 P2 on live code** (database, server, connections, iPhone, web), are listed below. Every P1 on the server and database was checked by reading the current code. iPhone P1s were spot-checked only: another session owns the phone code. Web P1s were not checked (web work is paused). P2s are compiled but **not checked**.

Raw data: 620 threads with full text; regenerate with `gh api graphql` (`reviewThreads`) per PR.

## Read this before any production step

1. **Step 05 must not reach production before account deletion moves onto `account_erase()`.** *(Codex, #508; confirmed on `main`.)*
   - Once step 05 is applied, the Ledger refuses a plain delete of a person who has calls. The 3 backfilled users have calls immediately.
   - `src/routes/userPrivacy.js` still deletes Vault secrets, moves, reports, connections, OAuth state and consent in separate calls, then deletes `users`. For those users, the last delete fails after everything else is gone. The account is left half-erased and cannot be deleted on retry.
   - Step 10 (`account_erase()`) needs step 05, so it cannot go first.
   - **Order:** first ship the server change. The route calls `account_erase()` when it exists and keeps today's path when it doesn't. Then apply steps 05 and 10 back to back.
   - Steps 07, 01, 02, 03, 04 and 06 do not depend on this.
2. **Step 09 (beta reports) makes a weak credential filter live.** *(Codex, #440.)*
   - The Report route rejects `espn_s2`, but not a natural spelling such as `ESPN S2 = <cookie>`, so a tester's pasted cookie would be stored.
   - Fix `src/routes/betaReports.js` before or with step 09.
3. **Things the redo already fixes once the server uses the new tables:**
   - A weekly call is overwritten when the person asks again (#372): the Ledger keeps every call.
   - Ledger reads assume columns production lacks (#440, #384): the redo adds them.
   - Disconnect and delete ignore Vault failures (#505): the redo's functions refuse partial changes.
   - Not yet fixed by either: the league-follows default (#397). If the follows table exists but holds no rows, every league shows as unfollowed. The server change that reads `league_memberships` must keep "a newly connected league is followed".

## Live in production today (not database steps)

These are on code that runs now. None blocks a database step, but several are privacy or security issues.

| # | Where | What | Status on `main` |
|---|---|---|---|
| #474 | `src/routes/trade.js:724` | **Trade-finder cache is not tied to the user.** The cache key is `platform:league:week`. Anyone signed in who asks for the same league and week gets another person's cached private ESPN/Yahoo rosters, without provider access to that league. | **Fixed in #516** (2026-10-02): the key now starts with the user id; regression test in `test/tradeFindRoute.test.js`. |
| #295 | `src/routes/yahoo.js:210,227,261` | 500 responses return the raw internal error message (database/RPC names) to the app. | Still open |
| #296 | `src/routes/yahoo.js:181` | `/access-probe` (a diagnostic making 4 Yahoo calls each time) is open to any signed-in Yahoo user, not just the operator. | Still open |
| #353 | `src/middleware/providerErrors.js:76` | Up to 500 characters of Yahoo's error body go to error tracking after keyword scrubbing; arbitrary vendor text can carry an email or token. | Still open |
| #353 | `src/adapters/sleeper.js:11` | Failed Sleeper lookups send the full path, including usernames and league ids, to monitoring. | Still open |
| #355 | `src/middleware/logging.js` | The log scrubber skips `Error`/Axios objects, so their headers (e.g. Authorization) could be logged if a call site passes the error itself. | Likely still open (no handling found) |
| #418 | `scripts/espn-projection-live-proof.js:46` | The proof script reads **every** user's ESPN cookies, not one consenting account. | Still open (operator script; do not run as is) |
| #474 | `src/routes/trade.js` + adapters | Trade finder for ESPN and Yahoo always returns nothing: those adapters return no starting-lineup slots. | Still open |
| #474 | `src/routes/trade.js` | Trade finder does not apply the value guard, so it can suggest a trade its own valuation rejects. | Still open |
| #473 | `src/routes/trade.js:1096` | Three-team trades copy the first team's verdict to the top-level answer, even when the whole trade is "insufficient data". | Still open |
| #364 | `src/services/tradeValue.js:147` | A projection of `null` counts as 0 points, so a missing projection can produce a normal verdict. | Still open |
| #259, #418 | `src/adapters/sleeper.js`, `src/routes/league.js` | Sleeper projections and matchup totals always use PPR, even in Standard/Half-PPR/custom leagues. | Still open |
| #269 | `src/routes/waitlist.js:64` | Unsubscribe hard-deletes the address with no suppression record; a later signup re-adds and emails them. | Still open |
| #380 | `src/services/scoringSnapshotResolver.js:61` | Retention of Sleeper league scoring rules is switched **on**; Codex flagged that the rights decision for keeping them was still open. | Still on: needs a founder decision on record |
| #56 | `src/services/sleeperDraftAccess.js` | Sleeper draft access trusts the saved league id; connect does not verify the user is in that league. | Still open (no membership check found) |

**League Office worker** (`src/league_office_sync_worker.js`, the Slops Saloon bulletin, every 5 minutes):

| # | What | Status |
|---|---|---|
| — (found in this review) | **Line 381: the season-long $100 accolade update is inside a comment.** A literal `\n` put the call on the comment line, so the update never runs. | **New bug, live** |
| #441 | Two workers can pick up the same queued job (no atomic claim). | Still open |
| #441 | A job left "running" after a crash is never retried. | Still open |
| #463 | A week with no executed add or drop fails the whole job, losing the line and accolades. | Still open |
| #463 | A missing ESPN projection becomes 0, so a fake line can be published. | Still open |
| #463 | Every rerun rewrites the locked line and its lock time; the graded line can change after the bulletin. | Still open |
| #463 | On Tuesday/Wednesday the recap may describe the week before the one that just finished. | Unclear; check against a real Tuesday run |
| #443, #464, #466, #463 (ESPN actuals) | Missing job fields, undefined accessor, invalid source, actuals from stat rows | Fixed |

## Off in production (they matter when the feature is turned on)

- **Tuesday scoring** (`src/omen_tuesday_cron.js`) is disabled (`OMEN_CRON_SCORING_ENABLED` unset). Before it is enabled, or replaced by the redo's `decision_outcomes`, fix these:
  - the dry-run flag is not passed into the cron container (#260);
  - feedback-only rows would be scored as losses (#261);
  - every row is scored as PPR (#261, #369);
  - new rows fall back to legacy scoring (#369);
  - missing scoring facts count as zero (#369);
  - two-point conversions are counted three times (#371).
- **Football data and intelligence pipelines.** Codex comments #370, #381, #467 and #470: acceptance with no evidence, a self-confirming witness hash, a fact-schema mismatch, and coverage overstated on sparse data. None of this code is on the live recommendation path today. Fix before any of it feeds a call.
- **Weather** (#495): a backtest cannot know which forecast the live call saw. The module is not wired to anything.

## Already fixed

The 5 database P1s from the redo PRs: #505 twice, #508, and #511 (fixed in #514). Also the league-selection order (#371), off-season blocking (#78), and Yahoo's placeholder league and expiry in platform state (#189–#191). Plus the League Office items marked fixed above, and on the iPhone: carousel parameters (#494), ESPN sheet dismissal (#450), stale picks on "connect another" (#494), and the comment that broke the build (#447).

## iPhone (for the session fixing the phone)

Spot-checked only. Still open on `main`:

- **#507:** the timing log prints request paths that include a Ledger record id. A private id goes to the device console.
- **#459:** waiver analysis is not cleared when switching leagues, so the old league's waiver call can show.

Not checked: #320 (×2), #397, #399, #377 (×2), #317 (×2), #198, #423, #310 (×2), #343 (×2), #331. All are listed in the appendix.

## Web app (paused; not checked)

#314, #60, #307, #121, #108, #269. The one that matters if web is used: #121, account deletion is unreachable for someone who signed up but never connected a league.

## Appendix — every live-code comment

Status: **checked** comments carry the verdict above; everything else is "not checked".

### P1 (94)

| PR | File | Comment | Status |
|---|---|---|---|
| #314 | `frontend/src/components/layout/ProtectedRoute.jsx:55` | Re-read completion after onboarding updates it | not checked (web paused) |
| #60 | `frontend/src/lib/themeMode.js:182` | Keep legacy team-accent CTAs readable | not checked (web paused) |
| #307 | `frontend/src/pages/ConnectLeague.jsx:362` | Show the pause for existing Yahoo connections | not checked (web paused) |
| #121 | `frontend/src/pages/DeleteAccount.jsx:29` | Keep account deletion reachable before onboarding | not checked (web paused) |
| #108 | `frontend/src/pages/Landing.jsx:30` | Use opacity-compatible color tokens | not checked (web paused) |
| #269 | `frontend/src/pages/Login.jsx:174` | Carry assent through cross-browser magic-link callbacks | not checked (web paused) |
| #320 | `mobile/ios/OmenIOS/OmenIOS/App/Api/CommandCenterViewModel.swift:100` | Preserve Ledger history after a connection is lost | phone session |
| #459 | `mobile/ios/OmenIOS/OmenIOS/App/Api/CommandCenterViewModel.swift:226` | Clear waiver analysis before reloading another league | phone session |
| #494 | `mobile/ios/OmenIOS/OmenIOS/App/Api/CommandCenterViewModel.swift:118` | Keep the league carousel in the mounted Command Center | phone session |
| #320 | `mobile/ios/OmenIOS/OmenIOS/App/Api/DashboardRepository.swift:118` | Scope Ledger rows to the active league | phone session |
| #397 | `mobile/ios/OmenIOS/OmenIOS/App/Api/LeagueCarouselViewModel.swift:178` | Resolve the active page from the global selection | phone session |
| #399 | `mobile/ios/OmenIOS/OmenIOS/App/Api/LeagueCarouselViewModel.swift:210` | Avoid queuing suppression before the pager mounts | phone session |
| #377 | `mobile/ios/OmenIOS/OmenIOS/App/Api/LeagueSwitcherViewModel.swift:68` | Reject unpersisted cross-provider switches | phone session |
| #507 | `mobile/ios/OmenIOS/OmenIOS/App/Api/OmenApiClient.swift:241` | Redact record identifiers from timing logs | phone session |
| #317 | `mobile/ios/OmenIOS/OmenIOS/App/Api/OmenDecision.swift:130` | Route connection recovery states to their required actions | phone session |
| #198 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/ASWebAuthenticationOAuthProvider.swift:68` | Process the authentication-session callback directly | phone session |
| #317 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift:91` | Reload the Omen decision after connection succeeds | phone session |
| #377 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift:143` | Cancel pre-switch personalized requests | phone session |
| #423 | `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenCommandCenterScreen.swift:160` | Preserve scrolling in nested widget pages | phone session |
| #310 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectRepository.swift:84` | Route unauthorized responses to reauthentication | phone session |
| #310 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectViewModel.swift:55` | Cancel or invalidate the in-flight connect task | phone session |
| #450 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectViewModel.swift:283` | Ignore programmatic ESPN sheet dismissal | phone session |
| #494 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectViewModel.swift:319` | Clear prior picks before entering another provider picker | phone session |
| #447 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/EspnWebSignIn.swift:95` | Restore the entry URL declaration outside the comment | phone session |
| #343 | `mobile/ios/OmenIOS/OmenIOS/App/CrashReporting/SentryEnvelopeReporter.swift:83` | Preserve release addresses for Sentry symbolication | phone session |
| #343 | `mobile/ios/OmenIOS/OmenIOS/App/CrashReporting/SentryEnvelopeReporter.swift:86` | Scrub exception reasons before external reporting | phone session |
| #331 | `mobile/ios/OmenIOS/OmenIOSTests/KeychainSessionStoreTests.swift:25` | Keep Keychain tests compatible with unsigned iOS CI | phone session |
| #418 | `scripts/espn-projection-live-proof.js:47` | Scope the live proof to one consenting account | checked (see above) |
| #505 | `sql/2026-10-01-redo/02_connection_credentials.up.sql:87` | Serialize first-time credential stores before creating secrets | fixed |
| #508 | `sql/2026-10-01-redo/02_connection_credentials.up.sql:66` | Serialize first-time credential storage | fixed |
| #505 | `sql/2026-10-01-redo/05_ledger.up.sql:89` | Enforce the one-call-per-user-week product lock | fixed |
| #508 | `sql/2026-10-01-redo/05_ledger.up.sql:222` | Preserve account deletion when enabling the Ledger | still open (see top) |
| #511 | `sql/2026-10-01-redo/10_account_erasure.up.sql:46` | Serialize account erasure with credential mutations | fixed |
| #463 | `src/adapters/espn.js:1164` | Read weekly actuals from ESPN stat rows | checked (see above) |
| #259 | `src/adapters/sleeper.js:499` | Apply the league scoring settings to trade projections | checked (see above) |
| #353 | `src/adapters/sleeper.js:74` | Redact user segments from Sleeper paths | checked (see above) |
| #441 | `src/league_office_sync_worker.js:31` | Claim queued jobs atomically before processing | checked (see above) |
| #441 | `src/league_office_sync_worker.js:45` | Reclaim jobs abandoned in the running state | checked (see above) |
| #443 | `src/league_office_sync_worker.js:54` | Populate required context before upserting adapter rows | checked (see above) |
| #463 | `src/league_office_sync_worker.js:405` | Use the job week as the completed week | checked (see above) |
| #463 | `src/league_office_sync_worker.js:214` | Do not fail the run when a transaction award is absent | checked (see above) |
| #463 | `src/league_office_sync_worker.js:155` | Reject absent projections before coercing them | checked (see above) |
| #463 | `src/league_office_sync_worker.js:305` | Preserve a line after it has been locked | checked (see above) |
| #463 | `src/league_office_sync_worker.js:239` | Exclude playoff games from regular-season accolades | checked (see above) |
| #464 | `src/league_office_sync_worker.js:280` | Define the lazy Supabase accessor before using it | checked (see above) |
| #466 | `src/league_office_sync_worker.js:168` | Replace escaped newlines with actual line breaks | checked (see above) |
| #355 | `src/middleware/logging.js:61` | Scrub non-plain metadata before serializing logs | checked (see above) |
| #353 | `src/middleware/providerErrors.js:78` | Do not forward arbitrary Yahoo response bodies | checked (see above) |
| #260 | `src/omen_tuesday_cron.js:43` | Propagate the dry-run flag into the cron container | checked (see above) |
| #261 | `src/omen_tuesday_cron.js:172` | Keep feedback-only rows out of scoring | checked (see above) |
| #261 | `src/omen_tuesday_cron.js:172` | Preserve each move's scoring format | checked (see above) |
| #369 | `src/omen_tuesday_cron.js:266` | Mark new move rows before allowing the legacy fallback | checked (see above) |
| #369 | `src/omen_tuesday_cron.js:284` | Normalize persisted scoring formats before selecting totals | checked (see above) |
| #440 | `src/routes/betaReports.js:6` | Reject ordinary ESPN S2 labels before storage | checked (see above) |
| #78 | `src/routes/dashboard.js:236` | Block live Omen at the endpoint too | checked (see above) |
| #418 | `src/routes/league.js:508` | Honor Sleeper league scoring when projecting matchups | checked (see above) |
| #371 | `src/routes/leagues.js:300` | Clear the prior selection before setting the new one | checked (see above) |
| #397 | `src/routes/leagues.js:322` | Default missing follow rows to the discovered set | checked (see above) |
| #440 | `src/routes/moves.js:112` | Avoid filtering Ledger v2 on absent production columns | checked (see above) |
| #372 | `src/routes/omen.js:168` | Avoid overwriting an already-reviewed weekly move | checked (see above) |
| #384 | `src/routes/omen.js:186` | Preserve A6 fields in the Ledger fallback | checked (see above) |
| #189 | `src/routes/platforms.js:178` | Reject incomplete Yahoo rows before returning connected | checked (see above) |
| #190 | `src/routes/platforms.js:219` | Use the shared readiness rule before reporting connected | checked (see above) |
| #191 | `src/routes/platforms.js:223` | Derive Yahoo state from the canonical readiness checks | checked (see above) |
| #364 | `src/routes/trade.js:405` | Treat null projections as insufficient data | checked (see above) |
| #364 | `src/routes/trade.js:411` | Avoid verdict explanations for insufficient offers | checked (see above) |
| #473 | `src/routes/trade.js:864` | Evaluate roster fit from each participant's roster | checked (see above) |
| #473 | `src/routes/trade.js:898` | Return insufficient_data when any participant is unevaluable | checked (see above) |
| #474 | `src/routes/trade.js:660` | Scope cached league bundles to the authenticated user | fixed in #516 |
| #474 | `src/routes/trade.js:710` | Provide starting slots for ESPN and Yahoo scans | checked (see above) |
| #269 | `src/routes/waitlist.js:73` | Retain an unsubscribe suppression marker | checked (see above) |
| #295 | `src/routes/yahoo.js:170` | Preserve production sanitization for Yahoo 500 responses | checked (see above) |
| #296 | `src/routes/yahoo.js:162` | Restrict the probe to its intended one-shot caller | checked (see above) |
| #370 | `src/services/footballData/acceptanceValidator.js:137` | Reject acceptance documents with no scoring evidence | checked (see above) |
| #370 | `src/services/footballData/stagingShadow.js:364` | Require an independently observed witness hash | checked (see above) |
| #381 | `src/services/footballDataFacts.js:38` | Map the actual published A7B fact schema | checked (see above) |
| #381 | `src/services/footballDataFacts.js:124` | Pass canonical facts into the production scorer | checked (see above) |
| #381 | `src/services/footballDataFacts.js:145` | Make fact assembly aware of the scored subject type | checked (see above) |
| #467 | `src/services/footballIntelligence/featureWindows.js:69` | Account for per-play missingness in coverage | checked (see above) |
| #470 | `src/services/footballIntelligence/observedMetrics.js:60` | Enforce FTN coverage within each feature window | checked (see above) |
| #385 | `src/services/nflSchedule.js:71` | Publish the new seasonality fields in the endpoint contract | checked (see above) |
| #401 | `src/services/nflSchedule.js:81` | Add the required close-out records | checked (see above) |
| #301 | `src/services/omen.js:1388` | Preserve Yahoo-first selection for contextless MVP calls | checked (see above) |
| #440 | `src/services/quietWeek.js:18` | Make the neutral quiet-week branch reachable | checked (see above) |
| #369 | `src/services/scoringContract.js:72` | Reject absent event facts instead of scoring them as zero | checked (see above) |
| #371 | `src/services/scoringRuleSnapshot.js:126` | Score field-goal bands from banded event counts | checked (see above) |
| #371 | `src/services/scoringRuleSnapshot.js:42` | Do not apply every two-point rule to the combined fact | checked (see above) |
| #380 | `src/services/scoringSnapshotResolver.js:60` | Keep Sleeper retention off until the rights gate clears | checked (see above) |
| #56 | `src/services/sleeperDraftAccess.js:75` | Validate Sleeper membership before trusting league_id | checked (see above) |
| #474 | `src/services/tradeFind.js:216` | Apply the trade value fairness guard to generated candidates | checked (see above) |
| #259 | `src/services/tradeLineup.js:65` | Replace the exponential lineup enumeration | checked (see above) |
| #404 | `src/services/tradeLineup.js:41` | Move the bounded search off the event loop | checked (see above) |
| #495 | `src/services/weather/openMeteo.js:96` | Preserve the forecast vintage used by the live decision | checked (see above) |
| #365 | `src/services/yahoo.js:180` | Parse Yahoo's nested settings array | checked (see above) |

### P2 (125)

| PR | File | Comment | Status |
|---|---|---|---|
| #307 | `frontend/src/components/help/HelpButton.jsx:42` | Update every Yahoo help entry for the pause | not checked |
| #268 | `frontend/src/components/layout/Footer.jsx:25` | Preserve the studio/product hierarchy | not checked |
| #81 | `frontend/src/components/layout/Header.jsx:29` | Gate Waiver Wire on Yahoo readiness | not checked |
| #99 | `frontend/src/components/ui/Alert.jsx:16` | Drop the unsupported success Alert tone | not checked |
| #125 | `frontend/src/components/ui/Button.jsx:41` | Use readable text on omen primary buttons | not checked |
| #97 | `frontend/src/components/ui/Card.jsx:88` | Make Body spacing work outside header-only cards | not checked |
| #97 | `frontend/src/components/ui/Card.jsx:53` | Keep the preview chip in the header flow | not checked |
| #113 | `frontend/src/components/ui/Card.jsx:69` | Add tertiary text to the card scope | not checked |
| #128 | `frontend/src/components/ui/Chip.jsx:5` | Use a dark-mode-safe text color for Omen chips | not checked |
| #127 | `frontend/src/components/ui/Input.jsx:84` | Link built-in help text to the control | not checked |
| #136 | `frontend/src/components/ui/MetricStrip.jsx:90` | Avoid prepending a second delta sign | not checked |
| #136 | `frontend/src/components/ui/MetricStrip.jsx:84` | Render numeric zero deltas | not checked |
| #105 | `frontend/src/components/ui/MockBanner.jsx:9` | Use a readable text token for mock banners | not checked |
| #135 | `frontend/src/components/ui/PageHero.jsx:44` | Use the locked PageHero type scale | not checked |
| #129 | `frontend/src/components/ui/PlatformBadge.jsx:39` | Use light-theme-safe label tokens | not checked |
| #130 | `frontend/src/components/ui/PlatformConnectionCard.jsx:40` | Expose the labelled card as a region | not checked |
| #138 | `frontend/src/components/ui/PlayerRow.jsx:67` | Preserve zero-valued metric slots | not checked |
| #134 | `frontend/src/components/ui/SegmentedControl.jsx:69` | Respect reduced-motion for selection transitions | not checked |
| #127 | `frontend/src/components/ui/Textarea.jsx:21` | Preserve the iOS font-size guard for small textareas | not checked |
| #111 | `frontend/src/index.css:1` | Keep Alegreya loaded until font-serif callsites are removed | not checked |
| #84 | `frontend/src/lib/omenSignalLabels.js:57` | Use contrast-safe text for signal badges | not checked |
| #41 | `frontend/src/lib/themeMode.js:113` | Keep legacy accent consumers themed | not checked |
| #42 | `frontend/src/lib/themeMode.js:108` | Keep filled accent buttons contrast-safe | not checked |
| #60 | `frontend/src/lib/themeMode.js:238` | Derive secondary text from readable foreground | not checked |
| #95 | `frontend/src/lib/themeMode.js:641` | Keep team-accent consumers on the guarded accent | not checked |
| #114 | `frontend/src/lib/themeMode.js:5` | Remove stale team-theme promises | not checked |
| #114 | `frontend/src/lib/themeMode.js:7` | Preserve a way to change light/dark mode | not checked |
| #293 | `frontend/src/pages/ConnectLeague.jsx:226` | Let connected users reselect a Yahoo league | not checked |
| #121 | `frontend/src/pages/DeleteAccount.jsx:15` | Align profile-data deletion copy with backend scope | not checked |
| #66 | `frontend/src/pages/Football.jsx:159` | Fail closed when dashboard summary cannot resolve | not checked |
| #72 | `frontend/src/pages/Football.jsx:287` | Align the standings tint with the displayed league | not checked |
| #199 | `frontend/src/pages/OmenLanding.jsx:11` | Keep the dark lockup on the fixed-dark About page | not checked |
| #46 | `frontend/src/pages/Onboarding.jsx:34` | Keep team mode from coloring later onboarding steps | not checked |
| #320 | `mobile/ios/OmenIOS/OmenIOS/App/Api/CommandCenterViewModel.swift:100` | Load the Ledger independently of provider standings | not checked |
| #502 | `mobile/ios/OmenIOS/OmenIOS/App/Api/OmenApiClient.swift:189` | Keep decode diagnostics tied to their request | not checked |
| #290 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/AuthViewModel.swift:163` | Clear passkeys when the signed-in account changes | not checked |
| #290 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/AuthViewModel.swift:260` | Transition the session when listing requires reauthentication | not checked |
| #453 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/AuthViewModel.swift:223` | Validate error callbacks against the pending OAuth state | not checked |
| #453 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/AuthViewModel.swift:223` | Distinguish user denial from permanent provider rejection | not checked |
| #210 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift:68` | Place the iOS destination in its declared feature module | not checked |
| #317 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift:91` | Gate the live POST on dashboard readiness | not checked |
| #377 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift:86` | Avoid exposing the live switcher in Demo Mode | not checked |
| #406 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift:114` | Route Command's Switch through an active presenter | not checked |
| #459 | `mobile/ios/OmenIOS/OmenIOS/App/Auth/CommandCenterView.swift:389` | Dismiss Account before presenting its report composer | not checked |
| #185 | `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenCommandCenterScreen.swift:165` | Remove or wire the enabled connection buttons | not checked |
| #310 | `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenCommandCenterScreen.swift:62` | Base the connect CTA on actual connection truth | not checked |
| #377 | `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenLeagueSwitcherSheet.swift:158` | Mark only the globally active league | not checked |
| #406 | `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenTeamPicker.swift:51` | Keep Add League visible for one-team users | not checked |
| #406 | `mobile/ios/OmenIOS/OmenIOS/App/CommandCenter/OmenTeamPicker.swift:150` | Preserve failed switches long enough to show an error | not checked |
| #310 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectView.swift:186` | Preserve the request ID when the user retries | not checked |
| #310 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectView.swift:187` | Make the demo recovery action open Demo Mode | not checked |
| #448 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectView.swift:231` | Preserve multi-league selection when restoring ESPN | not checked |
| #448 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectView.swift:279` | Enter a busy state before launching direct connects | not checked |
| #494 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/ConnectView.swift:274` | Show the persistence warning after the follow request | not checked |
| #449 | `mobile/ios/OmenIOS/OmenIOS/App/Connect/EspnWebSignIn.swift:95` | Verify that the replacement endpoint presents authentication | not checked |
| #210 | `mobile/ios/OmenIOS/OmenIOS/App/Screenshot/ScreenshotScenarios.swift:81` | Select the Omen tab for Omen screenshot scenarios | not checked |
| #179 | `mobile/ios/OmenIOS/OmenIOS/DesignSystem/DesignSystemGalleryView.swift:221` | Expose the gallery through a debug launch path | not checked |
| #187 | `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenContextStrip.swift:124` | Do not announce a tap action for display-only strips | not checked |
| #184 | `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenDecisionBrief.swift:115` | Honor the reduced-motion setting in the loading state | not checked |
| #184 | `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenDecisionBrief.swift:143` | Preserve off-season as a distinct accessibility state | not checked |
| #187 | `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenMatchupHero.swift:81` | Let the matchup hero grow with Dynamic Type | not checked |
| #422 | `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenTypography.swift:11` | Reconcile the active typography contract | not checked |
| #183 | `mobile/ios/OmenIOS/OmenIOSTests/OmenConnectionPrimitivesTests.swift:111` | Assert the production mappings in iOS tests | not checked |
| #179 | `mobile/ios/OmenIOS/OmenIOSTests/PrimitiveEnforcementTests.swift:25` | Detect SwiftUI buttons that use trailing-closure syntax | not checked |
| #424 | `mobile/ios/OmenIOS/OmenIOSUITests/CarouselLayoutUITests.swift:58` | Scroll before requiring accessibility content in the window | not checked |
| #511 | `scripts/db/concurrency-check.sh:33` | Do not swallow the second connection failure | not checked |
| #505 | `sql/2026-10-01-redo/06_projections_shadow.up.sql:95` | Include league scope in shadow-log uniqueness | not checked |
| #505 | `sql/2026-10-01-redo/06_projections_shadow.up.sql:89` | Bind shadow metadata to its projection snapshot | not checked |
| #508 | `sql/2026-10-01-redo/06_projections_shadow.up.sql:60` | Validate projection snapshots against their ingest event | not checked |
| #508 | `sql/2026-10-01-redo/06_projections_shadow.up.sql:106` | Match the shadow row's canonical player to its snapshot | not checked |
| #508 | `sql/2026-10-01-redo/09_beta_reports.up.sql:62` | Schedule the beta-report retention purge | not checked |
| #265 | `src/adapters/espn.js:288` | Require an explicit zero ownership marker | not checked |
| #265 | `src/adapters/espn.js:271` | Preserve missing projected totals as null | not checked |
| #265 | `src/adapters/espn.js:296` | Normalize ESPN's live eligibility field | not checked |
| #466 | `src/adapters/espn.js:1178` | Request mRoster for the declared fallback | not checked |
| #215 | `src/adapters/sleeper.js:441` | Fail closed when a roster row lacks its player list | not checked |
| #441 | `src/league_office_sync_worker.js:22` | Classify ESPN 403 responses as reconnect-required | not checked |
| #461 | `src/league_office_sync_worker.js:88` | Expire stale running jobs before skipping reconnects | not checked |
| #461 | `src/league_office_sync_worker.js:96` | Claim queued jobs before rebinding their owner | not checked |
| #463 | `src/league_office_sync_worker.js:267` | Upsert missing accolade rows | not checked |
| #260 | `src/omen_tuesday_cron.js:154` | Reject blank fantasy-point fields instead of scoring them as zero | not checked |
| #302 | `src/omen_tuesday_cron.js:227` | Restrict 404 deferral to the current preseason | not checked |
| #309 | `src/omen_tuesday_cron.js:241` | Include the season type in the score cache key | not checked |
| #291 | `src/routes/dashboard.js:222` | Keep waiver readiness aligned with its callable route | not checked |
| #371 | `src/routes/leagues.js:282` | Verify the submitted ESPN team before persisting it | not checked |
| #470 | `src/routes/omen.js:609` | Preserve nested signal confidence during v3 presentation | not checked |
| #470 | `src/routes/omen.js:611` | Report football-intelligence timeouts as unavailable | not checked |
| #190 | `src/routes/platforms.js:473` | Clear replay locks on terminal validation returns | not checked |
| #191 | `src/routes/platforms.js:52` | Bind replay records to the connection payload | not checked |
| #56 | `src/routes/sleeper.js:133` | Check draft access before fetching picks | not checked |
| #473 | `src/routes/trade.js:543` | Keep the capability disabled until native clients can use it | not checked |
| #473 | `src/routes/trade.js:862` | Require every participant to send and receive an asset | not checked |
| #473 | `src/routes/trade.js:815` | Validate scoring_format on the legs branch | not checked |
| #474 | `src/routes/trade.js:674` | Cap Yahoo roster reads before starting provider fan-out | not checked |
| #117 | `src/routes/userPrivacy.js:70` | Keep exporting subscription rows until the table is gone | not checked |
| #269 | `src/routes/waitlist.js:65` | Verify address ownership before removing waitlist entries | not checked |
| #295 | `src/routes/yahoo.js:170` | Capture handled Yahoo failures in Sentry | not checked |
| #77 | `src/server.js:95` | Normalize the API prefix before skipping the limiter | not checked |
| #440 | `src/services/decisionBriefV2.js:43` | Preserve verified facts in evidence kinds | not checked |
| #370 | `src/services/footballData/scoringAcceptance.js:95` | Include field-goal distance buckets in anonymous-row checks | not checked |
| #467 | `src/services/footballIntelligence/featureWindows.js:8` | Attribute no-huddle observations to FTN charting | not checked |
| #467 | `src/services/footballIntelligence/validateArtifact.js:195` | Validate signal evidence values against linked DNA | not checked |
| #397 | `src/services/leagueFollows.js:118` | Count only followed leagues when ordering providers | not checked |
| #397 | `src/services/leagueFollows.js:83` | Replace follows atomically | not checked |
| #71 | `src/services/llm.js:271` | Handle initials before counting sentences | not checked |
| #78 | `src/services/nflSchedule.js:56` | Use schedule-aware season boundaries | not checked |
| #266 | `src/services/omen.js:849` | Evaluate every unavailable starter | not checked |
| #513 | `src/services/responseCache.js:183` | Use a single timeout budget for cache access | not checked |
| #379 | `src/services/scoringRuleSnapshot.js:136` | Fail closed when merged field-goal bands are incomplete | not checked |
| #379 | `src/services/scoringRuleSnapshot.js:85` | Update the coverage generator for the new field-goal keys | not checked |
| #374 | `src/services/scoringSnapshotResolver.js:148` | Separate two-point conversion event keys before marking supported | not checked |
| #474 | `src/services/tradeFind.js:106` | Treat zero positional depth as a real hole | not checked |
| #364 | `src/services/tradeLeagueContext.js:168` | Count an absent position as zero roster depth | not checked |
| #259 | `src/services/tradeLineup.js:110` | Clear the prior roster location on incoming players | not checked |
| #405 | `src/services/tradeLineup.js:208` | Preserve tied starter candidates before trade pruning | not checked |
| #49 | `src/services/tradeValue.js:30` | Preserve replacement defaults for null baselines | not checked |
| #495 | `src/services/weather/openMeteo.js:170` | Align precipitation totals with their hourly intervals | not checked |
| #353 | `src/services/yahoo.js:91` | Capture Yahoo failures outside non-OK responses | not checked |
| #496 | `test/contracts/schemas/omen-decision-brief.v3.schema.json:162` | Model the live recommendation type values | not checked |
| #496 | `test/contracts/schemas/omen-decision-brief.v3.schema.json:18` | Admit the live context-unavailable state | not checked |
| #496 | `test/contracts/schemas/omen-decision-brief.v3.schema.json:171` | Allow the intentional null expected-value delta | not checked |
| #496 | `test/contracts/schemas/omen-decision-brief.v3.schema.json:126` | Preserve nullable live player metadata | not checked |
| #496 | `test/contracts/schemas/omen-decision-brief.v3.schema.json:105` | Require recovery for every actionable state | not checked |
| #248 | `test/espnConnectGuideRegression.test.js:41` | Allowlist every value entering share payloads | not checked |
| #472 | `test/leaguesDirectoryRoute.test.js:506` | Replace the wall-clock concurrency assertion | not checked |

