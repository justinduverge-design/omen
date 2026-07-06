/**
 * routes/waiver.cjs
 *
 * Route config for driver_protected_route.cjs — the /waiver page
 * (frontend/src/pages/WaiverWire.jsx, activated in Phase 2.18).
 *
 * Copy/selectors below are taken directly from WaiverWire.jsx, not guessed:
 *   - submit button text: "Get Picks" (WaiverWire.jsx handleSubmit button)
 *   - result heading: "Top Pickups — Week {week}"
 *   - Yahoo-expired copy: "Yahoo session expired" (TokenExpiredState),
 *     triggered when the mocked response message contains
 *     "yahoo token expired" (case-insensitive substring match, see
 *     WaiverWire.jsx handleSubmit's ApiError branch).
 */

"use strict";

module.exports = {
  id: "waiver",
  path: "/waiver",
  states: [
    {
      id: "picks_loaded",
      apiMocks: [
        {
          pattern: "**/api/optimizer/waiver*",
          status: 200,
          body: {
            week: 5,
            platform: "sleeper",
            pool_size: 42,
            recommendations: [
              {
                name: "QA Mock Player",
                position: "WR",
                team: "SEA",
                projected_points: 11.4,
                vorp_delta: 3.2,
                reason: "Mock reason text for driver verification.",
              },
            ],
          },
        },
      ],
      interactions: [
        { click: "button:has-text(\"Get Picks\")" },
        { waitForTimeout: 600 },
      ],
      assertions: [
        { text: "Top Pickups", label: "results heading renders" },
        { text: "QA Mock Player", label: "mock pickup player name" },
        { text: "VORP", label: "VORP metric label" },
      ],
    },
    {
      id: "token_expired",
      apiMocks: [
        {
          pattern: "**/api/optimizer/waiver*",
          status: 401,
          body: { message: "Yahoo token expired — please reconnect." },
        },
      ],
      interactions: [
        { click: "button:has-text(\"Get Picks\")" },
        { waitForTimeout: 400 },
      ],
      assertions: [
        { text: "Yahoo session expired", label: "token-expired state renders" },
        { text: "Reconnect Yahoo", label: "reconnect CTA present" },
      ],
    },
  ],
};
