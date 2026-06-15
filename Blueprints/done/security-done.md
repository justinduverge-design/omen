# Security Done (cross-cutting)

Apply to any change touching auth, data, secrets, or platform credentials.

## Gates

1. No secrets in code or env files committed (use `.env.example` with blanks)
2. Production secrets stay in KVM1's `.env.production` (off-git)
3. Supabase RLS reviewed for any new table or query path
4. Auth state checked server-side for any new protected route
5. Admin-only actions protected (Justin's user_id check or equivalent)
6. Logs don't leak tokens, cookies, ESPN credentials, or PII (verify via `slops-code-review` scrubber check)
7. **ESPN cookie values never logged, displayed, or echoed back to user. Anywhere. Ever.**
8. Sentry `beforeSend` scrubber active for any new error-emitting code path
9. `slops-code-review` security pass — P0/P1 findings either fixed or explicitly accepted by Justin
10. Dependency risks reviewed for any new npm/pip add (`npm audit` + `slops-code-review`)

## AAA mapping

All security gates → Accuracy (security failures are accuracy failures against the trust contract).
