"use strict";

const { Pool } = require("pg");
const { runCurrentSeasonCommand, safeCode } = require("./services/footballWarehouse/currentSeasonCommand");

async function main({ argv = process.argv.slice(2), env = process.env, stdout = process.stdout } = {}) {
  const output = (record) => stdout.write(`${JSON.stringify(record)}\n`);
  try {
    await runCurrentSeasonCommand({ argv, env, Pool, output });
    return 0;
  } catch (error) {
    if (!error?.code) output({ job: "football-warehouse-current-season", state: "failed", code: safeCode(error) });
    return 1;
  }
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; });
}

module.exports = { main };
