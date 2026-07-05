/**
 * routes/ledger.cjs
 *
 * Minimal stub for driver_protected_route.cjs against /ledger
 * (frontend/src/pages/Ledger.jsx, which mounts MoveHistory.jsx →
 * GET /api/moves). Not full state coverage — add more states here as
 * future phases need them.
 */

"use strict";

module.exports = {
  id: "ledger",
  path: "/ledger",
  states: [
    {
      id: "default",
      apiMocks: [
        {
          pattern: "**/api/moves*",
          status: 200,
          body: { contract_version: "moves-history.v1", moves: [] },
        },
      ],
      assertions: [
        { selector: 'img[alt="Omen"]', label: "Header chrome renders (not bounced to /login or /onboarding)" },
      ],
    },
  ],
};
