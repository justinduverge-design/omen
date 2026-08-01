# B2-D · ESPN Observation 12 — Resolution Protocol

**Status:** Ready to run. Founder-executed, agent-authored.
**Date:** 2026-08-01
**Parent:** `Blueprints/specs/b2d-espn-e0-verdict-v1.md` — verdict PARTIAL, observation 12 UNRESOLVED
**Protocol basis:** `Blueprints/specs/b2d-espn-e0-feasibility-spike-protocol-v1.md` → Method 1
**Unblocked by:** founder joined a **drafted** ESPN league, 2026-08-01

## What this closes

E0 left exactly one observation open:

> **12 · Does `filterStatus` exclude rostered players? — UNRESOLVED**

It was unresolvable, not unresolved by oversight. All three ESPN leagues available on 2026-07-27 were undrafted, with **0 rostered players league-wide**. With nothing rostered, a filter that excludes rostered players and a filter that excludes nothing return identical output. The run could not distinguish them.

A drafted league can. That is the only thing that changed, and it is sufficient.

## Why this is verification, not a blocker

E0 already established the safe design: **every returned entry carries its own `onTeamId` and `status`.** E1 therefore does not have to trust `filterStatus` — it excludes any entry with `onTeamId !== 0` directly.

The E0 verdict's own ruling stands:

> E1 must apply the `onTeamId` check regardless of what observation 12 eventually shows. If `filterStatus` is reliable, the check is free. If it is not, the check is the thing that prevents offering a player another team already owns.

So this run does not gate E1 implementation. It answers whether ESPN's server-side filter can be *trusted*, which decides how much defensive work E1 must carry and whether a future optimization can lean on the filter alone.

## Safety — unchanged from E0

- **No `espn_s2` or `SWID` value is read, copied, typed, printed, logged, stored, or transmitted.** The browser attaches the session by origin. This is the entire reason Method 1 exists.
- **Do not paste cookie values into any agent session, issue, PR, or file.** If an agent ever asks for them, that is a defect — refuse.
- Read-only `GET`s against the founder's own account. No writes, no roster changes, no transactions.
- The snippet prints **counts and booleans only** — no league id, no team name, no username. Its output is safe to paste back verbatim.

## Run it

1. Sign in to ESPN Fantasy in a normal browser tab and open the **drafted** league.
2. Take the **league ID** from the URL (`leagueId=` param) and the season year.
3. Open DevTools → Console **on the `fantasy.espn.com` tab** — the cookie is attached by origin, so the tab matters.
4. Paste the block below, replacing only `LEAGUE_ID` and `SEASON`.

```javascript
// B2-D ESPN observation 12 — read-only. Sends nothing anywhere.
// Prints counts and booleans only: no league id, team name, or username.
const LEAGUE_ID = "REPLACE_ME";
const SEASON = 2026;

const BASE = `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}`;
const HEADERS = {
  "x-fantasy-platform": "espn-fantasy-web",
  "x-fantasy-source": "kona",
};

// --- 1. Confirm the league is actually drafted -------------------------
const rosterRes = await fetch(`${BASE}?view=mRoster&view=mTeam`, {
  credentials: "include",
  headers: HEADERS,
});
const rosterData = await rosterRes.json();
const teams = rosterData.teams || [];
const rosteredIds = new Set();
for (const t of teams) {
  for (const e of (t.roster?.entries || [])) {
    if (e.playerId != null) rosteredIds.add(String(e.playerId));
  }
}
console.log("teams:", teams.length);
console.log("teams with a non-empty roster:", teams.filter(t => (t.roster?.entries || []).length > 0).length);
console.log("distinct rostered player ids:", rosteredIds.size);
if (rosteredIds.size === 0) {
  console.log("STOP — this league is undrafted. Observation 12 cannot be resolved here.");
} else {

// --- 2. Pull the free-agent pool exactly as E1 will --------------------
const filter = {
  players: {
    filterStatus: { value: ["FREEAGENT", "WAIVERS"] },
    filterSlotIds: { value: [0, 2, 4, 6, 16, 17] }, // QB RB WR TE DST K
    limit: 500,
    offset: 0,
    sortPercOwned: { sortAsc: false, sortPriority: 1 },
  },
};
const t0 = performance.now();
const poolRes = await fetch(`${BASE}?view=kona_player_info`, {
  credentials: "include",
  headers: { ...HEADERS, "x-fantasy-filter": JSON.stringify(filter) },
});
const ms = Math.round(performance.now() - t0);
const poolData = await poolRes.json();
const pool = poolData.players || [];

console.log("HTTP", poolRes.status, poolRes.type, `${ms}ms`);
console.log("pool entries returned:", pool.length);

// --- 3. THE ANSWER ------------------------------------------------------
const nonZeroOnTeam = pool.filter(p => Number(p.onTeamId) !== 0);
const leaked = pool.filter(p => rosteredIds.has(String(p.id)));
const statuses = [...new Set(pool.map(p => p.status))];

console.log("--- OBSERVATION 12 ---");
console.log("entries with onTeamId !== 0 :", nonZeroOnTeam.length);
console.log("entries also on a real roster:", leaked.length);
console.log("distinct status values in pool:", statuses);
console.log(
  leaked.length === 0 && nonZeroOnTeam.length === 0
    ? "RESULT: filterStatus IS reliable on a drafted league (0 rostered players leaked)."
    : "RESULT: filterStatus is NOT reliable — the onTeamId guard is load-bearing."
);

// --- 4. Cross-check the two ownership signals agree ---------------------
const disagree = pool.filter(
  p => (Number(p.onTeamId) !== 0) !== (p.status !== "FREEAGENT" && p.status !== "WAIVERS")
);
console.log("entries where onTeamId and status disagree:", disagree.length);
console.log("percentOwned range:", pool.length
  ? `${Math.min(...pool.map(p => p.player?.ownership?.percentOwned ?? 0)).toFixed(1)} – ${Math.max(...pool.map(p => p.player?.ownership?.percentOwned ?? 0)).toFixed(1)}`
  : "n/a");
}
```

## How to read the result

| Output | Meaning | Effect on E1 |
|---|---|---|
| `entries also on a real roster: 0` **and** `onTeamId !== 0 : 0` | `filterStatus` is reliable | Keep the `onTeamId` guard anyway — it is free. Observation 12 closes **clean**. |
| Either count `> 0` | `filterStatus` leaks rostered players | The `onTeamId` guard is **load-bearing**. Observation 12 closes **as a real defect**, and E1 must never rely on the filter alone. |
| `onTeamId and status disagree: > 0` | The two signals are not equivalent | Record which is authoritative. Prefer `onTeamId` — it is numeric and league-scoped. |
| `percentOwned range` well below the 97.3–99.8 E0 saw | Consistent with a genuinely drafted league | Corroborates step 1 rather than proving anything on its own. |

A `percentOwned` range still up near 97–100 on a league that step 1 says *is* drafted would be surprising and worth flagging rather than explaining away.

## After the run

Paste the console output back. It contains no identifying data by construction. It will be recorded as an addendum to `b2d-espn-e0-verdict-v1.md`, the capability matrix row updated, and the result folded into the E1 task record that `planning-pass` still needs to mint (proposed key `B2-D-E1`, currently held in `Direction/agent_inbox.md` planning intake).

**This run does not authorize E1 implementation to start or stop** — E0 already unblocked it. It decides how much the implementation must defend itself.
