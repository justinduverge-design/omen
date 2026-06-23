# Supabase Form Debugging Playbook For AI Agents

Use this when a Supabase-backed frontend form fails, freezes, or does not create rows.

## Investigation Order

1. Confirm the exact UI symptom and expected behavior.
2. Query Supabase for the user's submitted value.
3. Inspect table columns, RLS policies, and role grants.
4. Test a direct `supabase-js` insert using the same frontend URL/key.
5. Check DNS/host spelling if direct insert reports `fetch failed`.
6. Inspect the served Vite bundle for `VITE_` env availability.
7. Browser-test the real form with Playwright.
8. Patch only the confirmed root cause.
9. Rerun frontend build and relevant tests.
10. Update the handoff.

## Supabase SQL Checks

```sql
SELECT email, platform, created_at
FROM public.waitlist_signups
WHERE lower(email) = lower('<email>')
ORDER BY created_at DESC;
```

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'waitlist_signups'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;
```

```sql
SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'waitlist_signups'
ORDER BY policyname;
```

Expected public waitlist pattern:

- `anon`: INSERT only
- `authenticated`: INSERT only
- no SELECT/UPDATE/DELETE for browser roles
- RLS enabled
- insert policies for both roles if signed-in users can use the form

## Direct Client Insert

Do not print keys.

```js
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
console.log({
  hasUrl: Boolean(url),
  hasKey: Boolean(key),
  urlLooksLikeSupabaseCo: typeof url === 'string' && url.includes('.supabase.co'),
});

const supabase = createClient(url, key);
const { error } = await supabase
  .from('waitlist_signups')
  .insert({ email: 'debug@example.invalid', platform: 'ESPN' });

console.log({
  insertOk: !error,
  errorCode: error && error.code,
  errorMessage: error && error.message,
});
```

If the error is `TypeError: fetch failed` with `ENOTFOUND`, verify the Supabase URL host.

Known Omen pitfall: `.supabase.com` is wrong for the project API URL. Use `.supabase.co`.

## Vite Env Checks

```powershell
$r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/src/lib/supabase.js?t=debug' -UseBasicParsing
$c = $r.Content
[pscustomobject]@{
  HasUrlKey = $c.Contains('"VITE_SUPABASE_URL"')
  HasAnonKey = $c.Contains('"VITE_SUPABASE_ANON_KEY"')
  HasExpectedProject = $c.Contains('<project-ref>')
}
```

If the app lives in `frontend/` and env files live at the repo root, set `envDir` in `frontend/vite.config.js`.

## UI Hardening

Every async submit handler should catch thrown client errors:

```js
try {
  const { error } = await supabase.from('waitlist_signups').insert(payload);
  setStatus(error ? 'error' : 'success');
} catch {
  setStatus('error');
}
```

This prevents a permanent loading button when a network or config error throws.

## Verification Standard

The fix is done only when:

- direct client insert works
- browser submit shows success
- submitted row exists in Supabase
- browser roles still cannot read rows
- frontend build passes
- relevant tests pass
