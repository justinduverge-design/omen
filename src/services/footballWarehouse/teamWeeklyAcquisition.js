"use strict";
const { acquireExactSeasonCsv } = require("./seasonCsvAcquisition");
const { sourceUrlForSeason, MAX_SOURCE_BYTES } = require("./teamWeeklySource");
function acquireTeamWeeklySource({ season, sourceUrl = sourceUrlForSeason(season), fetchImpl, signal } = {}) { return acquireExactSeasonCsv({ season, sourceUrl, expectedUrl: sourceUrlForSeason(season), maxBytes: MAX_SOURCE_BYTES, fetchImpl, signal }); }
module.exports = { acquireTeamWeeklySource };
