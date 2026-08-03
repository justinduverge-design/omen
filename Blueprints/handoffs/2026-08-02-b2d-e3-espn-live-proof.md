# B2-D-E3 — ESPN Drafted-League Roster-Subtraction Proof

**Status:** verified with founder-authorized real-provider evidence; docs branch is local and stacked on E2; not pushed, merged, or deployed.
**Branch:** `codex/b2d-e3-espn-live-proof`, based on `codex/b2d-e2-espn-canonical`.

## Outcome

The newly connected league is drafted: all 10 teams had rosters and 160 distinct players were held. ESPN returned HTTP 200 for both the roster and filtered-pool reads. Across the 500 returned pool entries, 0 overlapped a roster, 0 had non-zero `onTeamId`, and 0 showed disagreement between ESPN's ownership signals. Observation 12 closes cleanly. E1's explicit `onTeamId === 0` guard remains defense in depth.

## Privacy-safe method

Chrome could not be attached safely from this session, so the protocol's equivalent read-only requests ran through the existing local server environment after aggregate Supabase evidence identified exactly one complete ESPN connection updated within 15 minutes. Vault credentials and league context remained in memory only. Output and committed evidence contain counts, booleans, status codes, and timings—no cookies, Vault references, league/team/user identifiers, player identifiers, names, or lists. The temporary probe file contained no secret values and was deleted immediately after the run.

## Evidence and boundaries

- Roster: HTTP 200 in 310 ms; 10/10 teams populated; 160 distinct rostered players.
- Pool: HTTP 200 in 195 ms; 500 entries; 0 roster overlaps; 0 non-zero `onTeamId`; 0 ownership disagreements; `percentOwned` 0.0–67.1.
- Security evidence: `Direction/reviews/2026-08-02-b2d-e3-espn-live-proof-security-privacy-evidence.md`.
- No application code, test, SQL, dependency, production row, Vault value, provider transaction, deployment, or live canonical route changed.
- E1/E2 remain local stacked commits. This proof does not turn them into merged, deployed, or production-route-verified behavior.

## Skill receipt

Used `run-slops-saloon` to assess app/browser verification options, `supabase` for aggregate readiness and the existing server-side credential path, `security-privacy-evidence` for the evidence boundary, and `slops-git-flow` for isolated closeout. `slops-tdd`, UI/mobile/design, data-ingest, and release skills are N/A because E3 changes no behavior. Browser QA was substituted by equivalent provider reads because no safe Chrome control channel was exposed.

## Reconciliation — 2026-08-02

At the time of this handoff, E1/E2 were separate local stacked work. Current `main` now contains their merged equivalents: PR #265 (`171508f`) and PR #266 (`623068a`). This proof remains aggregate-only and does not establish deployment or production-route behavior.
