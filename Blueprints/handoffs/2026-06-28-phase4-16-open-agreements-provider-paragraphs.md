# Phase 4.16 Open-Agreements Provider Paragraphs Handoff

Date: 2026-06-28
Owner: Codex/backend-docs
Status: Complete locally. Review packet only; not published.

## Summary

Drafted Omen provider-specific ToS / Privacy Policy paragraphs for an open-agreements-based legal pack. Justin confirmed open-agreements is preferred over Termly, so this pass produced a custom clause packet rather than Termly copy.

## Files Changed

- `Legal/2026-06-28-open-agreements-provider-paragraphs.md`
- `Direction/reviews/2026-06-28-phase4-16-provider-terms-research.md`
- `Direction/reviews/2026-06-28-phase4-16-security-privacy-evidence.md`
- `Direction/reviews/2026-06-28-phase4-16-legal-spot-check.md`
- `Direction/agent_inbox.md`
- `Direction/current_sprint.md`
- `Direction/decision_log.md`
- `Blueprints/handoffs/backend-to-frontend.md`
- `Blueprints/done/LEDGER.md`
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/2026-06-28-phase4-16-open-agreements-provider-paragraphs.md`

## Contract Changes

No endpoint, API, request, response, frontend call, package, SQL, env, provider credential, Stripe, Supabase, or deploy behavior changed.

## Provider Positions Captured

- Yahoo: disclose OAuth, Yahoo source attribution, rate/provider control, data-retention limits, no endorsement, and commercial-use ambiguity.
- Sleeper: disclose read-only API usage, no Sleeper password/token collection, source attribution, rate caution, and third-party-benefit ambiguity.
- ESPN: disclose user-provided cookie handling as sensitive credentials, Vault-backed storage, no logging/display/analytics, fragility, and Disney terms risk.

## Verification

- Official/provider sources checked via web research on 2026-06-28.
- Source inspection confirmed Omen's Yahoo OAuth/Vault, ESPN cookie/Vault, Sleeper no-token route, security/privacy tracker, ESPN recovery playbook, and GDPR/delete evidence.
- Legal spot-check written with P1 counsel-review flags.
- Security/privacy evidence written with data classification and gaps.
- Markdown/diff hygiene: `git diff --check` clean.

## Skill Receipt

Task: Phase 4.16 Open-agreements provider paragraphs.

Change type: Legal/compliance draft packet + provider terms research + security/privacy evidence.

Skills invoked: `slops-repo-inspector`, `slops-context-markdown`, `pre-build-research`, `compliance-by-template`, `slops-legal-spot-check`, `security-privacy-evidence`, `slops-git-flow`.

Conditional skills considered but not applicable: `slops-tdd` / `slops-code-review` / `slops-quality-baseline` for code (no code changed), `slops-ui-ux-audit` / `mobile-first-qa-playbook` (no UI), `slops-ship` / `slops-canary` / `slops-deploy-guard` (no release/deploy), full DOCX generation through `open-agreements` (local checkout missing; Justin must approve/install clone separately).

Evidence: research, legal spot-check, security/privacy evidence, provider paragraph packet, `git diff --check`.

Procedure gap found: `compliance-by-template` still mentions replacing Termly, while the sprint item still said "Termly base." Justin resolved the direction in-session: prefer open-agreements.

## Remaining Limits

- Not legal advice.
- Not reviewed by counsel.
- Not published as `/terms` or `/privacy`.
- No open-agreements DOCX/template output generated because the local checkout is missing.
- ESPN, Yahoo, and Sleeper platform-terms risk remains open for Justin/counsel.
