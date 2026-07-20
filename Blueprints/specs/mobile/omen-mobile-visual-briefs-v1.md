# Omen Mobile Visual Briefs v1

**Status:** Approved visual build contract  
**Date:** 2026-07-20  
**Owner:** Native mobile product/design  
**Applies to:** SwiftUI iPhone app and Kotlin/Jetpack Compose Android app  
**Companions:** `omen-native-design-house-v1.md`, `omen-native-design-system-registry-v1.md`, `omen-native-app-shell-auth-api-contract-v1.md` (M0c)

> This document turns founder-approved page behavior into buildable visual direction. It is not permission to substitute fixtures or unsupported provider data for live facts.

---

## 1. Command Center

### 1.1 Job and hierarchy

Command Center is the selected roster's weekly fantasy desk: **“How is my team doing, and what deserves attention right now?”** It orients and prioritizes; it does not duplicate Omen's full decision workspaces.

First-screen order:

1. Page title and contextual profile/avatar control.
2. Persistent selected team/league context strip.
3. Matchup Hero.
4. Waiver Watch.
5. Ledger preview.
6. League Pulse.

The surface uses Raven black/deep-charcoal layers, bone-white type, selective aged-brass structure, verdigris for verified favorable/available states, and sparing crimson for material risk. It must not repaint itself in NFL/team colors, use bird/raven imagery, crescents, literal footballs, NFL-shield styling, flashing, or decorative “AI” motion.

### 1.2 Matchup Hero — approved

**Purpose:** establish the sports heartbeat before Omen asks the user to act.

Use an Omen-owned **vertical head-to-head matchup spine** with a quiet right-side **What to Watch** insight rail:

```
WEEK 7 · LIVE

JUSTIN TITANS  6–1                  WHAT TO WATCH
64.8                               Opponent has two players
  │                                 remaining Monday night.
  │  Projected: 119.6–114.2
  │
58.1                               View matchup →
MARCUS'S TEAM  5–2
```

- The selected team is at the top; opponent is at the bottom.
- Each record sits beside or at the lower-right edge of its team name in smaller, muted type — never beneath the name.
- Actual live/final scores are the strongest numbers. Before games, projections are clearly labelled as projections.
- The centered projection/final context connects the two teams but never overwhelms score legibility.
- The right insight rail contains exactly **one concise, factual What to Watch signal**, two-to-three lines maximum.
- A thin aged-brass rule or subtle lace-derived connector may define the spine. Do not use a literal tournament bracket, mini field, player headshots, giant logos, or a broadcast-style score bug.
- The entire card is one clear accessible tap target that opens League → This Week’s Matchup.

**What to Watch rules**

It is situational context, not a recommendation:

- Good: “Projected within 4.2 points.”; “Opponent has two players remaining Monday night.”; “You have one inactive player in a starting slot.”
- Not allowed: Start/Sit instructions, hot takes, certainty language, or duplicate Omen reasoning.

**Temporal states**

| State | Required expression |
|---|---|
| Before games | Clearly labelled projections, start time, and relevant lineup risk. |
| Live | Actual score first; projected finish second; verified remaining-player context. |
| Final | Final score and plain result. Route the user to the week’s Ledger rather than using celebration or loss drama. |
| No matchup / off-season | Honest season or schedule context; never fabricated weekly scoring. |

At narrow widths, the insight rail may move beneath the matchup spine rather than compress text below readability. The relationship remains matchup first, one factual signal second.

### 1.3 Waiver Watch — approved

**Purpose:** surface time-sensitive, roster-aware opportunity and route the user to Omen → Waiver Analysis. Command Center never presents a full add/drop decision as if it completed the work.

#### Tuesday–Wednesday — urgent briefing

Use a concise deadline-aware briefing:

```
WAIVER WATCH                                  Deadline Wed · 3:00 AM

BEST MOVE
Add Tyrone Tracy Jr. · RB
Available in your league
Immediate help at RB during a thin Week 7.

Review Omen’s waiver analysis  →

FOR THE LONG HORIZON
1  Add Player A · dynasty upside
2  Add Player B · future opportunity
```

- Header: Waiver Watch plus a verified league-specific deadline/status.
- Best Move: the largest surface; restrained brass keyline/top rule; player, position, NFL team, verified availability status, and one factual reason.
- CTA: opens Omen → Waiver Analysis in the already-selected team/league context.
- For dynasty/keeper teams, show exactly two smaller Long-Horizon Move rows below the Best Move.
- For redraft, show a relevant forward-looking stash only when it is genuine; otherwise omit the long-horizon section rather than inventing dynasty framing.
- No giant `ADD NOW` button, fake “AI score,” countdown animation, flashing, pulsing, or certainty about claim success.

#### Thursday–Monday — calm opportunity list

Use a ranked list of verified/relevant opportunities:

```
WAIVER WATCH

1   Player A · WR
    Available · Helps cover your Week 8 bye

2   Player B · RB
    Available · Role increased last week

3   Player C · TE
    Availability needs confirmation

See full waiver analysis  →
```

- No emergency treatment unless the selected league actually has another relevant waiver deadline.
- One factual reason per row.
- Equal-weight ranked rows, clean dividers, and no manufactured alarm state.

**Required states**

| State | Required message/behavior |
|---|---|
| Pending | “Omen has identified an opportunity. Claim outcome is not yet known.” |
| Processed | “Your league’s waivers have processed. Review current opportunities.” |
| Availability unknown | “Omen cannot confirm availability for this league.” |
| No credible move | “No waiver move stands out for this roster right now.” |
| Not connected | Explain personalized value and offer connection/demo path. |
| Off-season | Relevant draft/long-horizon context only; no fake weekly urgency. |

The actual deadline must derive from verified `waiver_deadline_at` data when available; the Tuesday–Wednesday cadence is a default, not a replacement for live league configuration.

### 1.4 Ledger preview — approved

**Purpose:** give Omen an accountable record of what it recommended, when, what evidence was available, and what happened next. It is an audit trail, not a victory lap.

```
THE LEDGER                                      See all →

WEEK 6 · START / SIT
Start DeVonta Smith over Chris Olave
Result: Smith 18.4 · Olave 11.2
Resolved · Omen’s call aligned with the outcome

WEEK 6 · WAIVER
Add Tyrone Tracy Jr.
Claim pending
Review recommendation →
```

- Display one to three recent meaningful calls.
- Each is a quiet timeline row, not a large nested card.
- Use compact call-type labels: Start/Sit, Waiver, or Trade.
- The entry summary is plain English; result/status is factual.
- A thin brass timeline mark may express chronology.
- Tapping an entry opens its full Omen → Ledger record.

**Outcome language**

| State | Example |
|---|---|
| Pending | “Claim pending” / “Games have not started” |
| Active | “Smith is active · 11.8 fantasy points” |
| Resolved | “Smith 18.4 · Olave 11.2” |
| Insufficient comparison | “Outcome recorded; comparison was not applicable” |
| Data incomplete | “Omen could not verify the final result” |
| Superseded | “A newer recommendation replaced this call before kickoff” |

Do not reduce calls to “right” or “wrong” where a fair comparison is impossible, data is incomplete, the difference is negligible, or the user could not reasonably act. For waivers and trades, recording the recommendation and user action (when safely known) is more honest than declaring a definitive outcome after one week.

No win-rate badge, streak, boastful copy, celebration, or leaderboard belongs in the Command Center preview.

**Data integrity**

- Ledger entries are immutable snapshots of recommendation, timestamp, selected team/league context, and evidence available at the moment of recommendation.
- Observed outcome data is stored separately from the original call.
- Each record carries a provider/data-verification state.
- Never mix history across the user’s selected teams/leagues.

### 1.5 Shared native behavior

- Keep top-level navigation native: iOS tab bar + NavigationStack/sheets; Android navigation bar + Compose navigation/bottom sheets.
- Context selection opens a native sheet organized by platform, then alphabetically by league; active selection remains obvious.
- Loading preserves the silhouette of Matchup Hero, Waiver Watch, and Ledger preview, with named operation copy such as “Reading Dynasty Dogs.”
- Motion is limited to native transitions and a restrained one-time content settle on genuine change. Reduced-motion and reduced-transparency static fallbacks are required.
- Copy remains calm, factual, evidence-bound, and nonjudgmental. Facts and Omen inference must be distinguishable.
- Never show mocked, stale, unsupported, or unavailable provider data as live fact.

## 2. Implementation references

- [Apple Human Interface Guidelines — Tab bars](https://developer.apple.com/design/human-interface-guidelines/tab-bars)
- [Apple Human Interface Guidelines — Sheets](https://developer.apple.com/design/human-interface-guidelines/sheets)
- [Material Design 3 — Navigation bar](https://m3.material.io/components/navigation-bar/overview)
- [Material Design 3 — Bottom sheets](https://m3.material.io/components/bottom-sheets/overview)

## 3. Founder approvals

- Command Center layout and visual hierarchy, including Matchup Hero → Waiver Watch → Ledger preview: Justin, 2026-07-20.
- Matchup Hero: vertical head-to-head spine with right-side What to Watch rail; records beside team names: Justin, 2026-07-20.
- Waiver Watch: urgent briefing Tue/Wed; calm ranked opportunity list Thu–Mon; Best Move plus two long-horizon moves for dynasty/keeper context: Justin, 2026-07-20.
- Ledger: accountable, factual preview; no confidence theater or self-congratulatory scoring: Justin, 2026-07-20.


---

## 2. Pre-midseason League Intelligence Enhancements

**Release intent:** These are post-beta improvements intended to be individually releasable before midseason where their provider data, calculation rules, and validation evidence are ready. They do **not** block beta and must not appear as live capability before they are proven for the selected league/provider.

### 2.1 Playoff picture — explainable, not performative

League Pulse may evolve from a basic current-position label into a small **Playoff Picture** module:

```
PLAYOFF PICTURE
3rd of 12 · Currently in a playoff spot
2 games clear of the cut line
Next meaningful shift: a win keeps you above Marcus’s Team
```

Release in stages:

| Capability | User-facing expression | Required proof |
|---|---|---|
| Current playoff status | “Currently in a playoff spot” / “1 win outside the playoff line” | Verified league standings, playoff-team count, divisions, and tiebreaker configuration. |
| Cut-line distance | “2 games clear of the cut line” | Same verified format data plus correct handling of ties. |
| Clinch/elimination status | “Can clinch a playoff spot this week” | Exhaustive scenario calculation and test fixtures; must explain the condition. |
| Playoff likelihood | “Playoff likelihood: 78%” | A documented model, input freshness, format-specific validation, plain-language methodology, and a safe unavailable state. |

A percentage must never appear as unexplained magic. Where a full model is unavailable, use verified position and cut-line language instead.

### 2.2 Short explanation layer

Each meaningful League Pulse metric gets an optional **Why this matters** line. It gives context without turning Command Center into a tutorial:

- “Two games clear of the cut line: a loss this week does not remove you from a playoff spot.”
- “Points for is the active tiebreaker in this league.”
- “A Week 8 win would move you above Marcus’s Team if their matchup result holds.”
- “Projection is close; this result could affect the playoff order.”

Rules:

- One sentence maximum.
- State the format/source dependency where it changes the meaning.
- Distinguish a verified league fact from a conditional scenario.
- Do not show a scenario until all stated assumptions are known.

### 2.3 Standing movement and matchup stakes

Add a concise, verified **This Week’s Stakes** fact when it changes how the matchup feels:

| Feature | Example | Guardrail |
|---|---|---|
| Live standing movement | “A win moves you to 2nd if Marcus’s Team loses.” | Only show with current concurrent matchup data and explicit condition. |
| Points-for movement | “You are 18.6 points behind 2nd in points for.” | Only when points-for is meaningful in the league’s tiebreaker/standings configuration. |
| Clinch path | “You clinch with a win and a loss by Team X.” | Link to explanation; no partial or unverified scenario math. |
| Elimination risk | “A loss could eliminate you if Team X wins.” | Same exhaustive validation requirement as clinch. |
| Rivalry note | “Coming after beta for compatible connected leagues.” | Historical head-to-head remains post-beta; no inferred manager identity or provider-parity promise. |

### 2.4 League activity signals

The compact “Around the League” bulletin may gain provider-supported signals:

- Meaningful waiver claims that affect the selected roster’s competitive context.
- Completed trades that shift a contender’s roster.
- Playoff-line changes after weekly results.
- Verified league deadlines, including trade deadline and playoff start.

It must not become a generic NFL news feed, an exhaustive transaction log, or an opinionated power ranking. Show one or two facts maximum, then route to League for more.

### 2.5 Delivery and integrity gates

Each enhancement ships only when it has:

1. **Format capability matrix** — what Sleeper, Yahoo, and ESPN can reliably provide for this exact feature.
2. **League-settings normalization** — playoff teams, divisions, schedules, median matchups, tiebreakers, scoring period, and deadline rules are known or safely marked unavailable.
3. **Deterministic test fixtures** — ordinary, tied, division, median-matchup, clinch, and elimination cases.
4. **Explainability copy** — one plain-language explanation and a “not available” state.
5. **Provider-specific live-data proof** — no global claim of parity based on one provider.
6. **Founder review** — visual proof on iPhone and Android before release.

### 2.6 Priority order

1. Verified current playoff status + cut-line distance.
2. One-sentence “Why this matters” explanations.
3. This Week’s Stakes / conditional standing movement.
4. Verified league activity signals.
5. Clinch/elimination scenarios.
6. Explainable playoff-likelihood model.

This order gives Omen useful seasonal intelligence early, while treating probability and scenario math as work that must earn trust.



---

## 3. Travel & Schedule Context — approved direction

Travel and rest are relevant football context when they materially affect the selected roster or matchup. They belong in **League → Relevant Football Context** and may appear as a single Command Center/Matchup Hero “What to Watch” fact when they are the most meaningful current signal.

### 3.1 What Omen may show

```
TRAVEL & REST

Los Angeles at New England · Sunday 1:00 PM ET
Cross-country away game · short-rest week
The Rams’ reported travel plan is to arrive Saturday.
```

Use only the facts that matter:

| Signal | Example expression | Required evidence |
|---|---|---|
| Short week | “Playing Thursday after a Sunday game.” | Verified NFL schedule/rest interval. |
| Long rest / bye | “Coming off a bye week.” | Verified NFL schedule. |
| Time-zone change | “Cross-country away game: Pacific to Eastern.” | Verified game location/time zone and team location. |
| International travel | “International game with an extended travel window.” | Verified schedule and official/reputable travel reporting. |
| Consecutive road stretch | “Third straight road game.” | Verified NFL schedule. |
| Reported travel timing | “The team’s reported plan is to arrive Saturday.” | Dated, attributable report for this week’s trip. |
| Disruption | “Travel conditions may be affected by a verified delay.” | Credible, current reporting; do not speculate from forecasts alone. |

### 3.2 Team travel habits: useful, but never folklore

A club’s reported routine—such as choosing to travel later or earlier than another team—may be useful context. It must be presented as a **reported operational plan**, not a fixed team trait or a causal football conclusion.

- Good: “The Rams’ reported plan is to arrive Saturday.”  
- Good: “This team commonly uses a late-arrival approach; this week’s plan is unconfirmed.” *(Only in a detail view with dated source and explicit uncertainty.)*
- Not allowed: “The Rams always travel late, so start their opponent.”  
- Not allowed: “Late travel means the offense will struggle.”  
- Not allowed: an undated “team travel tendency” treated as live fact.

The current week’s confirmed plan always outweighs historical routine. If no current, attributable report exists, omit travel-timing commentary entirely.

### 3.3 Visual treatment

Travel/rest appears as a compact contextual row—not a new prediction card:

```
RELEVANT FOOTBALL CONTEXT

TRAVEL & REST
Cross-country away game · short-rest week
Reported arrival: Saturday · Source updated Fri 4:12 PM
```

- Use a neutral travel/rest icon plus text; color is not required.
- Include source freshness in the detail view whenever travel-plan reporting is shown.
- Keep the summary to one or two lines on League; a tap may reveal source, schedule sequence, and known limitations.
- A travel/rest fact can link to an affected player/game detail, but not directly to a recommendation unless Omen’s separate analysis has evidence to support one.

### 3.4 Evidence and release gates

Before release, the feature requires:

1. A verified NFL schedule/rest calculation for every displayed short/long-rest and road-stretch signal.
2. A source policy for operational travel reporting: official club/league information or attributable, current, reputable reporting.
3. Timestamped source storage and visible stale/unknown states.
4. Test fixtures for normal away games, short weeks, byes, cross-time-zone trips, international games, and no-report scenarios.
5. A no-signal default: Omen remains silent rather than guessing a travel plan.
6. Founder review of the first live examples on iPhone and Android.

Travel and rest may add context to a matchup. They do not create automatic Start/Sit, waiver, or trade recommendations by themselves.


---

## 4. Omen Page — This Week’s Omen lead card

**Purpose:** Omen’s signature surface states the one highest-value move for the selected team and league. It answers immediately, then makes the evidence inspectable. It is the intelligence layer above Command Center and League—not a generic dashboard or an “AI reveal” mechanic.

### 4.1 Page order

1. `Omen` title + persistent selected team/league context strip.
2. **This Week’s Omen** lead card.
3. Visually promoted workspace matching the lead decision type.
4. Quieter paths to Start/Sit, Waiver Analysis, and Ledger.

A personalized Trade recommendation may become the lead only after the canonical Omen engine supports it with live, selected-league evidence. It opens the existing Trade flow in that context; it does not add a fourth permanent Omen workspace.

### 4.2 Approved card anatomy

```
THIS WEEK’S OMEN                              WAIVER

Add Tyrone Tracy Jr.
for immediate RB depth and a credible longer-term role path.

WHY THIS MATTERS
Your RB room is thin for Week 7, and Tracy’s usage
increased over the last two games.

Confidence: Moderate     Risk: role volatility

Review waiver analysis →
```

| Element | Requirement |
|---|---|
| Decision type | Small but unmistakable Start/Sit, Waiver, or Trade label. |
| Plain-English move | Largest type: the answer first. |
| Why this matters | One concise selected-roster/week rationale. |
| Evidence preview | One or two factual inputs; facts stay distinguishable from Omen inference. |
| Confidence + risk | Evidence-bound qualifier, never a guarantee or decorative “AI score.” |
| CTA | Opens the matching deeper workspace with the selected context preserved. |

### 4.3 Facts versus Omen inference

The lead shows a short summary; the detail view provides complete evidence, sources, assumptions, alternatives, and limitations.

```
WHY THIS MATTERS
Fact · Your opponent has two Monday-night players remaining.
Fact · Smith projects higher under this league’s scoring.
Omen’s read · Starting Smith improves your flexibility if the matchup stays close.
```

Do not represent an inference as provider fact, nor hide an incomplete/stale input behind stronger copy.

### 4.4 Visual behavior

- The lead is the strongest Omen-page surface: deep-charcoal layer, bone-white action text, restrained aged-brass structure.
- A subtle lace-derived directional mark/divider is allowed. Do not use mystical/oracle imagery, football clip art, reveal motion, pulses, looping glow, or “thinking” theater.
- Start/Sit uses neutral/brass structural emphasis. Waiver may use verdigris only when availability is verified. Trade remains brass/neutral, not celebratory green. Crimson marks real risk, deadline, injury concern, or downside only.
- The promoted workspace follows the actual decision type; other workspaces remain available but quieter.
- Hierarchy, position, and surface treatment—not flashing or animation—create emphasis.

### 4.5 State behavior

| State | Required Omen expression |
|---|---|
| Available | Immediate recommendation plus short evidence preview. |
| Close call | Plain language: “The available data slightly favors…” |
| Insufficient data | State what cannot be confirmed and offer the safest useful next action. |
| No high-value move | “No single move stands out for this roster right now.” Keep available workspaces reachable. |
| Off-season | Supported strategic/draft/dynasty context only; never weekly Start/Sit fabrication. |
| Engine limitation | Clearly label unavailable recommendation types until their live data paths exist. |

### 4.6 Integrity and interaction rules

- Every recommendation snapshot contains selected team/league context, timestamp, evidence, confidence/risk, and decision type before the detail opens; it is recorded for the Ledger.
- The user never pulls to reveal, waits through a fabricated processing sequence, or must interpret a mysterious score.
- Detail always offers explanation, alternatives, applicable action path, and contextual feedback after the user can inspect the evidence.
- Current live v1 remains Start/Sit-first. Waiver and personalized Trade lead types stay unavailable until issue #162’s live-data acceptance proof is complete.

**Founder approval:** This Week’s Omen gives the answer immediately with evidence on tap; factual, calm, nonjudgmental language; workspace matching the returned decision type is visually promoted (Justin, 2026-07-20).


---

## 5. Omen → Start/Sit detail

**Purpose:** Prove a Start/Sit recommendation through a calm, comparable evidence surface. This is a comparison desk, not a player-card casino.

### 5.1 Approved default presentation — compact player rows

The page opens directly on the relevant selected-roster decision:

```
START / SIT

START DEVONTA SMITH
over Chris Olave

For Justin Titans · Dynasty Dogs
Week 7 · Sunday
```

Use compact, connected player rows as the first view:

```
OMEN RECOMMENDS

START DEVONTA SMITH                    CONFIDENCE: MODERATE
WR · PHI · Sun 4:25 PM

OVER CHRIS OLAVE
WR · NO · Sun 1:00 PM

WHY OMEN LEANS SMITH
• Higher projected output in this league’s scoring.
• More favorable verified matchup context.
• Later kickoff preserves flexibility in a close matchup.

WHAT COULD CHANGE THIS
Olave’s final injury status or a late Philadelphia weather update.

View evidence →
```

- Recommendation answer comes first.
- The recommended player is the upper/primary compact row; the alternative is the connected lower row.
- A subtle comparison spine may connect the two, echoing the Matchup Hero without becoming a “versus” game screen.
- The first view does **not** show a dense stat grid, player headshots, a carousel, or a large roster table.
- Full per-player statistics, source detail, projections, assumptions, and comparison data appear only after the explicit **View evidence** action.
- The user can return from evidence to the same recommendation snapshot without losing context.

### 5.2 Evidence language

| Category | Example |
|---|---|
| League fact | “This league awards 0.5 PPR.” |
| Player/game fact | “Smith plays Sunday at 4:25 PM.” |
| Current status | “Olave is questionable as of Friday practice.” |
| Omen inference | “The available data favors Smith.” |
| Limitation | “Weather forecast confidence is moderate.” |

Never merge facts, projections, or model inference into an unsupported single claim.

### 5.3 Control and outcome rules

- Default to the highest-priority unresolved lineup decision, then let the user switch roster slots or manually compare eligible players.
- Do not silently change a provider lineup. For beta, Omen advises; the user controls the actual roster action.
- Use a calm acknowledgement such as “I’m starting Smith,” “Keep reviewing,” or “Open league lineup.”
- After kickoff, preserve the immutable recommendation snapshot for Ledger; show live/final context separately and never rewrite the original recommendation.
- Use “What could change this” for the one or two conditions genuinely capable of changing the call. It is evidence-based, not generic hedging.
- Clear decision, close decision, player unavailable, incomplete data, games started, and off-season all need honest named states; no forced recommendation when evidence is insufficient.

**Founder approval:** compact player rows are the Start/Sit first view; dense statistics remain behind an intentional View evidence expansion (Justin, 2026-07-20).
