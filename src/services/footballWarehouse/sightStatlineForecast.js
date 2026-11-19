"use strict";

const { METHOD_VERSION } = require("./sightStatlineConstants");
const { projectPlayerWeek } = require("./sightStatlineProject");
const { scoreStatLine } = require("../scoring/statLineScoring");

/**
 * Forecast from an explicit origin, inclusive: { position, history, origin: { season, week } }.
 * Rows use the projector's weekly history shape. The origin is independent of the player's
 * last game, so missed games and accidentally supplied future facts cannot move it.
 * Targets advance over an 18-week regular season. No schedule or game context is assumed.
 */
function forecastHorizons({ position, history = [], origin } = {}) {
  if (!origin || !Number.isInteger(origin.season) || !Number.isInteger(origin.week) || origin.week < 1 || origin.week > 18)
    throw new TypeError("origin must have an integer season and week from 1 to 18");
  if (!Array.isArray(history)) throw new TypeError("history must be an array");

  const throughOrigin = history.filter(
    (row) => row && Number.isInteger(row.season) && Number.isInteger(row.week) &&
      (row.season < origin.season || (row.season === origin.season && row.week <= origin.week)),
  );
  const horizons = [1, 2, 3, 4].map((h) => {
    const offset = origin.week - 1 + h;
    const projection = projectPlayerWeek({
      position,
      history: throughOrigin,
      season: origin.season + Math.floor(offset / 18),
      week: (offset % 18) + 1,
    });
    return {
      h,
      stat_line: projection.stat_line,
      ppr: projection.stat_line === null ? null : scoreStatLine(projection.stat_line, "ppr"),
    };
  });
  return { method_version: METHOD_VERSION, horizons };
}

module.exports = { forecastHorizons };
