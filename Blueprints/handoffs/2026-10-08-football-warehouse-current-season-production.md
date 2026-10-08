# Football warehouse current-season production proof — 2026-10-08

## Outcome

The private PostgreSQL football warehouse on `omen-prod` is live and contains a real, provenance-bound 2026 nflverse load. Supabase remains the application authority: no API mode, cron, Supabase schema, or client path changed in this batch.

Selected release:

- commit: `383b0dffeea90983835e4e7ab310fa4b907e3ce8`
- worker: `ghcr.io/justinduverge-design/omen-warehouse-ingest@sha256:abe883a6ecc653539de562b33f8093312b0add951948659305b2e1131c6fda64`
- release manifest: `a54d278cc15a73de6ecb213881394c67bc5b72078f2fca075f708828be176b7c`
- release bundle: `0ef101e31af1de4eb4f912f344d5430a837379349acb324537f3484bbf69cc1c`
- GitHub build: `https://github.com/justinduverge-design/omen/actions/runs/37838193638`

## Credential boundary correction

Local Compose file-backed secrets preserve host file metadata; their YAML `uid`, `gid`, and `mode` fields do not transform a bind-mounted source. The runtime URL files therefore use the actual enforced host state:

- secret directory: `root:root 0700`
- ingest URL: `root:10001 0440`
- reader URL: `root:10001 0440`
- backup pgpass: `root:root 0600`

Provisioning reconciled only the exact legacy `root:root 0600` URL-file state. It did not print or rotate a credential. A worker container running as `10001:10001` reported the mounted ingest file as `0440 0:10001` and readable without opening or printing it.

## Production evidence

The exact release verifier and the read-only production verifier passed before ingestion. Source validation completed before the database writer began:

| Fact | Validated | Written |
| --- | ---: | ---: |
| teams | 32 | 32 |
| games | 272 | 272 |
| players | 24,844 | 24,844 |
| player weeks | 4,445 | 4,445 |
| team weeks | 128 | 128 |
| weekly rosters | 12,809 | 12,809 |
| plays | 11,155 | 11,155 |

Four of 4,449 player-week source rows and 236 of 13,045 roster source rows were unmatched, skipped, and counted. No player was guessed. Play-by-play had zero unmatched rows.

Post-ingest read-only checks proved:

- seven receipts, all `succeeded`; zero `started` or `failed` receipts;
- every receipt has `rights_basis = 'nflverse_open_data'`, an HTTPS source URL, a `sha256:` source reference, nonzero source bytes and rows, and a finish time;
- all player-week, team-week, roster, and play rows reference succeeded receipts; orphan count is zero for every table;
- `VERIFIED production football warehouse read-only`;
- warehouse container `running|healthy`, restart policy `unless-stopped`;
- zero host listeners on PostgreSQL port 5432;
- zero leftover one-shot ingest containers.

Known-row proof: nflverse `stats_player_week_2026.csv` hashed to `sha256:7c95b7db99eac0091c6646264ca4a6f4da080a0569935d2e61cbe15a1f4dfa40`, equal to the stored receipt. Josh Allen (`00-0034857`), 2026 Week 1, matched source and warehouse at 334 passing yards, 23 rushing yards, 0 receiving yards, and 35.66 PPR points.

## Verification performed

- focused warehouse infrastructure and shadow tests: 11/11 passed;
- disposable PostgreSQL 17.11 access-policy and production-read-only verifier: passed;
- full repository suite: 2,047/2,047 passed;
- `git diff --check`: passed before checkpoint;
- immutable exact-commit worker workflow: passed.

## Remaining promotion gates

This is real shadow infrastructure, not application shadow reads yet. Keep PR #577 open and do not retire Supabase Step 14.

1. Mount the reader credential in a newly built API image and prove bounded Supabase-versus-warehouse shadow comparisons on real request shapes.
2. Commission encrypted KVM2 backup, measure the first compressed backup, perform an isolated PostgreSQL 17 restore, then set retention from measured KVM2 capacity.
3. Wire and prove Kuma, Beszel, GlitchTip, Steward, and Sentinel warehouse signals and recovery transitions.
4. Promote `supabase` to `shadow`; promote to `warehouse` only after the comparison, recovery, and monitoring proofs pass. Supabase remains rollback.
5. Begin the chronological 1999–2026 backfill at 1999 only after current-season recovery proof; 2026 is already loaded.
6. Rehearse and separately approve Step 14 retirement after warehouse-primary operation is proven.

No protected decision-engine file was changed. PR #577 remains unmerged.
