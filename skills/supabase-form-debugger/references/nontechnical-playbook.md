# Supabase Form Debugging Playbook For Nontechnical Users

Use this when a form says it joined, gets stuck, or shows an error.

This checklist is written for the Corvus waitlist, but the same idea works for other Supabase forms.

## What Should Happen

The waitlist form does not send an email right now.

When it works, it should:

1. Save your email in the waitlist database.
2. Replace the form with the message: `You're on the list.`

No inbox email is expected unless a separate email automation is added later.

## Quick Things To Try

1. Hard-refresh the page.
   - Chrome on Windows: `Ctrl + Shift + R`
2. Enter the email again.
3. Pick a platform.
4. Click `Join the Waitlist`.
5. Wait up to 10 seconds.

If the button stays on `Joining...`, the page is probably stuck on an old or broken local build.

## What To Tell Codex

Send Codex:

- the email you tried
- the platform you selected
- what the button/message says
- whether you hard-refreshed first

Example:

```text
Check whether my waitlist signup reached Supabase.

Email: me@example.com
Platform: ESPN
The page shows: Something went wrong.
I already hard-refreshed.
```

## What Codex Should Check

Codex should verify:

1. Whether your email is in the Supabase waitlist table.
2. Whether the form is using the real Supabase connection.
3. Whether the local website is running on `localhost:5173`.
4. Whether the Supabase project URL ends in `.supabase.co`.
5. Whether the browser form can submit successfully.

## Common Causes

- The local web server is not running.
- The page needs a hard refresh.
- The frontend is missing its Supabase settings.
- The Supabase URL is typed with `.supabase.com` instead of `.supabase.co`.
- The database allows anonymous users but not signed-in users.
- The form hit a network error and needs better error handling.

## Success Sign

The success screen says:

```text
You're on the list.
The raven will send word.
```

That means the waitlist form worked.

## Important Note

The phrase `The raven will send word` is product copy. It does not mean an email is sent today. It means the signup was saved.
