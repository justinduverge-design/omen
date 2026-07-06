/**
 * routes/standings.cjs
 *
 * Minimal stub for driver_protected_route.cjs against /standings
 * (frontend/src/pages/Standings.jsx, GET /api/league/standings).
 * Not full state coverage — add more states here as future phases need them.
 */

"use strict";

module.exports = {
  id: "standings",
  path: "/standings",
  states: [
    {
      id: "default",
      apiMocks: [
        {
          pattern: "**/api/league/standings*",
          status: 200,
          body: { contract_version: "league-standings.v1", standings: [] },
        },
      ],
      assertions: [
        { selector: 'img[alt="Omen"]', label: "Header chrome renders (not bounced to /login or /onboarding)" },
      ],
    },
  ],
};
