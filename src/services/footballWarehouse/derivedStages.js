"use strict";

const { createPlayerWeeklyOpportunityWriter } = require("./playerWeeklyOpportunityWriter");
const { createRatQbRunner } = require("./ratQbRun");
const { createRatSkillRunner } = require("./ratSkillRun");

function stageError(stage, error) {
  const code = typeof error?.code === "string" && /^[a-z0-9_]{1,64}$/.test(error.code) ? error.code : "failed";
  return Object.assign(new Error(`derived stage ${stage} failed`), { code: `derived_${stage}_${code}`.slice(0, 64) });
}

/**
 * Stages computed inside the warehouse after a season's facts are current: the player-week opportunity table,
 * then the RAT-QB v0 season-to-date run. Derived output is sanitized to counts and states (no row contents).
 * strict (default, the daily run): a stage failure is a coded failure so the schedule's heartbeat goes down.
 * report (historical backfill): each stage runs independently and a failure is returned as {state:"failed", code}
 * so one season whose early play-by-play cannot be reconciled does not stop the load of every later season.
 * Either way, an already-committed fact is never undone.
 */
function createDerivedStages({ pool, mode = "strict", opportunityWriter = createPlayerWeeklyOpportunityWriter({ pool }), qbRunner = createRatQbRunner({ pool }), skillRunner = null } = {}) {
  if (mode !== "strict" && mode !== "report") throw new TypeError("derived stage mode must be strict or report");
  async function stage(name, fn, shape) {
    try { return shape(await fn()); } catch (error) {
      const coded = stageError(name, error);
      if (mode === "strict") throw coded;
      return { state: "failed", code: coded.code };
    }
  }
  return {
    async run({ season }) {
      const opportunity = await stage("opportunity", () => opportunityWriter.writeSeason({ season }), (r) => ({ state: r.state, writtenRows: r.writtenRows }));
      const ratQb = await stage("rat_qb", () => qbRunner.run({ season }), (r) => ({ state: r.state, valueCount: r.valueCount ?? null }));
      // Sight's skill ratings are new and unproven: a failure is reported, never fatal, even in strict mode,
      // so they can never take the facts pipeline or its backup down.
      let ratSkill;
      try {
        const r = await (skillRunner || createRatSkillRunner({ pool })).run({ season });
        ratSkill = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, { state: v.state, valueCount: v.valueCount ?? null }]));
      } catch (error) {
        ratSkill = { state: "failed", code: stageError("rat_skill", error).code };
      }
      return { opportunity, ratQb, ratSkill };
    },
  };
}

module.exports = { createDerivedStages };
