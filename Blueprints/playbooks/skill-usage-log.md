# Skill usage log

One line per session. Replaces the hand-written ledger (`skill-usage-ledger.md`, now history). Used by the
three-weekly skill check (`Direction/reviews/2026-10-03-harness-design-outline.md` §5).

| Date | Task | Skills invoked | Skipped, and why |
|---|---|---|---|
| 2026-10-03 | Harness trim (review policy, map, cost report, archive) | none by name; procedure by hand | `slops-agent-docs-refresh` (rewrote the four bootstrap docs directly, then ran the drift check); `slops-code-review` (fresh-agent review run at the end) |
| 2026-10-05 | Football warehouse schedules foundation | fresh-agent code review; TDD procedure by hand | `slops-tdd` and `slops-code-review` were named by repo routing but unavailable in this runtime; equivalent focused tests, PostgreSQL 17 integrations, full suite, and a fresh parallel review were run |
| 2026-10-05 | Football warehouse current-season runner and database timeouts | parallel design/test/timeout reviews plus fresh-agent code review; TDD procedure by hand | `slops-tdd` and `slops-code-review` remained unavailable by name; equivalent focused tests, PostgreSQL 17 integrations, full suite, and review/fix/re-review were used |
2026-10-05 | Football warehouse runtime composition | cloud-environment-runtime (credential and managed-runtime boundaries); slops-tdd unavailable, equivalent focused TDD used | No deployment or production skills invoked because this slice does not activate infrastructure.
2026-10-05 | Warehouse command plus team-week, roster, and play-by-play families | slops-tdd unavailable, equivalent parallel TDD and fresh independent review used | Deployment, production, and monitoring skills skipped because no live infrastructure action was authorized in this batch.
2026-10-05 | Warehouse incident-response and commissioning decisions | operations:runbook | Live deployment and external-source research deferred to their existing sequence; this update changes authority and incident structure only.
2026-10-09 | Sentry Express finish-listener warning on /api/health | slops-code-review (fresh agent); slops-tdd/slops-investigate not invoked, equivalent red-first test and --trace-warnings repro used | No deploy or production skills: read-only docker logs only.
2026-10-10 | Fantasy metrics v1 spec (FM-XFP): rights research for excluded nflverse stats, xFP/opportunity/role/dynasty design | anthropic-skills:pre-build-research | slops-tdd not needed (spec only, no code); slops-code-review not available in this session, spec reviewed against the live nflverse column headers and warehouse schema instead.
2026-10-10 | Trend evidence v1 spec (FM-TREND) and fantasy-manager stats/scenarios catalogue | none (spec and research only) | slops-tdd not needed (no code); slops-code-review not available in this session, columns checked against live nflverse/FTN headers.
