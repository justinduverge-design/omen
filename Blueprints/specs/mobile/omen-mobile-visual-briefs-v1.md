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


---

## 6. Omen → Waiver Analysis detail

**Purpose:** Turn Command Center’s Waiver Watch into a complete, selected-roster decision: best available move, its roster cost, its immediate and supported long-horizon value, and credible alternatives.

### 6.1 Page order

1. `Waiver Analysis` title + persistent selected team/league context strip.
2. Verified deadline and availability status.
3. **Best Move**.
4. Why this move fits.
5. What it costs / add-drop logic.
6. Alternatives.
7. Long-horizon context where genuinely supported.
8. Ledger/feedback and safe external action.

### 6.2 Best Move

```
WAIVER ANALYSIS                         Deadline Wed · 3:00 AM

OMEN RECOMMENDS

ADD TYRONE TRACY JR.
RB · NYG · Availability confirmed

DROP [Player Name]
Your lowest-impact RB depth option for this week and this roster.

Why now
Your RB room is thin for Week 7, and Tracy’s recent role
gives him the strongest immediate path among available options.

Review roster fit ↓
```

- Add is the clearest action; recommended Drop sits directly beneath when one is required and evidence-supported.
- Player rows use the compact comparison grammar approved for Start/Sit.
- Availability and deadline appear only when confirmed for the selected league.
- Do not imply claim success.
- Do not expose FAAB amount, waiver priority, or claim probability unless Omen has verified the league’s waiver system and the capability is truly implemented.

### 6.3 Evidence sections

**Why this fits your roster** may use the following evidence-backed categories:

| Category | Question answered |
|---|---|
| Immediate need | Does the move solve this week’s or near-term roster gap? |
| Current role | Why is this player relevant now? |
| Season value | Is there a supported reason to care beyond this scoring period? |

**What this costs** states the downside of the recommended drop, not only the add’s upside:

```
WHAT THIS COSTS

Dropping Player X removes:
• Your WR5 depth during Week 8.

Why Omen accepts that cost:
• Player X has no current starting path.
• Tracy addresses a more immediate roster need.
```

If no defensible low-cost drop exists, say so plainly and offer alternatives; never force a drop.

### 6.4 Alternatives and long horizon

- Show two or three alternatives maximum, each with one sentence explaining its tradeoff.
- Rank only after availability and roster relevance are verified.
- Do not render a generic top-50 waiver list.
- In dynasty/keeper leagues, Long-Horizon Context distinguishes current role from future possibility and explains the specific supported factors.
- In redraft, show long-horizon content only for a real relevant stash; otherwise omit it.

### 6.5 Actions, Ledger, and states

- Beta’s primary action is **Open league waivers**, not automatic claim submission.
- Before leaving, Omen records recommendation, selected context, availability/deadline state, add/drop logic, and evidence as an immutable Ledger snapshot.
- `Claim pending` appears only when true; Omen never assumes the user submitted a claim.
- Contextual feedback is voluntary.

| State | Required behavior |
|---|---|
| Confirmed opportunity | Show availability, deadline, add/drop logic, and alternatives. |
| Availability unknown | State that Omen cannot confirm free-agent status; neutral analysis only where safe. |
| Claim processed | Refresh the opportunity list and preserve prior Ledger snapshot. |
| No low-cost drop | State that no low-cost drop is clear; do not force a move. |
| No credible move | “No waiver move stands out for this roster right now.” |
| Off-season | Supported dynasty/draft opportunity only; no weekly urgency. |
| Engine limitation | Keep full analysis unavailable until live player-pool/roster logic is complete. |

**Founder approval:** Waiver Analysis leads with Best Move, supported add/drop logic, immediate and long-horizon evidence where justified, alternatives, and user-controlled league-waiver action (Justin, 2026-07-20).


---

## 7. Omen → Ledger detail

**Purpose:** The receipt for one Omen call: what Omen said, what evidence it had then, what the user did when safely known, and what happened. It is a historical record, never a rewritten recap.

### 7.1 Page structure

1. Back to Ledger.
2. Call type + state.
3. Immutable recommendation snapshot.
4. Evidence available at the time.
5. User action, when safely known.
6. Observed outcome.
7. Fairness/limitation note.
8. Voluntary feedback and related route.

```
LEDGER

WEEK 6 · START / SIT                         RESOLVED

Omen recommended
Start DeVonta Smith over Chris Olave

For Justin Titans · Dynasty Dogs
Issued Friday, Oct 11 · 4:12 PM ET

WHAT OMEN KNEW THEN
• Smith projected higher in this league’s scoring.
• Olave was questionable after limited practice.
• The matchup was projected within 4.2 points.

OMEN’S READ
The available data favored Smith in a close matchup.

WHAT HAPPENED
Smith: 18.4 points
Olave: 11.2 points

Observed outcome aligned with the recommendation.
```

### 7.2 Snapshot and evidence rules

- The snapshot shows exact recommendation, selected team/league, scoring period, timestamp, and call type; it never changes after kickoff/new information.
- Compact comparison-row grammar remains the default; full original inputs are behind `View full evidence from this moment`.
- Evidence distinguishes league context, player/game facts, model inputs/freshness, Omen inference, and known limitations.
- Do not use later information to make an earlier recommendation look smarter.

### 7.3 User action and outcome

Only show user action when safely known:

- “You marked: I’m starting Smith.”
- “Omen could not confirm whether you changed your lineup.”
- “Claim submission was not confirmed.”

| Call | Appropriate observed outcome |
|---|---|
| Start/Sit | Final league-scoring results plus fair comparison statement when valid. |
| Waiver | Claim status if known; later roster/player context without a fake one-week verdict. |
| Trade | User action if known and immediate roster/value context; no instant certainty label. |
| Superseded | Preserve original call and identify/timestamp the replacement. |

Use measured status language: “Observed outcome aligned with the recommendation,” “The difference was narrow,” “Final result could not be verified,” or “A late injury made this comparison incomplete.” No WIN/LOSS marks, grades, streaks, celebration, or self-congratulation.

### 7.4 Timeline and feedback

A subtle vertical brass timeline may show issuance, meaningful availability updates, game start, and outcome recording. It establishes sequence without suggesting later information was known earlier.

Feedback is voluntary and contextual:

```
Was this recommendation useful?
Yes · Not really · Tell us more
```

No provider credentials, raw league data, or hidden personal context is attached without clear user disclosure.

### 7.5 States and integrity

| State | Required behavior |
|---|---|
| Pending | Original call plus what event/result is awaited. |
| Active | Verified live context without altering original call. |
| Resolved | Observed result plus fairness-qualified comparison. |
| Data incomplete | Explain which final input/result cannot be verified. |
| Superseded | Preserve original and replacement timestamps. |
| User action unknown | State unknown; never infer compliance. |
| Off-season | Historical calls remain readable; no fabricated weekly updates. |

Recommendation snapshots and outcome data are stored separately. Timestamps include a clear time zone and all scoring comparisons honor the selected league’s actual scoring format.

**Founder approval:** Ledger detail is calm, factual, immutable, evidence-auditable, and never self-congratulatory (Justin, 2026-07-20).


---

## 8. Trade — public-first builder

**Purpose:** Omen’s lowest-friction front door: a user brings an offer and asks for analysis. It is distinct from Omen’s proactive recommendation engine.

### 8.1 Layout and default context

```
TRADE

NEUTRAL ANALYSIS                          Personalize →

YOU GIVE
+ Add player

YOU GET
+ Add player

Add picks or future assets
                    Analyze trade →
```

- Works without account or connected league.
- Starts in clearly labelled **Neutral analysis**.
- Personalization is offered, never required.
- User can always tell whether Omen uses neutral assumptions or their selected league.
- Sharing is never requested before a completed verdict.

### 8.2 Offer surfaces

Use equal, stacked **You Give** / **You Get** surfaces:

```
YOU GIVE

Justin Jefferson
WR · MIN

2027 2nd-round pick
Dynasty asset

+ Add player or asset
```

- Equal visual weight; no pre-verdict implication that one side wins.
- Compact player/asset rows match other Omen comparisons.
- Picks/future assets appear only in a supported dynasty/keeper or neutral asset context.
- Removal controls are clear and reversible.
- No player-headshot gallery, card-pack aesthetic, or giant football imagery.

### 8.3 Adding assets and personalization

Add-player opens native sheets. Personalized search may prioritize selected-roster/league entities; neutral search remains broad and makes no ownership/availability claim.

```
PERSONALIZE THIS TRADE

Analyze for:
Justin Titans · Dynasty Dogs · Sleeper

Uses league scoring, roster construction,
and dynasty/keeper settings when available.

Use personalized analysis
Continue neutral
```

- Global selected context may prefill, but is never silently imposed.
- User may switch back to neutral analysis.
- If applicable settings cannot be verified, say so and retain neutral analysis.

### 8.4 Analyze and state behavior

`Analyze trade` activates only when both sides have valid assets. Submit shows a result-shaped skeleton with named operation copy; it must preserve the exact offer on failure.

| State | Required behavior |
|---|---|
| Empty | Equal You Give / You Get invitation. |
| Partial offer | Explain what is missing. |
| Neutral | Visible neutral label; no roster/league claims. |
| Personalized | Visible selected league and applicable settings. |
| Unsupported asset | Explain that this asset type cannot yet be evaluated. |
| Connection issue | Preserve offer; offer retry, reconnect, or neutral analysis. |
| Shareable result | Available only after completed verdict. |

### 8.5 Guardrails

- A future personalized This Week’s Omen trade suggestion may deep-link here with a prefilled offer only after issue #162’s live personalized-trade acceptance proof.
- Apple Shortcuts and poll-sharing remain post-beta/V2.
- Private roster/league details never enter a public share link without explicit review and consent.

**Founder approval:** Trade is public-first, neutral by default, optionally personalized, and verdict-before-share (Justin, 2026-07-20).


---

## 9. Trade — verdict

**Purpose:** State what the offer means in clear, calm language, then show the smallest credible adjustment that could improve it. Verdict precedes sharing.

### 9.1 Result hierarchy

```
TRADE VERDICT                         NEUTRAL ANALYSIS

CLOSE — NEEDS CONTEXT

You gain the stronger weekly starter.
You give up more long-term value.

Why this is close
• Your side gains immediate WR production.
• The other side gains a younger core asset.
• Neutral analysis cannot evaluate your roster depth.

Review full reasoning →
```

- The context label is always visible. Neutral analysis must not masquerade as personalized roster advice.
- Personalized results state selected team/league and explain supported roster-fit reasoning without exposing unnecessary private data in shareable surfaces.
- Default result is readable; full figures, ranks, source dates, assumptions, and methodology remain behind `Review full reasoning`.

### 9.2 Approved verdict vocabulary

| Verdict | Meaning |
|---|---|
| **Favors you** | Available evidence materially favors the user’s side. |
| **Close — needs context** | Values are near enough that format, roster, or preference changes the answer. |
| **You give up too much** | The user’s outgoing value/risk is materially higher than the return. |
| **Insufficient data** | Omen cannot responsibly evaluate the offer in this context. |

Do not use grades, “robbery,” “league winner,” “smash accept,” or emotional certainty language.

### 9.3 Value and counter path

Use three compact evidence sections: **Immediate Value**, **Long-Term Value**, and **Risk**. Each starts with a plain-language conclusion and expands to evidence on demand.

```
MAKE IT FAIRER

Ask for a 2027 2nd-round pick back.

That narrows the long-term value gap while preserving
the starter upgrade you want.

Adjust this offer →
```

- Recommend the smallest credible adjustment, not an unrelated replacement trade.
- If no small adjustment is honest, state that a larger restructure is needed.
- Never imply the other manager will accept a counteroffer.

### 9.4 Sharing, actions, and state integrity

Bottom actions: Adjust offer, Start over, Share verdict, and optional Save for later.

- Share appears only after verdict and opens a review step.
- User chooses what becomes public: players only, verdict, reasoning summary, or none of their personalized roster context.
- Apple Shortcut/poll formats remain post-beta/V2.
- Saved analysis preserves exact offer plus analysis context/timestamp.

| State | Required behavior |
|---|---|
| Neutral verdict | State assumptions and limitation. |
| Personalized verdict | Name selected context and applicable format. |
| Close offer | Explain one or two deciding factors. |
| Unsupported settings | Safe fallback or visible limitation. |
| Incomplete player data | Name incomplete input; do not force verdict. |
| Shared result | Only user-reviewed public payload. |

**Founder approval:** Trade uses calm verdict language, immediate/long-term/risk framing, smallest credible counter path, and user-reviewed sharing after verdict (Justin, 2026-07-20).


---

## 10. Global team/league switcher

**Purpose:** Make the active roster unmistakable and switch all personalized Omen surfaces together. The strip switches context; Account manages connections.

### 10.1 Persistent context strip

```
COMMAND CENTER

JUSTIN TITANS
Dynasty Dogs · Sleeper                         Switch ▾
```

- Team is primary; league and platform are secondary.
- Switch/disclosure makes the control visibly tappable.
- Omen-owned contrast, restrained brass detail, and adequate padding create salience without team-color skins, logo walls, flashing, or motion.
- Present on Command Center, Omen, League, Waiver Analysis, Start/Sit, and Ledger. Trade remains neutral unless user explicitly opts into context.

### 10.2 Native selection sheet

```
SWITCH TEAM & LEAGUE

SLEEPER

Dynasty Dogs
Justin Titans                                   ✓

Family League
Titans Too

YAHOO

Work League
Justin Titans

───────────────
Connect another league
Manage connected leagues
```

- Group by platform, then league name alphabetically within platform.
- Keep platform-group order stable across visits.
- Within rows, show team and league clearly; selected team/league has a visible checkmark and selected surface.
- If a user has multiple teams in a league, retain that league grouping while exposing each team.
- Long names truncate gracefully but remain accessible in full labels.
- No color-only platform/selection distinction.
- Connect another league and Manage connected leagues remain secondary actions at bottom.

### 10.3 Switching and connection behavior

On selection: dismiss natively, update strip immediately, refresh current surface with stable named skeleton (for example, “Reading Work League…”), and apply selected context atomically to Command Center, Omen, League, Waiver Watch, and Ledger. Cancel/discard stale requests for the prior context.

A reconnect-required connection may enter only a named limited/recovery state; stale recommendations never appear current. No raw provider error, credential, cookie, or token value is exposed.

Empty state explains the value of connection and offers Connect Sleeper/Yahoo or Try demo; it never becomes a dead dashboard or forces sign-in inside the selector.

Persist selection by stable provider/league/team identifiers when authenticated session permits. Native sheets/lists use accessible labels containing team, league, and platform, plus native focus/back/dismiss behavior.

**Founder approval:** prominent persistent context strip; native selector grouped by platform then alphabetically by league; switching follows the active roster across personalized areas (Justin, 2026-07-20).


---

## 11. Account → Connected Leagues

**Purpose:** The calm management surface for provider health and connection actions. The global switcher changes active context; this screen manages the connections underneath it.

### 11.1 Account placement and provider rows

Connected Leagues is the first actionable Account section beneath concise Profile identity.

```
ACCOUNT

Justin Duverge
Signed in with Apple

CONNECTED LEAGUES

Sleeper                                     Connected
2 leagues · Last updated just now           →

Yahoo                                       Needs reconnect
1 league · Action required                  →

ESPN                                        Not connected
Availability depends on mobile support      →
```

Each provider receives one grouped row/card, not a large card per league.

| State | Required expression | Primary action |
|---|---|---|
| Connected | Calm status, league count, last successful sync. | Manage |
| Syncing | Named operation: “Updating league context…” | No duplicate connect action |
| Needs reconnect | Clear brass/attention state, plain explanation. | Reconnect |
| Not connected | Neutral status. | Connect |
| Unsupported on mobile | Calm limitation explanation. | Learn why / safe alternative |
| Temporary problem | Preserve last safe state and explain recovery. | Retry |

Routine reconnect is not a crimson “failure”; crimson remains for material risk.

### 11.2 Provider detail, connect, reconnect, disconnect

Connected provider detail opens in a native sheet:

```
SLEEPER

Connected
2 leagues available

Dynasty Dogs
Justin Titans                                Active

Family League
Titans Too

Last updated: Today · 9:42 PM

Refresh connection
Disconnect Sleeper
```

- Connected leagues sort alphabetically; current global selection is marked Active.
- Refresh is explicit, not a fake live-sync control.
- Selecting a league may hand off to global-switcher behavior, but provider detail remains a management surface.
- No OAuth tokens, ESPN cookies, raw API/provider errors, or internal sync details appear.

Unconnected/reconnect flows explain benefit/impact in plain language and launch the approved native provider connection flow. No embedded OAuth WebView or custom secret-entry form is permitted.

Disconnect confirmation names affected leagues, distinguishes provider disconnection from Omen-account deletion, never defaults the destructive action, and updates global selection/affected screens into named needs-connection states.

### 11.3 ESPN and implementation rules

- ESPN remains feasibility-gated on native mobile. No direct cookie-entry UI exists in the app.
- If a store-safe mobile connection method is unavailable, say so instead of rendering a broken Connect button.
- Sleeper/Yahoo remain primary first-run connection paths.
- Provider status comes from safe machine-readable state with opaque error codes.
- Connect/reconnect actions are idempotent; retries/double taps cannot duplicate connections.
- Status has accessible text/icon treatment beyond color.
- A failing provider never blocks Account/Profile or support access.

**Founder approval:** Connected Leagues is the first actionable Account section with calm provider management, safe reconnect/disconnect behavior, and no direct ESPN-cookie entry (Justin, 2026-07-20).


---

## 12. Account — remaining settings and ESPN browser-helper explanation

### 12.1 Calm Account settings structure

Account remains a native, grouped settings space:

```
ACCOUNT

Justin Duverge
Signed in with Apple

PREFERENCES
Appearance                                  System  →
Accessibility                               →

DATA & PRIVACY
How Omen uses your data                     →
Export my data                              →

SUPPORT & HELP IMPROVE OMEN
Help center                                  →
Share feedback                              →
Report an issue                              →

DANGER ZONE
Delete Omen account                         →
```

- Profile is concise: identity, sign-in method, and normal Sign out action. It is not a hero/dashboard.
- Appearance supports System, Omen Dark, and Omen Light through native selection controls.
- Accessibility honors platform motion/transparency settings first; do not create conflicting in-app overrides.
- Data & Privacy uses plain-language explanation, deliberate export request/status, and real consent controls only where supported.
- Help Improve Omen offers voluntary Feedback, Feature idea, and Something is not working. Current app version/screen attachment may be optional; selected league name defaults off. Credentials, cookies, raw league/roster data, and hidden session data never attach automatically.
- No rating nags, forced surveys, or interruption of active fantasy work.
- Danger Zone is separate. Account deletion uses the approved confirmation phrase **DELETE MY OMEN DATA**, never defaults the destructive control, distinguishes provider disconnect from account deletion, then ends authenticated session after completion.

### 12.2 Why ESPN needs a desktop browser helper

Sleeper and Yahoo use their available supported connection paths. ESPN requires a different bridge because a normal Omen web/mobile screen cannot read the ESPN Fantasy browser session values needed to connect a user’s league.

User-facing explanation:

```
CONNECT ESPN

ESPN connects differently from Sleeper and Yahoo.

Omen ESPN Connect is a free Chrome and Edge browser helper
that you run on a computer while signed in to ESPN Fantasy.
It detects your league and securely pre-fills Omen’s ESPN
connection form.

You review the details and choose Connect yourself.
Omen never submits the connection for you.
```

The primary user-facing name is **Omen ESPN Connect** or **ESPN browser helper**. Do not lead with the internal phrase “cookie extension”; a separate transparency link explains the necessary browser permission plainly.

### 12.3 Transparency detail — Learn how it works

```
HOW ESPN CONNECTION WORKS

1. Sign in to ESPN Fantasy in Chrome or Edge on your computer.
2. Open Omen ESPN Connect on your team page.
3. The helper detects the league and temporarily pre-fills Omen’s
   existing ESPN connection form.
4. Review the details, then select Connect in Omen.

Why browser permission is needed
ESPN keeps the required league-session information in your browser.
The helper uses it only to pre-fill Omen’s connection form.

Omen ESPN Connect does not submit the form for you.
```

Implementation/security requirements behind this copy:

- The helper reads the user’s own `espn_s2`/`SWID` values only from the active Chrome/Edge browser session and uses the detected league ID from the ESPN team-page URL.
- It stages those values in browser session storage only long enough to pre-fill Omen’s existing form; the staged copy is cleared after handoff and when browser session ends.
- The helper contains no third-party analytics/logging path for these values. Connection data reaches Omen only after the user reviews the populated form and explicitly selects Omen’s own Connect action.
- Never display the raw values in Omen, helper screens, logs, analytics, support reports, screenshots, or share payloads.
- Copy must be reviewed whenever extension behavior/permissions change; user-facing transparency must stay technically exact.

### 12.4 Chrome/Edge store-review and mobile states

The Chrome and Edge extensions are **submitted for store review**. Until each store approves/publishes the extension, Omen must use a truthful availability state:

```
ESPN BROWSER HELPER

Omen ESPN Connect has been submitted to the Chrome Web Store
and Microsoft Edge Add-ons.

Install links will appear here when your browser’s store listing
is available.

Learn how ESPN connection works →
```

- Do not show an install button/link until the corresponding store listing is actually live.
- Once live, show the correct browser-specific installation link and a `Continue on computer` handoff from mobile.
- On iPhone/Android, explain that ESPN connection requires Chrome or Edge on a computer; do not present direct cookie entry, embedded OAuth, or a broken mobile Connect control.
- On desktop web, the helper route may guide installation, ESPN sign-in, team-page detection, prefill, user review, and explicit Omen Connect.
- Store-review/published state is configuration-backed and separately tracked for Chrome and Edge; never hardcode “available.”

**Founder approval:** Account explains ESPN’s desktop browser-helper requirement plainly; the helper pre-fills but never submits; precise permission/transparency detail is accessible; Chrome/Edge submission status remains truthful until store listings are live (Justin, 2026-07-20).


---

## 13. Shared loading, demo, recovery, and off-season states

**Purpose:** Every state preserves the page’s job, explains what Omen knows/cannot do, and gives one useful next action. No state may feel like a mockup, dead end, or “AI thinking” performance.

### 13.1 Shared anatomy and loading

```
[ Status label ]

Clear plain-language title

One short explanation of what Omen knows,
what it cannot do yet, and why.

Primary action          Secondary action
```

- Named status, one primary action, optional quiet secondary route.
- No mascots, sad illustrations, flashing warning signs, or fabricated-progress animation.
- First load uses page-shaped skeletons and named operation copy (for example, “Reading Dynasty Dogs…”), never a blank screen/full-page spinner.
- Refresh retains last safe content with nonblocking freshness status. Unknown/stale freshness is named rather than presented as live.
- Reduced-motion mode uses static skeleton alternatives; motion never carries state alone.

### 13.2 Required states

| State | Required expression |
|---|---|
| **Demo Mode** | Persistent Demo label; safely isolated sample data; clear “not connected to your fantasy account” copy; no implication of real provider write. |
| **Needs connection** | Explain page-specific value, offer Connect a league / Try demo, never an empty dead dashboard. |
| **Limited data** | Preserve known data; compact banner on affected module; identify what cannot be confirmed; never fabricate availability, odds, or outcome. |
| **Recovery** | Plain named condition plus Retry, Reconnect, or Choose another league; preserve safe historical records where appropriate; never raw provider/HTTP/token/cookie text. |
| **No meaningful move** | Valid Omen outcome: no filler recommendation; route to analysis/league context. |
| **Off-season** | Calm supported strategy/draft/dynasty/league-history mode, never fabricated live weekly advice. |

### 13.3 Canonical examples

```
DEMO MODE
Example: Harbor League · Week 7
This is sample league data. It is not connected to your fantasy account.
Connect a league              Continue exploring
```

```
YAHOO NEEDS RECONNECT
Omen cannot refresh this Yahoo connection right now.
Your prior Ledger records remain available.
Reconnect Yahoo               Choose another league
```

```
NO SINGLE MOVE STANDS OUT
Omen does not see a waiver move that materially improves this roster right now.
Review waiver analysis        View league context
```

```
OFF-SEASON MODE
Live weekly Omen returns when the NFL season begins.
For this league, Omen can currently help with supported draft preparation,
dynasty/keeper context, and available league history.
Explore League                Review Draft prep
```

### 13.4 Off-season page mapping

| Page | Required off-season expression |
|---|---|
| Command Center | Season status + supported long-horizon context; no fake Matchup Hero. |
| Omen | Draft/dynasty/roster strategy only when evidence supports it. |
| Trade | Remains available with explicit current assumptions. |
| League | Supported prior-season history, draft entry, and league settings. |
| Ledger | Historical calls remain readable; no fabricated weekly updates. |

### 13.5 Cross-screen integrity rules

- State is scoped: an unavailable Waiver Watch cannot erase valid Matchup Hero or Ledger content.
- Context strip never silently changes in recovery/error state.
- Cached/snapshot content is visibly dated.
- All states support native screen readers and iOS/Android text scaling.
- State copy remains calm, factual, nonjudgmental: what is known, what is not confirmed, and safest next step.

**Founder approval:** loading, demo, needs-connection, limited-data, recovery, no-meaningful-move, and off-season states are intentional, evidence-honest native experiences (Justin, 2026-07-20).


---

## 14. League → Standings & Activity

**Purpose:** The deeper League context behind compact League Pulse: show official position, meaningful movement, and what matters without forcing a raw transaction feed or dashboard.

### 14.1 Standings and Playoff Picture

```
STANDINGS                                  Full standings →

PLAYOFF PICTURE
3rd of 12 · Currently in a playoff spot
2 games clear of the cut line

RK   TEAM                  REC       PF
1    Marcus's Team         7–0      764.2
2    Team Name             6–1      741.8
3    Justin Titans         6–1      721.4
4    Team Name             5–2      698.6
...
```

- Selected team stays visible and receives subtle Omen-owned selected-row treatment.
- Default columns: rank, team, record, points for.
- Points against, divisions, median record, or other metrics appear only where league format makes them materially relevant.
- Official provider rank/standing logic is source of truth; Omen does not reorder a league.
- Full standings opens a deeper native list; default League view remains compact.
- Playoff Picture begins with verified current position, not probability. “Why this matters,” cut-line math, clinch, elimination, and likelihood all follow pre-midseason capability/format/evidence gates.

### 14.2 Meaningful League Activity

```
AROUND THE LEAGUE

WAIVERS
Marcus’s Team added Player A.

TRADES
Team Name traded Player B for Player C.

STANDINGS
Two teams are tied for the final playoff spot.

View all league activity →
```

- At most three meaningful updates, grouped by category (Waivers, Trades, Standings), not raw timestamp feed.
- Prioritize competition, playoff position, or selected-roster relevance.
- Factual items link deeper only when provider data supports it.
- Never generic NFL news, social feed, or opinionated power ranking.
- Only show information normally visible to league members through connected provider; public/demo/share surfaces redact real league-manager detail unless user explicitly chooses otherwise.

### 14.3 States and build rules

| State | Required behavior |
|---|---|
| Standings available/activity partial | Show standings and name unavailable activity portion. |
| Playoff settings unknown | Show current rank/record; omit unsupported cut-line math. |
| No meaningful activity | “No major league activity to flag right now.” |
| Refresh delayed | Preserve dated standings and show freshness. |
| Off-season | Supported prior-season final standings/history or clean omission. |
| Demo | Clearly label standings/activity as sample fixtures. |

Use clean native list/table behavior, tabular/mono numeric alignment, natural scrolling, and no nested scroll traps. Team detail opens only to league-visible context with provider/privacy support.

**Founder approval:** League uses compact official standings, verified playoff context, and up to three meaningful factual activity signals (Justin, 2026-07-20).


---

## 15. Seasonal Draft

**Purpose:** A major seasonal Omen capability, reached through Command Center and League when relevant—not a permanent everyday tab. Draft Assistant is a preparation and seasonal tool.

### 15.1 Entry and hierarchy

When relevant, Command Center/League promote verified upcoming/active draft context:

```
DRAFT SEASON

Dynasty Dogs drafts in 12 days
Sunday, Aug 31 · 8:00 PM ET

Prepare for draft →
```

Draft Prep order: selected context strip; Draft Status; Your Draft Plan; League Rules; Draft Board only when a real data path exists; Readiness/missing-data state.

### 15.2 Draft Prep and plan

```
DRAFT PREP

Justin Titans · Dynasty Dogs · Sleeper

DRAFT STATUS
12-team · Superflex · Dynasty
Draft pick: 1.05
Sunday, Aug 31 · 8:00 PM ET

YOUR DRAFT PLAN
Build a plan for this league’s scoring,
roster rules, and draft position.

Start draft prep →
```

Draft Plan follows Omen’s answer/evidence grammar: plain-language guidance, visible format/assumptions, concise “What could change this,” then full evidence/alternatives on tap. No “must draft,” “league-winning,” or fake certainty.

### 15.3 Board and live-draft scope

Draft Board is never a generic top-300 list presented as contextual intelligence.

| State | Required behavior |
|---|---|
| Upcoming draft | Verified time/format plus preparation entry. |
| Active + live data | Current pick/board context and evidence-bound guidance. |
| Active + no live data | Preparation context; state that live board cannot be confirmed. |
| Complete | Route to roster review, League, and season Omen context. |
| No scheduled draft | Do not promote Draft; use League for relevant setup. |
| Demo | Clearly labelled fixture draft data. |

**Scope:** Draft Prep (rules, position, roster-construction guidance, evidence-bound plan) is core. Live on-the-clock assistance appears only after provider/league proof of current board/pick access. No simulated live board, fake on-clock state, or generic ranking masquerading as league-specific advice.

### 15.4 Visual rules

- Omen deep-charcoal/bone/brass system; no colorful “war room” or stock board aesthetic.
- Draft pick/time use tabular numerals.
- Verified On the Clock may receive stronger hierarchy, but no flashing timer/urgency theater.
- Compact evidence rows match Start/Sit/Waiver Analysis.
- All routes preserve selected team/league context.

**Founder approval:** Draft is a strong seasonal destination, with evidence-bound Draft Prep now and live on-clock assistance only after real provider data support (Justin, 2026-07-20).


---

## 16. Onboarding and provider connection

**Purpose:** Get a user to their first useful Omen moment with minimal friction. Demo remains available before sign-in; real provider paths are native, safe, recoverable, and honest.

### 16.1 Welcome and authenticated choice

```
OMEN

Fantasy decisions, explained clearly.

Try a sample league to see how Omen works,
or connect your own league when you’re ready.

Try demo                    Get started
```

After authentication, explain connection value and offer Connect a league / Explore demo first. No carousel, feature checklist, forced provider connection, or provider-logo wall before user chooses a path.

### 16.2 Provider choice and flows

```
CONNECT A LEAGUE

SLEEPER
Fastest way to get started                    Connect →

YAHOO
Connect through Yahoo securely                Connect →

ESPN
Requires Omen ESPN Connect on a computer      Learn more →
```

- Sleeper/Yahoo are primary first-run paths.
- Sleeper uses verified username discovery then user league selection; loading names the operation and never guesses league names.
- Yahoo launches approved system-browser OAuth, returns to the app at correct saved stage, and recovers from background/reopen/cancel safely.
- ESPN uses the previously approved desktop-browser-helper handoff. Mobile has no direct cookie entry, embedded OAuth, or broken Connect button. Store-review availability remains truthful.
- Safe provider state, opaque error codes, idempotent connection actions, and native back/resume behavior are mandatory.

### 16.3 Connection state and success

```
CONNECTING YAHOO

Confirming your account and league…
You can safely return to this screen if needed.
```

Use one named current stage rather than decorative multi-step theater. On success:

```
DYNASTY DOGS IS CONNECTED

Justin Titans is now your active Omen context.

Open Command Center
Connect another league
```

Set global selected team/league immediately, route primary action to Command Center, and keep secondary multi-league path available.

| State | Required expression |
|---|---|
| Demo | Sample mode, no credentials, never mixed with real data. |
| Canceled | “Connection was canceled. Nothing was changed.” |
| Needs reconnect | Explain fresh-data limitation and route to reconnect. |
| Provider unavailable | State limitation; offer another provider/demo. |
| Incomplete | Preserve safe progress; resume/choose league. |
| Recovery | Plain explanation plus Retry / Back / another provider. |

**Founder approval:** native, low-friction, demo-first-capable onboarding; Sleeper/Yahoo primary paths; safe ESPN desktop-helper handoff; idempotent/recoverable provider connection (Justin, 2026-07-20).


---

## 17. Native visual QA and build-acceptance gate

A native screen is not done because it compiles. It is accepted only when it proves the approved Omen brief on both iPhone and Android.

### 17.1 Required proof

| Proof | Requirement |
|---|---|
| Primary state | Normal connected state using approved hierarchy/copy. |
| Alternate state | Most relevant loading, limited-data, recovery, empty, demo, or off-season state. |
| Context safety | Correct active team/league is visible where required. |
| Native behavior | Platform-appropriate navigation, sheet, back/dismiss, and touch behavior. |
| Accessibility | Text scaling, screen-reader labels/focus, and non-color state cues. |
| Motion | Standard transition plus reduced-motion equivalent. |
| Resilience | Long player/team/league names, scores, and timestamps remain usable. |
| Data honesty | Fixture/demo label or provider/live-data proof; no mock presented as real. |

Before founder review, attach iPhone primary + alternate captures, Android primary + alternate captures, a short recording for material sheet/context/connection transitions, and the exact provider/league/demo fixture used.

### 17.2 Acceptance and founder gate

Each screen receives a screen-specific checklist that names its approved hierarchy and non-negotiables. A screen fails if it shows wrong roster context, conceals stale/stub/demo data as live, exposes provider secrets/raw errors, fabricates an outcome, or creates provider action/share behavior without explicit user control.

Handoff must state:

```
What is ready:
What remains unavailable:
Which provider/data paths were proven:
Which states were visually reviewed:
Known limitations:
Links to iPhone + Android proof:
```

Shared Omen tokens/typography/semantic colors are mandatory; no one-off hardcoded colors, retired fonts, team-color repaint, broadcast/card-casino/oracle aesthetic, or motion theater. iOS and Android share information architecture and intent while using their own native controls/behavior.

### 17.3 Build sequence

1. Reusable native primitives and tokens.
2. Command Center vertical slice.
3. Team/league context switching safety.
4. Omen → Start/Sit → Ledger.
5. Waiver Analysis after live backend capability proof.
6. Trade public-first flow.
7. League, Draft, Account, and connection surfaces.
8. This visual QA gate on every major route.

**Founder approval:** native screen completion requires visual, behavior, accessibility, state, and data-honesty proof on both iPhone and Android (Justin, 2026-07-20).
