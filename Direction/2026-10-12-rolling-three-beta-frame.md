# Rolling three-beta frame — started 2026-10-12

This is a planning frame, not a promise that three releases have already been scoped. Omen plans
one Tuesday at a time while keeping the following two Tuesdays visible. The next release is chosen
from current evidence; the second is chosen only after the foundation inspection; the third is a
hopeful horizon that becomes real only as the frame rolls forward.

## Cadence and capacity

- **Plan and re-rank on Monday.** Freeze the release candidate Monday afternoon.
- **Release and canary on Tuesday.** The founder owns App Store Connect and final store action.
- **Observe on Wednesday.** Triage the canary and preserve the weekly token allowance.
- **Build Thursday through Sunday.** This is the primary engineering window because the weekly
  token allowance resets Thursday.
- **Fix only genuine P0/P1 findings after freeze.** A late feature does not enter because it is
  almost finished. Rollback is the exception to the no-merge window.
- Plan to less than full capacity. Provider failures, device proof and review rework need room.

## The rolling horizon

| Release | Date | Confidence | Scope now | Scope is chosen when |
|---|---|---|---|---|
| Beta 1 | Tue 2026-10-13 | committed candidate | Close the current build honestly. Command is accepted. Repair only the phone-walk Trade P0/P1s if they fit the freeze; otherwise exclude or disable the broken entry point. Account polish, Omen stats summary and League completeness do not expand this build. | now, from the 2026-10-12 phone walk |
| Beta 2 | Tue 2026-10-20 | provisional date, scope open | No feature allocation yet. First inspect Omen's shared football foundations and provider truth. Monday 2026-10-19 selects only work that has evidence and can be certified. | after the foundation inspection and first Thu-Sun build window |
| Beta 3 | Tue 2026-10-27 | hopeful horizon | Candidate backlog only: projection recovery, provider-read slices, evidence/IA/discovery specs, Omen evidence summary, League completion and Account refinement. None is promised to this release before inspection and Beta 2 evidence. | when the frame rolls on Mon 2026-10-19 and again on Mon 2026-10-26 |

Every Monday, remove the shipped Tuesday, promote the next Tuesday to the committed position, and
add one new hopeful Tuesday. Do not fill all three columns in advance merely to make the roadmap
look complete.

## Beta 1 — current-build closeout

Founder phone-walk findings, not yet correlated with API/device logs:

| Surface | Finding | Current disposition |
|---|---|---|
| Command | acceptable | accepted for this build |
| Account | coming together; still needs work | later refinement unless a safety/correctness P0/P1 is found |
| Omen | needs a compact summary of the supporting stats | foundation inspection / later build; do not bolt on ungrounded numbers |
| Trade | partner cannot be selected | genuine P0/P1 candidate; reproduce and repair or exclude |
| Manual Trade | attempt returned no answer | genuine P0/P1 candidate; every attempt needs a terminal result or honest error |
| Find a Trade | promising but does not work | cannot close `T2-FindATradeGenerator`; repair if bounded, otherwise disable/exclude |
| League | many unfulfilled features | inventory after inspection; only dead or materially false exposed controls can enter Beta 1 |

Beta 1 freezes on Monday 2026-10-12. It is not delayed for Omen-summary design, a complete League
page, Account polish, unfinished projection work or broad provider parity. Sentinel posture is
founder-confirmed healthy. **Founder update:** the archive and upload are complete and the release
is scheduled for Tuesday 2026-10-13. This repo records that report but did not independently read
App Store Connect.

## Inspection gate before Beta 2 scope

Do not assign the foundation backlog to Beta 2 or Beta 3 until this inspection answers:

1. Does football intelligence form one coherent decision system?
2. Do ESPN, Yahoo and Sleeper behave honestly across Command, weekly Omen, Start/Sit, Waiver,
   Trade, League and Ledger?
3. Are scoring, canonical player identity, selected league/team context, availability, week,
   projection source and freshness consistent?
4. Do the decision tools share the right primitives and one inspectable decision receipt?
5. Does the authoritative canvas match current behavior and every terminal state?
6. Can Xcode automate more of build, install, launch, journey, log, screenshot and evidence capture
   while retaining physical-device proof?
7. For each foundation, is the decision **preserve**, **consolidate**, **repair**, **replace** or
   **exclude**?

The inspection output is a provider-by-feature matrix, a shared-primitives map, a canvas drift
report, an Xcode automation opportunity list and a ranked disposition register. It is evidence for
Monday scope selection, not an implementation bundle.

Pass 1 source/test evidence is recorded in
`Direction/reviews/2026-10-12-omen-foundation-reassessment-pass-1.md`. It does not yet allocate
Beta 2.

## Unallocated recovery backlog

These items remain visible but are deliberately **not assigned to a beta yet**:

- Fix the unresolved P1 on branch `omen-projections-v1`, rebase and independently review PR #654.
- Run the projection model read-only against a restored warehouse and decide pass/hold/fail by
  position; no live use because an overall average looks good.
- Split branch `feat/provider-gap-g3-g8` into independently reviewable provider-capability slices.
- Finish the evidence-layer map, fantasy-week information architecture, and provider-discovery /
  probe specifications.
- Design the Omen stats summary from source-labelled evidence already earned by the system.
- Inventory and complete League only where authoritative provider or derived evidence exists.
- Refine Account after collecting specific screen/state findings.
- Automate the native evidence loop where Xcode and the paired iPhone genuinely permit it.

Monday planning may pull from this list only after the inspection identifies the dependency,
provider reach, proof cost and smallest shippable slice.

## Admission gate for any beta

A behavior earns a release only when:

- its contract, implementation and authoritative canvas agree;
- success, empty, unavailable, reconnect, insufficient-data and failure states are terminal and
  honest where applicable;
- ESPN, Yahoo and Sleeper each have a pass/hold/fail/excluded result rather than a generic
  "supported" claim;
- focused tests pass and the relevant native journey is automated as far as practical;
- the release candidate builds, installs and launches on the paired iPhone;
- physical-device evidence exists for the customer claim;
- a fresh review finds no open P0/P1; and
- the behavior is inside the Monday-frozen scope.

## Valor boundary

When Omen needs a tool or procedure, build the smallest correct Omen version first. Extract it to
Valor Ventures only after repeated Omen use proves the reusable boundary. Omen does not wait for a
general consulting framework, multi-client configuration, or a reusable abstraction without a
second real consumer.

## Monday roll-forward questions

1. What shipped and can be demonstrated on the physical phone?
2. What failed in the canary or provider matrix?
3. What did the inspection change about the architecture or priority?
4. What is the smallest coherent outcome for the next Tuesday?
5. What is explicitly excluded from that build?
6. What remains merely hopeful for the third Tuesday?

