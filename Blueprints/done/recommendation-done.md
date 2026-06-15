# Recommendation Done (cross-cutting)

Apply to any change that produces a recommendation: Omen, Trade Analyzer result, Draft Assistant pick.

## Gates

1. Recommendation leads with the move ("Start Player A over Player B"), not the reasoning
2. Confidence carries a 0–100 score + label (Low / Medium / Medium-High / High)
3. Risk carries Low/Medium/High label + at least one short reason string
4. Plain-English explanation present — "Why it matters" or equivalent
5. Data sources labeled — live / stub / mock / unavailable per signal
6. **No fake guarantees.** `Brand/brand-system.md` §2 "Do not use" list enforced — flag any banned line
7. Recommendation can be saved as evidence (Move History writes a row)
8. Empty state acknowledges the situation without apologizing
9. If a brand line is on the page, it's an approved line (primary marketing line, secondary, or approved alternate)

## AAA mapping

- **Accuracy:** 1, 2, 3, 4, 5, 6, 7
- **Aesthetic:** 8, 9
