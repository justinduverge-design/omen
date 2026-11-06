# Omen: shared agent context

Every runtime reads this file. How every Valor agent works (who may merge, the task card, the run budget,
the guards) is `rules/base.md` in the Valor-Core repo; this file adds only what is true of Omen.

Omen is a fantasy football app: a user connects an ESPN, Yahoo or Sleeper league and Omen tells them the
best move this week. iPhone is the active build. Renamed from Corvus on 2026-06-22; keep `corvus` only for
documented compatibility shims.

## Read in order before pulling a task

**This list and `Blueprints/prompts/kickoff-l2.md` are one contract.** `node scripts/check-kickoff-drift.js`
enforces it.

1. `Direction/map.md`
2. `Direction/agent_inbox.md`

## Reads on demand
The map's routing table says what else to read for what you touch. History comes from recall
(`recall_search`): search it before asking the founder anything.

## The loop
1. **Card.** A pin in `Direction/agent_inbox.md` wins; otherwise take a lane from `Direction/current_sprint.md`
   and record a `Claim:`. The card is the approval: don't stop to ask; take the documented default and say so
   in the PR. Work inside the card's run budget.
2. **Build** in your own worktree. Native screen work first passes the native read gate (`Direction/map.md`).
3. **Self-check, then a fresh-agent review** ending in `Review verdict: pass|fail`. Ask Codex (`@codex
   review`) too for database, user-data deletion or exposure, auth, billing.
4. **PR**, with one row in the open `Direction/release/builds/build-N.md` (the branch name until you know `#N`).
5. **Merge by class.** Every push to `main` deploys production unless all files are `*.md`, `Direction/`,
   `Blueprints/` or `References/`. Only those merge alone, through `scripts/merge-pr.sh`. Everything else,
   tests and dependency bumps included, waits for the founder.
6. **Close out:** `Status: VERIFIED` + `Evidence:`, decisions in `Direction/decision_log.md`, then
   `npm run closeout`. An unrun check is not a pass. End with `STATUS: done|blocked|budget`.

## Hard truths (the full list is `Direction/map.md` → Rules that never bend)
- Never print, log or commit secrets, cookies, tokens or private user data. ESPN cookie values never appear.
- Never send personal data to a third party, including test traffic. `scripts/checks/no-pii-outbound.js` fails CI.
- Supabase SQL, deploys, production config, provider credentials and store actions need the founder's
  approval for the exact action. Writing SQL is not applying it.
- Mock data is labeled. `connected` is not `usable`. Omen is free: no billing.
- Limits say when they cut, and a breaker that keeps opening must be visible.

## Build, test, prove
```bash
npm ci && npm test                       # backend (node --test)
npm run contracts:check                  # API contracts
cd frontend && npm ci && npm run build   # web
# iOS: mobile/ios/OmenIOS (Xcode, Mac only); UI tests carry the accessibility audit
```
Cloud runtimes run `scripts/cloud-setup.sh` (backend + web only). Prove with the narrowest real evidence:
one focused test, a screenshot, a live probe.

## Mistakes we already made
- #702/#703 merged before CI started → `scripts/merge-pr.sh` is the only path.
- A test User-Agent carried the founder's email to Wikipedia → `no-pii-outbound`.
- Narration breaker opened on every call unnoticed; "Yahoo Sight 0%" was a silent 400-player cap.
