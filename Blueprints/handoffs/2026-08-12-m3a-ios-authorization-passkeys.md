# M3A iOS authorization + passkey onramp — 2026-08-12

## Outcome

Omen's existing SwiftUI project now has a locally verified native authorization path on the founder's Mac and physical iPhone. Sign in with Apple has a real founder-observed successful ceremony. The iOS passkey implementation is code-complete and signed-device-build-complete, but it is not end-to-end complete until the AASA artifact is merged/deployed and the founder performs the Face ID pair/sign-in smoke.

M3A-QA remains open because its done-when is broader than the Apple happy path: the remaining Apple edge cases, email OTP, session restore, account deletion, log safety, and Android matrix are not all recorded as passing.

## Implementation

- Added the Sign in with Apple entitlement and retained Automatic Signing, team `6RWR5G9894`, bundle `com.slopssaloon.omen`.
- Added nonce and Apple view-model orchestration tests; the founder observed the native Apple sheet and successful authenticated state on the iPhone.
- Added native `ASAuthorizationPlatformPublicKeyCredentialProvider` authentication and registration ceremonies.
- Added the current official Supabase first-factor passkey contracts for authentication options/verify, registration options/verify, list, and delete through the existing `URLSession` transport. No SDK or client secret was added.
- Added passkey sign-in, post-auth pairing offer, and Account add/list/remove behavior using existing Omen primitives; no visual redesign or Figma work.
- Added `webcredentials:slopssaloon.com` to the signed entitlement.
- Added `frontend/public/.well-known/apple-app-site-association` for `6RWR5G9894.com.slopssaloon.omen` and an explicit Express route. The explicit route is required because default static serving ignores dot-prefixed paths.
- Kept `Config/Local.xcconfig` ignored. No local values, tokens, identity tokens, WebAuthn assertions, certificates, or private keys are in repository evidence.

## Verification

- Xcode: 26.6, build `17F113`.
- Simulator: `xcodebuild test -project mobile/ios/OmenIOS/OmenIOS.xcodeproj -scheme OmenIOS -destination 'platform=iOS Simulator,name=iPhone 17'` → **121 tests, 0 failures, TEST SUCCEEDED**.
- Passkey transport focused suite: 4 tests, 0 failures.
- AASA/cache unit suite: 7 tests, 0 failures.
- Frontend production build: succeeded and copied the extensionless AASA artifact into `frontend/dist/.well-known/`; the existing large-chunk warning remains unrelated.
- Local built-artifact HTTP smoke: `GET /.well-known/apple-app-site-association` returned 200 without a redirect, `Content-Type: application/json`, the intended short cache policy, and exactly `6RWR5G9894.com.slopssaloon.omen`. The smoke caught and fixed Express's default refusal to serve a dot-prefixed path.
- Full backend suite: 510 tests, 0 failures.
- Physical device: paired iPhone 15 (`iPhone15,4`) recognized; Automatic Signing build succeeded with the existing Apple Development identity and team provisioning profile; signed entitlements contain `application-identifier = 6RWR5G9894.com.slopssaloon.omen`, Apple Sign In `Default`, and `webcredentials:slopssaloon.com`; the final app installed and launched successfully while the phone was unlocked.
- New passkey actor-isolation warning was fixed. Remaining AppIntents metadata, interface-orientation, and launch-configuration warnings predate this auth scope and were not changed.
- UX-copy review: the brief's passkey labels, pairing prompt, empty state, and opaque recovery errors are concise, consistent, and action-oriented; no copy change was required.
- Source-level accessibility review: no P0/P1 found. New actions are native `Button`s through `OmenButton`, retain the shared 44-point minimum target/focus/loading semantics, use Dynamic Type roles and semantic colors, and expose textual labels. Full VoiceOver and large-text physical-device sweeps remain part of the open M3A/mobile QA matrix; this review does not claim them.
- Root and frontend moderate-level dependency audits: 0 vulnerabilities.
- Final `git diff --check`, plist/project validation, staged secret/local-config checks, unchanged-scheme check, and code self-review passed immediately before commit.

## Procedure receipt

- **Task:** M3A iOS Apple authorization evidence + iOS passkey onramp.
- **Change type:** native auth/provider behavior, signed capabilities, small existing-primitive UI additions, web-hosted AASA contract, tests, and evidence docs.
- **Skills invoked:** `run-slops-saloon`, `anthropic-skills:pre-build-research`, `supabase:supabase`, `engineering:code-review`, `design:ux-copy`, `design:accessibility-review`, `computer-use:computer-use`, and `github:yeet` for publication.
- **Conditional skills considered but not applicable:** Figma/design creation (explicitly out of scope), deployment/canary/release skills (no merge or production deploy), database/RLS review (no table/query change), dependency review beyond audit (no dependency added), and Android/mobile parity work (deferred by authority). Repository-named SLOPS skills unavailable in this runtime were not fabricated; the closest available review/quality equivalents and explicit command gates were used.
- **Evidence:** this handoff, the exact source/test files, `/private/tmp/omen-m3a-full-simulator-final.log`, and `/private/tmp/omen-m3a-device-build-final.log`.
- **Procedure gap found:** behavior-changing work was inherited in an uncommitted handoff state, so an intended pre-implementation RED was not available and is not retroactively claimed. The added suites were audited and run GREEN, then broader simulator/backend/build/device gates were run. Production AASA and full interactive accessibility/auth evidence remain externally gated.

## External boundary

As observed on 2026-08-12, `https://slopssaloon.com/.well-known/apple-app-site-association` and the Apple CDN endpoint return 404. No production deployment was performed. After review/merge/deploy:

1. Verify the public URL returns HTTP 200, no redirect, and JSON containing only the expected app identifier.
2. Allow Apple's associated-domain CDN to ingest the file.
3. Delete/reinstall the signed app so iOS refreshes the association.
4. Founder signs in with Apple or email, adds a passkey with Face ID, confirms it appears in Account, signs out, and signs back in using the passkey.
5. Record sanitized pass/fail evidence only.

## Boundaries preserved

No Xcode Cloud, archive, TestFlight, App Store upload, production deploy, Infisical mutation, provider secret retrieval, Android passkey work, UI redesign, Figma work, commit merge, or production infrastructure mutation was performed.
