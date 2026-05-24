# ESPN Recovery Playbook

## Purpose

ESPN is essential to the paid Corvus experience, but it is also the riskiest platform connection.

This playbook defines how the app should explain and recover from ESPN auth, import, and league context failures.

The goal is simple:

- Treat ESPN failures as recoverable product states.
- Tell the user exactly what to do next.
- Keep secrets, cookies, Vault ids, auth headers, and raw ESPN responses out of the UI and logs.
- Give Claude/frontend and Codex/backend one shared recovery contract.

## When ESPN Recovery Appears

ESPN recovery should appear when an ESPN-backed feature cannot safely use league or roster data.

Primary surfaces:

- Account page ESPN connection flow.
- Omen / MVP Move recommendation flow.
- Any future Corvus feature that depends on ESPN league, team, or roster data.

Do not show a generic crash or generic "something went wrong" message when the backend can classify the failure.

Use one of these states:

- `espn_reauth_required`
- `espn_league_context_missing`
- `espn_import_blocked`
- `espn_recovery_needed`

## Recovery State Map

| State | Likely Cause | Primary CTA | User Action | Retry? | Reconnect? | League Selection? |
| --- | --- | --- | --- | --- | --- | --- |
| `espn_reauth_required` | ESPN session expired, credentials missing, Vault decrypt failed, or ESPN rejected auth. | Reconnect ESPN | Re-enter ESPN connection details through Account. | After reconnect | Yes | Maybe after reconnect |
| `espn_league_context_missing` | ESPN is connected, but the app does not know which league/team to use. | Select league | Choose or re-import the ESPN league. | After league is selected | No, unless selection fails | Yes |
| `espn_import_blocked` | ESPN import failed because access, privacy, league membership, or ESPN response shape blocked import. | Retry import | Retry, reconnect, or verify league access. | Yes | Sometimes | Sometimes |
| `espn_recovery_needed` | Unknown ESPN auth/access/response failure that should not be treated as permanent. | Review ESPN connection | Retry once, then reconnect or re-import. | Yes, once | If retry fails | If context looks stale |

## User-Facing Copy By State

### `espn_reauth_required`

What the user should see:

- Title: "Reconnect ESPN"
- Body: "Your ESPN connection needs a fresh sign-in before Corvus can read this league."
- CTA: "Reconnect ESPN"
- Secondary copy: "After reconnecting, return to Omen and run the move check again."

Avoid:

- "Invalid credentials"
- "Cookie expired"
- Any mention of raw ESPN cookie names unless the Account form itself needs field labels.

### `espn_league_context_missing`

What the user should see:

- Title: "Choose your ESPN league"
- Body: "Corvus can reach ESPN, but it does not know which league or team to use for this recommendation."
- CTA: "Select league"
- Secondary copy: "If the league is missing, re-import ESPN from Account."

Avoid:

- Blaming the user for a missing league id.
- Showing internal ids as the main explanation.

### `espn_import_blocked`

What the user should see:

- Title: "ESPN import needs attention"
- Body: "Corvus could not import this ESPN league. ESPN may be blocking access, the league may not be visible to this account, or the connection may need to be refreshed."
- CTA: "Retry import"
- Secondary CTA when available: "Reconnect ESPN"
- Secondary copy: "If retry does not work, confirm the ESPN account can view the league and reconnect ESPN."

Avoid:

- Displaying raw ESPN response bodies.
- Showing low-level adapter or HTTP details.

### `espn_recovery_needed`

What the user should see:

- Title: "ESPN needs recovery"
- Body: "Corvus could not safely finish the ESPN check. This is usually recoverable."
- CTA: "Try again"
- Secondary CTA when available: "Review ESPN connection"
- Secondary copy: "If it keeps happening, reconnect ESPN or re-import the league from Account."

Avoid:

- Saying data is lost.
- Suggesting the user is locked out unless the backend knows that is true.

## Frontend Behavior By State

Recovery routing decision:

- ESPN recovery should route to `/account`.
- Safe query params are allowed, such as `platform=espn` and `recovery=espn_reauth_required`.
- Do not put credential values, Vault ids, raw ESPN errors, auth headers, or request bodies in the URL.
- Do not create a separate ESPN recovery route for MVP unless Account cannot support the flow.

### `espn_reauth_required`

- Show recovery panel on Omen when the state is returned.
- Route primary CTA to Account ESPN reconnect.
- Account should guide the user through replacing the ESPN connection.
- If backend returns `fields_needed`, show friendly labels only.
- Never render credential values.

### `espn_league_context_missing`

- Show league selection or re-import guidance.
- Route primary CTA to Account league selection/import surface.
- Omen should not continue recommendation generation until league and team context are available.
- Preserve the user's current Omen inputs where possible.

### `espn_import_blocked`

- Show retry import as the first action.
- Offer reconnect ESPN if retry fails or if the backend marks auth as suspect.
- Make it clear that ESPN access or league visibility may be the blocker.
- Do not present this as a generic app failure.

### `espn_recovery_needed`

- Show a calm retry-first state.
- If retry fails, send the user to Account to review ESPN connection and league import.
- Keep the state recoverable unless the backend later returns a stronger state.

## Backend Behavior By State

All ESPN recovery responses should:

- Return the Omen envelope when called from `/api/omen/mvp-move`.
- Keep `feature: "omen_mvp_move"` when called from Omen.
- Set `recommendation: null`.
- Set roster or ESPN-dependent signals to `unavailable`.
- Include recovery metadata with a safe user action.
- Include plain-English explanation.
- Avoid raw ESPN error bodies, cookies, headers, Vault ids, secret ids, and decrypted credential values.

### `espn_reauth_required`

Return when:

- ESPN connection is missing required secret references.
- Vault decrypt fails or returns no usable credentials.
- ESPN responds with an auth failure.
- Existing connection is inactive or expired.

Backend should return:

- `state: "espn_reauth_required"`
- `recovery.action: "reconnect_espn"`
- `recovery.fields_needed: ["ESPN_S2", "SWID"]` only as field labels, not values.
- Retryable after reconnect.

Backend should avoid:

- Logging the submitted fields.
- Echoing entered values.
- Returning Vault ids.

### `espn_league_context_missing`

Return when:

- ESPN connection exists, but no league/team context is selected.
- Stored league id is missing or stale.
- ESPN adapter cannot match the user's team in the selected league.

Backend should return:

- `state: "espn_league_context_missing"`
- `recovery.action: "select_or_reimport_league"`
- Message telling frontend to ask for league selection or re-import.
- Safe context such as platform, league display name if known, and team display name if known.

Backend should avoid:

- Treating this as auth failure unless auth also failed.
- Returning internal lookup traces.

### `espn_import_blocked`

Return when:

- ESPN league import cannot complete because access appears blocked.
- ESPN league visibility, membership, privacy, or response shape prevents import.
- ESPN response is reachable but not usable for normalized roster/team import.

Backend should return:

- `state: "espn_import_blocked"`
- `recovery.action: "retry_import_or_reconnect"`
- Message telling frontend to offer retry, reconnect, or access verification.
- Retryable when the cause may be temporary.

Backend should avoid:

- Displaying ESPN response body text.
- Displaying adapter stack traces.
- Marking the connection permanently broken without evidence.

### `espn_recovery_needed`

Return when:

- ESPN failure is real but not classifiable as auth, context, or blocked import.
- The backend cannot safely determine the next exact recovery state.
- ESPN or network behavior is ambiguous.

Backend should return:

- `state: "espn_recovery_needed"`
- `recovery.action: "retry_then_review_connection"`
- Safe message telling frontend to retry once, then review ESPN connection.
- Retryable unless the backend knows the request is invalid.

Backend should avoid:

- Leaking ambiguous raw failure details.
- Collapsing all unknown ESPN errors into generic `error` unless the feature itself cannot continue safely.

## Account Page Recovery Flow

Account is the source of truth for ESPN connection repair.

MVP decision:

- Use the existing Account surface, not a separate ESPN recovery page.
- Use a full ESPN Account section, not a modal, for reconnect, import retry, and league selection.
- Modals may be considered later for lightweight league switching after the recovery flow is trusted.

Expected flow:

1. User lands on Account from an ESPN recovery CTA.
2. Account highlights ESPN connection status.
3. User can reconnect ESPN.
4. User can retry import after reconnect.
5. User can select or re-import the league when context is missing.
6. Account confirms recovery in plain English.
7. User returns to Omen or the feature that raised recovery.

Account should support:

- Reconnect ESPN.
- Retry ESPN import.
- Select imported ESPN league/team.
- Show connection status without exposing secrets.
- Show calm recovery copy for each state.

Account should not:

- Show raw cookies.
- Show Vault ids.
- Show auth headers.
- Show raw ESPN response bodies.
- Log submitted credential values.

## Omen / MVP Move Recovery Flow

Omen should not pretend to have a recommendation when ESPN data is required but unavailable.

MVP decision:

- Preserve only safe Omen request context after recovery.
- Safe context includes platform, season, week, scoring format, decision scope, and selected league/team ids already visible to the user.
- Do not preserve secrets, credential values, raw ESPN responses, Vault ids, auth headers, or backend error bodies.
- Do not automatically rerun Omen after ESPN recovery.
- After recovery, show an explicit user action such as "Run Omen again."

Expected flow:

1. User runs MVP Move for ESPN.
2. Backend returns one of the ESPN recovery states.
3. Omen renders a recovery panel instead of a recommendation.
4. Omen keeps confidence, risk, and recommendation content empty or clearly unavailable.
5. Signals show ESPN-dependent data as `unavailable`.
6. CTA sends the user to Account for reconnect, selection, or import repair.
7. After recovery, user chooses to rerun MVP Move.

Omen should display:

- State-specific title.
- State-specific explanation.
- Primary CTA.
- Signal labels such as `unavailable`, `stub`, `mock`, or `live`.
- Recovery guidance when provided by backend.

Omen should not display:

- Raw error object dumps.
- Secret names as technical instructions outside safe field labels.
- Backend stack traces.
- Recommendation copy when `recommendation` is `null`.

## Security And Privacy Rules

Never log, display, store in plaintext, or include in analytics:

- ESPN cookies.
- Entered ESPN credential values.
- Vault secret ids.
- Auth headers.
- Raw ESPN response bodies.
- Full adapter stack traces.
- Any value that can be reused to access the user's ESPN account.

Allowed:

- Safe field labels.
- Sanitized error category.
- Recovery state.
- Retryability.
- Platform name.
- League or team display names when already safe for the user to see.
- Request id.

Backend logging should use sanitized error summaries only.

Frontend analytics should record recovery state and action clicks, not credential content.

## ESPN Import Blocked Reason Codes

MVP decision:

- Keep `espn_import_blocked` as the user-facing state for now.
- Later backend work may add a safe `reason_code` for support, analytics, and more specific recovery copy.
- `reason_code` must never include raw ESPN responses, credential values, auth headers, Vault ids, or stack traces.

Allowed future `reason_code` values:

- `league_not_visible`
- `wrong_espn_account`
- `private_or_restricted_league`
- `unsupported_league_shape`
- `espn_temporarily_unavailable`
- `team_not_found`

Frontend rule:

- Branch on `state` first.
- Treat `reason_code` as optional detail.
- Do not expose `reason_code` as technical copy unless it is mapped to plain English.

## Analytics Or Logging Notes

Track product-level recovery events:

- `espn_recovery_state_viewed`
- `espn_recovery_cta_clicked`
- `espn_reconnect_started`
- `espn_reconnect_completed`
- `espn_import_retry_started`
- `espn_import_retry_completed`
- `espn_league_selected`

Safe event properties:

- `state`
- `surface`
- `platform`
- `action`
- `retryable`
- `request_id`

Unsafe event properties:

- Credential values.
- Vault ids.
- ESPN cookies.
- Auth headers.
- Raw ESPN errors.

## QA Checklist

- Each ESPN recovery state renders on Omen without crashing.
- Each ESPN recovery state has a clear title, explanation, and CTA.
- Account can be reached from Omen recovery CTAs.
- `espn_reauth_required` sends the user to reconnect ESPN.
- `espn_league_context_missing` sends the user to select or re-import a league.
- `espn_import_blocked` offers retry and reconnect guidance.
- `espn_recovery_needed` offers retry-first guidance.
- No recommendation appears when `recommendation` is `null`.
- Signals show ESPN-dependent data as `unavailable` where applicable.
- No raw credential values appear in DOM, logs, console output, network response, or analytics.
- No Vault ids appear in DOM, logs, console output, network response, or analytics.
- Network errors are shown as recoverable states when backend classification exists.
- Desktop layout remains usable.

## Decisions

- ESPN recovery routes through `/account` with safe state/query context only.
- ESPN league selection belongs in a full Account ESPN section for MVP, not a modal.
- Omen may preserve safe request context, but the user must click to rerun after recovery.
- `espn_import_blocked` remains the MVP user-facing state; safe `reason_code` values may be added later.

## Open Decisions

- Should recovery analytics ship before or after the first paid launch gate?

## Next Implementation Prompt

Use this prompt for the next coding pass.

```text
You are Codex, the backend engineer for the Slops Saloon `slops-saloon` repo.

Implement the first ESPN recovery UI/backend alignment pass using the ESPN Recovery Playbook.

Scope:
- Keep the work narrowly focused on ESPN recovery wiring.
- Do not redesign the frontend.
- Do not change secrets, Vault schema, Supabase migrations, deployment, Docker, DNS, SSL, payments, or infrastructure.
- Do not expose ESPN cookies, raw credential values, Vault ids, auth headers, or raw ESPN response bodies.

Read first:
- DBS_INDEX.md
- README.md
- Corvus/Blueprints/playbooks/espn-recovery.md
- Corvus/Blueprints/specs/omen-mvp-move.md
- Blueprints/handoffs/backend-to-frontend.md
- frontend/src/pages/Account.jsx
- frontend/src/pages/Omen.jsx
- src/routes/platforms.js
- src/adapters/espn.js
- src/services/espnAuth.js
- src/routes/espn.js

Goal:
Make ESPN recovery states consistent between Omen, Account, and backend responses.

Backend requirements:
- Preserve existing Omen / MVP Move contract.
- Ensure ESPN recovery states return safe recovery metadata.
- Ensure sanitized logging for ESPN failures.
- Ensure no response includes raw ESPN cookies, credential values, Vault ids, auth headers, or raw ESPN response bodies.
- Add or update focused backend tests only where backend recovery behavior changes.

Frontend requirements:
- Keep frontend changes minimal and integration-safe.
- Ensure Omen renders all ESPN recovery states from the playbook with clear CTA copy.
- Ensure Account is the destination for reconnect, retry import, and league selection guidance.
- Route recovery to `/account` using only safe state/query context.
- Use a full Account ESPN section for league selection and import repair, not a modal.
- Preserve only safe Omen request context and require a user click to rerun Omen after recovery.
- Do not redesign the Account or Omen pages.
- Do not display raw credential values or secret identifiers.

States to verify:
- espn_reauth_required
- espn_league_context_missing
- espn_import_blocked
- espn_recovery_needed

Testing:
- Run focused backend tests if backend behavior changes.
- Run focused frontend build or tests if frontend behavior changes.
- Manually verify Omen recovery rendering for all four ESPN states.

Completion report:
- files changed
- states verified
- recovery CTAs confirmed
- tests or build commands run
- whether the implementation matches the playbook
```
