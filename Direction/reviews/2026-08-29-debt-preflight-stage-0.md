# Debt Preflight — Stage 0 result, 2026-08-29

Run against `main` at `15debde`, per `Blueprints/playbooks/debt-preflight-v1.md` Stage 0.
**Purpose:** establish whether we are equipped and fit to run Stage 1 at all.

**Verdict at first run: 4 of 6 pass.**

**Updated same day — the founder answered all three.** 0.2 has a named reader and a cadence;
the audit is dated **today, 2026-08-29**; and the abort classes have a recommended set awaiting
a single yes. See "Stage 0 close-out" at the foot of this document.

---

## 0.1 — Can we see? (instruments) — **PASS, with a named residual**

| Check | Result |
|---|---|
| Backend errors reach the error backend | **PASS.** `GET /api/ready` live: `error_tracking.configured: true`, `valid: true`, `host 100.98.81.0:8000`, `reason: null`. |
| Native crashes reach it within 60s, both platforms | **PASS, on `O6`'s record.** Deliberate Android (`adb shell am crash`) and iOS `NSException` each landed; iOS in **~2s against a 60s requirement**, symbolicated Swift frames. |
| Pipe-open vs paths-feed-it distinction held | **PASS.** `O8` / #354 proved the failure mode and the guard shipped. |
| Provoked failure carries no credential | **PASS at payload level**, by grep and `SentryEnvelopeReporterTests`. |

**Residual, carried not hidden.** `O6`'s own closure states the IP-storage fix is
**founder-confirmed in the dashboard and never re-proven empirically** — no fresh crash was run
afterward to watch the user count fall to 0 on iOS. *"The toggle is on"* and *"no IP is stored
on the next crash"* are two different claims; only the first is evidenced. `O6` recommends
folding the re-proof into `F10`'s real-device matrix. **Agreed — this is a debt register entry,
not a Stage 0 blocker.** We can see; the question is whether we are storing something we
shouldn't while seeing.

## 0.2 — Can we hear? (the radio) — **FAIL**

| Check | Result |
|---|---|
| Feedback path deployed | **PASS.** `POST /api/omen/feedback` live, returns 401 unauthenticated — deployed and gated. |
| Someone reads the other end | **UNANSWERED.** |

**This is the failure.** The route exists; no one is named as reading it, and no cadence is
set. Ten testers who cannot reach a human are ten testers we learn nothing from. **Needs a
name and a frequency before Stage 1 — it is a one-line answer, not a work item.**

## 0.3 — Are the documents current? — **PASS after one repair**

`node scripts/check-sprint-staleness.js` ran clean across 42 non-closed items: no contradiction
between sprint items and merged PRs, no handoff claiming unmerged while citing a merged PR, no
`known_issues` entry contradicting a cited issue's state.

**But the script found nothing and a manual read found this:**

> **`M12-BrandFonts` was still marked `Blocked by: TASK-M5-Native-API-Client — specifically
> slices F and G, which are not built.`** They were built, merged, and deployed earlier the
> same day.

Repaired in this pass. **The important part is why the script could not see it:**
`check-sprint-staleness.js` matches sprint keys against merged **PR titles**, and this was a
*sequencing* blocker naming another sprint item — no PR title mentions it. This is the **second
stale blocker in two days**, after `M5` slice F, and the first one the script structurally
cannot catch in this form. `M10-DesignLaneStaleness` is the item that would extend it; it is
`READY`, unblocked, and agent-buildable in full.

**Consequence, since `M12` gates the paint pass:** brand fonts are now unblocked, and `F11`
(accessibility) must still wait for them. Running the accessibility pass on system fallbacks
means running it twice.

## 0.4 — What can we carry? (weight and balance) — **PASS**

- **Calendar:** 2026-08-29. NFL Week 1 **2026-09-10 — twelve days.**
- **Binding constraint:** founder attention, per the sprint's own batching rationale.
- **19 `READY` items.** Separated by who can actually move them:

| Unblocked **and** agent-buildable in full | Founder-gated or external |
|---|---|
| `M11A` *(deferred by decision — see below)*, `M10`, `S7`, `O3`, `F11` *(gated on `M12`)*, `M13`, `M1-QA-EvidenceGate`, **`M12` (newly unblocked)** | `R6`, `S1`, `S2`, `M3A-QA`, `F5`, `F7`/`F8` (prep only), `F10` (real-device half) |

**The register's one remaining NO-GO — Android connected instrumentation — is agent-runnable
and costs hours.** Nothing in the NO-GO column needs a founder hour except the decision to
schedule it.

## 0.5 — Fuel reserve — **PASS, conditionally**

Twelve days, and after the 2026-08-29 carry the register holds one NO-GO. There is real reserve
**only because two NO-GO items were deferred rather than cleared.** That is a legitimate way to
create slack, but it is borrowed: `M11A` and the ⚠️ rows come due before invitations, and they
land in whatever days remain. Reserve is genuine today and will not survive an audit that
finishes late.

## 0.6 — Abort criteria written before we look? — **FAIL (written, not ratified)**

The four abort classes are written in `debt-preflight-v1.md` §0.6. **None is ratified**, and all
three audit documents are explicitly proposals.

**This one cannot be waved through, because the entire point of 0.6 is that abort classes are
fixed *before* findings exist.** Ratifying them after Stage 1 has produced a list is precisely
the rationalisation the check exists to prevent. Either they are agreed now, or 0.6 is not a
real gate and the document should say so.

Proposed classes, unchanged, for a yes/no:

1. Any user-facing claim Omen cannot support with real data.
2. Any provider path unproven against a real connected account.
3. Any instrument dead — we cannot see crashes, or cannot hear testers.
4. Any credential reachable in an emitted payload.

*Note on class 2: the founder has already deferred `M11A` past the audit. That is compatible —*
*it binds at the invitation gate, not the audit gate. Ratifying class 2 does not reopen that*
*decision.*

---

## What Stage 1 needs before it starts

| # | Blocker | Owner | Size |
|---|---|---|---|
| 1 | Name who reads beta feedback, and how often (0.2) | founder | one line |
| 2 | Ratify or amend the four abort classes (0.6) | founder | one sitting |
| 3 | Put a date on the audit — this is what converts register items #1 and #3 from a promise into a plan | founder | one line |

Nothing else is holding it. Everything Stage 1 inspects is already written down.

## Findings this pass generated, for the register

| Item | Class | Note |
|---|---|---|
| `O6` IP-storage fix never empirically re-proven | **DEFERRED** | Fold into `F10` real-device matrix, as `O6` itself recommends |
| No named reader for beta feedback | **NO-GO** | Blocks Stage 1, not just the beta |
| Abort classes unratified | **NO-GO** | Blocks Stage 1 by construction |
| `O3` post-deploy canary did not exist for the 2026-08-29 deploy | **DEFERRED** | See below |

### On `O3`, recorded because it already happened

The sprint's first ordering rule reads: *"`O3` before Batch 1. The post-deploy canary should
exist before the biggest deploy in the queue, not after it."* The League/Trade deploy went to
production on 2026-08-29 **without it**. The deploy succeeded and production verified healthy by
hand afterward, so no harm resulted — but the rule was written to not depend on that, and it was
not followed. `O3` is `READY`, unblocked, agent-buildable, cost `small`. Recording it rather
than quietly noting the deploy went fine.


---

# Stage 0 close-out — 2026-08-29

## 1. Who reads beta feedback — **ANSWERED**

**The founder**, on his stated principle: the person paying for the apps and AI services reads
what they produce. Cadence **daily while the beta is open** — not before, since volume is zero
until invitations go out.

**The check surfaced a real gap while answering it.** `POST /api/omen/feedback` writes
`followed` / `user_stars` / `user_note` onto `moves`, and the only route reading them back —
`GET /api/moves` — is **scoped to the authenticated user**. A tester can see their own feedback
and nobody can see everyone's. The radio transmits; the only receiver is the sender's own
handset.

**Recommended fix — deliberately the cheap one:** a saved Supabase query over `moves` filtered
to non-null `user_note` / `user_stars`, plus a standing daily reminder while the beta is open.
No new route, no admin surface, no auth model to get wrong. Building an admin endpoint for ten
testers is exactly the gold-plating the Scrappy lens exists to catch.

**Named risk:** the founder is already the binding constraint by the sprint's own reckoning, and
this adds load to the constraint. The mitigation is that the reminder pushes to him rather than
relying on him remembering a ritual — a check that depends on discipline lapses in week two.

## 2. Abort classes — **RECOMMENDATION MADE, awaiting one yes**

Keep three, tighten one, add one. Full reasoning in `debt-preflight-v1.md` §0.6.

| # | Class | Change |
|---|---|---|
| 1 | Any user-facing statement that **asserts** something Omen has not verified | **AMENDED** — the original wording would have grounded the beta over honest absence. The line is asserting vs admitting, not claim vs no claim. |
| 2 | Any provider path unproven against a real connected account | keep — binds at the invitation gate, does not reopen the `M11A` deferral |
| 3 | Any instrument dead — cannot see crashes, cannot hear testers | keep — **it caught a real failure on its first run** |
| 4 | Any credential reachable in an emitted payload | keep — worst blast radius, least reversible |
| 5 | Any reproducible crash or hang on the **first-run path** | **ADDED** — none of the other four catch it. Class 3 passes happily while the app crashes on launch, because it only asks whether we can *see* it. |

**Plus the firing rule:** a class firing is binary, and the person who wants to ship does not
grant the exception. An override is recorded in `decision_log.md` with a name on it, never
resolved by re-reading the class until it stops applying.

## 3. Audit date — **ANSWERED: today, 2026-08-29**

This is the answer that converts debt register items #1 and #3 from a promise into a plan. Their
repair interval was "after the audit", which was a trigger with no date; the audit now has one.

**Consequence to state plainly:** `M11A` and the data-plan ⚠️ rows are now due **after today**,
and before beta invitations. They are no longer indefinitely deferred.

---

## Stage 0 status

| Check | Result |
|---|---|
| 0.1 instruments | **PASS** (with `O6` IP re-proof carried) |
| 0.2 radio | **PASS on the answer, ACTION open** — reader and cadence named; the read surface is a saved query yet to be created |
| 0.3 documents current | **PASS** after the `M12` repair |
| 0.4 weight and balance | **PASS** |
| 0.5 fuel reserve | **PASS**, borrowed |
| 0.6 abort classes | **PENDING ONE YES** — recommended set above |

**Stage 1 is cleared to begin the moment 0.6 gets its yes.** Nothing else holds it, and by 0.6's
own logic that yes has to land *before* Stage 1 produces findings — ratifying afterward is the
rationalisation the check exists to prevent.

Per `audit-grading-system-v1.md`, Stage 1 opens with the **Veteran** pass: *does it hold?*
