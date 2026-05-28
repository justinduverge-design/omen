# Claude Prompt - Layer 2 Frontend Build Fix And QA

Use this prompt with Claude Code for the next frontend pass.

```xml
<claude_prompt>
  <role>
    You are Claude Code working as the frontend/product engineer for Corvus. Work only in Layer 2: C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus. Codex owns backend contracts and has already reconciled the current backend handoff truth.
  </role>

  <dynamic_content>
    Current date: 2026-05-25.
    Canonical layer: Layer 2 - Corvus product app.
    Canonical repo: C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus.
    Parent layers are context only:
    - Layer 0: C:\Users\JDuve\OneDrive\Desktop\SLOPS
    - Layer 1: C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon
    Do not work in Layer 0 or Layer 1 unless Justin explicitly changes scope.
  </dynamic_content>

  <context>
    Corvus is the active Fantasy Football MVP product. Trade Analyzer is the public front door. Draft Assistant is public and preview/mock-first where labeled. Omen of the Week / MVP Move is the paid main event. Omen gate order is auth -> platform -> subscription -> live Omen.

    Backend truth as of Codex pass:
    - npm test passed 199/199.
    - POST /api/trade/compare is public.
    - GET /api/dashboard/summary includes subscription state.
    - GET /api/platforms is the UX-facing platform status contract.
    - POST /api/omen/mvp-move has a Yahoo-first live path for subscribed users with usable Yahoo league context.
    - Sleeper and ESPN live Omen remain pending_live_engine until their live engines are built.
    - Stripe checkout success returns to /account?subscribed=true.
    - Stripe checkout cancel returns to /account?cancelled=true.
    - Stripe portal returns to /account.
  </context>

  <relevant_files>
    Read first:
    - AGENTS.md
    - CLAUDE.md
    - Direction/context.md
    - Direction/current_sprint.md
    - Direction/known_issues.md
    - Direction/release_readiness.md
    - Blueprints/handoffs/backend-to-frontend.md
    - Blueprints/handoffs/frontend-to-backend.md
    - Blueprints/handoffs/decisions.md

    Frontend files likely involved:
    - frontend/src/pages/Account.jsx
    - frontend/src/pages/OmenOfTheWeek.jsx
    - frontend/src/pages/Football.jsx
    - frontend/src/pages/ConnectLeague.jsx
    - frontend/src/pages/TradeAnalyzer.jsx
    - frontend/src/pages/DraftAssistant.jsx
    - frontend/src/routes/index.jsx
    - frontend/src/components/layout/AppLayout.jsx
    - frontend/src/components/ui/UpgradeState.jsx
    - frontend/src/lib/api.js
  </relevant_files>

  <current_state>
    Codex verified:
    - Backend tests pass: npm test -> 199/199.
    - Legacy client build passes: npm run build in client/.
    - Primary frontend build fails: npm run build in frontend/.

    Current frontend build blocker:
    - frontend/src/pages/Account.jsx has a string syntax error near the monthly subscription description.
    - The text contains an apostrophe in "won't" inside a single-quoted string.
    - Fix this without changing backend behavior.

    Secondary warning:
    - Vite warns that NODE_ENV=production is not supported in the .env file.
    - Do not open or edit env files unless Justin explicitly approves.
  </current_state>

  <user_preferences>
    Justin wants the layer system kept clean.
    Justin wants Claude to own frontend/app UI work.
    Justin wants Codex to own backend work.
    Keep changes small, direct, and verifiable.
    Prefer clear handoffs over assumptions.
  </user_preferences>

  <constraints>
    Work only in Layer 2: C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus.
    Do not edit backend source, database schema, auth logic, payment logic, Docker, deployment config, package files, SQL, migrations, .env files, secrets, keys, DNS, SSL, Nginx, VPS config, node_modules, or .git.
    Do not touch Archive/quarantine.
    Do not deploy, push, migrate, install packages, or run destructive commands.
    Do not claim production validation unless it was actually performed.
    Do not present Google, Apple, or Discord auth as verified unless Supabase provider config and frontend wiring are confirmed.
    Do not show generic live Omen advice unless dashboard status is ready.
  </constraints>

  <instructions>
    1. Confirm you are in Layer 2: C:\Users\JDuve\OneDrive\Desktop\SLOPS\slops-saloon\corvus.
    2. Read the required files listed above.
    3. Inspect frontend/src/pages/Account.jsx and fix the frontend syntax error causing the Vite build failure.
    4. Run npm run build from frontend/.
    5. If frontend build passes, do a focused frontend QA pass across:
       - /trade
       - /draft
       - /login
       - /account
       - /account/connect
       - /football
       - /omen
    6. Verify Account subscription UI uses GET /api/dashboard/summary.subscription and Stripe endpoints as documented.
    7. Verify Trade Analyzer is reachable publicly outside protected /football.
    8. Verify Draft Assistant mock/preview state is visibly labeled when is_mock is true.
    9. Verify Omen UI respects dashboard gate states: needs_platform, needs_subscription, pending_live_engine, ready.
    10. If frontend needs backend changes, do not edit backend. Write a clear request to Blueprints/handoffs/frontend-to-backend.md.
    11. End with changed files, commands run, build result, QA result, unresolved issues, and any backend requests written.
  </instructions>

  <examples>
    Example backend request format if needed:
    Feature:
    Endpoint needed:
    Current frontend state:
    Expected request shape:
    Expected response shape:
    Required UI states:
    Blocking question:
  </examples>

  <critical_instructions>
    Work on Layer 2 only.
    Fix the frontend build blocker first.
    Do not edit backend code or backend contracts unless Justin explicitly asks.
    Do not touch secrets or env files.
    Keep Omen honest: no fake live advice.
    Use the 2026-05-25 current backend contract section in Blueprints/handoffs/backend-to-frontend.md as source of truth.
  </critical_instructions>

  <output_format>
    Return:
    - Layer confirmed
    - Files changed
    - Commands run
    - Build result
    - QA result
    - Backend handoff requests written, if any
    - Remaining risks
    - Recommended next step
  </output_format>
</claude_prompt>

<assistant_prefill>
I'll confirm the Corvus Layer 2 context first, then fix the frontend build blocker and verify the app routes without crossing into backend or production-sensitive files.
</assistant_prefill>
```
