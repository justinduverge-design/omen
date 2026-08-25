# A7B Phase 2 — code, security, and data-quality review

**Date:** 2026-08-25

**Scope:** local nflverse `stats_team`/`schedules` collection, canonical normalization, versioned offensive/kicker/DST facts, hard acceptance gates, exact local artifacts, and independent validation

**Verdict:** APPROVE for the bounded non-production Phase 2 slice — no P0 or P1 findings

## Review summary

The implementation extends the Phase 1 local vault only to the two additional source families already admitted by A7, then builds deterministic acceptance evidence from three exact manifests. It does not mount a route, configure a timer, use a credential, connect a database, authorize publication, deploy, or touch production scoring.

## Security, correctness, and performance

| Dimension | Result | Evidence |
|---|---|---|
| Source and rights boundary | PASS | Dataset selection resolves only to fixed nflverse release URLs for `stats_player`, `stats_team`, and `schedules`; arbitrary URLs remain impossible. Every exact manifest revalidates the CC BY 4.0 record, 2026-08-24 review date, release identity, HTTP evidence, source columns, schema fingerprint, byte length, and raw hash. |
| Filesystem containment | PASS | Vault and acceptance output refuse `/var/lib/omen-football-data`; inputs must resolve inside the explicit vault root; `latest` in any manifest path segment is refused; raw/manifests/artifacts use exclusive creation. Acceptance output resolves the selected root before creating a fresh direct child. |
| Resource use | PASS for local Phase 2 | Each fetched input remains capped at 64 MiB. The 2025 player/team/schedule inputs and the 6.9 MB four-week artifact process in memory and complete in under one second on the local machine. This is not approved as a request-path or scheduled production workload. |
| CSV and schema integrity | PASS | The built-in parser handles quoted commas, escaped quotes, CRLF, and embedded quoted newlines; empty/duplicate headers, missing scoring columns, unterminated quoting, and row-width drift fail closed. |
| Identity integrity | PASS | Games use season plus `game_id`; typed alternate game IDs cannot map to multiple canonical games. GSIS IDs are required for scoreable player rows. Names remain source aliases. Team aliases resolve through a fixed reviewed franchise map and carry week/date validity. Unknown teams and unresolved supplied targets fail closed. |
| Cardinality and duplication | PASS | Player-game, team-game, and derived identities are unique. Every completed game has exactly two reciprocal team facts. Evidenced player bands are enforced at 1–200/game and 1–100/team-game; the real replay observed 58–75/game and 26–38/team-game. |
| Offensive calculation | PASS | `omen-fantasy-v1` matches nflfastR's published component formula. Standard/Half/PPR identities are checked within `1e-8`; every Standard/PPR row matches the separately published nflverse reference. Independent validator recomputation found zero mismatches; maximum delta was `7.105427357601002e-15`. |
| Kicker completeness | PASS | Attempt/outcome and made-distance buckets must reconcile per player and team. Player facts aggregate exactly to the separately published team-game kicking totals. The four-week replay had zero team-reference mismatches. |
| DST completeness | PASS | Every team-game derives sacks, takeaways, touchdowns, safeties, blocks, and schedule-resolved final opponent score under the explicit `omen-dst-v1` table. Independent recomputation covers every result. |
| Fail-closed behavior | PASS | Anonymous source rows are excluded only when every scoring value and both publisher totals are zero; otherwise they fail. Invalid identity, incomplete schedule/team coverage, impossible/noninteger counters, source/reference drift, duplicate facts/results, or invalid manifest hashes produce no acceptance artifact. |
| Publication boundary | PASS | Artifacts and receipts state `publication.authorized: false` and `promoted: false`; the read-only validator rejects a contrary artifact. No consumer or automatic continuation exists. |
| Secrets and privacy | PASS | Inputs are public licensed football statistics. The CLI accepts no auth value, provider credential, user identifier, league data, or recommendation payload by default, and logs only local paths, hashes, counts, and status. |

## Findings resolved during review

1. **Anonymous nflverse penalty rows:** the live input contains one blank-player row in each selected week carrying only team penalties and zero scoring values. The first implementation rejected them as malformed identities. The final contract excludes only that provably non-scoreable shape and regression-tests that any anonymous nonzero scoring value still fails.
2. **Validity and key precision:** team abbreviation aliases initially recorded only weeks, and derived-key uniqueness was implicit in player/team fact uniqueness. The final output records source game-date validity and separately rejects duplicate architecture-level derived keys.
3. **Cardinality evidence:** the first pass recorded row counts without a hard band. The final gate enforces 1–200 player rows per completed game and 1–100 per team-game, recording observed minima/maxima.
4. **Format completeness:** kicker/DST initially emitted only `standard`. They now emit equal Standard/Half/PPR fields explicitly, because reception scoring does not apply to those subject classes; the independent validator checks all three.
5. **Exact-path refusal:** `latest` was initially rejected only in a manifest basename. It is now rejected in every path segment.

## Data-validation assessment

- **Grain:** one schedule row per completed game, one team fact per team-game, one player fact per player-game, one derived result per architecture key.
- **Join coverage:** 61/61 completed games have player coverage and reciprocal team coverage; 1,658 canonical GSIS players and all 32 franchise-season teams resolve.
- **Completeness:** 4,140 offensive, 122 kicker, and 122 DST facts across Weeks 1, 7, 14, and 17. Four non-scoreable team-penalty rows are explicitly counted as exclusions.
- **Independent checks:** publisher Standard/PPR references for every player row; team aggregates for every kicker team-game; separate read-only recomputation for all offensive, kicker, and DST results; exact artifact-to-receipt hash binding.
- **Confidence:** high for deterministic replay of the reviewed v1 contracts; moderate for source independence because the publisher reference and facts share nflverse lineage.

## Residual limitations and later gates

- `omen-kicker-v1` and `omen-dst-v1` are honest Omen baselines, not provider/league-exact rules. Full league scoring remains the separate versioned scoring-contract work.
- DST points allowed deliberately uses final opponent score from the schedule. It does not yet subtract opponent defensive/return scores the way some providers do.
- The fixed franchise alias table needs review if a franchise relocates or nflverse changes abbreviations.
- The validator is independent code but consumes the same emitted facts; nflverse remains the single admitted data lineage. Total source loss fails closed.
- No PBP derivation, correction/supersession drill, schema/source-loss drill, staging runner, KVM1 recovery, Pi witness, timer, database, publication, deployment, production scoring, or ADP work is included.

No release or overall A7B verification claim is made.
