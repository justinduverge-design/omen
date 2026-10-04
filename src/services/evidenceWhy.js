"use strict";

/**
 * Deterministic "why" built from tagged evidence rows (engine step 5).
 *
 * Omen explains the provider's projection; it does not out-predict it. This module turns the
 * ordered evidence rows (closed vocabulary: evidenceVocabulary.js START_SIT) into at most three
 * plain-language statements. The rules, enforced here and in test/evidenceWhy.test.js:
 *
 *  - Every statement is a row's own statement verbatim, so every number and name in it comes
 *    from a row. Nothing is computed, templated around a value, or invented.
 *  - Ranked by usefulness: observed facts first (recent usage, current status, points-breakdown
 *    reconciliation, team system), then the projection gap, then the limitation, then the
 *    inference, which comes last and is never presented as a prediction.
 *  - A limitation row is surfaced, not hidden: if one exists and the cap would drop every
 *    limitation, the first one replaces the lowest-ranked pick.
 *  - No usable rows yields one honest "not enough evidence" statement.
 *
 * Pure and synchronous. Output feeds new optional fields; it changes no existing one.
 */

const MAX_STATEMENTS = 3;
const MAX_PER_CATEGORY = 2;
const NOT_ENOUGH_EVIDENCE = "There is not enough evidence to explain this call beyond the provider's projection.";

// Rows that would claim Omen predicts or beats the provider are never promoted into a "why".
const OVERCLAIM = /\b(predict\w*|beats?|outperform\w*|guarantee\w*|will score)\b/i;

// Lower rank is shown first. Within a rank, row order is kept (stable).
function tierFor(row) {
  const { category, kind } = row;
  if (kind === "limitation" || category === "limitation") return { tier: "limitation", rank: 3 };
  if (category === "recent_usage" && kind === "verified") return { tier: "observed", rank: 0.0 };
  if (category === "current_status" && kind === "verified") return { tier: "observed", rank: 0.1 };
  if (category === "points_breakdown" && kind === "projected") return { tier: "observed", rank: 0.2 };
  if (category === "team_system" && kind === "observed_context") return { tier: "observed", rank: 0.3 };
  if (category === "player_game_fact" && kind === "projection") return { tier: "projection", rank: 2 };
  if (category === "omen_inference" && kind === "inference") return { tier: "inference", rank: 4 };
  // league_fact and anything unrecognized is context, not a reason.
  return null;
}

function cleanText(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function refFor(row, index) {
  return { id: row.id == null ? `evidence[${index}]` : String(row.id), category: row.category, kind: row.kind };
}

const byRank = (a, b) => a.rank - b.rank || a.index - b.index;

/**
 * @param {Array<{id?:string, category:string, kind:string, statement:string}>} rows ordered evidence rows
 * @returns {Array<{rank:number, text:string, basis:"observed"|"projection"|"limitation"|"inference", evidence:Array<{id:string,category:string,kind:string}>}>}
 */
function buildEvidenceWhy(rows) {
  const candidates = [];
  (Array.isArray(rows) ? rows : []).forEach((row, index) => {
    if (!row || typeof row !== "object") return;
    const text = cleanText(row.statement);
    if (!text || OVERCLAIM.test(text)) return;
    const placement = tierFor(row);
    if (!placement) return;
    candidates.push({ ...placement, index, text, ref: refFor(row, index) });
  });

  if (!candidates.length) {
    return [{ rank: 1, text: NOT_ENOUGH_EVIDENCE, basis: "limitation", evidence: [] }];
  }

  candidates.sort(byRank);

  const perCategory = new Map();
  const picked = [];
  for (const candidate of candidates) {
    const seen = perCategory.get(candidate.ref.category) || 0;
    if (seen >= MAX_PER_CATEGORY) continue;
    perCategory.set(candidate.ref.category, seen + 1);
    picked.push(candidate);
    if (picked.length === MAX_STATEMENTS) break;
  }

  // Honesty rule: never let the cap hide a limitation.
  if (!picked.some((c) => c.tier === "limitation")) {
    const limitation = candidates.find((c) => c.tier === "limitation");
    if (limitation) {
      if (picked.length === MAX_STATEMENTS) picked.pop();
      picked.push(limitation);
      picked.sort(byRank);
    }
  }

  return picked.map((candidate, i) => ({
    rank: i + 1,
    text: candidate.text,
    basis: candidate.tier,
    evidence: [candidate.ref],
  }));
}

const tokens = (text) => ({
  numbers: String(text).match(/\d+(?:\.\d+)?/g) || [],
  names: String(text).match(/\b[A-Z][a-zA-Z'.-]+(?:\s+[A-Z][a-zA-Z'.-]+)*/g) || [],
});

/**
 * True when every number and capitalized name token in each statement appears in the rows it
 * cites. Used by tests; available to callers that want a runtime assertion.
 */
function statementsAreGrounded(statements, rows) {
  const list = Array.isArray(rows) ? rows : [];
  return (statements || []).every((statement) => {
    if (!statement.evidence?.length) return statement.text === NOT_ENOUGH_EVIDENCE;
    const haystack = statement.evidence.map((ref) => {
      const match = /^evidence\[(\d+)\]$/.exec(ref.id);
      const row = match ? list[Number(match[1])] : list.find((r) => r && String(r.id) === ref.id);
      return cleanText(row?.statement);
    }).join(" ");
    const { numbers, names } = tokens(statement.text);
    return [...numbers, ...names].every((token) => haystack.includes(token));
  });
}

module.exports = { MAX_STATEMENTS, NOT_ENOUGH_EVIDENCE, buildEvidenceWhy, statementsAreGrounded };
