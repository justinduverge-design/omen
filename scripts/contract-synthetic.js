"use strict";

/**
 * Fixtures from the REAL pure builders for states the route tests never reach. Nothing here is a
 * hand-written payload: each body comes out of the production function (quietWeek,
 * buildStartSitDetail, buildWaiverAnalysis) called with inputs shaped like the existing tests'.
 * Recorded route responses win over these when both exist for the same contract and variant.
 */

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_SERVICE_KEY ||= "contract-fixture-key";

const { quietWeek } = require("../src/services/quietWeek");
const { buildStartSitDetail, CONTRACT_VERSION_V2 } = require("../src/services/startSitDetail");
const { buildWaiverAnalysis } = require("../src/services/waiverAnalysis");
const { fromSleeper, fromEspn, undetermined } = require("../src/services/waiverSystem");

const P = (k, n, pos, pts, status = null) => ({ player_key: k, name: n, full_name: n, position: pos, selected_position: pos, eligible_positions: [pos], projected_points: pts, status });
const FAAB = fromSleeper({ league: { settings: { waiver_type: 2, waiver_budget: 100 } }, roster: { settings: { waiver_budget_used: 20 } } });

function startSit() {
  const common = { platform: "sleeper", leagueId: "L1", leagueName: "Dynasty Dogs", teamName: "Justin Titans", week: 7, season: 2026, scoringFormat: "0.5 PPR" };
  const rosters = {
    clear: { week: 7, slots: { starters: [P("a", "Chris Olave", "WR", 11.0), P("b", "Star RB", "RB", 20.0)], bench: [P("c", "DeVonta Smith", "WR", 15.2), P("d", "Bench RB", "RB", 4.0)] } },
    close: { week: 7, slots: { starters: [P("a", "Chris Olave", "WR", 11.0), P("b", "Star RB", "RB", 20.0)], bench: [P("c", "DeVonta Smith", "WR", 11.8), P("d", "Bench RB", "RB", 4.0)] } },
    unavailable: { week: 7, slots: { starters: [P("a", "Chris Olave", "WR", 11.0, "OUT"), P("b", "Star RB", "RB", 20.0)], bench: [P("c", "DeVonta Smith", "WR", 9.2), P("d", "Bench RB", "RB", 4.0)] } },
    incomplete: { week: 7, slots: { starters: [P("a", "Chris Olave", "WR", null), P("b", "Star RB", "RB", 20.0)], bench: [P("c", "DeVonta Smith", "WR", null)] } },
    none: { week: 7, slots: { starters: [P("a", "Chris Olave", "WR", 18.0), P("b", "Star RB", "RB", 20.0)], bench: [P("c", "DeVonta Smith", "WR", 6.0)] } },
  };
  const out = [];
  for (const version of [undefined, CONTRACT_VERSION_V2]) {
    for (const [name, roster] of Object.entries(rosters)) {
      out.push(buildStartSitDetail({ ...common, roster, ...(version ? { contractVersion: version } : {}) }));
    }
    out.push(buildStartSitDetail({ ...common, roster: rosters.clear, offSeason: true, ...(version ? { contractVersion: version } : {}) }));
  }
  return out.map((r) => ({ body: r.body || r, status: 200 }));
}

function waiver() {
  const base = { platform: "sleeper", leagueId: "L1", week: 3, season: 2026, availabilityConfirmed: true };
  const cases = [
    { ...base, waiverSystem: FAAB, offSeason: true },
    { ...base, waiverSystem: FAAB, pool: null, roster: { slots: { starters: [P("s", "A", "RB", 5)], bench: [] } } },
    { ...base, waiverSystem: FAAB, pool: [P("p", "B", "RB", 1)], roster: { slots: { starters: [P("s", "A", "RB", 9)], bench: [] } } },
    { ...base, waiverSystem: FAAB, pool: [P("p", "B", "RB", 12)], roster: { slots: { starters: [P("s", "A", "RB", 5)], bench: [] } } },
    { ...base, waiverSystem: FAAB, pool: [P("p", "B", "RB", 12)], roster: { slots: { starters: [P("s", "A", "RB", 5)], bench: [P("z", "Z", "RB", null)] } } },
    { ...base, waiverSystem: undetermined("no probe"), pool: [P("p", "B", "RB", 12)], roster: { slots: { starters: [P("s", "A", "RB", 5)], bench: [] } } },
    { ...base, waiverSystem: null, pool: [P("p", "B", "RB", 12)], roster: { slots: { starters: [P("s", "A", "RB", 5)], bench: [] } } },
    { ...base, availabilityConfirmed: false, waiverSystem: FAAB, pool: [P("p", "B", "RB", 12)], roster: { slots: { starters: [P("s", "A", "RB", 5)], bench: [] } } },
  ];
  return cases.map((c) => ({ body: buildWaiverAnalysis(c), status: 200 }));
}

function quiet() {
  const live = { roster: { status: "live", used: true }, projections: { status: "live", used: true } };
  const empty = (extra = {}) => ({ state: "empty", platform: { status: "connected" }, signals: live, quiet_inputs: { injured_starter: false }, ...extra });
  return [
    quietWeek(empty(), "W"),
    quietWeek(empty(), "L"),
    quietWeek(empty(), null),
    quietWeek(empty({ quiet_inputs: { injured_starter: true } }), "W"),
    quietWeek(empty({ quiet_inputs: {} }), "W"),
    quietWeek({ ...empty(), signals: { roster: { status: "stub", used: true } } }, "W"),
    quietWeek({ state: "success", platform: { status: "connected" }, signals: live }, "W"),
    quietWeek(null, null),
  ].map((body) => ({ body, status: 200 }));
}

function generate() {
  const all = [];
  for (const { body, status } of [...startSit(), ...waiver(), ...quiet()]) {
    if (body && body.contract_version) all.push({ method: "GET", route: "(built)", path: "(built)", status, body });
  }
  return all;
}

module.exports = { generate };
