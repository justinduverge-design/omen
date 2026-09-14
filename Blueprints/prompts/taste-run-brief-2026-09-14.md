# `slops-taste` run brief — native visual lock

> ## ⚠️ CORRECTED 2026-09-14 — this brief pointed the wrong skill at the job
>
> **`slops-taste` generates; it does not grade.** Its Outputs are *"Frontend code (via Codex) OR
> reference images"*, and its own **Does NOT** says it does not replace `slops-ui-ux-audit` because
> *"audit is separate from generation."* The four questions below are grading questions, and asking
> taste to answer them was an error in this brief.
>
> **It is also not installed.** `.claude/skills/slops-taste/` holds only the Slops wrapper; the
> upstream variants are absent and installing them is a founder boundary
> (`npx skills add https://github.com/Leonxlnx/taste-skill`).
>
> **The four questions were answered directly instead**, and the answers plus three founder
> decisions are in **`Direction/reviews/2026-09-14-native-canvas-taste-pass.md`**. Read that, not
> this. The inputs below remain accurate and are still the right reference for any pass over this
> canvas.
>
> **The real gap:** nothing in the library grades a native artboard. `slops-ui-ux-audit` is web-only,
> `slops-native-ui-audit` needs a built screen on both platforms, and the artboard sits between them
> — the stage where a visual problem is cheapest to fix.

**Prepared:** 2026-09-14
**Subject:** `design/native-visual-lock-2026-09-13/` — 30 artboards
**Run this after:** the branch merges. **Run this before:** `slops-canvas-to-code`.

---

## Why taste can run now and could not before

`slops-taste` grades a palette and a type scale. Until 2026-09-13 there were **two** of each — the
registry named ten type roles with an 11px floor, the canvas ran twenty-two sizes down to 8px, and
the spacing scale invalidated every approved screen. Grading that would have graded a disagreement.

Both are now settled and machine-checked, so taste has a single target.

---

## The inputs, exactly as they stand

### Palette — dark only (D1), brass-led (D2), 15 tokens

| Token | Value | Note |
|---|---|---|
| `bg` | `#1F1F1D` | smoky grey — the shallow end, chosen against brand-colour convergence |
| `surface-1 / 2 / 3` | `#2A2A27` · `#343431` · `#3F3F3B` | |
| `border` | `#8A8272` | control boundary, 3:1 floor |
| `border-subtle` | `#3A3A36` | decorative only, never a control's edge |
| `text-primary / secondary / tertiary` | `#F5F0E8` · `#BDB5A9` · `#A79E90` | |
| `accent` | `#C4933B` | **the only brand-expression colour in chrome** |
| `accent-hover / muted / on-accent` | `#D8A648` · `#3A2A0A` · `#14140F` | |
| `platinum` | `#C7CBD1` | named exception — favourite and selection marks only |
| `fill-ring` | `rgba(245,240,232,.38)` | any fill under 3:1 against its ground carries it |
| `risk-high / medium` | `#7E1717` · `#4A1818` | fills, never ink |

**Withdrawn and not to be reintroduced by a taste pass:** `omen` verdigris, position hues,
data-source hues, the confidence gradient, demo accents. All carry form now, not colour.

**Exceptions, both deliberate:** provider identity (ESPN `#B21826`, Sleeper `#0F70B0`, Yahoo
`#410093`) and identity providers (Google four-colour, Discord `#5865F2`, Apple white/black).

### Type — Wix Madefor Display + Text, one ramp

```
10 · 11 · 12 · 13 · 14 · 15 · 16 · 18 · 20 · 22 · 24 · 27 · 32 · 48
```

Fifteen roles. Floor is 10 and it is an accessibility floor, not a preference.

### Spacing — base-2 modular

```
2 · 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 96
```

1–2px values are optical hairlines and are exempt, documented in `_shared.css`.

---

## What taste should actually be asked

Not "is this good" — that produces a rewrite. Four specific questions:

1. **Density.** Three screens must render with nothing below the fold (D11) and they currently do at
   0px slack. Is the density that buys this *tight* or *cramped*? A dial answer is useful; a
   "loosen everything" answer costs the constraint and must be rejected.
2. **Is one accent enough?** Brass carries every CTA, every selection, every active state across 30
   screens. Taste should say whether that reads as disciplined or as monotonous — and if
   monotonous, whether the fix is hierarchy (weight, surface level) rather than a second hue, since
   a second hue is a founder decision the lock already closed.
3. **The metal.** The engraved crests, the brass lip catching light, `--up` / `--dn` insets. Does
   that read as premium or as skeuomorphic residue at this density?
4. **Where the eye lands first**, per screen family. The scoreboard should win on Command Center and
   the call should win on Omen. If taste says something else wins, that is a real finding.

---

## Constraints the pass must not break

- **Dark only.** No light variant, no "try it lighter."
- **No new hue in chrome.** Brass-only is D2/D7 and founder-owned.
- **The floor is 10** and the 44pt touch floor stands.
- **Do not edit CSS in an artboard.** `_shared.css` is the source; run
  `node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13` after, and `--check`
  before committing.
- **D11 is a requirement, not an observation.** Re-measure the thirteen declared-fits artboards
  after any change; each must stay at 0px overflow.

---

## Verify after

```bash
node scripts/sync-canvas-css.mjs design/native-visual-lock-2026-09-13 --check
```

Then re-render the thirteen fits artboards and confirm `scrollHeight - clientHeight === 0`.
