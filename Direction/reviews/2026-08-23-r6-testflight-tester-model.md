# R6 — TestFlight tester-model evidence

**Observed 2026-08-23:** Apple build `0.1.0 (1)` is `Ready to Test` and is attached to the `Omen Internal Beta` group. The group's Add Testers dialog reports `0 of 100 Total Testers`, so there is currently nobody eligible to invite.

**Apple's access model:** TestFlight internal testers must first be App Store Connect users with access to the app and an eligible role (Account Holder, Admin, App Manager, Developer, or Marketing). External testers do not need App Store Connect access, but the first build added to an external group must pass TestFlight App Review.

Sources:

- https://developer.apple.com/help/app-store-connect/test-a-beta-version/add-internal-testers
- https://developer.apple.com/help/app-store-connect/test-a-beta-version/invite-external-testers

**Consequence:** R6's original assumption that ten or more ordinary real-user testers could use Apple's internal track without review was incorrect. Granting App Store Connect roles solely to make beta users eligible would expand production-account access and is not a safe substitute for Beta App Review.

**Founder decision — 2026-08-23:** use External TestFlight for the real-user cohort, including friends and fantasy-league participants, and accept first-build Beta App Review. Keep Internal Testing limited to genuine App Store Connect team members. No tester was invited and no role was granted when this evidence was recorded.
