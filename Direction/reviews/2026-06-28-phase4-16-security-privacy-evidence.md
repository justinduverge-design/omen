# Phase 4.16 Security And Privacy Evidence

Date: 2026-06-28
Audience: Justin / counsel prep / future open-agreements drafting
Scope: Evidence for Omen provider-specific ToS and Privacy Policy paragraphs. No code, secrets, production settings, or database state changed.

## Sources Reviewed

- `Blueprints/security-privacy.md`
- `Blueprints/playbooks/espn-recovery.md`
- `src/routes/platforms.js`
- `src/services/espnAuth.js`
- `src/services/yahooAuth.js`
- `src/omen_gdpr.js`
- `probo.yaml`
- `Direction/reviews/2026-06-19-legal-spot-check-sleeper-draft-sync.md`
- Yahoo Fantasy Sports APIs Terms of Use
- Yahoo Developer API Terms of Use
- Sleeper API documentation
- Sleeper General Terms of Use
- Sleeper Privacy Notice
- Disney Terms of Use
- Disney Privacy Policy
- Disney Cookies Policy

## Confirmed Evidence

| Control / Claim | Evidence | Source | Confidence |
|---|---|---|---|
| ESPN cookie values must never be logged or displayed | Explicit standing rule and playbook language | `Direction/facts-of-record.md`, `Blueprints/playbooks/espn-recovery.md`, `src/routes/platforms.js`, `src/services/espnAuth.js` | confirmed |
| ESPN cookies are stored through Vault references, not plaintext app columns | Platform connect route creates/upserts Vault secrets and stores secret ids on platform connection rows | `src/routes/platforms.js` | confirmed |
| Yahoo uses OAuth tokens and Vault-backed token storage | Yahoo auth service creates/updates Vault secrets for access and refresh tokens | `src/services/yahooAuth.js` | confirmed |
| Sleeper current connection path does not collect a Sleeper password or private token | Sleeper connect stores username/user id/league id; no token path found in route | `src/routes/platforms.js` | confirmed |
| User export redacts platform secrets | Export lists platform connection metadata but not tokens or Vault secret ids | `src/omen_gdpr.js`, `test/userPrivacyRoute.test.js` | confirmed |
| User deletion intends to delete Vault secrets and platform rows | GDPR/delete module deletes platform connections and Vault secrets | `src/omen_gdpr.js`, `probo.yaml` | confirmed |
| Provider data should not be sold or used for advertising | Privacy commitments in GDPR module state no sale/advertising use | `src/omen_gdpr.js` | confirmed as current code text |
| ESPN provider terms risk remains high | Disney terms restrict business/commercial use and automated extraction without permission | Disney Terms of Use | confirmed |
| Sleeper provider terms risk remains ambiguous | API docs say read-only/free; general terms restrict commercial/business/third-party-benefit use | Sleeper API docs, Sleeper General Terms, prior legal spot-check | confirmed |
| Yahoo provider terms require attribution and restrict commercial use | Yahoo Fantasy Sports API terms require attribution and restrict commercial activity unless authorized | Yahoo Fantasy Sports APIs Terms of Use | confirmed |

## Data Classification

| Data Type | Sensitivity | Source / Flow | Notes |
|---|---|---|---|
| ESPN `espn_s2` cookie | High / reusable credential | User submits through ESPN connect; stored in Vault | Never log, display, echo, send to analytics, or include in support artifacts. |
| ESPN `SWID` cookie | High / account-linked credential | User submits through ESPN connect; stored in Vault | Treat as sensitive with `espn_s2`. |
| Yahoo access token | High / OAuth credential | Yahoo OAuth callback + Vault | Do not display or expose. |
| Yahoo refresh token | High / OAuth credential | Yahoo OAuth callback + Vault | Do not display or expose. |
| Sleeper username/user id | Moderate | Sleeper connect route | Public-ish platform identifier but still user account data. |
| League id/team id/platform username | Moderate | Platform connections | Needed for product functionality; disclose collection. |
| Roster/standing/matchup/draft data | Moderate | Provider adapters | Fantasy data can reveal user league activity; disclose purpose and retention. |
| Recommendation/move history | Moderate | Omen `moves` records | Product output tied to user account. |
| Consent records / IP / user agent | Moderate to high | GDPR consent module | Used for compliance audit; retention needs counsel review. |
| AI prompts/outputs | Moderate | LLM narration path when enabled | Must exclude reusable provider credentials. |

## Consent And User Expectations

- Users should be told connecting a platform authorizes Omen to retrieve fantasy data needed for Omen features.
- ESPN users need extra plain-English warning because they are submitting cookie values, not using normal OAuth.
- Users should be told platform access can fail or be withdrawn by the provider.
- Users should be told Omen is not affiliated with or endorsed by the platforms.
- Deletion/disconnect copy should avoid promising more than the current implementation can verify.

## Access And RBAC Notes

- Vault RPCs should remain service-role only.
- Authenticated users should not receive Vault secret ids.
- Support/admin workflows must not ask users to paste ESPN cookie values into email, chat, screenshots, or public issue trackers.
- Any future AI/cloud provider path must exclude credentials and needs separate privacy review.

## External Systems

- Yahoo: OAuth, Yahoo Fantasy Sports API, provider-controlled rate limits and attribution.
- Sleeper: public read-only API, no token, IP-blocking risk above documented call frequency.
- ESPN/Disney: cookie-backed access only in Omen's current path; no official public OAuth fantasy API path identified for this task.
- Supabase: auth, database, Vault storage, service-role RPCs.
- Upstash Redis: caching in some provider paths; avoid caching reusable credentials.
- KVM2/local LLM: optional narration; must not receive credentials.

## Gaps And Unknowns

- No published Omen `/terms` or `/privacy` page was created in this task.
- No local `open-agreements` checkout exists, so no template/DOCX generation happened.
- Counsel has not reviewed ESPN cookie access.
- Yahoo commercial-use permissibility for Omen remains unresolved.
- Sleeper third-party-benefit/commercial ambiguity remains unresolved; prior founder risk acceptance exists for Sleeper live draft sync.
- Data retention periods should be tightened before publication; current draft uses purpose-based language, not final retention schedules.

## Approval Required

- Justin approval before turning this packet into public policy pages.
- Counsel review recommended before public launch copy relies on ESPN cookie access.
- Justin/counsel should decide whether the privacy policy can say "delete all associated data" or needs narrower retention/audit exceptions.

## Recommended Next Safe Step

Clone/install open-agreements outside this task boundary when Justin is ready, then insert the provider paragraphs into a full ToS / Privacy Policy draft with counsel-review flags preserved.
