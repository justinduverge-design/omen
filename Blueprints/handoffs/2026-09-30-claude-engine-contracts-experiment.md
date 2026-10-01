# Handoff — Claude session, 2026-09-30: device fixes, API contracts, weather client, factor experiment

**Merged to `main`:** #494 (dark-only, lock Command Center mounted on real data, league multiselect restored, native device gate, engine-v2 spec), #495 (Open-Meteo client + 41-venue table, not wired to production), #496/#497/#498 (S0: 31 API contracts with recorded fixtures, schemas, locks, server and iOS tests; the drift check is blocking in the PR and deploy gates), #499 (the database lane belongs to Claude or Codex; Jules and Muse do not touch it). **Open:** #500 (the factor experiment and its close-out records).

**Bugs found and fixed:** an expired ESPN connection showed "update the app" on iOS (the app read recovery from a field v3 does not send); every FAAB and priority waiver league showed "not determined" on iOS (the server never sent `budget_text`/`order_text`; now composed server-side); the League tab hardcoded "Confident / Low risk" on every waiver claim (removed); a trade message tripped the no-draft-claims test and `main`'s iOS suite had been red; the Ledger error and ESPN multi-league picker.

**The finding that changes the plan:** `Direction/2026-09-30-first-factor-experiment.md`. No football-context family measurably beat a decent projection on close start/sit calls. The factor pipeline (S2, S4, S5) is on hold. The product reframe is the founder's decision.

**Not verified:** the iOS fixes from #496/#497 on the founder's phone (it was unreachable); the ESPN multi-league connect on a device; Android dark-only; a real production response against any schema; the changed deploy gate (first exercised on the next code push to `main`).

**Resume:** (1) founder decides the product reframe; (2) install `main` on the phone and walk the Omen, Trade, League and Ledger tabs against the artboards; (3) database tickets D2-D4 in `Direction/current_sprint.md` (Claude or Codex only; need a scratch Postgres 17, none installed on the founder's Mac); (4) WO-07/WO-08 are held; WO-06's migration is unapplied and must keep a reversible copy of what it deletes before it is ever applied.
