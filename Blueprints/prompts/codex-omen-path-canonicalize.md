# Codex Prompt — Canonicalize Omen Path
## Prompt for: Codex
## Operation type: Frontend + backend migration
## Date: 2026-05-23
## Repo: slops-saloon

---

## Decision

POST `/api/omen/mvp-move` + `OmenOfTheWeek.jsx` is the canonical Omen path.
`Omen.jsx` was a developer test harness. `GET /api/omen-of-the-week` is the old
contract. Both are retired in this prompt.

---

## Scope Constraints

- Do NOT touch `.env`, secrets, keys, credentials
- Do NOT deploy or push
- Run `npm test` after every meaningful change — stop and report failures
- Do NOT auto-resolve logic conflicts — stop and report

---

## Step 1: Read the POST response contract

Read `src/services/omen.js` — find `buildOmenMvpMoveResponse`. Map the fields it
returns. You need this before touching any frontend code.

Key shape to confirm:
- Top-level: `state`, `recommendation`, `signals`, `league`, `platform`
- `recommendation`: `type`, `title`, `move`, `primary_player`, `comparison_player`,
  `expected_value_delta`, `confidence { score, label, rationale }`,
  `risk { level, reasons }`, `explanation { summary, why_it_matters, risk, confidence, data_used }`

---

## Step 2: Update `OmenOfTheWeek.jsx` — swap endpoint and remap contract

**File**: `frontend/src/pages/OmenOfTheWeek.jsx`

### 2a — Change the fetch

Replace:
```js
const result = await apiFetch('/api/omen-of-the-week');
```
With:
```js
const result = await apiFetch('/api/omen/mvp-move', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
```

Remove the auth header logic from `useOmenData` — the POST endpoint does not
require it. The `state` field in the response drives all UI states.

### 2b — Remap the state machine

Old check: `data?.status === 'needs_platform_connection'`
New check: `data?.state === 'platform_disconnected'`

Old check: `data?.status === 'connected_platform_pending_live_engine'`
New check: `data?.state === 'empty'` (check `data.explanation` for context)

Old check: `!data?.recommendation`
New check: `data?.state !== 'success'`

### 2c — Remap display fields

| Old field | New field |
|-----------|-----------|
| `rec.headline` | `rec.title` |
| `rec.move_type` | `rec.type` |
| `rec.risk_level` | `rec.risk.level` |
| `rec.confidence_score` | `rec.confidence.score` |
| `rec.confidence_label` | `rec.confidence.label` |
| `rec.summary` | `rec.explanation.summary` |
| `rec.reasoning` (array of strings) | derive from `rec.explanation.why_it_matters` or `rec.explanation.data_used` |
| `data.week` | `data.league?.week` |
| `data.season` | `data.league?.season` |
| `data.is_mock` | check `data.signals` — all stub/mock = mock mode |
| `data.source?.platform` | `data.platform?.name` |
| `data.scoring_format` | `data.league?.scoring_format` |

Verify actual field names from Step 1 — this table is a guide, not guaranteed exact.

### 2d — Add ESPN recovery states

Add handling for these `state` values (currently missing from OmenOfTheWeek.jsx):
- `espn_reauth_required`
- `espn_league_context_missing`
- `espn_import_blocked`
- `espn_recovery_needed`

Copy `RecoveryPanel` component from `frontend/src/pages/Omen.jsx` into
`OmenOfTheWeek.jsx`. It renders for these 4 ESPN states. It uses:
- `data.platform.name` for the platform name
- `data.platform.recovery.message`, `recovery.fields_needed`, `recovery.cta`
- Links to `/account?platform=espn&recovery=${state}` — safe query params only

---

## Step 3: Run tests

```bash
npm test
```

Stop and report if any test fails before continuing.

---

## Step 4: Remove `Omen.jsx` from the router

**File**: `src/server.js` (or wherever `/omen` page route is registered)

Find the line that mounts `Omen.jsx` as a frontend route or any Express route
pointing to it. Remove it. Do not delete the file yet — just unregister the route.

---

## Step 5: Remove `GET /omen-of-the-week` from `system.js`

**File**: `src/routes/system.js`

Remove the `router.get('/omen-of-the-week', ...)` handler (lines ~48–63).

Remove the now-unused imports from that handler:
- `authenticateOmenRequest` (if no longer used elsewhere in system.js)
- `getLiveOmenForUser` (if no longer used elsewhere in system.js)

Do NOT remove `/health`, `/session`, or `/platform-status` routes.

---

## Step 6: Run full test suite

```bash
npm test
```

All 175 tests must pass. Report results. If any fail, diagnose and fix before
marking complete.

---

## Step 7: Verify Football tab still loads

Confirm `Football.jsx` still imports `OmenOfTheWeek` (line 8) and renders it.
No change needed there — the component name stays the same.

---

## Completion Checklist

- [ ] `buildOmenMvpMoveResponse` contract confirmed from service file
- [ ] `OmenOfTheWeek.jsx` calls POST `/api/omen/mvp-move`
- [ ] All display fields remapped to new contract
- [ ] ESPN recovery states (4) handled with `RecoveryPanel`
- [ ] Tests pass after frontend changes
- [ ] `Omen.jsx` route unregistered from server
- [ ] `GET /omen-of-the-week` removed from `system.js`
- [ ] All 175 tests pass
- [ ] Report: list every file changed and final test count

---

## Do NOT

- Do not delete `Omen.jsx` file — just unregister its route
- Do not touch `getOmenOfTheWeekMock()` in systemContracts.js yet
- Do not push or deploy
- Do not touch `.env`, secrets, or payment code
