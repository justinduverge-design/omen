# Canvas — M1 screen contracts, and what they unblock

**Written:** 2026-08-16 · **For:** a session picking up `M1-Screen-Trade`, `M1-Screen-League`, or `M5-Slice-E-Ledger`.

This is a briefing, not a task record. The canonical records are in `Direction/current_sprint.md`. Read the native read gate in `AGENTS.md` before any of this.

---

## The shape of the problem in one picture

The native app has four permanent destinations. Here is what each actually shows a real signed-in user **today**, after slice D landed:

| Destination | Today | What it needs |
|---|---|---|
| **Command Center** | Live — real shell truth + real provider identity | Nothing. Slices B + C shipped. |
| **Omen** | Live — real engine answer | Nothing. Slice D shipped 2026-08-16. |
| **Ledger** (inside Omen) | **Fixture** | `M5-Slice-E-Ledger` — pure wiring, backend already live |
| **League** | Honest "landing next" placeholder | `M1-Screen-League` → then `M5` slice F |
| **Trade** | Honest "landing next" placeholder | `M1-Screen-Trade` → then `M5` slice G |

**The critical distinction, and the reason F and G are not pullable:** the Ledger has an approved composition (Figma node `72:2`) and a live route, so it is *wiring*. League and Trade have live routes but **no approved screen contract**, so building them would mean inventing design authority in a feature PR. That is the thing `omen-native-delivery-governance-v1.md` §2 exists to prevent.

Both backends are already shipping. **The data is not the gate. The screen contract is.**

---

## Do slice E first if you only do one thing

`M5-Slice-E-Ledger` is the last pure-wiring slice of the beta-minimum client, and it is the cheapest work on the board right now, because slice D just built every pattern it needs.

**Copy slice D. Do not reinvent it.**

- `mobile/ios/OmenIOS/OmenIOS/App/Api/OmenDecision.swift` — contract model + state mapping
- `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/api/OmenDecision.kt` — the Kotlin twin
- the paired view models, repositories, and `OmenDecisionTests` / `OmenDecisionTest`

### Four lessons from slice D that will save you a day

1. **Grep the emitter before trusting a spec.** Slice D enumerated the `state:` literals out of `src/services/omen.js` and found **eleven** states. The §F2 table and the visual brief between them named **four**. Modelling from the specs alone would have dropped seven *healthy* backend answers into a default branch and told users the app couldn't read the server. Do the same to `src/routes/moves.js` before you model anything.
2. **Render the server's own message.** Recovery sentences are written server-side and rendered verbatim. A client re-wording is a second copy of the same truth, and it drifts.
3. **Fail safe on the unknown.** A state this build has never seen must not be force-fitted into success. That is exactly where guessing puts invented confidence in front of a real user.
4. **Never fabricate a field to satisfy a non-optional type.** Slice D drops the alternative row when a position can't be mapped, rather than picking one — a fabricated position chip beside a real player's name is worse than an absent row.

### Where Android tests go now

`:app` gained a **JVM unit-test source set** on 2026-08-16 (`mobile/android/app/src/test/`). Pure mapping tests belong there — they run in about a second with no emulator. Only tests needing a Compose semantics tree, a real `Context`, or a device behaviour go in `androidTest`. `OmenDecisionTest.kt` is the worked example.

---

## The two screen contracts

Both are governed by `Blueprints/specs/mobile/m1-figma-screen-contract-pass-v1.md`. Read §1's seven preconditions in order first — that spec is explicit that if sources conflict you **stop and flag**, rather than resolving it inside a screen.

### What "done" looks like

Per §2 and the §4 acceptance gate, each contract needs:

- low-fidelity iOS **and** Android screen contracts, each with its primary state plus its most important alternate state;
- every visible element mapped to an approved component **or** an explicit proposal;
- platform differences that are intentional and documented — shared Omen hierarchy, tokens, and content; platform-native navigation, sheet, control, and feedback grammar;
- reference influence annotated on "01 — Principles & References";
- the whole thing recorded on "06 — QA & Evidence" with contract links, states, open questions, and approval status.

`M1-Screen-Trade` additionally owes a **golden-screen pair** — "Trade verdict" is one of the three golden screens named in §2.

### What you may not do

No invented or renamed semantic tokens. No unapproved production component. No competitor layouts, assets, or copy. No claiming a provider path is ready. And **no starting slice F or G on an unapproved contract** — that is the whole point of the sequence.

### One scope correction you must carry into League

The app-shell contract used to define the League destination as carrying a **"seasonal Draft entry."** Draft is cut from 1.0 and the entire draft path went dark on 2026-08-16 (`P1-DraftAssistantSideline` / `R7`, PR #315). `omen-native-app-shell-auth-api-contract-v1.md` §1.4 is amended and the `draft` destination row is **preserved for 2027** rather than deleted.

**The League screen contract must not include a Draft entry.** If you find one in an older artifact, that artifact is stale — flag it, do not implement it.

Related: the League placeholder copy used to promise that entry and leaked an internal sprint key ("arrive in the M4-League-Screen slice") into user-facing text. Both are fixed, and both are now banned by test on each platform. Don't reintroduce either when the real screen lands.

### The approval boundary

Both items are `Blocked by: FOUNDER_APPROVAL`, and that is not a formality. An agent can produce the entire proposal — annotations, wireframes, golden screens, component proposals. **A screen contract is not self-ratifying.** It stays a proposal until the founder approves it and the registry is updated, per governance §2's delivery chain and the workflow playbook. Produce the work; do not mark it approved.

---

## Off-season reality, so nobody mistakes it for a bug

Per facts-of-record #10, `GET /api/dashboard/summary` returns `omen_of_the_week: "off_season"` outside the NFL regular season, and `league-standings.v1` correctly returns `standings: []`. These are **correct behaviours, not defects**, and the League contract needs an honest off-season empty state as a first-class design, not an afterthought.

It also means any acceptance that depends on a live `success` Omen **cannot fully pass** until the 2026 regular season opens. Split the evidence and say which half you proved.

---

## Before you close anything

Run the staleness check — it exists because this queue has advertised shipped work as pullable **seven times**:

```bash
node scripts/check-sprint-staleness.js
```

Then satisfy `Blueprints/definition-of-done.md`, append the `Blueprints/done/LEDGER.md` row **in the same pass that closes the work**, add a skill-usage row, and write a dated handoff.

And when your PR merges: **go back and correct the handoff.** It will say "not pushed, merged, or deployed", which was true when you wrote it and false ten minutes later. That single unrevisited sentence is the mechanism behind all seven incidents.
