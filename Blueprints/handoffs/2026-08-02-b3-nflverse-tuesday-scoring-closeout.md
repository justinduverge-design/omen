# B3 — nflverse Tuesday scoring closeout

## Objective

Replace the paid Sportradar scoring read with public nflverse player stats and add a no-write scoring verification path.

## Shipped

- `fetchNFLScores()` reads public `player_stats_<season>.csv` files from nflverse.
- Each pending move uses its stored season and week, rather than a shared current-week assumption.
- `OMEN_CRON_DRY_RUN=true` skips all Supabase updates; the production verification also disabled Redis so it made no cache writes.
- The production `moves` query now asks only for fields Tuesday scoring consumes and falls back to PPR when the legacy scoring field is absent.

## Evidence

- PRs #260, #261, and #262 merged to `main`.
- KVM1 release run 30754635716 passed after a deploy-job retry; quality, image build, restart, health, asset, and public-route checks passed.
- Focused cron tests: 10/10. Full backend suite: 494/494. Moderate audit: 0 vulnerabilities. Diff check: clean.
- A process-only production dry run completed with `archived=0`, `scored=0`, and `failed=1`. It made no Supabase or Redis writes.

## Limitation and successor

nflverse has not published `player_stats_2026.csv` yet, so the one pending 2026 move is currently unscoreable. This is an expected pre-season source state, not a reason to create synthetic data or fork nflverse. Issue #263 owns explicit deferred/no-failure handling. `OMEN_CRON_SCORING_ENABLED` remains `false`; persistent enablement is a separate founder decision after that issue is resolved and an in-season dry run is clean.

## Procedure receipt

Used `slops-data-ingest-plan`, `slops-sports-math-intelligence`, `slops-tdd`, `supabase`, `github`, `slops-git-flow`, and `slops-context-markdown`. Native/UI/auth/SQL/provider-credential skills were not applicable. No correction is needed to the write guards; pre-season unavailable-source handling is the concrete improvement tracked in #263.
