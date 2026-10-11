"use strict";

const { SCHEDULES_SOURCE_URL } = require("./scheduleSource");
const { runBoundedFailureReceipt, setLocalTransactionTimeouts, validateTransactionTimeouts } = require("./transactionTimeouts");

const DATASET = "schedules";
const RIGHTS_BASIS = "nflverse_open_data";
const HASH = /^sha256:[0-9a-f]{64}$/;
const RUN_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const TEAM_ID = /^omen:team:[a-z0-9]+$/;

class WarehouseScheduleIngestError extends Error {
  constructor(code, message, options) { super(message, options); this.name = "WarehouseScheduleIngestError"; this.code = code; }
}
function object(v, n) { if (!v || typeof v !== "object" || Array.isArray(v)) throw new TypeError(`${n} must be an object`); return v; }
function string(v, n, p, max = Infinity) { if (typeof v !== "string" || !p.test(v) || v.length > max) throw new TypeError(`${n} is invalid`); return v; }
function integer(v, n, min, max) { if (!Number.isInteger(v) || v < min || v > max) throw new TypeError(`${n} must be an integer from ${min} through ${max}`); return v; }
function optionalString(v, n, max) { return v == null ? null : string(v, n, /^.+$/, max); }
function optionalInteger(v, n, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) { return v == null ? null : integer(v, n, min, max); }
function optionalNumber(v, n) { if (v == null) return null; if (typeof v !== "number" || !Number.isFinite(v)) throw new TypeError(`${n} must be finite or null`); return v; }
function optionalBoolean(v, n) { if (v == null) return null; if (typeof v !== "boolean") throw new TypeError(`${n} must be boolean or null`); return v; }
function receipt(value) {
  object(value, "receipt"); const metadata = object(value.metadata, "receipt.metadata");
  string(metadata.schema_fingerprint, "receipt.metadata.schema_fingerprint", HASH);
  if (!Array.isArray(metadata.source_columns) || !metadata.source_columns.length || metadata.source_columns.some((v) => typeof v !== "string" || !v)) throw new TypeError("receipt.metadata.source_columns must be a nonempty string array");
  integer(metadata.selected_rows, "receipt.metadata.selected_rows", 1, Number.MAX_SAFE_INTEGER);
  integer(metadata.preseason_rows ?? 0, "receipt.metadata.preseason_rows", 0, Number.MAX_SAFE_INTEGER);
  string(value.sourceUrl, "receipt.sourceUrl", /^https:\/\/\S+$/); const parsed = new URL(value.sourceUrl);
  if (parsed.username || parsed.password || value.sourceUrl !== SCHEDULES_SOURCE_URL) {
    throw new TypeError("receipt.sourceUrl is not the allowlisted schedules asset");
  }
  return { runId: string(value.runId, "receipt.runId", RUN_ID), sourceUrl: value.sourceUrl,
    sourceRef: string(value.sourceRef, "receipt.sourceRef", HASH), sourceBytes: integer(value.sourceBytes,"receipt.sourceBytes",0,Number.MAX_SAFE_INTEGER),
    sourceRows: integer(value.sourceRows,"receipt.sourceRows",1,Number.MAX_SAFE_INTEGER), metadata: { ...metadata, source_columns: [...metadata.source_columns] } };
}
function game(row, index, season) {
  object(row, `gameRows[${index}]`); if (row.season !== season) throw new TypeError(`gameRows[${index}].season must match season`);
  const awayScore = optionalInteger(row.awayScore, `gameRows[${index}].awayScore`, 0, 255);
  const homeScore = optionalInteger(row.homeScore, `gameRows[${index}].homeScore`, 0, 255);
  if ((awayScore == null) !== (homeScore == null)) throw new TypeError(`gameRows[${index}] scores must be paired`);
  return { season, game_id: string(row.gameId,`gameRows[${index}].gameId`,/^.{1,64}$/), week: integer(row.week,`gameRows[${index}].week`,1,23),
    game_type: string(row.gameType,`gameRows[${index}].gameType`,/^(REG|WC|DIV|CON|SB)$/), kickoff_at: row.kickoffAt == null ? null : string(row.kickoffAt,`gameRows[${index}].kickoffAt`,/^\d{4}-\d{2}-\d{2}T\S+$/),
    away_team_id: string(row.awayTeamId,`gameRows[${index}].awayTeamId`,TEAM_ID), home_team_id: string(row.homeTeamId,`gameRows[${index}].homeTeamId`,TEAM_ID),
    away_score: awayScore, home_score: homeScore, overtime: optionalBoolean(row.overtime,`gameRows[${index}].overtime`), stadium: optionalString(row.stadium,`gameRows[${index}].stadium`,256),
    location: optionalString(row.location,`gameRows[${index}].location`,256), roof: optionalString(row.roof,`gameRows[${index}].roof`,64), surface: optionalString(row.surface,`gameRows[${index}].surface`,64),
    temperature_f: optionalInteger(row.temperatureF,`gameRows[${index}].temperatureF`,-100,200), wind_mph: optionalInteger(row.windMph,`gameRows[${index}].windMph`,0,300),
    away_rest_days: optionalInteger(row.awayRestDays,`gameRows[${index}].awayRestDays`,0,365), home_rest_days: optionalInteger(row.homeRestDays,`gameRows[${index}].homeRestDays`,0,365),
    division_game: optionalBoolean(row.divisionGame,`gameRows[${index}].divisionGame`), spread_line: optionalNumber(row.spreadLine,`gameRows[${index}].spreadLine`), total_line: optionalNumber(row.totalLine,`gameRows[${index}].totalLine`),
    away_moneyline: optionalInteger(row.awayMoneyline,`gameRows[${index}].awayMoneyline`), home_moneyline: optionalInteger(row.homeMoneyline,`gameRows[${index}].homeMoneyline`),
    away_coach: optionalString(row.awayCoach,`gameRows[${index}].awayCoach`,128), home_coach: optionalString(row.homeCoach,`gameRows[${index}].homeCoach`,128), source_row: object(row.sourceRow,`gameRows[${index}].sourceRow`) };
}
function safe(error) { const code = typeof error?.code === "string" && /^[A-Za-z0-9_]{1,64}$/.test(error.code) ? error.code : "warehouse_schedule_ingest_failed";
  const message = error instanceof WarehouseScheduleIngestError ? error.message : "schedule ingest failed";
  return { code, summary: String(message).replace(/(?:postgres(?:ql)?:\/\/|password=)[^\s]+/gi,"[redacted]").replace(/[\u0000-\u001f\u007f]+/g," ").slice(0,500) }; }
async function failed(client, r, season, error) { const f = safe(error); await runBoundedFailureReceipt(client,()=>client.query({ name:"warehouse-schedule-failed-receipt-v1", text:`INSERT INTO football.warehouse_ingest_events (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,source_rows,state,finished_at,error_code,error_summary,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'failed',clock_timestamp(),$9,$10,$11::jsonb) ON CONFLICT (run_id,dataset,season) DO UPDATE SET source_url=EXCLUDED.source_url,source_ref=EXCLUDED.source_ref,source_bytes=EXCLUDED.source_bytes,source_rows=EXCLUDED.source_rows,state='failed',finished_at=clock_timestamp(),error_code=EXCLUDED.error_code,error_summary=EXCLUDED.error_summary,metadata=EXCLUDED.metadata WHERE football.warehouse_ingest_events.state <> 'succeeded' AND football.warehouse_ingest_events.source_ref = EXCLUDED.source_ref`, values:[r.runId,DATASET,season,RIGHTS_BASIS,r.sourceUrl,r.sourceRef,r.sourceBytes,r.sourceRows,f.code,f.summary,JSON.stringify(r.metadata)] })); }

function createScheduleWriter({ pool, transactionTimeouts } = {}) {
  if (!pool || typeof pool.connect !== "function") throw new TypeError("pool.connect must be a function");
  const timeouts=validateTransactionTimeouts(transactionTimeouts);
  return { async writeSeason({ receipt: rawReceipt, season, gameRows }) {
    const r=receipt(rawReceipt); integer(season,"season",1999,2100);
    if (!Array.isArray(gameRows)||!gameRows.length) throw new RangeError("gameRows must be a nonempty array");
    if (r.metadata.selected_rows !== gameRows.length || r.sourceRows < gameRows.length + r.metadata.preseason_rows) throw new RangeError("schedule receipt counts do not match admitted rows");
    const rows=gameRows.map((v,i)=>game(v,i,season)); const keys=new Set();
    for (const row of rows) { if (row.away_team_id===row.home_team_id) throw new TypeError("game teams must differ"); if(keys.has(row.game_id)) throw new TypeError("gameRows contain duplicate game ids"); keys.add(row.game_id); }
    const client=await pool.connect();
    try {
      await client.query("BEGIN");
      await setLocalTransactionTimeouts(client,timeouts);
      await client.query({name:"warehouse-schedule-lock-v1",text:"SELECT pg_advisory_xact_lock(hashtext($1),$2)",values:[DATASET,season]});
      const existing=await client.query({name:"warehouse-schedule-existing-v1",text:"SELECT id FROM football.warehouse_ingest_events WHERE dataset=$1 AND season=$2 AND source_ref=$3 AND state='succeeded' ORDER BY finished_at DESC LIMIT 1",values:[DATASET,season,r.sourceRef]});
      if(existing.rows.length){await client.query("COMMIT");return{state:"unchanged",ingestEventId:existing.rows[0].id,season,writtenGames:rows.length};}
      const run=await client.query({name:"warehouse-schedule-run-v1",text:"SELECT id,state,source_ref FROM football.warehouse_ingest_events WHERE run_id=$1 AND dataset=$2 AND season=$3 ORDER BY id DESC LIMIT 1",values:[r.runId,DATASET,season]});
      if(run.rows[0]?.state==="succeeded"||(run.rows[0]&&run.rows[0].source_ref!==r.sourceRef))throw new WarehouseScheduleIngestError("run_id_conflict","run id already belongs to another schedule ingest");
      const started=run.rows.length?await client.query({name:"warehouse-schedule-restart-receipt-v1",text:"UPDATE football.warehouse_ingest_events SET source_url=$2,source_ref=$3,source_bytes=$4,source_rows=NULL,state='started',started_at=clock_timestamp(),finished_at=NULL,error_code=NULL,error_summary=NULL,metadata=$5::jsonb WHERE id=$1 AND state='failed' RETURNING id",values:[run.rows[0].id,r.sourceUrl,r.sourceRef,r.sourceBytes,JSON.stringify(r.metadata)]}):await client.query({name:"warehouse-schedule-start-receipt-v1",text:"INSERT INTO football.warehouse_ingest_events (run_id,dataset,season,rights_basis,source_url,source_ref,source_bytes,state,metadata) VALUES ($1,$2,$3,$4,$5,$6,$7,'started',$8::jsonb) RETURNING id",values:[r.runId,DATASET,season,RIGHTS_BASIS,r.sourceUrl,r.sourceRef,r.sourceBytes,JSON.stringify(r.metadata)]});
      if(!started.rows.length)throw new WarehouseScheduleIngestError("run_id_conflict","schedule receipt could not be started"); const id=started.rows[0].id;
      await client.query({name:"warehouse-schedule-create-stage-v1",text:"CREATE TEMP TABLE stage_nfl_games (LIKE football.nfl_games INCLUDING DEFAULTS) ON COMMIT DROP"});
      await client.query({name:"warehouse-schedule-stage-v1",text:`INSERT INTO stage_nfl_games (season,game_id,week,game_type,kickoff_at,away_team_id,home_team_id,away_score,home_score,overtime,stadium,location,roof,surface,temperature_f,wind_mph,away_rest_days,home_rest_days,division_game,spread_line,total_line,away_moneyline,home_moneyline,away_coach,home_coach,source_row,ingest_event_id) SELECT season,game_id,week,game_type,kickoff_at,away_team_id,home_team_id,away_score,home_score,overtime,stadium,location,roof,surface,temperature_f,wind_mph,away_rest_days,home_rest_days,division_game,spread_line,total_line,away_moneyline,home_moneyline,away_coach,home_coach,source_row,$2 FROM jsonb_to_recordset($1::jsonb) AS r(season integer,game_id text,week integer,game_type text,kickoff_at timestamptz,away_team_id text,home_team_id text,away_score smallint,home_score smallint,overtime boolean,stadium text,location text,roof text,surface text,temperature_f smallint,wind_mph smallint,away_rest_days smallint,home_rest_days smallint,division_game boolean,spread_line numeric, total_line numeric,away_moneyline integer,home_moneyline integer,away_coach text,home_coach text,source_row jsonb)`,values:[JSON.stringify(rows),id]});
      const checks=await client.query({name:"warehouse-schedule-stage-check-v1",text:`SELECT count(*)::integer AS row_count,count(*) FILTER (WHERE t1.team_id IS NULL OR t2.team_id IS NULL)::integer AS missing_teams FROM stage_nfl_games g LEFT JOIN football.football_teams t1 ON t1.team_id=g.away_team_id LEFT JOIN football.football_teams t2 ON t2.team_id=g.home_team_id`,values:[]});
      if(checks.rows[0]?.row_count!==rows.length)throw new WarehouseScheduleIngestError("stage_count_mismatch","staged game count did not match admitted rows");
      if(checks.rows[0]?.missing_teams!==0)throw new WarehouseScheduleIngestError("unknown_team","staged schedules reference unknown teams");
      const dependencies=await client.query({name:"warehouse-schedule-dependent-facts-v1",text:`SELECT
        (SELECT count(*)::integer FROM football.nfl_player_weekly_stats WHERE season=$1) AS player_weekly_stats,
        (SELECT count(*)::integer FROM football.nfl_team_weekly_stats WHERE season=$1) AS team_weekly_stats,
        (SELECT count(*)::integer FROM football.nfl_weekly_rosters WHERE season=$1) AS weekly_rosters,
        (SELECT count(*)::integer FROM football.nfl_plays WHERE season=$1) AS plays`,values:[season]});
      const dependent=dependencies.rows[0]||{};
      const hasDependentFacts=dependent.player_weekly_stats!==0||dependent.team_weekly_stats!==0||dependent.weekly_rosters!==0||dependent.plays!==0;
      if(hasDependentFacts){
        const structure=await client.query({name:"warehouse-schedule-structural-diff-v1",text:`SELECT count(*)::integer AS invalid_count
          FROM (
            SELECT COALESCE(s.game_id,g.game_id) AS game_id
            FROM stage_nfl_games s
            FULL JOIN (SELECT game_id,week,game_type,away_team_id,home_team_id FROM football.nfl_games WHERE season=$1) g ON g.game_id=s.game_id
            WHERE s.game_id IS NULL OR g.game_id IS NULL
               OR s.week IS DISTINCT FROM g.week OR s.game_type IS DISTINCT FROM g.game_type
               OR s.away_team_id IS DISTINCT FROM g.away_team_id
               OR s.home_team_id IS DISTINCT FROM g.home_team_id
          ) changed`,values:[season]});
        if(structure.rows[0]?.invalid_count!==0){
          throw new WarehouseScheduleIngestError("dependent_facts_exist","schedule structure changed and requires a coordinated dependent-facts reload");
        }
        await client.query({name:"warehouse-schedule-refresh-context-v1",text:`UPDATE football.nfl_games g SET
          kickoff_at=s.kickoff_at,away_score=s.away_score,home_score=s.home_score,overtime=s.overtime,
          stadium=s.stadium,location=s.location,roof=s.roof,surface=s.surface,
          temperature_f=s.temperature_f,wind_mph=s.wind_mph,away_rest_days=s.away_rest_days,
          home_rest_days=s.home_rest_days,division_game=s.division_game,spread_line=s.spread_line,
          total_line=s.total_line,away_moneyline=s.away_moneyline,home_moneyline=s.home_moneyline,
          away_coach=s.away_coach,home_coach=s.home_coach,source_row=s.source_row,
          ingest_event_id=s.ingest_event_id
          FROM stage_nfl_games s WHERE g.season=$1 AND g.game_id=s.game_id`,values:[season]});
      }else{
        await client.query({name:"warehouse-schedule-delete-season-v1",text:"DELETE FROM football.nfl_games WHERE season=$1",values:[season]});
        await client.query({name:"warehouse-schedule-promote-v1",text:`INSERT INTO football.nfl_games
          (season,game_id,week,game_type,kickoff_at,away_team_id,home_team_id,away_score,home_score,
           overtime,stadium,location,roof,surface,temperature_f,wind_mph,away_rest_days,home_rest_days,
           division_game,spread_line,total_line,away_moneyline,home_moneyline,away_coach,home_coach,
           source_row,ingest_event_id)
          SELECT season,game_id,week,game_type,kickoff_at,away_team_id,home_team_id,away_score,home_score,
           overtime,stadium,location,roof,surface,temperature_f,wind_mph,away_rest_days,home_rest_days,
           division_game,spread_line,total_line,away_moneyline,home_moneyline,away_coach,home_coach,
           source_row,ingest_event_id FROM stage_nfl_games`,values:[]});
      }
      const done=await client.query({name:"warehouse-schedule-succeed-receipt-v1",text:"UPDATE football.warehouse_ingest_events SET state='succeeded',source_rows=$2,finished_at=clock_timestamp() WHERE id=$1 AND state='started'",values:[id,r.sourceRows]});
      if(done.rowCount!==1)throw new WarehouseScheduleIngestError("receipt_update_failed","schedule receipt did not reach succeeded state");
      await client.query("COMMIT");return{state:"succeeded",ingestEventId:id,season,writtenGames:rows.length};
    }catch(error){try{await client.query("ROLLBACK");}catch{} await failed(client,r,season,error);const f=safe(error);throw new WarehouseScheduleIngestError(f.code,f.summary,{cause:error});}finally{client.release();}
  }};
}
module.exports={createScheduleWriter,WarehouseScheduleIngestError,DATASET};
