"use strict";

// Locked copy per variant, `CommandQuiet.dc.html` / `CommandQuietStraight.dc.html`. Reason
// clauses are composed from the same `reasons` codes the client already decodes — no
// per-user specifics (scores, player names) are invented here; those live on the screens
// that actually own that evidence (Omen destination, Waiver Watch).
const REASON_CLAUSES = {
  recent_loss: "last week didn't go your way",
  recent_result_unknown: "last week's result isn't confirmed yet",
  injured_starter: "a starter is banged up",
  starter_health_unknown: "a starter's health isn't confirmed",
  provider_read_incomplete: "some of this week's data didn't come through clean",
};

function joinClauses(clauses) {
  if (clauses.length === 0) return null;
  if (clauses.length === 1) return clauses[0];
  if (clauses.length === 2) return `${clauses[0]}, and ${clauses[1]}`;
  return `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;
}

function quietCopy(variant, reasons) {
  if (variant === "neutral") {
    return {
      headline: "Nothing worth waking you for.",
      body: "Your roster is set, nobody's a must-start change, and there's no waiver claim worth a look. Nothing here needs your attention.",
    };
  }
  if (variant === "straight") {
    const clauses = reasons.map((r) => REASON_CLAUSES[r]).filter(Boolean);
    const clause = joinClauses(clauses);
    return {
      headline: "Nothing worth moving for.",
      body: clause
        ? `${clause[0].toUpperCase()}${clause.slice(1)} — but there's still nothing worth moving for. Holding is the call.`
        : "Nothing worth moving for this week. Holding is the call.",
    };
  }
  return { headline: null, body: null };
}

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
  const variant = eligible ? (reasons.length ? "straight" : "neutral") : null;
  const copy = quietCopy(variant, reasons);
  return {
    contract_version: "quiet-week.v1", eligible,
    variant,
    reasons, source_state: body?.state || "unavailable",
    headline: copy.headline,
    body: copy.body,
    next_read: eligible ? "Next read · Tuesday 3:00 AM waivers" : null,
  };
}
module.exports = { quietWeek, starterInjuryState };
