# Moves (Ledger) components

`MoveHistory.jsx`: the list of Omen's past calls and how they turned out, used by `pages/Ledger.jsx` and
`pages/Football.jsx`.

- Data: `GET /api/moves` (`moves-history.v1`). One call's receipt: `GET /api/moves/:id`.
- Show the server's `summary` as-is. Never recompute win/loss totals in the browser, because the server applies
  the grading rules (contested calls only, the league's own scoring).
- States: loading, success, empty and error.
