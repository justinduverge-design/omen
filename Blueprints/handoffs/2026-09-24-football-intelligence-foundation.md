# Football intelligence foundation — Tuesday handoff

**Date:** 2026-09-24
**Status:** Non-production foundation complete on `codex/football-data-research`; founder merge remains separate.
**Authority:** `ATA-20260924-FDSI` (package, SQL, production-host, deployment, secret, provider-account,
destructive, and main-merge actions remain separately gated).

## Delivered

- `Blueprints/specs/football-data/omen-football-intelligence-foundation-v1.md` — modular architecture,
  contracts, compute placement, reuse rules, feature boundary, tests, Tuesday slices, exclusions.
- `Direction/reviews/2026-09-24-football-intelligence-reuse-and-method-research.md` — GitHub reuse audit,
  nflverse methodology, licensing, academic grounding, and Ben Johnson proof design.
- `Direction/reviews/2026-09-24-football-intelligence-backend-seams.md` — existing Omen seams, no-rebuild
  posture, single-writer warning, read-model boundary.
- `src/services/footballIntelligence/` — canonicalization, observed-fact windows, Scheme DNA, System Signal,
  Coaching Tree, read model, Ben Johnson proof, and independent artifact validation.
- `scripts/build-football-intelligence-fixture.js` plus the bounded 4,217-row fixture and manifest under
  `test/fixtures/football-intelligence/`.

## Resolved output

The Ben Johnson proof uses regular-season DET 2024 (1,394 rows), CHI 2024 (1,401), and CHI 2025 (1,422).
It excludes rows with no valid quarterback location (`qb_location=0`) as non-offense/special teams, leaving
1,123, 1,119, and 1,140 eligible plays respectively. Chicago's similarity to Detroit 2024 is 0.886461 in
the pre-arrival 2024 comparison and 0.961871 in 2025; this is an association signal, not coach causation.
The read model contains two confirmed employment edges from the Chicago Bears biography and one separately
typed inferred influence edge. It independently validates successfully.

## Verification

- Football-intelligence focused suite: **20/20 passed**.
- `git diff --check`: passed.
- `node scripts/check-kickoff-drift.js`: passed (13 entries).
- `node ../../Blueprints/tools/valor-brain/validate.mjs`: passed (3/3).
- `node scripts/check-sprint-staleness.js`: 13 pre-existing direction-record findings; no claim of a clean
  sprint record.
- `node ../../Blueprints/tools/truth-gate/truth-gate.mjs --quiet`: **FAIL, standing baseline 225 P0 / 105 P1**
  broken-path/dead-header findings across the repository; none were introduced or mass-fixed by this slice.
- Full `npm test`: **not a valid clean gate in this checkout**; it fails during collection because required
  existing dependencies are absent (`express`, `@supabase/supabase-js`, `@sentry/node`, `@upstash/redis`, and
  related modules). No dependency installation was authorized.

## Explicitly not done

No package changes or installs, Supabase SQL/schema, production data or hosts, timers/services, credentials,
provider accounts, deployment, merge, or public redistribution/licensing decision. The next authorized step is
founder review/merge approval, followed by a separately approved package/schema/production implementation plan.

## Promotion addendum — 2026-09-25

The founder-approved conditional promotion completed. PR [#467](https://github.com/justinduverge-design/omen/pull/467)
merged to `main` as `ee44a97ad2b1080d8d904779bdd3db3b2a29a9fe`. GitHub Actions run
[36092456274](https://github.com/justinduverge-design/omen/actions/runs/36092456274) passed quality, image build,
and Hostinger KVM1 deployment. Live verification at 2026-09-25 00:00 ET:

- `/api/health` returned HTTP 200 and `status: ok`.
- `/api/ready` returned HTTP 200 and `status: ready`; Supabase was reachable and critical configuration was present.
- `/api/version` returned HTTP 200 with `git_sha: ee44a97ad2b1080d8d904779bdd3db3b2a29a9fe`,
  `build_id: 36092456274`, and image tag `sha-ee44a97ad2b1080d8d904779bdd3db3b2a29a9fe`.

The original verification notes above remain historically accurate for the pre-merge branch state; this addendum is
the authoritative promotion record. The standing repository truth-gate baseline and local dependency limitation remain
unchanged and are not represented as newly clean by this deployment.
