# Shutdown checkpoint, 2026-10-12 (founder weekly limit ~75%, resets Thursday)

Restore: read this file, then `Direction/2026-10-27-beta-readiness.md` (the plan), then paste the prompt at the bottom.
Cadence from now on: **a release every other Tuesday.** This cycle: Tue 2026-10-13. Next: **Tue 2026-10-27**.

## Current Project State
- **Production is stable and quiet.** API live at `ab18af0` (canary PASS 2026-10-12). Monday 07:15 ET warehouse ingest succeeded (7 nflverse stages + opportunity + RAT-QB), chained backup and retention completed, disk 25%.
- **Everything merged this week is deployed and reviewed** (fresh-agent review before each merge, CI green). Rollback path written: `Direction/2026-10-13-release-rollback-card.md`.
- **Warehouse:** `FOOTBALL_DATA_MODE=warehouse`, 28 seasons. Projections store code is merged **with flags OFF and the schema NOT applied**; apply is a post-release step (handoff `2026-10-11-warehouse-weekly-projections.md`).
- **iOS:** current `main` built and installed on the founder's iPhone 15 (launch was blocked by a locked screen). Founder's Gate G phone walk is not done.
- **Direction set 2026-10-12 (decision log):** the league provider's projections lead; Omen's own projections are challenger and filler (Yahoo has none); read everything the providers expose; shape data around the questions a manager asks.

## Work Completed This Session
- Warehouse Batch A-E closed out: scheduled backup chain proven; first scheduled restore proof FAILED (KVM2 prune cron deleted the pinned Postgres image), fixed (#635 plus image anchor on KVM2), proof passed by hand, Kuma #9 Up. **The scheduled-run done-condition is next Sun 2026-10-18 14:10 UTC.**
- Ops: football backup status path fixed (#630); KVM2 nginx boot order fixed and started (Joplin WebDAV, not Omen); Pi alert dispatcher sort and pending-monitor fixes (backup `slops-alert-dispatcher.bak-pre-sortfix-*`); GlitchTip issues resolved; SSH aliases `omen-kvm1/omen-kvm2/omen-pi` and `infra/schedule/ACCESS.md` (#641, #642).
- App and API merged: #632 league scope + hold call + ESPN trade; #633 Trade front door; #636 Omen call carries the picked league + Hold card + lag fixes; #637 walk-1 leftovers; #639 trade call in Omen; #640 trade suffix names; #644/#646 structured trade partner; #645 Yahoo projections; #648 provider matrix + playoff cut line; #649 projections store (flags off); #650 injury/projection freshness tiers.
- Docs: readiness `2026-10-06-tuesday-beta-readiness.md` §2c-2e, rollback card, decision log entries (rights risk accepted; Omen/provider projections direction).

## Files Changed
Created: `Direction/2026-10-27-beta-readiness.md`, this file (rewritten). Updated: `Direction/map.md` (Right now + one routing row), `Direction/2026-10-06-tuesday-beta-readiness.md` (pointer). Earlier this session (already merged): rollback card, TIMERS.md, ACCESS.md, decision log, capability matrix.

## Files Not Found
None missing for this checkpoint.

## What Was Not Done
- **Founder-only for this cycle:** Gate G phone walk; Sentinel baseline refresh (`sudo sentinel-omen-posture-baseline-refresh kvm1` then `kvm2`); App Store Connect check for an earlier build 7, archive, upload; the four section-10 decisions (explained in `Direction/2026-10-27-beta-readiness.md`).
- **PR #654 (Omen projections v1) is OPEN with one unresolved P1** (the "relevant universe" filter is not independent of the baselines, so the ship rule can pass a losing model) plus P2s; the fixing agent was cut off by the rate limit. Branch `omen-projections-v1`, review verdict in this session's transcript.
- **Provider-reads agent (G3 trade targets, G4 transactions, G5-G8) was cut off with 13 uncommitted files** in worktree `.claude/worktrees/agent-adc5dd7f231affd7f`, branch `feat/provider-gap-g3-g8`. Not committed, not reviewed.
- **Three spec agents produced nothing** (cut off at start): evidence-layer map, fantasy-week information architecture, provider discovery + probe plan. Re-run them.
- Real backtest of Omen projections (needs a restored warehouse copy on KVM2, read-only).
- Pi alert state was not re-read after the sort fix (Tailscale SSH wants a browser re-auth: `https://login.tailscale.com/a/laded74930b0cd`). Kuma #7/#8/#9 not read through the browser pane (site not allowed).
- SSH `omen` user unification (decided: after the release). Truth-gate P0 cleanup (268 P0, 250 before this week). Kickoff times into the freshness policy (matters from December).

## Current Risks / Open Questions
- Gate G (device evidence) is the deciding gate and is unrun. Nothing else in the engineering list blocks Tuesday.
- Each API deploy swaps one container (a few seconds of 502). No code merges Monday evening through Tuesday unless it is a rollback.
- Rights: Sleeper projections are Rotowire-tagged, commercial permission pending; risk accepted by the founder with safeguards (decision log 2026-10-11).
- Open decisions for the founder: where Find a trade lives (built as the Trade tab front door, confirm on the phone); whether to touch the protected brief builder for decision-drivers (spec proposed); LLM direction (batch jobs, not built).
- Open worktrees under `.claude/worktrees/` hold stale agent branches; clean up with `mcp__ccd_host__clean_up_worktrees` after the work above is committed or abandoned.

## Recommended Next Step
Do the founder-only items first (phone walk, Sentinel refresh), then resume engineering in this order: (1) fix and merge #654, (2) commit/review the provider-reads work, (3) re-run the three spec agents, (4) restore a warehouse copy on KVM2 and run the Omen projections backtest, (5) apply the projections schema (handoff steps) once the release is out.

## Exact Next Prompt For Justin
```
Read Blueprints/handoffs/rate-limit-shutdown-checkpoint.md and Direction/2026-10-27-beta-readiness.md. First tell me what is still open from my side (phone walk, Sentinel refresh, build 7, section 10). Then, without merging anything that deploys before the 2026-10-13 release is finished, (1) resume PR #654 (fix the P1 relevant-universe filter), (2) inspect worktree .claude/worktrees/agent-adc5dd7f231affd7f (branch feat/provider-gap-g3-g8), commit it and get a fresh-agent review, then (3) re-run the evidence-layer map, information-architecture and provider-discovery specs. Review each PR with slops-code-review before merge and gate every merge on gh pr checks.
```
