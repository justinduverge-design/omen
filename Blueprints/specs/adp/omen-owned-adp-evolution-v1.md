# Omen-Owned ADP Evolution

## Decision

Use approved external ADP as Omen's initial input, then evolve toward an Omen-owned ranking without hiding provenance.

## Now

- Aggregate Fantasy Football Calculator and MyFantasyLeague ADP; include Yahoo only for an already-connected Yahoo user.
- Refresh every six hours in season and daily preseason.
- If fewer than two approved sources are available or data is older than 24 hours, expose `unavailable`; never substitute mock data as live.

## Later: Omen-owned ADP

Persist a normalized board with source timestamps, source count, scoring format, league size, confidence, and freshness. Layer Omen signals—league scarcity, roster context, usage, injury, and historical outcomes—on top of the external baseline. Every response must distinguish external ADP, Omen-derived ranking, stale, and unavailable.

## Guardrails

No paid vendor, scraping, credential, schema, production, or deployment action is authorized by this decision. Each new Omen signal requires a source, freshness rule, evaluation evidence, and a truthful UI label.
