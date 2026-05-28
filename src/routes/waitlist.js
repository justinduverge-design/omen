"use strict";

/**
 * POST /api/waitlist
 *
 * Public endpoint — no auth required.
 * 1. Validates email format.
 * 2. Inserts row into public.waitlist_signups via service_role.
 * 3. Fires a welcome email via Resend (best-effort; signup never fails on email error).
 */

const express          = require("express");
const axios            = require("axios");
const { createClient } = require("@supabase/supabase-js");
const config           = require("../config");
const { logger }       = require("../middleware/logging");

const router   = express.Router();
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/", async (req, res) => {
  const { email, platform } = req.body || {};

  if (!email || !EMAIL_RE.test(String(email).trim())) {
    return res.status(400).json({ error: "Valid email is required." });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  const { error: dbError } = await supabase
    .from("waitlist_signups")
    .insert({ email: cleanEmail, platform: platform || null });

  if (dbError) {
    logger.error("waitlist insert failed", { err: dbError.message });
    return res.status(500).json({ error: "Could not save your signup. Please try again." });
  }

  // Best-effort email — never blocks or fails the signup
  if (config.resend?.apiKey) {
    axios.post(
      "https://api.resend.com/emails",
      {
        from: "Corvus <hello@slopssaloon.com>",
        to: [cleanEmail],
        subject: "You're on the Corvus waitlist",
        html: waitlistEmailHtml(),
      },
      {
        headers: {
          Authorization: `Bearer ${config.resend.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    ).catch((err) => logger.warn("Resend email failed", { err: err.message }));
  }

  res.json({ ok: true });
});

function waitlistEmailHtml() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" style="max-width:520px;background:#0c0c0c;border:1px solid rgba(201,164,76,0.2);border-radius:12px;padding:40px;">
        <tr><td>
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.28em;text-transform:uppercase;color:#C9A44C;">CORVUS</p>
          <h1 style="margin:0 0 20px;font-size:24px;font-weight:600;color:#F4EFE1;line-height:1.3;">You're on the list.</h1>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(244,239,225,0.7);">
            We'll reach out as soon as Corvus is ready for you.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:rgba(244,239,225,0.7);">
            Corvus is your weekly fantasy football edge — personalized picks, plain-English reasoning, no spreadsheets.
            Your Omen of the Week tells you the one move that matters most before kickoff.
          </p>
          <p style="margin:32px 0 0;font-size:13px;color:rgba(244,239,225,0.35);">— The Corvus Team</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = router;
