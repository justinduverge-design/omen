"use strict";

const CANONICAL_FORMATS = new Set(["standard", "half_ppr", "ppr"]);
const STORED_LABELS = Object.freeze({ standard: "Standard", half_ppr: "Half PPR", ppr: "PPR" });

function normalizeScoringFormat(value, fallback = null) {
  if (value == null || String(value).trim() === "") return fallback;
  const normalized = String(value).trim().toLowerCase().replace(/[\s-]+/g, "_");
  return CANONICAL_FORMATS.has(normalized) ? normalized : fallback;
}

function scoringFormatFromReceptionPoints(value) {
  const points = Number(value);
  if (!Number.isFinite(points)) return null;
  if (Math.abs(points) < 0.0001) return "standard";
  if (Math.abs(points - 0.5) < 0.0001) return "half_ppr";
  if (Math.abs(points - 1) < 0.0001) return "ppr";
  return null;
}

function storedScoringFormat(value, fallback = null) {
  const canonical = normalizeScoringFormat(value, fallback);
  return canonical ? STORED_LABELS[canonical] : null;
}

module.exports = { CANONICAL_FORMATS, normalizeScoringFormat, scoringFormatFromReceptionPoints, storedScoringFormat };
