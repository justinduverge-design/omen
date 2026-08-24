# Design Contract Done (cross-cutting)

**Status:** PROPOSAL — awaiting founder ratification (authored 2026-08-24)
**Applies to:** a screen or component **contract** — Figma frames plus a spec — where no implementation exists yet and there is nothing running to photograph.

## Why this file exists

`design-done.md` assumes a running UI. Its gates ask for both light and dark screenshots, a `slops-ui-ux-audit` with no P0, `prefers-reduced-motion` behaviour, 150ms transitions, and no raw hex in JSX/CSS. **A screen contract can satisfy none of them, because there is no JSX, no CSS, and no build to render.**

The result today is that every contract task annotates its way around the same two gates and files the rest as "carried as written requirements". That has happened on `M4-Help-Support`, on the 2026-08-16 `M1` contract pass, and again on the 2026-08-24 `M1-Screen-League` / `M1-Screen-Trade` revision. **Three tasks working around the same gate is a gate problem, not three task problems.**

This file is not a lower bar. It is the same bar, asked at the stage the work is actually at — and it adds the one thing `design-done.md` cannot ask for, because at contract stage it is the only thing that matters: **is every claim on this screen backed by something that exists?**

## Gates

### Contract completeness

1. **Primary state plus its most important alternate state** exist for every flow, on **both** iOS and Android.
2. **Every visible element maps** to an approved component or an explicit, labelled proposal. No production component is invented here.
3. **Platform differences are intentional and written down** — navigation, sheet, control, and feedback grammar differ by design; hierarchy, tokens, and user-facing sentences do not.
4. **No invented or renamed semantic tokens.** Annotation chrome (status badges, superseded notes) is not a token and is exempt.
5. **No competitor layout, asset, screenshot, or copy** anywhere in the file.

### Truth — the gate `design-done.md` has no equivalent for

6. **Every capability the screen implies is backed by a shipped route, or is labelled as not yet existing.** A contract may not draw a populated section fed by a feed nobody has built.
7. **Where a section's data is partial, the contract says which half is missing** and names the server field that will carry that fact.
8. **Provider asymmetry is drawn, not averaged.** If one provider cannot supply a section, the contract shows that state rather than implying parity.
9. **Off-season, empty, error, stale, demo, and disconnected states are contracted**, and each is distinguishable in wording and structure — never by colour alone.

### Accessibility, asked as a requirement rather than a measurement

10. **Touch-target, reading-order, and dynamic-type intent are stated per screen.** They cannot be *verified* here; they are the acceptance criteria the implementation slice inherits.
11. **No signal carries meaning by colour alone** — stated on the contract, verified at implementation.

### Evidence and status

12. **Every frame carries a dated approval badge** and says plainly that it is a proposal. Nothing marks itself approved; ratification is founder-only.
13. **A superseded frame is annotated, never deleted** — the rejection and its remedy both stay auditable.
14. **A `06 — QA & Evidence` record exists** for the flow: frames, contract links, states, intentional platform differences, open questions, approval status.
15. **What is unproven is written down** — specifically, any provider capability asserted without a live call, and any calculation proven only against fixtures.

## Explicitly NOT gated here — and where each lands instead

These are deferred to the implementation slice, and the contract task must **name the slice that inherits them** rather than leaving them unowned:

| `design-done.md` gate | Why it cannot apply at contract stage | Inherited by |
|---|---|---|
| Light and dark screenshots | No build exists to render | the implementation slice |
| `slops-ui-ux-audit` no P0 | It audits web routes; there is no route | the implementation slice |
| No raw hex in JSX/CSS | There is no JSX or CSS | the implementation slice |
| 150ms transitions, `prefers-reduced-motion` | No runtime | the implementation slice |
| Focus rings visible across modes | Contracted as intent; verifiable only when focusable | the implementation slice |

**Rendered Figma frame captures are required** in place of app screenshots — they prove the contract renders legibly and that no text is clipped, which is the most a contract can honestly claim.

## AAA mapping

- **Accuracy:** 6, 7, 8, 9, 12, 13, 15 — the bulk of this file, because at contract stage the dominant failure is claiming a capability that does not exist.
- **Accessibility:** 10, 11
- **Aesthetic:** 1, 2, 3, 4, 5

## Relationship to the other Done files

- Run **in addition to** the primary type, exactly like `design-done.md`.
- A task that ships a contract **and** an implementation runs `design-done.md`, not this file.
- A task that ships a contract **and** backend (the 2026-08-24 Trade batch) runs this file **plus** `feature-done.md` for the backend half.
- When the implementation slice later lands, it runs `design-done.md` in full. **This file never discharges those gates — it records who owes them.**
