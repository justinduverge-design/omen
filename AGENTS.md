# Omen: shared agent context

Every runtime (Claude Code, Codex, Antigravity, Jules) reads this file. Runtime files (`CLAUDE.md`,
`GEMINI.md`) only add what that runtime needs. How Valor builds, with the evidence for each rule, is the
OUR-WAY page in the Valor-Core repo.

Omen is a fantasy football app: a user connects an ESPN, Yahoo or Sleeper league and Omen tells them the
best move this week. iPhone is the active build. The app was renamed from Corvus on 2026-06-22; keep
`corvus` only for documented compatibility shims.

## Read in order before pulling a task

**This list and `Blueprints/prompts/kickoff-l2.md` are one contract.** `node scripts/check-kickoff-drift.js`
enforces it.

1. `Direction/map.md`
2. `Direction/agent_inbox.md`

## Reads on demand

The map's routing table says what else to read for what you touch. Read nothing else up front.
History and "why" come from **recall** (MCP tool `recall_search`), not reading lists: search it before
asking the founder anything a past session may have answered.

## The loop

1. **One task per session.** A pin in `Direction/agent_inbox.md` wins; otherwise take a lane from
   `Direction/current_sprint.md`. Record a `Claim:` on it. Start a fresh session for the next task.
2. **Plan and wait.** Report task, files to touch and how you will prove it. Wait for the founder.
   **A dispatched cloud run (Jules, Codex cloud, Claude Code web) does not wait:** the task card is the
   approval. Don't ask; open the PR. When unsure, take the documented default and say so in the PR.
3. **Build** in your own worktree. Native screen work first passes the seven-file native read gate
   (`Direction/map.md` → Native read gate); a missing or conflicting source means stop and say so.
4. **Self-check, then a fresh-agent review of the diff** before the PR. Fix what it finds. Ask Codex
   (`@codex review`) only for database/migrations, user-data deletion or exposure, auth, billing.
5. **PR.** Add one row to the open `Direction/release/builds/build-N.md`; before you know the PR number,
   write the branch name in backticks. Merging is the founder's call and goes through `scripts/merge-pr.sh` only.
6. **Close out:** `Status: VERIFIED` + `Evidence:` on the item, decisions in `Direction/decision_log.md`,
   then `npm run closeout`. A P0 blocks close-out. An unrun check is not a passing check.

## Hard truths (the full list is `Direction/map.md` → Rules that never bend)

- Never print, log or commit secrets, cookies, tokens or private user data. ESPN cookie values never
  appear anywhere.
- **Never send personal data to a third party, including test traffic** (User-Agent, headers, fixtures).
  `scripts/checks/no-pii-outbound.js` fails CI on it.
- Supabase SQL, deploys, production config, provider credentials and store actions each need the
  founder's approval for the exact action. Writing SQL is not applying it.
- No merge, push to `main`, deploy or major deletion unless the task grants it.
- Mock data is labeled. `connected` is not `usable`. Omen is free: no billing.
- Limits must say when they cut, and a breaker that keeps opening must be visible (Build 12 retro).

## Build, test, prove

```bash
npm ci && npm test                       # backend (node --test)
npm run contracts:check                  # API contracts
cd frontend && npm ci && npm run build   # web
# iOS: mobile/ios/OmenIOS (Xcode, Mac only); UI tests carry the accessibility audit
```

Cloud runtimes run `scripts/cloud-setup.sh` (backend + web only; iOS needs the Mac).
Prove with the narrowest real evidence: one focused test, a screenshot, a live probe. Measure before
judging (retro: the "tab lag" was test overhead).

## Mistakes we already made (add one line when a new one is named)

- #702/#703 merged before CI started; main stayed red until #704 → `scripts/merge-pr.sh` is the only path.
- A test User-Agent carried the founder's email to Wikipedia → `no-pii-outbound` check.
- Build record written at the end → the build package updates itself on every merge.
- Narration breaker opened on every call unnoticed; "Yahoo Sight 0%" was a silent 400-player cap.
- Two large jobs in one session → a skipped check (session be626454, 2026-10-02).
