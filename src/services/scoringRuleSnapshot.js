"use strict";

/**
 * A6 — turn a provider's own league rules into the canonical Omen Scoring
 * Contract, or say explicitly why it cannot.
 *
 * The defect A6 exists to fix: `scoreMove` graded every recommendation as PPR,
 * so a standard or half-PPR league was graded against points its rules do not
 * award. The fix is not "add two more labels" — a reception count is one rule
 * out of dozens. It is a versioned contract derived from the league's real
 * settings, with explicit coverage when a rule cannot be reproduced.
 *
 * The governing rule from scoringContract.js holds here: **an unknown provider
 * key is never treated as a zero-point rule.** A setting Omen cannot map makes
 * the whole contract `ambiguous`, because silently dropping it produces a score
 * that looks exact and is not.
 *
 * SECURITY: a snapshot carries league rules only. No cookie, token, roster,
 * manager identity, or league name ever enters it or its hash.
 */

const crypto = require("node:crypto");
const { EVENT_KEYS, SCORING_CONTRACT_VERSION } = require("./scoringContract");

/**
 * Sleeper publishes the user's own league settings on the league object Omen
 * already reads to serve that league. Mapped key by key rather than by pattern,
 * so a new Sleeper key shows up as unmapped instead of being guessed at.
 */
/**
 * ESPN stat ids that map onto the canonical vocabulary with confidence.
 *
 * **Deliberately partial.** The governing rule from `scoringContract.js` applies here more
 * than anywhere: an unknown provider key is never treated as a zero-point rule. A stat id
 * whose meaning is not certain is left out, lands in `unmapped`, and drops the league's
 * coverage to `ambiguous` — which is the honest answer, and the opposite of the A6 defect,
 * where a rule Omen could not reproduce was silently scored as zero.
 *
 * Note the asymmetry this map does **not** control: reproducing a player's ESPN score needs
 * no semantic map at all, because ESPN keys the league's rules and the player's stat line by
 * the same numeric id (see `espnAppliedPoints`). This map exists only so ESPN rules can be
 * expressed in the same vocabulary as Sleeper's and compared across providers. Exact scoring
 * does not wait on it.
 */
const ESPN_EVENT_MAP = Object.freeze({
  3: { event_key: "passing_yards", operator: "per_event" },
  4: { event_key: "passing_touchdowns", operator: "per_event" },
  20: { event_key: "passing_interceptions", operator: "per_event" },
  24: { event_key: "rushing_yards", operator: "per_event" },
  25: { event_key: "rushing_touchdowns", operator: "per_event" },
  42: { event_key: "receiving_yards", operator: "per_event" },
  43: { event_key: "receiving_touchdowns", operator: "per_event" },
  53: { event_key: "receiving_receptions", operator: "per_event" },
  72: { event_key: "fumbles_lost", operator: "per_event" },
});

const SLEEPER_EVENT_MAP = Object.freeze({
  pass_yd: { event_key: "passing_yards", operator: "per_event" },
  pass_td: { event_key: "passing_touchdowns", operator: "per_event" },
  pass_int: { event_key: "passing_interceptions", operator: "per_event" },
  rush_yd: { event_key: "rushing_yards", operator: "per_event" },
  rush_td: { event_key: "rushing_touchdowns", operator: "per_event" },
  rec: { event_key: "receiving_receptions", operator: "per_event" },
  rec_yd: { event_key: "receiving_yards", operator: "per_event" },
  rec_td: { event_key: "receiving_touchdowns", operator: "per_event" },
  fum_lost: { event_key: "fumbles_lost", operator: "per_event" },
  pass_2pt: { event_key: "two_point_conversions", operator: "per_event" },
  rush_2pt: { event_key: "two_point_conversions", operator: "per_event" },
  rec_2pt: { event_key: "two_point_conversions", operator: "per_event" },
  xpm: { event_key: "extra_points_made", operator: "per_event" },
  xpmiss: { event_key: "extra_points_missed", operator: "per_event" },
  fgmiss: { event_key: "field_goals_missed", operator: "per_event" },
  sack: { event_key: "defense_sacks", operator: "per_event" },
  int: { event_key: "defense_interceptions", operator: "per_event" },
  fum_rec: { event_key: "defense_fumble_recoveries", operator: "per_event" },
  def_td: { event_key: "defense_touchdowns", operator: "per_event" },
  safe: { event_key: "defense_safeties", operator: "per_event" },
  blk_kick: { event_key: "defense_blocks", operator: "per_event" },
  def_st_td: { event_key: "defense_return_touchdowns", operator: "per_event" },
  st_td: { event_key: "return_touchdowns", operator: "per_event" },
  idp_tkl_solo: { event_key: "idp_solo_tackles", operator: "per_event" },
  idp_tkl_ast: { event_key: "idp_assisted_tackles", operator: "per_event" },
  idp_tkl_loss: { event_key: "idp_tackles_for_loss", operator: "per_event" },
  idp_sack: { event_key: "idp_sacks", operator: "per_event" },
  idp_int: { event_key: "idp_interceptions", operator: "per_event" },
  idp_pass_def: { event_key: "idp_passes_defended", operator: "per_event" },
  idp_ff: { event_key: "idp_forced_fumbles", operator: "per_event" },
  idp_fum_rec: { event_key: "idp_fumble_recoveries", operator: "per_event" },
  idp_def_td: { event_key: "idp_defensive_touchdowns", operator: "per_event" },
  idp_safe: { event_key: "idp_safeties", operator: "per_event" },
});

/**
 * Distance-banded field goals, mapped onto the canonical **count-per-band** event keys.
 *
 * An earlier revision mapped these onto `field_goals_made` with a `range_event` operator,
 * treating the fact as the *yardage of one kick*. That was silently wrong in a way that
 * still reported `coverage_state: "supported"`: a kicker who made two field goals supplies
 * `field_goals_made: 2`, which fell inside the 0-19 band and scored as a 2-yard kick. A
 * confident, plausible, wrong number claiming league-exact capability — the exact failure
 * A6 exists to remove. Found by building the replay matrix, not by review.
 *
 * Sleeper publishes five bands; the canonical vocabulary has three. Two Sleeper bands that
 * collapse onto one canonical key must agree, or the league is `ambiguous` — see
 * `fieldGoalRules`.
 */
const SLEEPER_FG_BANDS = Object.freeze({
  fgm_0_19: "field_goals_made_0_39",
  fgm_20_29: "field_goals_made_0_39",
  fgm_30_39: "field_goals_made_0_39",
  fgm_40_49: "field_goals_made_40_49",
  fgm_50p: "field_goals_made_50_plus",
});

/**
 * Keys that carry no scoring weight. Listed explicitly so they are *known* to be
 * irrelevant rather than falling through to the unmapped bucket, which would
 * make every league ambiguous forever.
 */
const SLEEPER_IGNORED_KEYS = new Set(["pts_allow", "yds_allow"]);

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Canonical bytes for hashing: keys sorted, so two identical rule sets that
 * arrived in different orders produce the same hash and replay cleanly.
 */
function canonicalize(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function hashOf(value) {
  return crypto.createHash("sha256").update(canonicalize(value)).digest("hex");
}

function sortRules(rules) {
  return [...rules].sort((a, b) =>
    String(a.event_key).localeCompare(String(b.event_key))
    || String(a.operator).localeCompare(String(b.operator))
    || (a.min ?? 0) - (b.min ?? 0));
}

/**
 * Resolve a league's field-goal bands into canonical count rules.
 *
 * Returns `{ rules, unreproducible }`. `unreproducible` names any canonical band whose
 * Sleeper sub-bands disagree — for example a league paying 3 for 0-19 but 5 for 30-39,
 * both of which land in canonical `field_goals_made_0_39`. Omen cannot express that, and
 * the honest answer is `ambiguous` rather than picking one of the two values.
 */
function fieldGoalRules(bands) {
  const byCanonical = new Map();
  for (const [providerKey, value] of Object.entries(bands)) {
    const canonical = SLEEPER_FG_BANDS[providerKey];
    if (!byCanonical.has(canonical)) byCanonical.set(canonical, new Set());
    byCanonical.get(canonical).add(value);
  }

  const rules = [];
  const unreproducible = [];
  for (const [canonical, values] of byCanonical) {
    if (values.size > 1) {
      unreproducible.push(canonical);
      continue;
    }
    const [value] = values;
    // A zero-valued band is a real league decision and is kept, for the same reason a
    // zero-valued reception rule is: standard scoring is literally `rec: 0`.
    rules.push({ event_key: canonical, operator: "per_event", value });
  }

  // Deliberately NOT collapsed to a single `field_goals_made` rule when every band pays the
  // same. Collapsing would change which fact key the contract requires — banded counts
  // versus a total count — so a league's rules staying flat or going tiered would silently
  // change the shape of the facts needed to grade it. One model, always: counts per band.
  return { rules, unreproducible };
}

function deriveSleeperRules(settings) {
  const rules = [];
  const unmapped = [];
  const fieldGoalBands = {};

  for (const [key, rawValue] of Object.entries(settings || {})) {
    const value = finite(rawValue);
    if (value == null) {
      unmapped.push(key);
      continue;
    }
    if (SLEEPER_IGNORED_KEYS.has(key)) continue;

    if (SLEEPER_FG_BANDS[key]) {
      // Collected and resolved together below: whether a set of bands is reproducible
      // depends on the whole set, not on any one band.
      fieldGoalBands[key] = value;
      continue;
    }

    const mapping = SLEEPER_EVENT_MAP[key];
    if (mapping) {
      // A zero-valued mapped rule is a real league decision (standard scoring is
      // literally rec: 0), so it is kept rather than pruned.
      rules.push({ event_key: mapping.event_key, operator: mapping.operator, value });
      continue;
    }

    // A points-allowed tier, a yardage bonus, a return-yard rule, or anything
    // Sleeper adds later. Only a non-zero one changes a score.
    if (value !== 0) unmapped.push(key);
  }

  if (Object.keys(fieldGoalBands).length) {
    const fg = fieldGoalRules(fieldGoalBands);
    rules.push(...fg.rules);
    unmapped.push(...fg.unreproducible);
  }

  return { rules: sortRules(rules), unmapped: [...new Set(unmapped)].sort() };
}

/**
 * ESPN's `scoringItems` in the canonical vocabulary.
 *
 * A rule worth zero to every position changes no score and is not carried — matching the
 * Sleeper derivation, which prunes zero-valued *unmapped* keys for the same reason. A
 * zero-valued rule Omen **can** name is kept, because standard scoring is literally
 * `receptions: 0` and that is a real league decision rather than an absence.
 *
 * `pointsOverrides` is ESPN's per-position scoring. Where an override disagrees with the base
 * value, the rule is not reproducible as a single canonical number and is reported unmapped
 * rather than flattened to one of the two values.
 */
function deriveEspnRules(settings) {
  const items = settings?.scoringSettings?.scoringItems ?? settings?.scoringItems;
  if (!Array.isArray(items) || !items.length) return null;

  const rules = [];
  const unmapped = [];

  for (const item of items) {
    const statId = String(item?.statId ?? "");
    if (!statId) continue;
    const base = finite(item?.points) ?? 0;
    const overrides = Object.entries(item?.pointsOverrides || {})
      .map(([position, value]) => [position, finite(value)])
      .filter(([, value]) => value != null);

    const conflicting = overrides.filter(([, value]) => value !== base);
    const mapping = ESPN_EVENT_MAP[statId];

    if (conflicting.length) {
      // Position-specific scoring. Real, and not expressible as one canonical value.
      unmapped.push(`stat_${statId}`);
      continue;
    }
    if (mapping) {
      rules.push({ event_key: mapping.event_key, operator: mapping.operator, value: base });
      continue;
    }
    // Unnamed and worth nothing to anyone: cannot change a score, so it is not ambiguity.
    if (base !== 0) unmapped.push(`stat_${statId}`);
  }

  return { rules, unmapped, ruleCount: items.length };
}

function snapshot({ platform, coverageState, rules = [], unmapped = [], reason = null, ruleCount = 0 }) {
  const contract = {
    ruleset_version: SCORING_CONTRACT_VERSION,
    coverage_state: coverageState,
    rules,
  };

  return {
    platform,
    coverage_state: coverageState,
    reason,
    unmapped_rules: unmapped,
    // The count of provider rules seen, so a snapshot with zero rules can be
    // told apart from one that was never read.
    provider_rule_count: ruleCount,
    contract: coverageState === "supported" ? contract : { ...contract, rules },
    contract_hash: hashOf(contract),
    // A rule snapshot only. Never a credential, roster, or league identity.
    provider_rule_snapshot_hash: hashOf({ platform, rules, unmapped }),
    unsupported_event_keys: rules
      .map((rule) => rule.event_key)
      .filter((key) => !EVENT_KEYS.has(key)),
  };
}

/**
 * @param {object} input
 * @param {"sleeper"|"espn"|"yahoo"} input.platform
 * @param {object|null} input.leagueSettings the provider's own settings object
 * @returns a snapshot whose `coverage_state` is one of the contract's seven
 *   states. Only `supported` may ever be described as league-exact.
 */
function deriveScoringSnapshot({ platform, leagueSettings = null } = {}) {
  if (platform === "sleeper") {
    if (!leagueSettings || typeof leagueSettings !== "object" || !Object.keys(leagueSettings).length) {
      return snapshot({
        platform,
        coverageState: "pending",
        reason: "Sleeper league scoring settings were not available when this recommendation was made.",
      });
    }

    const { rules, unmapped } = deriveSleeperRules(leagueSettings);
    if (unmapped.length) {
      return snapshot({
        platform,
        coverageState: "ambiguous",
        rules,
        unmapped,
        ruleCount: Object.keys(leagueSettings).length,
        reason: `Omen cannot reproduce ${unmapped.length} of this league's scoring rules, so it will not call a result league-exact.`,
      });
    }
    if (!rules.length) {
      return snapshot({
        platform,
        coverageState: "unsupported",
        ruleCount: Object.keys(leagueSettings).length,
        reason: "No recognisable scoring rule was found in this league's settings.",
      });
    }
    return snapshot({ platform, coverageState: "supported", rules, ruleCount: Object.keys(leagueSettings).length });
  }

  if (platform === "espn") {
    // Previously hardcoded `provider_restricted`, on the reasoning that Omen had no
    // provider-granted path to capture and retain an ESPN league's private rules.
    //
    // **The founder authorized capturing and retaining these rules on 2026-09-06**, on the
    // record and after being shown that the restriction was a rights position rather than a
    // technical limit — ESPN serves the complete rule set to the league's own member through
    // the same authenticated session Omen already uses to read that member's roster. See the
    // decision log entry of that date.
    //
    // Coverage is now **derived, not asserted**: a league whose every scoring rule maps to the
    // canonical vocabulary is `supported`; one carrying a rule Omen cannot name is `ambiguous`
    // with that rule listed. Neither is decided in advance.
    const rules = deriveEspnRules(leagueSettings);
    if (!rules) {
      return snapshot({
        platform,
        coverageState: "unsupported",
        reason: "This ESPN league's scoring settings were not readable.",
      });
    }
    if (rules.unmapped.length) {
      return snapshot({
        platform,
        coverageState: "ambiguous",
        rules: rules.rules,
        unmapped: rules.unmapped,
        ruleCount: rules.ruleCount,
        reason: `Omen read this ESPN league's rules but cannot yet name ${rules.unmapped.length} of them, so it will not claim an exact contract.`,
      });
    }
    return snapshot({ platform, coverageState: "supported", rules: rules.rules, ruleCount: rules.ruleCount });
  }

  if (platform === "yahoo") {
    // Refused at the app-entitlement level (facts-of-record #11, issue #308).
    // `pending` rather than `unsupported`: the rules exist and Omen may be able
    // to read them once the entitlement is restored.
    return snapshot({
      platform,
      coverageState: "pending",
      reason: "Yahoo's Fantasy API is refused at the application-entitlement level, so its league rules cannot be read.",
    });
  }

  return snapshot({
    platform: platform || null,
    coverageState: "unsupported",
    reason: `No scoring-rule mapping exists for platform: ${platform || "unknown"}.`,
  });
}

module.exports = {
  ESPN_EVENT_MAP,
  SLEEPER_EVENT_MAP,
  deriveEspnRules,
  SLEEPER_FG_BANDS,
  SLEEPER_IGNORED_KEYS,
  canonicalize,
  deriveScoringSnapshot,
  deriveSleeperRules,
  hashOf,
};
