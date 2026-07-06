/**
 * routes/football.cjs
 *
 * Minimal stub for driver_protected_route.cjs against /football
 * (frontend/src/pages/Football.jsx). Proves the auth bypass + onboarding
 * seed generalize to a page with a different mount-time endpoint
 * (/api/dashboard/summary) than /waiver. Not full state coverage —
 * add more states here as future phases need them.
 */

"use strict";

module.exports = {
  id: "football",
  path: "/football",
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
