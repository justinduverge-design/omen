# R6 — TestFlight tester-model evidence

**Observed 2026-08-23:** Apple build `0.1.0 (1)` is `Ready to Test` and is attached to the `Omen Internal Beta` group. The group's Add Testers dialog reports `0 of 100 Total Testers`, so there is currently nobody eligible to invite.

**Apple's access model:** TestFlight internal testers must first be App Store Connect users with access to the app and an eligible role (Account Holder, Admin, App Manager, Developer, or Marketing). External testers do not need App Store Connect access, but the first build added to an external group must pass TestFlight App Review.

Sources:

- https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers
- https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers

**Consequence:** R6's original assumption that ten or more ordinary real-user testers could use Apple's internal track without review was incorrect. Granting App Store Connect roles solely to make beta users eligible would expand production-account access and is not a safe substitute for Beta App Review.

**Founder decision — 2026-08-23:** use External TestFlight for the real-user cohort, including friends and fantasy-league participants, and accept first-build Beta App Review. Keep Internal Testing limited to genuine App Store Connect team members. No tester was invited and no role was granted when this evidence was recorded.

**Execution evidence — 2026-08-23:** the `Omen External Beta` group was created. The founder saved the TestFlight beta description and review contact; Build 1's `What to Test` explicitly identifies the incomplete League and Trade areas and prohibits credential-bearing feedback. The founder then submitted iOS version 0.1.0 (Build 1). App Store Connect reports `Waiting for Review`, shows `Remove from Review`, and lists both `Omen Internal Beta` and `Omen External Beta` on the build. The external group still has zero testers, so no invitation was sent.

**Android execution evidence — 2026-08-23:** Google Play's `Omen Internal Beta` email list was created with one founder-controlled Google account and selected for the internal track. The founder published version 0.1.0 (version code 1). Play Console reports the track `Active`, the release `Available to internal testers`, and a private opt-in link enabled. The only validation warnings were missing optional deobfuscation and native-debug-symbol files; neither blocked the rollout. Google still labels the app with the temporary package name because the app has not undergone public review. No installation is claimed yet.
