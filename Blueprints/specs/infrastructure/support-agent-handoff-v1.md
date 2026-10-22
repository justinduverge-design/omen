# Support agent handoff v1 (plan)

**Status:** Plan, revision 3 (2026-10-21). Agreed in conversation by the founder; nothing is wired.
Revision 3 makes the handoff autonomous: the founder's only step is the merge. Muse was considered as a
WhatsApp decision channel and dropped.
**Builds on:** the report pipeline in `src/routes/betaReports.js` (save → local Ollama triage → email to
the founder), decision log 2026-10-21.

## What the founder asked for

"How can we get it to Jules without me being in the way? How can we get a fix being autonomous?" A
high-severity bug report should reach an agent, be investigated, fixed, tested and reviewed without the
founder pushing it along. The founder decides one thing: whether the finished fix merges.

## Three facts that shape the design

1. **The repo is public** (`justinduverge-design/omen`). An issue or PR is readable by anyone. Nothing a
   tester typed, nothing that identifies them, and no sentence a model wrote about their report may reach
   GitHub. With no human looking before the issue opens, the issue must be safe **by construction**.
2. **Merging to `main` deploys to production.** Fleet constitution item 1: nothing remediates or deploys
   on its own. So the chain stops at a merge-ready PR.
3. **The repo's Jules rule was "a person adds the label after review."** Revision 3 replaces that rule for
   this one path, because the issue it labels contains no free text to review. The dependency path keeps
   the manual rule.

## What the fleet already gives us

| Service | Where | Use here |
|---|---|---|
| GlitchTip (Sentry-compatible error tracker) | Command Center | The server's real errors with stack traces, from the 15 minutes before a report. |
| Vector log receiver | Command Center, daily files from KVM1 and KVM2 | API and cron log lines matching the report's error codes in the same window. |
| OpenTelemetry collector | Command Center | Which route failed or was slow. No user ids by design. |
| Uptime Kuma, Beszel | Command Center | Was the API or a host down at the time? |
| Ollama (Gemma) | KVM2, tailnet only | Reads report and evidence, writes the private summary and decides the category. Advisory only (fleet constitution 2). |
| Discord alert dispatcher | Command Center | Notification-only ping. |
| Resend | Outside | The email. |

## The flow

```
Report saved on KVM1 (built)
  → slops-report-triage on Command Center (every 5 min) picks up new reports
      gathers: GlitchTip issues + Vector lines + Kuma/Beszel state, 15 minutes before the report,
               matched on error codes, screen route and app build
      → Ollama on KVM2 → private summary, severity, category, likely cause, next step
  → email to the founder with the summary and the evidence (always)
  → automatic handoff when ALL of these hold (§ Gate):
       severity high · category bug · a matching GlitchTip error exists · under the rate limit ·
       not handed off already · kill switch on
       → build the public issue from fixed fields only (§ Public issue)
       → open it and add the `jules` label
       → Discord ping: ticket ref, severity, screen, issue link
  → Jules investigates in its own sandbox and opens one PR
  → CI runs
  → a fresh review agent reviews the diff (automatic, on PR open)
       findings → posted on the PR for Jules to address, once
       still failing after that → labelled `needs-founder`, email to the founder, stop
  → CI green and review clean
       → one email: "Fix ready for R-7KQ2PX: <PR title>. <PR link>. Merge?"
  → the founder merges, or closes it. Merge deploys as usual.
```

If the gate does not pass (no matching server error, a question, a bad call, the limit reached), the
report stays an email to the founder, with the agent brief to paste by hand.

## Gate: what goes to Jules on its own

| Condition | Why |
|---|---|
| Ollama rates it high and calls it a bug | Questions and "the call looks wrong" are not code fixes. |
| GlitchTip has an error in the window that matches the screen's route or an error code | Evidence of a real server fault, not a model's guess. No match, no automatic handoff. |
| At most 2 handoffs a day | Caps cost and noise. |
| The same GlitchTip issue or error-code set was not handed off in the last 7 days | One issue per fault. Later reports add "N people hit this" to the open issue as a count only. |
| Kill switch `SUPPORT_AUTOFIX` is `on` | A GitHub repository variable, so the founder can turn it off from the GitHub app on a phone. Default off. |

## Public issue: built from fixed fields only

The issue is a template filled with values that cannot carry free text:

| In the issue | Source | Why it is safe |
|---|---|---|
| Ticket ref `R-7KQ2PX` | generated | Random, means nothing outside Omen |
| Screen, app version and build, iOS version, device model | report metadata | Validated by the report route's allowlist regexes |
| Error codes | report | Restricted to `^[a-z][a-z0-9_]{0,63}$` |
| Provider and connection state (`espn · needs_reconnect`) | server | Two fixed vocabularies |
| Stack frames as `file:line` and function name, from the repo's own `src/` only | GlitchTip | Paths and symbols from our public code. **Error messages and variable values are dropped.** Frames outside `src/` are dropped. |
| Failing route template (`POST /api/trade/compare`) and HTTP status | Vector / OpenTelemetry | Route templates only, never a raw URL |
| How many people hit it | count | A number |
| The task | fixed text | "Reproduce on this screen with these codes. Find the cause starting from these frames. Open one PR with a test that fails before the fix. Do not touch sign-in, credentials, database migrations, billing or deploy files." |

Never in the issue: the tester's note, Ollama's summary or brief, user id, email, league, team or player
names, raw log lines, error messages. Tests feed the builder real-looking reports and stack traces that
contain names, emails and cookie-shaped strings, and assert none of it appears.

## After the PR opens

| Step | What runs | Notes |
|---|---|---|
| CI | existing workflows | Unchanged. |
| Review | a fresh review agent on PR open (Codex review via `@codex review`, or a Claude Code Action once set up) | Posts findings on the PR. Jules addresses them once. |
| Protected areas | path check in CI | A diff touching `src/middleware/auth*`, `sql/`, `deploy/`, `.github/`, credentials or billing code gets `needs-founder` and the automatic loop stops. |
| Ready | CI green, review clean, no `needs-founder` | One email to the founder with the PR link. |
| Merge | the founder | Never automatic. Merge deploys. |

## Guardrails

| Guard | Detail |
|---|---|
| No data access | Jules sees only the repo. It cannot read `beta_reports`, Supabase, GlitchTip or the warehouse. |
| Credential | One fine-grained GitHub token, this repo only, **Issues: write** and **Pull requests: write** (for the review comment and labels), stored root-only on Command Center. The founder creates it. |
| Kill switch | `SUPPORT_AUTOFIX` repository variable, default off. Off means email only. |
| Rate and de-duplication | § Gate. |
| Audit | Every automatic handoff is appended to a log on Command Center: ticket, GlitchTip issue, issue number, time. |
| Later, not now | Automatic merge of small fixes (one file, test added, clean review) is a separate decision after a few weeks of seeing Jules's PRs. |

## What gets built

1. **Read-only report route** on the API for the triage job: new reports since a cursor, behind a
   dedicated tailnet-only identity. The API stops calling Ollama itself.
2. **`slops-report-triage`** on Command Center (systemd timer, every 5 minutes): evidence from GlitchTip
   (read-only Postgres, as the dispatcher does), Vector files, OpenTelemetry and Kuma; the Ollama call;
   the email; the gate; the issue. Proven the fleet way: manual run, controlled failure, recovery, timer,
   reboot. The 512 GB SSD gives room to keep Vector logs longer than 14 days if wanted.
3. **Public issue builder** with the leak tests above, and `.github/ISSUE_TEMPLATE/agent-triage.md`.
4. **PR loop:** a workflow on Jules's PRs that requests the review, applies `needs-founder` on protected
   paths, and sends the "fix ready" email when CI and review are clean.
5. Drafts, de-duplication and audit state: files on Command Center, no new database table.

## Order

1. Turn on the email part (needs `RESEND_API_KEY` and `SUPPORT_NOTIFY_EMAIL` on the API host).
2. Build the triage job on Command Center; run it email-only for a week and read the summaries.
3. Build the issue builder and PR loop; flip `SUPPORT_AUTOFIX` on.

## Founder decisions still needed

1. Creating the GitHub token.
2. Which reviewer runs on Jules's PRs: Codex (`@codex review`, works today) or a Claude Code Action (needs
   setting up).
3. Flipping the kill switch on, after step 2 of the order.
