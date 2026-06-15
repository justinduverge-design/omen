# Page Done

A page is done when its purpose is clear in 5 seconds, the primary action is obvious, every state renders, and it works at every viewport in both modes.

## Gates

1. Purpose clear in 5 seconds (someone unfamiliar can name what this page does)
2. Primary user action is obvious — one CTA in team accent (or `--color-accent` pre-team)
3. All states render: success / loading / empty / error / disconnected (if applicable)
4. Mobile viewport (iOS Safari) — no overflow, ≥44px touch targets, safe-area-insets respected
5. Desktop viewport — readable at standard widths, no break above 1440px
6. Navigation works forward and backward (back-link present where relevant)
7. Typography matches `Blueprints/specs/page-system.md` row for this route
8. Team accent (if accent-active per page-system.md) consumes `--color-team-accent` correctly
9. **Both light and dark mode verified** (screenshots linked in PR — non-negotiable)
10. No placeholder content visible to user (or clearly marked as internal/mock)
11. Page satisfies design-system v1 token rules (no raw hex literals in JSX/CSS)
12. `slops-ui-ux-audit` returns no P0
13. Page-system spec row for this route is satisfied (or spec updated as part of the change)

## AAA mapping

- **Accuracy:** 1, 2, 10
- **Accessibility:** 4, 5, 6
- **Aesthetic:** 7, 8, 9, 11, 12, 13
