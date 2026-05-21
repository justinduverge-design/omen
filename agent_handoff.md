# Agent Handoff

## Latest Handoff

Agent: Codex
Date: 2026-05-20
Task ID: CORVUS-028
Mode: Supabase waitlist debugging skill + playbooks

## What I Completed

Created a lightweight reusable skill for the waitlist/Supabase debugging pattern discovered during the Corvus waitlist fix.

New skill:
- `skills/supabase-form-debugger/SKILL.md`

Included two playbook copies:
- AI-agent playbook: `skills/supabase-form-debugger/references/ai-agent-playbook.md`
- Nontechnical user playbook: `skills/supabase-form-debugger/references/nontechnical-playbook.md`

Generated skill UI metadata:
- `skills/supabase-form-debugger/agents/openai.yaml`

Validated the skill:

```powershell
python C:\Users\JDuve\.codex\skills\.system\skill-creator\scripts\quick_validate.py C:\Users\JDuve\OneDrive\Desktop\SLOPS\ssffmvp\skills\supabase-form-debugger
```

Result:
- `Skill is valid!`

## What The Skill Captures

- Verify database/RLS before guessing.
- Test direct `supabase-js` insert.
- Check Vite `VITE_` env availability in the served bundle.
- Watch for the `.supabase.com` vs `.supabase.co` host typo.
- Browser-test the real form.
- Add `try/catch` to async submit handlers so buttons do not freeze on thrown client errors.

## Deploy Guard Preflight For slopssaloon.com

Justin said the new landing page should be pushed to `https://slopssaloon.com`.

I inspected deploy-related files only:
- `.github/workflows/deploy.yml`
- `Dockerfile`
- `docker-compose.yml`
- `scripts/oracle-https-setup.sh`

Findings:
- Production deploy path is Oracle via GitHub Actions.
- Push to `main` triggers `Deploy to Oracle`.
- Workflow builds/pushes API and cron images to GHCR.
- Oracle then pulls images and recreates `api` and `cron`.
- Smoke test checks `https://slopssaloon.com/api/health`.

Deploy guard status:
- System touched: repo files only.
- Risk level: medium-high because `slopssaloon.com` is production-facing.
- Approval needed: yes, for any actual push/deploy.
- Rollback path: revert the deploy commit or redeploy previous commit/image through the Oracle workflow.
- Safe next action: Justin explicitly says `deploy now` or asks Codex to prepare a commit/PR for review.

No deployment was performed.

## Files Changed

- `skills/supabase-form-debugger/SKILL.md`
- `skills/supabase-form-debugger/agents/openai.yaml`
- `skills/supabase-form-debugger/references/ai-agent-playbook.md`
- `skills/supabase-form-debugger/references/nontechnical-playbook.md`
- `agent_handoff.md`

## What Works Now

- The Supabase form debugging process is reusable as a skill.
- Both AI-facing and nontechnical playbooks exist for later refinement.
- The production deployment path has been identified without touching production.

## What Is Still Broken Or Uncertain

- The new landing page has not been deployed to `slopssaloon.com`.
- The repo may still need an intentional commit before production deploy.
- Actual production env values/secrets were not inspected.

## Recommended Next 3 Tasks

1. **Justin** — Decide whether to deploy now.
2. **Codex** — If approved, inspect git status, prepare a focused commit, and trigger the existing Oracle deploy path.
3. **Justin/Codex** — After deploy, smoke-test `https://slopssaloon.com`, the waitlist UI, and `/api/health`.

## Recommended Next Agent

Codex, only after explicit deployment approval.

## Exact Next Prompt

```text
You are Codex, the backend/repo worker for Corvus.

Deploy approval: yes, deploy now to slopssaloon.com using the existing Oracle GitHub Actions path.

Before deploying:
1. Show git status.
2. List the exact files that will be committed.
3. Run npm test.
4. Run cd frontend && npm run build.
5. Commit only the intended files.
6. Push to main only if the status and tests are clean.

Do not touch DNS, SSL/TLS, Nginx, production secrets, or .env files.
After deploy, verify https://slopssaloon.com/api/health and the landing page.
```

## Previous Handoff

Agent: Codex
Date: 2026-05-20
Task ID: CORVUS-027
Mode: Waitlist root-cause fix

## What I Completed

Fixed the local Corvus waitlist flow end to end.

Root cause:
- The local frontend was failing before it could insert waitlist rows.
- `frontend/` Vite did not load the repo-root `VITE_` environment values during normal `npm run dev`.
- When I manually loaded the repo env, `VITE_SUPABASE_URL` pointed to `xyudxfhqejbwvjngiwhw.supabase.com`, which does not resolve.
- The correct Supabase API host is `xyudxfhqejbwvjngiwhw.supabase.co`.
- The waitlist handler also lacked a `try/catch`, so thrown Supabase-client failures could leave the button stuck on `Joining...`.

Fixes:
- Updated `frontend/vite.config.js` to use the repo root as Vite's `envDir`, so normal `cd frontend && npm run dev` loads the repo `VITE_` env values.
- Updated `frontend/src/lib/supabase.js` to normalize `.supabase.com` to `.supabase.co` before creating the Supabase client.
- Updated `frontend/src/pages/Landing.jsx` waitlist submit to catch thrown client errors and show the existing error state instead of freezing on `Joining...`.

No `.env` files were read into the handoff, modified, printed, or exposed.

## Verification

Database/API:
- Direct Supabase insert failed with the unnormalized `.supabase.com` URL: `TypeError: fetch failed`, `ENOTFOUND`.
- Direct Supabase insert succeeded with the normalized `.supabase.co` URL.
- Confirmed the successful test row exists in `public.waitlist_signups`.

Local frontend:
- Restarted Vite using normal `npm run dev -- --host 127.0.0.1 --port 5173`.
- Confirmed `http://127.0.0.1:5173` returns 200.
- Confirmed served bundle includes the correct Supabase host after normalization.
- Ran a Playwright browser test against `http://127.0.0.1:5173`:
  - filled waitlist email
  - selected ESPN
  - clicked `Join the Waitlist`
  - saw `You're on the list.`
  - no browser console errors
- Confirmed the Playwright test email row exists in Supabase.

Tests:

```powershell
cd frontend
npm run build
```

Result:
- 96 modules transformed
- build passed
- Vite warning remains: `.env` contains `NODE_ENV=production`, which Vite says is unsupported for frontend builds.

```powershell
npm test
```

Result:
- 144 tests passed
- 0 failed

## Files Changed

- `frontend/vite.config.js`
- `frontend/src/lib/supabase.js`
- `frontend/src/pages/Landing.jsx`
- `agent_handoff.md`

## What Works Now

- The local waitlist form works in browser testing.
- Anonymous and signed-in users can insert waitlist rows.
- Anonymous and signed-in users still cannot read waitlist rows.
- The button no longer gets stuck on thrown Supabase-client failures.
- Normal local Vite startup now loads repo-root `VITE_` env values.

## What Is Still Broken Or Uncertain

- Justin's real email has not been resubmitted after the fix yet.
- The form still does not send confirmation emails; it only records the signup and shows success.
- `.env` still appears to contain a bad Supabase URL suffix and `NODE_ENV=production`; I did not modify `.env` because env files are protected.
- Duplicate waitlist emails are still allowed.

## Recommended Next 3 Tasks

1. **Justin** — Hard-refresh `localhost:5173`, submit the waitlist form again, and confirm the success message appears.
2. **Codex** — Recheck Supabase for Justin's real email after the fresh submit.
3. **Codex** — With explicit approval, fix the protected local `.env` typo from `.supabase.com` to `.supabase.co` and remove/relocate frontend-hostile `NODE_ENV=production`.

## Recommended Next Agent

Justin for browser retry, then Codex for one quick Supabase row check.

## Exact Next Prompt

```text
You are Codex, the engineering/backend/repo worker for Corvus.

Check whether my latest waitlist submission reached Supabase.

Email:
<paste email>

Do not deploy.
Do not touch DNS, SSL/TLS, Nginx, production secrets, or .env files.

Return:
1. Whether the email exists in public.waitlist_signups.
2. The stored platform value.
3. Whether the form should now be considered live.
```

## Previous Handoff

Agent: Codex
Date: 2026-05-20
Task ID: CORVUS-026
Mode: Local waitlist submit debugging

## What I Checked

Justin reported the waitlist form stayed stuck on `Joining...` and no email arrived.

Findings:
- The waitlist form does not send confirmation email. It only inserts into Supabase and should show a success state.
- Justin's email was not present in `public.waitlist_signups`.
- Supabase table/RLS was ready after CORVUS-025:
  - `anon` has insert-only access.
  - `authenticated` has insert-only access.
  - read access remains denied.
- The local Vite dev server was started without `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Because those env keys were missing, the frontend used the Supabase stub.
- The waitlist submit path called `supabase.from(...)`, which the stub does not implement, so the handler threw and left the button stuck on `Joining...`.

## What I Did

- Stopped only the Vite process I had started for local dev.
- Restarted Vite on `127.0.0.1:5173` with the repo env loaded into the process via `dotenv`.
- Did not print, edit, or expose env values.
- Confirmed `localhost:5173` returns HTTP 200.
- Confirmed the served frontend now includes the Vite Supabase env keys.

## Files Changed

- `agent_handoff.md`

## What Works Now

- The local Vite server is running again at `http://localhost:5173`.
- The browser bundle now has the Supabase env keys available.
- The next fresh submit should use the real Supabase client instead of the stub.

## What Is Still Broken Or Uncertain

- Justin must hard-refresh the stuck page before trying again.
- Justin's real email has not reached the table yet.
- The frontend still lacks a try/catch around waitlist submit, so a thrown client error can still leave the button stuck. This is a small frontend resilience bug for Claude to clean up.

## Recommended Next 3 Tasks

1. **Justin** — Hard-refresh `localhost:5173`, submit the waitlist form again, and look for the success message.
2. **Codex** — Recheck Supabase for Justin's email after the fresh submit.
3. **Claude** — Add a try/catch around the waitlist submit so thrown errors show the existing error message instead of freezing on `Joining...`.

## Recommended Next Agent

Justin for one fresh browser retry, then Codex to verify the row.

## Exact Next Prompt

```text
You are Codex, the engineering/backend/repo worker for Corvus.

Check whether my latest waitlist submission reached Supabase.

Email:
<paste email>

Do not deploy.
Do not touch DNS, SSL/TLS, Nginx, production secrets, or .env files.

Return:
1. Whether the email exists in public.waitlist_signups.
2. The stored platform value.
3. Whether the form should now be considered live.
```

## Previous Handoff

Agent: Codex
Date: 2026-05-20
Task ID: CORVUS-025
Mode: Waitlist authenticated insert fix

## What I Completed

Fixed the waitlist submit path for users who already have a Supabase session.

Root cause:
- The first waitlist table pass granted `INSERT` only to `anon`.
- The landing page uses the Supabase browser client.
- If Justin is already signed in, Supabase sends the request as `authenticated`, not `anon`.
- That meant signed-in users could get stuck/fail submitting the waitlist form.

Applied Supabase migration:

```sql
CREATE POLICY "authenticated_insert"
  ON public.waitlist_signups
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

GRANT INSERT ON TABLE public.waitlist_signups TO authenticated;
```

No frontend files changed.

## Verification

- Confirmed Justin's attempted email was not in the table before this fix.
- Confirmed table grants are now:
  - `anon`: `INSERT`
  - `authenticated`: `INSERT`
- Confirmed policies are now:
  - `anon_insert`
  - `authenticated_insert`
- Inserted an invalid test row as `authenticated` successfully.
- Confirmed `authenticated SELECT` is still denied with `permission denied for table waitlist_signups`.

Important UX note:
- The waitlist form does not send an email. It only stores the signup and shows the success message.
- If the button is stuck on `Joining...`, refresh the page and submit again after this fix.

## Files Changed

- `agent_handoff.md`

## What Works Now

- Anonymous users can submit the waitlist form.
- Signed-in users can submit the waitlist form.
- Neither anon nor authenticated users can read waitlist rows.

## What Is Still Broken Or Uncertain

- Browser-level retry with Justin's actual email still needs to be done after refreshing the page.
- Duplicate emails are still allowed because the optional unique constraint has not been added.
- The form still does not send confirmation emails; that is expected current behavior.

## Recommended Next 3 Tasks

1. **Justin** — Refresh `localhost:5173`, resubmit the waitlist form, and confirm the success message appears.
2. **Codex** — If duplicates are a concern, add a unique email constraint and adjust the UI error copy later.
3. **Claude** — If desired, change waitlist copy so users know it is a signup, not an email-confirmation flow.

## Recommended Next Agent

Justin for browser verification.

## Exact Next Prompt

```text
You are Codex, the engineering/backend/repo worker for Corvus.

Read:
- context.md
- current_sprint.md
- agent_rules.md
- agent_handoff.md

Do not deploy.
Do not touch DNS, SSL/TLS, Nginx, production secrets, or .env files.

Task:
Verify whether my latest waitlist submission reached Supabase.

Check:
1. Whether my email exists in public.waitlist_signups.
2. Which platform value was stored.
3. Whether anon/authenticated SELECT is still denied.

Update agent_handoff.md with the result.
```

## Previous Handoff

Agent: Codex
Date: 2026-05-20
Task ID: CORVUS-024
Mode: Supabase waitlist table + RLS

## What I Completed

Created the Supabase `public.waitlist_signups` table for the Corvus landing page waitlist form.

Applied schema:

```sql
CREATE TABLE IF NOT EXISTS public.waitlist_signups (
  id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text         NOT NULL,
  platform    text,
  created_at  timestamptz  NOT NULL DEFAULT now()
);
```

Applied RLS/access:

```sql
ALTER TABLE public.waitlist_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert"
  ON public.waitlist_signups
  FOR INSERT
  TO anon
  WITH CHECK (true);

REVOKE ALL ON TABLE public.waitlist_signups FROM anon, authenticated;
GRANT INSERT ON TABLE public.waitlist_signups TO anon;
```

I did not add the optional unique constraint on `email`; duplicates are still allowed for now.

## Verification

- Supabase project used: `Fantasy Football MVP` (`xyudxfhqejbwvjngiwhw`)
- Confirmed `public.waitlist_signups` exists with RLS enabled.
- Confirmed policy exists:
  - policy: `anon_insert`
  - role: `anon`
  - command: `INSERT`
  - check: `true`
- Confirmed `anon` has only `INSERT` table privilege.
- Inserted one invalid test row as `anon`:
  - `codex-waitlist-test-2026-05-20@example.invalid`
  - platform: `not sure yet`
- Confirmed the test row exists.
- Confirmed anonymous `SELECT` is denied with `permission denied for table waitlist_signups`.

Supabase security advisor note:
- The advisor flags `public.waitlist_signups.anon_insert` as an always-true INSERT policy. This is expected from the requested SQL and means public anonymous inserts are allowed. It does not grant anonymous read/update/delete privileges.
- The advisor also reported unrelated pre-existing warnings on other tables/functions; I did not modify those.

## Files Changed

- `agent_handoff.md`

## What Works Now

- The landing page call should now work:

```js
supabase.from('waitlist_signups').insert({ email, platform })
```

- Anonymous users can submit waitlist entries.
- Anonymous users cannot read waitlist rows.
- No frontend changes are required.

## What Is Still Broken Or Uncertain

- I did not perform browser UI verification of the landing page form.
- Authenticated users are not granted insert on this table. If a signed-in user submits the public waitlist form with an authenticated Supabase session, that may fail unless we also grant/policy `authenticated` insert.
- No email uniqueness constraint exists yet, so repeat signups are possible.

## Commands / Tools Run

```text
Read:
- context.md
- current_sprint.md
- agent_rules.md
- agent_handoff.md

Supabase MCP:
- list_projects
- apply_migration create_waitlist_signups
- list_tables public verbose
- execute_sql policy inspection
- execute_sql anon insert test
- execute_sql test-row count
- execute_sql role grant inspection
- execute_sql anon SELECT denial test
- get_advisors security
```

## Recommended Next 3 Tasks

1. **Justin** — Test the landing page waitlist form locally in the browser and confirm the success state appears.
2. **Codex** — If signed-in users should also be able to join the waitlist, add an authenticated INSERT grant/policy.
3. **Codex** — Review the unrelated Supabase advisor warnings in a separate security cleanup task.

## Recommended Next Agent

Justin for browser verification, then Codex only if the form fails for signed-in sessions or duplicate prevention becomes important.

## Exact Next Prompt

```text
You are Codex, the engineering/backend/repo worker for Corvus.

Read:
- context.md
- current_sprint.md
- agent_rules.md
- agent_handoff.md

Do not deploy.
Do not touch DNS, SSL/TLS, Nginx, production secrets, or .env files.
Do not change frontend files unless explicitly needed for a confirmed bug.

Task:
Verify the landing page waitlist form now works against Supabase.

Check:
1. The form submits successfully while unauthenticated.
2. The success message appears.
3. No waitlist rows are readable from the anon client.
4. If signed-in submission fails, recommend whether to add authenticated INSERT access.

Update agent_handoff.md with the result.
```

## Previous Handoff

Agent: Codex
Date: 2026-05-20
Task ID: CORVUS-023
Mode: Trade Analyzer verification - documentation only

## What I Verified

Trade Analyzer is already built and ready for Claude to feature on the homepage as Corvus's primary front-door product.

Frontend:
- Primary component: `frontend/src/pages/TradeAnalyzer.jsx`
- It is mounted inside the football app shell by `frontend/src/pages/Football.jsx`
- Football tab registration: `TABS` includes `{ id: 'trade', label: 'Trade Analyzer' }`
- Render path: `renderTab()` returns `<TradeAnalyzer />` for `case 'trade'`

Backend:
- Endpoint: `POST /api/trade/compare`
- Mount: `src/server.js` mounts `tradeRoutes` at `/api/trade`
- Route file: `src/routes/trade.js`
- Core valuation logic: `src/services/tradeValue.js`
- Auth: `requireAuth`

Implementation status:
- Status is **partial live MVP**, not mock.
- It computes a real deterministic comparison from submitted player names, positions, projected points, scoring format, and player statuses.
- It does not yet pull live rosters, live player projections, platform league data, or real market values.
- LLM explanation is attempted through `llm.explainTrade(...)`, but the deterministic verdict/value output is the reliable core.
- Public homepage copy should not imply unauthenticated users can run the live analyzer. The app CTA can safely say "Sign in to run your trade."

Tests:
- `test/tradeRoute.test.js`
- `test/tradeValue.test.js`
- Focused command run: `node --test test\tradeRoute.test.js test\tradeValue.test.js`
- Result: 20 tests passed, 0 failed.

Answer to Justin's verification questions:
1. Is Trade Analyzer already built? Yes.
2. What frontend file/component renders it? `frontend/src/pages/TradeAnalyzer.jsx`, rendered by `frontend/src/pages/Football.jsx`.
3. What backend endpoint powers it? `POST /api/trade/compare`.
4. Is it mock, live, or partial? Partial live MVP: deterministic backend analysis from manual inputs, no live platform/projection feed yet.
5. Are there tests? Yes: route and valuation tests both exist and pass.
6. Does anything block Claude from putting it front and center on the homepage? No. Claude can feature it now with a static example/result and a signed-in CTA. The only caveat is that the actual live endpoint is auth-gated.
7. Exact next Claude prompt is below.

## Files Changed

- `agent_handoff.md`

## Commands Run

```powershell
Get-Content context.md
Get-Content roadmap.md
Get-Content current_sprint.md
Get-Content decision_log.md
Get-Content agent_rules.md
Get-Content agent_inbox.md
Get-Content agent_handoff.md -TotalCount 220
Get-Content specs\002-homepage-product-priority\spec.md
Select-String -Path frontend\src\pages\TradeAnalyzer.jsx -Pattern "export default|function TradeAnalyzer|apiFetch|/api/trade/compare" -Context 0,2
Select-String -Path frontend\src\pages\Football.jsx -Pattern "TradeAnalyzer|case 'trade'|id: 'trade'" -Context 0,2
Select-String -Path src\routes\trade.js,src\server.js,src\services\tradeValue.js -Pattern "router.post|requireAuth|compareTrade|/api/trade|tradeRoutes|explanation" -Context 0,2
Select-String -Path test\tradeRoute.test.js,test\tradeValue.test.js -Pattern "POST /api/trade/compare|compare|rejects|returns|missing projections" -Context 0,1
node --test test\tradeRoute.test.js test\tradeValue.test.js
```

## What Was Avoided

- No frontend files changed.
- No backend implementation changed.
- No deploy work.
- No Hostinger move.
- No DNS, SSL/TLS, Nginx, production secrets, or `.env` files touched.

## Recommended Next Claude Prompt

```text
You are Claude Code, the frontend engineer for Corvus.

Read:
- context.md
- current_sprint.md
- agent_rules.md
- agent_handoff.md
- specs/002-homepage-product-priority/spec.md

Do not deploy.
Do not touch backend files.
Do not touch DNS, SSL/TLS, Nginx, production secrets, or .env files.

Task:
Update the homepage so Trade Analyzer is clearly the primary front-door product for Corvus.

Requirements:
1. Make Trade Analyzer the dominant hero/primary section.
2. Include a polished example trade card/result using the spec example:
   - You receive: Breece Hall + Chris Olave
   - You give: Deebo Samuel + James Conner
   - Corvus says: Accept — your weekly upside improves, and you gain a stronger long-term starter.
3. Keep the CTA honest: the real analyzer is auth-gated, so use copy like "Sign in to run your trade" or route to `/football`.
4. Keep Omen of the Week and Draft Assistant as smaller secondary cards.
5. Do not headline Start/Sit or Waiver Wire on the homepage.
6. Keep copy simple and non-technical.
7. Preserve mobile polish.

After finishing:
- Run `cd frontend && npm run build`.
- Update `agent_handoff.md` with files changed, build result, and any visual QA notes.
```

## Previous Handoff

Agent: Claude Code
Date: 2026-05-20
Task ID: CORVUS-022
Mode: Landing page polish — background, typography, copy, waitlist

## What I Completed

Polished `frontend/src/pages/Landing.jsx` based on Justin's visual review feedback. Changes across five areas:

**1. Background**
Removed the visible square/grid pattern entirely. Replaced with multi-layer atmospheric radial gradients: soft gold crown at the top center, deep crimson bloom at lower left, subtle gold accent at upper right. No visible lines. Feels dark, premium, and atmospheric.

**2. Typography**
Changed the hero `h1` from `font-serif` (Cormorant Garamond) to `font-sans` (Alegreya Sans), which is the humanist sans-serif already loaded in the project. Adjusted to `font-medium`, `leading-[1.12]`, `tracking-[-0.01em]`. More editorial/sports-intelligent, less formal.

**3. Hero copy**
- Replaced "Find out if the trade actually helps you win." with: **"Know the move before you make it."**
- New subcopy: "Corvus weighs your roster, matchup, player value, and season context — then gives you a plain-English accept, decline, or hold recommendation."
- Added a 3-step visual story arc below subcopy (Visual Storyteller influence): *01 Every trade carries risk. / 02 Corvus reads the full picture. / 03 You get a clear signal.*

**4. Waitlist section**
Added a full `WaitlistSection` component at the bottom of the page (above fold scroll, below secondary cards):
- Heading: "Get the signal before launch."
- Email field + platform radio pills (ESPN / Yahoo / Sleeper / Not sure yet) — styled as pill toggles, not a native select.
- Button: "Join the Waitlist"
- Success state: "You're on the list. The raven will send word." (Whimsy Injector — tasteful raven personality)
- Error state: "Something went wrong. Try again in a moment."
- Wired to `supabase.from('waitlist_signups').insert(...)` — will work as soon as Codex creates the table (see Codex TODO below).
- "Join Waitlist" link added to header nav.

**5. Accessibility + CTA cleanup**
- All form inputs have `aria-label` or associated `<label>` with `htmlFor`.
- Focus rings added to buttons and inputs with `focus-visible:outline`.
- Radio inputs visually hidden with `sr-only`, clickable via `<label>`.
- Primary CTA: "Run Your Trade" (gold button). Secondary: "Explore Corvus". Waitlist: separate section + header link.

Build: `npm run build` — clean, 0 errors, 0 warnings.

## Files Changed

- `frontend/src/pages/Landing.jsx` — full rewrite (CORVUS-021 + CORVUS-022)

Changes:

1. **Trade Analyzer hero card** — new `TradeAnalyzerHeroCard` component renders the spec example trade (Breece Hall + Chris Olave vs. Deebo Samuel + James Conner) with player position chips, an exchange icon, and a green ACCEPT verdict band. Plain-English metric pills: Corvus Edge (Strong), Risk (Medium), Why it matters. CTA card at the bottom explicitly says "Sign in to run the live Trade Analyzer" — does not imply unauthenticated live access.

2. **Hero layout** — 2-column grid (headline/CTA left, Trade Analyzer card right) on large screens, stacked on mobile. Headline: "Find out if the trade actually helps you win." Primary CTA: "Run Your Trade →" (links to /football). Secondary CTA: "Explore Corvus" (scrolls to secondary section).

3. **Omen mini card** — `OmenMiniCard` replaces the old large `OmenCard`. Smaller layout, same example content (Jaylen Warren FLEX add), condensed to 2 metrics, soft link to /football.

4. **Draft Assistant mini card** — new `DraftAssistantMiniCard` with a sample player tier list (Ja'Marr Chase, CeeDee Lamb, Christian McCaffrey), beside Omen in a 2-column grid.

5. **Sign-in form** — kept, moved under the left-column CTA buttons with updated label "Or sign in with email."

6. **Start/Sit and Waiver Wire** — not mentioned on the homepage at all.

Build: `npm run build` in `frontend/` — clean, 0 errors, 0 warnings.

## Files Changed

- `frontend/src/pages/Landing.jsx` — full rewrite

## Build Result

```
✓ 96 modules transformed.
dist/index.html                  0.39 kB │ gzip: 0.26 kB
dist/assets/index-C5hydk3k.css  25.92 kB │ gzip: 5.80 kB
dist/assets/index-CdLp3Gh5.js  241.20 kB │ gzip: 69.69 kB
✓ built in 991ms
```

## What Works Now

- Trade Analyzer remains the dominant homepage hero (hierarchy preserved).
- Grid background removed — page feels atmospheric and premium instead of wireframe-like.
- Hero headline updated to "Know the move before you make it." using Alegreya Sans.
- Subcopy updated with clear, non-hypey product description.
- 3-step visual story arc renders below subcopy (01 / 02 / 03 narrative flow).
- Waitlist section is built and wired — will go live as soon as Codex creates the Supabase table.
- Waitlist success state: "You're on the list. The raven will send word."
- Platform selector uses accessible radio pills, not a native select.
- "Join Waitlist" link in header nav.
- Sign-in form preserved with updated styling.
- Omen + Draft Assistant in smaller secondary cards — hierarchy intact.
- Build is clean.

## What Is Still Broken Or Uncertain

- **Waitlist requires Codex action before it works.** The form calls `supabase.from('waitlist_signups').insert(...)`. The table does not yet exist. Until Codex creates it with correct RLS, users will see the error state. See Codex TODO in the exact next prompt below.
- No browser visual verification done in this session. Justin should run `npm run dev` in `frontend/` and check desktop + mobile before the social launch.
- The `𖤍` Unicode raven glyph in the waitlist section heading renders in most modern browsers/OS but may not render on older Android. Visual check recommended.
- The story arc steps render horizontally on `sm:` breakpoints. At very small widths (320px) they may wrap — check on mobile.

## Recommended Next 3 Tasks

1. **Codex** — Create `waitlist_signups` table in Supabase + RLS policy (see exact prompt below). One SQL migration, no app code changes needed.
2. **Justin** — Visual review of the landing page on mobile and desktop (`npm run dev` in `frontend/`). Confirm layout, background, font, and waitlist form feel right before social launch.
3. **Claude Code** — Polish the in-app Trade Analyzer UI (TradeAnalyzer.jsx) so the signed-in experience matches the homepage example quality.

## Recommended Next Agent

Codex (waitlist table), then Justin (visual review)

## Exact Next Prompt — Codex

```text
You are Codex, the engineering/backend/repo worker for Corvus.

Read:
- context.md
- current_sprint.md
- agent_rules.md
- agent_handoff.md

Do not deploy.
Do not touch DNS, SSL/TLS, Nginx, production secrets, or .env files.
Do not change frontend files.

Task:
Create the waitlist_signups table in Supabase so the landing page waitlist form goes live.

The frontend already calls:
  supabase.from('waitlist_signups').insert({ email, platform })

You need to create the table and correct RLS so anonymous users can INSERT but cannot
read, update, or delete rows.

Required SQL:

  CREATE TABLE IF NOT EXISTS waitlist_signups (
    id          uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
    email       text         NOT NULL,
    platform    text,
    created_at  timestamptz  NOT NULL DEFAULT now()
  );

  ALTER TABLE waitlist_signups ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "anon_insert"
    ON waitlist_signups
    FOR INSERT
    TO anon
    WITH CHECK (true);

Optional: add UNIQUE constraint on email if you want to prevent duplicate signups:
  ALTER TABLE waitlist_signups ADD CONSTRAINT waitlist_signups_email_key UNIQUE (email);

After creating the table:
1. Confirm the insert works with a test row via the Supabase dashboard or SQL editor.
2. Update agent_handoff.md with what was done and whether the waitlist is now live.
3. Do not change any frontend code.
```

## Current Direction

Trade Analyzer is the front door.

Draft Assistant is the preparation feature.

Omen of the Week is the main event.

Start/Sit and Waiver Wire should be encapsulated by Omen.

ESPN is essential and needs a recovery playbook.

Oracle remains the app host for now.

Hostinger KVM 2 remains the Ollama/Gemma host for now.

No Hostinger app cutover is approved.

## Recommended Next 3 Tasks

1. Codex verifies the current Trade Analyzer implementation.
2. Claude updates the homepage hierarchy after verification.
3. A draft ESPN recovery playbook is reviewed and refined.

## Recommended Next Agent

Codex

## Exact Next Prompt

```text
You are Codex, the engineering/backend/repo worker for Corvus.

Read:
- context.md
- roadmap.md
- current_sprint.md
- decision_log.md
- agent_rules.md
- agent_inbox.md
- agent_handoff.md
- specs/002-homepage-product-priority/spec.md

Do not deploy.
Do not move the app to Hostinger.
Do not touch DNS, SSL/TLS, Nginx, production secrets, or .env files.

Task:
Verify the current Trade Analyzer implementation.

Answer:
1. Is Trade Analyzer already built?
2. What frontend file/component renders it?
3. What backend endpoint powers it?
4. Is it mock, live, or partial?
5. Are there tests?
6. Does anything block Claude from putting it front and center on the homepage?
7. What exact next Claude prompt should Justin use?

Make only documentation updates unless a tiny obvious bug blocks verification.

Update agent_handoff.md when finished.
```
