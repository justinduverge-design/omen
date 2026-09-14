# Native canvas — taste pass, 2026-09-14

**Subject:** `design/native-visual-lock-2026-09-13/`, 30 artboards
**Requested as:** a `slops-taste` run.
**Actually run as:** a direct assessment. **`slops-taste` did not run, and this document does not
claim it did.**

---

## 0. Why the skill did not run — two separate reasons

**It is not installed.** `.claude/skills/slops-taste/` contains only the Slops wrapper `SKILL.md`.
None of the upstream variants (`design-taste-frontend`, `minimalist-ui`, `high-end-visual-design`)
are present. The wrapper names the install as a founder boundary:

```bash
npx skills add https://github.com/Leonxlnx/taste-skill --skill "design-taste-frontend"
```

**And it is the wrong tool for this job anyway.** `slops-taste` is a **generation** skill. Its
Outputs are *"Frontend code (via Codex) OR reference images"*, and its own **Does NOT** section says
it does not replace `slops-ui-ux-audit` because *"audit is separate from generation."*

`Blueprints/prompts/taste-run-brief-2026-09-14.md` asked it four **grading** questions. That brief
was wrong and is corrected in place.

### The routing gap this exposes

**Nothing in the library grades a native artboard.**

| Skill | Why it does not fit |
|---|---|
| `slops-taste` | generates; does not audit |
| `slops-ui-ux-audit` | **web only** — audits routes in web units |
| `slops-native-ui-audit` | needs a **built** screen on **both** platforms |
| `slops-native-screen-design` | composes an undesigned screen; these are designed |
| `slops-canvas-to-code` | compiles a finished artboard into a build contract; it checks *completeness*, not taste |

The artboard sits between "designed" and "built", and that is precisely the stage where a visual
problem is cheapest to fix. `skill-usage-ledger.md` already records five consecutive sessions
finding a routing gap of this shape. This is the sixth.

**Also stale:** the wrapper's Default Dials read *"placeholder until
slops-saloon/Brand/brand-system.md is authored."* That file exists and is authoritative. This is the
second stale Layer 0 skill found in two days — `slops-ux-copy` cites a retired copy anchor. Neither
is this repo's to edit.

---

## 1. One defect, found and fixed

**`.sline.out` was being styled by the Ledger's `.out` rule.** Class-name collision: an unrelated
component setting `text-transform: uppercase`, `letter-spacing: .12em`, weight 800.

The visible effect was **backwards emphasis** — the dropped player rendered as
`ROSCHON JOHNSON`, shouted and letterspaced, while `Jaylen Wright`, the player being *added*, stayed
title case. D5 fixes that row as add, then drop rendered one weight lighter. `.legrow .ar.out` in
Trade was silently hit by the same rule.

Fixed in `661a17b` by renaming the Ledger component to `.outcome`. `.out` meaning *outgoing* is
coherent on both `.sline` and `.legrow .ar`; the Ledger's use of it as a standalone component name
was the over-generic one.

**Method note worth keeping.** The source says title case. The *cascade* said otherwise. This was
found by rendering at a true 390×844 viewport and reading `getComputedStyle`, and a source-only
review cannot find this class of defect at all.

---

## 2. The four questions

### Q1 — Is the density that buys D11 tight, or cramped?

**Neither. There is ~20% headroom, and it is not slack — it is the margin that is already
insufficient.**

Measured at 390×844, content area 781pt:

| Screen | Content | Flexible gap | Gap as % |
|---|---|---|---|
| Command Center | 616 | 165 | 21% |
| Omen | 642 | 139 | 18% |

That reads like room to spare. It is not. See Q1b.

### Q1b — **FINDING: D11 fails on iPhone SE, which the build supports**

`IPHONEOS_DEPLOYMENT_TARGET = 17.0`. iOS 17 runs on **iPhone SE 2nd and 3rd generation**, both
375×667. Content area there is `667 − 64` (tab bar) = **604pt**.

| Screen | Content | SE available | Over by |
|---|---|---|---|
| Omen | 642 | 604 | **−39pt** |
| Command Center | 616 | 604 | **−13pt** |

**Both decision screens scroll on a supported device.** D11 says Command Center, Omen and the quiet
week must render with nothing below the fold; the canvas README scopes that to a *6.1-inch phone*,
and nothing anywhere states a minimum supported device.

So this is not a bug yet — **it is an undeclared scope**. Two ways to close it, and it is a founder
call:

1. **Declare 6.1" the floor.** D11 applies at 390×844 and above; SE scrolls and that is accepted.
   Cheapest, and defensible if SE is not a target audience device.
2. **Make D11 hold at 375×667.** Costs 39pt on Omen — roughly the ghost "Not this week" button or
   one evidence row — and 13pt on Command Center.

**Recommendation: option 1, written down.** Not because SE does not matter, but because the second
option pays a permanent content tax on every phone to satisfy the smallest one, and the screens are
already at their honest minimum. Whichever you pick, the registry should name the device D11 is
measured against — it currently names none, which is how this went unnoticed.

### Q1c — **FINDING: the build targets iPad and no artboard addresses it**

`TARGETED_DEVICE_FAMILY = "1,2"` — iPhone **and iPad**. Thirty artboards are 390×844. There is no
iPad layout, no split-view behaviour, and no statement that iPad is out of scope.

A 390-wide phone layout stretched to 1024pt is the "iPhone app on iPad" look that App Review
comments on. Either drop iPad from the family or scope an iPad pass; leaving it declared and
undrawn is the one option with no upside.

### Q2 — Is one accent enough across 30 screens?

**Yes, and the evidence is that it is doing more jobs than it should rather than too few.**

On Command Center alone, brass carries: the live dot, the confidence rule, two "→" links, the
`PENDING` status, the carousel dot, the active tab, and the switcher `+`. All small, all correct
individually.

The problem is not monotony, it is that **Command Center has no primary action at all.** Nothing on
it is a button. The screen is a briefing, and every brass element is equally weighted, so brass
reads as *"Omen touched this"* rather than *"do this."*

**Recommendation, and it is a hierarchy fix rather than a second hue** — which the lock already
closed: reserve the filled brass button for the one action a screen wants, and demote the rest to
brass *ink* on a neutral surface. Omen, Trade and the connect screens already do this correctly.
Command Center is the outlier.

### Q3 — Does the metal read premium, or skeuomorphic?

**Neither — it is under-expressed at this size.**

`--up` / `--dn` insets on the crests and the `--lip` brass edge on raised panels are all present and
all nearly invisible at 28–30pt. At a glance the crests read as plain rounded squares. There is no
skeuomorphic risk here; there is an unspent effect.

**Recommendation: leave it.** It costs nothing where it is and it is the kind of detail that reads
on a real display at real DPI far better than in a scaled screenshot. Revisit after
`slops-native-sim-drive` captures on device — judging metal from a browser screenshot is the wrong
instrument.

### Q4 — Where does the eye land first?

**Correct on both screens that matter.**

- **Command Center** → the scoreboard `64.8` at 27pt. Correct; it is the largest thing and the
  only thing at that size.
- **Omen** → the call headline at 24pt. Correct.

The leader/trailing split (27 vs 22) does real work: the gap is legible as *who is ahead* before
either number is read, which is what the split was for.

One weakness: on Command Center the **Ledger row is nearly invisible** — one 52pt card behind a
section header, with `PENDING` in brass being the only thing that catches. If the Ledger is the
trust surface, being the quietest element on the home screen is worth a deliberate decision rather
than an accident of it being last.

---

## 3. What this pass did not cover

- The 17 scrolling artboards were not checked for **horizontal** overflow.
- **Dynamic Type** at any size. Scoreboard numerals break first and behaviour is undefined.
- **Android** rendering. Everything here is a browser proxy for SwiftUI/Compose and is not a
  substitute for either.
- Motion. Only `@keyframes grow` and the skeleton pulse exist, and both are behind
  `prefers-reduced-motion`.

---

## 4. Decisions this pass needs from the founder

1. **The device D11 is measured against.** 6.1" floor (recommended), or make it hold at 375×667.
2. **iPad** — drop it from `TARGETED_DEVICE_FAMILY`, or scope an iPad pass.
3. **Command Center's primary action** — does it get one, or is it deliberately a briefing with no
   button?
4. **Whether to install upstream `taste-skill`** at all, given it generates rather than audits. The
   gap it would not fill is the artboard-grading one in §0.
