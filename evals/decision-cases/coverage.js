"use strict";

// Coverage cases: small invented leagues (no provider data, safe for the public repo) that pin the judgements a
// sharp manager makes, in both directions. Each builds a snapshot in the same shape the capture writes.

const ONE_QB = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "K", "DEF", "BN", "BN", "BN", "BN", "BN"];
const SUPERFLEX = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "SUPER_FLEX", "K", "DEF", "BN", "BN", "BN", "BN"];
const WEEKS = [7, 8, 9, 10];

function p(name, position, weekly, extra = {}) {
  const byWeek = Array.isArray(weekly) ? weekly : WEEKS.map(() => weekly);
  return {
    player_id: name,
    name,
    position,
    eligible_positions: [position],
    projected_points_by_week: Object.fromEntries(WEEKS.map((w, i) => [w, byWeek[i]])),
    ...extra,
  };
}

function core() {
  return [
    p("RB One", "RB", 16), p("RB Two", "RB", 12), p("RB Three", "RB", 8),
    p("WR One", "WR", 17), p("WR Two", "WR", 13), p("WR Three", "WR", 9),
    p("TE One", "TE", 9), p("K One", "K", 8), p("DEF One", "DEF", 7),
  ];
}

function snapshot({ slots = ONE_QB, own, others = [], pool = [] }) {
  return {
    league: { roster_positions: slots },
    weeks: WEEKS,
    teams: [{ team_id: "1", team_name: "You", own: true, players: own }, ...others.map((players, i) => ({ team_id: String(i + 2), team_name: `Team ${String.fromCharCode(65 + i)}`, own: false, players }))],
    pool,
  };
}

const cases = [
  {
    id: "one-qb-third-qb-is-worthless",
    why: "Two startable QBs in a one-QB league: another QB adds nothing to the lineup.",
    snapshot: snapshot({ own: [p("QB Starter", "QB", 20), p("QB Backup", "QB", 16), ...core()], pool: [p("QB Wire", "QB", 18, { acquisition: "free_agent" })] }),
    move: { type: "waiver", add: "QB Wire", drop: "WR Three" },
    expect: { owner_change_at_most: 0 },
  },
  {
    id: "bench-qb-already-better",
    why: "Codex's case: the 16-point starter is set, a 24-point QB sits on the bench, a 20-point QB is on the wire. The best lineup is 24 before and after.",
    snapshot: snapshot({ own: [p("QB Set", "QB", 16, { starter_now: true }), p("QB Bench", "QB", 24), ...core()], pool: [p("QB Wire", "QB", 20, { acquisition: "free_agent" })] }),
    move: { type: "waiver", add: "QB Wire", drop: "WR Three" },
    expect: { owner_change_at_most: 0 },
  },
  {
    id: "qb-out-for-season-needs-a-qb",
    why: "The only QB is out for the season: adding a startable QB is the right move.",
    snapshot: snapshot({ own: [p("QB Hurt", "QB", 0, { injury_status: "IR" }), ...core()], pool: [p("QB Wire", "QB", 15, { acquisition: "free_agent" })] }),
    move: { type: "waiver", add: "QB Wire", drop: "WR Three" },
    expect: { owner_change_at_least: 40 },
  },
  {
    id: "qb-bye-without-backup",
    why: "The only QB is on bye in week 9: a backup is worth that week's points.",
    snapshot: snapshot({ own: [p("QB Starter", "QB", [20, 20, 0, 20]), ...core()], pool: [p("QB Wire", "QB", 14, { acquisition: "free_agent" })] }),
    move: { type: "waiver", add: "QB Wire", drop: "WR Three" },
    expect: { owner_change_at_least: 10 },
  },
  {
    id: "same-bye-adds-nothing-that-week",
    why: "A backup who shares the starter's bye covers nothing.",
    snapshot: snapshot({ own: [p("QB Starter", "QB", [20, 20, 0, 20]), ...core()], pool: [p("QB Same Bye", "QB", [14, 14, 0, 14], { acquisition: "free_agent" })] }),
    move: { type: "waiver", add: "QB Same Bye", drop: "WR Three" },
    expect: { owner_change_at_most: 0 },
  },
  {
    id: "superflex-second-qb-starts",
    why: "In superflex a second startable QB beats a flex receiver.",
    snapshot: snapshot({ slots: SUPERFLEX, own: [p("QB Starter", "QB", 20), ...core()], pool: [p("QB Wire", "QB", 16, { acquisition: "free_agent" })] }),
    move: { type: "waiver", add: "QB Wire", drop: "WR Three" },
    expect: { owner_change_at_least: 4 },
  },
  {
    id: "dropping-the-only-kicker-costs-the-slot",
    why: "The whole move counts: dropping the only kicker empties the K slot, which cancels the second QB's gain.",
    snapshot: snapshot({ slots: SUPERFLEX, own: [p("QB Starter", "QB", 20), ...core()], pool: [p("QB Wire", "QB", 16, { acquisition: "free_agent" })] }),
    move: { type: "waiver", add: "QB Wire", drop: "K One" },
    expect: { owner_change_at_most: 0 },
  },
  {
    id: "lopsided-trade-nobody-accepts",
    why: "An elite QB for a below-replacement back: both lineups may rise, but the other side gives far more value.",
    snapshot: snapshot({
      own: [p("QB Starter", "QB", 14), ...core()],
      others: [[p("QB Elite", "QB", 24), p("QB Their Backup", "QB", 17), p("RB Theirs", "RB", 6), p("RB Theirs Two", "RB", 5)]],
      pool: [p("QB Wire", "QB", 15, { acquisition: "free_agent" }), p("RB Wire", "RB", 9, { acquisition: "free_agent" })],
    }),
    move: { type: "trade", give: ["RB Three"], receive: ["QB Elite"] },
    expect: { value_gap_at_least: 5 },
  },
];

module.exports = { cases, WEEKS };
