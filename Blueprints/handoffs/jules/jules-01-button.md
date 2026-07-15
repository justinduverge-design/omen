# Jules brief — 01 · Button primitive

**Queue position:** 1 of 11 (UI primitive/composition queue, 2026-07-15 — updated 2026-07-15 to add Badge/Chip and Tooltip dependency briefs; see `Blueprints/handoffs/jules/README.md` for the authoritative run order)
**Depends on:** none
**Status:** ready to run immediately
**Supersedes:** `Blueprints/prompts/jules-button-primitive-v1.md` (same content, relocated into the numbered queue — do not maintain both; treat this file as canonical and that one as historical once this is confirmed).

**Two-phase split (added retroactively — apply this to how the PR is opened):** open this as two PRs, not one. **PR 1a** builds `Button.jsx` only, touches no page files, and can merge any time — it does not conflict with anything. **PR 1b** does the four-file migration listed below and must be serialized against every other queue item that touches `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, or `Landing.jsx`. See `README.md` for the current migration-serialization order.

---

## Objective

Build one component: canonical `Button`. Nothing else. This is the first primitive in the queue and the template other briefs will follow for structure and rigor.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md` (current UX/UI authority)
2. `Blueprints/specs/design/README.md` (read-order index)
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md` (suppression status map)
4. `Blueprints/specs/design/component-lock-v1.md` §1 only (Button API — partially superseded doc overall, but §1's API shape is still authoritative; ignore its shadcn/Radix tooling assumptions, see §2 below)
5. `Blueprints/backlog/ui-component-system.md` P0.1

## Dependency / sequencing

None. This is the first buildable PR in the queue. Can run in parallel with brief 04 (PageHero) at the component-file level, but **not** safely in parallel with any brief touching `ConnectLeague.jsx`, `TradeAnalyzer.jsx`, `DraftAssistant.jsx`, or `Landing.jsx` at the same time — coordinate merge order if multiple briefs are in flight.

## Implementation scope

### Canonical API (locked)

```jsx
<Button
  variant="primary|secondary|tertiary|danger|link"
  size="sm|md|lg"
  tone="accent|omen"
  leadingIcon={ReactNode}
  trailingIcon={ReactNode}
  loading={false}
  disabled={false}
  asChild={false}
/>
```

- **variant** — `primary` (filled accent), `secondary` (outlined accent), `tertiary` (ghost), `danger` (filled `--color-risk-high`), `link` (no chrome, underline on hover only). No other variants exist.
- **size** — `sm` 28px, `md` 36px (default), `lg` 44px.
- **tone** — `accent` (default, reads `--color-accent`) or `omen` (reads `--color-omen`, reserved for AI-signal moments). No other tones.
- **states** — hover, focus-visible (2px outline using the existing `focus-visible:outline-[var(--color-accent)]` convention), active, disabled, loading (spinner replaces trailingIcon, label stays).
- **asChild** — when true, render the child element (e.g. a react-router `<Link>`) with button chrome instead of a `<button>`. Implement via `React.cloneElement` merging className/style/handlers — no Radix `Slot` needed.

### Deviation from `component-lock-v1.md`: no new dependencies

That doc's implementation notes assume shadcn/ui + Radix + class-variance-authority. Confirmed absent from `frontend/package.json` (no `@radix-ui/*`, no `shadcn`, no `class-variance-authority`, no `clsx`/`tailwind-merge`, no `components.json`). Per the standing rule — do not install new UI libraries unless current active docs require it — and the North Star does not require this tooling. Build `Button` as a plain React function component using Tailwind utility classes + inline `style={{ color: 'var(--color-...)' }}`, matching the existing idiom in `frontend/src/components/help/HelpButton.jsx`. If Jules judges shadcn/Radix genuinely necessary, stop and flag back rather than installing silently.

### Tokens consumed (already exist in `frontend/src/index.css` — do not add or rename)

`--color-accent`, `--color-accent-hover`, `--color-text-on-accent`, `--color-omen`, `--color-risk-high`, `--color-text-primary`, `--color-border`.

### Migration targets, in this order

1. `frontend/src/pages/ConnectLeague.jsx` — replace local `CTAButton` (~line 59), `GhostButton` (referenced ~line 506), and raw `<button>` elements (~423–435, ~712–725).
2. `frontend/src/pages/TradeAnalyzer.jsx`
3. `frontend/src/pages/DraftAssistant.jsx`
4. `frontend/src/pages/Landing.jsx` — this is where `asChild` matters most (the "Sign in →" pseudo-button drift).

Platform brand coloring on ConnectLeague's connect buttons should move off Button chrome onto a `leadingIcon` slot only — do not build a `PlatformBadge` component in this PR; note the gap in the PR description instead.

## Allowed files

- `frontend/src/components/ui/Button.jsx` (new)
- `frontend/src/components/ui/index.js` (new barrel, optional — keep consistent with whatever pattern already exists in `components/ui/`, which currently has none)
- `frontend/src/pages/ConnectLeague.jsx`
- `frontend/src/pages/TradeAnalyzer.jsx`
- `frontend/src/pages/DraftAssistant.jsx`
- `frontend/src/pages/Landing.jsx`
- `Blueprints/playbooks/skill-usage-ledger.md` (append a row)
- `Blueprints/handoffs/` (new dated handoff, close-out convention)
- `Direction/decision_log.md` (log the no-new-deps decision if reconsidered)

## Forbidden files

- `frontend/src/index.css` — no new/renamed tokens, no changed hex values.
- `frontend/tailwind.config.js` — no theme extension for this component; if truly needed, stop and ask.
- `frontend/package.json` / `package-lock.json` — no new dependencies.
- Any file under `Blueprints/specs/design/` (North Star, README, suppression banners, component-lock-v1, team-theme-contract-v1, page-system, omen-ux-ui-design-system-v1) and `Blueprints/backlog/ui-component-system.md` — doctrine, not implementation targets.
- Any page outside the four listed above (`Football.jsx`, `Omen.jsx`, `OmenOfTheWeek.jsx`, `Account.jsx`, `Demo.jsx`, `Login.jsx`, `Onboarding.jsx`, `Standings.jsx`, `StartSit.jsx`, `WaiverWire.jsx`, `EspnConnectGuide.jsx`) — a later sweep PR handles these.
- `frontend/src/components/help/HelpButton.jsx` — bespoke floating-action-button chrome, distinct shape, not a Button variant candidate in this PR.
- Backend, `sql/`, `deploy/`, `docker-compose*`, `.env*`, anything outside `frontend/`.
- Team theming tokens (`--color-team-*`) — runtime-removed 2026-07-12; tone stays `accent`/`omen` only.

## Explicit non-goals

- No `Input`, `Textarea`, `SegmentedControl`, `TabNav`, `RadioCardGroup`, `PageHero`, `EmptyState`, `ErrorState`, `LoadingState`, `PlatformBadge`, `PlatformConnectionCard`, `DecisionBrief`, `PlayerRow`, `PlayerChip`, or `MetricStrip` — separate briefs.
- No shadcn/Radix/CVA installation.
- No `index.css` token changes.
- No team theming resurrection.
- No page layout, copy, or IA redesign — swap button markup only.
- No changes to `Football.jsx`, `Omen.jsx`, `OmenOfTheWeek.jsx`, or any page outside the four listed.

## Likely test / build commands

`frontend/` has no component test framework (no Jest/Vitest configured — confirmed via repo search 2026-07-15). Verification is:

- `npm --prefix frontend run build` — Vite build must succeed with no errors (catches JSX/import mistakes).
- Manual visual check in both `data-theme="dark"` and `data-theme="light"`, screenshots attached to the PR.
- Manual keyboard check: Tab to each migrated button, confirm focus-visible ring appears.
- Backend test suite (`npm test` at repo root, `node --test`) is unaffected by this PR and does not need to run, but confirm CI doesn't fail for unrelated reasons.

## Risk level

**Low.** Purely additive component, no shared state, no backend touch, well-bounded migration set. Main risk is scope creep into PlatformBadge or into pages outside the four listed.

## Review notes for Claude/Codex after Jules opens the PR

1. Confirm zero raw hex literals in `Button.jsx` — every color is a `var(--color-...)` reference.
2. Confirm zero new entries in `frontend/package.json`.
3. Confirm both light and dark mode screenshots are actually attached, not just described.
4. Confirm `asChild` on Landing renders a real `<a>`/`<Link>` with button chrome, not a button wrapping a link.
5. Confirm no second button-like component was introduced as a workaround (no local `PrimaryButton`, `IconButton`, etc.).
6. Confirm `CTAButton` and `GhostButton` are fully removed from `ConnectLeague.jsx`, not left dead in the file.
7. Confirm the PR description answers the North Star §10 self-check questions (product job, primitive used, one-offs introduced, accessibility/reduced-motion, tokens vs hex, status honesty preserved, owner/GM feeling, no generic-SaaS drift).
8. Confirm `Blueprints/playbooks/skill-usage-ledger.md` got a row and a dated handoff exists in `Blueprints/handoffs/`.
