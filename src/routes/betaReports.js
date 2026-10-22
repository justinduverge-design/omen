"use strict";
const express = require("express");
const SCREENS = new Set([
  "command_center",
  "omen",
  "omen_evidence",
  "start_sit",
  "league",
  "waiver",
  "trade",
  "ledger",
  "ledger_detail",
  "account",
  "sign_in",
  "email_code",
  "connect_league",
  "espn_connect",
  "connect_failed",
  "switcher",
  "support",
]);
// What the person picked on the Support screen. Optional, so older builds still send reports.
const TOPICS = {
  bug: "Something broke",
  call: "A call looks wrong",
  connection: "League connection",
  question: "Question",
};
const FIELDS = new Set([
  "screen",
  "app_version",
  "build",
  "os_version",
  "device_model",
  "connection_state",
  "recent_error_codes",
  "message",
  "disclosure_accepted",
  "topic",
]);
const DISCLOSURE =
  "Omen's own model, on Omen's servers, summarizes each report and the founder gets that summary by email and can reply to your account email. Your words stay on Omen's servers and are deleted after 30 days. Do not include league data or credentials.";
// A report is refused, never scrubbed, when any of these match: an ESPN cookie label in any spelling
// (`espn_s2`, `ESPN S2`, `espn-s2`, `espnS2`, `s2=`), a SWID label or braced GUID, a bearer/JWT, a
// credential label with a value, or a bare cookie-shaped value (a long unbroken run of URL-safe or
// percent-encoded characters, which is what `espn_s2` looks like when pasted on its own).
const SENSITIVE = [
  /espn[\s_-]*s2/i,
  /\bs2\s*[:=]/i,
  /swid/i,
  /\{[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\}/i,
  /bearer\s|eyJ[A-Za-z0-9_-]+\./i,
  /(?:cookie|token|password|secret|authorization)\s*[:=]/i,
  /[A-Za-z0-9+/=_-]{80,}/,
];
// A long unbroken run that contains a percent-encoding (how a pasted `espn_s2` looks). Runs are found by one
// left-to-right match, so the check stays linear in the report's length; a lookahead regex here backtracked
// quadratically on a long run without `%` (Codex, #523).
const URL_SAFE_RUN = /[A-Za-z0-9%+/=_-]+/g;
const PERCENT_ENCODED = /%[0-9A-F]{2}/i;
function hasPercentEncodedRun(text) {
  for (const run of text.match(URL_SAFE_RUN) || []) {
    if (run.length >= 60 && PERCENT_ENCODED.test(run)) return true;
  }
  return false;
}
function looksSensitive(text) {
  return SENSITIVE.some((pattern) => pattern.test(text)) || hasPercentEncodedRun(text);
}
function validReport(body) {
  if (!body || Array.isArray(body) || Object.keys(body).some((k) => !FIELDS.has(k))) return false;
  if (!SCREENS.has(body.screen) || body.disclosure_accepted !== true) return false;
  if (body.topic !== undefined && !Object.hasOwn(TOPICS, body.topic)) return false;
  for (const key of ["app_version", "build", "os_version", "device_model"]) {
    if (typeof body[key] !== "string" || !/^[A-Za-z0-9 ._()+-]{1,80}$/.test(body[key])) return false;
  }
  if (typeof body.message !== "string" || !body.message.trim() || body.message.length > 4000) return false;
  if (
    !/^(espn|yahoo|sleeper):(connected|disconnected|reconnect_required|unavailable|pending)$/.test(
      body.connection_state,
    ) &&
    body.connection_state !== "none"
  )
    return false;
  if (
    !Array.isArray(body.recent_error_codes) ||
    body.recent_error_codes.length > 5 ||
    body.recent_error_codes.some((v) => typeof v !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(v))
  )
    return false;
  return !looksSensitive(JSON.stringify(body));
}
async function defaultStore(row) {
  const { createClient } = require("@supabase/supabase-js");
  const config = require("../config");
  const { data, error } = await createClient(config.supabaseUrl, config.supabaseServiceKey)
    .from("beta_reports")
    .insert(row)
    .select("id")
    .single();
  if (error || !data?.id) throw Error("report_storage_unavailable");
  return data;
}
// What happens after a report is saved (founder, 2026-10-21: "I want Ollama to summarize it… inspect the
// error… send it as an email"). The report's words are read only by the private Ollama model (fact-of-record
// 17); what leaves for the founder's inbox through Resend is Ollama's summary and the report's metadata,
// never the raw note. SUPPORT_NOTIFY_EMAIL is the inbox; unset, nothing is sent and the report stays stored.
async function defaultNotify({ subject, text, replyTo }) {
  const to = process.env.SUPPORT_NOTIFY_EMAIL;
  if (!to) return false;
  const config = require("../config");
  if (!config.resend?.apiKey) return false;
  const axios = require("axios");
  try {
    await axios.post(
      "https://api.resend.com/emails",
      {
        from: "Omen Reports <reports@slopssaloon.com>",
        to: [to],
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      },
      {
        headers: { Authorization: `Bearer ${config.resend.apiKey}`, "Content-Type": "application/json" },
        timeout: 5000,
      },
    );
    return true;
  } catch {
    return false;
  }
}

// The reporter's provider connections, so the triage can tell "ESPN signed them out" from an app bug.
async function defaultContext(userId) {
  try {
    const { createClient } = require("@supabase/supabase-js");
    const config = require("../config");
    const { data } = await createClient(config.supabaseUrl, config.supabaseServiceKey)
      .from("platform_connections")
      .select("platform, status, updated_at")
      .eq("user_id", userId);
    return { connections: (data || []).map((c) => `${c.platform}: ${c.status} (updated ${c.updated_at})`) };
  } catch {
    return { connections: [] };
  }
}

const TRIAGE_SYSTEM = `You triage bug reports for Omen, a fantasy football app (iPhone) that reads ESPN, Yahoo and Sleeper leagues.
Read the report and the facts about the reporter's app and connections. Reply with JSON only:
{"summary": "two sentences, what the person hit, in plain words", "category": "bug|bad_call|connection|question",
"severity": "high|medium|low", "likely_cause": "one sentence, from the facts given only; say unknown if they do not show it",
"next_step": "one sentence the founder can act on", "agent_brief": "a short task an engineering agent could start from: screen, error codes, app build, what to check"}
Never repeat names, emails, league names or anything that looks like a password or cookie.`;

function triagePrompt(row, topic, context) {
  return [
    `Topic picked: ${TOPICS[topic] || "none"}`,
    `Screen: ${row.screen}`,
    `App: ${row.app_version} (${row.build}) on ${row.device_model}, ${row.os_version}`,
    `Connection on the device: ${row.connection_state}`,
    `Recent error codes: ${row.recent_error_codes.join(", ") || "none"}`,
    `Connections on the server: ${context.connections.join("; ") || "none found"}`,
    "",
    "Report:",
    row.message,
  ].join("\n");
}

async function defaultTriage(row, topic, context) {
  const { runAgent } = require("../services/llm");
  const raw = await runAgent(TRIAGE_SYSTEM, triagePrompt(row, topic, context), { maxTokens: 500 });
  if (!raw) return null;
  try {
    return cleanTriage(
      JSON.parse(
        String(raw)
          .trim()
          .replace(/^```(?:json)?\s*/i, "")
          .replace(/\s*```$/i, ""),
      ),
    );
  } catch {
    return null;
  }
}

const TRIAGE_FIELDS = ["summary", "category", "severity", "likely_cause", "next_step", "agent_brief"];
const EMAIL_ADDRESS = /[^\s@]+@[^\s@]+\.[^\s@]+/g;
// The model is asked to leave out names and credentials; this does not trust it to. Every field must be a
// short string, email addresses are removed, and anything credential-shaped drops the whole read. Names
// of people or leagues cannot be detected reliably; that residual risk is the founder's recorded call
// (decision log 2026-10-21).
function cleanTriage(json) {
  if (!json || typeof json !== "object") return null;
  const out = {};
  for (const key of TRIAGE_FIELDS) {
    const value = json[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") return null;
    out[key] = value.replace(EMAIL_ADDRESS, "[email]").slice(0, 600);
  }
  if (!out.summary || looksSensitive(JSON.stringify(out))) return null;
  return out;
}

function reportMail(row, ref, storedId, topic, triage, context, replyTo) {
  const label = TOPICS[topic] || "Report";
  const head = triage
    ? [
        triage.summary,
        "",
        `Severity: ${triage.severity || "?"} · ${triage.category || label}`,
        `Likely cause: ${triage.likely_cause || "unknown"}`,
        `Next step: ${triage.next_step || "read the report"}`,
        "",
        "Agent brief (paste into Codex, Jules or Claude Code):",
        triage.agent_brief || "",
      ]
    : ["Ollama could not summarize this one. Read it in beta_reports (id below)."];
  const text = [
    ...head,
    "",
    `Ticket: ${ref} · beta_reports id ${storedId}`,
    `Reply goes to: ${replyTo || "no email on the account"} (user ${row.user_id})`,
    `Screen: ${row.screen} · App ${row.app_version} (${row.build}) · ${row.device_model}, ${row.os_version}`,
    `Device connection: ${row.connection_state} · Server: ${context.connections.join("; ") || "none"}`,
    `Recent errors: ${row.recent_error_codes.join(", ") || "none"}`,
    "",
    "The person's own words stay in Omen's database (30 days), not in this email.",
  ].join("\n");
  const severity = triage?.severity === "high" ? "HIGH · " : "";
  return { subject: `[Omen] ${severity}${label} · ${ref}`, text, replyTo };
}

function ticketRef() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "R-";
  for (let i = 0; i < 6; i++) ref += alphabet[Math.floor(Math.random() * alphabet.length)];
  return ref;
}

// Reports are keyed to the sign-in (beta_reports.user_id -> auth.users, redo step 09), so a person with no
// app row can still report. Do not create an app row here: that could recreate an account that
// account_erase() has just deleted (Codex, #523).
function createBetaReportsRouter({
  authenticate,
  store = defaultStore,
  notify = defaultNotify,
  triage = defaultTriage,
  context = defaultContext,
  // The summary and email run after the reply: a CPU model can take half a minute, and the person
  // should not wait on it. Tests pass a collector to await the work.
  defer = (work) => setImmediate(() => work().catch(() => {})),
  now = () => new Date(),
} = {}) {
  const router = express.Router();
  const auth = authenticate || require("../middleware/auth").requireAuth;
  router.get("/schema", (_req, res) =>
    res.json({
      contract_version: "beta-report.v1",
      screens: [...SCREENS],
      screenshots_supported: false,
      disclosure: DISCLOSURE,
    }),
  );
  router.post("/", auth, async (req, res) => {
    if (!validReport(req.body))
      return res.status(400).json({
        contract_version: "beta-report-error.v1",
        error: "invalid_report",
        message: "Check the report fields. Attachments and automatic league data are not accepted.",
      });
    const createdAt = now();
    const { topic, ...fields } = req.body;
    const row = Object.fromEntries([...FIELDS].filter((k) => k !== "topic").map((key) => [key, fields[key]]));
    // The table's screen check predates the Support screen, which lives under Account.
    if (row.screen === "support") row.screen = "account";
    row.user_id = req.user.id;
    row.created_at = createdAt.toISOString();
    row.expires_at = new Date(createdAt.getTime() + 30 * 86400000).toISOString();
    let saved;
    try {
      saved = await store(row);
      if (!saved?.id) throw Error("report_storage_unavailable");
    } catch {
      return res.status(503).json({
        contract_version: "beta-report-error.v1",
        error: "report_storage_unavailable",
        message: "Your report was not saved. Please try again later.",
      });
    }
    const ref = ticketRef();
    const replyTo = typeof req.user.email === "string" ? req.user.email : null;
    // With the default sender and no inbox configured there is no one to tell, so the model is not woken.
    const nobodyToTell = notify === defaultNotify && (!process.env.SUPPORT_NOTIFY_EMAIL || !process.env.RESEND_API_KEY);
    if (!nobodyToTell)
      defer(async () => {
        const facts = await context(row.user_id).catch(() => ({ connections: [] }));
        const read = await triage(row, topic, facts).catch(() => null);
        await notify(reportMail(row, ref, saved.id, topic, read, facts, replyTo));
      });
    return res.status(201).json({
      contract_version: "beta-report.v1",
      id: ref,
      stored_id: saved.id,
      status: "received",
      message: "Received. A person reads every report and replies by email.",
    });
  });
  return router;
}
module.exports = { createBetaReportsRouter, looksSensitive, cleanTriage };
