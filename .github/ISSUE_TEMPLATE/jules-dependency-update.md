---
name: Jules dependency update
about: Give Jules one bounded dependency update to investigate and submit as a PR
title: "deps: investigate <package> update"
---

## Source

- Dependency pull request or advisory: #
- Package(s):
- Runtime, development-only, or native tooling:

## Bounded task

Investigate only the named update. Preserve existing product, provider, authentication, database, and deployment behavior. Do not merge, deploy, alter secrets, or broaden the upgrade.

Run the relevant clean install, tests, audit, and build. Open a reviewable pull request with the version delta, compatibility risks, and validation evidence.

## Jules handoff

After this issue is reviewed for scope, manually add the `jules` label to start one Jules task. Do not add that label for broad inbox review, advisories without a planned remedy, or more than one update batch at a time.
