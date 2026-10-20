"use strict";

/**
 * Prune as we build: what the repo still carries after the work that needed it moved on.
 *
 * Runs `scripts/check-orphans.js` and reports its counts as informational, never as findings.
 * Its output is candidates, not verdicts (a route can be called by a cron), so a finding here
 * would fail every close-out until someone deleted something unconfirmed. The close-out step
 * reads these counts and removes or logs what the session's own work made dead.
 * Rule: Blueprints/definition-of-done.md → "Removal". Local files and git only; no network.
 */

const { collect, TITLES } = require("../check-orphans");

module.exports = {
  id: "orphan-candidates",
  title: "Prune-as-we-build candidates (informational)",
  needs: ["local source", "local git refs"],
  appliesWhen: () => ({ applies: true }),
  run() {
    const report = collect();
    const informational = Object.keys(report)
      .filter((k) => report[k].length > 0)
      .map((k) => ({ kind: "note", text: `${TITLES[k]}: ${report[k].length} — node scripts/check-orphans.js` }));
    return { findings: [], informational };
  },
};
