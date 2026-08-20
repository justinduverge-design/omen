# Release Done

A release is done when CI is green, deploy succeeds, smoke tests pass, errors are monitored, and rollback steps are understood.

> ✅ **UNBLOCKED — corrected 2026-08-19.** This file carried a ⛔ HARD-BLOCKED banner citing a GitHub Actions billing hold. **That hold never existed** — it was retracted on 2026-08-01 (see `Direction/agent_inbox.md` § the retraction entry). Actions was executing the whole time; the red was real config bugs, since fixed. The banner outlived the retraction by 18 days and would have blocked a legitimate Release Done closure on a premise already known to be false. Found while writing the `O2` rollback runbook — a stale gate is only discovered by someone trying to pass it.
>
> **Still true, and not part of the retraction:** work merged to `main` is merged, **not released** — never describe it as live or deployed without gate 4 evidence.

> **Rollback:** gates 11 and 16 point at `Blueprints/playbooks/rollback-runbook.md` (`O2`). Read it before a release, not during one. It records a real structural weakness — the pipeline publishes only `:main` and prunes the image it replaced — so "redeploy the previous tag" is not currently something you can do.

## Gates

1. `slops-quality-baseline` confirms `npm test` green at current baseline or higher (**current verified baseline: 417/417 on `main` @ `c393948`, 2026-07-27** — never lower without an explained test deletion)
2. `npm --prefix frontend run build` clean (bundle size logged, no regression >10%)
3. `npm audit --audit-level=moderate` clean except pre-existing `hono` transitive (or new advisory documented)
4. Deploy to KVM1 succeeds (CI/CD workflow returns success)
5. `/api/health` returns OK on production
6. `/api/ready` returns ready on production
7. Tier-2 authenticated production smoke — 13/13 (or current baseline)
8. Sentry monitoring active (frontend + backend) — events visible in dashboard
9. Release notes written (what shipped, what didn't, why)
10. Known issues documented in `Direction/known_issues.md` if any
11. **Rollback steps written — every release is rollback-ready by default** (commit hash to revert to, container tag to redeploy)
12. Recorded in `Direction/decision_log.md` with date + commit hashes
13. KVM1 disk + memory under 80% (check before + after)
14. No secrets in new diff (`git log -p | grep -iE "(sk_live|password|cookie|token|swid|espn_s2)"` returns nothing new)
15. `slops-ship` record links review, quality, merge, deploy, and rollback evidence
16. `slops-canary` returns PASS after deploy, or HOLD/ROLLBACK is executed and investigated
17. A 24h/7d `slops-product-pulse` follow-up is scheduled when the release changes user behavior, reliability, performance, or cost
18. Release skill receipt appended to `Blueprints/playbooks/skill-usage-ledger.md`

## AAA mapping

Release is operational Accuracy. No A/A breakdown.
