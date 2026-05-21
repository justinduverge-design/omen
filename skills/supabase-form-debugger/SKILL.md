---
name: supabase-form-debugger
description: Debug Supabase-backed frontend forms that freeze, fail, show loading forever, do not insert rows, or behave differently between direct SQL and browser UI. Use for waitlists, magic-link forms, signup forms, RLS insert problems, Vite env issues, Supabase URL/key problems, and browser-to-Supabase integration failures.
---

# Supabase Form Debugger

Use this skill when a Supabase-backed browser form appears wired correctly but fails in the UI.

The goal is to prove each layer in order:

1. Database shape and RLS
2. Role grants and policies
3. Supabase URL and anon key availability
4. Direct `supabase-js` insert
5. Served Vite/browser env
6. Real browser submit
7. UI error handling

Do not guess from the visible button state alone.

## Workflow

### 1. Confirm The Symptom

Record what the user sees:

- Button stuck on loading
- Error message shown
- Success message missing
- Row not appearing in Supabase
- Email not received

Clarify whether the form is supposed to send email or only insert a row.

### 2. Check The Table And RLS

Use Supabase SQL/MCP or the dashboard to verify:

- Table exists
- Columns match the frontend insert
- RLS is enabled
- Insert policies exist for the roles the browser may use
- `anon` and `authenticated` have only the minimum required grants

For public waitlists, both `anon` and `authenticated` may need insert-only access because a signed-in browser session submits as `authenticated`, not `anon`.

Keep read access denied unless the product explicitly needs public reads.

### 3. Test Direct Supabase Client Insert

From the repo, run a small direct `supabase-js` insert with the same URL/key used by the frontend. Do not print secrets.

Check only booleans and error categories:

```js
require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;
console.log({ hasUrl: Boolean(url), hasKey: Boolean(key) });

const supabase = createClient(url, key);
const { error } = await supabase
  .from('table_name')
  .insert({ email: 'debug@example.invalid' });

console.log({
  insertOk: !error,
  errorCode: error && error.code,
  errorMessage: error && error.message,
});
```

If this fails with `fetch failed`, inspect DNS/host spelling before touching RLS.

Known pitfall: Supabase project API URLs use `.supabase.co`, not `.supabase.com`.

### 4. Inspect The Served Vite Bundle

Vite exposes env only when variable names start with `VITE_`, and the dev server must load the directory where those env files live.

Fetch a served source file and check for env keys without printing secret values:

```powershell
$r = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/src/lib/supabase.js?t=debug' -UseBasicParsing
$c = $r.Content
[pscustomobject]@{
  HasSupabaseUrlKey = $c.Contains('"VITE_SUPABASE_URL"')
  HasSupabaseAnonKey = $c.Contains('"VITE_SUPABASE_ANON_KEY"')
  UsesExpectedProject = $c.Contains('<project-ref>')
}
```

If the frontend app is under `frontend/` but env files live at the repo root, set Vite `envDir` to the repo root.

### 5. Browser-Test The Real Form

Use Playwright or a visible browser to submit the actual form.

Confirm:

- The button leaves loading state
- Success text appears
- No browser console errors
- A row appears in Supabase

Do not stop at "the API works"; the UI may still be using a stub client or stale bundle.

### 6. Fix The Smallest Confirmed Root Cause

Common fixes:

- Add missing insert policy/grant for `authenticated`
- Correct Supabase host from `.supabase.com` to `.supabase.co`
- Configure Vite `envDir`
- Restart Vite after env changes
- Add `try/catch` around submit handlers so thrown client errors show an error state instead of freezing

Keep the fix scoped. Do not modify deployment, secrets, DNS, SSL, or production config unless the user explicitly approves it.

## References

- `references/ai-agent-playbook.md` for a technical agent checklist.
- `references/nontechnical-playbook.md` for a human-friendly checklist.
