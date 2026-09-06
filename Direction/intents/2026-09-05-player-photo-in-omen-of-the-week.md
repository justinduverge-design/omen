# Intent: Show the highlighted player's photo in Omen of the Week

**Intent ID:** `intent.player-photo-in-omen-of-the-week`
**Date:** 2026-09-05
**Originator:** Justin
**Captured by:** Claude (Claude Code, Opus 5)
**Layer:** L2 (Omen)
**Status:** ROUTED

> Reviewed and corrected by the product owner before commit? **yes** — Justin, 2026-09-05.
> His correction: routing. He chose DEFERRED over the agent's offered alternatives and asked for
> it to stay visible in the sprint: *"We should defer this... put it in the sprint, I guess...
> We're gonna explore this later."*
> An intent committed without this line answered `yes` is not captured, it is assumed.

---

## What I can't do today

> "I really only want the pictures with the photos to pop up in Omen of the Week. I don't know.
> I think it would add, like, a little touch, like, to show the player that we're highlighting
> to get or, you know, whatever."

Today the This Week's Omen lead card names a player in text only. There is no face attached
to the one move Omen is telling you to make.

The originator also wants two properties to hold, stated in his own framing:

> "I want the photos to stay tied to the correct player even when players change NFL teams or
> are added, dropped, traded, or moved around in fantasy leagues."

> "The fantasy/player state needs to stay fresh, but I don't want us constantly refreshing
> static photos for no reason."

And a cost constraint:

> "without paying for a headshot service if we can avoid it"

Note the phrasing: *if we can avoid it*. Free is strongly preferred, not yet proven possible.
Whether it is possible is an open question below, not a settled premise of this intent.

## Who this affects

Every Omen user who opens the Omen page, every week of the season — which is the app's
signature surface. Today: the founder and the beta round. Frequency is weekly per user
per selected league, not incidental.

This is a **polish/affinity** want, not a reported failure. No user has complained, and no
wrong-photo incident has occurred, because there are no photos yet. The originator did not
claim otherwise: "I think it would add, like, a little touch."

## What better looks like

The This Week's Omen lead card shows the face of the single player the recommendation is
about, so the highlighted player is recognizable at a glance rather than only readable.

When there is no photo for that player, the originator's answer was direct:

> "we just don't populate that photo section, I guess, if that's possible."

So: absent photo means the card renders as it does today. No placeholder silhouette, no
broken-image frame, no gap where a photo would be.

The two correctness properties, stated as outcomes rather than mechanisms:

- A player who changes NFL teams, or who is added, dropped, or traded inside a fantasy
  league, keeps his own face. The photo follows the person, not the roster slot and not the
  team.
- Fantasy and player state stays as fresh as it is today. Photos, which do not change week to
  week, are not re-fetched on that same cadence.

## Explicitly out of scope

- **Photos anywhere else in the app.** Not Command Center, not the Matchup Hero, not Start/Sit
  compact rows, not Waiver Analysis, not Ledger, not League. Omen of the Week only.
  `Blueprints/specs/mobile/omen-mobile-visual-briefs-v1.md` separately forbids headshots on
  several of those surfaces (§1.2 line 84, §5.1 line 561, §8.2 line 831). This intent does not
  reopen any of them.
- **Team logos, league logos, and NFL marks.** Only a photo of the one highlighted player.
- **A photo gallery, player cards, or a card-pack aesthetic.** Explicitly barred by §8.2 and
  not wanted here.
- **Multiple photos on the card.** Start/Sit is a two-player comparison; the lead card states
  one move. This intent covers the highlighted player, singular.
- **Backfilling a complete photo set for every NFL player.** Coverage is not a goal;
  degrading cleanly to no photo is the accepted floor.
- **Changing how fantasy or player state is fetched.** Freshness stays as it is; this intent
  only says photo refresh must not be coupled to it.
- **Any paid headshot licensing commitment.** If the answer turns out to be paid-only, that is
  a founder decision that reopens this intent, not something the build stage decides.

---

## SLC gate

**Simple** — the smallest cut that still delivers the outcome:

One photo, one surface. The This Week's Omen lead card renders the highlighted player's face
when one is available for that player, and renders exactly as it does today when one is not.
No new screen, no new navigation, no photo anywhere else.

**Lovable** — what makes this good rather than merely present:

The face is the thing that makes the recommendation feel like it is about *a person you are
starting on Sunday* rather than a row in a table. That only lands if it is right and quiet:
the correct player's face, at the restraint level §4.4 already sets for this card, with no
placeholder silhouette when we come up empty. A wrong face on a confident recommendation is
worse than no face — it undermines the card's whole claim to be evidence-bound. Absence must
be invisible, not apologetic.

**Complete** — the acceptance list. Each line checkable by someone who did not build it:

- [ ] The This Week's Omen lead card shows a photo of the recommended player, for a real
      selected league on both iOS and Android.
- [ ] For a player with no available photo, the card renders with no photo region, no
      placeholder, no broken image, and no layout gap — visually identical to today's card.
- [ ] A player who changed NFL teams between seasons shows his own photo, not a former
      teammate's and not a team mark. Checkable against a named real player who moved.
- [ ] After a fantasy add, drop, or trade changes which player the lead card recommends, the
      card shows the newly recommended player's photo, not the previous one's.
- [ ] Fantasy/player state freshness on the Omen page is unchanged from before this work,
      demonstrated rather than asserted.
- [ ] Photo fetching is not tied to the fantasy-state refresh cadence — a repeat view of the
      same recommendation does not re-fetch the same photo.
- [ ] The imagery source and its licensing terms are written down somewhere a third party can
      read, and permit Omen's use at Omen's commercial posture.
- [ ] Whatever §4 of the visual-briefs spec needs to say about a photo element has been
      amended and founder-approved, not left contradicted.

---

## Sources

| Source | What it contributed |
|---|---|
| Founder conversation, 2026-09-05 (this session) | The entire want, the surface, and the no-photo behavior. Quoted directly above. |
| Prior founder research with GPT, **not archived, and disclaimed by the originator** | The originator's word: *"It hallucinates so much. We probably shouldn't even use that."* Recorded here only so a later session knows it existed and does not treat it as evidence. It contributed **nothing** to this intent and must not be cited downstream. |
| `Blueprints/specs/mobile/omen-mobile-visual-briefs-v1.md` §4 | Defines the This Week's Omen lead card and its approved anatomy — which has no photo element. Establishes that this needs a spec amendment. |
| `Blueprints/specs/mobile/omen-mobile-visual-briefs-v1.md` §1.2, §5.1, §8.2 | Existing prohibitions on headshots elsewhere. Bounds the out-of-scope section. |
| `Direction/known_issues.md:707` | Records that nflverse's weekly stats CSV already carries a `headshot_url` column, encountered when it broke a CSV parser. A datapoint for the research below; **not** a chosen source, and not researched for licensing. |

No archived research artifact underlies this intent. It is founder-originated, not
research-derived.

## Open questions

1. **Is a free, lawfully usable NFL player photo source actually available at Omen's
   commercial posture?** This intent is written on the originator's preference ("if we can
   avoid it"), not on a finding. **Owner: `pre-build-research`, before any design work.** The
   licensing terms matter more than the image quality here, and this repo already has an
   unresolved commercial-use question with Sleeper (`current_sprint.md` A6/A7B) that shows how
   expensive it is to assume. **Marked BLOCKER for the design stage** — a spec written before
   this is answered would be designing against an unknown.
2. **Does §4 of the visual briefs get amended to permit a photo on the lead card?** §4.2's
   anatomy table has no photo row and §4.4 sets a deliberately restrained treatment
   ("Do not use mystical/oracle imagery, football clip art, reveal motion..."). A photo is not
   currently forbidden there, but it is not approved either. **Owner: Justin.** Not agent-
   decidable — it changes an approved design surface.
3. **What is the canonical player identity Omen already uses**, and does it survive a team
   change? The originator's requirement assumes there is one thing a photo can attach to.
   Whether that exists today is unverified — deliberately not investigated here, because an
   intent describes the world, not the implementation. **Owner: design stage.**
4. **Does "no photo" mean no photo yet, or no photo ever for that player?** A rookie added
   Tuesday may have a photo by Friday. Whether the card should pick that up on a later view,
   or stay photoless for the week, was not asked. **Owner: Justin.**

---

## Routing — REQUIRED

**State:** DEFERRED

`Direction/decision_log.md`, entry **2026-09-05 (later) — Player photos in Omen of the Week:
wanted, captured, deferred**.

**Reason:** Week 1 is ~2026-09-10, `F6` (ESPN real-account QA) is still `BLOCKED` on
founder-device execution, and this is polish by the originator's own description. Not urgent
enough to take a critical-path slot five days out.

**What reopens it — both, not either:**

1. `pre-build-research` answering open question 1 (is there a free, lawfully usable NFL player
   photo source at Omen's commercial posture).
2. A founder ruling on open question 2 (the visual-briefs §4 amendment).

**Also carried in the sprint for visibility:** `X1-PlayerPhotoOmenOfWeek` under
`Direction/current_sprint.md` lane X, **in no batch**, following the `O1c` precedent — a
deferred item stays listed so it is not lost, but is not schedulable and must not be
auto-pulled. The sprint row is a pointer; the decision-log entry is the authority.

**Deferral, not waiver.** The acceptance list above stands unchanged; only the timing moved.

**Routed on:** 2026-09-05

---

## Downstream

- Spec: not yet
- Plan: not yet
- Shipped: not yet
