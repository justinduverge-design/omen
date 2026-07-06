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
      reason: 'Buy before the usage trend gets priced in. New OC, still undervalued.',
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
      reason: 'A true TE1 in year two — buy before the league catches on.',
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
      reason: 'Injury discount, not injury risk. Target share in a top offense.',
    },
  ],
};
