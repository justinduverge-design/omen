# Trade components

An empty home for Trade Analyzer pieces pulled out of `pages/TradeAnalyzer.jsx` and `pages/TradeShare.jsx`. Put a
piece here once a second page needs it.

- Data: `POST /api/trade/compare` (`trade-compare.v2`), `GET /api/trade/find`, `GET /api/trade/roster`,
  `GET /api/players/search`, `/api/trade/share/*`.
- The user picks players. Projections, status and value are always Omen's, never typed in by the user.
