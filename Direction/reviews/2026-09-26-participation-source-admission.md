# Participation and tactical play source admission

**Date:** 2026-09-26

**Decision:** use the existing open nflverse ecosystem as a layered source rather than
wait for a second open provider that does not currently exist at equivalent freshness and
grain.

## What each source does

| Source | Current-season role | Limitation | Verdict |
|---|---|---|---|
| nflverse ordinary play-by-play | Complete timely denominator for plays, outcomes, context, and event participants | Does not provide complete on-field personnel/formation participation | Admit as the primary in-season fact source |
| FTN charting via nflverse | Motion, play-action, screen, RPO, pressure and other charted tactical enrichment, documented within roughly 48 hours | Coverage can be incomplete; CC BY-SA attribution applies | Admit as optional, coverage-measured enrichment |
| nflverse participation | On-field participation, formation/personnel and box observations | From 2023 onward arrives only after the postseason | Admit for historical calibration and replay only |
| NFL Big Data Bowl | Rich player-tracking samples useful for research | Bounded competition samples, not a weekly production feed | Research-only; not an ingest dependency |
| Sportradar NFL API | Official B2B play-by-play with trial/production access | Paid production product; no evidence it replaces personnel participation at the required open-price point | Future paid adapter, not v1 |
| SportsDataIO NFL API | Commercial live/final play-by-play and play statistics | Paid/subscription product; documented PBP is event/stat oriented | Future paid adapter, not v1 |

Community APIs that simply repackage nflverse are not independent witnesses or replacement
providers. Omen should consume the upstream release directly and retain its own immutable
receipt rather than adding another availability and trust hop.

## Attribution posture

Omen will credit nflverse on a compact Data Sources/Credits surface and retain full source,
license, attribution, release, and hash information in artifact provenance. FTN-derived
features additionally retain `FTN Data via nflverse` and CC BY-SA 4.0 in their evidence.
The app does not need license prose on every recommendation card; expanded evidence may
link to the central Data Sources page.

This is an engineering and founder-risk decision, not legal advice. Raw FTN rows will not
be republished as an Omen-owned dataset. Any future bulk data export or data-licensing
business is a new review trigger.

## Evidence policy v1

- Current window: at least 4 completed games and 120 eligible offensive plays.
- Comparison window: at least 8 completed games and 250 eligible offensive plays.
- FTN-derived dimensions: at least 70 percent of eligible plays charted.
- Thresholds are versioned policy and must be calibrated against the historical proof.
- Under-covered optional FTN dimensions are omitted; they do not turn missing observations
  into zeroes or block a base play-by-play signal that otherwise qualifies.

## Primary sources

- `https://github.com/nflverse/nflverse-pbp`
- `https://github.com/nflverse/nflverse-data/blob/main/workflows.md`
- `https://github.com/nflverse/nflreadr/blob/main/R/load_participation.R`
- `https://github.com/nflverse/nfl_data_py` (archived documentation for FTN cadence; new
  implementation work should use current nflverse loaders, not this deprecated package)
- `https://operations.nfl.com/programs-initiatives/innovation/big-data-bowl`
- `https://developer.sportradar.com/football/docs/nfl-ig-api-basics`
- `https://sportsdata.io/developers/data-dictionary/nfl`

## Revisit triggers

- nflverse or FTN changes terms, attribution, cadence, columns, or coverage;
- an open current-season participation feed becomes available;
- historical calibration shows the v1 thresholds are systematically too early or late;
- Omen needs tracking-level features that the open stack cannot support;
- Omen becomes a bulk football-data distributor or paid data-licensing product.
