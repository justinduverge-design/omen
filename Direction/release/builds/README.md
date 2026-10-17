# Build packages

One file per beta build: `build-NN.md`. A package is the record of a build: what was wrong, what we fixed, what
shipped where, and what we know is still broken. It starts as a plan when the build opens and becomes the
record when it ships.

**Cadence (founder, 2026-10-17):** a build ships when it is ready, not on a fixed Tuesday. It is a friends beta.

## Sections, in order

1. **Status**: open / ready / shipped, the dates, and the TestFlight build number.
2. **Goal**: one sentence on what this build is for.
3. **What was wrong**: the problems that started this build, with where they came from (tester, screenshot,
   probe, audit).
4. **What we fixed**: grouped by area. Each line says what changed and cites the PR.
5. **Where it lives**: what is in the app, what is backend-only, and what is behind a switch.
6. **Known issues / next**: what is still broken or deferred, and why. This list seeds the next package.
7. **Tester notes**: the paste-ready "What to Test" text, under 4,000 characters.
8. **Proof**: the tests, the device walk and the production checks that back the claims above.

Keep it short: link to the PRs and the decision log instead of copying them.
