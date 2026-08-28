# Handoff — Yahoo entitlement live, connections re-enabled, league binding fixed

**Date:** 2026-08-28
**Trigger:** founder reported Yahoo had emailed approval and asked whether it was live.
**Outcome:** it is. Two gates opened, three parser defects fixed, full Yahoo data path verified on the deployed image.

---

## 1. The entitlement is live

Yahoo granted Fantasy Sports API access for app `ZcZJXm8V`. Verified by a read-only probe run inside the production `omen_api` container through the normal `getAuthenticatedYahooClient()` path:

- `/fantasy/v2/game/nfl` → **200** (public game metadata, `game_key` 470, season 2026)
- `/fantasy/v2/users;use_login=1/games` → **200** (user-scoped)

Both returned `403 "This application is not authorized to perform this action."` on 2026-08-21. `/game/nfl` needs no user scope, so a 200 there **is** the entitlement. The stored token had expired 2026-08-21; the proactive refresh minted a fresh one mid-call and Yahoo accepted **that** — so this is a real grant, not a cached artifact.

**The escalation was not sent.** `facts-of-record.md` #11 set today as the date to escalate citing the Docusign envelope and App ID. Access landed on that date. **Running the recorded re-check before drafting the email is the whole lesson of this session.**

## 2. Both gates opened

- `YAHOO_ENABLED=true` in `/opt/omen/deploy/hostinger/.env.production` (backup `.env.production.bak-20260828-before-yahoo-enable`), `omen_api` + `omen_cron` recreated. Verified: `GET /api/yahoo/auth` now returns **401** (auth) not **503** (flag).
- `YAHOO_CONNECTIONS_ENABLED = true` in `frontend/src/lib/yahooAuth.js`, deployed via `main`.

**The flag machinery stays and still defaults to `false`.** Yahoo made this decision by review once and can make it again; failing closed on an unset flag is correct even on a good day. `GET /api/yahoo/access-probe` was **not** deleted despite `current_sprint.md` saying to delete it once green — it is the only cheap re-check, it is `requireAuth`-gated and read-only, and the eight-day diagnosis it ended was expensive precisely because no such surface existed.

## 3. The defect the entitlement exposed

The first real bind was **refused**: `getUserLeagues()` returned `[]` while the raw call returned two leagues, so `POST /api/yahoo/league` rejected every id and the connection was stuck on the `league_id: "yahoo"` sentinel — connected forever, usable never.

Yahoo uses two serialisations. Measured live, not assumed:

| Endpoint | `[0]` shape | Parser | Was |
|---|---|---|---|
| `/league/{key}` | flat object | `getLeagueMetadata`, `getCurrentWeek` | broken |
| `/users;use_login=1/games;game_keys=nfl/leagues` | flat object | `getUserLeagues` | broken |
| `/users;…/leagues;league_keys={key}/teams` | array of single-key objects | `getMyTeamKey` | correct |

Fixed with a shared `yahooAttrReader()` accepting either shape.

**Three things to carry forward:**

1. **The unit test passed the whole time** — its fixture was hand-built in the shape the parser expected. A fixture written from the implementation tests that the implementation is itself. Provider fixtures now come from captured traffic; both shapes are covered.
2. **`getLeagueMetadata()` and `getCurrentWeek()` had no direct coverage**, which is how one wrong assumption survived across three methods.
3. **The first fix named the wrong endpoints.** It corrected `getUserLeagues()` and asserted in a comment that `/league/{key}` used the array shape — inference, and wrong. Measuring all three endpoints is what found the other two.

## 4. Verified end-to-end (deployed image)

| Check | `owner@` — `470.l.1255365` (postdraft) | personal — `470.l.1358570` (predraft) |
|---|---|---|
| `isOmenReadyConnection` | true | true |
| `getUserLeagues` | 2 | 2 |
| `getLeagueMetadata` | populated, season 2026 | populated, season 2026 |
| `getCurrentWeek` | 1 | 1 |
| `getMyTeamKey` | `470.l.1255365.t.6` | `470.l.1358570.t.3` |
| roster | **15 players** | none — correct, has not drafted |

Backend 885/885; frontend build clean; three deploys green (`a773e3d`, `7bc2892`, `78ca176`).

## 5. State and next steps

- **Unblocked:** P1-YahooReauth is DONE. **F7 and Section K are unblocked.** Issue [#308](https://github.com/justinduverge-design/omen/issues/308) closed.
- **Watch:** the predraft league serves no roster until 2026-09-09. Do not read that as a regression.
- **Open risk, unchanged:** every parser in `src/services/yahoo.js` degrades silently (`{}` / `null` / `[]`), so a *wrong* parser looks exactly like an *empty* provider — no log, no Sentry event. This bug was invisible for as long as it existed. Left as-is deliberately; the case is in `decision_log.md` for whoever revisits it.
- **Provider posture, stated precisely:** Yahoo now has a signed agreement, a granted entitlement, and a verified data path. **ESPN and Sleeper do not** — both were emailed, neither responded, and they run on the 2026-08-27 non-commercial reading, which the decision log records as not a legal opinion, not counsel-reviewed, and not confirmed by any provider. Yahoo went from working to dark for fifteen days with no warning and no change on our side. "Working until told otherwise" is a fine posture; **"all providers are set" overstates ESPN and Sleeper.**

## 6. If Yahoo goes dark again

`GET /api/yahoo/access-probe` is the whole test — any 200 = granted, four 403s = revoked. Pausing needs **both** `YAHOO_ENABLED=false` and `YAHOO_CONNECTIONS_ENABLED=false`; either alone leaves a path that looks functional and is not. And re-verify the parse layer, not just the connection: this session proved those are separate claims.
