#!/usr/bin/env node
/**
 * One-shot script: send welcome email to existing waitlist signups.
 *
 * Skips test entries (@example.invalid) automatically.
 * Safe to run multiple times — logs each send so you can see what happened.
 *
 * Usage (from the corvus project root):
 *   RESEND_API_KEY=re_xxx SUPABASE_URL=xxx SUPABASE_SERVICE_KEY=xxx node scripts/email-waitlist-backfill.js
 *
 * Or with Infisical:
 *   infisical run --env=prod -- node scripts/email-waitlist-backfill.js
 */

"use strict";

const https = require("https");

const RESEND_API_KEY    = process.env.RESEND_API_KEY;
const SUPABASE_URL      = process.env.SUPABASE_URL;
const SUPABASE_KEY      = process.env.SUPABASE_SERVICE_KEY;
const FROM              = "Omen <hello@slopssaloon.com>";
const SUBJECT           = "You're on the Omen waitlist";
const DELAY_MS          = 500; // be polite to Resend rate limits

if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing required env vars: RESEND_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY");
  process.exit(1);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function post(url, headers, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const opts = {
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data), ...headers },
    };
    const req = https.request(url, opts, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

function get(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: "GET", headers }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on("error", reject);
    req.end();
  });
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function emailHtml() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0c0c0c;border:1px solid rgba(201,164,76,0.2);border-radius:12px;padding:40px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#C9A44C;">OMEN</p>
          <h1 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#F4EFE1;line-height:1.3;">You're on the list.</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(244,239,225,0.7);">
            We'll reach out as soon as Omen is ready for you.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(244,239,225,0.7);">
            Omen is your weekly fantasy football edge — personalized picks, plain-English reasoning, no spreadsheets.
            Your Omen of the Week tells you the one move that matters most before kickoff.
          </p>
          <p style="margin:32px 0 0;font-size:13px;color:rgba(244,239,225,0.35);">— The Omen Team</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Fetch all waitlist signups
  const supabaseHost = SUPABASE_URL.replace(/\/$/, "");
  const { status: fetchStatus, body: rows } = await get(
    `${supabaseHost}/rest/v1/waitlist_signups?select=id,email,created_at&order=created_at.asc`,
    {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
    }
  );

  if (fetchStatus !== 200) {
    console.error("Failed to fetch waitlist signups:", fetchStatus, rows);
    process.exit(1);
  }

  const real = rows.filter((r) => !r.email.endsWith(".invalid"));
  const skipped = rows.length - real.length;

  console.log(`Found ${rows.length} signups — ${real.length} real, ${skipped} test entries skipped.\n`);

  if (real.length === 0) {
    console.log("Nothing to send.");
    return;
  }

  for (const row of real) {
    process.stdout.write(`Sending to ${row.email} ... `);

    const { status, body } = await post(
      "https://api.resend.com/emails",
      { Authorization: `Bearer ${RESEND_API_KEY}` },
      { from: FROM, to: [row.email], subject: SUBJECT, html: emailHtml() }
    );

    if (status === 200 || status === 201) {
      console.log("✓ sent");
    } else {
      console.log(`✗ failed (${status}): ${body}`);
    }

    await sleep(DELAY_MS);
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
