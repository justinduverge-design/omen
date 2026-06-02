# Account Components

Tier 2 landing zone for Account-page UI that is not backend-owned.

Planned first use:
- Subscription pricing display using `GET /api/stripe/prices`.
- Shared account panels that should not stay embedded in `frontend/src/pages/Account.jsx`.

Do not put secrets, Stripe live actions, or Supabase migrations here.
