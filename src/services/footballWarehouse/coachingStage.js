"use strict";

const { TEAMS } = require("../footballIntelligence/nflTeams");
const { fetchTeamSeason, coachIdFor } = require("./coachingSource");

const FIRST_SEASON = 1999;
// Wikipedia rate-limits bursts (the first run got 47 pages before 843 refusals), so each daily run reads at most
// 150 pages at about one a second and stops at the first refusal; the backfill completes over a few days.
const MAX_PAGES_PER_RUN = 150;
const PAUSE_MS = 1000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The coach-graph stage. Each run reads every team-season that has no head coach recorded yet (the 1999-onward
 * backfill on the first run) plus the current season (staff change during a year), then writes coaches and
 * assignments in one transaction under a coach_index_runs receipt. Reported, never fatal to the ingest.
 */
function createCoachingStage({ pool, fetchImpl = globalThis.fetch, pauseMs = PAUSE_MS, now = () => new Date() }) {
  return {
    async run({ season }) {
      const existing = await pool.query({
        name: "coach-existing-v1",
        text: "SELECT DISTINCT team_id, season FROM football.coach_assignments WHERE role = 'head_coach'",
      });
      const have = new Set(existing.rows.map((r) => `${r.team_id}|${r.season}`));
      // The current season first (staffs change during a year), then missing seasons newest first.
      const wanted = [];
      for (let s = season; s >= FIRST_SEASON; s -= 1) {
        for (const abbr of Object.keys(TEAMS)) {
          const teamId = `omen:team:${abbr.toLowerCase()}`;
          if (s === season || !have.has(`${teamId}|${s}`)) wanted.push({ abbr, teamId, season: s });
        }
      }
      const pages = [];
      let failed = 0;
      for (const item of wanted.slice(0, MAX_PAGES_PER_RUN)) {
        try {
          const page = await fetchTeamSeason({ abbr: item.abbr, season: item.season, fetchImpl });
          if (page && page.staff.length) pages.push({ ...item, page });
        } catch (error) {
          failed += 1;
          if (/source_http_(429|503)/.test(error?.code || "")) break; // refused: stop, keep what we have, resume tomorrow
        }
        if (pauseMs) await sleep(pauseMs);
      }
      if (!pages.length) return { state: "unchanged", requested: wanted.length, failed };

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SET LOCAL lock_timeout = '5s'");
        const assignments = pages.reduce((sum, p) => sum + p.page.staff.length, 0);
        const run = await client.query({
          name: "coach-run-v1",
          text: `
          INSERT INTO football.coach_index_runs (source, rights_basis, pages, assignments, fetched_at)
          VALUES ('wikipedia_team_seasons', 'wikipedia_cc_by_sa_facts', $1, $2, $3) RETURNING id`,
          values: [pages.length, assignments, now().toISOString()],
        });
        const runId = run.rows[0].id;
        const coaches = new Map();
        const rows = [];
        for (const { teamId, season: s, page } of pages) {
          for (const member of page.staff) {
            const coachId = coachIdFor(member.coachTitle);
            if (!coaches.has(coachId))
              coaches.set(coachId, {
                coach_id: coachId,
                display_name: member.coachName.slice(0, 120),
                source_title: member.coachTitle,
              });
            rows.push({
              coach_id: coachId,
              team_id: teamId,
              season: s,
              role: member.role,
              source_title: page.title,
              source_revision: page.revisionId,
              source_ref: page.sourceRef,
            });
          }
        }
        await client.query({
          name: "coach-insert-coaches-v1",
          text: `
          INSERT INTO football.coaches (coach_id, display_name, source_title, index_run_id)
          SELECT c.coach_id, c.display_name, c.source_title, $2 FROM jsonb_to_recordset($1::jsonb) AS c(coach_id text, display_name text, source_title text)
          ON CONFLICT DO NOTHING`,
          values: [JSON.stringify([...coaches.values()]), runId],
        });
        const inserted = await client.query({
          name: "coach-insert-assignments-v1",
          text: `
          INSERT INTO football.coach_assignments (coach_id, team_id, season, role, source_title, source_revision, source_ref, index_run_id)
          SELECT a.coach_id, a.team_id, a.season, a.role, a.source_title, a.source_revision, a.source_ref, $2
            FROM jsonb_to_recordset($1::jsonb) AS a(coach_id text, team_id text, season integer, role text, source_title text, source_revision bigint, source_ref text)
            JOIN football.coaches c ON c.coach_id = a.coach_id
          ON CONFLICT DO NOTHING`,
          values: [JSON.stringify(rows), runId],
        });
        await client.query("COMMIT");
        return {
          state: "succeeded",
          pages: pages.length,
          failed,
          coaches: coaches.size,
          assignmentsWritten: inserted.rowCount,
        };
      } catch (error) {
        try {
          await client.query("ROLLBACK");
        } catch {
          /* keep the original error */
        }
        throw error;
      } finally {
        client.release();
      }
    },
  };
}

module.exports = { createCoachingStage };
