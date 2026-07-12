/**
 * =================================================================
 * apiFetch - thin wrapper around fetch() that:
 * -----------------------------------------------------------------
 *   - Prefixes the API base (empty string in same-origin prod,
 *     env-overridable for separated frontend/api setups)
 *   - Auto-attaches Supabase JWT bearer token if a session exists
 *   - Sets Content-Type: application/json on body-bearing requests
 *   - Throws a typed ApiError on non-2xx with message + status + body
 *   - Returns parsed JSON on success
 *
 * Usage:
 *   const roster = await apiFetch("/api/yahoo/roster?leagueKey=nfl.l.123");
 * =================================================================
 */

import { supabase } from "./supabase.js";

const BASE = import.meta.env.VITE_API_BASE_URL || "";

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export async function apiFetch(path, opts = {}) {
  const url = BASE + path;
  const headers = new Headers(opts.headers || {});

  // Attach bearer token if a session exists.
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  } catch (_) { /* unconfigured - proceed unauthenticated */ }

  // JSON body shorthand: pass an object, we serialize.
  let body = opts.body;
  if (body && typeof body === "object" && !(body instanceof FormData)
      && !(body instanceof URLSearchParams) && !(body instanceof Blob)) {
    body = JSON.stringify(body);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  const res = await fetch(url, { ...opts, headers, body });

  // Try to parse JSON (most of our endpoints return it). Fall back
  // to text if the server returned something else.
  const ct = res.headers.get("content-type") || "";
  let parsed;
  if (ct.includes("application/json")) {
    parsed = await res.json().catch(() => null);
  } else {
    parsed = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const msg = (parsed && parsed.error) || `Request failed: ${res.status}`;
    throw new ApiError(msg, res.status, parsed);
  }
  return parsed;
}
