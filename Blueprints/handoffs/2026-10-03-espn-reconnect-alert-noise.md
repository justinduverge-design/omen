# Handoff — 2026-10-03 — ESPN reconnect alert noise

## Outcome

The alert flood was an observability-classification defect, not an ESPN outage. With four beta users,
an inactive user's expired ESPN web session is normal account lifecycle. The shipped adapter reported
every rejection at its HTTP chokepoint, before higher layers converted it to the correct
`espn_reconnect_required` state.

Live, read-only GlitchTip evidence for the prior 14 days showed no unresolved issues, but two resolved
ESPN groups dominated the history: 102 `auth_rejected` events and 40 paired fan-directory HTTP 400
events. Their timestamps aligned. GlitchTip auto-resolve is healthy and has already exercised its real
resolve path; it was not the root cause.

## Implementation

- `src/middleware/providerErrors.js` accepts an explicit adapter-owned `expected` classification.
  It does not infer expectedness from status alone.
- `src/adapters/espn.js` classifies reads-api 401/403 and fan-directory 400 as the same expected
  reconnect lifecycle. These still reject to callers as status 401, preserving honest client recovery.
- ESPN 5xx, malformed bodies, transport failures, and unclassified authentication failures still
  create incidents.
- Fan-directory paths now replace their dynamic SWID segment with `[redacted]` before application
  logging or telemetry. The investigation found that query stripping alone had not contained it.
- Regression tests cover suppression, continued capture of unexpected 401s, paired fan-directory 400,
  continued 5xx capture, and absence of the SWID canary from stdout and telemetry.

## Live fleet action

The only active fleet warning was KVM2 `drift_enabled_units`. It was traced to Ubuntu's expected
`snapd` revision mount created by an automatic package refresh. With founder approval, Sentinel's KVM2
posture baseline was refreshed. A fresh posture check returned `HEALTHY`, `drift_categories=none`, and
`drift_pending=none`. No service was restarted, disabled, installed, or removed.

## Verification

- Focused provider/reconnect/route matrix: 143 passed, 0 failed.
- Full `npm test`: 1,550 passed, 0 failed, 1 intentional migration skip.
- `git diff --check`: PASS.
- Live GlitchTip/Beszel HTTP: 200 before implementation.
- Live GlitchTip unresolved issues: zero before implementation.
- Live KVM2 posture after baseline refresh: HEALTHY.

## Promotion boundary

The backend source change is local on `codex/espn-reconnect-alert-noise`. It has not been merged or
deployed. Production continues running the old classification until the branch is reviewed, merged,
and deployed under the normal founder-gated process.
