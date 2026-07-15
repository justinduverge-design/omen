# Jules brief — 12 · PlatformBadge

**Queue position:** 12 of 13 by file number (numbered late to avoid renumbering already-shipped briefs) — **but functionally an early, blocking dependency.** See dependency correction below.
**Depends on:** **03 Badge/Chip** (soft — may reuse its base styling approach, but is a distinct component, not a `Badge` tone)
**Status:** Phase A ready as soon as 03 has merged. **This brief has no Phase B** — component build only, no migration, ever.
**⚠ Hard blocking dependency for brief 08:** `08-platform-connection-card-brief.md` **must not be implemented before this brief ships.** `component-lock-v1.md`'s deprecated-pattern note is explicit that platform brand color must move "off the button chrome" onto a dedicated badge component — Button (01) and PlatformConnectionCard (08) both deferred this exact gap when they were written. This brief closes it. Jules: do not start 08 until `PlatformBadge.jsx` exists and is merged.

---

## Objective

Build one component, `PlatformBadge`, that carries Yahoo/Sleeper/ESPN brand identity (icon + brand color) as an isolated, reusable unit — so no other component (`Button`, `PlatformConnectionCard`, or anything else) needs to embed platform-brand coloring directly on its own chrome. **Component-only PR, no page migration** — same discipline as briefs 03 and 05. `PlatformConnectionCard` (08) is the actual consumer that wires this into `ConnectLeague.jsx`.

## Required reading (in order)

1. `Blueprints/specs/design/omen-ui-north-star-v1.md` §4 (Level 1 primitive list)
2. `Blueprints/specs/design/README.md`
3. `Blueprints/specs/design/legacy-doc-suppression-banners.md`
4. `Blueprints/specs/design/component-lock-v1.md` §1 deprecated-patterns note (platform color must move off Button chrome) and §4 (Card `preview`/`error` variants, for context on how badges sit inside cards)
5. `Blueprints/backlog/ui-component-system.md` P1.2 (names `PlatformBadge` as part of `PlatformConnectionCard`'s shape)
6. `Blueprints/handoffs/jules/jules-03-badge-chip.md` — must be merged first; read its final `Badge`/`Chip` API.
7. `frontend/src/index.css` — read the full platform brand palette block (both `:root`/dark and `:root[data-theme="light"]`): `--color-platform-sleeper`, `--color-platform-yahoo`, `--color-platform-espn`, `--color-platform-yahoo-chip`, `--color-platform-espn-chip`, `--color-on-platform-sleeper`, `--color-on-platform-yahoo`, `--color-on-platform-espn`. These tokens already exist and are already theme-aware — use them, do not recalculate or re-derive brand colors.

## Phase A allowed files

- `frontend/src/components/ui/PlatformBadge.jsx` (new)
- `frontend/src/components/ui/index.js` (extend barrel)
- `Blueprints/playbooks/skill-usage-ledger.md`
- `Blueprints/handoffs/` (new dated handoff)

A tiny usage example is justified here (per queue rule: "component build briefs should be component-only unless a tiny usage example is explicitly justified") because the platform-icon assets need a concrete rendering check — include a throwaway inline example in the PR description (a code block, not a committed page route) showing all three platforms rendered, rather than adding a scratch route to the app.

## Forbidden files (applies to this brief's only phase, Phase A)

- **No page files** — `ConnectLeague.jsx` and any other consumer are out of scope; brief 08 handles integration.
- `frontend/src/index.css`, `frontend/tailwind.config.js` — no changes; in particular, do not add new platform tokens, the existing `--color-platform-*` set already covers all three platforms in both themes.
- `frontend/package.json` — no new dependencies.
- Package lockfile — no changes, including accidental churn from running `npm install`.
- `frontend/src/components/ui/Badge.jsx`, `Chip.jsx` — do not modify; `PlatformBadge` is a new, distinct component, not an edit to `Badge`'s tone list (platform brand color is identity, not status — mixing it into `Badge`'s status tones would violate the North Star §7 rule that role tokens must not be repurposed as brand colors).
- Any file under `Blueprints/specs/design/` or `Blueprints/backlog/ui-component-system.md`.
- Team theming tokens (`--color-team-*`) — do not resurrect.

## Implementation requirements

```jsx
<PlatformBadge platform="yahoo|sleeper|espn" size="sm|md" showLabel={true} />
```

- Renders the platform's icon (find existing platform icon assets under `frontend/` — check `public/` or an existing icons directory before creating new ones; if no icon assets exist yet, use a simple text/monogram fallback and flag the missing-asset gap rather than sourcing new logo files, which is a legal/brand-usage concern outside this PR's scope) plus optional label text.
- Color always comes from `--color-platform-{platform}` for the icon/accent and `--color-on-platform-{platform}` for any text drawn directly on a filled platform-color background. Where text sits on a neutral surface instead (not filled with platform color), use the `-chip` variants (`--color-platform-yahoo-chip`, `--color-platform-espn-chip`) which exist specifically for "dark-surface-legible" text-on-badge use per the `index.css` comment — Sleeper has no separate `-chip` token because its base color already passes contrast on dark surfaces (per the `index.css` sourcing note), so don't invent one.
- `showLabel`: when true, renders the platform name ("Yahoo", "Sleeper", "ESPN") next to the icon; when false, icon-only (must still carry an `aria-label`).

## Allowed variants

- `platform`: `yahoo` | `sleeper` | `espn` only — no generic/placeholder platform.
- `size`: `sm` | `md` only.
- `showLabel`: boolean.
- No interactive/clickable variant — this is a display badge, not a button. If `PlatformConnectionCard` (08) needs a clickable platform selector, that's composed by wrapping `PlatformBadge` in `Button asChild` or similar at the consumer level, not built into this component.

## Token usage

`--color-platform-sleeper`, `--color-platform-yahoo`, `--color-platform-espn`, `--color-platform-yahoo-chip`, `--color-platform-espn-chip`, `--color-on-platform-sleeper`, `--color-on-platform-yahoo`, `--color-on-platform-espn`. All already exist, both themes. Zero raw hex, zero new tokens, zero changes to existing platform token values (they were carefully contrast-tuned per the `index.css` sourcing comments — re-deriving them is explicitly out of scope and risks breaking documented AA/AAA contrast work).

## Accessibility requirements

- Icon-only mode (`showLabel={false}`) must carry `aria-label="Yahoo"` / `"Sleeper"` / `"ESPN"` — never icon-only with no accessible name.
- Verify AA contrast for label text against whichever background it's rendered on, in both themes — the `-chip` tokens exist precisely because raw platform colors don't always pass on their own; use them where the `index.css` comments indicate.
- Do not rely on platform color alone to distinguish platforms when `showLabel` is true — label text is the primary differentiator, color is secondary (consistent with North Star §7: "color must never be the only differentiator").

## Phase A verification

- `npm --prefix frontend run build` — must succeed with the component present but unused.
- No committed scratch route. No screenshots required — a tiny inline usage example in the PR description (code block only, per the allowance above) substitutes for the missing fixture. Document in the PR how all three platforms were visually checked in both themes.
- Manual contrast check (browser DevTools contrast checker or equivalent) for each platform's label-on-badge combination, both themes.

## Done criteria

1. `PlatformBadge.jsx` exists, implements the API above for all three platforms, both sizes, `showLabel` toggle.
2. Zero raw hex, zero new/changed tokens.
3. Icon-only mode has `aria-label` in all three cases.
4. Contrast verified and documented for all three platforms × both themes.
5. Zero page files touched.
6. Ledger row + dated handoff exist.

## PR title/body template

**Title:** `[UI primitive] PlatformBadge — platform brand identity component (no migration, blocks PlatformConnectionCard)`

**Body:**
```
## What
Adds PlatformBadge per component-lock-v1.md §1 deprecated-patterns note + ui-component-system.md P1.2.
Component-only PR — no page migration. Blocks brief 08 (PlatformConnectionCard), which must not
be implemented until this merges.

## Icon assets
[what icon assets were found/used, or the text-monogram fallback decision + gap flagged]

## Contrast verification
Yahoo: [dark] [light]
Sleeper: [dark] [light]
ESPN: [dark] [light]

## Evidence
Ledger row: [link]
Handoff: [link]
```

## Explicit non-goals

- No page migration (that's brief 08).
- No new platform support beyond Yahoo/Sleeper/ESPN.
- No new logo/icon asset sourcing if none exist — flag the gap instead.
- No interactive/clickable variant.
- No changes to existing `--color-platform-*` token values.
- No shadcn/Radix/CVA installation.

## Downstream dependencies

**08 PlatformConnectionCard — hard blocked on this brief.** Do not start 08's implementation until `PlatformBadge.jsx` is merged. See `README.md` for the corrected dependency graph.

## Risk level

**Low-medium.** No page touches keep conflict risk low, but the missing-icon-asset unknown (repo inspection didn't confirm platform logo files exist under `frontend/`) is a real risk — Jules needs to actually check before assuming icons are available, and must not source new brand logo assets unilaterally (trademark/brand-usage concern).

## Claude/Codex review checklist after Jules opens the PR

1. Confirm zero page files in the diff.
2. Confirm all three platforms render correctly per the PR's documented manual verification.
3. Confirm no new logo/icon assets were added without flagging — if assets were found in the repo, confirm they're used correctly (not re-created).
4. Confirm `-chip` token variants are used correctly (Yahoo/ESPN have them, Sleeper doesn't need one — verify this wasn't "fixed" by inventing a Sleeper-chip token).
5. Confirm `aria-label` present on icon-only mode.
6. Confirm zero raw hex, zero token value changes.
7. Confirm ledger + handoff entries exist.
