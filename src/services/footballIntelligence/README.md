# Football-intelligence module map

Start here before adding a football-intelligence source, artifact, model, or repository.
This slice is deliberately independent from the A7B scoring pipeline under
`src/services/footballData/`.

## Data path

```text
sourceRegistry
  -> artifactRegistry
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
```

The metadata JSON is the `registerSourceArtifact` input without `bytes`. It must include:

- `artifact_type`, `intended_use`, and `media_type`;
- exact source family, owner, release, URL, update time, license URL, and attribution;
- `schema_fingerprint`, `row_count`, coverage, and optional observed event-time range;
- for a correction, the existing `supersedes_artifact_id` and a reason.

The registry writes immutable content-addressed objects, immutable receipts, and a replaceable
generated registry index beneath the injected artifact root. The index is a navigation aid,
never replay authority; delete and rebuild it from receipts if it is lost.

## Change rules

- Add or revise a source in `sourceRegistry.js` only after a source-admission decision.
- Never change old bytes or receipts. Corrections create a new hash and supersession link.
- Never treat an artifact or index entry as published customer data.
- Keep routes away from raw files; routes eventually read a published read-model repository.
- Run `node --test test/footballIntelligenceArtifactRegistry.test.js` for registry changes and
  the full `npm test` before handoff.
