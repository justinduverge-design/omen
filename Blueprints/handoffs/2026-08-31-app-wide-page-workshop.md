# Handoff — App-wide page workshop, Wave 1 contract, and the ESPN terms read

**Date:** 2026-08-31
**Session type:** founder workshop → contracts → direction propagation → design canvas → legal read
**Code changed:** none. This session produced decisions, contracts, and one design canvas.

## What triggered it

Beta feedback, two data points pointing opposite ways. **Sleeper connect worked** — Rudy connected
without a single question. **ESPN on iPhone failed** — Abby had no path at all, because the native
ESPN route's only honest instruction was to find a desktop, install Chrome, and sideload an unpacked
extension. That is a missing flow, not a copy defect.

## What was decided

Full record: `Blueprints/specs/mobile/omen-app-pages-workshop-v1.md` (nine parts). Headlines:

- **Command Center is the Small Council** — Omen's advisors giving short reads, one voice, seats
  labelled by subject. It is a **horizontal swipe deck** that **auto-advances every 7.5 seconds**,
  deliberately slower than the industry 3–5s because the cards carry real reasoning. First touch
  stops it for the session; Reduce Motion and VoiceOver disable it outright.
- **Omen returns one call of any type** — start/sit, pickup, drop, or trade. The "Start/Sit and
  Waiver live inside Omen" reading was a carried-over misunderstanding and is retired.
- **Waiver is its own section inside League**, ranked pickups with reasons, every claim paired with
  its drop. The engine chooses the drop; the model only explains it.
- **Confidence is Confident / Leaning / Coin flip** — bands, never percentages.
- **Demo mode is cut.** **Team theming is postponed.** **DM Mono is retired app-wide.**
- **The Ledger gets a real screen**, counting self-reported rows but marking them — which forces any
  accuracy figure to disclose its own composition.
- **In-app reporting replaces the mail handoff**, feeding a plain-English **Founder Digest**
  summarized by the local Ollama box. Analytics are **in-house**; no third-party SDK.
- **Breach detection is refused as unclaimable**, replaced by five detectable signals.
- **Trade is rebuilt** and is now the reference standard for every other screen.

## The ESPN terms read — the significant finding

`W1-GATE` closed. Disney's Terms of Use govern ESPN by name. **§2.B.viii** bars business use
*"whether or not for profit"* (removing the "Omen is free" defense), **§2.B.x** bars automated
access, and **§1.F** bars a user sharing account information. **Apple 5.2.2** is the practical
enforcement point and requires authorization on request; ESPN publishes no developer program to
grant one.

**The finding covers the already-shipped ESPN integration, not only the proposed sheet.**

**The founder reviewed this and chose to ship anyway, accepting the risk**, keeping the live
integration with an added consent line. Recorded with the evidence intact in
`Direction/decision_log.md`. This was a terms reading by an agent, **not legal advice**; an
attorney's read was recommended, declined for now, and remains open.

The prepared App Review answer is now the mitigation and is drafted in the Wave 1 contract, along
with its honest weakness: it argues why the access is reasonable, not that it is permitted, which is
what 5.2.2 actually asks.

## Two errors the canvas made, and the lesson

The founder caught both by asking what a control does rather than how it looks:

1. **"Open Sleeper" was theater.** Sleeper publishes no trade-write endpoint and no deep link to a
   pre-filled trade, so the button could only launch the app. Demoted and labelled honestly; **Copy
   the offer** is promoted, because the copy is what actually travels.
2. **The vote poll did not exist** — no endpoint, no storage in `src/routes/trade.js` — and its "42
   votes" was invented at a scale a 10-team league never reaches. **Poll cut**, share card kept.

**Lesson recorded:** a mockup will happily draw a button for an endpoint that does not exist and a
chart for data that will never arrive at that volume. Check every affordance against a real
capability before it reaches a contract.

## Direction files updated

`context.md` (Tool Hierarchy corrected; **also fixed a live contradiction** — it still claimed Omen
required a Pro subscription and listed three Stripe endpoints, roughly seven weeks after billing was
deleted), `facts-of-record.md` (+#16–21), `roadmap.md` (five waves, agent split), `current_sprint.md`
(Wave 1 lane + `W2-Typography`), `agent_inbox.md` (next pull), delivery governance (canvas-as-screen-
artifact amendment).

## Staleness checker

`node scripts/check-sprint-staleness.js` — 7 findings, all triaged, none laundered. Five are false
positives inside blocks already marked SUPERSEDED/RESOLVED; rewriting that provenance to satisfy a
linter would destroy the Yahoo diagnosis the repo keeps deliberately. `A4` and `B2-D3-S2` are
annotated and **left open**: A4 because #386 was the gate checker rather than A4 itself, and
B2-D3-S2 because its `Done when:` judgement is the founder's.

## Design canvas

**Omen App Rework** — 12 artboards on two pages, built from the real `OmenColor` / `OmenTypography` /
`OmenSpacing` / `OmenCard` / `OmenButton` source rather than from memory. Two-family type system, no
mono, tabular figures for numerals.

## Next pull

`W1-B` (report pill) and `W1-C` (digest + alerts) are READY and independent. `W1-A` (ESPN sheet) is
now READY under recorded constraints. `W1-C` carries an unresolved gap: **email is not a paging
mechanism**, and "the app is down" has to reach the founder some other way.
