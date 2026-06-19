# Corvus Demo Mode

**Status:** Backend contract deployed; frontend `/demo` implementation pending.
**Contract:** `GET /api/demo` (`corvus-demo.v1`)

## Purpose

Demo Mode gives a visitor a deterministic example of Corvus before they connect a real fantasy league. It is a separate product state, not a fallback for live Omen and not the development-only mock mode.

## Sample fixture

The backend returns one fixed Corvus demo league containing:

- a normalized roster with populated `starters`, `bench`, and `ir` arrays;
- sample player identity, slot, opponent, status, and projected-point fields;
- a deterministic optimizer-backed start/sit recommendation;
- confidence, risk, explanation, and source evidence in the Omen envelope shape.

Fixture source: `src/services/demoMode.js`.

## Data-state contract

Demo responses always include:

```json
{
  "mode": "demo",
  "is_demo": true,
  "is_live": false,
  "is_mock": false
}
```

`mode` is authoritative. Frontend code must not infer that `is_mock: false` means live. Demo signals use `status: "demo"` and a `demo_*` source.

## Visible labeling

Every `/demo` rendering must keep a persistent, non-dismissible Demo Mode label in view. Directional copy:

> Demo Mode — sample league and roster data. This is not live fantasy advice.

The existing development `MockBanner` copy must not be reused as if demo were mock data. The frontend should extend its data-source label vocabulary with `demo`.

## Swap to real data

Demo Mode never auto-merges with a connected league. Moving to real data requires an explicit user action that leaves `/demo` and enters the normal connection/live flow.

Recommended conversion direction:

- Primary action: connect a league.
- Secondary action: return to the public Corvus tools.
- Do not silently replace the demo fixture after authentication or platform connection.

## Analytics and model boundary

- Demo fixture interactions are ineligible for product analytics events.
- Demo fixture content is ineligible for LLM training prompts.
- The backend demo response makes both constraints machine-readable under `telemetry`.
- The demo service calls no platform adapter, Supabase client, user service, or LLM.

## Determinism

Roster membership, projections, recommendation input, request id, and recommendation content stay fixed for `corvus-demo.v1`. `generated_at` is request-time metadata only. A fixture change requires a contract-version review and updated tests.
