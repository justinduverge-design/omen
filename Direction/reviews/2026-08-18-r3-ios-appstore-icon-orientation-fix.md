# R3-BUILD-iOS — App Store Bundle Validation Fixes

**Date:** 2026-08-18
**Author:** Claude, diagnosing live alongside Justin's actual Xcode/App Store Connect session
**Verdict:** Fixed. A signed archive uploaded and reached TestFlight — independently confirmed in the App Store Connect dashboard.

## Context

This item's remaining gap, per its own prior record, was purely the last mile: "no archive, distribution upload, TestFlight action, entitlement, or capability change occurred." Everything upstream — the Mac mini, Xcode 26.6, Automatic Signing for team `6RWR5G9894`, a real device install — was already proven. What follows is the troubleshooting trail from "Distribute App" throwing its first error through to a build actually reaching TestFlight, done live over several rounds as Justin worked the Xcode GUI and I diagnosed from the command line and App Store Connect's browser session in parallel.

## Round 1 — "The internet connection appears to be offline" / "No profiles ... were found"

First `Distribute App` attempt threw both errors together. General internet was confirmed fine (`curl` to `appstoreconnect.apple.com`, `developer.apple.com`, `developerservices2.apple.com` all returned clean `200`s), which made "offline" the misleading half of the message — Xcode's generic fallback when a request to Apple's backend is refused, not proof of no connectivity. `security find-identity -v -p codesigning` showed exactly one identity: `Apple Development: Justin Duverge Catalino` — no Distribution certificate existed at all, so Xcode's Automatic Signing had to create one on the fly and was failing to.

Hypothesis at this point: the unaccepted **Apple Developer Program License Agreement** banner (visible on the Apps list) was blocking provisioning-profile-related API calls. Justin accepted it. Same exact error persisted — ruling that out as the (sole) cause.

## Round 2 — Distribution certificate created manually

Justin created an `Apple Distribution: Valor Ventures Limited Liability Company` certificate directly via Xcode → Settings → Accounts → Manage Certificates. Confirmed present via `security find-identity` afterward — two valid identities now. Retried Distribute App from the *same* archive: **identical error, word for word.** That specific signature — the thing that was missing now verifiably exists, but the complaint repeats exactly — pointed at Xcode having cached its account/certificate state in memory rather than a still-broken underlying cause. Recommended a full Xcode quit-and-relaunch (not just closing Organizer).

## Round 3 — Real validation errors, certificate/profile problem resolved

After the restart, Distribute App got past authentication entirely and reached Apple's actual bundle-validation stage — a different, more specific set of errors:

- `90474` — "Invalid bundle. No orientations were specified" (`UISupportedInterfaceOrientations` missing from Info.plist)
- `90022` / `90023` — missing required app icon files (iPhone, iPad 152×152)
- `90713` — missing `CFBundleIconName` Info.plist value

This confirmed the certificate/profile problem was actually solved — these are unrelated, later-stage errors that only appear once a build authenticates and uploads successfully enough for Apple's server to inspect the bundle contents.

## Root causes found

1. **`ASSETCATALOG_COMPILER_APPICON_NAME = Omen` existed in the Debug build configuration but was missing entirely from Release.** `mobile/ios/OmenIOS/OmenIOS.xcodeproj/project.pbxproj` — confirmed by direct grep, not assumption. Since App Store archives build with the Release configuration, this meant a distribution build carried **no app-icon reference at all**, regardless of what assets existed on disk. This alone explains all three icon/CFBundleIconName errors.
2. **No `UISupportedInterfaceOrientations` key existed anywhere in `Info.plist`.** The project is Universal (`TARGETED_DEVICE_FAMILY = "1,2"`), and Apple's validator requires an explicit orientation declaration, more strictly enforced for apps that support iPad (their multitasking/Split View/Stage Manager requirement).
3. **A real, already-designed app icon existed and was simply never wired up.** `mobile/ios/OmenIOS/OmenIOS/Omen.icon` is a populated Icon Composer package (`icon.json` + `omen-icon-ring.svg` "Brass O" + `omen-icon-laces.svg` "Laces") — real brand artwork matching the approved Figma source (`b2-mark-figma-source` memory: file `Lmj3VyXmE1u2WhGbQOqUIk`, frame `omen-app-icon-master-1024`), not a placeholder. It was already correctly referenced in the pbxproj Resources build phase. The gap was purely root cause #1 — nothing pointed the Release build at it by name.

## Fix

- `project.pbxproj`: added `ASSETCATALOG_COMPILER_APPICON_NAME = Omen;` to the Release `XCBuildConfiguration`, matching the existing Debug entry.
- `Info.plist`: added `UISupportedInterfaceOrientations` (Portrait only — matches how the app has actually been built and tested throughout this project; nothing here has ever touched landscape) and `UISupportedInterfaceOrientations~ipad` (all four orientations, satisfying Apple's iPad-multitasking requirement without changing iPhone behavior at all).
- New `Assets.xcassets/Omen.appiconset/` — a flat 1024×1024 App Store marketing icon, added **alongside**, not instead of, the Icon Composer file. Source: `logos/omen-app-icon-1024.png`, confirmed via `sips` to be exactly 1024×1024 with no alpha channel (Apple's App Store icon requirement — a second candidate, `omen-favicon-app-icon.png`, was checked and rejected for having alpha). This is the same approved brand export the Icon Composer file's artwork traces back to, not new/invented art. Added as a belt-and-suspenders fallback because Icon Composer is new enough (iOS 18+/26 "Liquid Glass" era) that its coverage of the separate flat marketing-icon requirement wasn't something to assume without checking — and a local archive test (below) confirmed the two coexist without any naming conflict.

## Verification

- **Local, before asking for another GUI round-trip:** `xcodebuild archive -project OmenIOS.xcodeproj -scheme OmenIOS -configuration Release -destination "generic/platform=iOS"` — **`** ARCHIVE SUCCEEDED **`**, with both the Icon Composer icon and the new appiconset present, no duplicate-name or build error. This only proves the bundle compiles; it does not exercise Apple's server-side validation (that happens at upload time, using the distribution certificate/profile, which a raw `archive` action doesn't necessarily invoke — confirmed separately by this test's own signing log, which used the *development* identity, not distribution).
- **Real upload, real validation:** Justin re-archived through Xcode (fresh archive, since these are real bundle-content changes — the earlier archive predates the fix) and distributed. Upload succeeded.
- **Independent confirmation — not just Xcode's own "success" dialog:** navigated the App Store Connect browser session to the TestFlight tab directly. **Version 0.1.0, Build 1, Status: Processing, Date Created Aug 18, 2026 6:25 PM.** This replaced what was, earlier the same session, a confirmed-empty "Submit a build to start testing" state — the first build this app has ever had reach TestFlight.

## What this unblocks

- `R3-BUILD-iOS` itself — `Done when:` fully met (signed build reached TestFlight, repeatable path proven, option/cost already on record from the Mac mini purchase).
- `O6`'s iOS half — no longer blocked; wiring a Sentry client into the iOS app and proving a deliberate crash is now agent-buildable, mirroring the Android half already proven in PR #332.
- `M3A-QA`, `F10`'s iOS half, and `R6` all had `R3-BUILD-iOS` named as their gateway dependency in this item's own prior record — worth re-checking each individually rather than assuming this alone clears them, since each may carry its own additional gates.

## What's still open

- **Build 1 was still `Processing` at the time of this record** — full TestFlight availability (export compliance, internal-tester assignment) typically follows within minutes to a few hours and wasn't watched through to completion in this pass.
- **This was a debug-signed local archive path, not yet a repeatable CI-produced one** — `R3-BUILD-iOS`'s "repeatable path" clause is satisfied by "founder can do this again on the same Mac," not by an automated pipeline. No such pipeline exists or was scoped here.
- iOS crash-reporting SDK wiring itself (`O6`'s remaining iOS work) — not started in this pass.
