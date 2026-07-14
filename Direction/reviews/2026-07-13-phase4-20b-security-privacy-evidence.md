# Phase 4.20b Public Pages — Security and Privacy Evidence

Date: 2026-07-13
Audience: Justin / final wording review
Scope: Evidence for the public privacy, terms, support, and account-deletion pages. No secrets, production settings, database state, or external provider accounts were inspected.

## Sources Reviewed

- `Legal/2026-06-28-open-agreements-provider-paragraphs.md`
- `Direction/reviews/2026-06-28-phase4-16-legal-spot-check.md`
- `Direction/reviews/2026-06-28-phase4-16-security-privacy-evidence.md`
- `Blueprints/security-privacy.md`
- `src/routes/userPrivacy.js`
- `frontend/src/pages/Privacy.jsx`
- `frontend/src/pages/Terms.jsx`
- `frontend/src/pages/DeleteAccount.jsx`
- `frontend/src/pages/Support.jsx`

## Confirmed Evidence

| Control / claim | Evidence | Source | Confidence |
|---|---|---|---|
| Public pages do not collect credentials | The four pages are static informational React pages; no forms or API calls were added. | `frontend/src/pages/{Privacy,Terms,DeleteAccount,Support}.jsx` | confirmed |
| ESPN and Yahoo credentials are described as sensitive | The pages say they are not displayed, shared, or sent to analytics; the existing evidence confirms Vault-backed storage. | `Privacy.jsx`; Phase 4.16 evidence | confirmed |
| Deletion copy matches the mounted endpoint | The route requires auth, exact confirmation, deletes moves/connections/OAuth state/consent records/user row, and records a hashed audit entry. | `src/routes/userPrivacy.js`; `DeleteAccount.jsx` | confirmed |
| Deletion page avoids an unsupported promise | It says limited non-personal audit records may remain and third-party platform data is outside Omen control. | `DeleteAccount.jsx`; `src/routes/userPrivacy.js` | confirmed |
| No payment-provider claim remains | The privacy page states Omen is free and does not use Stripe or another payment provider for this product. | `Privacy.jsx`; `Direction/decision_log.md` | confirmed |
| Platform non-affiliation remains visible | Privacy and Terms state Omen is not endorsed by or affiliated with Yahoo, Sleeper, ESPN, Disney, or the NFL. | `Privacy.jsx`; `Terms.jsx` | confirmed |

## Data Classification

| Data type | Sensitivity | Public-page treatment |
|---|---|---|
| ESPN session cookies / Yahoo OAuth tokens | High, reusable credentials | Described as sensitive; users are told not to send them through support channels. |
| Platform and league identifiers, roster and standings data | Moderate | Disclosed as product data used for recommendations, standings, history, and draft assistance. |
| Account, profile, consent, and move-history data | Moderate | Disclosed as account data; deletion behavior is linked to the mounted endpoint. |
| Deletion audit hash | Low to moderate | Disclosed only as limited non-personal audit retention; no implementation detail or identifier is exposed publicly. |

## Consent and User Expectations

- Connecting a platform authorizes Omen to retrieve the fantasy information required for product features.
- The public pages do not imply platform endorsement, API permission, continuous data availability, or guaranteed fantasy outcomes.
- ESPN cookie access remains explicitly fragile and subject to security, privacy, operational, and provider-terms limits.
- The support page tells users not to place credentials in public or support artifacts.

## Gaps and Approval Required

- Approved monitored contact channels: `support@slopssaloon.com` for account/product help, `privacy@slopssaloon.com` for privacy questions, and `legal@slopssaloon.com` for terms questions. The pages instruct users not to send reusable credentials through them.
- The P1 counsel/founder considerations from the Phase 4.16 legal spot-check remain: ESPN cookie access, Yahoo commercial-use ambiguity, Sleeper third-party-benefit ambiguity, retention schedule, and any future cloud-AI processing.
- This evidence is not legal advice or a legal-compliance approval.

## Recommended Next Safe Step

Complete the final wording review against the Phase 4.16 packet before merging this branch.
