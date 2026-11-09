# Omen current work list: Build 13

**Rebuilt:** 2026-10-26 (founder approved the same day) from `main` (14638c63), open PRs, `Direction/release/builds/build-13.md` and recall.
The 2026-10-25 list is archived at `Archive/sprints/2026-10-26-current_sprint-stale.md` (its Build 12 lane
closed when Build 12 shipped to TestFlight 0.1.0 (12) on 2026-10-25). States: `Direction/status-model.md`.
A pin in `Direction/agent_inbox.md` wins. One lane per session, each in its own worktree. Build 13 goal:
Sight forecasts the stat line and every decision screen shows it next to the league's projection.

**Plan (founder, 2026-11-07; written by Vision):** a build ships Tuesday 2026-11-10 with what is ready (Lane T);
no date pressure after that ("we'll ship when we ship"). Then Omen gets into fantasy football itself: one
**plays** engine (start, sit, bench, add from waivers or free agency, drop, cut, trade) built on Sight's
stat-line forecast scored by each league's rules (Lane 1). Backend cards run on Codex (`omen.backend`), iOS
cards on Claude (`omen.native-ui`). Merging a behaviour change and the TestFlight upload stay the founder's.
Valor-Core's umbrella: `briefs/build-13-plan.md` (Valor-Core#62). Priorities moved on purpose: B13-DESK-P2S
to P1 (it ships Tuesday), B13-WIN-PROB to P2 (it rides the plays screens). Older READY cards in Lanes 2 to 4
lack `Check` and `Run budget`, so the loop skips them until each is carded.

## Lane 0: unblock (small, do first)

### B13-RUFF — clear the Python lint on main
- **Status:** VERIFIED
- **Evidence:** #790 merged (`build-13.md`)

### B13-YAHOO-FIXTURE — fix the stale `empty_hold_noproj` Yahoo fixture
- **Status:** VERIFIED
- **Evidence:** #794 merged (`build-13.md`)

### B13-RECORD — Build 12 shipped, Build 13 open
- **Status:** VERIFIED
- **Evidence:** #793 merged (`build-13.md`)

### B13-CC-PORTABLE — Omen's tests pass on Command Center
- **Status:** READY
- **Task:** omen.backend
- **Blocked by:** None
- **Priority:** P0
- **Goal:** `npm test` passes on cc as on the Mac and CI, so agents there can trust a red test.
- **Context:** Valor-Core `inventory/2026-11-07-cc-readiness.md`: 2 of 2851 fail on cc only.
  `test/mergePrClass.test.mjs:50` (cc's `en_GB.UTF-8` collation orders `sort -u` output differently from JS) and
  `test/footballWarehouseReleaseArtifact.test.js:126` (cc's umask 0002 stages files as 664; `verify-release.sh`
  says "release file mode is invalid").
- **Constraints:** fix where the order and the modes are made (an explicit `chmod` when staging; the test may
  compare as sets or sort with the same rule). `scripts/merge-pr.sh` is founder-merge: if it must change
  (`LC_ALL=C sort`), split that into its own PR. Do not change cc.
- **Done when:** both tests pass under `LC_ALL=en_GB.UTF-8` and `umask 0002`, and still pass on CI.
- **Check:** `umask 0002; LC_ALL=en_GB.UTF-8 node --test test/mergePrClass.test.mjs test/footballWarehouseReleaseArtifact.test.js` → 0 fail; CI green.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 80 turns, 5M tokens

## Lane T: Tuesday's build (2026-11-10)

What merges by Monday night ships; the rest rides the next build. The founder merges behaviour changes,
walks the build on his phone and uploads it.

### B13-DESK-P2S — the Desk's Ledger line says so when the Ledger can't load; the Desk gets "Report a problem"
- **Status:** READY
- **Task:** omen.native-ui
- **Blocked by:** None
- **Priority:** P1
- **Goal:** the Desk never hides a failure: a Ledger that can't load says so, and the Desk has its own "Report a problem".
- **Context:** review P2s from #770 (`build-13.md`, "Carried from Build 12").
- **Constraints:** iOS and the server contract only; behaviour change, so founder-merge.
- **Done when:** both fixes are on the Desk with tests.
- **Check:** `npm test` passes; the iOS unit tests for the Desk pass in the simulator; a screenshot of each state in the PR.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 150 turns, 10M tokens

### B13-PLAIN-WORDS — the Omen grade and football terms explained where they appear
- **Status:** READY
- **Task:** omen.native-ui
- **Blocked by:** None
- **Priority:** P1
- **Goal:** a user can tap the Omen grade or a term like EPA and read, in one or two plain sentences, what it means
  and why this player got it.
- **Context:** `build-13.md` device-walk follow-ups ("Explain football terms such as EPA"); roadmap step 6
  ("explain the Omen grade better"). The grade comes from Sight (`src/services/sightEnrichment.js`).
- **Constraints:** copy from what the server already sends; no new model. Behaviour change, so founder-merge.
- **Done when:** the grade and every abbreviated stat on the decision screens have contextual help.
- **Check:** `npm test` passes; the iOS unit tests pass; screenshots of the help on the grade and on EPA in the PR.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 150 turns, 10M tokens

### B13-TUESDAY-RECORD — Tuesday's build package
- **Status:** READY
- **Task:** omen.release-record
- **Blocked by:** None
- **Priority:** P1
- **Goal:** on Monday 2026-11-09 the build package lists what ships Tuesday and what moved to the next build.
- **Context:** `Direction/release/builds/build-13.md`; this lane.
- **Constraints:** records only.
- **Done when:** `build-13.md` names the PRs in Tuesday's build, the founder's walk checklist, and what carries over.
- **Check:** `grep -c '^| #' Direction/release/builds/build-13.md` grows by each PR merged since #856, and the file has a
  "Tuesday 2026-11-10" section naming the walk checklist and what carries over; a fresh-agent review says pass.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 30 turns, 1.5M tokens

## Lane 1: plays (the goal; after Tuesday)

Omen recommends **plays**: start, sit, bench, add (waivers or free agency), drop, cut and trade. Each play is
ranked by the points it gains the user's team over the coming weeks, scored by the league's own rules, with
a confidence and a one-line reason. The order is forecast → scoring → plays → screens.

### B13-SIGHT-STATLINE — per-stat forecasts for the coming weeks
- **Status:** READY
- **Task:** omen.backend
- **Blocked by:** None
- **Priority:** P1
- **Goal:** Sight forecasts each player's stat line (targets, catches, rec yards; carries, rush yards; pass
  yards; TDs by kind) for each of the coming weeks, QB/RB/WR/TE first, K and DEF after.
- **Context:** current Sight: `src/services/footballWarehouse/sightRun.js`, `derivedStages.js`; the warehouse
  (`warehouse/`); `Blueprints/specs/football-data/`. Decision log 2026-10-25.
- **Constraints:** first PR is a design note (model, features, held-out weeks, scorecard), then the code. Built
  beside the current Sight and switched once through `SIGHT_VERSION`; production flags are the founder's. No
  paid API; no user data leaves Valor hardware.
- **Done when:** a backtest over held-out past weeks gives a scorecard per stat and position, and the
  forecast-authority block records where Omen's error beats the provider's.
- **Check:** `npm test` passes, including a new scorecard test on a fixture season; the design note is merged.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 150 turns, 10M tokens

### B13-LEAGUE-SCORING — score the stat line with each league's own rules
- **Status:** READY
- **Task:** omen.backend
- **Blocked by:** TASK-B13-SIGHT-STATLINE — the stat-line forecast must exist
- **Priority:** P1
- **Goal:** one scorer turns a stat line into fantasy points under any Sleeper, ESPN (custom included) or Yahoo league's rules.
- **Context:** `Blueprints/specs/a6-scoring-coverage-matrix.md`; the provider capability matrix (scoring rules row).
- **Constraints:** retire Yahoo's approximate scoring; unknown rules say so instead of guessing.
- **Done when:** fixture leagues from all three providers score to their own published totals.
- **Check:** `npm test` passes, with fixture leagues for each provider and a custom ESPN league.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 150 turns, 10M tokens

### B13-PLAYS-ENGINE — one engine ranks every kind of play
- **Status:** READY
- **Task:** omen.backend
- **Blocked by:** TASK-B13-LEAGUE-SCORING — scored forecasts must exist
- **Priority:** P1
- **Goal:** for a user's team, the server returns ranked plays of every kind (start, sit, bench, add, drop,
  cut, trade), each with the points gained over the coming weeks, a confidence and a one-line reason, and for
  both players in a move: season so far, Omen expects and the league's projection (the decision table's contract).
- **Context:** `Blueprints/specs/b2-unified-omen-recommendation-layer.md`, `omen-decision-engine-v2.md`,
  `league-aware-waiver-system-v1.md`; Find a Trade's fairness guard.
- **Constraints:** design note first; the engine reads the user's roster, lineup slots, waiver rules and the
  league's scoring; it never weakens the trade fairness guard to make a result. Behaviour change, so founder-merge.
- **Done when:** one endpoint returns plays of all seven kinds, with the decision-table numbers for both
  players, for fixture leagues on all three providers.
- **Check:** `npm test` passes, with a fixture per play kind and a contract test for the endpoint.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 150 turns, 10M tokens

### B13-PLAYS-SCREENS — the app shows the plays
- **Status:** READY
- **Task:** omen.native-ui
- **Blocked by:** TASK-B13-PLAYS-ENGINE and TASK-B13-WIN-PROB — the endpoints must exist
- **Priority:** P1
- **Goal:** the Desk leads with the week's best plays and shows win probability on its matchup bar, and trade,
  start/sit and waivers show "season so far / Omen expects / league projection" for both players in a move.
- **Context:** this lane; foundation spec § 9 (what the server sends).
- **Constraints:** labelled honestly: where Sight doesn't beat the provider, the provider's number leads.
  Behaviour change, so founder-merge.
- **Done when:** every play kind appears on its screen with its reason, the decision table is on all three
  screens, and the Desk's bar shows win probability instead of share of projected points.
- **Check:** `npm test` passes; the iOS unit tests pass; simulator screenshots of each screen in the PR; then
  "ready for device" for the founder's walk.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 150 turns, 10M tokens

### B13-WIN-PROB — win probability on the Desk cards
- **Status:** READY
- **Task:** omen.backend
- **Blocked by:** TASK-B13-LEAGUE-SCORING — scored forecasts must exist
- **Priority:** P2
- **Goal:** the Desk's matchup bar shows the chance of winning from Omen's forecast, replacing "share of projected points".
- **Context:** Build 12's bar; founder 2026-10-25.
- **Constraints:** server first, then iOS in B13-PLAYS-SCREENS. Behaviour change, so founder-merge.
- **Done when:** the matchup endpoint returns a win probability with its method, tested on fixture matchups.
- **Check:** `npm test` passes, with a calibration test on past weeks.
- **Stop when:** done, blocked (say why), or the budget is spent.
- **Run budget:** 150 turns, 10M tokens

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

## Lane 3: product follow-ups (1.0 must-haves; they feed the plays)

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

### B13-FIND-TRADE-REALISM — candidate policy when no fair swap clears the guard, without weakening fairness
- **Status:** READY
- **Blocked by:** AGENT_RESOLVABLE — write the design note first; founder approves the policy
- **Priority:** P2
- **Done when:** an approved policy and Find a Trade follows it.

### B13-SMALL-MODELS — `qwen3:1.7b` narration eval + small-model background workers with shadow receipts; no production change
- **Claim:** Codex, branch `card/b13-small-models`, 2026-11-09
- **Evidence:** synthetic receipt worker and blocked local-host evaluation in `scripts/research/small-model-shadow/README.md`; model evaluation remains blocked by runner network sandbox (`EPERM`).
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
- **Claim:** Claude Code, branch `heal/alert-owners`, 2026-10-30
- **Status:** VERIFIED
- **Evidence:** merged #817; deployed on Command Center 2026-10-31 (`slops-alert-annotate` + `alert-owners.tsv` in `/usr/local/lib/slops-alerting/`, dispatcher sha256 `582949f9…`). The live alert state annotated on the Pi 2026-11-01: every line ends `owner=… fix=ops/command-center/RUNBOOK.md#…`. `test/alertOwners.test.js` fails a check without an entry.
- **Blocked by:** None
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

## Lane 5: self-healing behind a trust chain (proposed 2026-10-29; design `Direction/reviews/2026-10-29-self-healing-design.md`)

### B13-HEAL-CONSTITUTION — amend fleet Constitution item 1 to allow signed, pre-approved playbooks
- **Claim:** Claude Code, branch `heal/constitution`, 2026-10-30
- **Status:** VERIFIED
- **Approval:** Valor-Core decision 0003 item 3 (2026-10-30)
- **Evidence:** fleet spec item 1 reads as amended; `decision_log.md` 2026-10-30 entry; dispatcher unchanged (docs only)
- **Priority:** P1
- **Done when:** item 1 reads as amended, and `decision_log.md` records the decision. The dispatcher stays notification-only.

### B13-HEAL-PLAYBOOKS — playbook schema + v1 action vocabulary in the repo
- **Claim:** Claude Code, branch `heal/playbooks` (stacked on `heal/alert-owners`), 2026-10-30
- **Status:** VERIFIED
- **Evidence:** merged #823 (replaced #819, closed when its base branch was deleted). `test/remediationPlaybooks.test.js` rejects unknown actions, shell fields, missing caps and missing verify checks; `ops/remediation/playbooks/glitchtip-stack.json`. Playbooks are JSON, not YAML (the Pi's Python has no YAML parser).
- **Blocked by:** None
- **Priority:** P1
- **Done when:** `ops/remediation/playbooks/` has a schema with a test that rejects unknown actions, shell fields and
  missing caps or verify checks. There is one playbook for the GlitchTip stack.

### B13-HEAL-SIGNING — CI signs the playbook bundle; the Pi holds only the public key
- **Claim:** Claude Code, branch `heal/signing` (stacked on `heal/playbooks`), 2026-10-30
- **Status:** VERIFIED
- **Evidence:** merged #820, #824 (public key in `allowed_signers`) and #827; secret `REMEDIATION_SIGNING_KEY` added 2026-10-31. Run 41161405069 on main signed bundle seq 20; `ssh-keygen -Y verify` against the committed `allowed_signers` gave a good signature (`SHA256:EVa+jMj/…`), and the Pi accepted it. `test/remediationBundle.test.js` fails a tampered bundle.
- **Blocked by:** None
- **Priority:** P1
- **Done when:** a merge to main produces a signed bundle. A tampered bundle fails verification in a test.

### B13-HEAL-REMEDIATOR-SHADOW — `slops-remediator` runs for a week reporting "would have run"
- **Claim:** Claude Code, branch `heal/remediator-shadow` (stacked on `heal/signing`), 2026-10-30
- **Status:** IN_PROGRESS (shadow week running since 2026-10-31, ends no earlier than 2026-11-07)
- **Evidence so far:** merged #822 and #828; deployed on Command Center 2026-10-31 with founder approval (user `slops-remediator`, timer every 5 min, `/var/lib/slops-alerting` 0750 for its group). It accepted signed bundle seq 20 and runs with `Result=success`. Deploy found two gaps, fixed in #828.
- **On-Pi safety checks:** 2026-11-02, `ssh command-center python3 - < ops/remediation/slops-heal-safety-test` ran the deployed remediator against a copy of the live signed bundle: all 4 passed (real bundle accepted, tampered copy refused, kill switch stops and resumes, retry cap escalates after 2 with its owner).
- **Reboot check:** 2026-11-02 21:47 supervised reboot of Command Center. The timer came back active and the state survived (`highest-seq` still 20; the ledger was empty before and after, since no alert matched a playbook). The safety tests passed 4/4 again after the reboot.
- **Left:** a week of Discord shadow reports (to 2026-11-07).
- **Blocked by:** the shadow week
- **Priority:** P2
- **Done when:** a week of shadow reports in Discord. The refusal, kill-switch, cap and reboot tests pass on the Pi.

### B13-HEAL-LIVE — turn on actions for the v1 vocabulary
- **Status:** READY
- **Blocked by:** B13-HEAL-REMEDIATOR-SHADOW; FOUNDER_APPROVAL
- **Priority:** P2
- **Done when:** a forced container stop is restored and reported, and a permanently broken target escalates with its owner after hitting its cap.

### B13-HEAL-BOOT-ORDER — SSD first, SD card as the fallback (urgent: the card is in the slot now)
- **Status:** VERIFIED
- **Evidence:** applied by the founder 2026-10-29 (`rpi-eeprom-update` at 22:50 in the journal). Read 2026-11-02: `rpi-eeprom-config` and `vcgencmd bootloader_config` (the config the running bootloader booted with) both say `BOOT_ORDER=0xf14`; root is `/dev/sda2`; no `pieeprom.upd` pending. Verify and rollback commands: `Direction/reviews/2026-11-02-monday-checklist.md` step 2.
- **Reboot proof:** 2026-11-02 21:47, supervised by the founder: Command Center rebooted and came back on `/dev/sda2` (new boot ID; `BOOT_ORDER=0xf14`, no pending update, no boot from the SD card).
- **Blocked by:** None
- **Priority:** P0
- **Done when:** `rpi-eeprom-config` shows `BOOT_ORDER=0xf14`, and a reboot comes back on `/dev/sda2`.

### B13-HEAL-SD-SYNC — weekly SSD→SD system copy, with an alert when the Pi booted from SD
- **Status:** VERIFIED
- **Claim:** 2026-11-03 Claude Code (sd-sync session), branch `claude/inspiring-edison-027e76`; also gives `ssd-missing` its producer
- **Built (repo):** `ops/pi-fleet/sd-sync/` (`slops-sd-sync` + weekly timer, `slops-boot-check`), wired into the dispatcher's power block. Tests `test/piSdSync.test.js`. Deploy steps and the supervised test boot from SD: `ops/pi-fleet/sd-sync/README.md`.
- **Deployed:** 2026-11-03 20:45–20:50 EST with founder approval ("Yes, deploy now"). rpi-clone 2.0.27 knows `/boot/firmware`. Backups `*.bak-20261103-before-sd-sync` (dispatcher, `alert-owners.tsv`). First copy `Result=success` in 2:58; the SD's `cmdline.txt` reads `root=PARTUUID=5405a598-02` with `cgroup_enable=memory`, fstab edited by rpi-clone. All three boot-check lines HEALTHY; dispatcher sha256 `da274881…`, a manual run `Result=success`. Timer next: Sun 2026-11-08 04:36.
- **Test boot:** 2026-11-03, founder in the room. SSD unplugged, power on: root `/dev/mmcblk0p2`, `cgroup_enable=memory` in `/proc/cmdline`, GlitchTip, Pi-hole, Kuma and the rest up; `booted-from-sd` CRITICAL `root_on_sd_card` and `ssd-missing` CRITICAL `ssd_not_visible`. The dispatcher sent the alert at 20:51 and the founder saw it on Discord. SSD back in, power on: root `/dev/sda2`, all three lines HEALTHY, 9 containers up.
- **Blocked by:** None
- **Priority:** P1
- **Done when:** the SD card boots a current system that includes the cgroup boot line, and a test boot from SD sends "booted from backup SD".

### B13-HEAL-WATCHDOG — hardware watchdog on all three Pis, plus under-voltage, temperature and throttling watch
- **Status:** VERIFIED
- **Claim:** 2026-10-30 Claude Code (heal-resilience session), branch `claude/heal-watchdog`; temperature and throttling history added 2026-11-02 (branch `heal/lane5-remote`, founder request)
- **Evidence:** deployed 2026-11-02 with founder approval on all three Pis (backups `*.bak-20261102-before-watchdog`). `RuntimeWatchdogUSec=15s RebootWatchdogUSec=2min` on each. The drop-in is `50-slops-watchdog.conf`: a `10-` name lost to Raspberry Pi OS's `40-rpi-enable-watchdog.conf` (1 min), found on deploy. Each Pi reports `<host>-under-voltage` and `<host>-thermal` and keeps 7 days of exact readings in `/var/lib/slops-power/history`. The dispatcher's own SSH key receives both lines from Steward and Sentinel (`read-state` calls `read-power-state`). Command Center's dispatcher redeployed (sha256 `72527d86…`). Fail proofs on each Pi: a fake `vcgencmd` (0x50005, 82 °C) reads CRITICAL on both lines; an unreadable chip reads DOWN; a missing or 20-min-old status file reads `status_missing` / `status_stale`.
- **Hang test:** 2026-11-02, with the founder in the room: Sentinel's kernel was crashed on purpose (`sysrq c`, `kernel.panic=0`) at 21:54:25. The hardware watchdog reset it and it booted at 21:54:41, about 16 s later, back with both timers active and `15s`. Command Center also read `15s` after its 21:47 reboot.
- **Blocked by:** None
- **Priority:** P1
- **Done when:** `RuntimeWatchdogSec` is set on each Pi, and the dispatcher reports `get_throttled` under-voltage bits (2026-11-02: and temperature and throttling, now and since boot).

### B13-HEAL-WIFI — Command Center stays on Wi-Fi and repairs its own link
- **Status:** IN_PROGRESS
- **Claim:** 2026-10-29 Claude Code (alert-repeats session)
- **Forced drop:** 2026-11-02 19:30:40, a real `nmcli device disconnect wlan0` with a 12-min fallback timer armed. Command Center was unreachable 19:30:53–19:34:03, and the watchdog's 3-min rung reconnected it (`router unreachable 3 min: reconnecting wlan0`). No reboot was needed, the fallback was cancelled unused, and the dispatcher sent and cleared `wifi-events`.
- **Blocked by:** two more reboots that come back untouched (1 of 3 done 2026-11-02). The founder couldn't single out the SELF-REPAIR post among tonight's test messages; check it at the next real drop
- **Priority:** P1
- **Evidence so far:** deployed 2026-10-29 23:17 (timer active, run Result=success; mode 0700); the dispatcher carrying the SELF-REPAIR block is deployed (2026-10-31 and 2026-11-02). Wi-Fi power save off via `/etc/NetworkManager/conf.d/wifi-powersave-off.conf`; after the 2026-11-02 21:47 reboot Command Center reads `Power save: off` (it read `on` before, because the setting waits for a reboot). That reboot came back untouched (1 of the 3). 2026-11-02 sandbox fail proof (copy of the deployed script, fake dead router, nothing real touched): reconnect at 3 min, NetworkManager at 10, reboot at 20, each logged for the dispatcher.
- **Steward and Sentinel:** keep `slops-link-watchdog.sh` (deployed 2026-10-18; monotonic clock, ARP fallback, reboot backoff 30/60/120 min, max 3). Founder chose 2026-11-02 to keep the better one rather than add a second ladder. Same sandbox proof 2026-11-02: reconnect at 10 min, reboot 1/3 at 31 min, none at 32, reboot 2/3 at 65. Power save reads off on both.
- **Done when:** power save reads off after a reboot; a forced Wi-Fi drop climbs the ladder (reconnect at 3 min, NetworkManager at 10, reboot at 20, max one reboot per 6h) and posts one SELF-REPAIR message to Discord; three reboots in a row come back untouched.

### B13-HEAL-POWER-PLUGS — one local-control smart strip; Pis power-cycle each other
- **Status:** READY
- **Claim:** 2026-11-03 Claude Code (power-cycle-amend session), branch `claude/power-cycle-amend` — Constitution amendment only (docs)
- **Blocked by:** FOUNDER — buy the strip (chosen 2026-11-03: TP-Link Tapo P316M, 6 individually switched outlets, Matter); then the playbook work below. Constitution item 1: decided 2026-11-03, option (a) — a signed `power_cycle` playbook is a bounded exception (decision log 2026-11-03)
- **Decision (2026-11-03):** one strip instead of three plugs (no room for three). Each Pi on its own switched outlet; Command Center's SSD hub shares Command Center's outlet. Pair it over **Matter**, not the Tapo cloud, so a power-cycle works with the internet down. Rejected: Amazon Basics strip (Alexa cloud only), Kasa HS300 (HW v2.0 local-auth failures reported), Shelly Power Strip 4 (EU only). Trade-off: the strip is one point of failure; if it hangs, the cap pages the founder and the hardware watchdog still covers OS hangs.
- **Playbook work after the strip arrives:** a Matter controller on Command Center; a `power_cycle` action whose targets are outlet numbers on an allowlist; a Pi never cycles its own outlet; 30–60 s off; max 2 per day per target, then a page. Widening the vocabulary is its own reviewed PR. Until B13-HEAL-LIVE it runs in shadow only: it reports "would have power-cycled" and cuts nothing.
- **Note (2026-11-02):** all three Pis share one power strip with an on/off switch, hidden behind the desk. One flip takes the whole fleet down, and only the outside heartbeat sees that. Cheapest fix: a clear switch guard over it, or move the Pi bricks to a strip without a switch
- **Priority:** P1
- **Note:** 2026-10-29: two reboots of Command Center went dark until the founder cut power. The boot journal shows the Pi actually booted fine from the SSD (sshd and docker up, Wi-Fi associated at 192.168.5.30, Tailscale DERP connected), then stopped answering on Wi-Fi (Mac ARP for .30 incomplete). So the suspect is the Wi-Fi link, not the SSD or hub. See B13-HEAL-WIRED first; the plugs remain the backstop
- **Done when:** a Pi that has been unreachable for 15 min is power-cycled by a peer (max 2/day, then a page), proven with a forced test.

### B13-HEAL-OUTSIDE-HEARTBEAT — alert when the whole house goes dark
- **Status:** VERIFIED
- **Claim:** 2026-10-30 Claude Code (heal-resilience session), branch `claude/heal-outside-heartbeat`
- **Evidence so far:** installed on Command Center 2026-11-02 with founder approval (script, service and timer; nothing replaced). Fail proof: with no URL file the unit exits 1 and shows failed. The timer is installed but off until the URL exists.
- **Evidence:** 2026-11-02, the founder created the healthchecks.io check (5 min period, 10 min grace, Discord integration) and put the ping URL on the Pi (`/etc/slops-alerting/outside-heartbeat-url`, root 0600; the URL never left the Pi). First ping 19:28 `Result=success`, timer enabled. Fail proof: pings stopped 19:29–19:53. The healthchecks.io log shows the check going down and coming back up, which is what a router unplug looks like from outside.
- **Blocked by:** None
- **Priority:** P2
- **Done when:** unplugging the router produces a Discord alert from outside the house.

### B13-HEAL-PARTS-LIST — hardware alerts carry a parts list
- **Status:** VERIFIED
- **Evidence (2026-11-03):** `ops/pi-fleet/PARTS.md` lists the exact power supply, SSD and SD card models per Pi and the SSD cable (the one in the SSD box, plus an exact spare: Anker USB-C to USB-A 3.x, 1 ft; the cable now in use is not recorded), with overnight and local-store options. The deployed dispatcher adds the parts link to `under-voltage`, `thermal`, `ssd-missing` and `booted-from-sd` alerts, and all four producers are live (B13-HEAL-WATCHDOG 2026-11-02, B13-HEAL-SD-SYNC verified 2026-11-03).
- **Claim:** 2026-10-30 Claude Code (heal-resilience session), branch `claude/heal-parts-list`
- **Blocked by:** None
- **Note:** the link fires only once a check emits the name
- **Priority:** P2
- **Done when:** the runbook lists exact power supply, SSD, SD card and cable models per Pi, with overnight and local-store options. The SSD-missing, under-voltage and SD-fallback alerts link to it.

## Open PRs

- #790 ruff (ours). Dependency bumps, founder merges via `scripts/merge-pr.sh`: #791 opentelemetry
  sdk-trace 3.0.0 (major: check), #789 frontend-runtime, #788 android, #787 docker/login-action,
  #786 setup-uv, #785 tailscale action, #784 vite.
