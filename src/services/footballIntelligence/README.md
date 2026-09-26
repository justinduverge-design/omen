# Football-intelligence module map

Start here before adding a football-intelligence source, artifact, model, or repository.
This slice is deliberately independent from the A7B scoring pipeline under
`src/services/footballData/`.

## Data path

```text
sourceRegistry
  -> artifactRegistry
  -> ordinaryPbp / schedules / ftnCharting / participation
       (verified receipt replay -> injected TabularReader -> bounded source facts)
  -> identityDimensions -> observedMetrics
  -> featureWindows
  -> schemeDna / coachingTree / systemSignal
  -> readModel
  -> validateArtifact
```

| Module | Owns | Must not own |
|---|---|---|
| `sourceRegistry.js` | admitted source families, allowed uses, owner and license assertions | URLs, credentials, fetching, schedules |
| `artifactRegistry.js` | injected local root, immutable bytes, source and derived receipts, supersession, rebuildable index, replay verification | production root selection, backup vendor, publication |
| `ordinaryPbp.js` | exact ordinary-PBP receipt replay, the `TabularReader` port, and bounded canonical observed play facts | CSV/Parquet parsing, fetching, identities, EPA, formation/personnel claims, scheme labels |
| `schedules.js` | game/date/team context and observed coach aliases | canonical coach identity promotion |
| `ftnCharting.js` | optional tactical facts and the measured 70% coverage gate | denominator ownership or under-covered enrichment |
| `participation.js` | historical calibration facts with explicit missingness | current-season denominator or current-serving evidence |
| `identityDimensions.js` | provider-neutral Omen IDs, effective-dated aliases/assertions, unresolved/disputed states | name matching or provider IDs as canonical keys |
| `observedMetrics.js` | joins admitted source facts to resolved team identities and projects scalar facts for the existing feature-window boundary | guessing identities, using participation as current evidence, or coercing missing FTN values to zero |
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

The ordinary-PBP fact slice retains only game/play identity, season/week/type, possession and defense,
down/distance/field/time context, observed pass/rush/scramble flags, touchdown, and yards gained.
It also retains the ordinary nflverse `no_huddle` flag used by the first current feature window.
No EPA, player crosswalk, personnel, formation, scheme label, or customer interpretation is created
there. No-play and non-scrimmage rows remain measured exclusions,
not zero-valued offensive evidence. Receipt row-count drift, missing columns, invalid values, and
duplicate game/play identities fail closed.

`buildObservedMetricFacts(...)` keeps ordinary PBP as the eligible-play denominator, resolves its
team aliases through effective-dated `nflverse` namespace assertions, and joins optional FTN facts
only when the exact FTN receipt clears its 70% coverage gate. Under-covered or unreported FTN values
remain explicit unavailable facts with `null` values and are ineligible for feature computation.
Participation is normalized for historical calibration/replay only and is not an input to this
current-window projection.

Scheme DNA uses `football-intelligence-evidence-policy.v1`: current windows require 4 games and
120 eligible plays; comparisons require 8 games and 250 eligible plays in each window. These are
versioned model defaults, not source facts. Compact validated read models can be registered as
immutable candidate artifacts using exact source artifact IDs. Derived receipts are replayable,
support correction supersession without mutation, and remain `publication.authorized: false`.

## Change rules

- Add or revise a source in `sourceRegistry.js` only after a source-admission decision.
- Never change old bytes or receipts. Corrections create a new hash and supersession link.
- Never treat an artifact or index entry as published customer data.
- Keep routes away from raw files; routes eventually read a published read-model repository.
- Run `node --test test/footballIntelligenceArtifactRegistry.test.js test/footballIntelligenceOrdinaryPbp.test.js` for registry/ordinary-PBP changes and
  the full `npm test` before handoff.
