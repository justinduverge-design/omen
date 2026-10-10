"use strict";

const { createPlayerWeeklyOpportunityWriter } = require("./playerWeeklyOpportunityWriter");
const { createRatQbRunner } = require("./ratQbRun");

function stageError(stage, error) {
  const code = typeof error?.code === "string" && /^[a-z0-9_]{1,64}$/.test(error.code) ? error.code : "failed";
  return Object.assign(new Error(`derived stage ${stage} failed`), { code: `derived_${stage}_${code}`.slice(0, 64) });
}

/**
 * Stages computed inside the warehouse after a season's facts are current: the player-week opportunity table,
 * then the RAT-QB v0 season-to-date run. Derived output is sanitized to counts and states (no row contents).
 * A stage failure never undoes the already-committed facts; it surfaces as a coded failure so the schedule's
 * heartbeat goes down.
 */
function createDerivedStages({ pool, opportunityWriter = createPlayerWeeklyOpportunityWriter({ pool }), qbRunner = createRatQbRunner({ pool }) } = {}) {
  return {
    async run({ season }) {
      let opportunity;
      try { opportunity = await opportunityWriter.writeSeason({ season }); } catch (error) { throw stageError("opportunity", error); }
      let ratQb;
      try { ratQb = await qbRunner.run({ season }); } catch (error) { throw stageError("rat_qb", error); }
      return {
        opportunity: { state: opportunity.state, writtenRows: opportunity.writtenRows },
        ratQb: { state: ratQb.state, valueCount: ratQb.valueCount ?? null },
      };
    },
  };
}

module.exports = { createDerivedStages };
