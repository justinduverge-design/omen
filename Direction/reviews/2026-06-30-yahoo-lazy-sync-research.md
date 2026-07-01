# Yahoo Lazy Sync Research

## Scope

Provider-safe Yahoo live draft discovery/state for the authenticated Omen user, using the same list/meta/state polling shape already established on Sleeper and ESPN.

## Sources Reviewed

- Existing local Yahoo OAuth/client/adapter stack:
  - `src/routes/yahoo.js`
  - `src/services/yahoo.js`
  - `src/services/yahooAuth.js`
  - `src/adapters/yahoo.js`
- Existing Lazy Sync contracts:
  - `src/services/sleeperDraft.js`
  - `src/services/espnDraft.js`
- Yahoo documentation and wrapper references checked during implementation:
  - `https://sports.yahoo.com/developer/`
  - `https://y-fantasy-node-docs.vercel.app/resource/league/draft_results`
  - `https://yahoo-fantasy-api.readthedocs.io/en/latest/yahoo_fantasy_api.html`

## Key Findings

1. Yahoo draft results are league-scoped and available through the authenticated Fantasy Sports API rather than a separate public draft-room contract.
2. Wrapper documentation and sample responses consistently describe a league `draft_results` resource returning picks made so far, which fits Omen's Lazy Sync polling model.
3. Yahoo draft results can be in-progress rather than post-draft only, so Omen does not need to fake a post-hoc draft history as live sync.
4. Like ESPN, Yahoo does not present Omen with a clean standalone draft id that is worth exposing as provider truth. A synthetic contract id keeps the public shape stable and honest.

## Implementation Decisions

- Use authenticated routes under `/api/yahoo/draft`.
- Reuse the existing Yahoo OAuth + refresh-token path; no new credential storage model.
- Use synthetic draft ids in the contract:

```text
yahoo:<leagueKey>
```

- Normalize the public contract to the same list/meta/state model already used by Sleeper and ESPN:
  - `GET /api/yahoo/draft?leagueKey=...`
  - `GET /api/yahoo/draft/:draftId`
  - `GET /api/yahoo/draft/:draftId/state?since=...`
- Treat nullable slot/order metadata as acceptable provider uncertainty rather than guessing.
- Resolve player names and positions through Yahoo player-detail lookups keyed from draft results so picks are still frontend-usable.

## Confidence / Risk Notes

- Confidence is moderate-to-high on the existence of Yahoo draft results because the authenticated API and multiple wrappers agree on the league resource.
- Confidence is lower on some optional settings fields such as timer/round metadata because Yahoo's response shape is nested and inconsistent.
- OAuth makes Yahoo safer than ESPN from a credential-handling perspective, but schema drift remains a real provider risk.

## Safe Follow-On

No additional provider Lazy Sync items remain in the immediate backend queue after this task. The next active inbox item shifts back to the frontend/design queue unless Justin pins a new backend task.
