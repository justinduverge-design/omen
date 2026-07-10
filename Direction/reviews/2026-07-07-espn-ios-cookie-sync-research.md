# ESPN iOS Cookie-Sync Integration Research

## Research Question

What is the simplest, most reliable way to let iOS users connect their ESPN Fantasy Football league to Omen, given ESPN has no public OAuth/API and the current method requires manually copying the `espn_s2` and `SWID` cookie values from browser DevTools? Specifically: does a browser extension (the path Justin wants to build) actually solve this on iOS, or does iOS have a platform-level blocker that no extension can route around?

## Layer

2-Omen (formerly Corvus)

## Constraints

- No official ESPN Fantasy API or OAuth flow exists for third parties — every community tool (`espn-api`, GameDayBot, ffscrapr, etc.) authenticates by replaying the user's own `espn_s2` + `SWID` session cookies.
- ESPN cookie values must never be logged, displayed, or echoed anywhere (`Direction/facts-of-record.md` #6, `Blueprints/hard-prohibitions.md` #9).
- Omen's current architecture needs the raw cookie *values* server-side (Vault-encrypted, replayed by the backend on each ESPN API call) — it does not currently support a "device fetches the data, backend never sees the cookie" model.
- Justin considers ESPN-connection friction on iOS the single biggest product-adoption risk. This research exists to stop us from committing engineering time to an extension before confirming it can actually work on iOS.

## Candidates Evaluated

### A. Chrome/Firefox desktop extension (elevated `cookies` API)

- Availability: Free, open pattern — "ESPN Cookie Finder" already exists on the Chrome Web Store and Firefox Add-ons as prior art.
- Auth required: None (reads the user's own already-authenticated browser session).
- Commercial ToS: Reads only the user's own cookies for their own account; no ESPN ToS violation distinct from what manual DevTools copying already does.
- Technical complexity: Easy. Chrome's `chrome.cookies.get()` / Firefox's `browser.cookies.get()` are explicitly designed to expose `HttpOnly` cookie values to extensions holding the `cookies` permission + host permission for `espn.com` — this is documented, intentional elevated access, not a workaround (MDN: "Cookies API exposes HttpOnly cookie data to the extension"; Chrome for Developers `chrome.cookies` reference confirms the same).
- Maintenance risk: Low. Stable API, desktop Chrome/Firefox both support it today.
- Score: 5/5 — this is a real, working, low-effort desktop win.
- Notes: This is exactly what EXT1 (already in `current_sprint.md`) scoped. Nothing found here changes that plan.

### B. Safari Web Extension on iOS (the thing Justin is asking to build)

- Availability: Must ship inside a native iOS app and be distributed through the App Store — there is no lightweight/sideload install path on iOS (Apple Developer Docs, "Packaging and distributing Safari Web Extensions with App Store Connect"; "Safari web extensions must be distributed in the App Store, wrapped inside a native Mac or iOS app").
- Auth required: User must install the wrapper app, then manually enable the extension under Settings > Safari > Extensions — a real multi-step flow, not a one-tap install like the Chrome Web Store.
- **Critical finding: Safari's `browser.cookies` API does not support reading `HttpOnly` cookies, full stop.** An Apple Frameworks Engineer confirmed directly on the Apple Developer Forums ("HttpOnly cookie in browser.cookies API," thread 657931): *"MDN is correct, this is not supported at this time. If this is something you would like to see supported in Safari Web Extensions or App Extensions, please send your use cases via Feedback Assistant."* This is the opposite of Chrome/Firefox's behavior (Candidate A) — it is a deliberate Safari/WebKit security choice, not a bug, and there is no committed timeline to change it.
- Additional reliability risk even for non-HttpOnly cookies: `browser.cookies.getAll()` in Safari 17.5–18's background/service-worker scope has an open, reproducible bug returning empty arrays (Apple Developer Forums thread 761323, WebKit Bugzilla #281385), with only a partial `storeId`-iteration workaround and no official fix timeline.
- Technical complexity: Hard, and likely impossible for the actual goal (reading `espn_s2`) regardless of effort spent.
- Maintenance risk: High — even the workaround relies on undocumented behavior of a currently-buggy API.
- Score: 1/5 for the stated goal (extracting `espn_s2` on iOS). The extension can still open/link to ESPN and detect login state, but it cannot get the credential value out.

### C. Native iOS app + embedded `WKWebView`, reading cookies via `WKHTTPCookieStore`

- Availability: Would require building and shipping a native iOS app (not just an extension) — much larger scope than a browser extension.
- Technical complexity: Medium-to-hard engineering, but the harder problem is the same wall as Candidate B: WebKit test fixtures (`WebKit/WebKit` `WKHTTPCookieStore.mm` test suite) show `getAllCookies()` excluding a deleted `HttpOnly` cookie from its count, consistent with WebKit enforcing `HttpOnly` at the engine level for *all* cookie-store consumers, not just extensions. No documentation was found stating `WKHTTPCookieStore` gets special elevated access that `browser.cookies` lacks — they sit on the same underlying WebKit cookie store.
- Maintenance risk: High (unconfirmed by direct Apple documentation either way — see Approval Required below).
- Score: 2/5 — plausible fallback shape (see Phase 2 below) but the cookie-*extraction* version of this idea likely hits the identical `HttpOnly` wall as Candidate B.

### D. Native iOS app + embedded `WKWebView` that fetches ESPN's data directly, without ever extracting the cookie

- Availability: Not prior art we found for ESPN specifically, but this is a standard pattern for "log in inside our app, we relay results" integrations.
- Mechanism: The webview logs the user into `espn.com` as normal. Instead of trying to read `espn_s2` out of the cookie store afterward, an injected script (or the webview's own navigation) calls ESPN's fantasy API endpoints *from inside that authenticated browsing context* — the browser attaches the `HttpOnly` cookie automatically to same-origin requests, the same way it would for any normal page load. The JSON response (league/roster data, not the credential) gets relayed back to the native app and up to Omen's backend.
- Auth required: None beyond the user's normal ESPN login, done once inside the app.
- Technical complexity: Medium. Sidesteps the entire `HttpOnly` problem because it never asks for the raw cookie value.
- Architectural cost: This is a real scope change for Omen — currently the backend polls ESPN server-side using a stored cookie; this pattern would need either (a) periodic on-device refresh triggered when the user opens the app, or (b) a background-refresh mechanism, neither of which exists today. It also only works from *inside a native app*, not a lightweight web extension — the "build a web extension" framing doesn't fit this option.
- Maintenance risk: Medium — depends on ESPN's undocumented endpoints staying stable, same risk profile Omen already accepts for ESPN in general.
- Score: 4/5 for "actually solves iOS," 2/5 for "matches what was asked" (this is an app, not an extension).

### E. Manual cookie entry via desktop, carried over to mobile (status quo, no build)

- Availability: Already built and shipped today.
- Technical complexity: None (existing).
- Score: 3/5 as a permanent iOS answer — it works, but it requires the user to own a second device (or connect an iPhone to a Mac via Safari's remote Web Inspector, itself a desktop-Mac-required flow) to ever get the value in the first place, since **iOS has no on-device way to view a raw cookie value at all.** Settings > Safari > Advanced > Website Data only lists which sites have stored data — it does not expose cookie contents (confirmed via Apple discussion threads and cookie-inspection guides). There is no iOS Safari "inspect element" without a paired Mac.

## Ranked Summary

| Category | Winner | Runner-Up | Notes |
|---|---|---|---|
| Best open source / free | Candidate A (Chrome/Firefox desktop extension) | — | Already prior art (ESPN Cookie Finder); matches existing EXT1 scope |
| Best value | Candidate D (native app, in-context fetch) | Candidate E (manual entry) | D is real engineering but is the only iOS path that actually works without a Mac |
| Best overall | Candidate D | Candidate A (desktop) | Together: extension for desktop, native-app in-context fetch for iOS |

## Actionable Recommendation

**Build against:** Candidate A (desktop Chrome/Firefox extension, `chrome.cookies`/`browser.cookies` with host permission for `espn.com`) exactly as EXT1 already scopes it. This is a real, low-risk desktop win — build it.

**Skip:** A Safari Web Extension on iOS built specifically to extract `espn_s2`/`SWID`. Apple's own engineering staff confirmed `HttpOnly` cookies are not accessible via `browser.cookies` in Safari Web Extensions, "not supported at this time," with no committed fix. Spending engineering time on this for the stated goal is very likely wasted effort — it would ship as an app-wrapper project (App Store review, native app maintenance) that still can't read the one value it exists to read.

**Phase 1 now:** Ship Candidate A (desktop extension) as already planned under EXT1. For iOS, do **not** promise "install our extension" — the honest interim story is the existing manual-entry flow, with copy that's upfront about needing either a desktop browser or a Mac-paired iPhone to obtain the cookie the first time (this is a real UX gap worth being honest about, not hidden).

**Phase 2 later (the actual iOS fix):** Scope Candidate D — a native iOS app (or a minimal WebView-based companion flow, if Omen ships a native app for other reasons anyway) where the user logs into ESPN inside an app-controlled `WKWebView` and the app relays ESPN's own JSON responses back to Omen's backend, never touching the raw cookie. This is a bigger project (native app, not a browser extension) and should be scoped as its own decision, not folded into "build a web extension."

**Before committing to Phase 2:** This memo's most load-bearing claims — that `espn_s2` is `HttpOnly`, and that `WKHTTPCookieStore.getAllCookies()` excludes `HttpOnly` cookies the same way `browser.cookies` does — are strongly inferred from indirect sources (WebKit test fixtures, community tooling conventions), not a single authoritative Apple statement confirming both facts together. A one-afternoon spike (log into espn.com in a throwaway `WKWebView` test project and call `WKWebsiteDataStore.default().httpCookieStore.getAllCookies`) would confirm or kill this recommendation for near-zero cost before any real scope is committed. Recommend doing that spike first.

## Implementation Notes for Codex (Phase 1 — desktop extension only)

- Manifest V3, `permissions: ["cookies"]`, `host_permissions: ["*://*.espn.com/*"]`.
- Read via `chrome.cookies.get({ url: "https://fantasy.espn.com", name: "espn_s2" })` and `{ name: "SWID" }` from the background service worker — do not attempt a content-script `document.cookie` read, it will return nothing for `HttpOnly` cookies.
- Never transmit the values anywhere except directly into Omen's existing connect form (autofill/copy), per EXT1's existing scope and the ESPN-cookie hard-prohibition.
- Test fixture: a fake `espn.com`-scoped `HttpOnly` cookie set via `chrome.cookies.set({ httpOnly: true, ... })` in a test harness, confirming the extension can still retrieve it (this is the exact mechanism the production read depends on).
- Fallback: if `chrome.cookies.get()` returns `null` (user not logged into ESPN in that browser), show the existing manual-entry instructions rather than a silent failure.

## Approval Required

- No new paid service, no new commercial ToS, no scraping beyond what's already accepted for ESPN. Desktop extension (Candidate A) needs no new approval beyond what EXT1 already anticipated.
- Phase 2 (native iOS app) would be new scope — a real "should Omen ship a native app" decision, plus Apple Developer Program enrollment — and should get its own explicit go/no-go before any design or build work starts.

## Sources Checked

- [ESPN Cookie Finder — Chrome Web Store](https://chromewebstore.google.com/detail/espn-cookie-finder/oapfffhnckhffnpiophbcmjnpomjkfcj?hl=en)
- [ESPN_S2 and SWID — GameDayBot](https://www.gamedaybot.com/help/espn_s2-and-swid/)
- [cwendt94/espn-api Discussion #150 — ESPN_2 and SWID Credentials](https://github.com/cwendt94/espn-api/discussions/150)
- [MDN — Work with the Cookies API](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Work_with_the_Cookies_API)
- [MDN — cookies.Cookie (httpOnly property)](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/cookies/Cookie)
- [Chrome for Developers — chrome.cookies API](https://developer.chrome.com/docs/extensions/reference/api/cookies)
- [Apple Developer Forums — HttpOnly cookie in browser.cookies API (thread 657931)](https://developer.apple.com/forums/thread/657931)
- [Apple Developer Forums — Get cookies, Safari web extension (thread 761323)](https://developer.apple.com/forums/thread/761323)
- [WebKit Bugzilla #281385 — Safari 18.0 extensions fail to set cookies with expirationDate](https://bugs.webkit.org/show_bug.cgi?id=281385)
- [Apple Developer Documentation — Packaging and distributing Safari Web Extensions with App Store Connect](https://developer.apple.com/documentation/safariservices/packaging-and-distributing-safari-web-extensions-with-app-store-connect)
- [Apple Developer Documentation — WKHTTPCookieStore](https://developer.apple.com/documentation/webkit/wkhttpcookiestore)
- [WebKit/WebKit — WKHTTPCookieStore.mm test fixtures](https://github.com/WebKit/WebKit/blob/main/Source/WebKit/UIProcess/API/Cocoa/WKHTTPCookieStore.h)
- [Apple Developer Discussions — Web Inspector cookie visibility, Mac-pairing requirement](https://discussions.apple.com/thread/2119844)

## Note on missing prior research

`current_sprint.md` and `agent_inbox.md` both cite `Direction/reviews/2026-07-05-espn-community-api-and-extension-research.md` as existing prior art on this exact topic. That file does not exist in the repo (confirmed via directory listing) — it's a dangling reference, not something this session skipped reading. Worth a doc-debt cleanup pass separately.

## Addendum 2026-07-07 — Spike result: Candidate D confirmed, and simplified

Justin ran the recommended validation spike live against his own real ESPN account (league 1566644325). Two findings that change the recommended architecture, for the better:

**1. The real reads API lives on a different subdomain than assumed.** ESPN's own frontend calls `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/2026/segments/0/leagues/{leagueId}` — not `fantasy.espn.com/apis/v3/...` (the path this memo originally guessed at, which the site itself no longer serves directly and instead 302s to a generic marketing page, explaining every earlier CORS/redirect failure in this session — those were wrong-endpoint errors, not cookie/auth failures). Confirmed via Chrome DevTools Network tab → "Copy as fetch" on a real, already-successful page-load request.

**2. That request is cross-origin (`fantasy.espn.com` page → `lm-api-reads.fantasy.espn.com` API), credentialed (`credentials: "include"`), and ESPN's server answers it with real, non-wildcard CORS headers permitting it (`sec-fetch-site: same-site` in the captured request confirms the browser treats these as same-site, cookie-sharing subdomains under `espn.com`, while still cross-origin for CORS purposes).** This means: whatever the exact `HttpOnly` status of `espn_s2`/`SWID` turns out to be, it doesn't matter for this approach — the browser (or a WebView) attaches the cookie automatically to this request the same way it does for any normal page load. Nothing needs to *read* the cookie's value at all.

**3. Two non-forbidden custom headers are required beyond a stock fetch:** `x-fantasy-platform: espn-fantasy-web` and `x-fantasy-source: kona` (plus `accept: application/json`). Everything else in the captured request (`sec-fetch-*`, `sec-ch-ua-*`) is browser-generated metadata that JS cannot override anyway, so it doesn't need to be deliberately replicated — the browser supplies real values automatically for any request, hand-written or not.

**Revised recommendation — supersedes this memo's original Phase 1/Phase 2 split:**

Both the desktop extension (Candidate A) and the iOS path (Candidate D) should use the **same mechanism**, and it's simpler and safer than either original plan: inject a script into a browsing context where the user is already logged into `espn.com` (a content script in a real tab for desktop; an injected script in an app-controlled `WKWebView` for iOS), call `lm-api-reads.fantasy.espn.com` directly with the two required headers, and relay the **resulting JSON** — never the cookie value — to Omen's backend.

This is an improvement over the original plan on both platforms:
- **Desktop:** no longer needs the elevated `chrome.cookies` API or host permission to read/transmit a raw secret value at all — the extension never touches `espn_s2`/`SWID`, only the JSON response. This is a strictly better security posture against `Blueprints/hard-prohibitions.md` #9 than the originally-planned cookie-extraction approach.
- **iOS:** confirms Candidate D's core assumption empirically (not just inferred from indirect sources) — a native app with an embedded `WKWebView` login step, followed by an injected-script fetch to the confirmed endpoint, should work without ever needing `WKHTTPCookieStore` to expose an `HttpOnly` value.

**Still open:** the native iOS app still needs an actual build environment. Local Xcode is not viable on the available hardware (2017 Intel MacBook Air; Xcode does not appear as installable in the Mac App Store on that machine, consistent with Apple's official Sonoma minimum of 2018-and-later Macs). A cloud Mac build path (GitHub Actions macOS runner, Codemagic, etc.) is the working assumption going forward unless newer hardware or an older direct-download Xcode build proves viable.
