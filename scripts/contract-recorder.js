"use strict";

/**
 * Contract recorder — preloaded into the ordinary test run with NODE_OPTIONS=--require.
 *
 * It records every JSON response the real route handlers produce while the existing route tests run
 * (real routes, real builders, the tests' own stubs), so contract fixtures are what the server
 * actually sends rather than hand-written examples. Nothing in the tests changes.
 *
 *   CONTRACT_RECORD_DIR=<dir>   where to write; one file per process. Unset = recorder does nothing.
 *
 * `scripts/contracts.js record` runs the suite with this preloaded, then merges the per-process
 * files into test/contracts/recorded/.
 */

const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");

const dir = process.env.CONTRACT_RECORD_DIR;
if (dir) {
  fs.mkdirSync(dir, { recursive: true });
  const records = [];
  const originalEnd = http.ServerResponse.prototype.end;

  http.ServerResponse.prototype.end = function patchedEnd(chunk, ...rest) {
    try {
      const type = String(this.getHeader("content-type") || "");
      if (type.includes("application/json") && chunk != null) {
        const text = Buffer.isBuffer(chunk) ? chunk.toString("utf8") : String(chunk);
        const body = JSON.parse(text);
        if (body && typeof body === "object") {
          const req = this.req || {};
          records.push({
            method: req.method || null,
            route: (req.baseUrl || "") + ((req.route && req.route.path) || ""),
            path: String(req.originalUrl || req.url || "").split("?")[0],
            status: this.statusCode,
            body,
          });
        }
      }
    } catch {
      // Recording must never change or break a response.
    }
    return originalEnd.call(this, chunk, ...rest);
  };

  process.on("exit", () => {
    if (!records.length) return;
    try {
      fs.writeFileSync(path.join(dir, `${process.pid}.json`), JSON.stringify(records));
    } catch {
      // ignore
    }
  });
}
