"use strict";

const crypto = require("node:crypto");

const DATASETS = new Set(["teams", "schedules", "players", "player-weekly"]);
const DEFAULT_ACQUISITION_TIMEOUT_MS = 120_000;
const MAX_ACQUISITION_TIMEOUT_MS = 600_000;

class CurrentSeasonIngestError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "CurrentSeasonIngestError";
    this.code = code;
  }
}

function season(value) {
  if (!Number.isInteger(value) || value < 1999 || value > 2100) {
    throw new TypeError("season must be an integer from 1999 through 2100");
  }
  return value;
}

function acquisitionTimeout(value) {
  if (!Number.isInteger(value) || value < 1 || value > MAX_ACQUISITION_TIMEOUT_MS) {
    throw new TypeError(`acquisitionTimeoutMs must be an integer from 1 through ${MAX_ACQUISITION_TIMEOUT_MS}`);
  }
  return value;
}

function runIdFor({ dataset, season: requestedSeason, raw }) {
  if (!DATASETS.has(dataset)) throw new TypeError("dataset is invalid");
  if (!Buffer.isBuffer(raw) || !raw.length) throw new TypeError("raw must be a nonempty Buffer");
  const scope = dataset === "teams" || dataset === "players" ? "global" : season(requestedSeason);
  const digest = crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32);
  return `omen-fw:${dataset}:${scope}:${digest}`;
}

function fn(value, name) {
  if (typeof value !== "function") throw new TypeError(`${name} must be a function`);
  return value;
}

function writer(value, method, name) {
  if (!value || typeof value[method] !== "function") throw new TypeError(`${name}.${method} must be a function`);
  return value;
}

function acquisition(value, name) {
  if (!value || !Buffer.isBuffer(value.raw) || !value.raw.length || typeof value.sourceUrl !== "string") {
    throw new TypeError(`${name} acquisition result is invalid`);
  }
  return value;
}

function abortError() {
  const error = new Error("current-season ingest was aborted");
  error.name = "AbortError";
  return error;
}

function throwIfAborted(signal) {
  if (signal?.aborted) throw abortError();
}

function createCurrentSeasonIngest({
  acquireSchedules,
  adaptSchedules,
  acquirePlayers,
  adaptPlayers,
  acquirePlayerWeekly,
  adaptPlayerWeekly,
  teamWriter,
  scheduleWriter,
  playerWriter,
  playerWeeklyWriter,
  acquisitionTimeoutMs = DEFAULT_ACQUISITION_TIMEOUT_MS,
} = {}) {
  const dependencies = {
    acquireSchedules: fn(acquireSchedules, "acquireSchedules"),
    adaptSchedules: fn(adaptSchedules, "adaptSchedules"),
    acquirePlayers: fn(acquirePlayers, "acquirePlayers"),
    adaptPlayers: fn(adaptPlayers, "adaptPlayers"),
    acquirePlayerWeekly: fn(acquirePlayerWeekly, "acquirePlayerWeekly"),
    adaptPlayerWeekly: fn(adaptPlayerWeekly, "adaptPlayerWeekly"),
    teamWriter: writer(teamWriter, "writeSnapshot", "teamWriter"),
    scheduleWriter: writer(scheduleWriter, "writeSeason", "scheduleWriter"),
    playerWriter: writer(playerWriter, "writeSnapshot", "playerWriter"),
    playerWeeklyWriter: writer(playerWeeklyWriter, "writeSeason", "playerWeeklyWriter"),
  };
  const timeoutMs = acquisitionTimeout(acquisitionTimeoutMs);

  return {
    async run({ season: requestedSeason, signal } = {}) {
      const selectedSeason = season(requestedSeason);
      if (signal != null && !(signal instanceof AbortSignal)) throw new TypeError("signal must be an AbortSignal");
      throwIfAborted(signal);

      const controller = new AbortController();
      let timedOut = false;
      let rejectCallerAbort;
      const callerAbort = new Promise((resolve, reject) => { rejectCallerAbort = reject; });
      const forwardAbort = () => {
        controller.abort(signal.reason);
        rejectCallerAbort(abortError());
      };
      signal?.addEventListener("abort", forwardAbort, { once: true });
      let rejectDeadline;
      const deadline = new Promise((resolve, reject) => { rejectDeadline = reject; });
      const timer = setTimeout(() => {
        timedOut = true;
        controller.abort();
        rejectDeadline(new CurrentSeasonIngestError("acquisition_timeout", "football source acquisition timed out"));
      }, timeoutMs);
      let acquired;
      try {
        const tasks = [
          dependencies.acquireSchedules({ signal: controller.signal }),
          dependencies.acquirePlayers({ signal: controller.signal }),
          dependencies.acquirePlayerWeekly({ season: selectedSeason, signal: controller.signal }),
        ];
        try {
          acquired = await Promise.race([Promise.all(tasks), deadline, callerAbort]);
        } catch (error) {
          controller.abort(error);
          // Attach terminal handlers without allowing a cancellation-ignoring dependency
          // to defeat the caller-visible deadline.
          void Promise.allSettled(tasks);
          if (timedOut && !(error instanceof CurrentSeasonIngestError)) {
            throw new CurrentSeasonIngestError("acquisition_timeout", "football source acquisition timed out", { cause: error });
          }
          throw error;
        }
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", forwardAbort);
      }

      const schedulesSource = acquisition(acquired[0], "schedules");
      const playersSource = acquisition(acquired[1], "players");
      const weeklySource = acquisition(acquired[2], "player weekly");
      const ids = {
        teams: runIdFor({ dataset: "teams", season: selectedSeason, raw: schedulesSource.raw }),
        schedules: runIdFor({ dataset: "schedules", season: selectedSeason, raw: schedulesSource.raw }),
        players: runIdFor({ dataset: "players", season: selectedSeason, raw: playersSource.raw }),
        playerWeekly: runIdFor({ dataset: "player-weekly", season: selectedSeason, raw: weeklySource.raw }),
      };

      // Finish every validation before the first independently committed writer runs.
      throwIfAborted(signal);
      const schedules = dependencies.adaptSchedules({ ...schedulesSource, runId: ids.schedules, season: selectedSeason });
      throwIfAborted(signal);
      const players = dependencies.adaptPlayers({ ...playersSource, runId: ids.players });
      throwIfAborted(signal);
      const weekly = dependencies.adaptPlayerWeekly({
        ...weeklySource, runId: ids.playerWeekly, season: selectedSeason,
        playerIdByGsis: players.playerIdByGsis,
      });
      const teamReceipt = { ...schedules.receipt, runId: ids.teams };

      const stages = {};
      throwIfAborted(signal);
      stages.teams = await dependencies.teamWriter.writeSnapshot({ receipt: teamReceipt, teamRows: schedules.teamRows });
      throwIfAborted(signal);
      stages.schedules = await dependencies.scheduleWriter.writeSeason({
        receipt: schedules.receipt, season: selectedSeason, gameRows: schedules.gameRows,
      });
      throwIfAborted(signal);
      stages.players = await dependencies.playerWriter.writeSnapshot({
        receipt: players.receipt, players: players.players, playerIds: players.playerIds,
      });
      throwIfAborted(signal);
      stages.playerWeekly = await dependencies.playerWeeklyWriter.writeSeason({
        receipt: weekly.receipt, season: selectedSeason, rows: weekly.rows,
        unmatchedRows: weekly.unmatchedRows,
      });

      return {
        season: selectedSeason,
        stages,
        unmatchedRows: weekly.unmatchedRows,
        sourceRefs: {
          schedules: schedules.receipt.sourceRef,
          players: players.receipt.sourceRef,
          playerWeekly: weekly.receipt.sourceRef,
        },
      };
    },
  };
}

module.exports = {
  createCurrentSeasonIngest,
  CurrentSeasonIngestError,
  runIdFor,
  DEFAULT_ACQUISITION_TIMEOUT_MS,
  MAX_ACQUISITION_TIMEOUT_MS,
};
