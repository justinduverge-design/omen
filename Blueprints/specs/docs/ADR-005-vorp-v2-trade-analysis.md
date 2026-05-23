# ADR-005: VORP v2 + Trade Analysis A+B Model

**Status:** Accepted
**Date:** 2026-05-13
**Deciders:** Justin (Product Owner), Claude (Architect)

---

## Context

`src/services/tradeValue.js` contains a working VORP v1 implementation:

- `adjustedProjection(player)` — applies injury-risk haircuts (from optimizer.js)
- `playerValue(player)` — computes `adjusted_projection - replacement_level`
- `DEFAULT_REPLACEMENT_LEVEL` — hardcoded weekly point floors per position (QB: 14, RB: 8, WR: 8, TE: 6, etc.)
- `compareTrade({ send, receive })` — returns `{ net_value, verdict, confidence }`

This is functional but has three gaps:

1. **No positional scarcity signal.** A net_value of +2.0 means very different things if you're acquiring an irreplaceable TE1 vs. an interchangeable WR4. The current system can't distinguish these.

2. **No scoring format variants.** Replacement levels differ meaningfully between PPR, half-PPR, and standard. QB and TE values especially are format-sensitive.

3. **Replacement levels are undocumented estimates.** They should be clearly sourced, named, and easy to update seasonally.

The gap this creates: the Trade Analyzer produces a verdict without a clear signal about *how hard each player is to replace*. This is the most important factor in evaluating a trade and the one Slops is uniquely positioned to explain.

---

## Decision

Introduce `src/services/vorp.js` as the VORP calculation layer. Update `tradeValue.js` to import from it and add A+B composite scoring. Keep the existing API response shape fully backward-compatible — extend it with new fields.

---

## The A+B Model

**A = Net VORP** (already computed in v1 as `net_value`)
The raw projected-points advantage, adjusted for injury risk, relative to what's replaceable.

**B = Positional Scarcity Bonus**
A weighted bonus based on each player's scarcity tier at their position. Adds context that raw VORP misses: an elite TE is worth more than the raw point delta suggests because TEs are uniquely hard to replace.

**Combined score = A + (B × 0.6)**

*B weight raised from 0.4 → 0.6 after external calibration review. At 0.4, scarcity was too weak to break near-neutral ties in realistic scenarios (e.g. starter RB for elite TE). 0.6 lets scarcity tip a balanced trade without overriding a clear raw-value loss.*
B is weighted at 40% of A so raw value stays dominant — scarcity is a signal, not a veto.

---

## Replacement Levels

Weekly projected-point floors representing the best available player at each position in a typical 12-team league (waiver wire quality):

| Position | PPR | Half-PPR | Standard |
|----------|-----|----------|----------|
| QB | 15 | 14 | 13 |
| RB | 6.5 | 5.5 | 5 |
| WR | 8 | 7 | 6.5 |
| TE | 4.5 | 4 | 3.5 |
| FLEX | 7.5 | 6.5 | 6 |
| K | 6 | 6 | 6 |
| DST/DEF | 6 | 6 | 6 |

Default: `ppr`. Accept `"ppr" | "half_ppr" | "standard"` as a request parameter.

*Calibrated 2026-05-13 via external methodology review. Prior values (QB: 17, RB: 9, WR: 9, TE: 6) were too generous — they understated VORP for all positions and compressed the scoring scale. Revisit each August.*

---

## Scarcity Tiers

Per-position VORP thresholds. A player's tier determines their B score contribution:

| Position | Elite (≥) | Starter (0 to <) | Bubble (<0 to ≥) | Replaceable (<) |
|---|---|---|---|---|
| QB | +8 | +8 | -5 | -5 |
| RB | +5 | +5 | -3 | -3 |
| WR | +5 | +5 | -3 | -3 |
| TE | +4 | +4 | -2 | -2 |
| K/DST | +3 | +3 | -2 | -2 |

Tier labels: `"elite"`, `"starter"`, `"bubble"`, `"replaceable"`

Scarcity bonus per player:
- elite: +2.0
- starter: +0.5
- bubble: 0.0
- replaceable: -0.5

B score = Σ(receive bonuses) − Σ(send bonuses)

---

## Output Shape (extended)

Existing fields are unchanged. New fields appended:

```json
{
  "send": { ... },
  "receive": { ... },
  "net_value": 2.50,
  "verdict": "accept",
  "confidence": "medium",
  "generated_at": "...",
  "scoring_format": "ppr",
  "a_score": 2.50,
  "b_score": 1.50,
  "combined_score": 3.10,
  "scarcity_analysis": {
    "send": [{ "name": "...", "position": "RB", "vorp": 3.2, "tier": "starter" }],
    "receive": [{ "name": "...", "position": "TE", "vorp": 6.1, "tier": "elite" }],
    "summary": "You're giving up a starter-tier RB for an elite-tier TE."
  }
}
```

Verdict thresholds (based on `combined_score`):
- `"accept"` : combined_score > 2.0
- `"neutral"` : -2.0 ≤ combined_score ≤ 2.0
- `"decline"` : combined_score < -2.0

---

## Options Considered

### Option A: Upgrade tradeValue.js in place
Add scoring format and scarcity directly to tradeValue.js.
- **Pros:** Fewer files, simpler
- **Cons:** VORP logic is not reusable by the MVP Move engine. When we build the Intelligence Layer, we'll need VORP standalone — not bundled inside a trade comparison utility.

### Option B: Introduce vorp.js + update tradeValue.js (chosen)
`vorp.js` = pure VORP functions, no trade concepts. `tradeValue.js` consumes it.
- **Pros:** VORP is decoupled, reusable by MVP Move engine; clean separation of concerns
- **Cons:** One additional file

### Option C: Full rewrite of tradeValue.js
Replace v1 entirely with A+B model.
- **Cons:** Breaks existing tests, no backward compatibility, high risk for no added benefit over Option B

---

## Implementation Scope

**Create:** `src/services/vorp.js`
- `REPLACEMENT_LEVELS` (PPR/half_ppr/standard variants)
- `SCARCITY_THRESHOLDS` (per-position elite/bubble floors)
- `SCARCITY_BONUS` map
- `getReplacementLevel(position, scoringFormat)`
- `vorpForPlayer(player, opts)` → `{ vorp, replacement_level, tier, scarcity_bonus }`
- `bScore(sendPlayers, receivePlayers, opts)` → number

**Update:** `src/services/tradeValue.js`
- Import `vorpForPlayer` and `bScore` from vorp.js
- Add `scoring_format` to `playerValue()` and `sideValue()` opts
- Add `a_score`, `b_score`, `combined_score`, `scarcity_analysis` to `compareTrade()` output
- Update `verdictFor()` to use `combined_score` instead of `net_value`
- Keep all existing exports; no breaking changes

**Update:** `src/routes/trade.js`
- Accept `scoring_format` from `req.body` (default `"ppr"`)
- Validate: must be one of `"ppr" | "half_ppr" | "standard"` if provided
- Pass to `compareTrade()` opts
- Pass `a_score`, `b_score`, `scarcity_analysis` to `llm.explainTrade()`

**Create:** `test/vorp.test.js`
- Pure unit tests for `vorpForPlayer`, `bScore`, tier thresholds, replacement levels
- Cover all three scoring formats
- Cover all four scarcity tiers

**Update:** `test/tradeValue.test.js`
- Regression: existing test cases should still pass with same or better verdicts
- Add A+B-specific cases: trade that flips from "neutral" to "accept" due to elite TE scarcity

---

## Consequences

**Becomes easier:**
- MVP Move engine can import `vorp.js` directly — no refactoring needed
- Scarcity explanation enriches Gemma's narration ("You're giving up an elite TE, which is rare")
- Seasonal calibration is explicit: update one object in vorp.js each August
- LLM gets richer data to narrate (`scarcity_analysis.summary`)

**Becomes harder:**
- Nothing meaningful — pure functions, fully unit-testable

**Will need to revisit:**
- Replace static replacement levels with live waiver wire data when MVP Move is built
- Add league-size variants (10-team vs 12-team leagues have different replacement floors)
- Add dynasty vs redraft scoring variants

---

## Action Items

- [ ] Codex: implement `src/services/vorp.js`
- [ ] Codex: update `src/services/tradeValue.js` with A+B model
- [ ] Codex: update `src/routes/trade.js` to accept `scoring_format`
- [ ] Codex: write `test/vorp.test.js` + update `test/tradeValue.test.js`
- [ ] Codex: run full test suite — all tests must pass
- [ ] Justin: review and approve before merging to main
