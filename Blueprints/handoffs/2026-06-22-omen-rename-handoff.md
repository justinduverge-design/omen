# Omen Rename Handoff — 2026-06-22

## Files updated

- `AGENTS.md`, `CLAUDE.md`, `Direction/*`, `DBS_INDEX.md`, `README.md`, `Brand/brand-system.md`, `Blueprints/specs/*`, and current playbooks/done docs — active product name normalized to Omen.
- `src/omen_*.js`, `test/omenApiV2.test.js`, `scripts/load-omen-routes.js` — safe source filenames renamed from `corvus_*` to `omen_*` and imports updated.
- `frontend/src/pages/OmenLanding.jsx`, `frontend/src/routes/index.jsx`, landing links, manifest, HTML icons, and public Omen logo assets — UI-facing rename and `/about` route added.
- `sql/omen_rls_security.sql` and `probo.yaml` — local SQL evidence path renamed; no production SQL was executed.
- `package.json`, `package-lock.json`, `.env.example`, `Dockerfile.cron`, `docker-compose.yml` — local package and cron entrypoint use Omen names.
- L0/L1 routing wrappers under `C:/Users/JDuve/dev/SLOPS/` — app identity now Omen while the legacy folder remains `slops-saloon/corvus/`.

## Files discussed / inspected

- Existing L2 graph: `graphify-out/graph.json`.
- Root graph: `C:/Users/JDuve/dev/SLOPS/graphify-out/graph.json`.
- L0/L1/L2 AGENTS/CLAUDE wrappers, facts-of-record, current sprint, agent inbox, roadmap, handoff contracts, and definition-of-done.

## Decisions made

- App identity is Omen. Former app name Corvus is retained only when describing the historical rename, the retired nested `Corvus/` folder, or external operational identifiers.
- The repo directory remains `slops-saloon/corvus/` until the GitHub repo, Oracle checkout, GHCR images, KVM paths, runner labels, and container names are intentionally cut over.
- `/about` is now the public product-detail route. `/corvus` remains only as a compatibility redirect to `/about`.
- New browser storage keys are `omen.*`; old `corvus.*` keys are read/migrated so existing users keep theme/onboarding/login-next state.
- New env names are `OMEN_*`; old `CORVUS_*` names remain runtime fallbacks where they already existed.

## Unresolved questions

- When should the external repo/deploy cutover happen? Remaining legacy identifiers live in GitHub/GHCR/Oracle/KVM/container names and should be changed in one approved deploy plan.
- Should historical handoffs, audit reports, and decision logs be rewritten to Omen or kept as historical Corvus evidence? This pass preserved history except for active/current docs.

## Blockers surfaced

- No production deploy, push, DB migration, external repo rename, GHCR image rename, or container rename was performed.
- The local graph labels still contain stale Corvus nodes until graphify is refreshed after merge.

## Last verified build/test result

- `node --test` — 353/353 passing.
- `npm run build` in `frontend/` — passed. Vite kept the existing large chunk warning and NODE_ENV notice.
- `git diff --check` — passed in both L2 and L0; L0 reports CRLF normalization warnings only.

## Next recommended pull

- Run a focused `slops-code-review` on the rename diff, then decide whether to plan the external Omen deploy/repo cutover or leave legacy infrastructure names until after launch.
