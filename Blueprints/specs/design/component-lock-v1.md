# Component Lock v1 — Omen frontend

**Date:** 2026-07-10
**Author:** Cowork L0 (Justin, in-session)
**Status:** Draft (pre-implementation). Supersedes the component-level portions of `omen-ux-ui-design-system-v1.md` v2.
**Companion:** `team-theme-contract-v1.md` (governs which of the tokens named here may be overridden by a team skin).
**Foundation:** [shadcn/ui](https://ui.shadcn.com/) primitives on top of Radix. Rationale in the header of `2026-07-10-app-wide-ux-audit.md` — TL;DR: already on Tailwind, own the source, a11y comes with Radix, matches modern open-source grammar.

---

## Purpose

Lock a fixed grammar for the six things the user identified as drifting:

1. Button
2. Input
3. Segmented control
4. Card shell
5. Type scale (heading / body / label)
6. Spacing rhythm

Once locked, every ad-hoc pattern documented in the audit gets swept to the canonical version by Codex/Claude Code in Phase 3. Nothing here is discretionary — variants that are not named here do not exist in the app.

---

## How to read this doc

Per system: **Canonical API → Variants → States → Tokens read → Deprecated patterns to sweep**. The Deprecated list references the exact drift rows in the audit matrix, so a sweep pass can be mechanical.

---

## 1. Button

### Canonical API

```jsx
<Button variant="primary" size="md" tone="accent" leadingIcon={...} trailingIcon={...} loading={false} disabled={false} asChild={false} />
```

Backed by shadcn `Button` component (extended). `asChild` uses Radix `Slot` so a `<Button asChild><Link to="…"/></Button>` renders a real anchor with button chrome — kills the "bordered text link" pseudo-button drift on Landing.

### Variants (locked list — no others exist)

| variant | Use | Chrome |
|---|---|---|
| `primary` | The main call to action on a screen. One per screen ideally. | Filled accent, high contrast text-on-accent |
| `secondary` | Same weight as primary, alternative choice. | Outlined accent, transparent fill |
| `tertiary` | De-emphasized action, meta or utility. | Ghost — no border, transparent fill, accent text |
| `danger` | Destructive or irreversible actions. | Filled `--color-risk-high`, cream text |
| `link` | Inline text-affordance masquerading as an action ("Try again →", "Back to dashboard"). | No chrome. Underline on hover only. |

### Sizes (locked)

`sm` (28px), `md` (36px, default), `lg` (44px). Used consistently; `lg` for hero CTAs, `md` for form submits, `sm` for card actions and dense lists.

### Tones

`accent` (default — reads `--color-accent`) and `omen` (reads `--color-omen` — reserved for AI-signal moments, e.g. "Read the omen" CTA). No other tones. Team color reaches Button only via `--color-accent`, never directly.

### States

Hover, focus-visible (2px outline, `--color-accent` at 40% opacity), active, disabled, loading (spinner replaces trailingIcon, label stays).

### Tokens read

`--color-accent`, `--color-accent-hover`, `--color-text-on-accent`, `--color-omen`, `--color-risk-high`, `--color-text-primary`, `--color-border`, `--color-focus-ring`.

### Deprecated (sweep targets)

- Landing (`/`) row: "bordered `Sign in →` pseudo-button" → `<Button variant="secondary" asChild size="md"><Link to="/login">Sign in →</Link></Button>`.
- Landing row (b) small gold outline pills for `Join Waitlist` in top nav → `<Button variant="tertiary" size="sm" />`.
- `/login`→`/account` row: three per-brand colored `Connect Yahoo/Sleeper/ESPN` buttons → `<Button variant="primary" size="md" />` with a leading platform icon token. Platform brand color moves to a `<PlatformBadge />` sub-component, off the button chrome.
- `/omen` and `/demo`: pink faded "Try again" retry buttons → `<Button variant="secondary" size="sm">Try again</Button>` inside a canonical error card (see §4).
- `/football`, `/ledger`, `/standings`: teal text-link `Try again →` → `<Button variant="link">Try again →</Button>`. Now visually and semantically one thing.
- Landing `Analyze Your Trade` big gold CTA + `/trade` teal `Compare Trade` smaller CTA → both are `variant="primary" size="lg"`. Size difference only if hero vs. inline.

---

## 2. Input

### Canonical API

```jsx
<Input type="text|email|number|password" size="md" state="default|error|success" leadingIcon={...} trailingIcon={...} label="…" hint="…" errorMessage="…" />
```

Backed by shadcn `Input` component; label + hint + error are wrapped via `FormField` slot pattern.

### Variants (locked)

- Type is HTML type. That drives the input mode and keyboard.
- `size`: `sm` (32px), `md` (40px, default), `lg` (48px).
- `state`: `default`, `error` (red border + errorMessage rendered below), `success` (green check trailing icon).

No other variants. No borderless, no filled-only, no "chip-with-textbox." Textarea gets a sibling `<Textarea />` component with the same props.

### Tokens read

`--color-surface-1`, `--color-border`, `--color-border-hover`, `--color-text-primary`, `--color-text-secondary` (placeholder), `--color-risk-high` (error border), `--color-focus-ring`.

### Deprecated

- Landing email textbox (translucent fill) → `<Input type="email" size="md" placeholder="you@example.com" />`.
- `/waiver` orphan number input → same, plus the whole page needs the canonical hero (see §5).
- `/draft` two number inputs → same. Currently they have distinct-looking chrome from `/waiver`; both go to the canonical.
- `/account/connect` Sleeper username textbox → same.

---

## 3. Segmented control

**One pattern. Filled-pill.** The other three patterns observed in the audit (underline-tab on `/football`, card-radio on `/account/appearance`, variant-toggle on `/account/appearance`) are deprecated as segmented controls.

Two of those (card-radio, underline-tab) are legitimate as *other* components — see §3.1.

### Canonical API

```jsx
<SegmentedControl value={value} onValueChange={setValue} size="md">
  <SegmentedControl.Item value="ppr">PPR</SegmentedControl.Item>
  <SegmentedControl.Item value="half">Half PPR</SegmentedControl.Item>
  <SegmentedControl.Item value="std">Standard</SegmentedControl.Item>
</SegmentedControl>
```

Backed by shadcn `Tabs` (list style="segmented") — same primitive, chrome-only difference from tab nav.

### Variants (locked)

- `size`: `sm` (28px), `md` (36px default), `lg` (44px).
- Fill state: filled accent on selected, transparent-with-border on unselected. Unselected must have visible 1px border — resolves the `/trade` vs `/draft` inconsistency where `/trade` unselected had no border and `/draft` did.

### Tokens read

`--color-accent` (selected fill), `--color-text-on-accent`, `--color-surface-1` (unselected fill), `--color-border`, `--color-text-primary`.

### Deprecated

- `/football` underline tab nav (`Trade Analyzer / Omen of the Week / Draft Assistant / History`) is not a segmented control — it's a *navigation tab*. See §3.1.
- `/account/appearance` card-radio (System / Team / Omen) is not a segmented control — it's a `RadioCardGroup`. See §3.1.
- `/account/appearance` `OFFICIAL / CALLE OCHO` variant toggle IS a segmented control. Goes to canonical `SegmentedControl`.
- `/account/connect` `Chrome or Edge / Firefox / Safari` — canonical `SegmentedControl`.

### 3.1. Sibling components (adjacent to segmented)

Two adjacent components come from the same primitive family and are locked here to avoid confusion:

- **`<TabNav />`** — underline-tab nav for switching *pages within a dashboard* (like `/football` tabs). Backed by shadcn `Tabs` with list style="underline". Only used for view-switching, not for form input.
- **`<RadioCardGroup />`** — card-radio for *high-value one-of-N choices* (MODE picker on `/account/appearance`). Backed by shadcn `RadioGroup` styled as cards. Only used when each choice needs a title + description.

Never use SegmentedControl for tab nav. Never use tab nav for form input. Never use RadioCardGroup when a plain segmented control would fit.

---

## 4. Card

### Canonical API

```jsx
<Card variant="solid|outlined|empty|error|preview" tone="neutral|omen|risk">
  <Card.Header eyebrow="…" title="…" trailing={<Badge …/>} />
  <Card.Body> … </Card.Body>
  <Card.Footer> … </Card.Footer>
</Card>
```

Backed by shadcn `Card` component (extended). `Header`, `Body`, `Footer` are subcomponents that enforce spacing rhythm (§6).

### Variants (locked)

| variant | Use | Chrome |
|---|---|---|
| `solid` | Default panel or content card. | `--color-surface-1` fill, `--color-border-subtle` 1px border |
| `outlined` | Preview or "example" card that should read as secondary. | Transparent fill, `--color-border` 1px border |
| `empty` | "We have no data yet" state — not an error, just empty. | Dashed 1px `--color-border` border, transparent fill, muted body copy |
| `error` | Something failed. Includes a retry action. | `--color-risk-high` tinted fill, `--color-text-primary` on top, canonical `<Button variant="secondary" size="sm">Try again</Button>` in Body |
| `preview` | Live-preview / demo panel (Live Preview on `/account/appearance`, Trade Analyzer sample on Landing). | `outlined` chrome + a small `Preview` chip in trailing header slot |

Empty and error are two different variants because they mean two different things. Sweep pass consolidates the pink/red "500 request failed" cards on `/omen`, `/demo`, `/login` to `error`, and the dashed-border "Couldn't load history" cards on `/ledger`, `/standings` to `empty`.

### Deprecated

- `/omen` pink retry card (currently ambiguous between "error" and "loading failed") → `Card variant="error"`.
- `/ledger`, `/standings` dashed neutral card → `Card variant="empty"`.
- `/demo` pink "Demo Mode temporarily unavailable" → `error`.
- `/login`→`/account` "Request failed: 500" banner → convert to inline `error` alert component (see §4.1) or wrap the affected card in `error` variant depending on scope of failure.
- Landing dark charcoal Trade Analyzer preview + inner three-up split → `Card variant="preview"` outer, plus a canonical three-column layout inside using spacing rhythm.

### 4.1. Alert (sibling)

Inline banner-style alert for full-width messages that are not full cards. Same tone tokens as Card. Backed by shadcn `Alert`. Used for `/draft`'s gold "Preview Mode" banner and any similar top-of-page notices.

---

## 5. Type scale

The canonical page hero on product pages is the closest thing to a working pattern in the current app. Lock it as `<PageHero>` and lock the type scale that supports it.

### Type scale (locked)

| Role | Font | Size / Line | Weight | Tracking | Use |
|---|---|---|---|---|---|
| `display` | Cinzel serif | 48/56 | 700 | 0 | Marketing hero only (Landing) — one per page max |
| `h1` | Cinzel serif | 32/40 | 700 | 0 | Product page hero title (`Omen of the Week`, `Hall of Records`) |
| `h2` | Inter sans | 20/28 | 600 | 0 | Card titles (`Send`, `Receive`, `Platform Connections`) |
| `h3` | Inter sans | 16/24 | 600 | 0 | Sub-section headers within a card |
| `body` | Inter sans | 15/24 | 400 | 0 | Body copy, descriptions |
| `body-sm` | Inter sans | 13/20 | 400 | 0 | Meta, secondary description |
| `label` | Inter sans | 12/16 | 500 | 0.05em | Form labels |
| `eyebrow` | DM Mono | 12/16 | 500 | 0.12em, uppercase | Small-caps label above hero (`OMEN`, `THE LEDGER`, `SETTINGS · APPEARANCE`) |
| `chip` | DM Mono | 11/14 | 500 | 0.10em, uppercase | Chant chips, mode tags, badge text |

Backed by a shadcn-style `<Text as="h1|h2|…" role="display|h1|…">` primitive. Uses Tailwind classes wired to CSS variables so a font-file swap only touches the token layer.

### Canonical page hero

```jsx
<PageHero
  eyebrow="OMEN · HALL OF RECORDS"
  title="Hall of Records"
  subtitle="Start with a trade check, prepare for the draft, then let Omen of the Week fold start/sit and waiver choices into one plain-English weekly move."
  trailing={<Chip>THE 305</Chip>}  {/* optional chant chip */}
/>
```

Every product page uses `<PageHero>`. Marketing pages use `<MarketingHero>` (different shape — see Landing).

### Deprecated

- `/waiver` no page hero → add `<PageHero eyebrow="WAIVER" title="Waiver Wire" subtitle="…" />`.
- `/standings` chant appearing as *italic body inline* (`305 never sleeps.`) → move to `<PageHero trailing={<Chip>305 NEVER SLEEPS</Chip>} />` if you want it, or drop it. Not free-floating italic body.
- `/football` extra outlined chip `THE 305` next to eyebrow → this IS the canonical trailing chip slot. Keep, formalize.
- Landing glitching hero: separate bug (regression or animation timing), tracked in the audit. `<MarketingHero>` component includes it as `<Text role="display">` — glyph rendering is orthogonal.

---

## 6. Spacing rhythm

### Base scale (locked)

`4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96` — Tailwind default with the 12, 24, 48 middle rungs kept. Any ad-hoc padding outside these values is deprecated.

### Layout rhythm

- **Card interior**: 24px top/bottom, 24px sides.
- **Card header → body**: 16px.
- **Body → footer**: 24px.
- **Section stack**: 48px between major sections on a page.
- **Page hero → first content section**: 32px.
- **Form field → next form field**: 16px.
- **Label → input**: 8px.
- **Input → hint / errorMessage**: 4px.
- **Header nav height**: 64px on desktop, 56px on mobile.

### Tokens read

Not a token consumer — spacing is a Tailwind config decision, not a runtime CSS variable. Codified in `tailwind.config.js` extension.

### Deprecated

- Any inline `style={{ padding: … }}` or Tailwind arbitrary values (`p-[13px]`) — sweep pass replaces with the closest scale value.
- `/waiver`'s tight input+button huddle → real section stack rhythm.

---

## Implementation notes (for Phase 3 Codex prompt)

1. `npx shadcn@latest init` in `frontend/` with base color set to CSS variables (custom, not shadcn's built-in themes). Wire `--color-*` tokens to shadcn's variable names in `tailwind.config.js` and `index.css`.
2. Generate primitives: `button input tabs radio-group card alert badge label`. Overlay Omen-specific classNames on top.
3. Create `frontend/src/components/ui/` as the canonical module — export `Button`, `Input`, `Textarea`, `SegmentedControl`, `TabNav`, `RadioCardGroup`, `Card`, `Alert`, `PageHero`, `MarketingHero`, `Text`, `PlatformBadge`, `Chip`. Nothing else lives in `ui/`.
4. Sweep pass replaces every ad-hoc button/input/tab/card in `frontend/src/pages/**` with the canonical imports. Every row in the deprecated lists above is a discrete PR-sized edit.
5. Storybook or MDX docs page per component (optional but recommended before a large refactor).

---

## What this doc does NOT cover

- The specific tokens themselves — those live in `omen-ux-ui-design-system-v1.md` v2 and the follow-on `team-theme-contract-v1.md`. This doc references them by name.
- Motion / animation — separate spec.
- The Landing hero glitch — separate bug ticket, tracked in the audit.
- Accessibility contrast per team — see `team-theme-contract-v1.md`.
