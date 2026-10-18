"use strict";

/**
 * Runs the trade search (`tradeLineup.findTradeCandidate`, `tradeFind.findLeagueTradeCandidates`)
 * on a `worker_threads` worker instead of the event loop.
 *
 * ## Why
 *
 * The search is synchronous CPU: ~340ms for a 10x15 league, ~1.2-1.4s for 16x20
 * (Blueprints/specs/infrastructure/rust-prep/phase5-decision-core-baseline.md). The budget bounds
 * it, but every one of those milliseconds was a stall for every other request on the process.
 *
 * ## Contract
 *
 * Same arguments and same result as the inline functions, but async. The functions and the
 * budget object cannot cross a thread boundary, so:
 *   - `fairnessGuard` crosses as a name; a guard we cannot name runs inline.
 *   - `budget` crosses as the milliseconds it has left; the worker builds its own.
 *   - `onBudgetExceeded` calls are collected in the worker and replayed here, in order.
 *
 * Off by default: the search runs inline (the old path exactly) unless `TRADE_SEARCH_MODE=worker`.
 * Turning the worker on in production is a separate approved step. If a worker errors, crashes or
 * outlives its budget plus `WORKER_GRACE_MS`, it is terminated, the call runs inline with the
 * caller's own budget (by then usually spent, so that is a fast, honest budget trip), and the next
 * call spawns a fresh worker.
 */
const path = require("node:path");
const { Worker } = require("node:worker_threads");
const { findTradeCandidate, TRADE_SEARCH_BUDGET_MS } = require("./tradeLineup");
const { findLeagueTradeCandidates, mutualFairnessGuard } = require("./tradeFind");

let workerPath = path.join(__dirname, "tradeSearchWorker.js");
/// Past the budget, how long a worker may take to answer before it is presumed stuck.
const WORKER_GRACE_MS = 1000;
/// Stands in for "caller passed no guard", so the worker keeps the function's own default.
const NO_GUARD = Symbol("no fairness guard");

function logger() {
  return require("../middleware/logging").logger;
}

function searchMode() {
  return process.env.TRADE_SEARCH_MODE === "worker" ? "worker" : "inline";
}

function poolSize() {
  const size = Number.parseInt(process.env.TRADE_SEARCH_WORKERS, 10);
  return Number.isInteger(size) && size > 0 ? size : 1;
}

const slots = []; // { worker, busy }
const queue = []; // tasks waiting for a free worker
let nextId = 0;
let closing = false;

function spawnSlot() {
  const slot = { worker: new Worker(workerPath), busy: null };
  slot.worker.unref();
  const fail = (error) => {
    retire(slot);
    if (slot.busy) slot.busy.settle({ error });
    try {
      drain();
    } catch {}
  };
  slot.worker.on("message", (message) => {
    if (!slot.busy || message.id !== slot.busy.id) return;
    const task = slot.busy;
    slot.busy = null;
    slot.worker.unref();
    task.settle(message.error ? { error: new Error(message.error) } : { message });
    try {
      drain();
    } catch {}
  });
  slot.worker.on("error", fail);
  slot.worker.on("exit", (code) => fail(new Error(`trade search worker exited (${code})`)));
  slots.push(slot);
  return slot;
}

function retire(slot) {
  const index = slots.indexOf(slot);
  if (index !== -1) slots.splice(index, 1);
  slot.worker.terminate().catch(() => {});
}

function drain() {
  while (queue.length && !closing) {
    const slot = slots.find((candidate) => !candidate.busy) || (slots.length < poolSize() ? spawnSlot() : null);
    if (!slot) return;
    const task = queue.shift();
    // Measured at dispatch, so time spent queued behind another search counts against the budget.
    const budgetMs = Math.max(0, task.remainingMs());
    slot.busy = task;
    slot.worker.ref();
    task.timer = setTimeout(() => {
      retire(slot);
      task.settle({ error: new Error(`trade search worker exceeded ${budgetMs + WORKER_GRACE_MS}ms`) });
    }, budgetMs + WORKER_GRACE_MS);
    task.timer.unref?.();
    try {
      slot.worker.postMessage({ id: task.id, kind: task.kind, args: task.args, fairness: task.fairness, budgetMs });
    } catch (error) {
      // An input that cannot be cloned fails this task alone; the worker is still good.
      slot.busy = null;
      slot.worker.unref();
      task.settle({ error });
    }
  }
}

function runOnWorker(payload) {
  return new Promise((resolve) => {
    const task = { ...payload, id: ++nextId };
    let settled = false;
    task.settle = (outcome) => {
      if (settled) return;
      settled = true;
      clearTimeout(task.timer);
      resolve(outcome);
    };
    if (closing) return task.settle({ error: new Error("trade search pool is closed") });
    queue.push(task);
    try {
      drain();
    } catch (error) {
      task.settle({ error });
    }
  });
}

async function runSearch(kind, input, inline, defaultGuard) {
  const { budget, onBudgetExceeded, fairnessGuard = defaultGuard, ...args } = input || {};
  const fairness = fairnessGuard === mutualFairnessGuard ? "mutual" : fairnessGuard === NO_GUARD ? null : undefined;
  const startedAt = Date.now();
  const remainingMs = !budget
    ? () => TRADE_SEARCH_BUDGET_MS - (Date.now() - startedAt)
    : Number.isFinite(budget.budgetMs)
      ? () => budget.budgetMs - budget.stats.elapsedMs
      : null;
  if (searchMode() === "inline" || fairness === undefined || !remainingMs) return inline(input);

  const outcome = await runOnWorker({ kind, args, fairness, remainingMs });
  if (outcome.error) {
    logger().warn("Trade search worker failed; ran inline", { kind, error: outcome.error.message });
    return inline(input);
  }
  if (onBudgetExceeded)
    outcome.message.budgetEvents.forEach((stats) => {
      onBudgetExceeded(stats);
    });
  return outcome.message.result;
}

/** Async `tradeLineup.findTradeCandidate`. */
function findTradeCandidateAsync(input) {
  return runSearch("candidate", input, findTradeCandidate, NO_GUARD);
}

/** Async `tradeFind.findLeagueTradeCandidates`. */
function findLeagueTradeCandidatesAsync(input) {
  return runSearch("league", input, findLeagueTradeCandidates, mutualFairnessGuard);
}

/** Terminates every worker and stops respawning. Pending calls fall back to inline. For tests and shutdown. */
async function closeTradeSearchPool() {
  closing = true;
  const error = new Error("trade search pool is closed");
  queue.splice(0).forEach((task) => {
    task.settle({ error });
  });
  await Promise.all(
    slots.splice(0).map((slot) => {
      if (slot.busy) slot.busy.settle({ error });
      return slot.worker.terminate();
    }),
  );
}

module.exports = {
  findTradeCandidateAsync,
  // Tests point the pool at a worker that crashes or hangs, to prove the inline fallback.
  setWorkerPathForTests(next) {
    workerPath = next;
    closing = false;
  },
  findLeagueTradeCandidatesAsync,
  closeTradeSearchPool,
  WORKER_GRACE_MS,
};
