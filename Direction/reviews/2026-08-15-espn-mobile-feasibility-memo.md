# ESPN mobile feasibility and policy decision memo

**Date:** 2026-08-15
**Discharges:** `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §10, **deliverable 7** — "ESPN mobile feasibility and policy decision memo." §10 states no "ESPN connected" UI starts until this is resolved.
**Status:** research and recommendation. **The policy decision is founder-owned.**

---

## ⛔ SUPERSEDED — the iOS recommendation in this memo is WRONG. Read this first.

**Corrected 2026-08-15, same day, on real-device evidence.**

**Safari Web Extensions cannot read HttpOnly cookies.** Apple states this is not supported, on iOS and macOS alike. `espn_s2` is HttpOnly — which is the entire reason this has to be an extension rather than a web page. **So the iOS Safari path cannot work, and §7.1 of this memo should not be acted on.**

### The evidence

On a real iPhone, with the extension installed and enabled, `espn.com` permission set to **Allow**, and the user signed in and viewing their own team page, the popup's own diagnostic reported:

```
espn_s2 → www.espn.com=empty(promise), fantasy.espn.com=empty(promise), espn.com=empty(promise)
SWID    → www.espn.com=empty(promise), fantasy.espn.com=empty(promise), espn.com=empty(promise)
cookies API: present
```

The API exists, the promise form resolves, permission is granted — and every read is empty. That is the documented HttpOnly limitation, not a bug in our code.

### How this memo got it wrong

§3 verified that the `cookies` **API is present** on Safari iOS 15+ using MDN browser-compat-data, and §4 verified the extension **converts and builds**. Both are true. Neither establishes that the API can read the *specific kind of cookie this product depends on*. **API presence was mistaken for capability**, and the one check that would have caught it — does Safari return HttpOnly cookies — was never run.

The build succeeding made it look verified. It wasn't; it was only compiled.

### What this changes

- **iOS ESPN via Safari extension: dead.** Not a bug to fix.
- **`M7-EspnSafariExtension`** must not be described as feasible. The target itself is sound engineering and stays in the tree, but it cannot deliver ESPN on iOS.
- **Android may now be the *only* mobile path.** Firefox's cookies API does return HttpOnly cookies, which inverts this memo's §3 conclusion a second time: Firefox needs a `setAccessLevel` port, but it can actually read what we need. **Verify that before building anything.**
- **iPhone users connect ESPN on desktop** for the foreseeable future. Sleeper remains the in-app path (`M5-NativeConnect`).
- One unexplored avenue from Apple's forums: a `storeId` parameter on the cookies call. Treat as unverified folklore, not a plan.

---

## 0. Summary

ESPN on mobile is **feasible on iOS today**, via a Safari Web Extension shipped inside the Omen iOS app. This was verified by conversion and build, not reasoned about.

The finding that changes the plan: **Firefox for Android cannot run this extension as written.** `storage.session.setAccessLevel()` — the mechanism `background.js` exists to call — is **not supported in Firefox at all**. An earlier read in this session called Firefox Android "the most open path"; on the API that actually matters, it is the closed one.

**Recommendation:** build the iOS Safari Web Extension into the existing Omen app. Treat Android as a separate, later decision with real porting work attached, not a parallel lift.

---

## 1. The constraint everything follows from

`espn_s2` is an **HttpOnly** cookie. Page JavaScript cannot read it — by design, that is what HttpOnly means. This is why `extension/README.md` notes the extension can read it "even though they're `HttpOnly` — that's why a plain webpage script can't do this."

Therefore:

- There is **no** bookmarklet, web page, or in-app JS trick that avoids an extension.
- Any mobile path runs through a browser that supports extensions **and** grants the `cookies` permission.
- An in-app WebView that captured the login would be both a contract violation (§2: Omen must never imply it collects ESPN credentials; §5: no raw cookie entry in a store build) and a store-review risk. **Not considered further.**

## 2. Mobile browser reality, verified

| Browser | Extensions on a phone | Source quality |
|---|---|---|
| Chrome Android | **No.** The desktop-style Chrome for Android effort explicitly scopes mobile out | secondary, consistent |
| Chrome iOS | No — WebKit, no extension model | well established |
| **Safari iOS** | **Yes** — Safari Web Extensions, distributed **bundled with an app** via the App Store, `cookies` API gated by per-site user consent | **primary** (Apple developer docs) |
| Firefox Android | Extensions yes, MV3 supported as of 2026 — **but see §3, the required API is missing** | primary (Mozilla) + BCD |
| Edge Android | Yes, on by default for Android 11+ / Edge 123+, but a **curated** sandboxed store | secondary, mixed quality — verify with Microsoft before planning around it |

## 3. API compatibility — checked against MDN browser-compat-data, not assumed

Every API the extension calls, resolved against `mdn/browser-compat-data`:

| API | Chrome | Firefox | Safari | Safari iOS |
|---|---|---|---|---|
| `cookies` (+ `cookies.get`) | 6 | 45 | 14 | **15** |
| `storage.session.setAccessLevel` | 102 | **not supported** | 16.4 | mirrors desktop |
| `storage.StorageArea.setAccessLevel` | 96 | **not supported** | 17.1 | mirrors desktop |

**iOS Safari supports everything the extension needs.** Nothing in the current code has to change to run there.

**Firefox does not support `setAccessLevel` on any platform.** `background.js` calls it specifically so `content-omen.js` can read the payload `popup.js` staged — without it, that read throws and the handoff silently fails. A Firefox port is therefore a **code change**, not a repackage: the staging step would need to move to message passing or a `storage.local` write with an immediate clear. That is real work and it carries its own privacy review, since `storage.local` persists where `storage.session` does not.

## 4. Feasibility, proven rather than argued

Ran Apple's official `xcrun safari-web-extension-converter` against `extension/`:

- Converted with **no errors**. The only warnings were missing icons — already a known gap in `extension/README.md`, not a blocker.
- The generated iOS project **builds clean** for the simulator.
- One real snag, worth recording because it will recur: the converter derived the app bundle id from the app *name* (`com.slopssaloon.omen.Omen-ESPN-Connect`) rather than the `--bundle-identifier` flag, producing "Embedded binary's bundle identifier is not prefixed with the parent app's bundle identifier." Fixed by aligning the ids. **Inside the Omen app this resolves naturally**, since the parent is `com.slopssaloon.omen` and the extension becomes `com.slopssaloon.omen.<suffix>`.

Artifacts are in the session scratchpad, deliberately **not** committed — a standalone wrapper app is not what we want in the repo (see §5).

## 5. The recommended shape, and why not the converter default

The converter produces a **standalone app** that hosts the extension. Shipping that would mean a *second* App Store app — a second download, a second listing, a second review. It also discards the entire advantage.

**Recommend instead: an app-extension target inside the existing Omen iOS app.**

An iPhone user installs Omen — which they are doing anyway — and the ESPN helper is *already on their device*. They enable it once in Safari settings. No second download, no store hunt, and critically **no desktop**.

### The flow that results

1. In Safari on their phone, sign in to ESPN Fantasy as normal.
2. Open Omen's connect page in Safari; the extension fills the form.
3. Tap Omen's own Connect button — the extension never submits on their behalf.
4. The app picks it up, because `platform_connections` is server-side per user.

They leave the app briefly. **They never leave the phone.** That is the actual founder requirement.

## 6. What this costs, stated plainly

- **A new bundle identifier** (`com.slopssaloon.omen.<suffix>`) must be registered on the Apple Developer account. **Founder-only** — Apple credentials are on the do-not-touch list.
- **New store-review surface.** A bundled Safari extension adds permissions and privacy-questionnaire answers to the Omen listing. `Blueprints/specs/mobile/omen-store-privacy-and-rating-answers-v1.md` and the review notes would both need a pass.
- **Provisioning.** A new target needs its own profile under team `6RWR5G9894`.
- **Icons.** Still the open gap from `extension/README.md`; a bundled extension makes it user-visible in Safari settings, so it stops being cosmetic.
- **The extension currently targets only** `slopssaloon.com/account/connect*` and `localhost:5173`. That is the right surface, but it means the mobile flow depends on the **web** connect page continuing to exist and work on a phone-sized screen. Worth confirming that page is usable at 390pt before selling this path.

## 7. Recommendation

1. **Build the iOS Safari Web Extension into the Omen app.** Verified feasible, no code changes needed, and it is the only path that keeps a user on their phone without a second download.
2. **Do not treat Android as parallel.** Firefox needs a real porting change (§3); Edge needs Microsoft's mobile curation and better verification. Decide Android after iOS ships and the flow is proven with real users.
3. **Keep desktop as the documented fallback**, not the headline. The published Chrome and Edge listings already cover it.
4. **This memo resolves deliverable 7 for iOS only.** Android ESPN remains unresolved, and §10's block on "ESPN connected" UI should be lifted for iOS alone.

## 8. What the founder is being asked to decide

1. Approve a **new bundle identifier** and the extra **store-review surface** for a bundled Safari extension.
2. Confirm ESPN-on-iOS is worth a slot before beta, versus shipping beta Sleeper-only and adding ESPN after.
3. Accept that **Android ESPN stays desktop-only for now**, or fund the Firefox porting work as its own item.

## 9. Evidence

- `xcrun safari-web-extension-converter` run against `extension/`: converted clean, generated iOS project builds for the simulator; bundle-id prefix snag identified and resolved.
- API support resolved against `mdn/browser-compat-data` (`webextensions/api/storage.json`, `webextensions/api/cookies.json`) rather than from memory or a blog.
- Apple developer documentation on Safari Web Extension App Store distribution and the consent-gated cookies permission.
- No provider account was accessed, no ESPN credential or cookie value was read, and nothing was published.
