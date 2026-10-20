# League components

`LeagueStandings.jsx`: the standings table, used by `pages/Standings.jsx` and `pages/Football.jsx`.

- Data: `GET /api/league/standings` (`league-standings.v1`). The same shape comes back for ESPN, Yahoo and Sleeper.
- It must handle loading, success, disconnected/reconnect-required, empty and error states.
