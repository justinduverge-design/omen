# Environments close-out (item 1b), 2026-10-27

Brief: Valor-Core `briefs/environments-closeout.md`. Valor-Core was read-only from this session, so these
results live here. Item 1a (`ops/dispatch`) reads its launch recipes from this file. Copy them into
Valor-Core `briefs/environments-status.md` when 1a lands.

## Folder move (done first)
Omen's one checkout is `~/Documents/GitHub/Valor-Core/Slops-OS/slops-saloon/omen`. The clone at
`~/Documents/GitHub/omen` is in the Trash (`omen-clone-2026-10-27`); it had nothing unpushed. Work found
only in the nested checkout is on local `rescue/*` branches. User-level agent files were repointed
(`*.bak-2026-10-27-family` backups). 49 Claude sidebar sessions on the dead `GitHub/Slops-OS` path are archived.

## Fixes in this PR
| Done means | Fix | Proof |
|---|---|---|
| 2. Cancels told apart | `scripts/cloud-setup.sh` prints `pass` / `CANCELLED` / `FAIL` with counts and names the cancelled tests; Node below 24 is switched to 24 via nvm or warned; `.nvmrc` = 24 | Mac run: `pass (2631 passed, 0 failed, 0 cancelled)`; synthetic logs give `CANCELLED (7 …)`, `FAIL (1 …)`, `FAIL (runner did not finish)` |
| 3. Guard passes a first push | Agent guards accepts `#<PR>` or `` `<branch>` `` in the open build package; `scripts/merge-pr.sh` swaps the branch for `#<PR>` on the branch before it merges | Simulated: number passes, exact branch passes, partial branch, other branch and `#79` for `#790` fail; swap rewrites the row |
| 5. Jules doesn't ask | `AGENTS.md` loop step 2: a dispatched cloud run doesn't wait; the task card is the approval; take the documented default and say so in the PR. Step 5 names the branch-row rule | `check-kickoff-drift` pass; always-loaded 3,360 / 10,000 tok |

The Jules cancels (7 on its default Node 22) did not reproduce on Node 24 here. Node 22 is the likely cause;
it's unproven until Jules reruns on Node 24.

## Launch recipes (for `ops/dispatch`)
| Runtime | Start a session with repo, environment, model, effort | State |
|---|---|---|
| Claude Code (Mac) | `claude` in the nested omen path, or a desktop session on that folder; model and effort from the session's model picker / `--model` | proven (omen#794) |
| Claude Code web | claude.ai/code → repo `justinduverge-design/omen`, environment `omen`; setup runs `bash scripts/cloud-setup.sh` | started from the desktop app in Session B; a fresh-start proof needs Justin (done means 1) |
| Codex (Mac) | `codex exec -s read-only -c model_reasoning_effort=low "<card>"` from the nested omen path (`-s workspace-write` to build); `-m <model>` pins the model | proven read-only below |
| Codex cloud | `codex cloud exec --env <ENV_ID> --branch main "<card>"` | **limit:** CLI 0.164's `codex cloud list` returns no tasks, not even the app-started #796, so the CLI can't see the app's environment id. **Fallback for `ops/dispatch`:** start Codex cloud from the Codex app (Justin), or send the card to Codex local or Jules instead. An `@codex` comment on a GitHub issue is a candidate code path, untested |
| Jules | `jules new --repo justinduverge-design/omen "<card>"` after `jules login`; choose Node 24 in the repo's Jules environment | CLI dispatch proven in Session B |
| Antigravity / Gemini | Antigravity is a desktop app with no CLI here. Closest scriptable stand-in: `gemini --approval-mode plan -p "<card>"` from the nested path | blocked: the folder isn't trusted (below) |

## Proof runs (same table as Session B)
| Tool | Task | PR | What it needed | Where it struggled |
|---|---|---|---|---|
| Codex (Mac) | read-only: kickoff drift + always-loaded cost | none (read-only) | `codex exec -s read-only`, effort low; 15 s, 26,675 tokens | nothing; answered "Pass, 3360 tok" |
| Gemini CLI (for Antigravity) | read-only: compare the two read-order lists | none | folder trust | refused at start: Gemini trusted only the retired `~/Documents/GitHub/omen`. Changing trust is a security setting, so it's Justin's click |

## Not run from here
- Done means 1 (fresh Claude Code web start, with and without the repo) and done means 2 in the web container,
  Codex cloud and Jules: each needs a cloud start this session can't make. Run each once after this merges;
  the setup's last line is the result.

## Steps only Justin can click
1. **Gemini / Antigravity trust:** run `gemini` once in `~/Documents/GitHub/Valor-Core` and choose
   "Trust parent folder". In Antigravity, open that folder and accept the trust prompt.
2. **Jules:** in the omen repo's Jules environment, set Node to 24.
3. **Codex app:** File → Open the nested omen folder; accept trust (the old project entries are removed).
4. **Codex cloud:** nothing to re-point (it follows the GitHub repo). Start one task from the app after this
   merges to prove done means 2.
5. **Claude Code web:** start one session on `justinduverge-design/omen` and one with no repo; paste the
   last setup line of each into this file.
6. **Keystore:** `~/Documents/GitHub/omen-upload.jks` stays out of every repo (now gitignored) until Vaultwarden is up.
