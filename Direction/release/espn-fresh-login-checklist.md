# ESPN fresh-login proof checklist (B13-ESPN-NEW-ACCOUNT)

**Item:** `B13-ESPN-NEW-ACCOUNT` in `Direction/current_sprint.md`.
**Done when:** connect and full ingestion are proven with a brand-new ESPN account, and the legacy
`platform_connections` row with no `espn_team_id` is repaired or retired with the founder's approval.
**Who does what:** Justin creates the account and types every credential. Agents watch logs and write the
evidence. No agent types, reads, stores or pastes an ESPN password, `espn_s2` or `SWID` value.

## 1. Create the tester account (Justin)

- [ ] Create a new ESPN account on a device Justin controls. Use a dedicated tester address; never write
      the address, password or display name in this repo, a PR, a log or recall.
- [ ] Join or create at least one ESPN fantasy football league for the current season, and own a team in it.
      Two leagues is better: it proves per-league `team_id` from discovery (`src/services/leagueDiscovery.js`).
- [ ] Note privately (outside the repo) which league(s) the account joined. In evidence, refer to them only
      as "league A" and "league B".
- [ ] Create a fresh Omen user for the run, or confirm the Omen user has no ESPN connection
      (Account → Connections shows ESPN as not connected).

## 2. Connect (iPhone, current build)

- [ ] Account → Connections → ESPN → Connect. Walk the states in order and note each one:
      `espnConsent` → `espnSigningIn` → `discoveringEspnLeagues` → `choosingEspnLeague` →
      `validatingEspnConnection` → `espnConnected`.
- [ ] Record whether discovery found the leagues by itself or the manual League ID fallback appeared
      (a brand-new login is the case that used to hit the fallback; see
      `Direction/release/build-12-connection-test-plan.md`). Either outcome is evidence; say which.
- [ ] If a named failure state appears (`espnSessionUnreadable`, `providerUnavailable`, ...), stop, screenshot
      it and record the state name. Do not retry more than once before writing it down.
- [ ] Pick league A. Confirm the app lands on the league with the user's own team selected.

## 3. Full ingestion

- [ ] The league's roster, matchup and standings load on the iPhone.
- [ ] The connection row for this user has a non-null `espn_team_id` (or each league membership carries its
      own `team_id`). Checked by a read-only query the founder approves; agents report only "null" / "set".
- [ ] Every team in the league is readable and projected (same probe as the Build 12 walk: count of teams
      readable / projected). Report counts only.
- [ ] The start/sit call for this week shows an Omen recommendation, labeled honestly where the provider
      projection is missing. `connected` is not `usable`: the call must actually render.
- [ ] If league B exists, switch to it and repeat the three checks above.
- [ ] Disconnect, reconnect once, and confirm the leagues come back usable (the real test from Build 12).

## 4. Sanitized evidence to capture

Write the evidence on the item in `Direction/current_sprint.md` (`Evidence:`) and link it from
`Direction/release/builds/build-13.md`.

- [ ] Date, build number, and which path ran (auto discovery or manual League ID fallback).
- [ ] The state sequence seen, with timings from `[omen-timing]` lines (durations only).
- [ ] Server status codes for `/api/platforms/espn/leagues` and `/api/platforms/espn/connect`.
- [ ] Counts: leagues found, teams readable, teams projected.
- [ ] Screenshots with names, emails, team names, avatars and league IDs cropped or blurred.
- [ ] `espn_team_id`: "set" or "null" only.

Never capture: cookie values (`espn_s2`, `SWID`), passwords, emails, real names, ESPN user or league IDs,
Omen user IDs, Vault secret IDs, raw request headers or raw provider payloads. Run
`node scripts/checks/no-pii-outbound.js` before the evidence PR.

## 5. Repair or retire the legacy row with no `espn_team_id`

Every step that changes production needs the founder's approval for the exact statement. Writing SQL is not
applying it.

- [ ] **Find it (read-only).** With approval, count ESPN `platform_connections` rows where `espn_team_id` is
      null and report the count and creation month only. Identify the owning user to the founder privately,
      not in the repo.
- [ ] **Decide.** Repair when the owner still uses the league and discovery can supply the team; retire when
      the row is stale or the owner can simply reconnect.
- [ ] **Repair path.** Preferred: ask the owner to disconnect and reconnect in the app, so discovery writes the
      team id through the normal code path. Only if that is impossible, draft one `UPDATE` scoped to that
      single row id, show it to the founder, and apply it only after an explicit yes.
- [ ] **Retire path.** Preferred: in-app Disconnect (`DELETE /api/platforms/espn`), which removes Vault
      cookies and the row; follows cascade, Move history and the Ledger stay. A direct `DELETE` needs the
      founder's yes for the exact statement and must also clear the row's Vault secret.
- [ ] **Prove it.** Re-run the read-only count; it should be zero (or the remaining rows explained). Record
      the before/after counts and the approval date in `Evidence:` and the decision in
      `Direction/decision_log.md`.

## 6. Close out

- [ ] `Status: VERIFIED` and `Evidence:` on `B13-ESPN-NEW-ACCOUNT`.
- [ ] `npm run closeout`.
