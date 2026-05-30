/**
 * tradePulse.js — Mock buy-low targets for Trade Analyzer sidebar (Phase 1)
 *
 * Phase 2 replacement: GET /api/trade/pulse (see frontend-to-backend.md Request 20)
 * Roster approximation for 2026 season. Update each preseason.
 *
 * is_mock: true — must always be labeled in the UI. Never present as live advice.
 */

export const TRADE_PULSE = {
  is_mock: true,
  note: 'Mock targets — updated each preseason. Not real-time data.',
  buy_low: [
    {
      id: 'bl-tyjae-spears',
      name: 'Tyjae Spears',
      position: 'RB',
      team: 'TEN',
      reason: 'New OC, undervalued upside. Buy before anyone notices the usage trend.',
    },
    {
      id: 'bl-zach-charbonnet',
      name: 'Zach Charbonnet',
      position: 'RB',
      team: 'SEA',
      reason: 'Clear lead-back path. Handcuff price, starter value.',
    },
    {
      id: 'bl-sam-laporta',
      name: 'Sam LaPorta',
      position: 'TE',
      team: 'DET',
      reason: 'Year 2 TE1 in a run-first offense that loves the middle of the field.',
    },
    {
      id: 'bl-rico-dowdle',
      name: 'Rico Dowdle',
      position: 'RB',
      team: 'DAL',
      reason: 'Bell-cow role in Dallas. ADP still reflects Elliott-era uncertainty.',
    },
    {
      id: 'bl-tank-dell',
      name: 'Tank Dell',
      position: 'WR',
      team: 'HOU',
      reason: 'Coming off injury. Target share in a top offense at a discount.',
    },
  ],
};
