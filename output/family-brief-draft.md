# Brief: one family (draft from the Omen 1b session, 2026-10-27; move to Valor-Core `briefs/family.md`)

Justin, 2026-10-27: "Same soul, three different bodies." Valor-Core, Slops-OS and Omen stay three git repos,
but every tool, app and environment treats them as one family with one source of truth.

## Specific
Add a family manifest to Valor-Core (`family.json`) listing each body (repo, GitHub remote, nested path, role)
and each place that runs agents (apps, IDEs, simulators, cloud environments), plus `ops/family.sh` that reads
it and checks, clones and reports on all of them. Every hard-coded path in Valor-Core moves to the manifest.

## Measurable
Done means:
1. `family.json` exists. It holds:
   - **Bodies:** Valor-Core `~/Documents/GitHub/Valor-Core`, Slops-OS `…/Valor-Core/Slops-OS`,
     Omen `…/Valor-Core/Slops-OS/slops-saloon/omen`.
   - **Places:**
     - Mac apps: Claude desktop (Code tab), Codex app, Gemini app, ChatGPT app, Antigravity.
     - IDEs: VS Code on Windows (if used), Xcode, Android Studio and its emulator.
     - Cloud: Claude Code web, Codex cloud, Jules.
     - For each place: how it finds the family (its settings path), which body it works on, and who leads.
2. `ops/family.sh doctor` exits 0 on the Mac today, and exits non-zero naming the problem when a body is
   missing, misplaced (a stray clone like the old `~/Documents/GitHub/omen`), or a config points at a path
   not in the manifest.
3. `grep -r 'GitHub/omen'` over Valor-Core finds nothing outside history. The files today:
   - `ops/env-drift.sh`
   - `ops/capability-scout.py`
   - `inventory/inventory.json`
   - `recall/tests/test_recall.py`
   - `briefs/environments-status.md`
4. Each body's ignore line for the child repo carries a comment, for example
   `# family member: tracked in its own repo, see Valor-Core/family.json`.
5. Each body's `AGENTS.md` opens with one line naming the family and where the soul lives.
6. The weekly health job runs `family.sh doctor`.
7. Android lead recorded: Gemini / Antigravity build the Android app. Recorded in Omen `Direction/decision_log.md`
   and the manifest's `leads` field; `briefs/dispatch.md` routes Android cards to Antigravity first.

## Achievable
- Two sessions at low effort: (a) manifest + `family.sh` + path cleanup; (b) the app and IDE entries.
  Part (b) needs Justin at each app, and the Windows box if VS Code is used there.
- Depends on: item 1a (`ops/dispatch`) reading the manifest rather than its own path list. Coordinate, don't block.
- Needs from Justin:
  - Point each app's project or sidebar entry at the nested Omen path, and remove stale entries
    (Claude sidebar, Codex `projects."…/GitHub/Slops-OS/slops-saloon/omen"`, Codex cloud environment).
  - Say whether the Windows machine runs VS Code against these repos.
  - Choose a home for `~/Documents/GitHub/omen-upload.jks`, the Android upload keystore, which sits loose in
    the folder. It needs to go somewhere safe before Android work starts.

## Relevant
Serves the dispatcher (item 5): it can only hand work to an environment it can find. It also serves Android
after iOS: Gemini/Antigravity tokens have sat unused for 3 to 4 months, and Android is a Google platform.

## Time-bound
Two sessions. Target: 2026-10-30. If it stalls for more than 24 h, retry once, then report it on the weekly file.

## Work
1. Write `family.json` (schema: `bodies[]`, `places[]`, `leads{}`).
2. Write `ops/family.sh status|sync|doctor` (sync clones a missing body into its nested path; never moves or deletes).
3. Replace the hard-coded paths with manifest lookups; add the ignore comments and the AGENTS.md first lines.
4. Add the app and IDE entries with Justin; record the Android lead.
5. Run `doctor` and record the output as evidence.

## Already done in the Omen 1b session (2026-10-27)
- The nested checkout is the only Omen. It's on `main` at 06b9c384, with 9 dead worktree records pruned.
- Saved to local, unpushed branches: the Build 13 note `rescue/build13-error-tracking` and four
  `rescue/stash-*` branches. The stashes are kept as well.
- `~/Documents/GitHub/omen` moved to `~/.Trash/omen-clone-2026-10-27`. Codex's PR #796 worktree now
  hangs off the nested checkout at the same path.
- `~/.valor-agents.md`, `~/.codex/AGENTS.md`, `~/.codex/config.toml` and `~/.gemini/GEMINI.md` were
  repointed, with backups at `*.bak-2026-10-27-family`.
