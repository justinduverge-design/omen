# Build 13

## Status

**Open (since Build 12 shipped 2026-10-25).** Not uploaded. Baseline: Build 12, TestFlight 0.1.0 (12).
The work list is `Direction/current_sprint.md`; this package records what merges. The sections from
"Backlog" down are the inventory it draws from, not a scope commitment.

## Goal

Sight forecasts the stat line, not just points, scored by each league's own rules, and every decision screen
shows it honestly next to the provider's projection (founder, 2026-10-25).

## PRs in this build

Add each PR here as it merges (number, area, title).

| PR | Area | Title |
|---|---|---|
| #790 | Python | Lint: clear the ruff errors on `main` |
| #778, #791 | Dependencies | Production bumps; #778 broke `npm ci` (OpenTelemetry exporter needs `sdk-trace` 3), #791 moved `sdk-trace` to 3 |
| #792 | Config | Figma retired: design artifacts from any of our tools; config and the native read gate |
| #793 | Records | Build 12 shipped, Build 13 opened, Build 13 work list, 1.0 done checklist |
| #794 | Contracts | B13-YAHOO-FIXTURE: the fixture generator uses the server's Yahoo trade copy, so `contracts:check` passes |
| #795 | Dependencies | `@opentelemetry/core` override 2.8 → 3.0 to match `sdk-trace` 3 (#791 broke 3 tracing tests); the witness keeps `timezone.utc` so it runs on python 3.9 (#790's ruff rewrite needed 3.11) |
| #796 | Provider evidence | B13-EVIDENCE-DATES: reconciled stale provider evidence dates and five capability classes, with a matrix generator and test, so Build 13 reflects current evidence |
| #797 | Release | B13-ESPN-NEW-ACCOUNT: fresh ESPN login proof checklist (account, connect, ingestion, sanitized evidence, legacy row) |
| #798 | Environments | Item 1b: cloud setup tells a cancel from a failure and moves to Node 24; the build-package guard accepts the branch name until `merge-pr.sh` fills in the number; dispatched cloud runs don't stop to ask; keystores gitignored; launch recipes in `Blueprints/handoffs/2026-10-27-environments-closeout.md` |
| #806 | Scripts | STANDARDS card B: seven hand-written `parseArgs` in `scripts/` go through `node:util` `parseArgs` (`scripts/lib/cli-args.js`); `test/scriptCliArgs.test.js` pins the behaviour |
| #805 | Scripts | STANDARDS card E: all 21 runnable ops/ shell scripts and merge-pr.sh answer --help before anything runs (omen-football-restore --help used to start a restore); merge-pr.sh refusals go to stderr and usage errors exit 2 |
| #804 | Close-out | STANDARDS card D: closeout runs Valor-Core's ops/valor-brain validator (VALOR_CORE, else found by walking up; NOT RUN otherwise); truth-gate and the Slops-OS lookup are retired, and the kickoff and prompts point at npm run closeout |
| #803 | Backups | STANDARDS card C: all three steward backup checks write DOWN check_crashed when they crash instead of leaving the last state (possibly HEALTHY) on disk; the link watchdog says why it has no set -e |
| #801 | CI | STANDARDS card J: the PR backend tests run when scripts, ops, infra, sql, hooks, mobile or docs that tests read change, and a test keeps the trigger list complete |
| #800 | CI | STANDARDS card A: ShellCheck lints every tracked shell script found by its #! line, adding 24 extensionless scripts (the ops/ backup, restore and run jobs among them); three warnings get directives so deployed scripts keep their behavior |
| #799 | Guards | STANDARDS card G: the Bash guard hook fails closed when it can't read the command, and blocks merges through the REST merge endpoint (gh api, curl) and the GraphQL mutation, with a test |

1.0 yardstick: `Direction/omen-1.0-done.md`.

## Carried from Build 12

From `build-12.md` (Known issues / next); each is detailed in the backlog below or in that file.

- Fresh ESPN-account proof and the legacy row with no `espn_team_id`.
- Provider capability reconciliation (used / unused / superseded / restricted / unproven).
- Support/report delivery end to end, and the "I made the move / Not this week" write route.
- Review P2s from #770: the Desk's Ledger line vanishes silently when the Ledger can't load; the Desk has no
  "Report a problem" entry of its own.
- Not drawn because the server doesn't send it (foundation spec § 9): League roster rank, Ledger points per
  call and "confidence then", Notifications settings, Export your data, standings ties, the swing matchup
  and win probability.
- Performance and model depth: parallelise cold reads, Yahoo player-index coverage, Sunday injury freshness,
  K stays low-confidence, Sight v3.
- Narration model: production stays on `gemma3:4b`; `qwen3:1.7b` and small-model workers are evaluated only.
- Ops outside the binary: Cloudflare 522 experiment, off-host backup expiry (`Direction/known_issues.md`).
- Python lint on `main` (#790) and the stale `empty_hold_noproj` Yahoo fixture that fails `contracts:check`
  in the cloud.

## Backlog (inventory)

### Forecast liability (founder, 2026-10-25)

**Sight forecasts points only.** Today Sight predicts one number per player, next week's PPR points, plus a
0-100 grade. Omen's whole point is to forecast fantasy football, so Build 13 makes Sight forecast the stat
line, for each of the coming weeks:

- targets, catches and receiving yards; carries and rushing yards; passing yards; TDs of each kind (QB, RB,
  WR, TE first; K and DEF after);
- scored with each league's own rules, which also replaces Yahoo's approximate scoring and covers custom ESPN
  scoring;
- built alongside the current Sight and switched over once (`SIGHT_VERSION`), and allowed to lead only where its
  measured error beats the provider's (the forecast-authority block already carries the scorecard);
- shown on the decision screens as a small table: season so far, Omen expects, and the league's own projection,
  for the two players in each move (trade: get/send; start/sit; waivers: add/drop).
- **win probability on the Desk cards**, from Omen's own stat-line forecast rather than the provider's points
  (founder, 2026-10-25). Build 12's bar shows the share of projected points, labelled as such.



#### ESPN first-time path

- Prove the current iPhone connection screen with a genuinely new ESPN account. Confirm the consent copy,
  browser handoff, return path, recovery states and last-resort League ID path are understandable.
- Prove ingestion after that connection: every visible league, the user's team id, memberships, active-league
  selection, roster, matchup, scoring/settings, standings, waiver pool, transactions and recommendation
  inputs. A successful connection is not enough by itself.
- Reconnect, repair or retire the one legacy row with no `espn_team_id`. Do not generalize that old row into a
  fresh-login failure unless the new-account proof reproduces it.
- Keep ESPN's cookie-backed and unofficial-provider risk visible. Never treat “working” as provider approval.

#### Provider capability reconciliation

The machine-readable authority is
`Blueprints/specs/football-data/provider-capability-matrix.json`; its generated view is
`provider-capability-matrix.md`. Build 13 starts by updating its evidence dates and production-switch truth,
then classifies every field or endpoint into exactly one list:

1. **Used now:** read by Omen and consumed by a named feature or receipt.
2. **Available but unused:** offered by the provider but not consumed by Omen.
3. **Superseded:** technically available, but intentionally not used because the warehouse or another
   canonical source is more complete, stable or rights-safe.
4. **Unavailable or restricted:** cannot be used honestly; preserve the reason and degraded state.
5. **Unproven:** code or documentation suggests support, but a sanitized real-account read has not proved the
   live shape.

The current matrix already tracks league settings, scoring rules, user and league rosters, roster positions,
matchups, standings, waiver pools and systems, transactions, projections, injuries, draft data, playoff
settings and trade deadlines across Sleeper, ESPN and Yahoo. Build 13 must map each used capability to Desk,
Omen, Start/Sit, Waivers, Trade, League or Ledger rather than merely saying an adapter reads it.

#### Known unused or unresolved candidates

Validate this list against current source before implementation:

- ESPN `eligibleSlots`: high-value positional eligibility and the real league slot list.
- ESPN `keeperValue` / `draftAuctionValue`: useful only for keeper or auction leagues.
- ESPN league draft data and trade deadline: currently not read or deliberately omitted.
- Sleeper depth-chart order/position: compare with the warehouse's depth source before choosing an authority.
- Sleeper traded-pick ownership and playoff brackets.
- Yahoo bye weeks: likely superseded by Omen's NFL schedule unless provider-specific differences matter.
- Yahoo recent-player-note flag: news rights and the value of a flag without content remain unresolved.
- Yahoo and ESPN transaction shapes, waiver details and ownership percentages: re-audit because production
  switches and source changed during Build 12; do not preserve stale “off” or “not read” claims.
- Provider-side schedules, byes, depth and injury fields that duplicate warehouse facts: explicitly mark keep,
  fallback, cross-check or retire. Do not silently collect duplicate truth.

### Small-model work

- Keep production on the currently proven model until a separate activation decision.
- Evaluate `qwen3:1.7b`, already proven through Omen's native Ollama chat path with thinking disabled, on
  narration quality, latency, memory and failure behavior using held-out Omen prompts.
- Test small models as background workers rather than customer-facing authorities: data classification,
  anomaly/trend surfacing, provider-shape triage, support-email routing and “this happened before” statistical
  notes. They may surface evidence; they do not select a fantasy move or invent provider truth.
- Define a shadow receipt for every experiment: input class, output, latency, resource use, agreement with the
  deterministic system, failure reason and whether a human acted on it.

### Other carried work

- Make the in-app report/support path deliver a real, privacy-safe support item and prove the owner can receive
  and close it. Build 12 only moved and clarified the control; delivery remains deferred.
- Add the move follow-through write route for “I made the move” / “Not this week”.
- Preserve separate states for idea, source-built, test-passed, deployed and phone-proven.

### Device-walk product follow-ups from Build 12

- Re-audit every primary destination by information type, not by shared container count. Keep semantic
  continuity, but choose cards, tables, dividers, pills, lists and plain sections according to the content.
- Build Trade needs a server contract for the user's own roster and an explicit side selector; the current
  roster response names opponents only, so the client cannot honestly offer the user's team yet.
- Improve Find a Trade realism and acceptance likelihood. Review position/value asymmetry such as a kicker
  for a quarterback, and define the product policy for useful candidates when no mutually beneficial swap
  clears the current fairness guard. Do not quietly weaken fairness to manufacture a result.
- Explain football terms such as EPA in plain language or behind contextual help.
- Evaluate user-controlled team/account marks as a later identity feature; do not turn provider or status
  colors into decorative team theming.
