"use strict";

/**
 * Request-scoped memo for Sleeper reads.
 *
 * `middleware` opens a fresh Map for the lifetime of one request's async context. The
 * Sleeper adapter consults it so repeated GETs of the same URL inside that request collapse
 * to one upstream call. The Map is created per request and dropped with it, so nothing is
 * shared across requests or users; outside a scope the adapter behaves exactly as before.
 */

const { AsyncLocalStorage } = require("node:async_hooks");

const storage = new AsyncLocalStorage();

function middleware(_req, _res, next) {
  storage.run(new Map(), next);
}

function run(fn) {
  if (storage.getStore()) return fn();
  return storage.run(new Map(), fn);
}

function currentStore() {
  return storage.getStore() || null;
}

module.exports = { middleware, run, currentStore };
