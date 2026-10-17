"use strict";

// Every six hours: probe each stored ESPN and Yahoo credential with one cheap authenticated read. A refused
// credential is deleted from Vault and its connection marked needs_reauth (see services/credentialHealth.js).

const { createClient } = require("@supabase/supabase-js");
const config = require("./config");
const { logger } = require("./middleware/logging");
const { createCredentialHealthChecker } = require("./services/credentialHealth");
const { getAuthenticatedEspnCredentials } = require("./services/espnAuth");
const { getAuthenticatedYahooClient } = require("./services/yahooAuth");
const espnAdapter = require("./adapters/espn");

async function main() {
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  const checker = createCredentialHealthChecker({
    supabase,
    log: logger,
    checks: {
      async espn(row) {
        const creds = await getAuthenticatedEspnCredentials(row.user_id);
        await espnAdapter.fetchEspnApi(row.league_id, creds.espn_s2, creds.swid, ["mSettings"], null);
      },
      async yahoo(row) {
        const { client } = await getAuthenticatedYahooClient(row.user_id); // refreshes an expired token
        await client.getLeagueSettings(row.league_id, { report: false });
      },
    },
  });
  const tally = await checker.run();
  logger.info("Credential health check", tally);
}

if (require.main === module) {
  main().catch((error) => { logger.error("Credential health check failed", { code: error.code || "failure" }); process.exit(1); });
}

module.exports = { main };
