#!/usr/bin/env node
/**
 * Validate the checked-in Command Center bundle before a founder-approved copy.
 * This is intentionally local and read-only: it never connects to a Pi or
 * changes installed files.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dispatcherPath = path.join(root, "ops/command-center/slops-alert-dispatcher");
const fingerprintPath = path.join(root, "ops/command-center/alert-fingerprint.py");
const dispatcher = fs.readFileSync(dispatcherPath, "utf8");

const errors = [];
if (!fs.existsSync(fingerprintPath)) errors.push("missing alert-fingerprint.py");
if (!dispatcher.startsWith("#!/bin/sh\nset -eu\n")) errors.push("dispatcher must use a fail-closed shell header");
if (!dispatcher.includes("/usr/local/lib/slops-alerting/alert-fingerprint.py")) {
  errors.push("dispatcher must invoke the installed fingerprint helper");
}
if (!dispatcher.includes("StrictHostKeyChecking=yes")) errors.push("SSH reads must require strict host-key checking");
if (!dispatcher.includes("sqlite3 -readonly")) errors.push("Kuma read must be explicitly read-only");
if (!dispatcher.includes("default_transaction_read_only=on")) errors.push("GlitchTip read must force a read-only transaction");
// The command-center lane is notification-only. Catch accidental remediation
// verbs in the checked-in dispatcher before they can be copied to a Pi.
if (/\b(systemctl\s+(restart|stop|start)|docker\s+(restart|stop|rm)|iptables|nft\s|ufw\s|rotate[-_ ]secret)\b/i.test(dispatcher)) {
  errors.push("dispatcher contains a prohibited remediation or secret-rotation command");
}

if (errors.length) {
  console.error(`Command Center artifact validation failed:\n- ${errors.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("Command Center artifacts valid: read-only dispatcher and stable fingerprint helper");
}
