# Football-intelligence module map

Start here before adding a football-intelligence source, artifact, model, or repository.
This slice is deliberately independent from the A7B scoring pipeline under
`src/services/footballData/`.

## Data path

```text
sourceRegistry
  -> artifactRegistry
  -> ordinaryPbp (verified receipt replay -> injected TabularReader -> observed facts)
  -> canonicalize
  -> featureWindows
  -> schemeDna / coachingTree / systemSignal
  -> readModel
  -> validateArtifact
```

| Module | Owns | Must not own |
|---|---|---|
| `sourceRegistry.js` | admitted source families, allowed uses, owner and license assertions | URLs, credentials, fetching, schedules |
| `artifactRegistry.js` | injected local root, immutable bytes, source receipts, supersession, rebuildable index, replay verification | production root selection, backup vendor, publication |
| `ordinaryPbp.js` | exact ordinary-PBP receipt replay, the `TabularReader` port, and bounded canonical observed play facts | CSV/Parquet parsing, fetching, identities, EPA, formation/personnel claims, scheme labels |
| `canonicalize.js` | source observations normalized into Omen facts | source downloading or serving reads |
| `featureWindows.js` | time-safe evidence windows and coverage | customer copy |
| `schemeDna.js` | tendency vectors | categorical observed “scheme” labels |
| `coachingTree.js` | confirmed assignments separated from inferred influence | name-based identity guesses |
| `systemSignal.js` | bounded comparison/transfer signal | claims of causation |
| `readModel.js` | compact storage-neutral customer projection | raw artifact parsing |
| `validateArtifact.js` | independent output validation | production activation |

## Local artifact workflow

Use an explicit disposable or developer-selected root. The implementation refuses the
reserved production path and contains no KVM, Supabase Storage, S3, R2, or other vendor
assumption.

```bash
node scripts/football-intelligence-artifacts.js register \
  --root /tmp/omen-football-intelligence \
  --file /tmp/play_by_play_2025.csv \
  --metadata /tmp/play_by_play_2025.metadata.json

node scripts/football-intelligence-artifacts.js index \
  --root /tmp/omen-football-intelligence

node scripts/football-intelligence-artifacts.js verify \
  --root /tmp/omen-football-intelligence \
  --artifact sha256:<exact-digest>

node scripts/football-intelligence-artifacts.js replay \
  --root /tmp/omen-football-intelligence \
  --receipt receipt:<exact-digest>
```

The metadata JSON is the `registerSourceArtifact` input without `bytes`. It must include:

- `artifact_type`, `intended_use`, and `media_type`;
- exact source family, owner, release, URL, update time, license URL, and attribution;
- `schema_fingerprint`, `row_count`, coverage, and optional observed event-time range;
- for a correction, the existing `supersedes_artifact_id` and a reason.

The registry writes immutable content-addressed objects, immutable receipts, and a replaceable
generated registry index beneath the injected artifact root. The index is a navigation aid,
never replay authority; delete and rebuild it from receipts if it is lost.

## Ordinary PBP normalization boundary

`ingestOrdinaryPbpReceipt({ registry, receiptId, tabularReader })` accepts only an admitted
`raw_source` / `play_by_play` / `current_denominator` receipt. It verifies the receipt and
object hash together before giving the exact bytes to `tabularReader.readRows(...)`. The port
must return `{ columns, rows }`; this module does not add another CSV or Parquet parser.

The first fact slice retains only game/play identity, season/week/type, possession and defense,
down/distance/field/time context, observed pass/rush/scramble flags, touchdown, and yards gained.
No EPA, player crosswalk, personnel, formation, FTN feature, participation claim, Scheme DNA, or
customer interpretation is created here. No-play and non-scrimmage rows remain measured exclusions,
not zero-valued offensive evidence. Receipt row-count drift, missing columns, invalid values, and
duplicate game/play identities fail closed.

## Change rules

- Add or revise a source in `sourceRegistry.js` only after a source-admission decision.
- Never change old bytes or receipts. Corrections create a new hash and supersession link.
- Never treat an artifact or index entry as published customer data.
- Keep routes away from raw files; routes eventually read a published read-model repository.
- Run `node --test test/footballIntelligenceArtifactRegistry.test.js test/footballIntelligenceOrdinaryPbp.test.js` for registry/ordinary-PBP changes and
  the full `npm test` before handoff.
