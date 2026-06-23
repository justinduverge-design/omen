# Release Done

A release is done when CI is green, deploy succeeds, smoke tests pass, errors are monitored, and rollback steps are understood.

## Gates

1. `slops-quality-baseline` confirms `npm test` green at current baseline or higher (current documented baseline: 352/352 — never lower without an explained test deletion)
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
