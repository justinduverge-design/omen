"use strict";

const { PLAYERS_SOURCE_URL } = require("./playerIdentitySource");

const DATASET = "players";
const RIGHTS_BASIS = "nflverse_open_data";
const SOURCE_REF = /^sha256:[0-9a-f]{64}$/;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const PLAYER_ID = /^omen:player:[a-z0-9:._-]+$/;
const GSIS_ID = /^[A-Za-z0-9._-]{1,128}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 100_000;
const MAX_ERROR_SUMMARY = 500;

class WarehouseIdentityIngestError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = "WarehouseIdentityIngestError";
    this.code = code;
  }
}

function requiredString(value, name, pattern, maxLength = Infinity) {
  if (typeof value !== "string" || !pattern.test(value) || value.length > maxLength) {
    throw new TypeError(`${name} is invalid`);
  }
  return value;
}

function optionalString(value, name, maxLength) {
  if (value == null) return null;
  return requiredString(value, name, /^.+$/, maxLength);
}

function integer(value, name, min, max) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new TypeError(`${name} must be an integer from ${min} through ${max}`);
  }
  return value;
}

function plainObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${name} must be an object`);
  }
  return value;
}

function validateSourceUrl(value) {
  requiredString(value, "receipt.sourceUrl", /^https:\/\/\S+$/);
  let parsed;
  try { parsed = new URL(value); } catch { throw new TypeError("receipt.sourceUrl is invalid"); }
  if (parsed.protocol !== "https:" || parsed.username || parsed.password) {
    throw new TypeError("receipt.sourceUrl is invalid");
  }
  if (value !== PLAYERS_SOURCE_URL) throw new TypeError("receipt.sourceUrl is not the allowlisted players asset");
  return value;
}

function validateReceipt(receipt) {
  plainObject(receipt, "receipt");
  const metadata = plainObject(receipt.metadata, "receipt.metadata");
  const schemaFingerprint = requiredString(
    metadata.schema_fingerprint,
    "receipt.metadata.schema_fingerprint",
    SOURCE_REF,
  );
  if (!Array.isArray(metadata.source_columns) || metadata.source_columns.length === 0 ||
      metadata.source_columns.some((column) => typeof column !== "string" || !column)) {
    throw new TypeError("receipt.metadata.source_columns must be a nonempty string array");
  }
  return {
    runId: requiredString(receipt.runId, "receipt.runId", RUN_ID),
    sourceUrl: validateSourceUrl(receipt.sourceUrl),
    sourceRef: requiredString(receipt.sourceRef, "receipt.sourceRef", SOURCE_REF),
    sourceBytes: integer(receipt.sourceBytes, "receipt.sourceBytes", 0, Number.MAX_SAFE_INTEGER),
    sourceRows: integer(receipt.sourceRows, "receipt.sourceRows", 1, Number.MAX_SAFE_INTEGER),
    metadata: { schema_fingerprint: schemaFingerprint, source_columns: [...metadata.source_columns] },
  };
}

function validatePlayer(player, index) {
  plainObject(player, `players[${index}]`);
  const birthDate = player.birthDate == null ? null :
    requiredString(player.birthDate, `players[${index}].birthDate`, ISO_DATE);
  if (birthDate) {
    const parsed = new Date(`${birthDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== birthDate) {
      throw new TypeError(`players[${index}].birthDate is invalid`);
    }
  }
  return {
    player_id: requiredString(player.playerId, `players[${index}].playerId`, PLAYER_ID),
    gsis_id: requiredString(player.gsisId, `players[${index}].gsisId`, GSIS_ID),
    display_name: requiredString(player.displayName, `players[${index}].displayName`, /^.+$/, 256),
    first_name: optionalString(player.firstName, `players[${index}].firstName`, 128),
    last_name: optionalString(player.lastName, `players[${index}].lastName`, 128),
    football_position: optionalString(player.footballPosition, `players[${index}].footballPosition`, 32),
    birth_date: birthDate,
    source_row: plainObject(player.sourceRow, `players[${index}].sourceRow`),
  };
}

function validatePlayerId(playerId, index) {
  plainObject(playerId, `playerIds[${index}]`);
  if (playerId.provider !== "gsis") throw new TypeError(`playerIds[${index}].provider must be gsis`);
  if (playerId.matchMethod !== "source_crosswalk") {
    throw new TypeError(`playerIds[${index}].matchMethod must be source_crosswalk`);
  }
  return {
    provider: "gsis",
    provider_id: requiredString(playerId.providerId, `playerIds[${index}].providerId`, GSIS_ID),
    player_id: requiredString(playerId.playerId, `playerIds[${index}].playerId`, PLAYER_ID),
    match_method: "source_crosswalk",
  };
}

function sanitizeError(error) {
  const code = typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code)
    ? error.code : "warehouse_identity_ingest_failed";
  const raw = error instanceof WarehouseIdentityIngestError ? error.message : "player identity ingest failed";
  return {
    code,
    summary: String(raw)
      .replace(/(?:postgres(?:ql)?:\/\/|password=)[^\s]+/gi, "[redacted]")
      .replace(/[\u0000-\u001f\u007f]+/g, " ")
      .slice(0, MAX_ERROR_SUMMARY),
  };
}

async function recordFailure(client, receipt, error) {
  const safe = sanitizeError(error);
  try {
    await client.query({
      name: "warehouse-player-identity-failed-receipt-v1",
      text: `
        INSERT INTO football.warehouse_ingest_events
          (run_id, dataset, season, rights_basis, source_url, source_ref, source_bytes,
           source_rows, state, finished_at, error_code, error_summary, metadata)
        VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, 'failed', clock_timestamp(), $8, $9, $10::jsonb)
      `,
      values: [receipt.runId, DATASET, RIGHTS_BASIS, receipt.sourceUrl, receipt.sourceRef,
        receipt.sourceBytes, receipt.sourceRows, safe.code, safe.summary,
        JSON.stringify(receipt.metadata)],
    });
  } catch {
    // Preserve the authoritative ingest error when best-effort diagnostics fail.
  }
}

function createPlayerIdentityWriter({ pool, minPlayerRows = 1000 }) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("pool.connect must be a function");
  integer(minPlayerRows, "minPlayerRows", 1, MAX_ROWS);

  return {
    async writeSnapshot({ receipt: rawReceipt, players, playerIds }) {
      const receipt = validateReceipt(rawReceipt);
      if (!Array.isArray(players) || !players.length) throw new RangeError("players must be a nonempty array");
      if (!Array.isArray(playerIds) || !playerIds.length) throw new RangeError("playerIds must be a nonempty array");
      if (players.length > MAX_ROWS || playerIds.length > MAX_ROWS) {
        throw new RangeError(`identity rows exceed the ${MAX_ROWS}-row limit`);
      }
      if (players.length < minPlayerRows) {
        throw new RangeError(`identity snapshot has fewer than ${minPlayerRows} players`);
      }
      if (receipt.sourceRows !== players.length || players.length !== playerIds.length) {
        throw new RangeError("receipt, player, and GSIS mapping row counts must match exactly");
      }
      const admittedPlayers = players.map(validatePlayer);
      const admittedIds = playerIds.map(validatePlayerId);
      const playersById = new Map();
      const gsisIds = new Set();
      for (const player of admittedPlayers) {
        if (playersById.has(player.player_id)) throw new TypeError("players contain a duplicate player id");
        if (gsisIds.has(player.gsis_id)) throw new TypeError("players contain a duplicate GSIS id");
        playersById.set(player.player_id, player);
        gsisIds.add(player.gsis_id);
      }
      const mappingKeys = new Set();
      for (const mapping of admittedIds) {
        if (mappingKeys.has(mapping.provider_id)) throw new TypeError("playerIds contain a duplicate GSIS id");
        mappingKeys.add(mapping.provider_id);
        const player = playersById.get(mapping.player_id);
        if (!player || player.gsis_id !== mapping.provider_id) {
          throw new TypeError("every GSIS mapping must directly match its admitted player");
        }
      }

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query({
          name: "warehouse-player-identity-lock-v1",
          text: "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
          values: [DATASET],
        });
        const existing = await client.query({
          name: "warehouse-player-identity-existing-v1",
          text: `SELECT id FROM football.warehouse_ingest_events
                 WHERE dataset = $1 AND season IS NULL AND source_ref = $2 AND state = 'succeeded'
                 ORDER BY finished_at DESC LIMIT 1`,
          values: [DATASET, receipt.sourceRef],
        });
        if (existing.rows.length) {
          await client.query("COMMIT");
          return { state: "unchanged", ingestEventId: existing.rows[0].id,
            sourceRows: receipt.sourceRows, writtenPlayers: admittedPlayers.length,
            writtenPlayerIds: admittedIds.length };
        }
        const run = await client.query({
          name: "warehouse-player-identity-run-v1",
          text: `SELECT id, state, source_ref FROM football.warehouse_ingest_events
                 WHERE run_id = $1 AND dataset = $2 AND season IS NULL
                 ORDER BY id DESC LIMIT 1`,
          values: [receipt.runId, DATASET],
        });
        if (run.rows[0]?.state === "succeeded" ||
            (run.rows[0] && run.rows[0].source_ref !== receipt.sourceRef)) {
          throw new WarehouseIdentityIngestError("run_id_conflict", "run id already belongs to another ingest");
        }
        const started = run.rows.length
          ? await client.query({
            name: "warehouse-player-identity-restart-receipt-v1",
            text: `UPDATE football.warehouse_ingest_events SET rights_basis=$2, source_url=$3,
                   source_ref=$4, source_bytes=$5, source_rows=NULL, state='started',
                   started_at=clock_timestamp(), finished_at=NULL, error_code=NULL,
                   error_summary=NULL, metadata=$6::jsonb WHERE id=$1 AND state='failed' RETURNING id`,
            values: [run.rows[0].id, RIGHTS_BASIS, receipt.sourceUrl, receipt.sourceRef,
              receipt.sourceBytes, JSON.stringify(receipt.metadata)],
          })
          : await client.query({
            name: "warehouse-player-identity-start-receipt-v1",
            text: `INSERT INTO football.warehouse_ingest_events
                   (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,state,metadata)
                   VALUES ($1,$2,NULL,$3,$4,$5,$6,'started',$7::jsonb) RETURNING id`,
            values: [receipt.runId, DATASET, RIGHTS_BASIS, receipt.sourceUrl, receipt.sourceRef,
              receipt.sourceBytes, JSON.stringify(receipt.metadata)],
          });
        if (!started.rows.length) throw new WarehouseIdentityIngestError("run_id_conflict", "run id could not be started");
        const ingestEventId = started.rows[0].id;

        await client.query({ name: "warehouse-player-identity-create-player-stage-v1", text: `
          CREATE TEMP TABLE stage_football_players (
            player_id text PRIMARY KEY, gsis_id text UNIQUE NOT NULL, display_name text NOT NULL,
            first_name text, last_name text, football_position text, birth_date date,
            source_row jsonb NOT NULL) ON COMMIT DROP` });
        await client.query({ name: "warehouse-player-identity-stage-players-v1", text: `
          INSERT INTO stage_football_players
            (player_id,gsis_id,display_name,first_name,last_name,football_position,birth_date,source_row)
          SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(player_id text,gsis_id text,
            display_name text,first_name text,last_name text,football_position text,birth_date date,source_row jsonb)`,
          values: [JSON.stringify(admittedPlayers)] });
        await client.query({ name: "warehouse-player-identity-create-id-stage-v1", text: `
          CREATE TEMP TABLE stage_football_player_ids (
            provider text NOT NULL, provider_id text PRIMARY KEY, player_id text UNIQUE NOT NULL,
            match_method text NOT NULL) ON COMMIT DROP` });
        await client.query({ name: "warehouse-player-identity-stage-ids-v1", text: `
          INSERT INTO stage_football_player_ids (provider,provider_id,player_id,match_method)
          SELECT * FROM jsonb_to_recordset($1::jsonb) AS r(provider text,provider_id text,
            player_id text,match_method text)`, values: [JSON.stringify(admittedIds)] });
        const counts = await client.query({ name: "warehouse-player-identity-stage-count-v1", text: `
          SELECT (SELECT count(*)::integer FROM stage_football_players) AS player_count,
                 (SELECT count(*)::integer FROM stage_football_player_ids) AS id_count` });
        if (counts.rows[0]?.player_count !== admittedPlayers.length ||
            counts.rows[0]?.id_count !== admittedIds.length) {
          throw new WarehouseIdentityIngestError("stage_count_mismatch", "staged identity counts did not match source rows");
        }
        const conflicts = await client.query({ name: "warehouse-player-identity-stage-conflicts-v1", text: `
          SELECT count(*)::integer AS invalid_count
          FROM stage_football_players s
          LEFT JOIN stage_football_player_ids i
            ON i.player_id=s.player_id AND i.provider='gsis' AND i.provider_id=s.gsis_id
          LEFT JOIN football.football_players p_by_id ON p_by_id.player_id=s.player_id
          LEFT JOIN football.football_players p_by_gsis ON p_by_gsis.gsis_id=s.gsis_id
          WHERE i.provider_id IS NULL
             OR (p_by_id.gsis_id IS NOT NULL AND p_by_id.gsis_id <> s.gsis_id)
             OR (p_by_gsis.player_id IS NOT NULL AND p_by_gsis.player_id <> s.player_id)` });
        if (conflicts.rows[0]?.invalid_count !== 0) {
          throw new WarehouseIdentityIngestError("identity_conflict", "staged GSIS identities conflict with canonical players");
        }
        await client.query({ name: "warehouse-player-identity-upsert-players-v1", text: `
          INSERT INTO football.football_players
            (player_id,gsis_id,display_name,first_name,last_name,football_position,birth_date,source_row,ingest_event_id)
          SELECT player_id,gsis_id,display_name,first_name,last_name,football_position,birth_date,source_row,$1
          FROM stage_football_players
          ON CONFLICT (player_id) DO UPDATE SET gsis_id=EXCLUDED.gsis_id,
            display_name=EXCLUDED.display_name,
            first_name=EXCLUDED.first_name,last_name=EXCLUDED.last_name,
            football_position=EXCLUDED.football_position,birth_date=EXCLUDED.birth_date,
            source_row=EXCLUDED.source_row,
            ingest_event_id=EXCLUDED.ingest_event_id`, values: [ingestEventId] });
        await client.query({ name: "warehouse-player-identity-delete-gsis-v1",
          text: "DELETE FROM football.football_player_ids WHERE provider='gsis'" });
        await client.query({ name: "warehouse-player-identity-promote-ids-v1", text: `
          INSERT INTO football.football_player_ids
            (provider,provider_id,player_id,match_method,ingest_event_id)
          SELECT provider,provider_id,player_id,match_method,$1 FROM stage_football_player_ids`,
          values: [ingestEventId] });
        const succeeded = await client.query({ name: "warehouse-player-identity-succeed-receipt-v1", text: `
          UPDATE football.warehouse_ingest_events SET state='succeeded',source_rows=$2,
            finished_at=clock_timestamp() WHERE id=$1 AND state='started'`,
          values: [ingestEventId, receipt.sourceRows] });
        if (succeeded.rowCount !== 1) throw new WarehouseIdentityIngestError("receipt_update_failed", "identity receipt did not reach succeeded state");
        await client.query("COMMIT");
        return { state: "succeeded", ingestEventId, sourceRows: receipt.sourceRows,
          writtenPlayers: admittedPlayers.length, writtenPlayerIds: admittedIds.length };
      } catch (error) {
        try { await client.query("ROLLBACK"); } catch {}
        await recordFailure(client, receipt, error);
        const safe = sanitizeError(error);
        throw new WarehouseIdentityIngestError(safe.code, safe.summary, { cause: error });
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createPlayerIdentityWriter, WarehouseIdentityIngestError, DATASET, MAX_ROWS };
