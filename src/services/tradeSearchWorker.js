"use strict";

// Worker-thread entry for the trade search (see tradeSearchPool.js). It runs the exact inline
// functions; only the boundary differs: the fairness guard arrives as a name, the budget as the
// milliseconds the caller had left, and budget-trip callbacks come back as data to be replayed.
const { parentPort } = require("node:worker_threads");
const { findTradeCandidate, createSearchBudget } = require("./tradeLineup");
const { findLeagueTradeCandidates, mutualFairnessGuard } = require("./tradeFind");

const FAIRNESS_GUARDS = { mutual: mutualFairnessGuard };

parentPort.on("message", ({ id, kind, args, fairness, budgetMs }) => {
  try {
    const budgetEvents = [];
    const input = {
      ...args,
      budget: createSearchBudget({ budgetMs }),
      onBudgetExceeded: (stats) => {
        budgetEvents.push(stats);
      },
    };
    if (fairness) input.fairnessGuard = FAIRNESS_GUARDS[fairness];
    const result = kind === "league" ? findLeagueTradeCandidates(input) : findTradeCandidate(input);
    parentPort.postMessage({ id, result, budgetEvents });
  } catch (error) {
    parentPort.postMessage({ id, error: String(error?.message || error) });
  }
});
