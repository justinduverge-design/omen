# Omen trade value v3 — "Crown Odds": what a trade does to your title chances

**Status:** Proposed — awaiting founder approval
**Date:** 2026-10-10
**Sprint item:** `TV-V3` in `Direction/current_sprint.md`
**Replaces:** the VORP v2 trade verdict (`src/services/vorp.js`, `src/services/tradeValue.js`): fixed replacement
levels, the additive scarcity bonus (+2.0 / +0.5 / −0.5) and the 1.0 / 0.5 / 0.25 depth discount
**Production authority:** none. Phase V1 is local only. Names are provisional; see
`omen-stat-registry-v1.md` §1.

## 1. Founder decisions this spec implements (2026-10-10)

| # | Decision |
|---|---|
| 1 | **The provider's projections stay the main number.** Omen aims to beat them and measures whether it does; Omen's own read is shown as evidence, never as a replacement number. |
| 2 | Trade value is built on the lineup change, **and scarcity must be covered explicitly**, because it's part of trading. |
| 3 | Fantasy playoff weeks are **weighted by the user's playoff odds**. |
| 4 | Replacement level is **the best player actually free in this league**, with a formula fallback. |
| 5 | Floor versus ceiling is set **automatically** from the user's standing. |
| 6 | Dynasty leagues include **future seasons** in trade value. |
| — | The vision for v3 is **change in title and playoff chances**, not just points. |

## 2. Why v2 is replaced

- **Fixed replacement levels** were hand-set in May 2026, with a ±35% league-shape cap.
- **The scarcity bonus counts scarcity twice**: value over replacement already includes it, and the bonus's
  thresholds are arbitrary.
- **The depth discount ignores league size** and never asks whether the extra player would start.
- **One week of projections** values a rest-of-season asset.
- **No uncertainty.**

The 2026 critic review (`Slops-OS/Direction/reviews/vorp-v2-critic-review.md`) flagged the constants and the
superflex gap.

## 3. The model, in three layers

### Layer 1: player outlook, week by week, rest of season

- **Mean per future week:** the provider's projection (decision 1).
  - **Current week:** the provider's weekly projection.
  - **Future weeks:** the provider's rest-of-season projection spread across the player's remaining games
    when the provider publishes one; otherwise the current-week projection carried forward.
  - **Byes:** a bye week is 0.
  - **Status:** OUT is 0. Doubtful and Questionable use a play probability (§6, parameter `p_play`) instead of
    v2's fixed point penalty.
- **Spread:** each player's outcome distribution for a week comes from Omen's historical floor/ceiling model
  (`omen-stat-registry-v1.md` stat `OUT-04`), conditioned on position and the projection's size. This is
  the only Omen-built input to the mean/variance in v3. It shapes risk, not the provider's number.
- **Correlation:** a QB and his own pass-catchers are positively correlated (parameter `rho_stack`, fitted from
  history).

### Layer 2: lineup value

- For each team and each remaining week, the **best legal lineup by expected points** under the league's real
  slots: superflex, TE premium scoring, flex types and IR rules all come from the provider's settings.
- **Solver:** `tradeLineup.js` today does an exhaustive search that has already taken production down
  (2026-09-05). v3 **requires** the tracked bipartite-matching replacement, which gives the same answer in
  polynomial time. No v3 code runs on the old solver.
- **Replacement level (decision 4):** the best free agent at each position in **this** league this week, from
  the provider's player pool minus all rosters.
  - **Fallback:** when the free-agent pool can't be read, use the (teams × starters at position + flex
    share + 1)-th best projected player, labelled `replacement_source: "formula"`.
  - Replacement players fill a lineup hole when a starter is on bye, OUT or traded away.

### Layer 3: season simulation, "Crown Odds"

- **Inputs:** the league's remaining schedule and playoff format (number of teams, weeks, byes, tiebreakers)
  from the provider; every team's roster; Layers 1–2.
- **Each run:**
  1. Draw every player's points for every remaining week from Layer 1.
  2. Each team starts its Layer 2 lineup.
  3. Score the matchups and update standings with the league's tiebreakers.
  4. Play the bracket.
- **Runs:** 10,000 per scenario. "Before" and "after" use the **same random draws** (common random numbers),
  so the difference is the trade, not noise.
- **Outputs per team:**
  - playoff odds and title odds;
  - **expected lineup points, rest of season**, with playoff weeks weighted by that team's playoff odds
    (decision 3).
- **Speed target:** under 2 seconds per trade comparison on the API host.
  - The baseline ("before") is cached per league per projection refresh.
  - The run happens off the request path if needed. The 2026-09-05 incident's budget rule applies:
    no recommendation may block other requests.

## 4. Scarcity, covered explicitly (decision 2)

Scarcity enters in three named places, none of them an additive bonus:

1. **Free-agent scarcity:** replacement level is the real waiver pool (Layer 2). A thin position has a low
   replacement level, so every starter there is worth more.
2. **Roster scarcity:** the lineup change. Receiving a player you'd never start is worth little; losing your
   only startable TE is worth a lot.
3. **Injury-path scarcity:** in the simulation, an injured starter is replaced by your next-best player or
   the best free agent. A position with a cliff behind your starter makes depth there worth more. This is
   the honest version of the old depth discount.

**The user sees it as the Scarcity Meter** (provisional name; registry stat `VAL-03`), shown per position:

- startable supply left in the league against demand;
- the drop from this player to the next available tier.

It explains the verdict ("TEs are scarce in your league: after the top 6, the best free agent scores 4.1"),
but it isn't added on top. It's already inside layers 1–3.

## 5. The verdict

| Output | Use |
|---|---|
| **Crown Odds change:** your title odds after minus before | the headline verdict |
| playoff odds change | second line |
| rest-of-season lineup points change (playoff-weighted) | the explainable "why" number |
| the other manager's Crown Odds change | "Would they accept?": a fair offer improves both, or costs them little |
| Scarcity Meter per position involved | why the lineup change is what it is |

**Automatic floor/ceiling (decision 5)** falls out of the objective:
- a team that's comfortably in benefits from safer players, because variance can only cost it;
- a bubble or long-shot team benefits from upside, because variance is its path in.

Maximising title odds does this without a hand-set risk dial. The same playoff-odds band sets the start/sit
lean.

**Verdict bands:** accept / lean accept / neutral / lean decline / decline, from the Crown Odds change. The
thresholds are parameters fitted in §8.

**Display:**
- **Facts-of-record fact 16:** confidence is a band, never a percentage.
- **Omen issues no trade call where a provider won't give it the other rosters.** v3 needs every roster and
  the schedule; without them, no Crown Odds and no trade call.
- **D-CROWN, decided 2026-10-10:** title contention may carry a number (e.g. "title odds 18% → 24%"). The
  confidence of the call itself stays a band (fact 16).

## 6. Dynasty and keeper leagues (decision 6)

When the provider marks the league dynasty or keeper:

```text
trade value = Crown Odds change (this season)
            + horizon weight × Horizon value change (future seasons)
```

- **Horizon value:** for each future season up to 3, the player's expected value over replacement. It comes
  from the age curve (registry `DYN-04`), the dynasty outlook (`DYN-01`..`DYN-03`), and a per-year discount
  (parameter `horizon_discount`, starting at 0.75).
- **Horizon weight** is automatic, like decision 5:
  - **low** for a contender this season (title odds in the top band);
  - **high** for a team outside the playoff picture.
- Keeper leagues count only the seasons the player can be kept, per league settings.
- **Phase V2:** the dynasty layer can't be validated in-season. It ships labelled as an outlook, after the
  1999+ backfill gives the age curves.

## 7. Parameters (recorded on every run, never silently changed)

| Parameter | Starting value | How it's set |
|---|---|---|
| `runs` | 10,000 | fixed |
| `p_play` Questionable / Doubtful | fitted from history: share of players with that status who played | fitted |
| `rho_stack` | fitted from history | fitted |
| floor/ceiling distribution | registry `OUT-04` | fitted |
| verdict band thresholds | fitted in §8 | fitted |
| `horizon_discount` | 0.75 | founder-reviewable |
| horizon weight by band | low 0.25 / middle 0.5 / high 0.8 | founder-reviewable |

## 8. Proof before shipping

- **Weekly win probabilities are calibrated.** Across all connected leagues, matchup win probabilities in each
  10-point bucket land within ±5 points of the actual win rate, checked as the season runs. The Brier score
  is reported weekly. Crown Odds aren't shown until two consecutive weeks pass.
- **Provider comparison (decision 1).** Provider projections are already archived in
  `public.projection_snapshots`. Each week, compare provider projections with actual points, and with
  provider + Omen evidence adjustments, in `public.projection_shadow_log`. Omen's read is promoted from
  "evidence" to "adjusts the number" **only by a founder decision after a season of results**. An adjustment
  is never assumed to win.
- **v2 against v3 on real offers.** Re-score every saved trade (`saved_trades`) under both. The report lists
  where they disagree and why. The founder reads it before V1 replaces v2.
- **Scarcity sanity:** in synthetic leagues (10 / 12 / 14 teams; 1QB vs superflex; TE premium on/off), the
  Scarcity Meter and the lineup change move in the expected direction.

## 9. Phases

| Phase | What | Approval |
|---|---|---|
| **V0** | bipartite-matching lineup solver (required first) | this spec |
| **V1** | Layers 1–3, scarcity meter, verdict, the v2-vs-v3 report; local and test fixtures | this spec |
| **V2** | dynasty horizon layer | after the backfill; founder review |
| **V3** | replace the v2 verdict in `/api/trade/compare`, behind a flag, with v2 as rollback | separate founder yes (deploy) |

## 10. Files

| File | Purpose |
|---|---|
| `src/services/lineupSolver.js` | bipartite-matching lineup solver; `tradeLineup.js` moves to it |
| `src/services/tradeValueV3/playerOutlook.js` | Layer 1 |
| `src/services/tradeValueV3/replacement.js` | free-agent replacement level and the formula fallback |
| `src/services/tradeValueV3/seasonSim.js` | Layer 3 with common random numbers |
| `src/services/tradeValueV3/scarcityMeter.js` | `VAL-03` |
| `src/services/tradeValueV3/verdict.js` | bands and both-sides output |
| `test/tradeValueV3*.test.js` | solver parity with the old solver, superflex and TE premium, bye holes, a free-agent pool that can't be read (fallback), common-random-number stability, both-sides output, the dynasty weight switch |

Skills: `slops-tdd`, `slops-api-hardening` (V3 route change), `slops-code-review` before the PR.
