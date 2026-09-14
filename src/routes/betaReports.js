"use strict";
const express = require("express");
const SCREENS = new Set(["command_center", "omen", "omen_evidence", "start_sit", "league", "waiver", "trade", "ledger", "ledger_detail", "account", "sign_in", "email_code", "connect_league", "espn_connect", "connect_failed", "switcher"]);
const FIELDS = new Set(["screen", "app_version", "build", "os_version", "device_model", "connection_state", "recent_error_codes", "message", "disclosure_accepted"]);
const DISCLOSURE = "Reports are summarized by a model for a daily founder digest. Do not include league data or credentials.";
const SENSITIVE = /espn_s2|swid|bearer\s|eyJ[A-Za-z0-9_-]+\.|(?:cookie|token|password|secret|authorization)\s*[:=]/i;
function validReport(body) {
  if (!body || Array.isArray(body) || Object.keys(body).some((k) => !FIELDS.has(k))) return false;
  if (!SCREENS.has(body.screen) || body.disclosure_accepted !== true) return false;
  for (const key of ["app_version", "build", "os_version", "device_model"]) {
    if (typeof body[key] !== "string" || !/^[A-Za-z0-9 ._()+-]{1,80}$/.test(body[key])) return false;
  }
  if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000) return false;
  if (!/^(espn|yahoo|sleeper):(connected|disconnected|reconnect_required|unavailable|pending)$/.test(body.connection_state) && body.connection_state !== "none") return false;
  if (!Array.isArray(body.recent_error_codes) || body.recent_error_codes.length > 5 || body.recent_error_codes.some((v) => typeof v !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(v))) return false;
  return !SENSITIVE.test(JSON.stringify(body));
}
async function defaultStore(row) {
  const { createClient } = require("@supabase/supabase-js");
  const config = require("../config");
  const { data, error } = await createClient(config.supabaseUrl, config.supabaseServiceKey)
    .from("beta_reports").insert(row).select("id").single();
  if (error || !data?.id) throw Error("report_storage_unavailable");
  return data;
}
function createBetaReportsRouter({ authenticate, store = defaultStore, now = () => new Date() } = {}) {
  const router = express.Router();
  const auth = authenticate || require("../middleware/auth").requireAuth;
  router.get("/schema", (_req, res) => res.json({ contract_version: "beta-report.v1", screens: [...SCREENS], screenshots_supported: false, disclosure: DISCLOSURE }));
  router.post("/", auth, async (req, res) => {
    if (!validReport(req.body)) return res.status(400).json({ contract_version: "beta-report-error.v1", error: "invalid_report", message: "Check the report fields. Attachments and automatic league data are not accepted." });
    const createdAt = now();
    const row = Object.fromEntries([...FIELDS].map((key) => [key, req.body[key]]));
    row.user_id = req.user.id;
    row.created_at = createdAt.toISOString();
    row.expires_at = new Date(createdAt.getTime() + 30 * 86400000).toISOString();
    try {
      const saved = await store(row);
      if (!saved?.id) throw Error("report_storage_unavailable");
      return res.status(201).json({ contract_version: "beta-report.v1", id: saved.id, status: "received", message: "Report received. Thank you." });
    } catch {
      return res.status(503).json({ contract_version: "beta-report-error.v1", error: "report_storage_unavailable", message: "Your report was not saved. Please try again later." });
    }
  });
  return router;
}
module.exports = { createBetaReportsRouter };
