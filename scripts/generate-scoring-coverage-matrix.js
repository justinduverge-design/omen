#!/usr/bin/env node
"use strict";

/**
 * Generate the A6 per-provider scoring coverage matrix from the code.
 *
 * Written as a generator rather than a hand-maintained table on purpose. This
 * repo's recurring failure is a document that asserts something about the code
 * and then drifts from it — a stale "not deployed" list cost twelve weeks, and a
 * stale defect description nearly produced a well-tested no-op. A matrix hand-
 * written today would be wrong the first time someone adds a Sleeper key.
 *
 * `test/scoringCoverageMatrix.test.js` regenerates this and asserts the
 * committed file matches, so drift is a red test rather than a discovery.
 *
 * Usage: node scripts/generate-scoring-coverage-matrix.js [--write]
 */

const fs = require("node:fs");
const path = require("node:path");
const { EVENT_KEYS } = require("../src/services/scoringContract");
const {
  SLEEPER_EVENT_MAP,
  SLEEPER_FG_BANDS,
  SLEEPER_IGNORED_KEYS,
} = require("../src/services/scoringRuleSnapshot");
const { RETAIN_RULE_BODY } = require("../src/services/scoringSnapshotResolver");

const OUTPUT = path.join(__dirname, "..", "Blueprints", "specs", "a6-scoring-coverage-matrix.md");

const GROUPS = [
  ["Offensive player", (key) => /^(passing|rushing|receiving|fumbles|two_point|return)_/.test(key)],
  ["Kicker", (key) => /^(extra_points|field_goals)/.test(key)],
  ["Team defense / special teams", (key) => key.startsWith("defense_")],
  ["Individual defensive player (IDP)", (key) => key.startsWith("idp_")],
];

function sleeperCoverage() {
  const byEvent = new Map();
  for (const [providerKey, mapping] of Object.entries(SLEEPER_EVENT_MAP)) {
    if (!byEvent.has(mapping.event_key)) byEvent.set(mapping.event_key, []);
    byEvent.get(mapping.event_key).push(providerKey);
  }
  // Distance bands all collapse onto one canonical event with a range operator.
  byEvent.set("field_goals_made", Object.keys(SLEEPER_FG_BANDS));
  return byEvent;
}

function groupOf(key) {
  const found = GROUPS.find(([, match]) => match(key));
  return found ? found[0] : "Other";
}

function render() {
  const sleeper = sleeperCoverage();
  const keys = [...EVENT_KEYS].sort();
  const rows = [];

  for (const [group] of GROUPS.concat([["Other"]])) {
    const inGroup = keys.filter((key) => groupOf(key) === group);
    if (!inGroup.length) continue;
    rows.push(`\n### ${group}\n`);
    rows.push("| Canonical event | Sleeper | ESPN | Yahoo |");
    rows.push("|---|---|---|---|");
    for (const key of inGroup) {
      const providerKeys = sleeper.get(key);
      const sleeperCell = providerKeys
        ? `✅ \`${providerKeys.sort().join("`, `")}\``
        : "❌ not mapped";
      rows.push(`| \`${key}\` | ${sleeperCell} | 🔒 restricted | ⏳ pending |`);
    }
  }

  const mappedCount = keys.filter((key) => sleeper.has(key)).length;
  const unmapped = keys.filter((key) => !sleeper.has(key));

  return `# A6 — scoring coverage matrix

<!-- GENERATED FILE. Do not edit by hand.
     Regenerate: node scripts/generate-scoring-coverage-matrix.js --write
     test/scoringCoverageMatrix.test.js fails if this drifts from the code. -->

**Generated from** \`src/services/scoringContract.js\` (canonical event vocabulary)
and \`src/services/scoringRuleSnapshot.js\` (per-provider derivation).

Answers one question per row: **can Omen reproduce this scoring rule from the
provider's own settings?** A ✅ is a mapping that exists in code and is exercised
by tests. It is not a claim that the resulting score has been reconciled against
that provider's final result — that is the separate reconciliation state.

## Legend

| Mark | Meaning |
|---|---|
| ✅ | Mapped from a named provider key. Reproducible. |
| ❌ | Not mapped. Any **non-zero** value for this rule forces the whole contract to \`ambiguous\` — it is never silently treated as zero. |
| 🔒 | **Provider-restricted.** No provider-granted path to capture and retain the complete private rule set. Derives a hashed restriction attestation, never a snapshot. |
| ⏳ | **Pending.** The rules exist and Omen may be able to read them once access clears. |

## Provider status

| Provider | Rule derivation | Rule-body retention | Blocker |
|---|---|---|---|
| Sleeper | ✅ ${mappedCount}/${keys.length} canonical events | ${RETAIN_RULE_BODY.sleeper ? "✅ permitted" : "⛔ withheld"} | Written commercial-use permission pending (requested 2026-08-22) |
| ESPN | 🔒 none | ${RETAIN_RULE_BODY.espn ? "✅ permitted" : "⛔ withheld"} | Provider-restricted absent express permission |
| Yahoo | ⏳ none | ${RETAIN_RULE_BODY.yahoo ? "✅ permitted" : "⛔ withheld"} | API refused at the app-entitlement level (issue #308) |

**Retention is gated separately from derivation.** Deriving a snapshot in memory
to compute a hash is not the same act as retaining a provider's rules in the
database. \`RETAIN_RULE_BODY\` in \`scoringSnapshotResolver.js\` controls the
second; today it is \`false\` for every provider, so \`moves.scoring_contract\`
stays \`null\` and only the hash and coverage state are persisted.

## The honest gap

Even a fully ✅ row does **not** yet produce a league-exact grade, because the
current Tuesday source publishes aggregate fantasy points rather than the
per-event facts a contract prices. Reconciliation reports \`unsupported\` and
names the missing facts rather than scoring them as zero. That seam is what the
owned football-data pipeline (\`A7B\`) fills.

## Sleeper — unmapped canonical events

${unmapped.length ? unmapped.map((key) => `- \`${key}\``).join("\n") : "_None._"}

${unmapped.length ? `These are canonical events Omen understands but has no Sleeper key for. \`field_goals_made_*\` band variants are covered instead by \`field_goals_made\` with a \`range_event\` operator, so they are unreachable by design rather than missing. \`defense_points_allowed\` and \`defense_yards_allowed\` are genuinely unmapped: Sleeper expresses them as tiered \`pts_allow_*\` / \`yds_allow_*\` keys that do not fit a single per-event rule, so a league scoring them non-zero derives \`ambiguous\` — correctly, and deliberately.` : ""}

## Sleeper keys deliberately ignored

${[...SLEEPER_IGNORED_KEYS].sort().map((key) => `- \`${key}\` — carries no scoring weight; listed explicitly so it is *known* irrelevant rather than falling through to the unmapped bucket, which would make every league permanently ambiguous.`).join("\n")}

## Per-event detail
${rows.join("\n")}
`;
}

const content = render();
if (process.argv.includes("--write")) {
  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  fs.writeFileSync(OUTPUT, content);
  console.log(`wrote ${path.relative(path.join(__dirname, ".."), OUTPUT)}`);
} else {
  process.stdout.write(content);
}

module.exports = { render, OUTPUT };
