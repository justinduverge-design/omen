# Skills wave, sprint reconciliation, and the agent-docs contract — Handoff

**Date:** 2026-09-02
**Owner:** Claude (session `015AkfzQoRP1PdXaGd5skBMn`)
**Layers touched:** L0 (`Slops-OS`) and L2 (`omen`)
**Status:** All six PRs merged. No code paths changed in the product; one dependency bumped.

---

## Why this session happened

The founder asked three questions: whether the folder system is a version of some published
"LLM wiki", what skills would help finish Omen, and why the ESPN in-app connect sheet had never
been built. The third question is the one that shaped everything else.

## What shipped

| Repo | PR | What |
|---|---|---|
| Slops-OS | #18 | Skill backlog proposal (11 items) |
| Slops-OS | #19 | Correction to that proposal; `intent.md` format resolved |
| Slops-OS | #20 | Nine skills authored, registered, two re-scoped |
| omen | #391 | Sprint queue reconciled |
| omen | #394 | `qs` 6.16.0 — unblocked a red `main` |
| omen | #393 | `issue-state-conflicts` stops reading history as a claim |
| omen | #392 | Agent docs + kickoff as one contract, with a gate that runs the checkers |

## The finding that mattered most

**`main` was red and nothing said so.** The `deploy.yml` `quality` job had been failing since
`fff7d54` (a Dependabot bump at 15:51) on an `npm audit` moderate advisory in `qs` — not on tests.
That job also runs on push to `main`, so **deploys were gated for over two hours** and the only
reason it surfaced is that a documentation PR happened to add a file under `test/**`, which is one
of the paths `pr-quality.yml` watches.

Fixed in #394: `qs@6.16.0` is outside the advisory range and inside both existing caret ranges
(`express` `^6.14.0`, `body-parser` `^6.15.2`), so the change is three lines of lockfile with no
`package.json` edit and no movement in the dependency tree. Verified by reproducing the failure on
`main` first, then `npm ci` + full suite (935/0) + `npm audit` (0 vulnerabilities).

**Open question for the founder:** nothing routinely reports that `main`'s own quality gate has
gone red between merges. A scheduled or post-merge signal would have caught this in minutes rather
than by accident.

## The ESPN question, answered

The sheet was not an unthought-of idea. `Direction/reviews/2026-07-07-espn-ios-cookie-sync-research.md`
evaluated five candidates and scored **Candidate D** — log in inside an app-controlled webview,
relay the JSON, never extract the cookie — as best overall. A same-day founder spike confirmed it
and simplified it: the reads endpoint is
`lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leagues/{leagueId}`,
two headers are required (`x-fantasy-platform: espn-fantasy-web`, `x-fantasy-source: kona`), and
the browser attaches the session cookie automatically, so `HttpOnly` stops mattering.

It reached `Direction/reviews/` and stopped there. The recorded blocker was hardware — local Xcode
not viable on a 2017 Intel MacBook Air — which is a CI question. Five weeks later the 2026-08-15
memo re-argued the *extension* path with no apparent awareness of the July addendum. The work was
finally queued on 2026-08-31 as `W1-A`, **because a beta user hit the missing flow**, not because
the research was read.

That is the gap `slops-intent-capture` exists to close: research must terminate in an intent, a
recorded deferral, or a known-issues row. "Filed in `Direction/`" is not a terminal state.

## What is now true that was not

- **Nine skills exist**, registered in `SKILL_ROUTING.md` and `SLOPS_LIFECYCLE.md`, all `draft` or
  `parked` until first real use.
- **`slops-mobile-smoke` and `mobile-first-qa-playbook` are marked web-app only** in three places.
  Both predate the native pivot and were being routed to native tasks.
- **`current_sprint.md` is 1,190 lines, down from 1,642.** Thirty CLOSED items are tombstones
  pointing at the ledger; `O2` and `W1-GATE` got the ledger rows they never had.
- **`CLAUDE.md` and `kickoff-l2.md` carry one identical read order**, enforced by
  `scripts/check-kickoff-drift.js` and run by `.github/workflows/docs-quality.yml`.

## Next session should know

1. **`F7` (Yahoo) and `F8` (Sleeper) are `READY`, unblocked, and unpulled.** Phase 4's gate is
   three providers passing real-account QA, not ESPN alone. NFL Week 1 is ~2026-09-10.
2. **A macOS build host is an open founder decision.** It blocks `slops-native-sim-drive` and the
   native ESPN path both.
3. **Thirteen items sit in `VERIFIED` / `READY_FOR_REVIEW`** needing a closure judgement. Listed in
   `current_sprint.md` § "Reconciliation standing items".
4. **`postcss-selector-parser` (low, dev-only, frontend)** fails the advisory
   `frontend-development-audit`. Needs a major bump to `7.x`; not urgent, not trivial.

## Method corrections worth keeping

Two claims were made this session from partial evidence and were wrong:

- **"The ESPN work appears nowhere in the sprint."** False. The grep searched `Candidate D`,
  `WKWebView`, and `relay`; the sprint says "native web auth sheet". **A search that proves a
  negative is only as good as its search terms.** Now a rule inside `slops-intent-capture`.
- **"The 115 local test failures are environmental."** False. Stale `node_modules`. After
  `npm ci` the suite is 935/0, and 935 + the 6 tests added in #393 is exactly the 941 CI reported.

Both share a shape: tool output was read, a conclusion was drawn, and the source was not checked.
`agent_inbox.md` line 32 already documented the first one as a known false positive. The rule
belongs in the skills, and is written into `slops-intent-capture` and `scripts/checks/README.md`.

## Evidence

- omen `main`: `c620ed4`, `93e3a85`, `c177df0`, `17806cf`
- Slops-OS `master`: PRs #18, #19, #20
- Full backend suite 941/941 on #393's merged head; `npm audit` 0 vulnerabilities
- `check-kickoff-drift.js` passes and **fails correctly on injected drift** (verified, not assumed)
- `check-valor-brain.mjs` 2/2 valid; `check-sprint-staleness.js` no findings
