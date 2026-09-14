"use strict";
function starterInjuryState(roster) {
  const players = roster?.slots?.starters;
  if (!Array.isArray(players) || !players.length) return null;
  const statuses = players.map((p) => String(p.status || "").toUpperCase());
  if (statuses.some((s) => ["O", "OUT", "IR", "IR-R", "PUP", "SUSP", "Q", "QUESTIONABLE", "GTD", "DTD", "DOUBTFUL"].includes(s))) return true;
  return statuses.every((s) => ["ACTIVE", "HEALTHY", "A"].includes(s)) ? false : null;
}

function quietWeek(body, lastResult) {
  const eligible = body?.state === "empty" && body.platform?.status === "connected";
  const reasons = [];
  if (eligible) {
    if (lastResult === "L") reasons.push("recent_loss");
    else if (lastResult !== "W") reasons.push("recent_result_unknown");
    if (body.quiet_inputs?.injured_starter === true) reasons.push("injured_starter");
    else if (body.quiet_inputs?.injured_starter !== false) reasons.push("starter_health_unknown");
    if (body.signals?.roster?.status !== "live" || Object.values(body.signals || {}).some((s) => s.used === true && s.status !== "live")) reasons.push("provider_read_incomplete");
  }
  return {
    contract_version: "quiet-week.v1", eligible,
    variant: eligible ? (reasons.length ? "straight" : "neutral") : null,
    reasons, source_state: body?.state || "unavailable",
  };
}
module.exports = { quietWeek, starterInjuryState };
