# Omen UI North Star v1

**Date:** 2026-07-15  
**Status:** Active UX/UI authority for the next overhaul pass  
**Layer:** Omen product layer  
**Scope:** Product posture, UI organization, component governance, visual direction, motion, colorway/theme strategy, and document-authority cleanup.  
**Non-scope:** Backend contracts, production secrets, provider integration mechanics, pricing, legal terms, or code implementation details.

---

## 0. Why this file exists

Omen has several strong design and UX documents, but strong does not always mean current or correct. Some existing files are useful evidence, some are partially superseded, and some describe futures that no longer match the runtime app.

This file is the current decision authority for the UI overhaul. If another design document conflicts with this file, this file wins unless Justin explicitly reverses the decision.

The immediate goal is not to make the app prettier page by page. The goal is to define the product and component system strongly enough that future redesign work can be judged mechanically instead of by vibe.

---

## 1. Product posture

Omen should make the user feel like the **owner and GM of their fantasy team**.

Priority order:

1. **Roster decision assistant** — helps the user make better moves.
2. **Sports intelligence tool** — explains why the move matters.
3. **Fantasy dashboard** — shows relevant team, league, and platform context.
4. **Premium sports brand** — adds taste, motion, light, texture, and atmosphere only after clarity is protected.

Omen should feel like a front office console with swagger, not a generic SaaS dashboard and not a chaotic fantasy chat app.

### Omen is

- A decision layer for weekly fantasy football.
- A roster, matchup, draft, waiver, and trade assistant.
- A plain-English explainer: recommendation first, evidence second.
- A confidence and risk interpreter.
- A product that helps the user act like a sharper fantasy owner.

### Omen is not

- A general chatbot.
- A raw stats dashboard.
- A fantasy news portal.
- A full league-management replacement for ESPN, Yahoo, or Sleeper.
- A sportsbook-style hype machine.
- A visual effects demo.

---

## 2. Competitive theft map

Do not copy ESPN, Yahoo, or Sleeper wholesale. Borrow their strongest product behaviors and wrap them in Omen's own premium restraint.

### Yahoo command center

Steal:

- Whole-team visibility.
- Hub behavior: roster, league, status, decisions, and history connected in one place.
- Operational clarity.
- Team headquarters feeling.

Use this mostly for:

- `/football` / future Command Center.
- Roster overview.
- Platform connection status.
- League standings.
- Move history / Ledger.

Avoid:

- Sports portal sprawl.
- Too many equal-weight tabs.
- News/content clutter.

### ESPN urgency

Steal:

- This-week framing.
- Live-state energy.
- Action near insight.
- Strong recovery prompts when data/platform access is broken.
- Clear player/action surfaces.

Use this mostly for:

- Platform status.
- Live/mock/stale data states.
- Waiver timing.
- Omen of the Week readiness.
- Trade/draft actions.

Avoid:

- Broadcast noise.
- Ad-like density.
- Media portal energy.

### Sleeper fantasy fluency

Steal:

- Fast player discovery.
- Draft and matchup energy.
- Clear player rows.
- Dense but legible controls.
- League-motion feeling: the sense that fantasy activity is alive.

Use this mostly for:

- Trade Analyzer.
- Draft Assistant.
- Player search/autocomplete.
- Recommendation lists.
- Matchup, waiver, and draft contexts.

Avoid:

- Cartoonish tone.
- Social/chat chaos.
- Overplayful visuals that weaken trust.

### Omen blend

The target blend is:

> Yahoo command center + ESPN urgency + Sleeper fantasy fluency + Omen premium restraint.

Or, more plainly:

> Your front office sees the move before the rest of the league does.

---

## 3. Information architecture baseline

Organize the product around front-office jobs, not generic pages.

Preferred job categories:

- **Decide** — make the move.
- **Compare** — weigh options.
- **Monitor** — understand current state.
- **Manage** — connect platforms and configure account state.
- **Review** — inspect past moves and outcomes.
- **Learn** — understand the product and earn trust.

Recommended product grouping:

| Product area | Job | Routes / surfaces |
|---|---|---|
| Command Center / Front Office | Monitor + Decide | `/football`, league status, standings, current recommendations |
| Moves | Decide + Compare | Trade Analyzer, Omen of the Week, Waiver Wire |
| Roster Room | Monitor + Decide | lineup, player cards, roster risk, start/sit |
| Draft Room | Decide + Compare | Draft Assistant, ADP, pick recommendations |
| League Room | Monitor + Review | standings, opponents, history, ledger |
| Connections | Manage | platform linking, recovery, ESPN handoff |
| Public / Trust | Learn | landing, about, support, privacy, terms, ESPN guide |

`/football` should not feel like a random tab bucket. It should become the user's fantasy front office.

---

## 4. Component governance model

Omen does not need unlimited components. It needs a standard library with explicit variation rules.

### Level 1 — locked primitives

These are the base grammar. They should almost never be page-local:

- `Button`
- `Input`
- `Textarea`
- `Select`
- `SegmentedControl`
- `TabNav`
- `RadioCardGroup`
- `Card`
- `Alert`
- `Badge`
- `Chip`
- `PageHero`
- `MarketingHero`
- `Modal`
- `Drawer`
- `Tooltip`
- `EmptyState`
- `ErrorState`
- `LoadingState`
- `Text`

Rules:

- If a page defines its own button, input, tab, badge, card shell, or error treatment, that is drift unless explicitly approved.
- A primitive may have variants, but variants must be named and documented.
- Arbitrary one-off styling belongs in page code only when the component is truly campaign-specific or unreusable.

### Level 2 — standard Omen compositions

Built from primitives and reused across product areas:

- `DecisionBrief`
- `TradeResultCard`
- `OmenRecommendationCard`
- `PlayerRow`
- `PlayerCompareCard`
- `MetricStrip`
- `SignalList`
- `RiskPanel`
- `ConfidenceBar`
- `PlatformConnectionCard`
- `PlatformBadge`
- `ConnectionStatusBadge`
- `StepGuide`
- `CTAGroup`
- `ShareResultPanel`

Rules:

- These may have product-specific layouts.
- They should still consume primitives and tokens.
- If the same pattern appears on two pages, make it a composition.

### Level 3 — branded / campaign modules

These are allowed to flex more:

- Landing hero.
- Omen reveal moment.
- Holiday drop panel.
- Playoff/rivalry week takeover.
- Promo card.
- Special edition colorway hero.
- Draft board theater.

Rules:

- Flex is allowed, but interaction states, accessibility, typography scale, and token usage still apply.
- These modules should be rare.

### Level 4 — sanctioned exceptions

A one-off is allowed only when:

1. It serves a unique strategic moment.
2. It cannot reasonably be reused.
3. It is documented in the PR.
4. It does not create a second version of an existing standard component.

If a one-off later appears twice, it graduates into a standard composition.

---

## 5. Visual direction baseline

Omen should feel:

- Premium.
- Strategic.
- Decisive.
- Sports-native.
- Controlled.
- Warm, not sterile.
- Fun through moments, not constant noise.

Omen should not feel:

- Generic SaaS.
- Old dark dashboard.
- Sportsbook loud.
- Sleeper clone.
- ESPN media portal.
- Random AI-generated Tailwind page.

### Visual principles

1. **Decision first.** The call must be visually dominant.
2. **Evidence second.** Reasoning supports the move, but does not bury it.
3. **Status is visible.** Live, mock, stale, disconnected, and recovery states must be obvious.
4. **Surfaces need hierarchy.** Not every card can have the same border/fill/tone.
5. **Drama is rationed.** Use lighting, texture, and motion around high-value moments.
6. **Dense is fine when legible.** Fantasy workflows need density, but dense does not mean cluttered.
7. **Premium means controlled.** No neon sports bar energy, no bouncy game motion, no gratuitous glow.

---

## 6. Motion, texture, lighting, and atmosphere

Motion should make the app feel alive, not distracting.

### Motion belongs in

- Recommendation reveal.
- Confidence/risk transitions.
- Post-win pulse.
- Command Center status changes.
- Drawer/modal transitions.
- Hover/focus polish.
- Seasonal or limited colorway moments.

### Motion does not belong in

- Core reading paragraphs.
- Form typing states.
- Error messages.
- Dense comparison tables where animation hurts comprehension.
- Anything that repeats constantly.

### Texture and lighting rules

Allowed:

- Subtle gradient lighting.
- Soft edge glows.
- Very low-opacity paper/noise/field texture.
- Metallic accent moments.
- Seasonal overlay layers.

Not allowed:

- Constant animated backgrounds.
- Heavy glassmorphism everywhere.
- Neon glow as the primary design language.
- Texture that reduces contrast.
- Effects that make the app feel like a game menu instead of a front office.

Reduced motion must always be respected.

---

## 7. Colorway and theme strategy

Current runtime truth: team-based theming was removed on 2026-07-12. Active modes are `system` and `omen` only. Do not rebuild from stale team-theme doctrine without a new implementation plan.

Future colorways should be introduced as **theme packs**, not one-off page styles.

### Start with Omen-owned colorways

Recommended first packs:

1. Core Omen.
2. Blackout.
3. Whiteout.
4. Playoff Gold.
5. Rivalry Crimson.
6. Winter / Holiday.
7. Draft Night.

These prove the architecture without the complexity of 32 NFL team palettes.

### Team skins come later

Team skins should wait until:

- primitives are stable,
- semantic tokens are clean,
- component alias tokens exist,
- colorway packs have proven the system,
- accessibility checks are automated,
- team color does not collide with role semantics.

### Token hierarchy

| Token layer | Purpose | Variability |
|---|---|---|
| Core semantic tokens | text, surfaces, borders, risk, success, focus, spacing, type, motion | locked / rarely changed |
| Brand-expression tokens | accent, glow, hero gradient, decorative lighting | theme-pack variable |
| Component alias tokens | button, card, chip, panel, alert, hero surfaces | controlled variable |
| Campaign tokens | holidays, drops, rivalry, playoffs | temporary / bounded |
| Team tokens | future team skins | future-only until reapproved |

Rules:

- Role tokens must not be repurposed as brand/team colors.
- Risk, success, live, mock, unavailable, confidence, and platform identity must keep stable meanings.
- Color must never be the only differentiator.

---

## 8. Current file authority map

This section names the files this North Star replaces as decision authority. It does not require deletion.

| File | New status | Why |
|---|---|---|
| `Brand/brand-system.md` | Active companion | Still the strongest brand source. Keep as identity and voice authority. |
| `Blueprints/specs/design/component-lock-v1.md` | Partially superseded | Good component intent, but type choices and some implementation assumptions conflict with current brand/code. Use for component ideas, not final authority. |
| `Blueprints/specs/design/team-theme-contract-v1.md` | Future-only / superseded as runtime authority | Detailed but no longer matches current runtime, where team theming was removed. Use only as research for future skins. |
| `Blueprints/specs/page-system.md` | Partially superseded | Useful route history and page evidence, but new product posture and overhaul priority live here. |
| `Blueprints/audits/2026-07-10-frontend-doctrine-audit.md` | Evidence only | Keep as audit evidence. Do not treat stale team-theme conclusions as build doctrine. |
| `Blueprints/specs/app-ui-plan.md` | Needs reconciliation | Existing UI plan must be checked against this North Star before use. |
| `Blueprints/specs/omen-ux-ui-design-system-v1.md` | Legacy / needs reconciliation | Prior design-system source. This North Star decides what survives. |

If an agent needs to touch UX/UI, it should read this file first, then read the relevant active companion file.

---

## 9. Overhaul sequence

### Phase 0 — authority cleanup

- Add this North Star.
- Add a design README/index.
- Mark stale docs as active, companion, partially superseded, evidence-only, future-only, or legacy.
- Do not make page-code changes yet.

### Phase 1 — primitive completion

Build or reconcile:

1. `Button`
2. `Input`
3. `Textarea`
4. `SegmentedControl`
5. `TabNav`
6. `RadioCardGroup`
7. `Chip` / `Badge`
8. `PageHero`
9. `MarketingHero`
10. `EmptyState` / `ErrorState` / `LoadingState`
11. `PlatformBadge`
12. `DecisionBrief`

### Phase 2 — page migration

Recommended order:

1. Landing / public front door.
2. `/about` / public Trade Analyzer demo.
3. `/football` into Command Center / Front Office.
4. `/omen` premium decision moment.
5. `/trade` GM-room workflow.
6. `/draft` Draft Room workflow.
7. `/account/connect` platform connection system.

### Phase 3 — visual elevation

Add controlled motion, texture, lighting, richer hierarchy, and colorway pack support after the component migration is stable.

### Phase 4 — theme packs and skins

Ship Omen-owned colorways first. Team skins are a later system, not an immediate resurrection of the removed Team mode.

---

## 10. Definition of done for UX/UI work

A UX/UI PR is not done unless it answers:

1. Which product job does this screen/component serve?
2. Which standard primitive or composition does it use?
3. Did it introduce a one-off? If yes, why is that justified?
4. Does it preserve accessibility and reduced-motion behavior?
5. Does it use tokens instead of raw hex/Tailwind color literals where applicable?
6. Does it preserve live/mock/stale/disconnected status honesty?
7. Does it strengthen the owner/GM/front-office feeling?
8. Does it avoid making Omen feel like generic SaaS, sportsbook clutter, or social fantasy chaos?

---

## 11. Immediate component backlog

Build these as small PRs. Do not combine them into one giant overhaul PR.

| Priority | Component / system | Why |
|---|---|---|
| P0 | `Button` | Buttons are currently page-local and inconsistent. |
| P0 | `Input` / `Textarea` | Forms exist across trade, draft, connect, and ESPN. |
| P0 | `SegmentedControl` + `TabNav` | The app uses multiple selection/tab patterns. |
| P0 | `PageHero` | Product pages need one consistent hierarchy. |
| P0 | `EmptyState` / `ErrorState` / `LoadingState` | Recovery states currently drift. |
| P1 | `MarketingHero` | Public pages need a premium standard. |
| P1 | `DecisionBrief` | Omen of the Week needs a premium decision surface. |
| P1 | `PlatformConnectionCard` | ConnectLeague has strong behavior but local UI. |
| P1 | `PlayerRow` / `PlayerChip` | Trade/draft/player workflows need a shared player grammar. |
| P2 | Colorway pack architecture | Needed before holiday drops/team skins. |

---

## 12. Plain-English north star

Omen should not feel like an app that shows fantasy data.

It should feel like the user walked into their team's front office, saw the board, understood the market, and got the call.

The interface should say:

> You are the owner. You are the GM. Omen is the room where the better move becomes obvious.
