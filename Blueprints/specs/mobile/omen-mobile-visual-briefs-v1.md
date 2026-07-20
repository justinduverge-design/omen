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
