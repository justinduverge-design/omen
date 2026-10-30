# Omen current work list: Build 13

**Rebuilt:** 2026-10-26 (founder approved the same day) from `main` (14638c63), open PRs, `Direction/release/builds/build-13.md` and recall.
The 2026-10-25 list is archived at `Archive/sprints/2026-10-26-current_sprint-stale.md` (its Build 12 lane
closed when Build 12 shipped to TestFlight 0.1.0 (12) on 2026-10-25). States: `Direction/status-model.md`.
A pin in `Direction/agent_inbox.md` wins. One lane per session, each in its own worktree. Build 13 goal:
Sight forecasts the stat line and every decision screen shows it next to the league's projection.

## Lane 0: unblock (small, do first)

### B13-RUFF — clear the Python lint on main
- **Status:** IN_PROGRESS
- **Claim:** Claude, 2026-10-26 (PR #790)
- **Blocked by:** FOUNDER_APPROVAL — merge #790
- **Priority:** P0
- **Done when:** `ruff check` and `ruff format --check` are clean on `main`.

### B13-YAHOO-FIXTURE — fix the stale `empty_hold_noproj` Yahoo fixture
- **Status:** READY
- **Blocked by:** None
- **Priority:** P0
- **Why:** `npm run contracts:check` fails in the cloud on its wording (found by the first Codex cloud run).
- **Done when:** `contracts:check` passes locally and in a cloud run.

### B13-RECORD — Build 12 shipped, Build 13 open
- **Status:** IN_PROGRESS
- **Claim:** Claude, 2026-10-26 (branch `records/build-12-shipped`)
- **Blocked by:** FOUNDER_APPROVAL — merge the records PR
- **Priority:** P0
- **Done when:** `build-12.md` says Shipped 2026-10-25, TestFlight 0.1.0 (12); `build-13.md` is the open package.

## Lane 1: Sight forecasts the stat line (the goal)

### B13-SIGHT-STATLINE — per-stat forecasts for the coming weeks
- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **First step:** a design note (model, features, held-out scorecard)
- **Scope:** targets, catches, rec yards; carries, rush yards; pass yards; TDs by kind. QB/RB/WR/TE first,
  K and DEF after. Built alongside current Sight, switched once via `SIGHT_VERSION`.
- **Done when:** a held-out scorecard per stat exists and the forecast-authority block records where Omen's
  error beats the provider's.

### B13-LEAGUE-SCORING — score the stat line with each league's own rules
- **Status:** READY
- **Blocked by:** TASK-B13-SIGHT-STATLINE — the stat-line forecast must exist
- **Priority:** P1
- **Done when:** Sleeper, ESPN (incl. custom) and Yahoo rules score the forecast; Yahoo's approximate scoring is retired.

### B13-DECISION-TABLE — season so far / Omen expects / league projection on decision screens
- **Status:** READY
- **Blocked by:** TASK-B13-LEAGUE-SCORING — scored forecasts must exist (server contract first, then iOS)
- **Priority:** P1
- **Done when:** trade, start/sit and waivers show the table for both players in the move, labelled honestly.

### B13-WIN-PROB — win probability on the Desk cards
- **Status:** READY
- **Blocked by:** TASK-B13-LEAGUE-SCORING — scored forecasts must exist
- **Priority:** P1
- **Done when:** the Desk bar shows win probability from Omen's forecast, replacing "share of projected points".

## Lane 2: trust and proof

### B13-ESPN-NEW-ACCOUNT — fresh ESPN login, end to end
- **Status:** READY
- **Blocked by:** EXTERNAL — the proof run needs a new ESPN tester account (the checklist can be prepped now)
- **Priority:** P1
- **Done when:** connection and full ingestion are proven with a new account, and the legacy row with no
  `espn_team_id` is repaired or retired (founder approves any production row change).

### B13-EVIDENCE-DATES — refresh provider-capability evidence
- **Status:** VERIFIED
- **Claim:** 2026-10-26 Codex — repository-only evidence reconciliation
- **Evidence:** PR #796; `Blueprints/specs/football-data/provider-capability-matrix.json`, `scripts/generate-provider-matrix.js`, `test/providerCapabilityMatrix.test.js`
- **Blocked by:** None
- **Priority:** P2
- **Note:** good cloud task
- **Done when:** every capability in the matrix has a re-checked date and one of the five classes in `build-13.md`.

### B13-SUPPORT-DELIVERY — in-app report reaches the founder and can be closed
- **Status:** READY
- **Blocked by:** None
- **Priority:** P1
- **Note:** #769 added the local Ollama summary email; prove it end to end
- **Done when:** a report from the app arrives, privacy-safe, and the founder can close it.

### B13-ERROR-TRACKING — crashes and server errors visible again
- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — which error-tracking tool (no paid spend)
- **Priority:** P1
- **Done when:** a forced test crash on iOS and a server error each show up within minutes.

## Lane 3: product follow-ups (1.0 must-haves; after Lane 1 starts)

### B13-BUILD-TRADE-OWN-ROSTER — server contract for the user's own roster + an explicit side selector
- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Done when:** the user can build a trade from their own roster on all three providers.

### B13-MOVE-FOLLOWTHROUGH — "I made the move / Not this week" write route
- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Done when:** both answers are saved and shown back on the Desk.

### B13-DESK-P2S — the Desk's Ledger line says so when the Ledger can't load; the Desk gets "Report a problem"
- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Done when:** both fixes are on the Desk with tests.

### B13-FIND-TRADE-REALISM — candidate policy when no fair swap clears the guard, without weakening fairness
- **Status:** READY
- **Blocked by:** AGENT_RESOLVABLE — write the design note first; founder approves the policy
- **Priority:** P2
- **Done when:** an approved policy and Find a Trade follows it.

### B13-SMALL-MODELS — `qwen3:1.7b` narration eval + small-model background workers with shadow receipts; no production change
- **Status:** READY
- **Blocked by:** None
- **Priority:** P2
- **Done when:** a held-out eval and one shadow-receipt worker are recorded.

## Lane 4: alert maintenance loop (proposed 2026-10-29; findings `Direction/reviews/2026-10-29-pi-alert-repeats.md`)

The dispatcher stays notification-only (fleet spec, Constitution item 1). Every item below changes what it *says*
or when it stays quiet, never what it *does*. Pi deploys are founder-gated.

### B13-ALERT-GLITCHTIP-DOWN — bring the GlitchTip/OTel/Vector stack back on Command Center
- **Status:** VERIFIED
- **Evidence:** 2026-10-29: founder added `cgroup_enable=memory` to the boot line and rebooted; all five containers up; the dispatcher signature dropped `GlitchTip: status=0`; GlitchTip now surfaces issue #2 (ESPN API 404), which is a new, separate item
- **Blocked by:** FOUNDER_APPROVAL — a Pi action (restart or rebuild the `Exited (127)` containers); pairs with `B13-ERROR-TRACKING`
- **Priority:** P1
- **Owner:** founder executes; an agent writes the runbook step (why exit 127, the exact restart, how to prove it)
- **Done when:** the five containers are up, Kuma `GlitchTip` reads 1, and the line leaves the alert with one RECOVERY.

### B13-ALERT-OWNERS — every alert line names an owner and a runbook step
- **Status:** READY
- **Blocked by:** None (repo work); deploy is FOUNDER_APPROVAL
- **Priority:** P1
- **Done when:** a checked-in map (check name → owner, runbook anchor, severity) covers every check the dispatcher
  can emit (14 Steward/Sentinel checks, each Kuma monitor, Pi-hole, GlitchTip, football codes, A4, stale payload).
  Each Discord line ends with `owner=… fix=<runbook#anchor>`. A test fails when a check has no entry.
  A runbook page holds one fix step per check.

### B13-ALERT-SIGNATURE-STABLE — the signature is the check's identity, not its reason text
- **Status:** READY
- **Blocked by:** None (repo work); deploy is FOUNDER_APPROVAL
- **Priority:** P1
- **Done when:** the signature keys on each line's identity only (`check` + `result` for Steward/Sentinel, monitor
  name + status for Kuma, issue short_id for GlitchTip, a fixed key for stale), with reason, hours or other values shown in the body
  but not compared. The stale line no longer re-alerts hourly. A fixture test replays today's posture reason
  changes and gets one alert, not several.

### B13-ALERT-SEVERITY — WARNING is not sent as CRITICAL
- **Status:** READY
- **Blocked by:** None (repo work); deploy is FOUNDER_APPROVAL
- **Priority:** P2
- **Done when:** the header names the highest severity present. WARNING-only changes go out without the CRITICAL
  header, and appear only in the daily digest unless new.

### B13-ALERT-ACK — ack/snooze file the founder edits; quiet until expiry, then loud again
- **Status:** READY
- **Blocked by:** None (repo work); deploy is FOUNDER_APPROVAL
- **Priority:** P1
- **Done when:** `/etc/slops-alerting/acks` (check, expiry, note) mutes a line from alerts and reminders until the
  expiry. Expired acks re-alert. The daily reminder lists acked items in one short "acknowledged" footer so nothing
  vanishes. The dispatcher only reads the file. A test covers mute, expiry, and the footer.

### B13-ALERT-RECALL-SLEEP — the Mac's recall monitors stop paging every night
- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — choose: Kuma maintenance window for the Mac's sleep hours, or drop recall from the dispatcher's Kuma read (Kuma still shows it)
- **Priority:** P2
- **Done when:** a night of Mac sleep produces no CRITICAL/RECOVERY pair, and a recall outage while the Mac is awake still alerts.

### B13-ALERT-POSTURE-DRIFT — accept or fix KVM1/KVM2 posture drift
- **Status:** READY
- **Blocked by:** FOUNDER_APPROVAL — whether the drifted units, containers and listeners become the new baseline
- **Priority:** P2
- **Done when:** the drift is either fixed or written into the posture baseline, and both posture checks read HEALTHY.

### B13-ALERT-WEEKLY-REVIEW — a 10-minute weekly alert review in the closeout
- **Status:** READY
- **Blocked by:** B13-ALERT-OWNERS
- **Priority:** P2
- **Done when:** a standing weekly step lists every line active over 7 days with its owner. Each one is fixed,
  acked with an expiry, or filed as an item. The A4 signature is added to the daily reminder, as its comment
  already claims.

## Open PRs

- #790 ruff (ours). Dependency bumps, founder merges via `scripts/merge-pr.sh`: #791 opentelemetry
  sdk-trace 3.0.0 (major: check), #789 frontend-runtime, #788 android, #787 docker/login-action,
  #786 setup-uv, #785 tailscale action, #784 vite.
