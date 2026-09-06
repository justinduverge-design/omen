# Intent: Make the waiver wire work like my actual league does

**Intent ID:** `intent.league-aware-waiver-wire`
**Date:** 2026-09-05
**Originator:** Justin
**Captured by:** Claude (slops-intent-capture v0.1.0)
**Layer:** L2
**Status:** DRAFT

> Reviewed and corrected by the product owner before commit? **no**
> An intent committed without this line answered `yes` is not captured, it is assumed.

---

## What I can't do today

In the originator's words:

> "We need to prepare for all types of waiver wires. Right? There's FAAB continuous. Like, I
> have an ESPN league like that. We have to be adaptable just like we are with the scoring. We
> have to get it from the league connection, get that information, and we adapt to that so that
> we give the best advice for that. I want to build all of it."

The originator's starting belief was that waivers were "completely missing." **Capture found
otherwise, and the correction is the intent.** Waiver analysis exists and serves all three
providers today — but it is deliberately waiver-*system*-blind. It is contractually forbidden
from ever stating a FAAB amount, a waiver priority, or a claim probability, under a design rule
whose stated unlock condition is that Omen has verified the league's waiver system and the
capability is truly implemented.

Nothing verifies the league's waiver system. So the gate has never been clearable, and the
advice is the same shape whether the league runs FAAB, rolling priority, or continuous.

A second, narrower gap sits underneath it: the free-agent pool is not equally reachable across
providers, so there is no even foundation for a league-aware layer to stand on.

## Who this affects

Every connected user, every week of the season, in the single most time-pressured decision the
product speaks to. It is not degraded for a subset — it is uniformly generic for everyone.

The originator hits it on his own leagues. **Corrected 2026-09-05 during spec Phase 0:** the
originator initially recorded ESPN as his only FAAB league with "every other league non-FAAB."
A credential-free probe found his Sleeper league *EB FOOTBALL* changed from priority in 2025 to
**FAAB in 2026**, which he then confirmed. He did not know.

That correction is the strongest evidence for this intent: a user cannot be relied on to know
his own league's waiver system, and Omen is today giving system-blind advice into a FAAB league
whose own product owner held the wrong model of it.

## What better looks like

Omen reads the waiver system off the league connection, the same way it already adapts to
scoring settings, and gives advice in the vocabulary that league actually uses.

In a FAAB league: what it costs to win the player, against the budget the user actually has
left. In a priority league: where the user sits in the order and what that realistically buys
them. Never the wrong one for the league — a FAAB number shown to a rolling-priority league is
worse than saying nothing, because it is confidently wrong.

The originator wants the full capability, bid recommendations included, in the first cut.

## Explicitly out of scope

- **Submitting or executing claims.** Omen advises; the user acts in their own provider. No
  write path to any platform.
- **Changing the approved Waiver Analysis screen design.** The visual brief is ratified. This
  intent fills it with league-true values; it does not redesign it.
- **Trade and Start/Sit.** Adjacent, separately queued, unchanged here.
- **Notifications, alerts, or deadline reminders.**
- **The replacement-level calibration question** raised in the VORP v2 review — whether the
  waiver replacement floor is static or rolling. Real, related, and a scoring-model question,
  not this one.

---

## SLC gate

**Simple** — the smallest cut that still delivers the outcome:

Detect the league's waiver system from the connection, then show only the values that system
has — priority position where it is a priority league, budget and remaining where it is FAAB.
Detection is what makes the advice league-true; it is also what makes every later stage safe,
because a bid number is only meaningful once the system underneath it is known.

**Lovable** — what makes this good rather than merely present:

That it speaks the user's league's language without being told. The user never configures a
waiver format; Omen already knows, because it read it. This is the same quiet competence the
product already earns on scoring settings, applied to the decision with a deadline on it.

**Complete** — the acceptance list. Each line checkable by someone who did not build it:

- [ ] For a connected ESPN league running FAAB continuous, Omen reports that league as FAAB,
      and the budget and remaining amount it reports match what the provider's own league
      settings show.
- [ ] For a connected non-FAAB league, Omen reports the correct system and **never** displays a
      FAAB amount or budget anywhere in the waiver experience.
- [ ] Waiver advice is available for all three providers — Sleeper, ESPN, and Yahoo — not one.
- [ ] Where the waiver system is undetectable or unsupported, Omen says so plainly and falls
      back to system-blind advice, rather than guessing a system or emitting a silent default.
- [ ] A bid recommendation, where shown, states what it is based on, and is absent rather than
      invented when the inputs are not there.
- [ ] Verified on the originator's own device against his real leagues: the waiver screen
      populates with league-true values end to end, not fixtures.

---

## Sources

| Source | What it contributed |
|---|---|
| Founder session, 2026-09-05 | The intent, the adaptivity framing, and the decision to include bid recommendations in the first cut. |
| `Blueprints/specs/mobile/omen-mobile-visual-briefs-v1.md` §6.2 | The rule this intent exists to clear, and its stated unlock condition. |
| `Direction/current_sprint.md` (`M9-BE-WaiverAnalysis`) | That waiver analysis is built and awaiting deploy, and that FAAB, priority, and claim probability are explicitly deferred pending waiver-system verification. |
| `Blueprints/api-routes.md` | The current waiver analysis contract and the states it can return. |
| `Direction/current_sprint.md` (provider finding) | That free-agent pool access is not equal across providers today. |
| `Direction/reviews/vorp-v2-critic-review.md` | The replacement-level calibration question — noted, and excluded above. |

No later document contradicts these. The design rule and the sprint item agree with each other;
the originator's belief that waivers were unbuilt is corrected by both and is superseded by this
file.

## Open questions

- **Does this run before or after NFL Week 1?** The built waiver analysis is one approval away
  from deploy, and Week 1 is ~2026-09-10. Building league-aware waivers and deploying the
  existing blind version want the same days. **Founder decides — this is a sequencing call, not
  a scope call.**
- ~~Is the non-FAAB league mix confirmed?~~ **Resolved 2026-09-05.** Both branches are covered
  credential-free on Sleeper: *Omen App Data* runs priority (negative case), *EB FOOTBALL* runs
  FAAB (positive case). ESPN — *Slops Saloon Fantasy Football Showdown* — is no longer required
  for FAAB verification, only for ESPN provider coverage.
- **What does a bid recommendation rest on?** Named here as in scope; what makes a recommended
  number defensible rather than invented is a design-stage question. Founder + design.

---

## Routing — REQUIRED

An intent is not captured until this names a terminal state. "Filed in `Direction/`"
is not one.

**State:** _unset — pending founder review_

Recommended: **QUEUED**, as a sprint item that links back to this file and names §6.2 as the
rule it clears. Not queued by the capturing agent: this skill does not set priority or add
queue items for an unreviewed intent, and the sequencing question above is unresolved.

**Routed on:** _pending_

---

## Downstream

- Spec: not yet
- Plan: not yet
- Shipped: not yet
