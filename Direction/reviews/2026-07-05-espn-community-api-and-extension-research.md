# ESPN Community API + Browser Extension — Integration Research

Date: 2026-07-05
Status: Research only. Not legal advice. No code changed.
Context: Justin has already emailed ESPN for official access and is exploring whether a community-built library or a browser extension can get league data faster. This sits directly under the open "ESPN public/mobile posture" decision already flagged in `Direction/reviews/2026-07-05-app-store-mobile-readiness-sprint-proposal.md`.

## Framing up front

Every option below — the existing in-house adapter, the Python library, the two JS libraries, and a browser extension — pulls data through the **same** reverse-engineered ESPN fantasy endpoints, authenticated with the **same** `espn_s2` / `SWID` session cookies, subject to the **same** Disney Terms of Use restriction on automated extraction (confirmed current: Disney prohibits accessing, copying, or extracting Disney content by automated means for anything beyond personal, non-commercial use). None of these options changes Omen's legal exposure relative to what it already carries with its current adapter. They differ on build quality, maintenance burden, and reliability — not on ToS risk. Treat "which library" as an engineering decision and keep "should Omen do this publicly at all" as the separate founder/counsel decision already tracked.

## Candidates Evaluated

### Omen's existing adapter (`src/adapters/espn.js`) — already built

- **Availability:** In-house, already shipped.
- **Auth required:** User-provided `espn_s2` / `SWID` cookies (already Vault-stored per `Blueprints/security-privacy.md`).
- **Commercial ToS:** Same restricted/gray-area status as every other option here.
- **Data coverage:** Whatever the team has already mapped — roster normalization, `LINEUP_SLOT_MAP`, last-result caching (6h TTL via Redis).
- **Update frequency:** On-demand per user action; cached completed-week results only.
- **Technical complexity:** Already paid down. Uses Node's built-in `https` with browser-like headers.
- **Score: 5/5** for "what to build against" — not because ToS risk is lower, but because it already works and the team already solved the one concrete technical blocker (see next candidate).

**Important finding:** Omen already evaluated `espn-fantasy-football-api` (the npm library, below) and rejected it. The code comment at the top of `src/adapters/espn.js` says so directly: that library "bundles its own axios and sends `User-Agent: axios/VERSION` — rejected by ESPN's API," which is why the custom `https`-based adapter with browser-like headers exists. **`espn-fantasy-football-api` is still listed in `package.json` as a dependency but is not `require`d anywhere in `src/`** — it's dead weight from that earlier evaluation.

### espn-api (Python) — cwendt94/espn-api

- **Availability:** Open source, free. `pip install espn_api`.
- **Auth required:** `espn_s2` / `SWID` cookies for private leagues; none for public leagues.
- **Commercial ToS:** Same Disney restriction as everything else — the library itself carries no ToS clearance, it just reverse-engineers the same endpoints.
- **Data coverage:** League settings, rosters, weekly matchups, box scores; Football + Basketball live, NHL/MLB/WNBA in development.
- **Update frequency:** On-demand pull, no push/webhook.
- **License:** MIT.
- **Technical complexity:** Easy in isolation, but Omen's backend is Node/Express, not Python. Adopting this means either standing up a Python microservice/sidecar (new deploy surface, new runtime, new CI job, cross-language IPC) or rewriting its logic in JS anyway.
- **Score: 2/5.** Well-maintained and MIT-licensed, but wrong language for this stack and doesn't reduce legal exposure. Only worth it if the team specifically wants a maintained upstream project tracking ESPN's endpoint changes instead of hand-maintaining `src/adapters/espn.js` — and even then, a Python sidecar is a large infrastructure change for that benefit alone.

### espn-fantasy-football-api (npm) — mkreiser/ESPN-Fantasy-Football-API

- **Availability:** Open source, free. `npm install espn-fantasy-football-api`.
- **Auth required:** Same `espn_s2` / `SWID` cookies.
- **Commercial ToS:** Same restriction.
- **Data coverage:** v3 ESPN fantasy API — league, team, matchup, box score data. Private-league support is Node-only (not web/browser build).
- **Update frequency:** On-demand.
- **Technical complexity:** Already tried in this repo (per the code comment above) and rejected — its bundled axios User-Agent gets blocked by ESPN.
- **Score: 1/5 for this repo specifically.** Already disproven here. Listed as a candidate only for completeness; recommend removing it from `package.json` rather than reconsidering it.

### espn-ff-api / espn-ff-api-2 (npm) — smaller alternatives

- **Availability:** Open source, free, much smaller community than the two above (low star count, less activity).
- **Auth required:** Same cookies.
- **Commercial ToS:** Same restriction.
- **Data coverage:** Narrower — `getLeagueScoreboard`, `getMatchups`, `getLeagueStandings`, `getOverallStandings` per its own docs; less complete than `espn-api` or `mkreiser`'s client.
- **Technical complexity:** Unknown whether it has the same User-Agent problem; would need to be verified before trusting it.
- **Score: 2/5.** Underdog option, but less proven and narrower coverage than what Omen already has built.

### Browser extension — "help the user find their own cookies" pattern

There's real prior art here worth knowing about: **ESPN Cookie Finder** (by Hashtag Fantasy Sports), shipped on both the Chrome Web Store and Firefox Add-ons. It reads the user's own ESPN cookies locally in their browser and displays `espn_s2`/`SWID` so the user can paste them into a fantasy tool — it does not send anything to a remote server and does not scrape league/roster data itself.

That's a materially different thing from "a browser extension to get league information," and the distinction matters for risk:

- **Extension that only surfaces the user's own cookie values (local-read-only, no remote calls).** This is the same trust boundary Omen already has — the user is the one who copies a credential value and pastes it into `/account`. It only removes UX friction from the manual-copy step in `ConnectLeague.jsx`/`PlatformConnections.jsx`. It does not touch ESPN's servers itself and does not change Omen's own automated-extraction exposure at all, because Omen's backend is still the one making the reverse-engineered calls. **Score: 4/5** as a pure UX improvement, if scoped this narrowly.
- **Extension that scrapes rendered league/roster data directly from the user's authenticated ESPN tab and forwards it to Omen.** This shifts *where* the automated extraction happens (client-side, inside the user's own logged-in session) but does not change *whether* it's automated extraction under Disney's ToU, which prohibits automated techniques regardless of who initiates them. It also adds a new attack surface (a third-party extension with DOM access to a logged-in ESPN session) and a new thing to maintain against ESPN's HTML changing. **Score: 2/5** — do not build this without the same founder/counsel review already gating ESPN's cookie-based connection generally.

## Ranked Summary

| Category | Winner | Runner-Up | Notes |
|---|---|---|---|
| Best open source / free | `src/adapters/espn.js` (already built) | espn-api (Python) | In-house adapter already solved the User-Agent blocker; Python option would require a new runtime |
| Best value | `src/adapters/espn.js` (already built) | espn-api (Python), if Omen ever wants a maintained upstream instead of hand-rolled code | No new infra cost vs. standing up Python |
| Best overall | ESPN granting Justin's requested official/partner access | `src/adapters/espn.js` | Only an official channel removes the ToS gray area; nothing reverse-engineered does |

## Actionable Recommendation

**Build against:** Keep `src/adapters/espn.js`. It already works, already solved the concrete blocker that killed the npm library option in this exact repo, and is already Vault/RLS/logging-compliant per `Blueprints/security-privacy.md`.

**Skip:**
- `espn-fantasy-football-api` (npm) — already tried, already rejected by ESPN's API in this codebase; remove the unused dependency from `package.json` rather than revisit it.
- `espn-api` (Python) — MIT-licensed and well-maintained, but adopting it means adding a Python runtime/sidecar to a Node app for zero legal-risk benefit over the adapter Omen already has.
- espn-ff-api / espn-ff-api-2 — narrower coverage, smaller community, unverified against the same User-Agent issue; no reason to prefer over what's already built.
- A scraping-style browser extension that reads rendered ESPN league data from the user's tab and forwards it to Omen — same ToS exposure as the backend, plus new attack surface, without the founder/counsel review this already needs.

**Phase 1 (now):** Do nothing to the ESPN integration itself. It's already the most mature, cheapest, and best-fitting option evaluated. If onboarding friction is the actual problem being solved, a narrowly-scoped "find my own cookies" browser extension (matching the ESPN Cookie Finder pattern — local read only, no network calls, no league data) is a legitimate, low-risk UX improvement and does not require the ESPN-posture legal decision to be resolved first, since it doesn't touch ESPN's servers or Omen's backend.

**Phase 2 (when justified):** If ESPN responds to Justin's email with any form of official or partner access, that supersedes all reverse-engineered options above regardless of cost, and should immediately become the sole ESPN integration path — official access is the only option on this list that actually changes the ToS risk profile rather than just moving it around.

**Implementation notes for Codex (if a Phase 1 extension gets built):**
- Scope it to read-only local cookie lookup + copy-to-clipboard/autofill into Omen's existing `ConnectLeague.jsx`/`PlatformConnections.jsx` form fields. No remote server, no telemetry on cookie values, no league data fetching inside the extension.
- Do not have the extension call ESPN's fantasy endpoints itself — leave that entirely to `src/adapters/espn.js` so there's exactly one code path making automated ESPN requests, which is also easier to review/gate/kill-switch (ties into Phase 4.20a's mobile-build ESPN gate from the app-store readiness proposal).
- Remove `"espn-fantasy-football-api": "^2.0.1"` from `package.json` as a small, separate tech-debt cleanup — flagging per repo doctrine rather than editing `package.json` here, since package-file edits need explicit approval.
- This whole area — extension or not — still rolls up into the existing "ESPN public/mobile posture" Decisions-lane item from the app-store readiness proposal. Don't treat a browser extension as resolving that decision; it only reduces onboarding friction, not the underlying ToS exposure.

## Sources

- [espn-api (cwendt94) — GitHub](https://github.com/cwendt94/espn-api)
- [espn-api — PyPI](https://pypi.org/project/espn-api/)
- [ESPN-Fantasy-Football-API (mkreiser) — GitHub](https://github.com/mkreiser/ESPN-Fantasy-Football-API)
- [espn-fantasy-football-api — npm](https://www.npmjs.com/package/espn-fantasy-football-api)
- [espn-ff-api (Possardt) — GitHub](https://github.com/Possardt/espn-ff-api)
- [Disney Terms Of Use](https://disneytermsofuse.com/english/)
- [ESPN Cookie Finder — Chrome Web Store](https://chromewebstore.google.com/detail/espn-cookie-finder/oapfffhnckhffnpiophbcmjnpomjkfcj)
- [ESPN Cookie Finder — Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/espn-cookie-finder/)
- Omen in-repo evidence: `src/adapters/espn.js` (code comment documenting the rejected npm library), `package.json` (unused dependency), `Legal/2026-06-28-open-agreements-provider-paragraphs.md`, `Direction/reviews/2026-07-05-app-store-mobile-readiness-sprint-proposal.md`
