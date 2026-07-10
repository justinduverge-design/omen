# Frontend Doctrine Audit — Omen + inherited layers

**Date:** 2026-07-10
**Author:** Cowork L0 (Justin, in-session)
**Purpose:** Companion to `2026-07-10-app-wide-ux-audit.md`. That audit read the *live app*; this audit reads the *docs that dictate the live app* — L2 Omen design/brand specs, L1 Slops Saloon inherited doctrine, L0 SLOPS OS foundations. Catch drift, contradictions, redundancies, and rot before Codex is pointed at any of this.
**Scope (per Justin, 2026-07-10):** Full stack — L2 + L1 + L0, and deep-read the historical/ops docs too rather than skim them.
**Method:** Metadata inventory + head-reads of all in-scope files + cross-reference grep passes + targeted line-checks against citations.
**Files audited:** 25.

---

## TL;DR — five findings that reshape the plan

1. **My `team-theme-contract-v1.md` (written today) conflicts with the L1 fan-experience doctrine.** L1 says team color goes deep — surfaces, headers, panels take team color, not just accent. The paired L1 `team-colorway-system-spec-v1.md` even defines `--color-team-surface` and `--color-team-surface-card` tokens for exactly that purpose. My contract's deny list forbids team from touching surface tokens. **L1 wins.** The Commanders "no white on screen" complaint is real, but the fix is not "shell can never be team color" — it's "shell can take team color only when contrast checks pass AND card-vs-shell differentiation is preserved." Contract needs a revision pass (details in §Conflict Resolution).
2. **`design-md-plan.md` is self-superseded** as of 2026-07-08, in favor of a many-scoped-design.md architecture (per-team, per-room, per-page-family, per-component) that is queued in `Direction/current_sprint.md` but not yet built. `component-lock-v1.md` I wrote lives at the wrong level to fit that architecture — it should probably become `Blueprints/specs/design/system-component-lock-design.md` under the new naming, or the sprint plan should be revised to reflect that primitive-level component doctrine belongs at the spec layer, not the design.md layer. Needs a call.
3. **`brand-identity-digital-marketing.spec.md` (L0) is empty.** Zero bytes. Named as if it's an important brand-identity spec. Either a stub that never got authored or rot. Flag.
4. **Three overlapping component vocabularies exist across docs** with no reconciliation:
   - `component-lock-v1.md`: primitives (Button, Input, SegmentedControl, Card, Text, PageHero, TabNav, RadioCardGroup, Alert, Chip, PlatformBadge, TeamBadge).
   - `app-ui-plan.md`: mid-level (AppLayout, Header, ToolCard, StatusBadge, FeaturePanel, LoadingState, ErrorState, EmptyState, DisconnectedState, RecommendationCard, ConfidenceMeter, RiskBadge, EvidenceList, CTAButton).
   - `Direction/current_sprint.md` Design-docs lane: domain-specific (RecommendationCard, ConfidenceMeter, RiskBadge, StatusBadge, DataSourceLabel, MockBanner, appearance-picker tile, ChantEyebrow).
   These are almost certainly *three layers of the same stack* (primitives → mid-level composites → domain-specific composites) but no doc says so. Needs a taxonomy sentence in `component-lock-v1.md` or a sibling doc.
5. **`page-system.md` (39KB, largest single doc, dated 2026-06-15) is the "contract every visual change in Phase 1.4–1.12 must satisfy"** — and it was written against the pre-lock component vocabulary. It's about to be doc-drifted the moment component-lock ships. Add it to the sweep list.

Everything else in this audit is downstream of those five.

---

## Doc inventory (all 25 files) + authority level

| Layer | File | Size | Last touched | Authority | One-line purpose |
|---|---|---:|---|---|---|
| L2 Omen | `omen/Blueprints/specs/page-system.md` | 39KB | 2026-07-05 | Active (partially drift-exposed) | Per-route rendering contract for Phase 1.4–1.12 |
| L2 Omen | `omen/Blueprints/specs/team-motif-grammar.md` | 28KB | 2026-06-27 | Active | Motif / typeFlourish / culturalMoment overlay grammar |
| L2 Omen | `omen/Blueprints/specs/omen-ux-ui-design-system-v1.md` | 22KB | 2026-07-03 (banner 07-10) | Partially superseded | Component + team-theming sections deferred to lock/contract; palette + voice still authoritative |
| L2 Omen | `omen/Blueprints/specs/sign-in-connect-league-screen-spec.md` | 21KB | 2026-06-27 | Active with drift | Sign-in / connect-league screen contract |
| L2 Omen | `omen/Blueprints/specs/omen-operational-rename-cutover.md` | 16KB | 2026-06-27 | Historical (completed 2026-06-23) | Corvus→Omen rename ops plan |
| L2 Omen | `omen/Blueprints/specs/design/component-lock-v1.md` | 15KB | 2026-07-10 | Active (new) | The six locked component systems |
| L2 Omen | `omen/Blueprints/specs/design/team-theme-contract-v1.md` | 13KB | 2026-07-10 | Active (new, **needs revision — see §Conflict Resolution**) | Token allow/deny list for team-theming |
| L2 Omen | `omen/Blueprints/specs/omen-mvp-move.md` | 10KB | 2026-06-27 | Active (product spec, not design) | Omen of the Week / MVP Move feature spec |
| L2 Omen | `omen/Blueprints/specs/design-md-plan.md` | 8KB | 2026-07-08 | **Self-superseded** | Compilation plan for single root design.md — superseded by many-scoped architecture |
| L2 Omen | `omen/Blueprints/specs/omen-decision-layer.md` | 4KB | 2026-06-27 | Active (product spec) | Trust-first decision-assistant product framing |
| L2 Omen | `omen/Blueprints/specs/app-ui-plan.md` | 4KB | 2026-06-27 | Active (product spec) | App UI plan for Claude Code + Codex |
| L2 Omen | `omen/Blueprints/specs/homepage-product-priority.md` | 2KB | 2026-06-27 | Active (product spec) | Trade Analyzer front door decision |
| L2 Omen | `omen/Brand/brand-system.md` | 18KB | 2026-07-03 | Active (canonical) | Omen brand, voice, palette, type, AAA framework |
| L2 Omen | `omen/Brand/entity-identity-theming.md` | 15KB | 2026-06-27 | Active (L0-promotion candidate) | Methodology for entity-affinity theming (product-agnostic) |
| L2 Omen | `omen/Blueprints/design.md` | 228B | 2026-06-27 | **Broken (self-referential redirect)** | Redirect stub |
| L1 SS | `slops-saloon/Direction/decisions/slops-saloon-fan-experience-doctrine-v1.md` | 15KB | 2026-07-03 | **L1 doctrine — binds L2** | Look Good — Play Good; two-sided presence; three-room mapping |
| L1 SS | `slops-saloon/Direction/decisions/corvus-ux-ui-direction-v1.md` | 10KB | 2026-07-03 | Active | Omen UX/UI direction v1 (auth posture, hierarchy) |
| L1 SS | `slops-saloon/Blueprints/specs/slops-os-app-template-spec.md` | 10KB | 2026-06-22 | Active (route drift) | Reusable app template for all Slops Saloon products |
| L1 SS | `slops-saloon/Blueprints/specs/chant-and-fan-copy-spec-v1.md` | 15KB | 2026-07-03 | Active (**code lags spec**) | Chant strings, placement, timing, medium |
| L1 SS | `slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md` | 30KB | 2026-07-08 | **L1 doctrine — binds L2** | Per-team War Room + Color Rush token contract |
| L0 OS | `Blueprints/specs/ux-ui-execution.spec.md` | 5KB | 2026-06-20 | Active (L0 guardrails) | Practical UX/UI execution guardrails for SLOPS OS |
| L0 OS | `Blueprints/specs/design-md.spec.md` | 5KB | 2026-06-20 | Active | MVP contract for `design.md` files (YAML front matter + prose) |
| L0 OS | `Blueprints/specs/app-strategy.spec.md` | 5KB | 2026-06-22 | Active | Reduced MVP app strategy |
| L0 OS | `Blueprints/specs/slops-os-markdown.spec.md` | 6KB | 2026-06-20 | Active | Markdown standard for SLOPS OS DBS |
| L0 OS | `Blueprints/specs/brand-identity-digital-marketing.spec.md` | **0KB (EMPTY)** | 2026-06-20 | **Rot / stub** | (empty file — named as if authoritative) |

---

## Authority graph

Doctrine flow, top-down:

```
L0 (SLOPS OS foundations)
├── ux-ui-execution.spec.md         → generic UX guardrails
├── design-md.spec.md               → what a design.md file must contain
├── slops-os-markdown.spec.md       → doc routing + shape
├── app-strategy.spec.md            → app strategy defaults
└── brand-identity-digital-marketing.spec.md   [EMPTY — stub]
        ↓
L1 (Slops Saloon division doctrine)
├── slops-saloon-fan-experience-doctrine-v1.md    ★ binds L2. Locks two-sided presence + three-room + "team color goes deep"
├── corvus-ux-ui-direction-v1.md                  → Omen UX direction (auth, hierarchy)
├── slops-os-app-template-spec.md                 → reusable app template
├── chant-and-fan-copy-spec-v1.md                 → chant contract (code lags)
└── team-colorway-system-spec-v1.md               ★ binds L2. Per-team War Room + Color Rush tokens (defines team-surface tokens my contract forbids)
        ↓
L2 (Omen product doctrine)
├── Brand/brand-system.md                                   → canonical palette/voice/type/AAA
├── Brand/entity-identity-theming.md                        → methodology (L0-promotion candidate)
├── Blueprints/specs/omen-ux-ui-design-system-v1.md         → design tokens, now partially superseded
├── Blueprints/specs/design/component-lock-v1.md         (NEW)     → primitive component lock
├── Blueprints/specs/design/team-theme-contract-v1.md    (NEW)     → allow/deny list  ← CONFLICTS with L1 team-colorway spec (§Conflict Resolution)
├── Blueprints/specs/page-system.md                         → per-route rendering (about to doc-drift)
├── Blueprints/specs/team-motif-grammar.md                  → motif overlay grammar
├── Blueprints/specs/sign-in-connect-league-screen-spec.md  → sign-in screen contract (drift w/ actual routes)
├── Blueprints/specs/omen-decision-layer.md                 → product decision layer
├── Blueprints/specs/homepage-product-priority.md           → Trade Analyzer front-door
├── Blueprints/specs/app-ui-plan.md                         → app UI plan + mid-level component vocab
├── Blueprints/specs/omen-mvp-move.md                       → MVP Move feature spec
├── Blueprints/specs/design-md-plan.md                      [SELF-SUPERSEDED 2026-07-08]
├── Blueprints/specs/omen-operational-rename-cutover.md     [HISTORICAL — completed 2026-06-23]
└── Blueprints/design.md                                    [BROKEN — self-referential redirect]

Not audited but referenced heavily:
- Blueprints/specs/teams/ (per-team -colorway.md stubs, 32 teams, plus README + _batch-tracking)
- Direction/current_sprint.md "Design docs" lane (queues the many-scoped design.md architecture)
- Blueprints/skills/design-md-author/SKILL.md (mandated authoring pathway)
```

---

## Conflict Resolution — team-theme-contract-v1 vs. L1 fan-experience doctrine

This is the big one. It changes the plan.

### What L1 says

From `slops-saloon-fan-experience-doctrine-v1.md`:

> When the fan picks their team, the phone puts on the uniform — the app *becomes* the team, not "displays team colors."
> Team color goes deep — surfaces, headers, panels take team color, not just accent lines. Depth is graduated by room.

And the corollary (which is the reason my instinct wasn't totally wrong):

> Data legibility is never traded for team-color depth. If team-color deepening starts to fight confidence, risk, or data-source semantics, the answer is not "less team color" and not "less legibility" — the answer is a *creative solution* that delivers both.

From `team-colorway-system-spec-v1.md` §2.1 (War Room skin):

> `--color-team-surface` — Room background — deepens in Locker Room, modulates lighter in Owner Suite / GM Suite. Must resolve to a readable-on-dark surface for the current room mode.
> `--color-team-surface-card` — Card surfaces. Must pass 3:1 against team-surface.

So L1 explicitly *defines* team surface tokens with contrast constraints. Team color IS allowed on the shell, it just has to pass a legibility test.

### What my `team-theme-contract-v1.md` says

> **Shell tokens — never** [team can override]:
> `--color-bg`, `--color-surface-1..3`, `--color-border`, `--color-border-subtle`, `--color-text-primary/secondary/tertiary`.

That's a wholesale deny. Wrong.

### The Commanders complaint reconsidered

The user's specific complaint was "no white on the screen." Reading it again through the L1 lens: the failure isn't that the shell went burgundy — that's *desired* per L1. The failure is that the shell went burgundy AND the cards inside also went burgundy AND the borders also went burgundy AND there's no differentiation left. **The card-vs-shell contrast collapsed**, so the eye has no rest and no visual hierarchy.

L1's spec would catch that in `--color-team-surface-card` requiring 3:1 against `--color-team-surface`. In the Commanders skin as currently implemented, `--color-team-surface-card` is presumably *the same* burgundy as `--color-team-surface` (or too close to it). That's the contrast failure. Not the fact that the shell is burgundy at all.

### The revision `team-theme-contract-v1.md` needs

- Replace the wholesale surface deny-list with a *contrast-gated allow*.
- Adopt L1's token names: `--color-team-primary`, `--color-team-secondary`, `--color-team-accent`, `--color-team-surface`, `--color-team-surface-card`. (Mine had `--color-team-tertiary` instead of `--color-team-accent`. Rename.)
- Encode the L1 contrast constraints as the required checks:
  - `--color-team-surface` must pass 4.5:1 vs. `--color-text-primary`
  - `--color-team-surface-card` must pass 3:1 vs. `--color-team-surface`
  - `--color-team-primary` (as accent) must pass 3:1 vs. shell
  - Role-collision distance ≥ 20 ΔE vs. `--color-omen`, `--color-risk-high` (my rule, keep — L1 corollary about legibility supports it)
- Fallback cascade stays, but the primary/secondary/surface fallbacks now come from L1's rules, not mine.
- The Deny list keeps: role tokens (risk, omen, data-*), position-brand tokens, platform-brand tokens. Those never move.
- Split MODE into two switches (light/dark shell, team/Omen accent) — keep this, L1 doesn't forbid it and it addresses a real UX issue documented in the app audit.
- Add explicit note: **the L1 fan-experience doctrine is the source of truth on team-color depth. This contract implements the legibility guards L1's corollary calls for.**

The five stress-test verdicts probably all stay directionally right (Steelers, Commanders, Chiefs still resolve via fallback if contrast fails) but need re-articulating in the L1 vocabulary and re-verifying against the actual L1 test constraints.

**Priority:** revise `team-theme-contract-v1.md` before Phase 3. It's a doc-only edit — no code has been written against the current version yet.

---

## Findings by severity

### Critical

**C1 — Contract-vs-doctrine conflict (team-theme).** Covered above in §Conflict Resolution. Revise `team-theme-contract-v1.md`.

**C2 — Doctrine architecture is mid-migration.** `design-md-plan.md` (self-superseded 2026-07-08) proposed a single root `design.md`. The replacement architecture (many scoped design.md files: per-team, per-room, per-page, per-component) is queued in `Direction/current_sprint.md` but **not yet authored**. `component-lock-v1.md` I wrote today doesn't fit that architecture — it lives at `Blueprints/specs/`, not under `Blueprints/specs/design/` where sprint-plan queues put component-level design docs. Two possible reconciliations:
- Move `component-lock-v1.md` under `Blueprints/specs/design/` and rename it to follow the design.md convention (e.g., `component-lock-design.md`) — probably requires running it through the `design-md-author` skill (per sprint plan: "Do NOT hand-author design.md files without the skill").
- Or accept that "primitive component lock" is a spec-layer concern separate from "design intent per component" — the design.md files still get authored, but they compose against the locked primitives. My lock stays where it is; sprint-plan's component-level design.md entries reference it.
The second reads cleaner to me but it's Justin's call.

**C3 — Empty L0 spec.** `Blueprints/specs/brand-identity-digital-marketing.spec.md` is 0 bytes. Named as a canonical L0 brand-identity spec. Either delete or author. Currently rot.

### High

**H1 — Three overlapping component vocabularies.** `component-lock-v1.md` (primitives), `app-ui-plan.md` (mid-level composites), `current_sprint.md` design-docs lane (domain composites) name partially overlapping, mostly disjoint components with no doc-level reconciliation. A one-page taxonomy inside `component-lock-v1.md` naming the three layers and giving 1–2 examples per layer would resolve this. Otherwise Codex will keep inventing new components.

**H2 — `page-system.md` (largest doc, 39KB) will drift the moment `component-lock-v1.md` lands.** Written 2026-06-15, references the old design system doc for "what components exist." Once Codex sweeps `frontend/src` to canonical components, `page-system.md`'s per-route rules will name components that no longer exist under those names. Sweep this doc in Phase 3 too — it's part of the doctrine sweep, not the code sweep.

**H3 — Route architecture drift vs. template.** `slops-os-app-template-spec.md` says every product uses `/[product]/app` (dashboard) + `/[product]/[tool]`. Actual Omen routes: `/omen`, `/trade`, `/draft`, `/waiver`, `/football`, `/ledger`, `/standings`. No `/[product]/app` shell. No `/[product]/[tool]` nesting. Either the template is stale (needs updating to reflect Omen's actual pattern) or Omen is out of compliance (needs a route refactor — bigger scope, out of the current design-system pass).

**H4 — Sign-in screen spec says `/` serves Omen; actual `/` serves marketing Landing.** `sign-in-connect-league-screen-spec.md`: "`/` serves Omen at launch. Slops Saloon parent routing is future." Live app: `/` is the Landing page (marketing hero + Trade Analyzer preview + "MORE FROM OMEN" section). Sign-in / Connect-League don't render at `/`. Spec is drifted from reality.

**H5 — L2 doc lineage references stale — upstream banner missing.** Multiple docs cite `omen-ux-ui-design-system-v1.md` for component/team-theming guidance, but that doc now has a partial-supersession banner. Docs that need to catch up:
- `slops-saloon/Blueprints/specs/team-colorway-system-spec-v1.md` — "Implements against: `omen-ux-ui-design-system-v1.md` v2 (Phase 1.5 team-theming tokens)." Update to reference `team-theme-contract-v1.md` for the token contract (after C1 revision).
- `slops-saloon/omen/Blueprints/specs/team-motif-grammar.md` — `depends-on: Blueprints/specs/omen-ux-ui-design-system-v1.md`. Update to add component-lock reference for the components motifs decorate.
- `slops-saloon/omen/Blueprints/specs/page-system.md` — "Source evidence: `omen-ux-ui-design-system-v1.md`." Update to add component-lock reference.
- `slops-saloon/omen/Blueprints/specs/design-md-plan.md` — already superseded, no update needed.

### Medium

**M1 — `team-motif-grammar.md` cites `brand-system.md` by line number.** Two citations: `brand-system.md:140-146` (typography lock) and `brand-system.md:192` (AAA framework). Line 140-146 currently sits around typography (approximately correct). Line 192 currently sits at Marketing Pillars header (**broken — AAA framework is not there anymore**). Replace line-number citations with §-name citations or heading anchors.

**M2 — `Blueprints/design.md` is a self-referential redirect.** File contains "Canonical Omen design notes now live here: `slops-saloon\Omen\Blueprints\design.md`" — but that path IS this file. Either delete the file (nothing links to it and the actual design system lives in `Blueprints/specs/`) or make it point at `Blueprints/specs/omen-ux-ui-design-system-v1.md` (the doc it presumably used to redirect to).

**M3 — Product-hierarchy redundancy across 4 docs.** Trade Analyzer = front door, Omen = paid centerpiece, Draft Assistant free-this-year is stated in:
- `omen-decision-layer.md`
- `homepage-product-priority.md`
- `app-ui-plan.md`
- `corvus-ux-ui-direction-v1.md`
All four consistent, but the surface area is 4× what it needs to be. Suggested canonical home: `corvus-ux-ui-direction-v1.md` (L1 decision, oldest, most-cited). The three L2 docs get shortened to a one-liner + link back.

**M4 — Renaming risk in filenames.** `corvus-ux-ui-direction-v1.md` still uses the old brand name in the filename even though the product is now Omen. Renaming would break every "inherits from" reference in child docs. Live with it or do a coordinated pass.

**M5 — L1 specs are ahead of code.** `chant-and-fan-copy-spec-v1.md` names `frontend/src/lib/teamChant.js` as "new — needs building." `team-colorway-system-spec-v1.md` names `frontend/src/lib/teamTheme.js` similarly. Both are aspirational specs. Not a doc bug per se, but worth flagging that the doctrine layer expects code that doesn't exist.

**M6 — Historical/ops doc filed as spec.** `omen-operational-rename-cutover.md` is a completed ops runbook, not a design or product spec. Move to `Blueprints/history/` or delete.

**M7 — Product-feature spec filed as design spec.** `omen-mvp-move.md` is a feature spec for Omen of the Week, not design doctrine. `omen-decision-layer.md` is a product framing. `homepage-product-priority.md` is a product decision. All three are worth keeping but their location under `Blueprints/specs/` blurs "product spec" and "design/system spec." A `Blueprints/product/` or `Blueprints/specs/product/` split would clarify.

**M8 — `entity-identity-theming.md` is a promotion candidate.** File itself says: "This doc is currently L2 (Omen) but its content is product-agnostic. Surface for promotion to L0 (slops-os) or L1 (slops-saloon)." Currently sitting in L2 despite being reusable methodology. Move up when the next product adopts entity-affinity theming.

### Low

**L1 — Naming convention inconsistency.** `omen-ux-ui-design-system-v1.md` (v1 in name, v2 in content — reconciled but filename never updated). `component-lock-v1.md` (v1 in name, v1 in content — cleaner). `team-theme-contract-v1.md` (same). L1's `team-colorway-system-spec-v1.md` and `chant-and-fan-copy-spec-v1.md` (same). Consistent going forward. Only the old design-system file lags.

**L2 — Frontmatter presence is inconsistent.** Some docs use YAML front matter (`team-motif-grammar.md`, `design-md-plan.md`), most don't. Not a bug per se, but if `design-md.spec.md` (L0) mandates YAML front matter for design.md files, and the new design.md sprint plan uses them, adopting YAML front matter across all spec files would remove one axis of drift.

**L3 — File names use hyphens vs. camelCase vs. underscores.** Most are hyphenated (`omen-ux-ui-design-system-v1.md`). A few Direction files use underscores (`current_sprint.md`, `decision_log.md`). Not fixable without a coordinated pass, and probably not worth one.

**L4 — Line-count sprawl in `omen-ux-ui-design-system-v1.md`.** The doc has grown to 488 lines and Phase 1.x additions are described as "indexed inline as they land." The Phase 1.x section now dominates; the original core tokens are hard to find. Splitting off Phase 1.x (motif/moment/team) into their own docs (which is happening incrementally — team-motif-grammar already lives outside) would let the base doc shrink.

---

## Cross-reference validation

Grep of "SUPERSEDED" markers across all in-scope files:
- `omen-ux-ui-design-system-v1.md` — banner added 2026-07-10 (mine).
- `design-md-plan.md` — self-superseded 2026-07-08 (existing).
- Others — none.

Grep of "TODO" / "TBD" / "TK" in the audited docs:
- Very few — the docs are polished. Most gaps are structural, not textual.

Grep of docs citing `omen-ux-ui-design-system-v1.md`:
- `team-colorway-system-spec-v1.md`, `team-motif-grammar.md`, `page-system.md`, `design-md-plan.md`, `chant-and-fan-copy-spec-v1.md` (indirect). All need to update citations to also point at `component-lock-v1.md` + `team-theme-contract-v1.md` (post-C1 revision) as authoritative for components and team-theming.

Grep of docs citing L1 `slops-saloon-fan-experience-doctrine-v1.md`:
- `team-colorway-system-spec-v1.md`, `chant-and-fan-copy-spec-v1.md`, `team-motif-grammar.md` (indirect via depends-on brand-system), `omen-ux-ui-design-system-v1.md` §Inherits, `team-theme-contract-v1.md` (mine — indirectly via naming the same domain). Central L1 doc, well-cited.

---

## Prioritized cleanup list (post-audit)

Ordered by unblock-value.

1. **Revise `team-theme-contract-v1.md`** to align with L1 fan-experience + L1 colorway spec (see §Conflict Resolution). Blocks Phase 3.
2. **Decide C2** — does `component-lock-v1.md` stay where it is (Blueprints/specs/) or move under Blueprints/specs/design/ per the many-scoped design.md architecture? Needs a Justin call.
3. **Add a component-taxonomy note to `component-lock-v1.md`** naming primitives / mid-level composites / domain composites and pointing at the other two vocabularies. Fixes H1.
4. **Sweep `page-system.md`** to reference `component-lock-v1.md` for component vocab, remove ad-hoc component names, note the parts made obsolete by the sweep.
5. **Update L1 → L2 citations** in `team-colorway-system-spec-v1.md` (Implements against) and `team-motif-grammar.md` (depends-on) to add the two new specs.
6. **Delete or author `brand-identity-digital-marketing.spec.md`.** Zero-byte L0 doc named as authoritative.
7. **Fix `Blueprints/design.md`** — self-referential loop. Either delete or redirect to `Blueprints/specs/omen-ux-ui-design-system-v1.md`.
8. **Replace line-number citations in `team-motif-grammar.md`** with §-name citations. Also fix the broken line-192 AAA-framework reference.
9. **Decide route drift (H3, H4)** — bring `slops-os-app-template-spec.md` into line with actual Omen routes, or refactor routes to match template. Bigger call, defer if unclear.
10. **Consolidate product-hierarchy statements (M3)** — the four docs saying the same thing about Trade Analyzer as front door.
11. **Move historical/ops docs (M6, M7)** to a clear location — `omen-operational-rename-cutover.md`, and consider moving product feature specs (`omen-mvp-move.md`, `omen-decision-layer.md`, `homepage-product-priority.md`) into `Blueprints/product/`.
12. **Promote `entity-identity-theming.md` to L1/L0** when the next Slops Saloon product adopts entity theming.

---

## What this audit unblocks

- Phase 3 (Codex prompts) can now proceed with a doctrinally-sound `team-theme-contract-v1.md` (after revision) instead of one that quietly contradicts L1.
- The doc-sweep list (items 4, 5, 8) can be handed to Codex as a distinct doc-hygiene PR ahead of any code changes.
- The many-scoped design.md architecture becomes tractable: `component-lock-v1.md` and (revised) `team-theme-contract-v1.md` are the *inputs* every per-team / per-room / per-page design.md file cites, so the doctrine chain is coherent even as design.md authoring lags behind.

Nothing found here changes the *live app audit's* conclusions. The token contract bug is still real, still reproduced, and the components still need locking. What changes is *how strict the contract is allowed to be*: L1 wants team color on the shell, so the contract has to enable that safely, not forbid it.
