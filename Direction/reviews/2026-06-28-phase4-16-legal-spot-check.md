# Legal Spot Check - Phase 4.16 Provider Paragraphs

Date: 2026-06-28
Scope: Pre-counsel triage for `Legal/2026-06-28-open-agreements-provider-paragraphs.md`.
Status: Not legal advice. Does not approve publication.

## P0 / Do Not Publish Without Counsel

None in the draft packet itself, because it is clearly labeled as review-only and not public-facing.

## P1 / Counsel Strongly Recommended

### ESPN Cookie-Based Access

Risk: Disney Terms of Use restrict commercial/business-related use and automated extraction of Disney products without written permission. Omen's current ESPN integration depends on user-provided ESPN cookies and automated server-side requests to ESPN fantasy endpoints.

Draft handling: The packet does not claim permission. It labels ESPN cookies as sensitive credentials, states fragility, and flags counsel/founder review.

Required before publication: Counsel review and a product decision on whether ESPN access should stay public, be gated behind stronger consent, or remain limited while Omen seeks a safer integration path.

### Yahoo Commercial-Use Ambiguity

Risk: Yahoo Fantasy Sports API terms require attribution and restrict commercial activity unless permitted or authorized. Omen is currently free, but it is still a product operated by a business.

Draft handling: The packet includes attribution language and avoids endorsement/permission claims.

Required before publication: Counsel/founder decision on whether Omen needs Yahoo authorization or narrower Yahoo feature language.

### Sleeper Third-Party-Benefit Ambiguity

Risk: Sleeper API docs describe a free read-only API, but Sleeper's General Terms restrict commercial/business-purpose and third-party-benefit use. A prior Omen note records founder risk acceptance for Sleeper draft sync, not legal clearance.

Draft handling: The packet describes Sleeper use as read-only and labels the terms ambiguity.

Required before publication: Keep the caveat or get written permission / counsel comfort.

## P2 / Draft Revisions Sufficient

### Retention Language Needs Final Schedule

Risk: The packet uses purpose-based retention language but does not set exact retention windows for each data class.

Recommended revision before public page: Add a retention table covering platform connections, Vault secrets, move history, account records, consent/audit logs, and cache TTLs.

### AI Processing Needs Provider-Specific Finalization

Risk: The packet says cloud AI requires separate review, but a future `AI_PROVIDER=cloud` toggle would change privacy disclosures.

Recommended revision before public page: Keep this section generic until a cloud provider is approved; update immediately if cloud model calls receive user/platform data.

### Account Deletion Confirmation Phrase Mismatch

Risk: Sprint Phase 2.9 specifies `"DELETE MY OMEN DATA"`, while `src/omen_gdpr.js` currently checks `"DELETE MY ACCOUNT"` in the older module. Public privacy copy should not promise a specific phrase until the UI and route are reconciled.

Recommended revision before public page: Describe deletion capability without naming a confirmation phrase until Phase 2.9 lands.

## Clean Claims

- The packet avoids platform endorsement claims.
- The packet avoids saying ESPN cookie access is approved.
- The packet treats ESPN cookies and Yahoo tokens as credentials.
- The packet says Omen recommendations are informational and not betting/financial guarantees.
- The packet preserves mock/live discipline.

## Publication Gate

Do not publish this packet as-is. Use it as source material for an open-agreements ToS / Privacy Policy draft, then run counsel/founder review on the ESPN, Yahoo, Sleeper, retention, and AI-processing sections.
