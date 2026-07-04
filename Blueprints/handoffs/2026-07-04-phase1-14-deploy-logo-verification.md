# 2026-07-04 - Phase 1.14 deploy logo verification

## Summary

Investigated the production logo-staleness report and added an additive post-deploy verification step to the KVM1 deploy workflow.

Current production is not stale by the available source evidence: the live SPA bundle references `omen-horizontal-lockup-transparent.png`, the transparent lockup asset is served from production, and the PR #75 / PR #76 deploy runs both completed successfully.

No deploy, restart, SSH, KVM mutation, secret read, package change, Docker change, DNS/SSL change, or production config change was performed in this session.

## Investigation Evidence

- PR #75 merge commit `642edaf` triggered Deploy to Hostinger KVM1 run `28672896614`; quality, build, and deploy jobs all completed successfully on 2026-07-03.
- PR #76 merge commit `339da00` triggered Deploy to Hostinger KVM1 run `28674663739`; quality, build, and deploy jobs all completed successfully on 2026-07-03.
- PR #76 deploy job ran on self-hosted runner `corvus-kvm1-deploy` / machine `srv1737978`, pulled `ghcr.io/justinduverge-design/omen:main`, recreated `omen_api`, and health passed on attempt 2.
- Live `https://slopssaloon.com/` returned `200`, `Cache-Control: must-revalidate, no-cache`, and loaded `/assets/index--4Oa572S.js`.
- Live bundle `/assets/index--4Oa572S.js` contains `omen-horizontal-lockup-transparent.png` 4 times, contains no `omen-horizontal-lockup.png`, and contains no `[C]` literal.
- Live `/omen-horizontal-lockup-transparent.png` returns `200`, `Content-Type: image/png`, length `101205`, matching the local served asset length.

## Root Cause Read

Confirmed:

- The deploy workflow did trigger for both relevant merge commits.
- KVM1 did pull images and recreate containers for PR #76.
- Current production serves the transparent lockup asset and the live app bundle points at it.

Most likely:

- Justin's stale-prod check happened before the PR #76 deploy completed, from an already-open tab, or against a cached browser/runtime state.

Not supported by current evidence:

- Docker image cache stuck on the old image.
- KVM1 runner working-directory drift.
- Current CDN/server stale artifact.

Limitation:

- `GET /api/version` currently reports `git_sha`, `build_id`, and `image_tag` as `null`, so it cannot independently prove the deployed source commit. The workflow and served asset evidence carried this investigation.

## Files Changed

- `.github/workflows/deploy.yml`
- `test/deployHardening.test.js`

Unrelated dirty file present at closeout:

- `src/server.js` has a rate-limiter scoping change. It was not edited for Phase 1.14 and is not part of this task's implementation scope.

## Workflow Change

Added `Verify deployed Omen logo asset in SPA bundle` after the `/api/health` smoke:

1. Fetches the production HTML shell.
2. Extracts the hashed Vite JS bundle path.
3. Fetches that bundle.
4. Fails the workflow if the bundle does not contain `omen-horizontal-lockup-transparent.png`.
5. Checks that `/omen-horizontal-lockup-transparent.png` is reachable.

This is intentionally stronger than `curl / | grep omen-horizontal-lockup`, because Vite keeps the logo reference in the hashed JavaScript bundle, not the HTML shell.

## Verification

- RED: `node --test test\deployHardening.test.js` failed on the missing post-health logo verification step.
- GREEN focused: `node --test test\deployHardening.test.js` passed 3/3.
- GREEN full: `npm test` passed 402/402.
- GREEN audit: `npm audit --audit-level=moderate` found 0 vulnerabilities.
- GREEN diff: `git diff --check` clean.
- Live production probe: extracted `/assets/index--4Oa572S.js`; bundle contains `omen-horizontal-lockup-transparent.png`; asset HEAD returned `200`.

Not run:

- Frontend build. No frontend source or package files changed.
- GitHub workflow replay. That would require a deploy-capable workflow run and stays Justin-gated.

## Self-Review

`slops-code-review`: mergeable, no P0/P1.

- Scope is limited to one deploy verification step plus one regression test.
- The deploy step is read-only until a normal deploy run reaches it.
- No secrets or environment values are printed.
- The check follows the real Vite serving shape instead of grepping the HTML shell.
- No package, app source, auth, provider, SQL, Stripe, Docker, DNS, SSL, or production config behavior changed.

## Done Notes

Release Done applied as pipeline hardening, not as a production cut.

- Deploy gate N/A: no deploy was performed.
- KVM disk/memory N/A: no live release action was taken.
- Sentry/Tier-2 authenticated smoke N/A: no app runtime behavior changed.
- Rollback: revert this workflow/test commit before the next deploy if the check proves too strict.

Recommendation Done applied only to the deploy-process recommendation:

- Recommendation: keep this bundle-level logo check as the Phase 1.14 hardening gate.
- Future recommendation: consider adding build metadata to `/api/version` so future investigations can prove deployed commit without inferring from assets and Actions logs.

## Skill Receipt

Task: Phase 1.14 - Deploy verification + prod logo/`[C]` audit.

Change type: deploy workflow hardening + investigation.

Skills invoked:

- `slops-repo-inspector`
- `slops-deploy-guard`
- `slops-investigate`
- `slops-tdd`
- `slops-git-flow`
- `slops-quality-baseline`
- `slops-code-review`
- `slops-context-markdown`

Conditional skills considered but not applicable:

- `slops-ship`: no merge or deploy requested/performed.
- `slops-canary`: no new deploy happened; live checks were targeted read-only investigation probes.
- `slops-ui-ux-audit`: no user-visible UI changed.
- `security-privacy-evidence`: no auth, user data, secrets, credentials, telemetry, retention, provider data, or external sharing changed.
- `slops-taste` / `slops-ux-copy`: no design or copy changed.

Procedure gap found:

- `/api/version` does not expose build metadata in production (`git_sha`, `build_id`, `image_tag` are `null`). This did not block Phase 1.14, but it made source-of-deploy proof more indirect than it needs to be.

## Next

Do not merge `frontend/transparent-lockup` merely because Phase 1.14 is fixed; merge it only through the normal review/quality path. Once this workflow hardening lands, the next app deploy or approved manual workflow run will enforce the logo freshness check.
