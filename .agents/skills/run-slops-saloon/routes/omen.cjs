/**
 * routes/omen.cjs
 *
 * Minimal stub for driver_protected_route.cjs against the REAL protected
 * /omen route (frontend/src/pages/OmenPage.jsx, GET /api/dashboard/summary
 * gate + POST /api/omen/mvp-move). This is distinct from driver_omen.cjs,
 * which tests the unauthenticated /dev/omen dev-harness route instead —
 * this config exercises the real ProtectedRoute-gated page. Not full
 * state coverage — add more states here as future phases need them.
 */

"use strict";

module.exports = {
  id: "omen",
  path: "/omen",
  states: [
    {
      id: "default",
      apiMocks: [
        {
          pattern: "**/api/dashboard/summary*",
          status: 200,
          body: {
            user: { favorite_team: null },
            subscription: { active: false },
            tools: { omen_of_the_week: { status: "off_season", available: false } },
          },
        },
      ],
      assertions: [
        { selector: 'img[alt="Omen"]', label: "Header chrome renders (not bounced to /login or /onboarding)" },
      ],
    },
  ],
};
