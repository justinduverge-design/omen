# B2-D-E3 ESPN Drafted-League Proof — Security and Privacy Evidence

## Scope and authorization

The founder connected a drafted ESPN league through the Omen Chrome extension and explicitly authorized Codex to perform the read-only verification through the app, Chrome, or Supabase. ATA `ATA-20260802-07` limits the task to provider reads and aggregate evidence; transactions, database writes, publication, deployment, and production behavior changes remain outside scope.

## Method

The session could not safely attach to the founder's existing Chrome tab. A read-only Supabase aggregate first confirmed three active ESPN connections with complete league and Vault-reference shape, exactly one of which had been updated in the preceding 15 minutes. The probe selected that uniquely recent record without emitting an identifier, decrypted its existing Vault session in memory, and made the protocol's `mRoster`/`mTeam` and filtered `kona_player_info` GET requests. The temporary non-secret probe source was deleted immediately after execution.

## Sanitized evidence

| Control / observation | Result |
|---|---:|
| ESPN roster response | HTTP 200, 310 ms |
| Teams / populated teams | 10 / 10 |
| Distinct rostered players | 160 |
| ESPN filtered pool response | HTTP 200, 195 ms |
| Pool entries inspected | 500 |
| Entries with non-zero `onTeamId` | 0 |
| Entries overlapping a roster | 0 |
| Ownership-signal disagreements | 0 |
| Distinct status values | 1 |
| `percentOwned` range | 0.0–67.1 |

## Boundary findings

- Cookie values, Vault references, league ID, user ID, team ID, team names, usernames, player IDs, player names, and player lists were never printed or persisted.
- Credentials and league context existed in process memory only for the authorized requests and were sent only to ESPN's existing reads endpoint.
- Supabase access was read-only. No table row, Vault value, policy, schema, configuration, or production code was changed.
- ESPN access was GET-only. No add/drop, waiver claim, roster change, transaction, or rate-producing loop occurred.
- The output proves drafted-league roster subtraction for the observed ESPN response. It does not prove E1/E2 publication, merge, deployment, or production-route behavior.

## Security Done disposition

Gates 1–8 and 11 pass for this evidence-only task: no secret entered source or output, no new route/table/RLS/admin/error/Sentry path exists, and the credential/external-sharing boundary is documented here. Gate 9 is satisfied by direct review of the temporary probe's fixed aggregate-only output and fixed error codes; the file was removed after the run. Gate 10 is N/A because no dependency changed. Gate 12 is recorded in the skill-usage ledger.
