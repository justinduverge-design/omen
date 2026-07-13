# Remove Orphaned `omen_gdpr.js` — Handoff

## Outcome

Removed the unmounted `src/omen_gdpr.js` duplicate. The canonical privacy implementation remains `src/routes/userPrivacy.js`, mounted at `/api/user`.

## Changes

- Deleted `src/omen_gdpr.js`.
- Repointed `probo.yaml` privacy controls to concrete mounted-route functions.
- Updated `test/securitySql.test.js` to require the mounted route and reject the deleted path.
- Removed the dead file from `src/omen_prompt_loader.js`'s source-tree example.
- Closed the matching sprint and known-issue entries.

## Verification

- Focused security/privacy tests: 12/12.
- Full `npm test`: 388/388.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Frontend build passed with existing `NODE_ENV`, duplicate `Header.jsx` `className`, and large-chunk warnings.
- `git diff --check`: clean.
- Code review: `Blueprints/audits/2026-07-12-remove-orphan-omen-gdpr-code-review.md` — merge, no findings.

## Contract and Risk

- API contracts changed: none.
- Auth, data classification, consent, retention, schema, and credential flows changed: none.
- Security improves because raw Vault secret-id logging and an ad hoc service-key client are gone from executable source.
- Historical documents may retain the removed path as period evidence; they were not rewritten.

## Skill Receipt

- Skills invoked: `run-slops-saloon`, `slops-repo-inspector`, `slops-git-flow`, `slops-context-markdown`, `slops-code-review`, `slops-quality-baseline`.
- Considered but N/A: `slops-tdd` because mounted behavior did not change; `security-privacy-evidence` because no trust boundary changed; UI, copy, mobile, provider, and research skills because no user-visible or external behavior changed.
- Procedure gap: the compliance manifest tested a dead file rather than the mounted route; corrected here.

## Status

Complete locally on `codex/p1-remove-orphan-gdpr`. Not pushed, merged, or deployed.
