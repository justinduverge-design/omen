"use strict";

/**
 * One Yahoo league read per user, shared for a minute after a connect: the OAuth callback's
 * background membership write and the app's GET /api/yahoo/leagues (a second later) both used to
 * ask Yahoo for the same list. The promise is shared while in flight; a rejection is never kept.
 *
 * Cleared whenever the user's Yahoo tokens change (connect, reconnect, disconnect), so a reconnect
 * with a different Yahoo account can never be answered with the previous account's leagues.
 */
const SHARED_LEAGUES_TTL_MS = 60_000;
const reads = new Map();

function prune(now) {
  for (const [userId, held] of reads) {
    if (now - held.at >= SHARED_LEAGUES_TTL_MS) reads.delete(userId);
  }
}

function readYahooLeaguesShared(userId, readLeagues) {
  const now = Date.now();
  prune(now);
  const held = reads.get(userId);
  if (held) return held.promise;
  const promise = Promise.resolve().then(readLeagues);
  reads.set(userId, { at: now, promise });
  promise.catch(() => {
    if (reads.get(userId)?.promise === promise) reads.delete(userId);
  });
  return promise;
}

function clearYahooLeagueReads(userId) {
  reads.delete(userId);
}

module.exports = { readYahooLeaguesShared, clearYahooLeagueReads, SHARED_LEAGUES_TTL_MS };
