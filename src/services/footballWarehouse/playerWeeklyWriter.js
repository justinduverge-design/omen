"use strict";

const DATASET = "player_weekly_stats";
const RIGHTS_BASIS = "nflverse_open_data";
const SOURCE_REF = /^sha256:[0-9a-f]{64}$/;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PLAYER_ID = /^omen:player:[a-z0-9:_-]+$/;
const TEAM_ID = /^omen:team:[a-z0-9]+$/;
const GAME_ID = /^.{1,64}$/;
const MAX_ROWS = 250_000;
const MAX_ERROR_SUMMARY = 500;

class WarehouseIngestError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WarehouseIngestError";
    this.code = code;
  }
}

function requiredString(value, name, pattern) {
  if (typeof value !== "string" || !pattern.test(value)) {
    throw new TypeError(`${name} is invalid`);
  }
  return value;
}

function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${name} must be an integer from ${min} through ${max}`);
  }
  return value;
}

function optionalString(value, name, pattern) {
  if (value == null) return null;
  return requiredString(value, name, pattern);
}

function optionalFinite(value, name) {
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number or null`);
  }
  return value;
}

function optionalUnitInterval(value, name) {
  const number = optionalFinite(value, name);
  if (number != null && (number < 0 || number > 1)) {
    throw new TypeError(`${name} must be between 0 and 1 or null`);
  }
  return number;
}

function plainObject(value, name) {
  if (value == null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function sourceUrl(value) {
  requiredString(value, "receipt.sourceUrl", /^https:\/\/\S+$/);
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError("receipt.sourceUrl is invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new TypeError("receipt.sourceUrl is invalid");
  }
  return value;
}

function sourceObject(value, name) {
  if (value == null) throw new TypeError(`${name} must be an object`);
  return plainObject(value, name);
}

function validateReceipt(receipt) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) {
    throw new TypeError("receipt must be an object");
  }
  const validatedSourceUrl = sourceUrl(receipt.sourceUrl);
  const sourceRef = requiredString(receipt.sourceRef, "receipt.sourceRef", SOURCE_REF);
  return {
    runId: requiredString(receipt.runId, "receipt.runId", RUN_ID),
    sourceUrl: validatedSourceUrl,
    sourceRef,
    sourceBytes: integer(receipt.sourceBytes, "receipt.sourceBytes", 0, Number.MAX_SAFE_INTEGER),
    sourceRows: integer(receipt.sourceRows, "receipt.sourceRows", 1, Number.MAX_SAFE_INTEGER),
  };
}

function validateRow(row, index, season) {
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new TypeError(`rows[${index}] must be an object`);
  }
  if (row.season !== season) throw new TypeError(`rows[${index}].season must match season`);
  return {
    season,
    week: integer(row.week, `rows[${index}].week`, 1, 23),
    season_type: requiredString(row.seasonType, `rows[${index}].seasonType`, /^(REG|POST)$/),
    player_id: requiredString(row.playerId, `rows[${index}].playerId`, PLAYER_ID),
    team_id: optionalString(row.teamId, `rows[${index}].teamId`, TEAM_ID),
    opponent_team_id: optionalString(row.opponentTeamId, `rows[${index}].opponentTeamId`, TEAM_ID),
    game_id: optionalString(row.gameId, `rows[${index}].gameId`, GAME_ID),
    football_position: optionalString(row.footballPosition, `rows[${index}].footballPosition`, /^.{1,32}$/),
    fantasy_points_ppr: optionalFinite(row.fantasyPointsPpr, `rows[${index}].fantasyPointsPpr`),
    passing_yards: optionalFinite(row.passingYards, `rows[${index}].passingYards`),
    rushing_yards: optionalFinite(row.rushingYards, `rows[${index}].rushingYards`),
    receiving_yards: optionalFinite(row.receivingYards, `rows[${index}].receivingYards`),
    targets: optionalFinite(row.targets, `rows[${index}].targets`),
    receptions: optionalFinite(row.receptions, `rows[${index}].receptions`),
    carries: optionalFinite(row.carries, `rows[${index}].carries`),
    passing_attempts: optionalFinite(row.passingAttempts, `rows[${index}].passingAttempts`),
    target_share: optionalUnitInterval(row.targetShare, `rows[${index}].targetShare`),
    stats: plainObject(row.stats, `rows[${index}].stats`),
    opportunity: plainObject(row.opportunity, `rows[${index}].opportunity`),
    source_row: sourceObject(row.sourceRow, `rows[${index}].sourceRow`),
  };
}

function sanitizeError(error) {
  const code = typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code)
    ? error.code
    : "warehouse_ingest_failed";
  const raw = error instanceof WarehouseIngestError ? error.message : "player weekly ingest failed";
  const summary = String(raw)
    .replace(/(?:postgres(?:ql)?:\/\/|password=)[^\s]+/gi, "[redacted]")
    .replace(/[\u0000-\u001f\u007f]+/g, " ")
    .slice(0, MAX_ERROR_SUMMARY);
  return { code, summary };
}

async function recordFailure(client, { receipt, season, sourceRows, unmatchedRows, error }) {
  const safe = sanitizeError(error);
  try {
    await client.query({
      name: "warehouse-player-weekly-failed-receipt-v1",
      text: `
        INSERT INTO football.warehouse_ingest_events
          (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes,
           source_rows, state, finished_at, error_code, error_summary, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'failed', clock_timestamp(), $9, $10,
                jsonb_build_object('unmatched_rows', $11::integer))
        ON CONFLICT (run_id, dataset, season) DO UPDATE SET
          rights_basis = EXCLUDED.rights_basis, source_url = EXCLUDED.source_url,
          source_ref = EXCLUDED.source_ref, source_bytes = EXCLUDED.source_bytes,
          source_rows = EXCLUDED.source_rows, state = 'failed', finished_at = clock_timestamp(),
          error_code = EXCLUDED.error_code,
          error_summary = EXCLUDED.error_summary, metadata = EXCLUDED.metadata
        WHERE football.warehouse_ingest_events.state <> 'succeeded'
      `,
      values: [receipt.runId, DATASET, season, RIGHTS_BASIS, receipt.sourceUrl,
        receipt.sourceRef, receipt.sourceBytes, sourceRows, safe.code, safe.summary, unmatchedRows],
    });
  } catch {
    // The original ingest failure remains authoritative; diagnostics are best effort.
  }
}

function createPlayerWeeklyWriter({ pool }) {
  if (!pool || typeof pool.connect !== "function") {
    throw new TypeError("pool.connect must be a function");
  }

  return {
    async writeSeason({ season, receipt: rawReceipt, rows, unmatchedRows = 0 }) {
      integer(season, "season", 1999, 2100);
      const receipt = validateReceipt(rawReceipt);
      integer(unmatchedRows, "unmatchedRows", 0, Number.MAX_SAFE_INTEGER);
      if (!Array.isArray(rows)) throw new TypeError("rows must be an array");
      if (!rows.length) throw new RangeError("rows must contain at least one resolved player week");
      if (rows.length > MAX_ROWS) throw new RangeError(`rows exceeds the ${MAX_ROWS}-row limit`);
      const validatedRows = rows.map((row, index) => validateRow(row, index, season));
      const keys = new Set();
      for (const row of validatedRows) {
        const key = `${row.week}\u0000${row.season_type}\u0000${row.player_id}`;
        if (keys.has(key)) throw new TypeError("rows contain a duplicate player-week key");
        keys.add(key);
      }
      if (receipt.sourceRows < validatedRows.length + unmatchedRows) {
        throw new RangeError("receipt.sourceRows cannot be smaller than resolved plus unmatched rows");
      }
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        await client.query({
          name: "warehouse-player-weekly-lock-v1",
          text: "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          values: [`${DATASET}:${season}`],
        });

        const existing = await client.query({
          name: "warehouse-player-weekly-existing-v1",
          text: `
            SELECT id, run_id
            FROM football.warehouse_ingest_events
            WHERE dataset = $1 AND season = $2 AND source_ref = $3 AND state = 'succeeded'
            ORDER BY finished_at DESC
            LIMIT 1
          `,
          values: [DATASET, season, receipt.sourceRef],
        });
        if (existing.rows.length) {
          await client.query("COMMIT");
          return { state: "unchanged", ingestEventId: existing.rows[0].id,
            sourceRows: receipt.sourceRows, writtenRows: validatedRows.length };
        }

        const started = await client.query({
          name: "warehouse-player-weekly-start-receipt-v1",
          text: `
            INSERT INTO football.warehouse_ingest_events
              (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes, state,
               metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'started',
                    jsonb_build_object('unmatched_rows', $8::integer))
            ON CONFLICT (run_id, dataset, season) DO UPDATE SET
              rights_basis = EXCLUDED.rights_basis, source_url = EXCLUDED.source_url,
              source_ref = EXCLUDED.source_ref, source_bytes = EXCLUDED.source_bytes,
              source_rows = NULL, state = 'started', finished_at = NULL, error_code = NULL,
              error_summary = NULL, metadata = EXCLUDED.metadata
            WHERE football.warehouse_ingest_events.state = 'failed'
            RETURNING id
          `,
          values: [receipt.runId, DATASET, season, RIGHTS_BASIS, receipt.sourceUrl,
            receipt.sourceRef, receipt.sourceBytes, unmatchedRows],
        });
        if (!started.rows.length) {
          throw new WarehouseIngestError("run_id_conflict", "run id already belongs to a succeeded ingest");
        }
        const ingestEventId = started.rows[0].id;

        await client.query({
          name: "warehouse-player-weekly-create-stage-v1",
          text: `
            CREATE TEMP TABLE stage_player_weekly_stats
            (LIKE football.nfl_player_weekly_stats INCLUDING ALL)
            ON COMMIT DROP
          `,
        });
        await client.query({
          name: "warehouse-player-weekly-stage-v1",
          text: `
            INSERT INTO stage_player_weekly_stats
              (season, week, season_type, player_id, team_id, opponent_team_id, game_id,
               football_position, fantasy_points_ppr, passing_yards, rushing_yards,
               receiving_yards, targets, receptions, carries, passing_attempts, target_share,
               stats, opportunity, source_row, ingest_event_id)
            SELECT r.season, r.week, r.season_type, r.player_id, r.team_id,
                   r.opponent_team_id, r.game_id, r.football_position, r.fantasy_points_ppr,
                   r.passing_yards, r.rushing_yards, r.receiving_yards, r.targets,
                   r.receptions, r.carries, r.passing_attempts, r.target_share,
                   r.stats, r.opportunity, r.source_row, $2
            FROM jsonb_to_recordset($1::jsonb) AS r(
              season integer, week integer, season_type text, player_id text, team_id text,
              opponent_team_id text, game_id text, football_position text,
              fantasy_points_ppr numeric, passing_yards numeric, rushing_yards numeric,
              receiving_yards numeric, targets numeric, receptions numeric, carries numeric,
              passing_attempts numeric, target_share numeric, stats jsonb,
              opportunity jsonb, source_row jsonb)
          `,
          values: [JSON.stringify(validatedRows), ingestEventId],
        });
        const staged = await client.query({
          name: "warehouse-player-weekly-stage-count-v1",
          text: "SELECT count(*)::integer AS row_count FROM stage_player_weekly_stats",
        });
        if (staged.rows[0]?.row_count !== validatedRows.length) {
          throw new WarehouseIngestError("stage_count_mismatch", "staged row count did not match source rows");
        }
        const references = await client.query({
          name: "warehouse-player-weekly-stage-references-v1",
          text: `
            SELECT count(*)::integer AS invalid_count
            FROM stage_player_weekly_stats s
            LEFT JOIN football.football_players p ON p.player_id = s.player_id
            LEFT JOIN football.football_teams t ON t.team_id = s.team_id
            LEFT JOIN football.football_teams o ON o.team_id = s.opponent_team_id
            LEFT JOIN football.nfl_games g ON g.season = s.season AND g.game_id = s.game_id
            WHERE p.player_id IS NULL
               OR (s.team_id IS NOT NULL AND t.team_id IS NULL)
               OR (s.opponent_team_id IS NOT NULL AND o.team_id IS NULL)
               OR (s.game_id IS NOT NULL AND g.game_id IS NULL)
          `,
        });
        if (references.rows[0]?.invalid_count !== 0) {
          throw new WarehouseIngestError("stage_reference_invalid", "staged rows contain unknown canonical ids");
        }

        await client.query({
          name: "warehouse-player-weekly-delete-season-v1",
          text: "DELETE FROM football.nfl_player_weekly_stats WHERE season = $1",
          values: [season],
        });
        await client.query({
          name: "warehouse-player-weekly-promote-v1",
          text: `
            INSERT INTO football.nfl_player_weekly_stats
              (season, week, season_type, player_id, team_id, opponent_team_id, game_id,
               football_position, fantasy_points_ppr, passing_yards, rushing_yards,
               receiving_yards, targets, receptions, carries, passing_attempts, target_share,
               stats, opportunity, source_row, ingest_event_id)
            SELECT season, week, season_type, player_id, team_id, opponent_team_id, game_id,
                   football_position, fantasy_points_ppr, passing_yards, rushing_yards,
                   receiving_yards, targets, receptions, carries, passing_attempts, target_share,
                   stats, opportunity, source_row, ingest_event_id
            FROM stage_player_weekly_stats
          `,
        });
        await client.query({
          name: "warehouse-player-weekly-succeed-receipt-v1",
          text: `
            UPDATE football.warehouse_ingest_events
            SET state = 'succeeded', source_rows = $2, finished_at = clock_timestamp()
            WHERE id = $1 AND state = 'started'
          `,
          values: [ingestEventId, receipt.sourceRows],
        });
        await client.query("COMMIT");
        return { state: "succeeded", ingestEventId, sourceRows: receipt.sourceRows,
          writtenRows: validatedRows.length, unmatchedRows };
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        await recordFailure(client, {
          receipt,
          season,
          sourceRows: receipt.sourceRows,
          unmatchedRows,
          error,
        });
        const safe = sanitizeError(error);
        throw new WarehouseIngestError(safe.code, safe.summary, { cause: error });
      } finally {
        client.release();
      }
    },
  };
}

module.exports = {
  createPlayerWeeklyWriter,
  WarehouseIngestError,
  DATASET,
  MAX_ROWS,
};
