# Primitive Migration Plan — Frontend Pages

**valid-as-of:** 2026-07-19
**Status:** active plan — all §2 primitives built and merged to `main`; page migration not yet started
**Scope:** migrate all live frontend pages onto the canonical `frontend/src/components/ui/` primitive library. Follows the merged Trade Analyzer (PR #139) and Draft Assistant (branch `frontend/c1-draft-assistant-primitive-migration`) precedents.
**Authority:** this file is the reference for the multi-PR migration. One page per PR, most-work → least-work. `Direction/current_sprint.md` items C1–C5 point here.

## Goal

Every live page renders through canonical primitives rather than bespoke/raw markup, so the app reads as one system and future design changes land in one place. "Migrated" means: imports from `../components/ui/*`, uses CSS custom-property tokens (`var(--color-*)`) not raw Tailwind color literals (`slate-*`/`emerald-*`/`red-*`/`amber-*`), and reuses primitives instead of re-implementing them locally.

## Reference precedent

`TradeAnalyzer.jsx` (merged PR #139) and `DraftAssistant.jsx` are the pattern. Read either before migrating a page. The Draft Assistant PR also established: `RiskBadge → Badge tone="warning|success|risk"` (the `warning` tone was added to `Badge.jsx` for exactly this), and `tabular-nums` on numeric badges to fix optical off-centering.

---

## 1. Effort ranking (most → least work)

Ranked by *remaining migration work*, not file size. `ConnectLeague.jsx` is a 658-line file but ~70% done, so it ranks low.

| # | Page | Lines | Primitive usage now | Effort | Gating dependency |
|---|---|---|---|---|---|
| 1 | `OmenOfTheWeek.jsx` | 684 | ~5% (MockBanner only) | XL | build Meter + PageHero-size first |
| 2 | `Account.jsx` | 271 | 0% | L | **build Modal first** |
| 3 | `Landing.jsx` | 643 | 0% | L | decision: decorative cards |
| 4 | `Football.jsx` | 324 | ~35% | M | — |
| 5 | `Standings.jsx` | 326 | ~15% | M | uses new Table (built) |
| 6 | `Onboarding.jsx` | 307 | ~10% | M | uses new Stepper (built) |
| 7 | `WaiverWire.jsx` | 223 | ~40% | M | — |
| 8 | `Demo.jsx` | 202 | 0% | S-M | — |
| 9 | `Login.jsx` | 296 | 0% | S-M | — |
| 10 | `TradeShare.jsx` | 195 | 0% | S-M | — |
| 11 | `ConnectLeague.jsx` | 658 | ~70% | S | — |
| 12 | `OmenLanding.jsx` | 129 | 0% | S | **decision: marketing hex** |
| 13 | `OmenPage.jsx` | 123 | ~40% | S | — |
| 14 | `Ledger.jsx` | 68 | 0% | XS | — |
| 15 | `EspnConnectGuide.jsx` | 30 | 0% | XS | — |

**Not migration targets:** `TradeAnalyzer.jsx` + `DraftAssistant.jsx` (done); `Omen.jsx` / `PromoCapture.jsx` / `PromoTradeCapture.jsx` (dev-only, tree-shaken from prod); `StartSit.jsx` (dead code — flagged for removal); `Privacy`/`Terms`/`Support`/`DeleteAccount`/`NotFound` (trivial static prose, already tokenized).

---

## 2. Primitives to build

**STATUS: complete.** All five below are built, verified, and merged to `main` (2026-07-19). `Table` and `Stepper` clear Standings (#5) and Onboarding (#6); `Modal` unblocks Account (#2); `Meter` + the `PageHero` size prop unblock OmenOfTheWeek (#1). Every page migration can now branch straight off `main`. The sub-sections below are retained as the design record.

### A. `Modal` — REQUIRED, blocks Account (#2)
`Account.jsx:17-164` hand-builds a delete-confirmation dialog: fixed backdrop, `role="dialog"`/`aria-modal`, focus trap (via `lib/useFocusTrap.js`), ESC-to-close, body-scroll-lock, responsive `items-end`→`sm:items-center`. This is production a11y logic to **promote, not rewrite** — Account is the reference implementation. Build `Modal` (compound `Modal.Body`/`Modal.Footer` following Card's shape; header rendered from `title`/`eyebrow`/`onClose` props with the standardized close button), then Account consumes it. First primitive to build.

### B. `Meter` (ConfidenceBar) — RECOMMENDED, build before OmenOfTheWeek (#1)
The confidence bar appears twice (`OmenOfTheWeek.jsx:243`, `DraftAssistant.jsx:82`), both wrapping `lib/confidenceGradient.js`, and the queued P0 **B3 DecisionBrief** needs it a third time. Small primitive: track + gradient fill + optional label/percentage.

### C. `PageHero` size variants — ENHANCEMENT, unblocks ~5 headers
`PageHero` is locked to `font-display text-4xl`. Account (`5xl/6xl`), Standings (`3xl`), OmenPage (`4xl/5xl`), Ledger, OmenHeader all hand-roll the same eyebrow/title/subtitle at *different sizes*. Add a `size` prop (`sm/md/lg`) so they adopt PageHero without a silent size change. ~10-line edit to the existing file.

**Not primitives** (genuine one-offs): the START/BENCH PlayerCompareCard, the metallic tier badge, Login's OAuth `Divider`, Landing's decorative marketing cards.

---

## 3. Cross-cutting patterns (apply on every page)

Cheapest, lowest-risk wins:

- **Name-shadowing duplicates → import-and-delete.** Local components that shadow a canonical primitive by name: OmenOfTheWeek's `LoadingState`/`ErrorState`/`EmptyState`, Landing's `Button` + `PlayerChip`, Login's `AuthButton`, WaiverWire's `PlayerRow`, Standings' `PlatformBadge`. Two sources of truth — delete the local, import the canonical.
- **`RiskBadge` → `Badge tone="warning|success|risk"`** — established in DraftAssistant. Copy verbatim.
- **`<a>`/`<Link>` styled as button → `<Button asChild>`** — Button supports `asChild`. Recurs on ~8 pages.
- **`animate-pulse` skeleton `<div>`s → `LoadingState variant="skeleton"`** — recurs on ~6 pages.
- **Raw color literals → tokens/tone props** — concentrated in OmenOfTheWeek (66), Demo (10), Football, Login/Landing error text.

---

## 4. Per-page scouting reports (most → least work)

### #1 — OmenOfTheWeek.jsx · XL · highest value + highest risk
Recommendation surface for the whole app — rendered by `/omen` (via OmenPage), `/football` (Football tab), and `/demo` (via exported `OmenRecommendationView`), plus dev PromoCapture. ~12 bespoke subcomponents, ~66 raw literals, and it **shadows** `LoadingState`/`ErrorState`/`EmptyState` by name.
- **Map:** local state components → canonical `LoadingState`/`ErrorState`/`EmptyState`/`DisconnectedState`; `RiskBadge`→`Badge(warning)`; `MoveTypeBadge`→`Badge(neutral)`; `ConfidenceBar`→ new `Meter`; `slate-800/900` card shells (×10) → `Card`; emerald "Live" pill → `Badge`; sky "Demo" pill → `Badge`; reasoning-number badges → add `tabular-nums`.
- **Trickiest / risk:** exported `OmenRecommendationView` contract is consumed by 3 files — prop shape (`data`, `banner`, `showFeedback`) must not change. `SignalsPanel` already uses tokens (leave it). Keep `PlayerCompareCard`, metallic tier, `confidenceBarStyle` domain logic.
- **Approach:** do after Meter + PageHero-size exist. Split into 2 PRs — (a) state components + badges + card shells, (b) header + Meter + reasoning. Verify all 3 consumers + 8 backend states (`pending_live_engine`, ESPN recovery ×4, `platform_disconnected`, `empty`, `error`, `success`) via `?fixture=omen-roster`.

### #2 — Account.jsx · L · blocked on Modal
Colors already tokenized; the only real work is the modal. Build `Modal` (§2A) from this file's dialog, then Account renders `<Modal>` + `Button`s for the two triggers.
- **Trickiest:** exact a11y parity (focus trap, ESC, body-lock). The `DELETE MY OMEN DATA` confirmation phrase is **approval-gated** (facts-of-record) — do not touch the string.

### #3 — Landing.jsx · L · public homepage
0% migrated, defines local `Button` + `PlayerChip` duplicates. Two near-identical waitlist forms (`HeroWaitlist:320`, `WaitlistSection:408`).
- **Map:** delete local `Button`/`PlayerChip`; platform pills → `SegmentedControl`; email → `Input`; submit → `Button loading`; `red-300` error → `Alert tone="risk"`.
- **DECISION NEEDED:** decorative marketing cards (`TradeAnalyzerHeroCard`, `OmenMiniCard`, `DraftAssistantMiniCard`) with `white/8` glows — recommend leaving bespoke (forcing onto `Card` loses the look for no reuse benefit). Also consider deduplicating the two waitlist forms.
- **Risk:** medium — highest-traffic public surface; screenshot every breakpoint.

### #4 — Football.jsx · M
Already uses Alert/DisconnectedState/EmptyState. Remaining: tab bar (`:284-312`) reinvents `TabNav`; emerald connected-pill (`:72`); raw reconnect `<button>` (`:95`); `animate-pulse` skeletons.
- **Trickiest:** the tab bar carries `role="tablist"`/`aria-controls` wiring AND a `data-post-win-wash` CSS side-effect hook — `TabNav` must preserve both. Verify the post-win animation still fires.

### #5 — Standings.jsx · M · unblocked by Table
`StandingsTable` → new `Table` (the primitive was modeled on this file, incl. the "you" highlighted row). Local `PlatformBadge` → canonical; 4 state cards → `DisconnectedState`/`ErrorState`/`EmptyState`; `Skeleton` → `LoadingState`; CTA links → `Button asChild`.

### #6 — Onboarding.jsx · M · unblocked by Stepper
`StepDots` → new `Stepper` (modeled on this file). "Supported platforms" list (`:78-99`) → `PlatformBadge`; 3 raw buttons + 1 Link → `Button`/`Button asChild`.
- **Note:** the `C` monogram in the header (`:276`) is a stale pre-rebrand artifact — flag for brand owner, don't silently change.

### #7 — WaiverWire.jsx · M
Local `PlayerRow` → canonical `PlayerRow`+`PlayerChip`; `TokenExpiredState`/`AuthGate` → `DisconnectedState`; week `<input>` → `Input`; submit → `Button`; **fix 2 remaining raw literals** (`text-black`, `border-t-black` → `--color-text-on-accent`). **Correct the stale 2026-07-05 decision-log claim** that this page was "fully migrated" — it wasn't.

### #8 — Demo.jsx · S-M · mechanical
`DemoBanner`→`MockBanner`, `LoadingGate`→`LoadingState`, `ErrorBlock`→`ErrorState`, footer→`Button`, `DemoHeader`→`PageHero`. Only Demo's wrapper — the inner view is OmenOfTheWeek's (#1).

### #9 — Login.jsx · S-M
`AuthButton`→`Button` (use `leadingIcon` for Google/Discord SVGs); form→`Input`+`Button`; `MagicLinkSent`→`Card`; `red-400`→risk token. Keep bespoke `Divider` and OAuth icons.

### #10 — TradeShare.jsx · S-M
`StateCard`→`Card`+state components; `PlayerList`→`PlayerRow`/`PlayerChip`; hero confidence/risk badges→`Badge`/`Meter`.

### #11 — ConnectLeague.jsx · S · big file, small delta
Already ~70% migrated. Remaining: Sleeper league picker (`:162-193`) → `RadioCardGroup` (title+description fits its API); `ManualEntryCard`/`EspnGuide` inline `surface-2` boxes → `Card`/`Alert`; `ErrorMsg` → `Alert tone="risk"`; loading skeleton → `LoadingState`.

### #12 — OmenLanding.jsx · S · DECISION NEEDED
Heaviest raw-hex of any page (`#050505`, `#F4EFE1`, `#C9A44C`) — may be a deliberate dark "saloon" marketing divergence, not a bug. **Decision needed:** tokenize to match the app, or keep the bespoke marketing palette? Everything else (nav-as-buttons → Button, feature pills → Card) is trivial once decided.

### #13 — OmenPage.jsx · S
`OmenHeader`→`PageHero`, `LoadingGate`→`LoadingState`. Already uses DisconnectedState/EmptyState. Near drop-in.

### #14 — Ledger.jsx · XS
Header→`PageHero`, skeleton→`LoadingState`. Delegates to `MoveHistory`. ~30 lines own markup.

### #15 — EspnConnectGuide.jsx · XS
4 button-shaped elements → `Button`/`Button asChild`.

---

## 5. Sequencing

1. **Build the 3 primitives first** (Modal, Meter, PageHero-size) — they gate #1 and #2 and prevent rework. `Table` + `Stepper` already done.
2. Execute the ranking top-to-bottom (most → least), **one page per PR**, matching the DraftAssistant precedent.
3. Each page: `slops-git-flow` (scoped branch), `slops-ui-ux-audit` + `slops-mobile-smoke` (desktop/mobile light/dark), `slops-quality-baseline` (`npm run build`), `slops-code-review`; add `slops-ux-copy` only if words change.

## 6. Open decisions (needed before their pages)

- **OmenLanding marketing-hex (#12):** tokenize or keep bespoke "saloon" palette?
- **Landing decorative cards (#3):** keep the bespoke marketing illustrations, and deduplicate the two waitlist forms?

## 7. Side findings (not migration work)

- `StartSit.jsx` is dead code (no route/import/test reference) — flagged for removal in a separate task.
- The 2026-07-05 decision-log claim that WaiverWire is "fully migrated" is inaccurate — correct it when migrating #7.
- Onboarding's `C` monogram (`Onboarding.jsx:276`) is a stale pre-rebrand artifact.
