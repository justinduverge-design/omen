"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { buildWaiverAnalysis, chooseDrop } = require("../src/services/waiverAnalysis");

// A real Yahoo roster shape: eligible_positions carry slot tokens (W/R/T, BN, IR) beside the position.
const P = (name, position, points, slot, extra = {}) => ({
  player_key: `yahoo:${name}`,
  name,
  position,
  eligible_positions: [position, ...(["RB", "WR", "TE"].includes(position) ? ["W/R/T"] : []), "BN", "IR"],
  selected_position: slot,
  projected_points: points,
  status: null,
  ...extra,
});

// The 2026-10-15 phone report: starting RB Montgomery is out, RB Gordon is on a bye (0.0 by schedule).
function roster() {
  return {
    week: 6,
    slots: {
      starters: [
        P("Stafford", "QB", 21.07, "QB"), P("Montgomery", "RB", 0, "RB", { status: "O" }), P("Gainwell", "RB", 6.41, "RB"),
        P("Nacua", "WR", 19.3, "WR"), P("Tate", "WR", 9.86, "WR"), P("Kittle", "TE", 12.37, "TE"),
        P("Concepcion", "WR", 4.06, "W/R/T", { status: "Q" }), P("Pineiro", "K", 8.91, "K"), P("Seahawks", "DEF", 6.34, "DEF"),
      ],
      bench: [
        P("Gordon", "RB", 0, "BN", { projection_basis: "bye_week" }), P("Smith", "WR", 6.49, "BN", { status: "Q" }),
        P("Okonkwo", "TE", 5.63, "BN"), P("Godwin", "WR", 7.09, "BN"), P("Dowdle", "RB", 6.62, "BN"),
      ],
      ir: [],
    },
  };
}

const run = (pool) => buildWaiverAnalysis({ roster: roster(), pool, platform: "yahoo", leagueId: "x", week: 6, season: 2026, availabilityConfirmed: true });

test("a tight end is never offered for an injured running back's slot, even though both list BN and IR", () => {
  const out = run([P("Freiermuth", "TE", 7.3, null), P("Free RB", "RB", 5.2, null)]);
  assert.equal(out.best_move.add.name, "Free RB");
  assert.equal(out.best_move.displaces.name, "Montgomery");
  assert.equal(out.best_move.solves_unavailable_starter, true);
});

test("with only a tight end available he can fill the flex slot, never the RB slot", () => {
  const out = run([P("Freiermuth", "TE", 7.3, null)]);
  assert.equal(out.best_move.add.name, "Freiermuth");
  assert.equal(out.best_move.displaces.name, "Concepcion", "the W/R/T starter, not the injured RB");
  assert.equal(out.best_move.solves_unavailable_starter, false);
});

test("a player on a bye, or projected 0.0, is never the drop", () => {
  const out = run([P("Free RB", "RB", 5.2, null)]);
  assert.notEqual(out.best_move.drop.name, "Gordon");
  assert.ok(out.best_move.drop.name);
  const noProjectionDrop = chooseDrop([P("Zero", "WR", 0, "BN")], ["RB"]);
  assert.equal(noProjectionDrop, null, "0.0 says nothing about value");
});

test("a drop never leaves the lineup short at its position", () => {
  const r = roster();
  // Two healthy RBs, two RB slots: dropping either would leave a hole.
  const drop = chooseDrop(r.slots.bench.filter((p) => p.position === "RB"), ["WR"], { starters: r.slots.starters });
  assert.equal(drop, null);
});

test("the cost statement counts depth at the real position, not the whole bench", () => {
  const out = run([P("Free RB", "RB", 5.2, null)]);
  assert.match(out.cost.removes, /Okonkwo was your TE depth; 1 other option remains at that position\./);
});
