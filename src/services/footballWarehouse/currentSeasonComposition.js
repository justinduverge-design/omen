"use strict";

const { createCurrentSeasonIngest } = require("./currentSeasonIngest");
const { acquireScheduleSource } = require("./scheduleAcquisition");
const { adaptSchedulesCsv } = require("./scheduleSource");
const { acquirePlayerIdentitySource } = require("./playerIdentityAcquisition");
const { adaptPlayersCsv } = require("./playerIdentitySource");
const { acquirePlayerWeeklySource } = require("./playerWeeklyAcquisition");
const { adaptPlayerWeeklyCsv } = require("./playerWeeklySource");
const { createTeamWriter } = require("./teamWriter");
const { createScheduleWriter } = require("./scheduleWriter");
const { createPlayerIdentityWriter } = require("./playerIdentityWriter");
const { createPlayerWeeklyWriter } = require("./playerWeeklyWriter");
const { acquireTeamWeeklySource } = require("./teamWeeklyAcquisition");
const { adaptTeamWeeklyCsv } = require("./teamWeeklySource");
const { createTeamWeeklyWriter } = require("./teamWeeklyWriter");
const { acquireWeeklyRosterSource } = require("./weeklyRosterAcquisition");
const { adaptWeeklyRosterCsv } = require("./weeklyRosterSource");
const { createWeeklyRosterWriter } = require("./weeklyRosterWriter");
const { acquirePlayByPlaySource } = require("./playByPlayAcquisition");
const { adaptPlayByPlayCsvGzip } = require("./playByPlaySource");
const { createPlayByPlayWriter } = require("./playByPlayWriter");

function createWarehousePool({ Pool, config }) {
  if (typeof Pool !== "function") throw new TypeError("Pool must be a constructor");
  if (!config?.connectionString) throw new TypeError("warehouse connection string is required");
  return new Pool({
    connectionString: config.connectionString,
    ssl: config.ssl,
    max: config.poolMax,
    connectionTimeoutMillis: config.connectionTimeoutMillis,
    idleTimeoutMillis: config.idleTimeoutMillis,
    query_timeout: config.queryTimeoutMillis,
    application_name: "omen-football-warehouse-ingest",
    allowExitOnIdle: true,
  });
}

function createCurrentSeasonComposition({ pool, fetchImpl = globalThis.fetch, acquisitionTimeoutMs } = {}) {
  return createCurrentSeasonIngest({
    acquireSchedules: ({ signal }) => acquireScheduleSource({ fetchImpl, signal }),
    adaptSchedules: adaptSchedulesCsv,
    acquirePlayers: ({ signal }) => acquirePlayerIdentitySource({ fetchImpl, signal }),
    adaptPlayers: adaptPlayersCsv,
    acquirePlayerWeekly: ({ season, signal }) => acquirePlayerWeeklySource({ fetchImpl, season, signal }),
    adaptPlayerWeekly: adaptPlayerWeeklyCsv,
    acquireTeamWeekly: ({ season, signal }) => acquireTeamWeeklySource({ fetchImpl, season, signal }),
    adaptTeamWeekly: adaptTeamWeeklyCsv,
    acquireWeeklyRosters: ({ season, signal }) => acquireWeeklyRosterSource({ fetchImpl, season, signal }),
    adaptWeeklyRosters: adaptWeeklyRosterCsv,
    acquirePlayByPlay: ({ season, signal }) => acquirePlayByPlaySource({ fetchImpl, season, signal }),
    adaptPlayByPlay: adaptPlayByPlayCsvGzip,
    teamWriter: createTeamWriter({ pool }),
    scheduleWriter: createScheduleWriter({ pool }),
    playerWriter: createPlayerIdentityWriter({ pool }),
    playerWeeklyWriter: createPlayerWeeklyWriter({ pool }),
    teamWeeklyWriter: createTeamWeeklyWriter({ pool }),
    weeklyRosterWriter: createWeeklyRosterWriter({ pool }),
    playByPlayWriter: createPlayByPlayWriter({ pool }),
    acquisitionTimeoutMs,
  });
}

function createCurrentSeasonValidationComposition({ fetchImpl = globalThis.fetch, acquisitionTimeoutMs } = {}) {
  const unwritable = (name) => Object.freeze({
    [name]: async () => { throw new Error("validate mode reached a database writer"); },
  });
  return createCurrentSeasonIngest({
    acquireSchedules: ({ signal }) => acquireScheduleSource({ fetchImpl, signal }),
    adaptSchedules: adaptSchedulesCsv,
    acquirePlayers: ({ signal }) => acquirePlayerIdentitySource({ fetchImpl, signal }),
    adaptPlayers: adaptPlayersCsv,
    acquirePlayerWeekly: ({ season, signal }) => acquirePlayerWeeklySource({ fetchImpl, season, signal }),
    adaptPlayerWeekly: adaptPlayerWeeklyCsv,
    acquireTeamWeekly: ({ season, signal }) => acquireTeamWeeklySource({ fetchImpl, season, signal }),
    adaptTeamWeekly: adaptTeamWeeklyCsv,
    acquireWeeklyRosters: ({ season, signal }) => acquireWeeklyRosterSource({ fetchImpl, season, signal }),
    adaptWeeklyRosters: adaptWeeklyRosterCsv,
    acquirePlayByPlay: ({ season, signal }) => acquirePlayByPlaySource({ fetchImpl, season, signal }),
    adaptPlayByPlay: adaptPlayByPlayCsvGzip,
    teamWriter: unwritable("writeSnapshot"),
    scheduleWriter: unwritable("writeSeason"),
    playerWriter: unwritable("writeSnapshot"),
    playerWeeklyWriter: unwritable("writeSeason"),
    teamWeeklyWriter: unwritable("writeSeason"),
    weeklyRosterWriter: unwritable("writeSeason"),
    playByPlayWriter: unwritable("writeSeason"),
    acquisitionTimeoutMs,
  });
}

module.exports = {
  createWarehousePool,
  createCurrentSeasonComposition,
  createCurrentSeasonValidationComposition,
};
