# Phase 4.20d — Store Metadata, Privacy-Label, and Gambling/DFS Copy Audit

Date: 2026-07-12
Scope: `frontend/src/pages/Landing.jsx`, `frontend/src/pages/OmenLanding.jsx`,
`frontend/src/pages/Onboarding.jsx`, `README.md`.
Checked for: (a) betting/gambling/DFS/wagering/odds/guaranteed-winnings language,
(b) unqualified Yahoo/Sleeper/ESPN "live" claims not paired with the Phase 4.16
Platform Attribution Snippet disclaimer (`Legal/2026-06-28-open-agreements-provider-paragraphs.md`).

## Findings

| Surface | Current copy | Risk | Action |
|---|---|---|---|
| `Onboarding.jsx` ConnectStep, "Supported platforms" card (Yahoo Fantasy / Sleeper / ESPN Fantasy, "full Omen support") | Named platforms with support-status claims, no disclaimer anywhere on the step | High — (b) | **Fixed**: added attribution/non-affiliation line under the platform list |
| `README.md` "What It Does" — "live roster data, live ESPN schedule context, live OpenWeatherMap venue weather" + MVP Move data-status table (all rows "Live via ESPN...") | Repeated unqualified "Live" + named ESPN | High — (b) | **Fixed**: added attribution/non-affiliation line under `## Supported Platforms`; clarified "Live" denotes Omen's own connection status, not a data-rights claim from the platform |
| `README.md` "Supported Platforms" table (Yahoo/Sleeper/ESPN, "✅ Live") | Named platforms + "Live" status, no disclaimer | High — (b) | **Fixed**: same disclaimer line above covers this table (immediately below it) |
| `Landing.jsx` waitlist platform picker (`PLATFORMS = ['ESPN', 'Yahoo', 'Sleeper', 'Not sure yet']`) | Form-input option labels, not a marketing claim about data/support | Low | No action — not a claim surface |
| `Landing.jsx` "Try the live tool", "run the live Trade Analyzer" | "Live" describes Omen's own compute (vs. mock demo result), not platform data | Low | No action — accurate per mock/live labeling rule in `facts-of-record.md` |
| `OmenLanding.jsx` | No platform names, no "live" claims found | — | No action |
| `README.md` tagline "See the winning move." (x2) | Outcome-framing, not wagering/odds language | Low | No action — no betting/DFS terms present |
| All four files | No gambling/betting/DFS/odds/wagering/guaranteed-winnings language found anywhere | — | No action |

## Attribution disclaimer used

Sourced verbatim from `Legal/2026-06-28-open-agreements-provider-paragraphs.md`
("Platform Attribution Snippets" / general clause):

> Platform trademarks belong to their respective owners. Omen is not endorsed by or
> affiliated with those platforms.

That packet is marked review-only and not yet published; this audit reuses its
already-approved general clause verbatim rather than publishing the packet itself.

## Done-when checklist

- [x] Findings table produced (above).
- [x] Flagged copy rewritten (Onboarding.jsx, README.md).
- [x] Before/after: see diffs in this branch's commit.
- [x] Attribution snippet now reachable wherever provider names appear in the
      audited surfaces (Onboarding connect step, README data-status + platform tables).
- [ ] App-store description/screenshots/social-preview copy — not yet written;
      flagged for whoever drafts Phase 4.20's store listing to reuse this disclaimer.

## Evidence

- Diff: `frontend/src/pages/Onboarding.jsx`, `README.md` (this branch).
- `npm run build` / `npm test` — see handoff doc.
