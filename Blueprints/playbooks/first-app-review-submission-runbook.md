# First App Review submission — runbook

**Status:** Ready to execute. Everything an agent could verify is verified; what remains needs the
founder's Apple account.
**Date:** 2026-09-01
**Purpose:** `W1-REVIEW`. Get a build carrying the **existing** ESPN path through Apple's first Beta
App Review, so the guideline 5.2.2 question is answered before `W1-A` (the in-app ESPN sheet) is
built. See `Direction/decision_log.md` 2026-08-31.

## Verified on 2026-09-01 — do not re-derive

| Fact | Value | How it was checked |
|---|---|---|
| Bundle id | `com.slopssaloon.omen` | Release archive `Info.plist` |
| Version / build | `0.1.0` / `4` | Release archive `Info.plist` |
| Team | `6RWR5G9894` | Archive signing log |
| **Release archive builds** | **`** ARCHIVE SUCCEEDED **`** | `xcodebuild archive`, Release, `generic/platform=iOS` |
| API base URL in the archive | `https://slopssaloon.com` | Archive `Info.plist` — **not** the `example.invalid` default |
| Supabase URL / anon key | real values, publishable key | Archive `Info.plist` |
| Sentry DSN | present | Archive `Info.plist` |
| Safari extension | **not in the binary** | No target in `project.pbxproj`; no `PlugIns` in `Omen.app` |
| iOS unit tests | **318/318** | `xcodebuild test`, signed |
| Android `:app` unit tests | **106/106** | `./gradlew :app:testDebugUnitTest` |
| Reviewer demo path | works end to end | Driven on an iPhone 17 simulator |

**`release_readiness.md` listed "build upload untested" and flagged that the Valor Ventures transfer
might restrict App Store Connect.** The *archive* half is now proven. The *upload* half still is not,
because it needs the founder's account.

## Blockers cleared

- `W1-DEMO-NAMES` — demo fixtures now generic on both platforms (`4d101f3`). The reviewer notes'
  claim about generic player names is **now true**; it was false before this.
- `W1-CONSENT` — ESPN consent line on native Connect and the web ESPN card.
- `W1-TABBAR` — iOS tab bar tinted to the Omen accent.

## Two things to fix or accept before you submit

1. **`OMEN_IOS_APP_STORE_URL` is empty in the archive.** `ForcedUpdateView` opens this URL, so if the
   forced-update gate ever fires on this build, the button does nothing. It is chicken-and-egg — the
   URL does not exist until the App Store listing does — so **accepting it for the first submission
   is reasonable**, but it must be filled before the gate is ever used in anger. Do not raise
   `min-version` against a build whose store URL is blank.
2. **The archive signed with an *Apple Development* identity.** App Store distribution needs a
   Distribution certificate and an App Store provisioning profile. Xcode Organizer's **Distribute
   App** flow re-signs for distribution — expect it to ask, and expect that step to be where an
   account-transfer restriction would surface if one exists.

## Steps

1. **Confirm App Store Connect is operable** (`omen-1.0-plan.md` R1). Create or open the app record
   for `com.slopssaloon.omen`. If this fails, stop — it is the transfer risk, not the app.
2. **Archive** in Xcode: scheme `OmenIOS`, Any iOS Device, Product → Archive. Proven to succeed.
3. **Distribute App → App Store Connect → Upload.** Let Xcode manage distribution signing.
4. **Fill App Review Information.** Paste the block from
   `Blueprints/specs/mobile/omen-store-review-notes-v1.md` → "PASTE BLOCK — App Store Connect
   Notes". **Do not paste the Safari extension block** — that extension is not in this binary.
5. **Privacy and age rating:** `omen-store-privacy-and-rating-answers-v1.md`.
6. **Demo account: none needed.** Demo Mode is the reviewer's path, and it is still in this build on
   purpose — facts-of-record #19 defers the demo-mode cut until after the first approval.
7. **Submit for Beta App Review** (external TestFlight).
8. **Record the outcome** — approval, or the exact rejection text — in `Direction/decision_log.md`,
   then unblock or rescope `W1-A`.

## What the answer means

- **Approved:** ESPN survives review as it stands. `W1-A` proceeds and the in-app sheet is worth
  building.
- **Rejected on 5.2.2:** the rejection text is the most valuable artifact this whole effort produces.
  It tells you exactly what Apple objects to, before the sheet is built. The prepared answer in the
  Wave 1 contract goes back in the reply; if Apple asks for authorization, there is none, and the
  fallback is marking ESPN desktop-only at the provider-choice step.
- **Rejected on something else:** likelier than 5.2.2, honestly — first submissions usually trip on
  metadata, screenshots, or a broken path. The demo walk on 2026-09-01 found no dead ends.

## Known and accepted in this build

Light-mode contrast (#340) and Dynamic Type (#338) are Wave 2. Confidence still renders as the
numeric `72` with a gradient bar; bands are a payload-contract change, also Wave 2. None of these
block a beta review.
