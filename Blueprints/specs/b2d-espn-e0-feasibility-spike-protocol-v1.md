# B2-D · ESPN E0 Feasibility Spike — Protocol v1

**Status:** Ready to run. Founder-executed. No code, no implementation.
**Date:** 2026-07-27
**Parent:** `Blueprints/specs/b2d-live-waiver-pool-sleeper-espn-v1.md` § Phase E
**Gate:** E0 returns **GO** before E1 may begin. Per the parent spec: *"Do not begin E1 before E0 returns go."*
**Runtime:** ~10 minutes

## Why this is founder-executed

E0 requires an authenticated ESPN session. Agents do not handle `espn_s2` or `SWID` values — `Direction/facts-of-record.md` #6 makes that absolute, and it applies to this document and to any notes it produces.

**Method 1 below never exposes a cookie value at all.** The browser attaches the session automatically; nothing is copied, pasted, or typed anywhere. Use it. Method 2 exists only as a fallback and requires more care.

## The question E0 answers

> Does ESPN's `kona_player_info` view plus an `x-fantasy-filter` header return a usable free-agent pool for an authenticated league, within the existing cookie flow, surviving ESPN's redirect behavior?

Not "can we build it." Only "does the data exist and in what shape."

## What is already known (verified in code, 2026-07-27)

From `src/adapters/espn.js`:

| Fact | Line | Meaning for the spike |
|---|---|---|
| Reads host is `lm-api-reads.fantasy.espn.com` | 340 | `fantasy.espn.com/apis/v3/...` redirects instead of serving JSON, even with a valid session. Confirmed live 2026-07-07. Use the reads host. |
| `x-fantasy-platform: espn-fantasy-web` + `x-fantasy-source: kona` are **required** | 268 | Omitting either causes a redirect, not a 401. Already sent by `makeEspnHeaders()`. |
| Path shape `/apis/v3/games/ffl/seasons/{season}/segments/0/leagues/{leagueId}?view=...` | 346 | The spike changes only the `view` and adds one header. |
| Views currently requested: `mTeam`, `mSettings`, `mRoster`, `mMatchup` | 383–515 | `kona_player_info` is **not** among them. |
| `makeEspnHeaders()` has no `x-fantasy-filter` support | 268 | New request *shape*, not a new parameter. This is the E1 work. |
| Request logging is `hostname + path.split("?")[0]` | 306 | Query strings are not logged and cookies are never logged. The filter travels as a header, so it cannot leak via URL either. Good posture — preserve it in E1. |

**Everything below this line is inferred from ESPN's public frontend behavior and is unproven.** That is the point of the spike.

## Method 1 — browser console (preferred, no cookie handling)

1. Sign in to ESPN Fantasy in a normal browser tab and open your league.
2. Note your **league ID** from the URL (`leagueId=` param) and the **season year**.
3. Open DevTools → Console, **on the `fantasy.espn.com` tab** (this matters — the cookie is attached by origin).
4. Paste the block below, replacing only `LEAGUE_ID` and `SEASON`. Nothing else needs editing.

```javascript
// ESPN E0 spike — read-only. Sends no data anywhere; prints shape only.
const LEAGUE_ID = "REPLACE_ME";
const SEASON = 2026;

const filter = {
  players: {
    filterStatus: { value: ["FREEAGENT", "WAIVERS"] },
    filterSlotIds: { value: [0, 2, 4, 6, 16, 17] }, // QB RB WR TE DST K
    limit: 50,
    offset: 0,
    sortPercOwned: { sortAsc: false, sortPriority: 1 },
  },
};

const t0 = performance.now();
const res = await fetch(
  `https://lm-api-reads.fantasy.espn.com/apis/v3/games/ffl/seasons/${SEASON}/segments/0/leagues/${LEAGUE_ID}?view=kona_player_info`,
  {
    credentials: "include",
    headers: {
      "x-fantasy-platform": "espn-fantasy-web",
      "x-fantasy-source": "kona",
      "x-fantasy-filter": JSON.stringify(filter),
    },
  }
);
const ms = Math.round(performance.now() - t0);
console.log("HTTP", res.status, res.type, `${ms}ms`);
console.log("x-total-count header:", res.headers.get("x-total-count"));

const data = await res.json();
const players = data.players || [];
console.log("players returned:", players.length);
console.log("sample shape:", JSON.stringify(players[0], null, 1).slice(0, 1500));
console.log(
  "projection field present on sample:",
  players.slice(0, 20).map(p => ({
    name: p.player?.fullName,
    slots: p.player?.eligibleSlots,
    injury: p.player?.injuryStatus,
    stats: (p.player?.stats || []).map(s => ({ src: s.statSourceId, split: s.statSplitTypeId, period: s.scoringPeriodId, total: s.appliedTotal })),
  }))
);
```

5. If it prints `HTTP 200` and a non-empty `players` array, that is a **GO** signal. Record the observations below.
6. Re-run once with `limit: 500` and once with `offset: 50` to answer the pagination question.

**If it fails:** record the exact status and `res.type`. `type: "opaqueredirect"` means the redirect problem from 2026-07-07 also affects this view — that is a meaningful **NO-GO** finding, not a wasted run.

## Method 2 — fallback only

If the console approach is blocked, the same request can be made with `curl` using your own cookies. If you do this:

- Run it in a shell whose history you will clear, or prefix the command with a space.
- **Do not paste the command, the cookie values, or unredacted output into this repo, a PR, an issue, or a chat with any agent.**
- Report only the observations table below.

Method 1 is strongly preferred precisely because it makes this paragraph unnecessary.

## Observations to record

Fill this in and hand it back. **No cookie values, no league ID, no team or user names.**

| # | Observation | Result |
|---|---|---|
| 1 | HTTP status | |
| 2 | `res.type` (`basic` / `cors` / `opaqueredirect`) | |
| 3 | Round-trip time, ms | |
| 4 | `players[]` length at `limit: 50` | |
| 5 | `x-total-count` header present? Value? | |
| 6 | Does `limit: 500` return more than 50? | |
| 7 | Does `offset: 50` return a *different* set? | |
| 8 | Is `player.eligibleSlots` present? | |
| 9 | Is `player.injuryStatus` present? | |
| 10 | Is a usable projection present in `player.stats[]`? Which `statSourceId` / `statSplitTypeId`? | |
| 11 | Any rate-limit response on 3 rapid re-runs? | |
| 12 | Does `filterStatus` actually exclude rostered players? Spot-check 3 known-rostered names are **absent**. | |

**Observation 12 is the one that matters most.** It is the exact failure the Sleeper S3 run could not test — a `pre_draft` league made roster subtraction unprovable there. On ESPN, `filterStatus` claims to do the subtraction server-side. If it does, ESPN skips the whole class of bug S1 had to defend against. If it silently doesn't, E1 must subtract client-side like Sleeper does.

## Verdict template

```
E0 VERDICT: GO | NO-GO | PARTIAL
Date run:
Season / league type (redball, PPR, size — no id):
Free-agent pool obtainable within existing cookie flow: yes / no
Redirect behavior survived: yes / no
Pagination required: yes / no — page size observed:
Server-side roster exclusion confirmed: yes / no / unclear
Projections usable without a second request: yes / no
Rate-limit behavior observed:
Blocking unknowns for E1:
```

## Decision rules

- **GO** — observations 1, 2, 4, and 12 all clean → E1 is unblocked. E1's first task is adding `x-fantasy-filter` support to `doEspnRequest` / `makeEspnHeaders`, preserving the no-query-logging posture.
- **PARTIAL** — pool returns but projections are missing or exclusion is unclear → E1 is unblocked with an explicit extra step recorded (second projection request, or client-side subtraction mirroring Sleeper S1).
- **NO-GO** — redirect or auth failure → ESPN waiver stays **unverified** in the capability matrix. That is an honest, publishable row, not a failure of the task.

## Non-goals

- No implementation. E0 produces a verdict, not code.
- No cookie handling by any agent, in any artifact, at any point.
- No claim that ESPN waiver is live until E1–E3 complete.
- No new dependency, paid source, or cloud spend.

## Capability matrix row this produces

| Provider | Waiver status | Gate |
|---|---|---|
| Sleeper | built through S2; S3 roster-subtraction proof pending a drafted league | none |
| Yahoo | fixture-verified (PR #211) | Yahoo API reapproval — external |
| ESPN | **← this spike fills this cell** | E0 verdict |
