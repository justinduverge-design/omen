# A5 — Tuesday scoring data source: options memo

**Date:** 2026-08-15
**Item:** `A5 — Decide the Tuesday-scoring fallback data source` (P0, Phase 2)
**Status:** research and recommendation only. The source decision is founder-owned.
**Founder steer:** prefer another **free** source in the nflverse class; a Slops-built scraper is an accepted fallback but the last option, not the opener. Amended 2026-08-15: the result must be **vendor-agnostic** across Sleeper, ESPN, and Yahoo.

---

## 0A. Superseding commercial-use correction and founder decision — 2026-08-22

The 2026-08-15 recommendation below is superseded. It treated Sleeper and ESPN as viable free production fallbacks without establishing commercial-use permission. Sleeper's official API documentation now states that the free read-only API is for **non-commercial purposes** and instructs commercial users to arrange licensing; Omen's free price does not make an LLC-operated product non-commercial. ESPN's endpoints remain undocumented and provide no clear commercial automation grant. Neither may be promoted to production fallback on the evidence below.

| Candidate | Licence / ToS | Cost | Coverage and latency | Production verdict |
|---|---|---:|---|---|
| nflverse corrected weekly stats | Repository labelled CC-BY 4.0, with the project's separate warning that underlying NFL data remains subject to its owners' terms | $0 | Standard, half-PPR, and PPR derivable; weekly publication is suitable for Tuesday grading; current primary already integrated | Keep as primary while the owned pipeline is proved; retain attribution/provenance and the underlying-rights caveat |
| Sleeper stats | Official docs: free API is non-commercial; commercial licensing requires contact | unknown commercial quote | Technically strong and fast; exact three scoring totals; undocumented stats route adds schema risk | Reject as production fallback without a written commercial licence |
| ESPN public endpoints | No published API licence or stable supported contract established | $0 endpoint access, rights unclear | Technically live and broad; withdrawal/schema risk high | Reject as production dependency |
| BALLDONTLIE NFL GOAT | Current terms expressly permit lawful commercial fantasy-sports use through official interfaces | $39.99/month; 600 requests/minute | Completed weekly stats and scoring definitions; standard, half-PPR, and PPR available; 48-hour trial | Best immediately licensable independent fallback, rejected by founder on cost grounds for now |
| FantasyPros commercial | Commercial licence and redistribution rights available | custom quote | `player-points` supports accumulated NFL fantasy points across week ranges | Viable but price-opaque and unnecessary after the owned-pipeline choice |

**Owned option, costed:** approximately 30–50 engineering hours for collectors, immutable raw storage, identity normalization, scoring derivation (including kicker/DST edge cases), replay, tests, monitoring, and runbooks; 18–36 hours of routine attention across an 18-week regular season; and a 10–20-hour incident/correction reserve. Expected season-one effort is therefore **58–106 hours**, with near-zero incremental infrastructure spend if existing VPS/Pi capacity is adequate. This estimate must be refined by `A7` after source and topology research; a pipeline consuming only nflverse inputs improves operational control but does not survive total nflverse loss.

**Founder decision:** choose the Slops-owned Omen pipeline now; do not add a paid subscription. Route automated collection and processing through a source-rights-first architecture pass that evaluates VPS and Raspberry Pi roles. Tuesday scoring is the first bounded consumer; future Slops-owned ADP is an extension seam, not part of this item's completion claim.

**Sleeper outreach:** Justin sent a commercial-use permission/licensing request on 2026-08-22. Response pending; no permission is claimed, and the owned-pipeline work continues independently.

**Trigger:** immediate. `A7-OwnedFootballDataPipeline` begins with research and non-production historical replay; no collector reaches production until its automation rights, data quality, failover, monitoring, and maintenance cost are documented and reviewed.

**Primary sources rechecked 2026-08-22:** [Sleeper API introduction](https://docs.sleeper.com/) (commercial licensing boundary and rate guidance); [nflverse-data](https://github.com/nflverse/nflverse-data) and [nflverse availability schedule](https://nflreadr.nflverse.com/articles/nflverse_data_schedule.html); [BALLDONTLIE NFL API](https://nfl.balldontlie.io/) (weekly fantasy-stat coverage and $39.99 NFL GOAT tier); [BALLDONTLIE Terms](https://www.balldontlie.io/terms.html) (commercial fantasy-sports permission and third-party-rights caveat); [FantasyPros API](https://www.fantasypros.com/api-data/) (player-points coverage and custom commercial tier); [SportsDataIO developer access](https://sportsdata.io/developers) (commercial access is sales-gated; $99/month Discovery Lab is not licensed for commercial redistribution).

---

## 0. Summary

The premise this item was written on was wrong, and the correction is good news.

A5 was framed as *"if nflverse never publishes `player_stats_2026.csv`."* That file was never going to exist under that name — for any season. nflverse reorganized its releases and the `player_stats` tag stopped receiving new seasons after 2024. Omen's cron had been pointed at a retired path that 404s for 2025 as well as 2026. **That is now fixed** (`A5-NflversePath`, verified, 537/537).

So the real question is not "what replaces a source that failed to publish." It is **"how does Tuesday scoring survive any one source dying mid-season."** That is a resilience question, and it has a cheaper answer than a fork.

**Recommendation:** formalize a `ScoreSource` interface with ordered fallback — corrected nflverse as primary, Sleeper stats as secondary. Do not fork nflverse for beta. Revisit the fork post-beta as an owned-data project rather than a season dependency.

---

## 1. The vendor-agnostic requirement, stated precisely

The founder's ask is that scoring work for Sleeper, ESPN, and Yahoo users alike. Inspection shows **this is already true**, for a reason worth making explicit:

> **Weekly fantasy points are a league-independent NFL fact.** A Yahoo user's Mahomes recommendation is graded against the same stat line as a Sleeper user's. The scoring feed is not read through any league provider's API and is not scoped to a league.

The pipeline reflects this already:

- `nflverseScoresFromCsv` keys on `normalizeName(player_name)` — a name, **not** a provider ID
- it emits all three formats: `{rec_std, rec_half, rec_ppr}`
- `runScoring` already dependency-injects `fetchNFLScores` (`src/omen_tuesday_cron.js`), and the test suite already exercises that seam

So what the founder actually needs is **source-agnosticism**: never be locked to one *data vendor*. That is a smaller, better-defined build than provider-agnosticism, and the seam for it already exists.

**One genuine per-league dimension does exist, and it is currently broken.** See §5 — `moves.scoring` is not persisted, so every move is graded as PPR regardless of league settings. No amount of source diversity fixes that; it is tracked separately as `A6-MovesScoringFormat`.

---

## 2. Sources evaluated

All probed live on 2026-08-15.

### 2.1 nflverse (primary, corrected)

| | |
| --- | --- |
| **Endpoint** | `github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_<season>.csv` |
| **Licence** | CC-BY 4.0 — permissive, attribution only |
| **Cost** | Free |
| **Coverage** | 2025 file verified: `REG` weeks 1–18 (18,540 rows), `POST` 19–22 (882). Required columns present. **No `PRE` rows, ever.** |
| **Latency** | Published after the week completes; historically adequate for a Tuesday job |
| **2026 status** | **Not yet published** — no 2026 asset under either tag. Expected once the regular season starts. |
| **ToS** | Public GitHub release assets, open-data project. No auth, no rate concern at one fetch/week. |

**Verdict: keep as primary.** Purpose-built for exactly this, permissively licensed, and the parser already matches its schema. Its one real weakness is that it is a volunteer open-data project that has now reorganized its release layout at least once — which is the argument for a fallback, not for abandoning it.

### 2.2 Sleeper stats (recommended secondary)

| | |
| --- | --- |
| **Endpoint** | `api.sleeper.app/v1/stats/nfl/{regular\|pre\|post}/<season>/<week>` |
| **Licence** | No published open-data licence — undocumented public API. **This is the main risk.** |
| **Cost** | Free, no auth, no key |
| **Coverage** | `regular/2025/1` → 200, full `pts_ppr` / `pts_half_ppr` / `pts_std`. **`pre/2026/1` → 200, 1,712 players, 329 individuals with real PPR points.** `pre/2026/2` → `{}` (not yet played). |
| **Latency** | Fastest of the three — live in-week |
| **ToS** | Sleeper has historically tolerated public read use and Omen already depends on this host for league data. Needs a read before it becomes a launch dependency. |

**Verdict: recommended secondary.** It is the only source carrying **2026 preseason data today**, it returns the exact field the parser needs, and Omen already ships an adapter for the host.

Three honest caveats:

1. **These are Sleeper's scoring computations, not an official league stat line.** Fine for grading Omen's own past calls; not a neutral system of record.
2. **Concentration risk.** Sleeper would serve both league connection *and* scoring. If Sleeper is down, a Sleeper user loses both at once — though ESPN and Yahoo users would still be graded.
3. **Identity mismatch.** nflverse keys by **name**; Sleeper keys by **player_id**. A Sleeper source needs the id→name map. `src/adapters/sleeper.js:394` already fetches `players/nfl`, so the infrastructure exists — but `findBestMatch` fuzzy name matching is fragile across sources (suffixes, D/ST, `TEAM_*` entries). The interface should carry an **optional stable id** so sources that have one do not downgrade to fuzzy matching.

### 2.3 ESPN public stats (viable third)

| | |
| --- | --- |
| **Endpoint** | `site.api.espn.com/apis/site/v2/sports/football/nfl/*` |
| **Licence** | None published. Undocumented public API; the most likely of the three to be withdrawn or gated. |
| **Cost** | Free, no auth |
| **Coverage** | Live and already serving the 2026 preseason (`type: Preseason` confirmed). Omen already has an ESPN adapter. |
| **Latency** | Live in-week |
| **ToS** | Weakest position of the three. Acceptable as a third fallback, not as a primary. |

**Verdict: register third, do not depend on.**

### 2.4 Fork nflverse onto a Pi or the VPS

**Costed honestly, because it is the option the founder raised.**

| Dimension | Assessment |
| --- | --- |
| **What it buys** | Ownership. No upstream can retire a path or a tag under you again. |
| **What it does *not* buy** | **Anything for the advice engine.** nflverse feeds *only* Tuesday scoring — grading past recommendations. Advice runs on provider projections (`src/services/omen.js:1060`). The prize is the grading loop, not the product. |
| **Build cost** | R toolchain (nflreadr/nflfastR), an ingest pipeline, scheduled execution, storage, monitoring |
| **Run cost** | A pipeline that must be alive **every Tuesday of the season**. A Pi that reboots or a VPS that fills its disk in week 9 is a silent scoring outage. |
| **Timing** | Beta targets the season opener. This converts a data problem into an in-season maintenance obligation during the tightest weeks. |

**Verdict: not for beta.** This is precisely the "converts a data problem into a maintenance obligation" outcome the founder's own steer named as the last option. It is a good post-beta project — owned data, better coverage, no upstream risk — once the season is not the deadline.

---

## 3. Recommendation

**Formalize the seam that already exists.**

```
ScoreSource: (season, week, seasonType) → { normalizedName: {name, id?, rec_std, rec_half, rec_ppr} }
                                        | deferred(reason)
```

Register implementations in priority order; the first non-empty result wins; `deferred` from *all* sources defers the move (current behavior, preserved).

1. **nflverse** — corrected path, primary
2. **Sleeper stats** — secondary, id→name mapped, the only preseason-capable source
3. **ESPN** — third, registered but not depended on

Properties this gives you:

- **Any single source can die without ending the season.** That is the actual vendor-agnostic requirement.
- **It is additive.** `runScoring` already injects `fetchNFLScores`; this replaces one injected function with an ordered list. No schema change, no new dependency, no production mutation.
- **It is testable offline**, like the rest of the cron.
- **It keeps failure honest.** Deferral stays deferral; a published-but-empty week still fails closed.

**Trigger date: 2026-09-01.** If nflverse has published a 2026 asset by then, the primary is healthy and the fallback is insurance. If it has not, the fallback is load-bearing from week 1 and the Sleeper ToS read becomes blocking rather than advisable.

## 4. What the founder is being asked to decide

1. **Approve the `ScoreSource` interface with ordered fallback** (agent-buildable, no gates), or accept nflverse-only risk.
2. **Accept or reject Sleeper as secondary**, given §2.2's three caveats — particularly that it is an undocumented API with no published licence.
3. **Confirm the fork is post-beta**, not pre-beta.

## 5. Related, tracked separately

- **`A6-MovesScoringFormat`** — every move is graded as PPR because `moves.scoring` is not persisted. The one genuinely per-league scoring dimension, and it is a correctness defect no data source fixes. Founder-gated (schema change).
- **`A5-NflversePath`** — the retired-path repair. Verified 2026-08-15, 537/537.
- **`A4`** — production enablement of Tuesday scoring. Unchanged by this memo; still behind `OMEN_CRON_SCORING_ENABLED=false` pending an approved no-write dry run.

## 6. Evidence

- Live probes of the nflverse release index, Sleeper stats/projections endpoints, and the ESPN scoreboard, 2026-08-15
- `stats_player_week_2025.csv` downloaded and parsed: 8.6 MB, `REG` 1–18 / `POST` 19–22, no `PRE`, required columns present
- `api.sleeper.app/v1/stats/nfl/pre/2026/1`: 1,712 players, 329 individuals carrying `pts_ppr`
- Backend suite **537/537** after the path repair
- Handoff: `Blueprints/handoffs/2026-08-15-native-api-scope-and-scoring-source.md`

No provider account was accessed, no credential was used, and no production or database state was changed in producing this memo.
