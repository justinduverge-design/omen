"use strict";

/**
 * The one confidence scale (decision_log 2026-10-04, "Honest confidence").
 *
 * Omen explains provider projections; it does not claim to beat them. Provider projections are
 * right about 52% of the time when the gap is within a point and about 82% at 8+ points
 * (Blueprints/specs/omen-decision-engine-v2.md), so a projection gap on its own can justify a lean
 * and never "Confident". "Confident" needs observed corroborating evidence (usage trend, a verified
 * injury designation, or other verified evidence already attached) AND a large enough gap.
 *
 * Every surface (optimizer, start/sit detail, decision brief, MVP move text) derives its label from
 * `assessConfidence` or `bandFromScore`. There is no second scale. Band labels are unchanged.
 */

const BANDS = Object.freeze({ CONFIDENT: "confident", LEANING: "leaning", COIN_FLIP: "coin_flip" });

const THRESHOLDS = Object.freeze({
  // Below this the two players are inside projection noise (provider ~52% right within a point).
  COIN_FLIP_BELOW: 1.5,
  // Smallest gap that can read Confident, and only with corroborating observed evidence.
  CONFIDENT_MIN_GAP: 4,
  // Observed-usage corroboration: minimum advantage for the player being started.
  USAGE_SNAP_SHARE_EDGE: 0.05,
  USAGE_TARGET_SHARE_EDGE: 0.03,
});

// Internal ordering values for legacy numeric fields. They are band representatives, never a
// probability, and are never rendered. bandFromScore(SCORE_FOR_BAND[b]) === b.
const SCORE_FOR_BAND = Object.freeze({ confident: 85, leaning: 68, coin_flip: 50 });
const SCORE_MIN = { confident: 80, leaning: 60 };

const OUT = new Set(["O", "OUT", "IR", "IR-R", "PUP", "SUSP"]);
const RISKY = new Set(["Q", "QUESTIONABLE", "GTD", "DTD", "DOUBTFUL"]);

const status = (s) => String(s || "").trim().toUpperCase();

function bandFromScore(score) {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  return score >= SCORE_MIN.confident ? BANDS.CONFIDENT : score >= SCORE_MIN.leaning ? BANDS.LEANING : BANDS.COIN_FLIP;
}

// Label vocabulary for the MVP move envelope (confidence.label); same bands, no extra scale.
const MVP_LABEL = Object.freeze({ confident: "high", leaning: "medium", coin_flip: "low" });
const BAND_TITLE = Object.freeze({ confident: "Confident", leaning: "Leaning", coin_flip: "Coin flip" });

function mvpLabelForBand(band) {
  return MVP_LABEL[band] || "low";
}

/** Prose for an explanation field: the band word and its reason, never a number. */
function bandSentence(band, reason) {
  const title = BAND_TITLE[band];
  return title ? `${title}. ${reason}` : String(reason || "");
}

function scoreForBand(band) {
  return SCORE_FOR_BAND[band] ?? null;
}

const rank = { coin_flip: 0, leaning: 1, confident: 2 };
const cap = (band, max) => (max && rank[band] > rank[max] ? max : band);

function kindsOf(corroboration) {
  const kinds = new Set();
  for (const item of Array.isArray(corroboration) ? corroboration : []) {
    const kind = typeof item === "string" ? item : item?.kind;
    if (typeof kind === "string" && kind.trim()) kinds.add(kind.trim());
  }
  return [...kinds];
}

const describe = (kinds) => kinds.map((k) => k.replace(/_/g, " ")).join(" and ");
const fmt = (n) => Number(n.toFixed(2));

/**
 * @param {object} input
 * @param {number} input.gap            projection gap in the recommended direction (points)
 * @param {Array<string|{kind:string}>} [input.corroboration] observed evidence that supports the call
 * @param {string} [input.startStatus]  status of the player being started
 * @param {string} [input.sitStatus]    status of the player being benched
 * @param {boolean} [input.closeCall]   caller already judged this a close call
 * @param {string} [input.maxBand]      hard ceiling for this surface
 * @returns {{band: string|null, reason: string}}
 */
function assessConfidence({ gap, corroboration = [], startStatus = null, sitStatus = null, closeCall = false, maxBand = null } = {}) {
  const g = typeof gap === "number" ? gap : Number(gap);
  if (!Number.isFinite(g)) {
    return { band: null, reason: "Omen has no projection gap to judge this call." };
  }
  const startOut = OUT.has(status(startStatus));
  const startRisky = RISKY.has(status(startStatus));
  const sitOut = OUT.has(status(sitStatus));
  const sitRisky = RISKY.has(status(sitStatus));
  const done = (band, reason) => ({ band: cap(band, maxBand), reason });

  if (startOut) return done(BANDS.COIN_FLIP, "The player this call would start is listed out, so there is no edge to trust.");
  if (sitOut) {
    return startRisky
      ? done(BANDS.LEANING, "The current starter is listed out, but the replacement carries an injury designation too.")
      : done(BANDS.CONFIDENT, "The current starter is listed out, so this slot needs a replacement regardless of projections.");
  }
  if (closeCall || g < THRESHOLDS.COIN_FLIP_BELOW) {
    return done(BANDS.COIN_FLIP, `The projection gap (${fmt(Math.max(g, 0))} pts) is inside normal projection variance.`);
  }

  const kinds = kindsOf(corroboration);
  if (sitRisky && !kinds.includes("injury_status")) kinds.push("injury_status");

  if (startRisky) {
    return done(BANDS.LEANING, "The player this call would start carries an injury designation, which caps this at a lean.");
  }
  if (kinds.length && g >= THRESHOLDS.CONFIDENT_MIN_GAP) {
    return done(BANDS.CONFIDENT, `A ${fmt(g)} pt projection gap is backed by observed ${describe(kinds)}.`);
  }
  if (kinds.length) {
    return done(BANDS.LEANING, `Observed ${describe(kinds)} agrees, but the ${fmt(g)} pt projection gap is under ${THRESHOLDS.CONFIDENT_MIN_GAP} pts.`);
  }
  return done(BANDS.LEANING, `This rests on the provider projection gap (${fmt(g)} pts) alone, with no observed evidence behind it, so it stays a lean.`);
}

/** Does observed recent usage favor the player being started? Returns "recent_usage" evidence or null. */
function usageCorroboration(startUsage, sitUsage) {
  if (!startUsage || !sitUsage) return null;
  const edge = (key, min) => {
    const a = startUsage[key];
    const b = sitUsage[key];
    return typeof a === "number" && typeof b === "number" ? (a - b >= min ? 1 : b - a >= min ? -1 : 0) : 0;
  };
  const votes = [
    edge("snap_share", THRESHOLDS.USAGE_SNAP_SHARE_EDGE),
    edge("target_share", THRESHOLDS.USAGE_TARGET_SHARE_EDGE),
  ];
  return votes.some((v) => v > 0) && !votes.some((v) => v < 0) ? { kind: "recent_usage" } : null;
}

module.exports = {
  BANDS,
  THRESHOLDS,
  assessConfidence,
  bandFromScore,
  scoreForBand,
  mvpLabelForBand,
  bandSentence,
  usageCorroboration,
  OUT_STATUSES: OUT,
  RISKY_STATUSES: RISKY,
};
