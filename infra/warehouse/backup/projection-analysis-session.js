#!/usr/bin/env node
"use strict";

// Pure planning/refusal core for the KVM2 projection-analysis supervisor.
// It creates no resource and reads no credential. The future shell supervisor must consume this
// plan rather than reconstructing names or schedule policy independently.

const SESSION = /^analysis-([0-9]{8}T[0-9]{6}Z)-([a-f0-9]{8})$/;
const RUN = /^warehouse-[0-9]{8}T[0-9]{6}Z$/;
const MIN_TTL = 300;
const MAX_TTL = 7200;
const CLEANUP_RESERVE_SECONDS = 1800;

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function instant(value, name) {
  const result = new Date(value);
  if (!value || !Number.isFinite(result.getTime())) fail("invalid_time", `${name} must be an ISO instant`);
  return result;
}

function protectedWindowContainingOrAfter(date) {
  const day = date.getUTCDay();
  const start = new Date(date);
  start.setUTCDate(date.getUTCDate() + ((7 - day) % 7));
  start.setUTCHours(12, 0, 0, 0);
  if (start.getTime() + 5 * 3600_000 <= date.getTime()) start.setUTCDate(start.getUTCDate() + 7);
  return { start, end: new Date(start.getTime() + 5 * 3600_000) };
}

function intervalIntersects(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function resourceNames(sessionId) {
  if (!SESSION.test(sessionId || "")) fail("invalid_session", "session id is invalid");
  return Object.freeze({
    container: `omen-warehouse-analysis-${sessionId}`,
    volume: `omen-warehouse-analysis-${sessionId}`,
    socketDir: `/run/omen-warehouse-analysis/${sessionId}`,
    sourceDir: `/var/lib/omen/warehouse-analysis-sources/${sessionId}`,
    receipt: `/var/lib/omen/warehouse-analysis-receipts/${sessionId}.json`,
    label: `omen.analysis.session=${sessionId}`,
  });
}

function planSession({ sessionId, runId, ttlSeconds, now, nextRestoreElapse }) {
  if (!RUN.test(runId || "")) fail("invalid_run", "warehouse run id is invalid");
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < MIN_TTL || ttlSeconds > MAX_TTL) {
    fail("invalid_ttl", `ttl must be ${MIN_TTL}-${MAX_TTL} seconds`);
  }
  const start = instant(now, "now");
  const reservedEnd = new Date(start.getTime() + (ttlSeconds + CLEANUP_RESERVE_SECONDS) * 1000);
  const windows = [protectedWindowContainingOrAfter(new Date(start.getTime() - 7 * 86400_000)), protectedWindowContainingOrAfter(start)];
  if (windows.some((window) => intervalIntersects(start, reservedEnd, window.start, window.end))) {
    fail("restore_window_overlap", "requested session and cleanup reserve overlap the restore-proof window");
  }
  if (nextRestoreElapse) {
    const next = instant(nextRestoreElapse, "next restore elapse");
    if (next >= start && next <= reservedEnd) fail("restore_timer_overlap", "restore-proof timer elapses before cleanup reserve ends");
  }
  return Object.freeze({
    contract_version: "omen-warehouse-projection-analysis-plan.v1",
    session_id: sessionId,
    backup_run_id: runId,
    starts_at: start.toISOString(),
    expires_at: new Date(start.getTime() + ttlSeconds * 1000).toISOString(),
    cleanup_deadline: reservedEnd.toISOString(),
    ttl_seconds: ttlSeconds,
    resources: resourceNames(sessionId),
  });
}

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!value || !["--session-id", "--run-id", "--ttl-seconds", "--now", "--next-restore-elapse"].includes(flag)) {
      fail("usage", "usage: projection-analysis-session.js plan --session-id ID --run-id ID --ttl-seconds N --now ISO [--next-restore-elapse ISO]");
    }
    if (Object.hasOwn(values, flag)) fail("usage", `duplicate flag ${flag}`);
    values[flag] = value;
  }
  for (const required of ["--session-id", "--run-id", "--ttl-seconds", "--now"]) {
    if (!values[required]) fail("usage", `missing ${required}`);
  }
  if (!/^[0-9]+$/.test(values["--ttl-seconds"])) fail("invalid_ttl", "ttl must be an integer");
  return {
    sessionId: values["--session-id"], runId: values["--run-id"],
    ttlSeconds: Number(values["--ttl-seconds"]), now: values["--now"],
    nextRestoreElapse: values["--next-restore-elapse"] || null,
  };
}

function main(argv) {
  if (argv[0] !== "plan") fail("usage", "first argument must be plan");
  process.stdout.write(`${JSON.stringify(planSession(parseArgs(argv.slice(1))))}\n`);
}

if (require.main === module) {
  try { main(process.argv.slice(2)); } catch (error) {
    process.stderr.write(`${JSON.stringify({ state: "refused", code: error.code || "planning_failed" })}\n`);
    process.exitCode = 1;
  }
}

module.exports = { CLEANUP_RESERVE_SECONDS, MAX_TTL, MIN_TTL, parseArgs, planSession, resourceNames };
