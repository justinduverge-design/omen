# Phase 4.20b — Public Legal and Support Pages

## Outcome

Added public, no-auth `/privacy`, `/terms`, `/support`, and `/delete-account` pages. They are linked from the shared footer and use the existing Omen visual system.

## What Changed

- New public information layout plus four routed page components.
- Privacy and Terms copy use the Phase 4.16 packet and retain its provider caveats.
- Omen's obsolete payment-provider wording was removed; Omen is free and does not use Stripe.
- `/delete-account` documents and links to the existing authenticated `/account` deletion flow.
- Added approved monitored channels: `support@slopssaloon.com`, `privacy@slopssaloon.com`, and `legal@slopssaloon.com`.
- Support copy prohibits sending cookies, tokens, auth headers, or credential-bearing screenshots.

## Verification

- RED: public-route/contact test failed before the routes and channels existed.
- GREEN: focused test 3/3; full suite 391/391; audit 0; frontend build passed; `git diff --check` clean.
- Public browser checks at 375px, 390px, and 430px: no page errors, horizontal overflow, or undersized interactive elements.

## Evidence

- `Direction/reviews/2026-07-13-phase4-20b-security-privacy-evidence.md`
- `Direction/reviews/2026-07-13-phase4-20b-legal-spot-check.md`
- `Blueprints/audits/2026-07-13-phase4-20b-code-review.md`
- `Blueprints/audits/2026-07-13-phase4-20b-ui-ux-audit.md`

## Skill Receipt

Task: Phase 4.20b public legal/support pages.

Change type: Public frontend pages and privacy/support copy.

Skills invoked: `slops-repo-inspector`, `slops-tdd`, `slops-git-flow`, `security-privacy-evidence`, `slops-ux-copy`, `slops-ui-ux-audit`, `slops-mobile-smoke`, `slops-code-review`, `slops-quality-baseline`, `slops-legal-spot-check`, and `slops-context-markdown`.

Conditional skills considered but not applicable: `compliance-by-template` because the open-agreements checkout is unavailable and this task implements Justin-approved page copy rather than signable documents; `slops-ship`/`slops-canary` because nothing was merged or deployed; real-device mobile QA because this local build has not reached a release boundary.

Procedure gap found: the mobile-smoke driver is still a proposal, so the required viewport checks used the installed Playwright runtime directly and are documented in the UI audit.

## Status

Complete locally on `frontend/phase4-20b-public-legal-support`. Not committed, pushed, merged, or deployed.
