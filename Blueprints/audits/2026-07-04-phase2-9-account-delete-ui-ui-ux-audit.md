# Phase 2.9 Account Delete UI - UI/UX Audit

Date: 2026-07-04
Auditor: Codex self-administered `slops-ui-ux-audit`
Verdict: No P0/P1 found; authenticated visual screenshot still owed

## Accuracy

- The destructive surface is under `/account` -> Privacy, matching where a signed-in user expects account data controls.
- The copy says "Omen data" and names the Omen-stored categories affected.
- The dialog explicitly says provider-held and sign-in-provider data are not changed.
- The required phrase is shown once, uses `DELETE MY OMEN DATA`, and submit remains disabled until an exact match.
- Success notice on `/login?deleted=true` confirms completion without overexplaining.

## Accessibility

- Dialog uses `role="dialog"`, `aria-modal`, `aria-labelledby`, and `aria-describedby`.
- Initial focus moves to the confirmation input.
- Existing `useFocusTrap()` keeps keyboard focus inside the modal.
- Escape closes only when the delete request is not submitting.
- Buttons and input meet the 44px minimum target rule.
- Text input uses `text-base`, avoiding mobile Safari zoom.
- Destructive button uses white text on `--color-risk-high` for light/dark contrast.

## Aesthetic Integrity

- Section layout matches Account page density: no nested page cards, no hero treatment, no decorative effects.
- Team accent remains for focus rings and regular settings affordances; risk token carries the destructive action.
- State transitions use existing 150ms timing classes.
- No new raw hex literals were added in JSX/CSS. The only non-token color class added is Tailwind `text-white` for destructive-button contrast.

## Browser Evidence

- Local Vite + Chrome, 390px viewport, `/login?deleted=true`: completion notice rendered, no horizontal overflow.
- Local Vite + Chrome, `/account`, using a throwaway browser-local Supabase session plus stubbed local `/api` responses:
  - `output/playwright/phase2-9-account-delete-ui/account-privacy-section-desktop.png`
  - `output/playwright/phase2-9-account-delete-ui/account-delete-modal-desktop.png`
  - `output/playwright/phase2-9-account-delete-ui/account-delete-modal-mobile.png`
- Desktop and mobile modal captures show the dialog open, the confirmation field focused, `DELETE MY OMEN DATA` typed, the destructive submit enabled, and no horizontal overflow.

## Residual Risks

- A future sanctioned protected-route screenshot fixture is still useful so visual proof does not depend on ad hoc browser-local session seeding.
- The Account page still contains the pre-launch Omen Pro card; that is a separate Phase 2.15 backlog item.
