# ESPN Lazy Sync Research

## Scope

Provider-safe discovery of ESPN live draft detail for the authenticated Omen user, with a contract shape aligned to the existing Sleeper Lazy Sync routes.

## Sources Reviewed

- Existing local ESPN adapter family:
  - `src/adapters/espn.js`
  - `src/routes/espn.js`
- Existing Sleeper draft contract:
  - `src/services/sleeperDraft.js`
  - `src/routes/sleeper.js`
- Community/provider-behavior references reviewed during implementation:
  - `https://ffscrapr.ffverse.com/articles/espn_getendpoint`
  - Provider URL family already used locally: `https://fantasy.espn.com/apis/v3/games/ffl/seasons/{season}/segments/0/leagues/{leagueId}?view=...`

## Key Findings

1. ESPN draft detail is exposed through the same league-scoped v3 endpoint family already used by the roster and standings adapter, with repeated `view=` parameters rather than a clearly separate public draft resource.
2. Community references and existing ESPN tooling patterns indicate `view=mDraftDetail` is the relevant draft payload and can be combined with `mSettings` and `mTeam`.
3. The useful pick list is provider-owned draft detail, not an app-generated recommendation. The safest public contract is therefore a normalized pass-through with polling hints, not a new ESPN-specific recommendation layer.
4. No stable public ESPN draft identifier was confirmed. The provider surface appears league-scoped, so a synthetic contract id is safer than pretending ESPN gives Omen a stable external draft id.

## Implementation Decisions

- Use authenticated routes under `/api/espn/draft`.
- Reuse the existing Vault-backed ESPN cookie flow; do not add any new secret storage or credential path.
- Use synthetic draft ids in the public contract:

```text
espn:<leagueId>
```

- Normalize list/meta/state envelopes to the same Lazy Sync pattern already proven on Sleeper:
  - `GET /api/espn/draft?leagueId=...`
  - `GET /api/espn/draft/:draftId`
  - `GET /api/espn/draft/:draftId/state?since=...`
- Prefer `null` over guessed ownership metadata when ESPN does not safely expose slot/order details.
- Allow best-effort `slot_to_roster_id` recovery from explicit `pickOrder` when present, otherwise from observed first-round picks.

## Confidence / Risk Notes

- Confidence is moderate for the league endpoint/view family because the same adapter already depends on that surface.
- Confidence is lower for exact draft-order metadata because ESPN's draft payload is not officially documented for this use case.
- The contract is intentionally fail-closed: nullable slot metadata is acceptable; exposing raw cookies, raw provider bodies, or guessed ownership is not.

## Safe Follow-On

Yahoo live draft tracking can reuse the same public Lazy Sync contract shape, but its provider research should remain separate because the Yahoo risk profile is OAuth/documentation drift rather than ESPN's private-cookie surface.
