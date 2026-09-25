# Football intelligence — reuse and methodology research

**Date:** 2026-09-24
**Status:** Primary-source research for `FDSI-TUESDAY`; no package, schema, deployment, or
production change
**Authority:** `ATA-20260924-FDSI`

## Decision summary

Omen should borrow mature parsing and standards-validation infrastructure while owning football
identity, provenance, feature meaning, confidence, promotion, Scheme DNA, System Signal, Coaching
Tree, and fantasy judgment.

No trustworthy public source found in this pass publishes a canonical team/coach scheme label.
Public data supplies observations and charted categories. Scheme DNA remains a derived, versioned
fingerprint. Named scheme taxonomies require separate film/human validation.

## 1. External reuse audit

Current GitHub metadata, primary READMEs, licences, runtime requirements, and maintenance activity
were checked on 2026-09-24. Stars are adoption signals, never proof of correctness.

| Capability | Candidate | Verdict | Reason |
|---|---|---|---|
| HTTP | Node `fetch`/`AbortSignal` plus existing Axios | **Adopt existing** | One Omen wrapper can own cancellation, total budgets, safe idempotent retries, `Retry-After`, provider caps, redaction, and metrics with no new runtime. |
| Retry | [`p-retry`](https://github.com/sindresorhus/p-retry) | **Defer** | Active/MIT, but current releases require Node 22 and ESM while Omen is CommonJS and declares no engine. Do not pin an old major for Tuesday. |
| Concurrency | [`p-queue`](https://github.com/sindresorhus/p-queue), [`Bottleneck`](https://github.com/SGrondin/bottleneck) | **Skip Tuesday** | ESM/server durability mismatch or insufficient durable-job semantics. A thin bounded primitive is enough until real queue requirements exist. |
| CSV | [`csv-parse`](https://github.com/adaltas/node-csv) | **Adopt after package gate** | Mature, active, MIT, streaming, CommonJS/ESM. Omen retains strict column, row-width, size, schema-fingerprint, and malformed-input acceptance. |
| Parquet | [`hyparquet`](https://github.com/hyparam/hyparquet) | **Adapt after fixture benchmark** | Active, MIT, pure JavaScript and local-first. Prove nflverse codecs, memory, deterministic output, and CommonJS integration first. |
| Analytical SQL | [`@duckdb/node-api`](https://github.com/duckdb/duckdb-node-neo) | **Defer/benchmark** | Strong official offline option; native runtime weight does not belong in the API process or Tuesday kernel. |
| Artifact schema | [`Ajv`](https://github.com/ajv-validator/ajv) | **Adopt after package gate** | Active, MIT, portable JSON Schema/JTD and explicit security guidance. Use trusted static schemas, strict mode, compile once, and bound sizes. |
| DTO schema | [`Zod`](https://github.com/colinhacks/zod) | **Skip primary use** | It creates a parallel schema source in the present plain-JavaScript backend. Reconsider with TypeScript. |
| Local cache | [`lru-cache`](https://github.com/isaacs/node-lru-cache) | **Adapt when needed** | Mature bounded memoization; never durability or a correctness boundary. BlueOak licence/notice requires review. |
| Cache abstraction | [`Keyv`](https://github.com/jaredwray/keyv) | **Skip now** | Omen already has Upstash Redis and local Maps; another layer has not earned its cost. |
| Durable jobs | [`pg-boss`](https://github.com/timgit/pg-boss) | **Adapt later** | Strong Postgres queue, but current releases require Node 22.12+, migrations, and direct DB operations. Supabase/pooler/RLS topology needs design first. |
| Graph | [`Graphology`](https://github.com/graphology/graphology) | **Adapt only when required** | Active/MIT; v1 needs deterministic relational edge projection, not a graph database or dependency. |
| Data-frame transforms | [`Arquero`](https://github.com/uwdata/arquero) | **Skip Tuesday** | ESM/in-memory cost is unnecessary for bounded reducers and maintenance is less current. |

No package is required for the pure proof. If separately approved later, the first candidates are
`csv-parse` and Ajv. `hyparquet` is considered only after a real fixture benchmark.

## 2. Source and methodology findings

- The [participation dictionary](https://nflreadr.nflverse.com/articles/dictionary_participation.html)
  documents formation/personnel, defenders in box, pass rushers, players on field, and other
  tactical fields.
- Participation covers 2016 onward. Pre-2023 data is NFL Next Gen Stats via nflverse; 2023 onward
  is FTN Data via nflverse under CC-BY-SA 4.0 and is published after postseason:
  [`load_participation`](https://github.com/nflverse/nflreadr/blob/main/R/load_participation.R).
- FTN charting covers 2022 onward and documents quarterback location, backfield/box counts,
  no-huddle, motion, play action, screen, RPO, quarterback movement, reads, blitzers, and pass
  rushers: [FTN dictionary](https://nflreadr.nflverse.com/articles/dictionary_ftn_charting.html).
- Code and hosted data do not necessarily share a licence. Provenance and attribution belong at
  artifact level. Public redistribution of CC-BY-SA-derived outputs needs attribution and a later
  counsel review of share-alike scope.

Research also supports keeping tactical labels modeled and uncertain:

- [Dutta, Yurko, and Ventura](https://arxiv.org/abs/1906.11373) infer man/zone behavior from
  tracking through mixture and hierarchical clustering, retain soft assignments, and require
  qualitative interpretation.
- [Chu et al.](https://arxiv.org/abs/1908.02423) derive receiver routes through model-based
  trajectory clustering.

Observed charting, derived proxy, clustered pattern, named football taxonomy, and product
explanation are different layers. A plausible cluster is not automatically a named scheme.

## 3. Bounded Scheme DNA v1

Offense: quarterback-location composition, backfield-count distribution, motion, no-huddle,
play-action, RPO, screen, quarterback-out-of-pocket, and completed-season formation/personnel where
coverage permits. `read_thrown` is excluded cross-year because 2022 is structurally missing.

Defense: box-count, blitzers/pass-rushers over eligible dropbacks, observed pressure, and
completed-season personnel/man-zone/coverage composition. Blitz count is not pressure; a coverage
label is not an entire scheme.

Use regular-season plays with exact denominators, Jensen-Shannon distance for distributions,
weighted absolute distance for rates on their natural 0–1 scale, fixed versioned weights, and
minimum sample gates. The Tuesday source set does not contain quarter, score differential, kneel,
spike, or no-play fields, so it cannot honestly implement the proposed neutral-script filter;
adding play-by-play is a separately versioned follow-on. League-season standardization likewise
waits for a complete league reference population. Similarity is a model score—not probability,
scheme identity, or causation.

## 4. Historical proof

**Ben Johnson: Detroit offensive coordinator (2022–2024) to Chicago head coach (2025).** FTN's
2022+ window spans both tenures.

- Detroit announced his OC promotion on 2022-02-09:
  [Detroit Lions](https://www.detroitlions.com/news/lions-promote-ben-johnson-to-offensive-coordinator).
- Chicago names him head coach from 2025-01-21:
  [Chicago Bears](https://www.chicagobears.com/team/coaches/ben-johnson).

Compare Detroit 2024, Chicago 2024 pre-arrival, and Chicago 2025 post-arrival; optionally compare
Detroit 2025 as a retention/control branch. The proof asks whether Chicago moved toward Detroit's
earlier profile. It does not claim Johnson caused the movement. Quarterback, roster, injury,
opponent, staff, and play-calling effects remain limitations.

## 5. Graph and acceptance rules

- Confirmed Coaching Tree edges require official role/team/effective-date evidence.
- Inferred influence edges require DNA hashes, model/feature versions, coverage, sample, and
  confidence.
- Schedule coach fields support head-coach history only—not coordinator/play-caller history.
- Row order cannot change output; NA is never false or zero.
- In-season signals cannot silently depend on postseason participation releases.
- Identical inputs and versions produce byte-stable output.
- Similarity alone emits no named scheme.
- Confirmed employment and inferred influence remain separate edge types.

## 6. Explicitly outside Tuesday

Production/package/SQL/remote-host changes; complete coordinator directory; film-validated scheme
taxonomy; causal attribution; public share-alike redistribution decision; graph database; durable
distributed queue; complete historical backfill.
