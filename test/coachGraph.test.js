"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const { franchiseName, rolesOf, parseStaff, coachIdFor } = require("../src/services/footballWarehouse/coachingSource");

test("franchise names follow relocations and renames", () => {
  assert.equal(franchiseName("LV", 2019), "Oakland Raiders");
  assert.equal(franchiseName("LV", 2020), "Las Vegas Raiders");
  assert.equal(franchiseName("LA", 2015), "St. Louis Rams");
  assert.equal(franchiseName("LAC", 2016), "San Diego Chargers");
  assert.equal(franchiseName("WAS", 2021), "Washington Football Team");
  assert.equal(franchiseName("HOU", 2001), null, "the Texans began in 2002");
});

test("combined titles become several roles; position coaches are ignored", () => {
  assert.deepEqual(rolesOf("Assistant head coach/defensive coordinator"), [
    "assistant_head_coach",
    "defensive_coordinator",
  ]);
  assert.deepEqual(rolesOf("Passing game coordinator/quarterbacks"), ["passing_game_coordinator"]);
  assert.deepEqual(rolesOf("Wide receivers"), []);
});

test("staff lines become coach, role and stable id; a coach with two roles appears once per role", () => {
  const staff = parseStaff(
    "* Head coach – [[Andy Reid]]\n* Offensive coordinator – [[Matt Nagy]]\n* Assistant head coach/special teams coordinator – [[Dave Toub]]\n* Tight ends – [[Tom Melvin]]",
  );
  assert.deepEqual(
    staff.map((s) => `${s.role}:${s.coachTitle}`),
    [
      "head_coach:Andy Reid",
      "offensive_coordinator:Matt Nagy",
      "assistant_head_coach:Dave Toub",
      "special_teams_coordinator:Dave Toub",
    ],
  );
  assert.equal(coachIdFor("John Fox (American football)"), "omen:coach:john-fox-american-football");
});

test("the coach stage stops at the first rate-limit refusal and keeps what it read", async () => {
  const { createCoachingStage } = require("../src/services/footballWarehouse/coachingStage");
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return calls === 1
      ? { ok: true, json: async () => ({ parse: { revid: 1, wikitext: { "*": "* Head coach – [[A Coach]]" } } }) }
      : { ok: false, status: 429 };
  };
  const queries = [];
  const client = {
    query: async (q) => {
      queries.push(typeof q === "string" ? q : q.name);
      return { rows: [{ id: 1 }], rowCount: 1 };
    },
    release() {},
  };
  const pool = { query: async () => ({ rows: [] }), connect: async () => client };
  const out = await createCoachingStage({ pool, fetchImpl, pauseMs: 0 }).run({ season: 2026 });
  assert.equal(calls, 2, "stopped right after the refusal");
  assert.equal(out.pages, 1);
  assert.equal(out.failed, 1);
});
