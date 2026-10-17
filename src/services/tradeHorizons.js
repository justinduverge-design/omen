"use strict";

/**
 * Trade calls graded over three horizons (step 18, decision_horizon_grades):
 *
 *   week     the week the trade was suggested
 *   next_4   that week and the three after it
 *   season   that week through the last finished week
 *
 * Each horizon sums the received player's points against the given player's, from public warehouse stat lines in
 * the call's scoring format, so provenance is an estimate. A horizon is rewritten every Tuesday until it closes
 * (complete). A week with no lines yet stops the count there; it is never read as zero for both players.
 */

const HORIZONS = Object.freeze({ week: 1, next_4: 4, season: 18 });
const LABELS = Object.freeze({ ppr: "PPR", half_ppr: "Half PPR", standard: "Standard" });
const PLAYER_KEY = /^(yahoo|espn|sleeper):([0-9A-Za-z_-]{1,64})$/;
const LAST_REG_WEEK = 18;

function refOf(decision, which) {
  const id = decision?.recommendation?.[which]?.id;
  const match = typeof id === "string" ? PLAYER_KEY.exec(id) : null;
  return match ? { provider: match[1], providerId: match[2] } : null;
}

/** Points for one line in the call's format; a resolved player with no line played 0; unresolved is null. */
function linePoints(line, label) {
  if (!line || !line.resolved) return null;
  if (!line.hasLine) return 0;
  if (label === "PPR") return line.ppr;
  if (!Number.isFinite(line.receptions)) return null;
  return label === "Half PPR" ? line.ppr - line.receptions / 2 : line.ppr - line.receptions;
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Pure: given per-week lines for the two players, the three horizon rows for one trade.
 * weeks: Map(week -> { received, given } lines) for every finished week from the trade week on.
 */
function horizonRows({ decision, weeks, lastFinishedWeek }) {
  const label = LABELS[decision.scoring_format] || decision.scoring_format || "PPR";
  const from = Number(decision.week);
  const rows = [];
  for (const [horizon, length] of Object.entries(HORIZONS)) {
    const end = Math.min(from + length - 1, LAST_REG_WEEK);
    let received = 0;
    let given = 0;
    let counted = 0;
    let through = null;
    for (let week = from; week <= Math.min(end, lastFinishedWeek); week += 1) {
      const pair = weeks.get(week);
      const r = linePoints(pair?.received, label);
      const g = linePoints(pair?.given, label);
      if (r == null || g == null) break;
      received += r;
      given += g;
      counted += 1;
      through = week;
    }
    if (!counted) continue;
    const margin = round2(received - given);
    rows.push({
      decision_id: decision.id,
      user_id: decision.user_id,
      horizon,
      from_week: from,
      through_week: through,
      weeks_counted: counted,
      received_points: round2(received),
      given_points: round2(given),
      margin,
      result: margin >= 0 ? "win" : "loss",
      // The season horizon closes only when the regular season does.
      complete: through === end && (horizon !== "season" || end === LAST_REG_WEEK),
      provenance: "legacy_estimate",
      scoring_format: decision.scoring_format || null,
      updated_at: new Date().toISOString(),
    });
  }
  return rows;
}

/**
 * Tuesday step: grade every trade call of the season over its horizons. Never throws; returns a tally.
 * deps: { repository (warehouse readWeekOutcomes), resolveGsis(keys) -> Map, now }
 */
async function scoreTradeHorizons(supabase, { season, lastFinishedWeek, repository, resolveGsis = null, log = null }) {
  const tally = { trades: 0, written: 0, skipped: 0, failed: 0 };
  if (typeof supabase?.from !== "function" || !repository || !Number.isInteger(lastFinishedWeek) || lastFinishedWeek < 1) return tally;
  try {
    const { data: decisions, error } = await supabase.from("ledger_current_calls")
      .select("id,user_id,season,week,call_type,scoring_format,recommendation")
      .eq("season", season).eq("call_type", "trade_suggestion").lte("week", lastFinishedWeek);
    if (error) throw error;
    if (!decisions?.length) return tally;
    const ids = decisions.map((d) => d.id);
    const { data: done } = await supabase.from("decision_horizon_grades")
      .select("decision_id,horizon,complete").in("decision_id", ids);
    const closed = new Set((done || []).filter((r) => r.complete).map((r) => `${r.decision_id}|${r.horizon}`));
    const { data: actions } = await supabase.from("decision_actions").select("decision_id,followed").in("decision_id", ids);
    const declined = new Set((actions || []).filter((a) => a.followed === false).map((a) => a.decision_id));

    const open = decisions.filter((d) => !declined.has(d.id)
      && Object.keys(HORIZONS).some((h) => !closed.has(`${d.id}|${h}`))
      && refOf(d, "primary_player") && refOf(d, "comparison_player"));
    tally.trades = open.length;
    tally.skipped = decisions.length - open.length;
    if (!open.length) return tally;

    // Provider ids -> GSIS once, then one warehouse read per finished week.
    const keys = [...new Set(open.flatMap((d) => ["primary_player", "comparison_player"].map((w) => refOf(d, w)))
      .map((r) => `${r.provider}:${r.providerId}`))];
    let gsis = new Map();
    if (typeof resolveGsis === "function") { try { gsis = await resolveGsis(keys); } catch { gsis = new Map(); } }
    const lookup = (r) => (gsis.get(`${r.provider}:${r.providerId}`) ? { provider: "gsis", providerId: String(gsis.get(`${r.provider}:${r.providerId}`)) } : r);
    const keyOf = (r) => `${r.provider}:${r.providerId}`;
    const refs = [...new Map(open.flatMap((d) => ["primary_player", "comparison_player"].map((w) => lookup(refOf(d, w))))
      .map((r) => [keyOf(r), r])).values()];
    const firstWeek = Math.min(...open.map((d) => Number(d.week)));
    const byWeek = new Map();
    for (let week = firstWeek; week <= lastFinishedWeek; week += 1) {
      byWeek.set(week, await repository.readWeekOutcomes({ refs, season, week }));
    }

    for (const decision of open) {
      try {
        const received = keyOf(lookup(refOf(decision, "primary_player")));
        const given = keyOf(lookup(refOf(decision, "comparison_player")));
        const weeks = new Map([...byWeek].map(([week, lines]) => [week, { received: lines.get(received), given: lines.get(given) }]));
        const rows = horizonRows({ decision, weeks, lastFinishedWeek })
          .filter((row) => !closed.has(`${row.decision_id}|${row.horizon}`));
        if (!rows.length) continue;
        const { error: writeError } = await supabase.from("decision_horizon_grades").upsert(rows, { onConflict: "decision_id,horizon" });
        if (writeError) throw writeError;
        tally.written += rows.length;
      } catch (error) {
        tally.failed += 1;
        try { log?.warn?.(`Trade horizon for ${decision.id} failed (${error.code || error.name})`); } catch { /* never throws */ }
      }
    }
  } catch (error) {
    tally.failed += 1;
    try { log?.warn?.(`Trade horizons unavailable (${error.code || error.name})`); } catch { /* never throws */ }
  }
  return tally;
}

module.exports = { HORIZONS, horizonRows, linePoints, scoreTradeHorizons };
