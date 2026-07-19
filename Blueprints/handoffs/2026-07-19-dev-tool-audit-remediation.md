# Handoff — Dev-Tool Audit Remediation

## Objective

Remove the development-only Promptfoo dependency advisory without changing Omen runtime behavior.

## Delivered

- Updated exact dev dependency `promptfoo` from `0.121.17` to `0.121.19`.
- Added a root `adm-zip: 0.6.0` override so Promptfoo's `onnxruntime-node` chain resolves the patched archive library.

## Verification

- `npm ci` completed from the committed lockfile.
- `npm audit --omit=dev --audit-level=moderate` — 0 vulnerabilities.
- `npm audit --audit-level=moderate` — 0 vulnerabilities.
- `npx --no-install promptfoo --version` — `0.121.19`.
- Promptfoo mock evaluation — 6/6 passed.
- `npm test` — 393/393 passed.
- `npm --prefix frontend run build` — passed with existing Vite warnings.
- `git diff --check` — clean.

## Scope Boundaries

No app source, runtime dependency declaration, auth, provider integration, secret, schema, deploy, production action, push, merge, or release changed.
