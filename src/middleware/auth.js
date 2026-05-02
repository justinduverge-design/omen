"use strict";

/**
 * requireAuth — Supabase JWT bearer-token middleware.
 *
 * Looks for `Authorization: Bearer <jwt>`, verifies it against Supabase auth,
 * and attaches the verified user object to `req.user`. Fails closed on any
 * problem (missing header, invalid signature, expired token, network error).
 *
 * SY0-701 2.4 + 4.5: bearer-token authentication, default-deny posture.
 *
 * Note: uses the service-key client only to call auth.getUser() which performs
 * a stateless JWT verification. RLS-bound queries should use the user's own
 * token via a per-request client; this middleware does NOT do that.
 */

const { createClient } = require("@supabase/supabase-js");
const config           = require("../config");
const { logger }       = require("./logging");

const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

async function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }
  const token = auth.slice("Bearer ".length).trim();

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }
    req.user = data.user;
    return next();
  } catch (e) {
    logger.warn("Auth check failed", { err: e.message });
    return res.status(401).json({ error: "Auth verification failed" });
  }
}

module.exports = { requireAuth };
