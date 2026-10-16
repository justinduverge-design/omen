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
  assert.deepEqual(rolesOf("Assistant head coach/defensive coordinator"), ["assistant_head_coach", "defensive_coordinator"]);
  assert.deepEqual(rolesOf("Passing game coordinator/quarterbacks"), ["passing_game_coordinator"]);
  assert.deepEqual(rolesOf("Wide receivers"), []);
});

test("staff lines become coach, role and stable id; a coach with two roles appears once per role", () => {
  const staff = parseStaff("* Head coach – [[Andy Reid]]\n* Offensive coordinator – [[Matt Nagy]]\n* Assistant head coach/special teams coordinator – [[Dave Toub]]\n* Tight ends – [[Tom Melvin]]");
  assert.deepEqual(staff.map((s) => `${s.role}:${s.coachTitle}`), [
    "head_coach:Andy Reid", "offensive_coordinator:Matt Nagy", "assistant_head_coach:Dave Toub", "special_teams_coordinator:Dave Toub",
  ]);
  assert.equal(coachIdFor("John Fox (American football)"), "omen:coach:john-fox-american-football");
});
