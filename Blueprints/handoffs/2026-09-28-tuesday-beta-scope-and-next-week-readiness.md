# 2026-09-28 — Tuesday beta scope and next-week readiness

## Outcome

The final pre-archive session now has a hard boundary: prepare and verify the 2026-09-29 iOS beta
candidate; Justin performs the archive tomorrow. Work that cannot honestly clear that boundary moved
to a dated 2026-10-06 readiness plan instead of remaining as ambiguous “if time allows” scope.

## Documentation changes

- `Direction/2026-09-29-tuesday-readiness.md` now says its reachability, Trade, and foundation sections
  are historical, records the current app-target build as 7, requires App Store Connect confirmation
  of the actual upload number, and preserves the archive as Justin's step.
- `Direction/2026-10-06-tuesday-readiness.md` opens the next checkpoint with the deliberately deferred
  football-intelligence activation/SQL chain, T3/T4/T5, Android release parity, #338, #340,
  league-switch client profiling, sprint reconciliation, and remaining beta follow-ups.

## Authority and truth boundaries

- This documentation lane changed no backend/native runtime code, package, SQL, production host,
  provider/store account, secret, branch, deployment, upload, or archive state.
- The next-week page is a readiness plan, not a sprint-state override and not implementation or
  production evidence.
- Health/readiness/version and release checks belong to the exact candidate SHA and may be recorded by
  the execution lane only after they actually run.
- Production football-intelligence activation stays fail-closed until artifact restore, RLS,
  publication, route, client, rollback, and observability evidence all pass.

## Verification

Documentation-only checks and repository close-out gates are recorded by the coordinating session.
No runtime test, deployment, App Store Connect check, or physical-device result is claimed here.

## Next safe step

Finish the exact 2026-09-29 candidate verification, record the archived SHA/build and phone evidence
after Justin's archive, then begin 2026-10-06 by reconciling `Direction/current_sprint.md` against
merged `main` before pulling any deferred implementation.

