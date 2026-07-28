# Yahoo Fantasy API Waiver Capability Research

## Research Question

Can Omen safely use the existing Yahoo Fantasy integration for a selected-context waiver replacement without a new provider, SDK, or paid service?

## Layer

2-Omen

## Constraints

- Omen has a $0 cloud/data-provider posture.
- Reuse only the existing Yahoo OAuth integration and `getAvailablePlayers()` client path.
- Do not scrape, add a package, change provider settings, or read credentials.
- Never present an unavailable player pool or a mock optimizer fixture as live advice.

## Source Checked

- Yahoo Developer Network Fantasy Sports API guide, checked 2026-07-26: Fantasy data is OAuth-protected; a registered application needs private-user-data access; unassigned players are available through the free-agent or waiver process.
- `src/services/yahoo.js`: existing `getAvailablePlayers(leagueKey, { count: 50, sort: "AR" })` fetches only currently available Yahoo players in Yahoo average-rank order.
- `src/services/roster.js`: the basic available-player normalization has no weekly projection field.

## Actionable Recommendation

**Build against:** the existing Yahoo `getAvailablePlayers()` integration, scoped to the authenticated user's selected Yahoo context.

**Phase 1 now:** when no Start/Sit swap exists, recommend only an available same-position replacement for an OUT/IR starter; preserve the absent point delta and label the missing waiver projection.

**Skip:** a new data provider, scraping, or a projection-backed waiver ranking until a separately approved live source is available.

## Approval Required

Yahoo Fantasy API reapproval is required for real-account capability proof. No credential, provider-setting, or production action is authorized by this note.
