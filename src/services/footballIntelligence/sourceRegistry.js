"use strict";

const SOURCE_ADMISSIONS = Object.freeze({
  play_by_play: Object.freeze({
    status: "admitted",
    owner: "nflverse",
    allowed_uses: Object.freeze(["current_denominator", "historical_replay"]),
    license: "CC BY 4.0",
  }),
  schedules: Object.freeze({
    status: "admitted",
    owner: "nflverse",
    allowed_uses: Object.freeze(["identity_context", "historical_replay"]),
    license: "CC BY 4.0",
  }),
  pbp_participation: Object.freeze({
    status: "admitted_historical_only",
    owner: "nflverse",
    allowed_uses: Object.freeze(["historical_calibration", "historical_replay"]),
    license: "CC BY-SA 4.0",
  }),
  ftn_charting: Object.freeze({
    status: "admitted_coverage_gated",
    owner: "FTN Data via nflverse",
    allowed_uses: Object.freeze(["tactical_enrichment", "historical_calibration"]),
    license: "CC BY-SA 4.0",
  }),
});

function getSourceAdmission(family) {
  return SOURCE_ADMISSIONS[family] || null;
}

function assertSourceAdmission({ family, intendedUse, owner, license }, fail) {
  const admission = getSourceAdmission(family);
  if (!admission) fail("SOURCE_NOT_ADMITTED", `source family is not admitted: ${family}`);
  if (!admission.allowed_uses.includes(intendedUse)) {
    fail("SOURCE_USE_NOT_ADMITTED", `${family} is not admitted for ${intendedUse}`);
  }
  if (owner !== admission.owner) {
    fail("SOURCE_AUTHORITY_MISMATCH", `${family} owner must be ${admission.owner}`);
  }
  if (license !== admission.license) {
    fail("SOURCE_RIGHTS_MISMATCH", `${family} license must be ${admission.license}`);
  }
  return admission;
}

module.exports = { SOURCE_ADMISSIONS, assertSourceAdmission, getSourceAdmission };
