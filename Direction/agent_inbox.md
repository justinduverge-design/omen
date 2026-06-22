# Corvus Agent Inbox

**Auto-populated 2026-06-21 (Claude session) from `Direction/current_sprint.md`.** Prior inbox (2026-06-21 morning pop) pinned **Phase 1.5f**; that item shipped later the same day, and **Phase 1.5h** (multi-color official palettes) also shipped on 2026-06-21 — so the previous active task is closed and the top 5 has rolled forward. No pinned task is present. Same Claude-lean ordering: Phase 1.6 promoted to #1 (highest-leverage unblocked frontend item — also unblocks Phase 1.12), Phase 1.5g promoted because Phase 1.5f is now `[x]`. Agents may work across lanes; either may pull any item.

## Active Task

**Phase 1.6 — Position chip palette + selected-state styling** (auto-pulled as #1; spec says "Blocked by Phase 1.3 [x] + Phase 1.4 [x]" — both shipped). Awaiting plan-approval brief acceptance from Justin before build.

## Auto-Populated Top 5

1. **Phase 1.6 — Position chip palette + selected-state styling.** Unblocked (1.3 [x] + 1.4 [x]). Frontend-Claude lean. RB=green / WR=blue locked; add QB / TE / DEF / K hues (use `ui-ux-pro-max` palette library, color-blind distinguishability required). Define filled selected state in team accent (replaces broken yellow-with-X look on `/draft`). Apply to position chips + scoring-format chips. **Unblocks Phase 1.12.** Done docs: page + design + recommendation if recommendation cards change.
2. **Phase 1.10A — UX copy options packet.** Unblocked (1.3 [x]). Decision packet — no source changes; Justin picks final copy. Invoke `slops-ux-copy` and present 3 options for each: `/omen` offseason empty state, `/onboarding` "You're ready" success copy, landing-page Trade Analyzer Example headline replacement. **Unblocks 1.10B.** Done docs: n/a (decision packet).
3. **Phase 1.5g — Per-team motif flourishes** (Justin approved 2026-06-20, in roadmap). Now unblocked — **Phase 1.5f shipped 2026-06-21**. Per-team motif hairlines/borders, typography flourishes, optional time-bound animated cultural moments. Requires a richer template-grammar spec at kickoff. Done docs: feature + page + design.
4. **Phase 1.11A — Demo Mode frontend fixtures.** Unblocked (1.3 [x]); Backend Phase 2.7 complete (2026-06-19). Mock-roster / previous-results / mock-draft fixtures, clearly labeled, dev-flag-gated, distinct from public `/demo`. Done docs: feature + design + recommendation.
5. **Phase 2.17 — Platform `lastResult` field (backend).** Backend-Codex lean, but kept on Claude's radar because it is the sole gate left on Phase 1.5d (post-win pulse). Surfaced here so Justin can decide whether to flip it to Codex or have Claude take the research-then-implement path. Done docs: feature + security if any new ESPN scope is needed.

## Blockers Surfaced

- **Phase 1.5d (post-win pulse animation)** still gated on Backend **Phase 2.17** (`lastResult` field across Sleeper / Yahoo / ESPN). Listed at #5 above so the dependency stays visible.
- **Phase 1.10B (apply approved copy)** waits on Justin's selection from the **1.10A** options packet.
- **Phase 1.12 (gray contrast + Standings refinement)** waits on **Phase 1.6** (palette reuse) — now at the top of the queue.
- **Phase 3.15 (`AI_PROVIDER` toggle)** still gated on a `decision_log.md` dollar-cap entry — do not pull until logged.
- **Frontend Phase 2.10 (Trade share card)** waits on Backend Phase 2.10 (hash routes).

## Standing Route

```text
SLOPS/
  slops-saloon/
    corvus/
```

## Active Notes

- This repo is the Corvus product repo. The old nested `Corvus/` folder is retired.
- Product handoffs live in `Blueprints/handoffs/`.
- Product context lives in `Direction/`.
- Division context lives one layer up. OS context is in the sibling `slops-os/` checkout in this workspace.

## Do Not Touch Unless Explicitly Asked

- `AGENT.md`, `CLAUDE.md`
- `.env`, secrets, or credentials
- Deploy config
- Package files
- SQL or migrations
- Production infrastructure
