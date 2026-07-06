# App-Store / Mobile Readiness — Sprint Update Proposal

Date: 2026-07-05
Status: Planning only. No code, config, secrets, or production changed. Author: Claude (Cowork).
Scope: Response to ChatGPT's legal-exposure review flagging that App Store/Play Store-safe work is not yet represented in `Direction/current_sprint.md`.

Read before this: `Direction/current_sprint.md`, `Direction/release_readiness.md`, `Direction/decision_log.md`, `Blueprints/security-privacy.md`, `Legal/2026-06-28-open-agreements-provider-paragraphs.md`, `Direction/reviews/2026-06-28-phase4-16-legal-spot-check.md`, `frontend/src/routes/index.jsx`, `frontend/src/pages/Account.jsx`, `src/routes/userPrivacy.js`, `src/routes/platforms.js`, `src/middleware/security.js`, `src/omen_gdpr.js`.

## 1. What `current_sprint.md` already covers

- **Phase 1.13 — iOS Safari mobile QA sweep (done).** This is *responsive-web* mobile QA (touch targets, focus traps, Safari CSP repairs) via a real browser. It is not native app-store packaging and does not gate Stripe, ESPN, or legal pages.
- **Phase 2.15 — Account subscription card removal (open).** Hides the Pro upsell card on `/account` while billing is off. Web-only scope; does not create a mobile build profile.
- **Phase 2.9 — Account delete UI (done, local only).** Ships `DELETE /api/user/delete` from `/account`. Relevant to the `/delete-account` app-store requirement but not itself a public page.
- **Phase 4.16 — Open-agreements provider paragraphs (done, review-only).** Drafted ToS/Privacy paragraphs for ESPN/Yahoo/Sleeper. Explicitly not published; no `/privacy` or `/terms` route exists.
- **Phase 4.18 — Umami snippet (open, soft-blocked).** Unrelated to app-store readiness.

**Confirmed gap:** no lane, phase, or backlog item anywhere in `current_sprint.md` addresses a mobile/app-store build profile, and no `/privacy`, `/terms`, `/support`, or `/delete-account` route exists in `frontend/src/routes/index.jsx` (verified — only `/`, `/about`, `/login`, `/trade`, `/draft`, `/demo`, `/account*`, `/football`, `/omen`, `/ledger`, `/standings`, `/waiver` are registered).

## 2. What's missing (mapped to ChatGPT's seven concerns)

1. **No app-store-safe mobile build profile.** Nothing hides Stripe checkout, "Omen Pro" language, or ESPN cookie connect for a mobile build. `VITE_BILLING_ENABLED` already exists and gates the whole Subscription section in `Account.jsx`, but there is no equivalent mobile-specific flag, and ESPN connect has zero gating of any kind in `frontend/src/routes/index.jsx` or `src/routes/platforms.js`.
2. **No public legal/support pages.** Confirmed absent from routes. Phase 4.16 content exists but is marked review-only and explicitly "not publication-ready" per its own header and the 2026-06-28 legal spot-check.
3. **ESPN risk untracked as a launch-gating decision.** The open question ("should Omen continue ESPN cookie-based access publicly before counsel review") already exists in `Legal/2026-06-28-open-agreements-provider-paragraphs.md` → Open Questions, but it is not mirrored into `current_sprint.md`'s Decisions lane, so it isn't visible to an agent picking up the sprint queue.
4. **Stripe mobile posture undocumented as a standing decision.** Architecturally Stripe is already web-only-by-construction (`VITE_BILLING_ENABLED=false` today, gates the entire `SubscriptionSection`), but nothing in `decision_log.md` states "Stripe stays web-only; mobile ships free until native IAP" as a durable decision that survives someone flipping the billing flag.
5. **Provider/platform + gambling/DFS copy audit not scheduled.** No sprint item audits Landing/OmenLanding/onboarding copy or future app-store metadata for endorsement claims or betting-adjacent language.
6. **Account-deletion guardrail conflict — confirmed real.** `current_sprint.md` Guardrails (bottom of file) still reads *"Account deletion stays hidden until UX copy + Justin approval are explicit"*, while Phase 2.9 directly above is checked `[x]` complete, and `frontend/src/pages/Account.jsx`'s `PrivacySection` renders **unconditionally** — no feature flag, no auth-tier check gating it. The decision-log entry for Phase 2.9 says this is "local work only until Justin ships it" (branch not merged/deployed), so the guardrail may still be technically true for *production* but the wording ("stays hidden") no longer matches what the code does once merged, and gives no signal about deploy status. This needs reconciling, not just noting.
7. **Credential-logging bug — confirmed real, not hypothetical.** `src/routes/platforms.js`, `vaultDelete()` (lines 200–206):
   ```js
   async function vaultDelete(secretId) {
     if (!secretId) return;
     const { error } = await supabase.rpc("vault_delete_secret", { secret_id: secretId });
     if (error) {
       logger.warn("Vault secret deletion failed", { err: error.message, secretId });
     }
   }
   ```
   This logs the raw Vault `secretId` on RPC failure — a direct violation of `Blueprints/hard-prohibitions.md` #9 ("Don't log or display ESPN cookie values or any platform credential — anywhere, ever") and `Blueprints/security-privacy.md`'s "Never Log Or Display: Vault secret ids." Contrast with the correct pattern already in the same codebase, `src/routes/userPrivacy.js`'s `deleteVaultSecret()` (lines 55–61), which logs only `error.message`, no id. This is a live, currently-mounted route (`platforms.js` is required by `server.js`), so this is not dead code.

   **Bonus finding, not in the original list:** `src/omen_gdpr.js` still exists in the repo and contains the *same* anti-pattern (`log.ok(\`Vault secret deleted: ${secretId}\`)`), plus a different confirmation phrase (`"DELETE MY ACCOUNT"` vs. the live `"DELETE MY OMEN DATA"` in `userPrivacy.js`/`accountDeletion.js`), plus its own ad hoc Supabase/Redis clients bypassing `config.js`. Grep confirms it is **not required anywhere in `src/server.js`** — only `src/routes/userPrivacy.js` is mounted at `/api/user`. So the phrase-mismatch risk flagged in the 2026-06-28 legal spot-check is stale (the live route already matches the UI), but the dead file itself is a hazard: if anyone ever re-mounts it "to restore GDPR support," it reintroduces both the phrase mismatch and the plaintext secret-id logging bug. Recommend deleting or archiving it.

8. **Service-key route scoping — not yet systematically verified.** `platforms.js` and `userPrivacy.js` both instantiate a service-key Supabase client directly and manually add `.eq("user_id", ...)` per query. That pattern looks correct in the two files read here, but nothing in the sprint or `Blueprints/security-privacy.md` records a completed audit of *every* service-key route, and no test suite is cited as covering cross-user isolation.

## 3. Proposed new sprint items

### New lane: `Mobile / App Store Readiness`

Insert this lane immediately after `### Frontend — Phase 4` and before `### Verify` in `Direction/current_sprint.md`.

---

**Phase 4.20a — Mobile-build kill-switch layer**
- Lane: Mobile / App Store Readiness
- Priority: P0
- Cost: medium
- Blocked-by: none
- Done-when: a build-time flag (e.g. `VITE_APP_STORE_BUILD=true`, mirroring the existing `VITE_BILLING_ENABLED` pattern) exists such that when set: (a) `SubscriptionSection` in `Account.jsx` and any other Stripe checkout/portal entry point render nothing (not just visually hidden — unreachable, same as the current `BILLING_ENABLED` gate); (b) all "Omen Pro" / paid-unlock copy is suppressed app-wide; (c) the ESPN connect form/tab in `PlatformConnections.jsx` and `ConnectLeague.jsx` is not rendered and `/account/connect`'s ESPN path is unreachable in that build; (d) Yahoo and Sleeper connect remain available. A local build with the flag set and a build without it are both captured as evidence.
- Evidence required: build output diff or screenshot pair (flag on/off) showing Stripe UI and ESPN connect entry point absent when the flag is set; `npm test` full pass; no backend route/schema change (frontend-only + doc, unless the flag also needs to suppress `/api/stripe/*` or ESPN routes server-side — if so, split that into 4.20a-backend).
- Docs affected: `frontend/src/pages/Account.jsx`, `frontend/src/pages/ConnectLeague.jsx`, `frontend/src/components/platforms/PlatformConnections.jsx`, new env doc entry, `Blueprints/handoffs/backend-to-frontend.md` if any backend gating is added.

**Phase 4.20b — Public legal/support pages**
- Lane: Mobile / App Store Readiness
- Priority: P0
- Cost: medium
- Blocked-by: Justin/counsel sign-off on final wording (can build the pages and routes now using Phase 4.16 packet content plus the P1/P2 caveats from the 2026-06-28 legal spot-check verbatim; do not remove the "not legal advice" / open-questions framing without explicit approval).
- Done-when: `/privacy`, `/terms`, `/support`, `/delete-account` are registered public routes (non-PDF, reachable without auth) in `frontend/src/routes/index.jsx`; `/delete-account` links to (or documents) the actual `/account` → Delete Omen data flow rather than duplicating deletion logic; `/support` lists a real contact channel; all four pages are linked from app navigation/footer and from wherever app-store listings will point; content matches actual backend behavior (retention, Vault storage, ESPN/Yahoo/Sleeper attribution) per the Phase 4.16 packet, with the P1 items (ESPN, Yahoo, Sleeper sections) kept as-caveated, not stripped of risk language.
- Evidence required: routes render 200 unauthenticated; content diffed against `Legal/2026-06-28-open-agreements-provider-paragraphs.md` paragraph-by-paragraph; a reviewer confirms no removed caveats; `npm test` / frontend build clean.
- Docs affected: `frontend/src/routes/index.jsx`, four new page components, `Legal/` (mark packet as "published" once landed), `Blueprints/security-privacy.md` (cross-link).

**Phase 4.20c — Reviewer / demo access documentation**
- Lane: Mobile / App Store Readiness
- Priority: P0
- Cost: small
- Blocked-by: none
- Done-when: a doc (e.g. `Blueprints/playbooks/app-store-reviewer-access.md`) exists describing how an Apple/Google reviewer can access a working demo account with populated data, without needing a real Yahoo/Sleeper/ESPN connection (point at the existing `Demo` page/`dataMode` mock system rather than building new infra), including any credentials or demo-mode toggle instructions.
- Evidence required: file exists and a second person (or agent) can follow it cold and reach a populated demo state.
- Docs affected: new playbook file; `frontend/src/pages/Demo.jsx` reference only, no code change expected.

**Phase 4.20d — Store metadata, privacy-label, and gambling/DFS copy audit**
- Lane: Mobile / App Store Readiness
- Priority: P1
- Cost: medium
- Blocked-by: none (can run in parallel with 4.20a–c)
- Done-when: every surface listed — landing page, `/about` (OmenLanding), onboarding copy, account-connection copy, future app-store description/screenshots/social-preview copy — is greped and hand-reviewed for (a) betting/gambling/DFS/wagering/odds/guaranteed-winnings language and (b) unqualified "Yahoo/Sleeper/ESPN live" claims not paired with the "not endorsed by / not affiliated with" disclaimer from the Phase 4.16 packet's Platform Attribution Snippets. A findings table (surface → current copy → flagged risk → proposed replacement) is produced and any flagged copy is rewritten via `slops-ux-copy` or `design-md-author` conventions already used elsewhere in this sprint.
- Evidence required: findings table checked into `Direction/reviews/`; before/after diffs for any copy changed; confirmation the four Platform Attribution Snippets are reachable in-app wherever provider names appear.
- Docs affected: `frontend/src/pages/Landing.jsx`, `frontend/src/pages/OmenLanding.jsx`, `frontend/src/pages/Onboarding.jsx`, `README.md` (if it makes public platform claims), new findings doc.

**Phase 4.20 — App-store readiness hardening (integration + verification)**
- Lane: Mobile / App Store Readiness
- Priority: P0
- Cost: large
- Blocked-by: 4.20a, 4.20b, 4.20c, 4.20d, and the two Decisions-lane items below (ESPN posture, Stripe-mobile posture)
- Done-when (verbatim from the requested brief):
  - Mobile build has no external Stripe unlock path.
  - Mobile build has no ESPN cookie entry.
  - Public legal/support/delete pages render.
  - Store-copy review passes.
  - Provider affiliation disclaimers are present.
  - Privacy/data inventory matches actual backend behavior.
  - No betting/gambling/DFS claims appear in app metadata or public app copy.
  - Account deletion copy and current sprint guardrails no longer conflict (see Verify item below).
- Evidence required: a single closeout doc that links the evidence for each of the eight bullets above back to 4.20a–d's individual evidence, plus a fresh `npm test` / build / audit pass.
- Docs affected: `Direction/release_readiness.md` (add an "App-Store Readiness" status section), `Direction/current_sprint.md`, `Blueprints/handoffs/`.

### Decisions lane additions (append under existing `### Decisions` section)

- [ ] **ESPN public/mobile posture.** Decide whether ESPN cookie-based connection stays web-only-by-default, is hidden/disabled in the mobile build only (per 4.20a), or is gated behind explicit founder/counsel sign-off before any public or mobile launch. This question already exists in `Legal/2026-06-28-open-agreements-provider-paragraphs.md` → Open Questions but is not tracked in the sprint queue. Cost: small (decision memo + `decision_log.md` entry). Do not claim ESPN access is approved, endorsed, or guaranteed in any resulting copy.
- [ ] **Stripe mobile posture — make permanent, not just today's flag state.** Record explicitly in `decision_log.md`: Stripe/Checkout/Portal remain web-only; the mobile build ships free until StoreKit/Google Play Billing is intentionally built as a separate, later sprint item. Cost: small (decision + doc entry, references existing `VITE_BILLING_ENABLED` architecture — no code change required to make the decision itself).

### Backend — Bug fixes lane additions

- [ ] **Vault secretId plaintext logging in `vaultDelete()` (`src/routes/platforms.js` lines 200–206).** Priority: P0 (security). Cost: small. Blocked-by: none. Done-when: `logger.warn` call no longer includes the raw `secretId` field; replace with either no identifier or a hashed/truncated one consistent with the `userHash()` pattern already used in `src/routes/userPrivacy.js`. Evidence required: RED test asserting no raw secret id appears in any log call from this function; GREEN after fix; full `npm test`; grep confirms zero remaining raw-secretId log calls across `src/`. Docs affected: `src/routes/platforms.js`, `test/` (new or extended test file), `Blueprints/security-privacy.md` (no change needed, already documents the rule — this is a compliance fix, not a doctrine change).
- [ ] **Delete or archive orphaned `src/omen_gdpr.js`.** Priority: P1. Cost: small. Blocked-by: confirm-not-mounted (already confirmed via grep — not required anywhere in `src/server.js`). Done-when: file is removed from `src/` (or moved to `Archive/` per repo convention) since it is fully superseded by `src/routes/userPrivacy.js` + `frontend/src/lib/accountDeletion.js`, and its plaintext secret-id logging + stale `"DELETE MY ACCOUNT"` phrase pose a reintroduction risk if ever re-mounted. Evidence required: `grep -r "omen_gdpr"` across `src/` returns no `require(...)` call sites (already true); `npm test` unaffected; `git diff --check` clean. Docs affected: `src/omen_gdpr.js` (removed), decision log entry noting why.

### Verify lane additions

- [ ] **Reconcile account-deletion guardrail vs. Phase 2.9.** `current_sprint.md` Guardrails still states "Account deletion stays hidden until UX copy + Justin approval are explicit," while Phase 2.9 is checked `[x]` complete and `frontend/src/pages/Account.jsx`'s `PrivacySection` renders unconditionally with no feature flag. Determine and record: is the guardrail stale (feature is approved, just not yet deployed — in which case reword to something like "Account deletion ships once this branch merges/deploys; do not add a hidden-behind-flag requirement") or is the code ahead of approval (in which case add a flag before merge)? Priority: P0 (doc integrity / avoids an agent re-hiding a shipped feature, or shipping an unapproved one). Cost: small. Done-when: the Guardrails section and Phase 2.9 entry say the same thing, and the resolution is logged in `decision_log.md`.
- [ ] **Service-key Supabase route scoping audit.** `src/routes/platforms.js` and `src/routes/userPrivacy.js` both use a service-key client and manually scope every query by `user_id`; verify this holds for every other route using `config.supabaseServiceKey` (not just these two), and confirm each has either an existing cross-user-isolation test or gets one added. Priority: P1. Cost: medium. Done-when: a table (route file → query → scoping column → test reference) is produced and checked into `Direction/reviews/`, covering every service-key route in `src/routes/`; any unscoped query found is treated as a P0 bug fix, not closed silently.

## 4. Placement summary

| Item | Section in `current_sprint.md` |
|---|---|
| 4.20a–4.20d, 4.20 | New `### Mobile / App Store Readiness` lane, after `### Frontend — Phase 4`, before `### Verify` |
| ESPN posture decision, Stripe-mobile decision | Existing `### Decisions` section, appended |
| Vault secretId logging fix, orphaned `omen_gdpr.js` removal | Existing `### Backend — Bug fixes` section, appended |
| Account-deletion guardrail reconciliation, service-key scoping audit | Existing `### Verify` section, appended |

## 5. Stale/conflicting language flagged for edit

1. `Direction/current_sprint.md` → `## Guardrails` → *"Account deletion stays hidden until UX copy + Justin approval are explicit"* — conflicts with the completed, unconditional Phase 2.9 implementation. Do not silently edit; resolve via the Verify item above first, then edit both places to agree.
2. `Direction/reviews/2026-06-28-phase4-16-legal-spot-check.md` → P2 "Account Deletion Confirmation Phrase Mismatch" note is now stale: the live route (`userPrivacy.js` + `accountDeletion.js`) already uses `"DELETE MY OMEN DATA"` consistently. The mismatch it warned about only exists in the unmounted `src/omen_gdpr.js`. Recommend a short addendum note in that file (not a rewrite) once `omen_gdpr.js` is removed, rather than treating the original P2 as still open.
3. `src/omen_gdpr.js` itself is stale/dead code with its own baked-in checklist (`[ ] Privacy Policy page live at /privacy`, etc.) that duplicates what this proposal now tracks properly in the sprint — another reason to remove it rather than leave two sources of truth for the same launch checklist.

## 6. Not touched / explicitly out of scope here

No code was written or edited. No `.env`, secrets, DNS, SSL, Nginx, Supabase migrations, Stripe production behavior, or deploy workflows were touched. This document is planning input for Codex/Claude Code to execute one item at a time, each already scoped down to a single-PR-sized change.
