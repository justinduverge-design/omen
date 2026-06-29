# Phase 4.16 Provider Terms Research

Date: 2026-06-28
Layer: 2-Omen
Scope: Research for open-agreements custom ToS / Privacy Policy paragraphs covering ESPN cookie handling, Yahoo attribution, and Sleeper attribution.

## Research Question

What provider-specific terms, attribution, privacy, and credential-handling facts should Omen disclose when drafting its ToS and Privacy Policy paragraphs for Yahoo, Sleeper, and ESPN integrations?

## Constraints

- Use official provider sources where possible.
- Do not inspect or expose secrets, cookies, tokens, Vault ids, or production data.
- Do not claim legal clearance.
- Omen is currently free indefinitely, but provider terms can still restrict business, commercial, or third-party-benefit use.
- Output feeds an open-agreements-style draft packet, not Termly.

## Candidates / Sources Reviewed

### Yahoo Fantasy Sports APIs

- Availability: Official API with OAuth.
- Auth required: OAuth 2.0 for user fantasy data.
- Commercial ToS: Risky. Yahoo Fantasy Sports API terms prohibit use in connection with commercial activity unless permitted or authorized.
- Attribution: Required by the Yahoo Fantasy Sports API terms.
- Rate limits: Required; amounts are in API documentation and can change.
- Privacy: Yahoo API terms require user consent, privacy disclosures, and limits on data use/retention.
- Omen fit: Existing Yahoo OAuth integration; disclose Yahoo source, OAuth, token storage, and provider limits.
- Score: 3/5 for launch disclosure. Technically integrated, but commercial-use language needs counsel/founder attention.

### Sleeper API

- Availability: Official read-only HTTP API.
- Auth required: No API token for documented public read-only API.
- Commercial ToS: Ambiguous. API docs are permissive, but Sleeper General Terms restrict commercial/business/third-party-benefit use.
- Rate limits: Documentation advises staying under 1,000 calls per minute to avoid IP blocking.
- Privacy: Sleeper Privacy Notice applies to Sleeper's own services; Omen should separately disclose what Omen stores.
- Omen fit: Existing read-only integrations. Current Omen guardrails include no Sleeper password/token, connected-league ownership checks, caching, and safe errors.
- Score: 3/5 for launch disclosure. Usable but needs explicit risk label.

### ESPN / Disney

- Availability: No approved public OAuth fantasy API found for Omen's current use case.
- Auth required: User-provided ESPN session cookies in Omen's current implementation.
- Commercial ToS: High risk. Disney Terms restrict commercial/business-related use and automated extraction without written permission.
- Privacy/cookies: Disney Privacy and Cookies policies explain Disney's own cookie/tracking practices; Omen must disclose that Omen asks users to submit ESPN cookie values and treats them as credentials.
- Omen fit: Existing Vault-backed cookie flow; high-value but fragile and counsel-worthy.
- Score: 2/5 for launch disclosure. Keep only with visible risk acceptance and tight security language.

### Open-Agreements

- Availability: `open-agreements/open-agreements` is the intended SLOPS template workflow, but the local checkout is not installed in this workspace.
- Fit: Use this packet as custom product clauses to insert into an open-agreements-generated ToS / Privacy Policy later.
- Score: 4/5 for drafting workflow after setup; blocked for DOCX generation in this session.

## Ranked Summary

| Category | Winner | Runner-Up | Notes |
|---|---|---|---|
| Best official platform access | Yahoo | Sleeper | Yahoo has OAuth; Sleeper has read-only public API. |
| Lowest credential risk | Sleeper | Yahoo | Sleeper current path needs no user secret; Yahoo uses OAuth tokens; ESPN uses session cookies. |
| Highest legal/platform risk | ESPN | Yahoo / Sleeper | ESPN cookie automation is the sharpest issue. |
| Best drafting workflow | open-agreements custom clauses | Standalone markdown packet | Local open-agreements checkout is missing. |

## Actionable Recommendation

Build the legal packet around open-agreements, not Termly.

Use these positions:

- Yahoo: disclose OAuth, Yahoo source attribution, rate-limit/provider control, data-retention limits, and no Yahoo endorsement.
- Sleeper: disclose read-only public API usage, source attribution, no password/token collection, rate-limit caution, and terms ambiguity.
- ESPN: disclose cookie values as sensitive credentials, Vault-backed storage, no echo/log/analytics, fragility, and Disney-terms risk requiring counsel/founder review.

Skip:

- Any claim that Omen is approved, sponsored, certified, or endorsed by any provider.
- Any claim that ESPN cookie-based access is officially permitted.
- Any promise that provider data is always accurate or available.

## Approval Required

- Justin/counsel review before publishing ToS or Privacy Policy.
- Counsel strongly recommended before public ESPN cookie-based access is marketed.
- Justin must decide whether to keep ESPN public access, gate it, or add stronger user consent copy.

## Sources Checked

- Yahoo Fantasy Sports APIs Terms of Use: https://legal.yahoo.com/us/en/yahoo/terms/product-atos/fantasysportsapi/index.html
- Yahoo Developer API Terms of Use: https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apiforydn/index.html
- Yahoo Sports Developer Portal: https://sports.yahoo.com/developer/
- Sleeper API documentation: https://docs.sleeper.com/
- Sleeper General Terms of Use: https://support.sleeper.com/en/articles/5486620-general-terms-of-use
- Sleeper Privacy Notice: https://support.sleeper.com/en/articles/5486618-privacy-notice
- Disney Terms of Use: https://disneytermsofuse.com/english/
- Disney Privacy Policy: https://privacy.thewaltdisneycompany.com/en/current-privacy-policy/
- Disney Cookies Policy: https://privacy.thewaltdisneycompany.com/en/current-privacy-policy/cookies-policy/
- Open-agreements GitHub repo: https://github.com/open-agreements/open-agreements
- Common Paper standards: https://commonpaper.com/standards/
