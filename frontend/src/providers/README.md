# Frontend Providers

Tier 2 landing zone for app-wide providers.

Planned first use:
- Team theme hydration from `GET /api/dashboard/summary.user.favorite_team`.
- LocalStorage remains the fallback for unauthenticated/static preview behavior.

Keep provider code frontend-only. Backend contract changes belong in `Blueprints/handoffs/frontend-to-backend.md`.
