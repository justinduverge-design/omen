# Handoff — Native Mobile Pivot and Contract Foundation

**Date:** 2026-07-19  
**Branch:** `docs/native-mobile-contract-foundation`  
**Status:** Draft for Justin review  
**Scope:** Product/sprint direction only. No app code, deploy, secrets, store accounts, or production behavior changed.

## Decision captured

Justin wants Omen developed as real downloadable native applications:
- iPhone in SwiftUI;
- Android in Kotlin + Jetpack Compose.

The current React web app remains a service/API client and maintenance surface, but new web page migrations and web-only component expansion are paused.

## New authority

`Blueprints/specs/mobile/omen-native-mobile-foundation-v1.md` defines:
- the shared contract-first model;
- the deliberate Apple/Meta/ESPN/Yahoo/Sleeper/Omen blend;
- platform-neutral tokens and future theme-pack architecture;
- foundation vs Omen composition taxonomy;
- mobile screen map, navigation, and short progressive onboarding;
- separate SwiftUI and Compose architecture;
- native delivery milestones and App Store/Play safety boundaries.

## Next review

Approve or amend the founder decisions in section 13 before creating iOS/Android projects. The next build task after approval is M0: break the contract pack into small, reviewable specs.

## Explicit non-changes

- no revert;
- no web page migration;
- no native project created yet;
- no Apple/Google developer account action;
- no ESPN/mobile-cookie behavior change;
- no deployment or production modification.
