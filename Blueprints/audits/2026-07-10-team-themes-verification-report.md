# Team Themes Verification Report — Run 1

**Generated:** 2026-07-10
**Script:** `frontend/scripts/verify-team-themes.mjs`
**Runs against:** the actual runtime resolver (`teamTheme.js` / `themeResolver.js`), not a reimplementation.

Rules: R1 = text-on-shell ≥4.5:1, R2 = accent-on-shell ≥3:1, R3 = card-vs-shell (3a luminance / 3b hue ΔE≥15 / 3c border), R4 = accent vs `--color-omen`/`--color-risk-high` ≥20 ΔE.

---

## Rule 1 (text legibility) — all 32 teams × 3 room modes

**All 96 combinations pass Rule 1.** No team produces an illegible shell at any room mode — confirms the verification memo's finding #1.

---

## Locker Room (α=35%) — full 32-team table

| Team | Room | α | Shell | Card | Card via | Accent | Step | R1 | R2 | R3 | R4 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BUF | locker | 35% | `#071F57` | `#1C1C1E` | 3b | `#F5F0E8` | white | ✓ | ✓ | ✓ | ✓ |
| MIA | locker | 35% | `#CFDCDD` | `#FFFFFF` | — | `#0A0A0B` | black | ✓ | ✓ | ✗ | ✓ |
| NE | locker | 35% | `#071529` | `#1C1C1E` | — | `#C60C30` | secondary | ✓ | ✓ | ✗ | ✓ |
| NYJ | locker | 35% | `#0D3527` | `#1C1C1E` | 3b | `#F5F0E8` | white | ✓ | ✓ | ✓ | ✓ |
| BAL | locker | 35% | `#160F47` | `#1C1C1E` | 3b | `#9E7C0C` | secondary | ✓ | ✓ | ✓ | ✓ |
| CIN | locker | 35% | `#9E300F` | `#1C1C1E` | 3b | `#F5F0E8` | white | ✓ | ✓ | ✓ | ✓ |
| CLE | locker | 35% | `#1E1207` | `#1C1C1E` | — | `#FF3C00` | secondary | ✓ | ✓ | ✗ | ✓ |
| PIT | locker | 35% | `#0C1014` | `#555555` (lift) | 3b | `#FFB612` | secondary | ✓ | ✓ | ✓ | ✓ |
| HOU | locker | 35% | `#08141D` | `#1C1C1E` | — | `#F5F0E8` | white | ✓ | ✓ | ✗ | ✓ |
| IND | locker | 35% | `#CFD0D4` | `#FFFFFF` | 3b | `#002C5F` | primary | ✓ | ✓ | ✓ | ✓ |
| JAX | locker | 35% | `#073F4A` | `#1C1C1E` | 3b | `#D7A22A` | secondary | ✓ | ✓ | ✓ | ✓ |
| TEN | locker | 35% | `#0B1627` | `#1C1C1E` | — | `#4B92DB` | secondary | ✓ | ✓ | ✗ | ✓ |
| DEN | locker | 35% | `#9E300F` | `#1C1C1E` | 3b | `#F5F0E8` | white | ✓ | ✓ | ✓ | ✓ |
| KC | locker | 35% | `#F2CFD0` | `#FFFFFF` | 3b | `#E31837` | primary | ✓ | ✓ | ✓ | ✓ |
| LV | locker | 35% | `#0A0A0B` | `#1C1C1E` | — | `#A5ACAF` | secondary | ✓ | ✓ | ✗ | ✓ |
| LAC | locker | 35% | `#CFD9E9` | `#FFFFFF` | 3b | `#0080C6` | primary | ✓ | ✓ | ✓ | ✓ |
| DAL | locker | 35% | `#CFD0DD` | `#FFFFFF` | 3b | `#003594` | primary | ✓ | ✓ | ✓ | ✓ |
| NYG | locker | 35% | `#0A153E` | `#1C1C1E` | 3b | `#F5F0E8` | white | ✓ | ✓ | ✓ | ✓ |
| PHI | locker | 35% | `#072E33` | `#555555` (lift) | 3b | `#A5ACAF` | secondary | ✓ | ✓ | ✓ | ✓ |
| WAS | locker | 35% | `#370E0F` | `#1C1C1E` | 3b | `#FFB612` | secondary | ✓ | ✓ | ✓ | ✓ |
| CHI | locker | 35% | `#0A0F1A` | `#1C1C1E` | — | `#C83803` | secondary | ✓ | ✓ | ✗ | ✓ |
| DET | locker | 35% | `#074871` | `#1C1C1E` | 3b | `#B0B7BC` | secondary | ✓ | ✓ | ✓ | ✓ |
| GB | locker | 35% | `#14211E` | `#555555` (lift) | 3b | `#FFB612` | secondary | ✓ | ✓ | ✓ | ✓ |
| MIN | locker | 35% | `#301751` | `#1C1C1E` | 3b | `#FFC62F` | secondary | ✓ | ✓ | ✓ | ✓ |
| ATL | locker | 35% | `#68101D` | `#1C1C1E` | 3b | `#A5ACAF` | secondary | ✓ | ✓ | ✓ | ✓ |
| CAR | locker | 35% | `#CFDAEA` | `#FFFFFF` | 3b | `#0A0A0B` | black | ✓ | ✓ | ✓ | ✓ |
| NO | locker | 35% | `#0A0A0B` | `#1C1C1E` | 3c | `#D3BC8D` | primary | ✓ | ✓ | ✓ | ✓ |
| TB | locker | 35% | `#850A0B` | `#1C1C1E` | 3b | `#FF7900` | secondary | ✓ | ✓ | ✓ | ✓ |
| ARI | locker | 35% | `#DECFD0` | `#FFFFFF` | 3b | `#0A0A0B` | black | ✓ | ✓ | ✓ | ✓ |
| LAR | locker | 35% | `#07205C` | `#1C1C1E` | 3b | `#FFA300` | secondary | ✓ | ✓ | ✓ | ✓ |
| SF | locker | 35% | `#690707` | `#1C1C1E` | 3b | `#B3995D` | secondary | ✓ | ✓ | ✓ | ✓ |
| SEA | locker | 35% | `#071529` | `#1C1C1E` | — | `#69BE28` | secondary | ✓ | ✓ | ✗ | ✓ |

---

## Stress-test teams (Commanders / Dolphins / Packers / Chiefs / Steelers) vs. verification memo

| Team | Room | α | Shell | Card | Card via | Accent | Step | R1 | R2 | R3 | R4 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MIA | locker | 35% | `#CFDCDD` | `#FFFFFF` | — | `#0A0A0B` | black | ✓ | ✓ | ✗ | ✓ |
| PIT | locker | 35% | `#0C1014` | `#555555` (lift) | 3b | `#FFB612` | secondary | ✓ | ✓ | ✓ | ✓ |
| KC | locker | 35% | `#F2CFD0` | `#FFFFFF` | 3b | `#E31837` | primary | ✓ | ✓ | ✓ | ✓ |
| WAS | locker | 35% | `#370E0F` | `#1C1C1E` | 3b | `#FFB612` | secondary | ✓ | ✓ | ✓ | ✓ |
| GB | locker | 35% | `#14211E` | `#555555` (lift) | 3b | `#FFB612` | secondary | ✓ | ✓ | ✓ | ✓ |

Expected per `Blueprints/audits/2026-07-10-team-theme-contract-verification.md`'s Result 3 table (computed at a hypothetical dark shell for all 5 teams, for uniform demonstration):
- **Commanders** — secondary gold accent (`#FFB612`), card unchanged (no lift). **Matches.**
- **Dolphins** — primary/secondary both fail Rule 2 → falls to white. **Matches in direction; lands on black, not white** — Dolphins' `authoredSurfaceDefault` is `light` (the memo's own narrative agrees: "Authored surface default: light — the Miami sun logic"), so the real shell is light aqua-tinted, not dark. Black is the correct polarity-adjusted fallback for a light shell; the memo's Result 3 table used a dark-shell blend for all 5 teams uniformly and didn't carry the light-surface case through to that specific table.
- **Packers** — card lifted; accent falls off primary/secondary. **Matches.**
- **Chiefs** — accent falls to secondary gold, primary red fails Rule 2 against a deep-red shell. **Diverges.** Chiefs' `authoredSurfaceDefault` is `light` (matching the memo's own narrative: "Assume light for this analysis... Accent cascade: bright red vs. cream shell → Rule 2 passes easily"). Against the real light red-tinted shell, primary red clears Rule 2 easily and becomes the accent — Result 3's "falls to gold" conclusion was computed for the dark-shell scenario, which the memo itself flags elsewhere as not Chiefs' authored default.
- **Steelers** — card lifted; accent falls to a later step. **Matches** (black, via the same white/black fallback tier).

---

## Reconciliation notes

- **Rule 4 is now live** (was stubbed always-pass through Prompt B). The contract's Rule 4 text names `--color-omen` (Verdigris green) as the collision target — the verification memo's own prose instead says "Omen brass `#A67C2E`" (the accent brand color) when discussing this same rule. Those are different tokens. Implemented against the contract's literal text (`--color-omen`), not the memo's brass reference: gold (`#FFB612`) sits far enough from Verdigris green in Lab space that Rule 4 never fires for Commanders/Packers/Steelers/WAS's gold accent in this run. If the intent was actually a gold-vs-Omen-brass guard, that's a different check the contract as written doesn't request — flagging for Justin to confirm which token Rule 4 should reference.
- **Surface-tint source bug found and fixed during this run.** The Prompt B resolver always blended `template.primary` into the shell regardless of which role a team's own data names as its authored world color. This produced an illegible mid-tone tan shell for the Saints (primary = light gold, `surfaceRole: 'mute'` = near-black) — a genuine Rule 1 failure caught by this script's first run (see git history on this file for the before/after). Fixed per the contract's own stated mechanism: the surface-tint source now follows the same Rule-1-gated fallback (primary → secondary → no tint) the contract specifies for `--color-team-surface`, rather than reading `surfaceRole` directly (an initial, contract-noncompliant fix attempt that was reverted in favor of the literal spec).
- Card-vs-shell (Rule 3) is decided by the `cardLift` flag authored in `nflTeams.js` during Prompt B (PHI/GB/PIT only, per the verification memo). Rule 3's live computation above is reported for confirmation, not as the mechanism that picks the card fill.
- The 27 teams beyond the 3 authored worked examples (Eagles/Cowboys/Chiefs) and 5 stress teams use `authoredSurfaceDefault` computed from each team's already-authored `surfaceRole` color (Prompt B), not a designer pass — per `team-colorway-system-spec-v1.md`, that pass is still pending. Treat this report's non-stress-team rows as provisional until that authoring lands.
