# Omen Blueprints

How Omen is built: specs, architecture, playbooks, prompts, handoffs and the definition of done. `Direction/`
says what to do and why. This folder says how.

## Key paths

| Path | What it holds |
|---|---|
| `api-routes.md` | Every API route, with its contract version |
| `security-privacy.md` | Security and privacy rules for auth, tokens and user data |
| `definition-of-done.md` | What "done" requires for each type of work |
| `demo-mode.md` | How Demo Mode works (kept for App Store review) |
| `architecture/` | The football warehouse design and the rebuild plan |
| `rebuild/` | The database redo design and audit, the call-slice plan, the cutover runbook and the backend map |
| `specs/` | Product and engineering specs. `specs/mobile/` is the native iPhone/Android gate, `specs/football-data/` covers data and scoring, `specs/design/` holds design authority, and `specs/infrastructure/` covers the Pi fleet and hosts |
| `playbooks/` | Repeatable procedures: release, rollback, ESPN recovery, App Store review, native design delivery |
| `prompts/` | Session kickoff prompts and the review loop (`HOW-TO-RUN-THE-LOOP.md`) |
| `handoffs/` | Dated session handoffs. The newest one describes the latest state |
| `skills/` | Omen-local skills only. The shared skill library lives in the Slops-OS repository |
| `quality/` | Quality baseline snapshot |
| `audits/` | Code reviews and audits, mostly from the 2026 web phase. Historical |
| `backlog/`, `done/` | Older web component backlog and done ledgers. Historical; do not append |

Global skills and doctrine live in the separate `Slops-OS` repository (`Blueprints/skills/`). Division-level
blueprints live in the Slops Saloon layer.
