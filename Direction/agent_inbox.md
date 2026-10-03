# Omen Agent Inbox

**Rebuilt:** 2026-10-03. History (earlier pins, resolved and retracted entries, the 2026-09-02 reconciliation) is archived verbatim at `Archive/sprints/2026-10-03-agent_inbox-full.md`.
**Authority:** `Direction/current_sprint.md` is the active queue. `Direction/status-model.md` defines states. A pin below wins; with no pin, name the task with the founder.

## 📌 Next pull — 2026-10-03: football intelligence for the whole league

**Founder, 2026-10-03:** "Football intelligence should be built for the whole game so all coaches and
players come on!!" The beta waits for it.

- **Item:** `FI-LEAGUE` in `Direction/current_sprint.md`.
- **Running checklist:** `Blueprints/handoffs/2026-10-03-football-intelligence-league-build.md`. Start at
  the first unticked box, and tick boxes as work lands.
- **Already live:** the player crosswalk (#539) and usage lines in the start/sit call (#540).
- **Lane:** server, data and database. Do not touch `mobile/`.
- **Approvals:** the founder approved plan A and plan B on 2026-10-03, which covers the serving table and
  the nightly publish. Anything else in production needs a fresh yes.

## Previous pin (done) — 2026-10-02: prepare production for the database redo

The redo was applied to production on 2026-10-03; see `DB-REDO-PROD` (VERIFIED).

### Original pin text

**Founder, 2026-10-02:** the next session prepares production rather than running it. "We're going to
take one day to prep it, make sure everything is where we need it to go so that when we do it, we can
really do it well."

**Brief:** `Blueprints/handoffs/2026-10-02-prep-for-production-brief.md`, a seven-part prep list:
1. merge state;
2. the code the steps need (A1–A4, plus the scoring-rules compartment);
3. a compatibility check per step;
4. backup and restore;
5. the production runbook;
6. a full dry run on a restored copy;
7. a go/no-go sheet.

**Lane:** database: a Claude or Codex session only. Nothing is applied to production in this session.

**Prep complete — 2026-10-03.** Handoff: `Blueprints/handoffs/2026-10-03-prep-for-production.md`.
- **Next pull:** the production session. The prep PRs are merged as listed in the handoff's "Merge state"
  (that list is authoritative; A1 reached `main` through #531, not #526).
- Confirm the deployed SHA contains them, tick `Blueprints/handoffs/2026-10-03-production-go-no-go.md`, then
  apply one sitting at a time by `Blueprints/handoffs/2026-10-03-production-runbook.md`.
- Each production step needs the founder's approval; the runbook groups them into five sittings.

