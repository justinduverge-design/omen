# Screen contract - TradeFindReview

Compiled from `design/native-visual-lock-2026-09-13/TradeFindReview.dc.html` on 2026-09-27, authored
by hand against `_shared.css` (no local `<style>` additions — every rule used already exists in the
shared stylesheet; new visual bits are inline-style refinements of existing classes, the same pattern
`TradeNeedsContext.dc.html` and `LeagueDegraded.dc.html` already use). Element rects below were
extracted from a live render of this exact file (local static server, 390×844 frame, `getBoundingClientRect()`
relative to `.screen`) rather than hand-estimated, so the geometry is accurate even though no
`sync-canvas-css.mjs` / hash-compile pass ran in this session. **`slops-canvas-to-code`'s own compile
pass should re-run this before build** and is expected to reproduce the same numbers.

**This is T3's design-decision deliverable, not build authorization to write code.** Per
`Blueprints/specs/mobile/omen-native-delivery-governance-v1.md` §5 and facts-of-record #20, this
contract plus its artboard become the approved screen artifact of record once the founder signs off;
until then it is a proposal.

## Build binding

| Field | Value |
|---|---|
| Artboard title | Find a trade — review picks |
| Family | Trade |
| Frame | 390 x 844; D11 floor. iPhone SE 375 x 667 may scroll. iPad deferred. |
| Scroll rule | fits without scrolling at D11 in the primary state; the degraded banner and long evidence text may push content to ~5px past the fold, so `.sbody.scrolls` stays enabled. |
| Data route | `GET /api/trade/find?platform=&league_id=&team_id=&week=` |
| API contract | `trade-find.v1` (T2, not yet on `main` — built on open, unmerged PR `feat/t2-find-a-trade-generator`; this contract is written against `src/services/tradeFind.js` and `src/routes/trade.js`'s `/find` handler as they exist on that branch, read-only, per this task's instructions) |
| Capability profile | `trade` — expresses per `capability-expression-v1.md` |
| Governing rule | Trade workshop; `Blueprints/specs/omen-trade-rework-v1.md` §T3 required-states list; the Command Center swipe-deck accessibility precedent (`omen-app-pages-workshop-v1.md` Part 7: *"must not depend on a swipe gesture alone"*) |

## Native build rules

- Contracts only: this file authorizes native build work but contains no screen code, and this
  session (T3) is explicitly not authorized to write SwiftUI/Compose against it — that is a later,
  separate task once this contract is approved.
- Use named registry tokens from `omen-native-design-system-registry-v1.md` section 2. Raw CSS values
  below are source evidence, not permission for local raw colors or arbitrary sizes — where the source
  canvas rendered a size the registry ramp does not assign to a named role (see E033, drawn at 16px),
  the **Type role** column is authoritative and the build uses that role's registry values, not the
  literal canvas pixels.
- Type roles are from the resolved ramp: display, h1, score-lead, call, score-trail, screen-title, h2,
  h3, body, card-lead, name, body-sm, label, micro, numeric.
- Spacing snaps to registry scale `2 4 6 8 10 12 14 16 20 24 32 40 48 64 96`; `1px` and `2px` hairlines
  are optical exceptions.
- `data-stub` and `data-mock` stay in platform token files until C3 lands dashed/hatch carriers.
- Components are resolved to foundation or Omen composition names. If a platform has no matching
  component, implement the named component first; do not invent a local primitive.
- **New compositions proposed by this contract** (none exist in `omen-native-design-system-registry-v1.md`
  §3.2 today): `CandidateSwipeCard`, `NeedBadge`, `BatchProgressBar`, `GestureStamp`,
  `SwipeActionRow`. All are screen-specific to Trade find/review, built entirely from already-approved
  primitives (Card, Text, `TradeLegRow`, `EvidenceRow`/`EvidenceDisclosure`, `FilterChip`, `Button`,
  `PagerDots`-shape `.dots`) — none touch shared cross-screen control definitions
  (`OmenTradeControls`-equivalent) that T5's three-team builder work might also touch. Flagged here per
  the coordination note in this task's brief so it can be reconciled if that changes; **no overlap with
  T5 is expected** since T5 scopes to `TradeBuild`/`TradeRoster`'s partner-selection and 3-sided offer
  interaction, not the swipe-review surface.

## Experience contract

**What this screen is** (`slops-native-screen-design` step, the actual design decision this session
makes):

Find a trade hands the user a batch of already-scored, already-explained trade candidates T2 found by
scanning the rest of the league, one at a time, so reviewing six or ten possible deals feels like
flipping through a short deck instead of reading a report. The reasoning that justifies each candidate
(T2's `reasoning` object: which need it fills, for which side, off what evidence) is **on the card by
default** — never behind a second tap — because the whole point of this screen is "should I care about
this," and that answer requires the why, not just the what.

**The swipe is a shortcut, never the only door.** Command Center's swipe deck already set this
precedent app-wide (*"the deck needs VoiceOver-navigable seats and must not depend on a swipe gesture
alone"*), and a swipe-only interaction with no visible alternative is a known accessibility failure —
VoiceOver cannot perform an arbitrary drag gesture, and a sighted user with a motor impairment may not
be able to either. **Decision: every gesture the card supports has an equivalent always-visible
button below the card** — `Pass` and `Save for later` — full-width tap targets, always rendered,
never conditionally hidden behind "if swipe fails." The swipe is the fast path for someone flicking
through a deck one-handed; the buttons are the real interface. VoiceOver reads the card content in
document order (opponent, need badges, send/receive rows, reasoning, evidence) followed by the two
named buttons — nothing in the card depends on drag position to be perceivable.

**Two gesture states, both optimistic-local, neither pretending T4 exists.** T3's own do-not-touch
line is explicit: this screen "calls T4's save action and shows local optimistic state only." Decision:
- **Pass / swipe-left** removes the card from the local stack immediately (optimistic — there is
  nothing to roll back; passing has no server-side effect today) and advances `BatchProgressBar`.
- **Save / swipe-right** calls a save action (interface below, data-binding notes) and flips the
  `Save for later` button to a confirmed local state (`Saved ✓`) rather than navigating anywhere —
  **there is no saved-trades destination to navigate to yet.** A caption under the buttons says so
  plainly: *"Saved picks keep this reasoning. Your queue is coming soon."* This is the honest
  in-between: the interaction exists and is real (it calls a save endpoint), the destination does not
  (T4), and the copy never implies otherwise.
- Both are drawn on the resting artboard as **hidden gesture stamps** (`GestureStamp`, opacity 0 at
  rest, see E065/E066) rather than a separate motion artboard, because a static frame cannot show
  motion — the stamps exist in the element inventory so a builder implements them, not so they render
  visibly in this file.

**Batch progress is honest about scope, not just position.** `BatchProgressBar` shows two things
side by side: *"Candidate 3 of 6"* (position in the batch actually returned, i.e. `candidates.length`
after `MAX_CANDIDATES_RETURNED` capping) and *"5 of 6 teams scanned"* (`bounds.teams_considered` vs.
the league's real opponent count) — these are **different numbers from different fields** and the
screen must not conflate them. A dot pager (`.dots`, the same primitive `CommandCenter.dc.html`
already uses for its rotating headline) gives a glanceable position cue beside the numeric one.

**Degraded is named, not hidden.** When `degraded_teams` is non-empty (or `teams_skipped_for_cap`
or `budget_exceeded` is true), a banner reusing the exact `SampleDataPanel` (`.hatch`) treatment
`LeagueDegraded.dc.html` already established for "partial provider data" sits above the card, naming
the specific team whose roster Omen could not read. This is not stub/mock data (the `.hatch` visual
carrier's other use) — it is real data with a named gap — and the banner text makes that distinction
explicit rather than relying on the visual alone to carry it (registry §2.3: a state's carrier may be
form, but two different meanings must never look identical; here the *wording* disambiguates a
carrier the codebase already uses for two related-but-distinct "partial data" cases).

Build acceptance:

- The reasoning that justifies a candidate is always visible on the card — never a second tap, never
  a "see why" disclosure.
- Every swipe gesture has a same-screen, always-visible button doing the identical thing.
- Save is a real local action with a save-shaped payload; it never simulates a destination that does
  not exist.
- Degraded and honest-empty states use the app's existing vocabulary for those situations
  (`SampleDataPanel`/`.hatch` for partial data, `.empty` for zero-result honesty, `.skel` for loading)
  rather than inventing new visual language for concepts the app has already solved elsewhere.
- Never proposes, and never lets a user act as though Omen could propose, a candidate against a
  roster in `degraded_teams` (fact-of-record #16 — already enforced server-side by `tradeFind.js`;
  this screen must not contradict that by rendering a "try anyway" affordance).

## Required states — coverage map

Per `Blueprints/specs/omen-trade-rework-v1.md` §T3 and the `T3-SwipeCandidateReview` sprint entry.
Two states are drawn pixel-accurate in `TradeFindReview.dc.html` (the genuinely new pattern this
screen introduces); the other five reuse existing, already-established visual vocabulary and are
specified here in prose + literal strings rather than redrawn, since redrawing an already-approved
component contributes nothing a builder doesn't already have.

| # | Required state | Drawn in this artboard? | Treatment |
|---|---|---|---|
| 1 | Batch loading | No — reuses `.skel`/`.skel.ln` (already in `_shared.css`, used nowhere yet but built for exactly this) | See "Loading state" below |
| 2 | Single candidate card, reasoning visible | **Yes — this is the primary drawn state** | `CandidateSwipeCard`, E031–E064 |
| 3 | Swipe-dismiss | Partially — `GestureStamp` drawn hidden at rest (E065); motion described in prose | See "Gesture states" above |
| 4 | Swipe-save | Partially — `GestureStamp` drawn hidden at rest (E066); motion + optimistic button state described in prose | See "Gesture states" above |
| 5 | Batch-exhausted | No — reuses `.empty`/`.eh`/`.ep`, the exact pattern `WaiverNoMove.dc.html` established for an honest end-of-list state | See "Batch-exhausted state" below |
| 6 | Zero-candidates-found | No — same `.empty` reuse, distinct copy | See "Zero-candidates state" below |
| 7 | Provider-read-degraded | **Yes — drawn active** (the richer of the two banner-present/absent variants) | `SampleDataPanel`, E029–E030 |

### Loading state

Same chrome (statusbar, `LeagueSwitcherBar`, `ScreenHeader` with kicker "Find a trade" / title "Review
picks") as the primary state. Below the header, in place of `BatchProgressBar` and the card, four
`.skel.ln` bars sized to the card's own line rhythm (one ~20px header line, two ~55px `TradeLegRow`-shaped
blocks, three ~34px `EvidenceRow`-shaped lines), using the shared pulse animation already defined in
`_shared.css`. Per registry §3.2's state-surface rule (*"Loading uses contextual copy"*), the label
above the skeleton reads **"Scanning your league…"** — never a bare "Loading…". No buttons render
during this state (nothing to act on yet).

### Batch-exhausted state

Reuses `.empty`/`.eh`/`.ep` (the same classes `WaiverNoMove.dc.html` uses for the "nothing on this
wire beats what you have" screen). Same chrome. Copy:

- `.eh`: **"That's everyone this week."**
- `.ep`: **"Omen scanned {teams_considered} teams and found {candidates.length} worth a look. Come back once your league's rosters move."**

`{teams_considered}` and the found count are `bounds.teams_considered` and the length of the batch
already reviewed this session, not re-fetched. No swipe affordance, no buttons other than a single
`Button.secondary` back to Trade or League (builder's choice of destination; not specified by T2's
payload).

### Zero-candidates state

Same `.empty` reuse, distinct, deliberately positive copy — per the sprint item's own instruction that
this is "a real, honest positive state, distinct from a provider read failure," not a variant of the
degraded or exhausted copy:

- `.eh`: **"No real gaps to fill."**
- `.ep`: **"Omen checked {teams_considered} teams against your roster and found nothing that clearly helps you. That's not a miss — some weeks there's nothing there."**

Distinguished from **provider-read-degraded** (which still shows a batch, just a smaller one) and from
**own-roster-unreadable** / **league-not-active** / **team-not-found** (route-level `status: "unavailable"`
responses that are not this screen's job to render at all — those route to the existing
`ConnectFailed`/`LeagueDegraded`-family screens, since they mean Omen could not read anything, not that
it read everything and found nothing).

## Literal strings

- `3:50`
- `5G · 42%`
- `TTO`
- `Titans of Slopsilonia`
- `ESPN · Slops Saloon`
- `▾`
- `+`
- `Find a trade`
- `Review picks`
- `JD`
- `Candidate`
- `3 of 6`
- `5 of 6 teams scanned`
- `Showing 5 of 6 teams.`
- `ESPN couldn't read Chubb Rock's roster this week — Omen never proposes a trade against a roster it can't see.`
- `vs Davante's Inferno`
- `Needs RB`
- `Fills your RB hole`
- `You send`
- `Out`
- `Jaylen Waddle`
- `WR · MIA`
- `14.8 pts`
- `You receive`
- `In`
- `Tony Pollard`
- `RB · TEN`
- `16.2 pts`
- `+4.2`
- `to your starting lineup this week ·`
- `+1.1`
- `to theirs.`
- `Your need`
- `RB is a hole — you start 2, the league needs 3.`
- `Their need`
- `WR is surplus for them — they start 3, roster 6.`
- `Evidence`
- `Live roster depth · live lineup-projection delta.`
- `Pass` (gesture stamp)
- `Save` (gesture stamp)
- `Swipe right to save, left to pass — or use the buttons below.`
- `Pass` (button)
- `Save for later` (button)
- `Saved ✓` (optimistic post-save button state, not drawn — see data-binding notes)
- `Saved picks keep this reasoning. Your queue is coming soon.`
- `Command`
- `Omen`
- `Trade`
- `League`
- `Scanning your league…` (loading state, not drawn)
- `That's everyone this week.` (batch-exhausted, not drawn)
- `Omen scanned {teams_considered} teams and found {found_count} worth a look. Come back once your league's rosters move.` (batch-exhausted, not drawn)
- `No real gaps to fill.` (zero-candidates, not drawn)
- `Omen checked {teams_considered} teams against your roster and found nothing that clearly helps you. That's not a miss — some weeks there's nothing there.` (zero-candidates, not drawn)

## Controls

| Element | Literal | Component | Action |
|---|---|---|---|
| E005 | TTO; Titans of Slopsilonia; ESPN · Slops Saloon; ▾; + | LeagueSwitcherBar | Open SwitchSheet; read `GET /api/leagues` before rendering the sheet. |
| E011 | ▾ | Text | Open SwitchSheet. |
| E012 | + | Text | Open ConnectLeague. |
| E017 | JD | AvatarButton | Open Account. |
| E065 | Pass (stamp) | GestureStamp | Visual feedback only during an active left-drag past the commit threshold; not independently tappable. |
| E066 | Save (stamp) | GestureStamp | Visual feedback only during an active right-drag past the commit threshold; not independently tappable. |
| E069 | Pass | Button.secondary | Local: remove this candidate from the stack, advance `BatchProgressBar`. No network call — passing has no server-side effect. |
| E070 | Save for later | Button.primary | Calls the save action (interface below); on success, flips this button's local state to a confirmed `Saved ✓` without navigating. |
| E075/78/81/84 | Command / Omen / Trade / League | TabNavItem | Open the corresponding destination for the active league. |

**Save action interface** (data-binding notes, since T4's real endpoint does not exist yet — this is
the interface T3 calls and T4 must satisfy, not a live route):

```
save_action(candidate_id: string, reasoning: object) -> { status: "saved" | "error" }
```

- `candidate_id` = the current card's `id` field, e.g. `find_2_opp0-low-rb_own-my-rb` — already unique
  per T2's own construction (`buildCandidateRecord`).
- `reasoning` = the current card's `reasoning` object **verbatim**, byte-for-byte from the T2 response
  — never regenerated client-side, per T4's own contract that "reasoning retained verbatim... not
  regenerated at read time."
- On any non-`"saved"` result (network failure, T4 not deployed yet, etc.), the button must **not**
  silently claim success — revert to `Save for later` and show a brief inline "Couldn't save — try
  again" rather than a toast that disappears before it's read.

## State strings

- `Candidate 3 of 6`
- `5 of 6 teams scanned`
- `Showing 5 of 6 teams.`
- `Fills your RB hole`
- `Saved ✓`
- `Scanning your league…`
- `That's everyone this week.`
- `No real gaps to fill.`

## Icons and symbols

| Element | Symbol | Source | Size/content |
|---|---|---|---|
| E011 | chevron.down | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.chev` | ▾ |
| E012 | plus | `.screen > div.sbody.scrolls:nth-of-type(1) > div.sw:nth-of-type(2) > span.plus` | + |
| E076/77 | tab.command-grid | `.screen > div.tabbar > span.tab:nth-of-type(1) > svg` | 42,792 20x20 / 45,795 13x13 |
| E079/80 | tab.omen-bolt | `.screen > div.tabbar > span.tab:nth-of-type(2) > svg` | 137,792 20x20 / 140,793 13x17 |
| E082/83 | tab.trade-arrows | `.screen > div.tabbar > span.tab.on:nth-of-type(3) > svg` | 233,792 20x20 / 234,794 17x16 |
| E085/86 | tab.league-shield-star | `.screen > div.tabbar > span.tab:nth-of-type(4) > svg` | 328,792 20x20 / 332,793 13x17 |

## Element inventory

Element count: 86 (extracted from a live render of `TradeFindReview.dc.html` at 390×844; every
rendered descendant inside `.screen`). Rects are `x,y w×h` relative to `.screen`'s top-left, exact
(rendered, not estimated).

| ID | Selector (short) | Text | Component | Type role | Foreground token | Background token | Border token | Rect |
|---|---|---|---|---|---|---|---|---|
| E001 | `.sbody.scrolls` |  | NativeStack | body | text-primary | transparent | text-primary | 0,0 390x781 |
| E002 | `.statusbar` |  | StatusBar | label | text-tertiary | transparent | text-tertiary | 0,0 390x24 |
| E003 | `.statusbar span:1` | 3:50 | Text | label | text-tertiary | transparent | — | 16,10 23x14 |
| E004 | `.statusbar span:2` | 5G · 42% | Text | label | text-tertiary | transparent | — | 329,10 45x14 |
| E005 | `.sw` |  | LeagueSwitcherBar | body | text-primary | transparent | text-primary | 0,24 390x49 |
| E006 | `.sw .cr` | TTO | CrestOrProviderMark | micro | accent-hover | canvas-gradient(surface-2->surface-1) | accent-hover | 16,33 28x28 |
| E007 | `.sw .who` |  | Text | body | text-primary | transparent | — | 54,32 281x30 |
| E008 | `.sw .who b` | Titans of Slopsilonia | Text | name | text-primary | transparent | — | 54,32 281x16 |
| E009 | `.sw .who i` | ESPN · Slops Saloon | Text | micro | text-tertiary | transparent | — | 54,50 281x13 |
| E010 | `.sw .who i em` |  | Text | micro | text-tertiary | platform-espn-chip | — | 54,52 7x7 |
| E011 | `.sw .chev` | ▾ | Text | label | text-tertiary | transparent | — | 345,40 5x14 |
| E012 | `.sw .plus` | + | Text | h3 | accent | transparent | — | 361,38 13x18 |
| E013 | `.top` |  | ScreenHeader | body | text-primary | transparent | text-primary | 0,73 390x51 |
| E014 | `.top div:1` |  | NativeStack | body | text-primary | transparent | — | 16,85 131x39 |
| E015 | `.top .kick` | Find a trade | Text | micro | accent | transparent | — | 16,85 131x13 |
| E016 | `.top .ttl` | Review picks | Text.heading | screen-title | text-primary | transparent | — | 16,102 131x22 |
| E017 | `.top .av` | JD | AvatarButton | label | text-secondary | surface-2 | text-secondary | 344,94 30x30 |
| E018 | `.scope` (BatchProgressBar, text half) |  | BatchProgressBar | micro | text-tertiary | transparent | text-tertiary | 16,136 358x13 |
| E019 | `.scope span:1` | Candidate | Text | micro | text-tertiary | transparent | — | 16,136 114x13 |
| E020 | `.scope span:1 b` | 3 of 6 | Text | micro | text-primary | transparent | — | 91,136 39x13 |
| E021 | `.scope span:2` | 5 of 6 teams scanned | Text | micro | text-tertiary | transparent | — | 225,136 149x13 |
| E022 | `.dots` (BatchProgressBar, pager half) |  | BatchProgressBar | body | text-primary | transparent | — | 16,154 358x13 |
| E023 | `.dots i:1` |  | PagerDot | — | — | border-subtle | — | 16,162 5x5 |
| E024 | `.dots i:2` |  | PagerDot | — | — | border-subtle | — | 25,162 5x5 |
| E025 | `.dots i.on:3` |  | PagerDot (active) | — | — | accent | — | 34,162 16x5 |
| E026 | `.dots i:4` |  | PagerDot | — | — | border-subtle | — | 54,162 5x5 |
| E027 | `.dots i:5` |  | PagerDot | — | — | border-subtle | — | 63,162 5x5 |
| E028 | `.dots i:6` |  | PagerDot | — | — | border-subtle | — | 72,162 5x5 |
| E029 | `.hatch` | ESPN couldn't read Chubb Rock's roster this week — Omen never proposes a trade against a roster it can't see. | SampleDataPanel | body-sm | text-tertiary | canvas-gradient(surface-2->surface-1) | border | 16,177 358x73 |
| E030 | `.hatch b` | Showing 5 of 6 teams. | Text | body-sm | text-secondary | transparent | — | 27,189 126x15 |
| E031 | `.verd` (CandidateSwipeCard) |  | CandidateSwipeCard | body | text-primary | canvas-gradient(surface-2->surface-1) | accent-overlay | 16,262 358x415 |
| E032 | `.verdh` |  | NativeStack | body | text-primary | transparent | — | 30,277 330x20 |
| E033 | `.verdh b` | vs Davante's Inferno | Text | h3 (source rendered 16px — see Native build rules) | text-primary | transparent | — | 30,277 146x20 |
| E034 | `.verdh span` | Needs RB | NeedBadge | micro | accent | transparent | — | 303,281 57x13 |
| E035 | chip row div |  | NativeStack | body | text-primary | transparent | — | 30,305 330x27 |
| E036 | `.fc.smart` | Fills your RB hole | FilterChip (non-interactive here) | micro | accent | transparent | accent-overlay | 30,305 143x27 |
| E037 | `.leg` |  | NativeStack | body | text-primary | transparent | — | 30,346 330x153 |
| E038 | `.legh:1` | You send | NativeStack | micro | text-tertiary | transparent | — | 30,346 330x13 |
| E039 | `.legrow:1` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 30,364 330x55 |
| E040 | `.legrow:1 .ar.out` | Out | Text | micro | text-tertiary | transparent | — | 40,385 22x13 |
| E041 | `.legrow:1 .pl` |  | Text | body | text-primary | transparent | — | 72,374 195x35 |
| E042 | `.legrow:1 .pl b` | Jaylen Waddle | Text | body-sm | text-primary | transparent | — | 72,374 195x15 |
| E043 | `.legrow:1 .pl span` | WR · MIA | Text | micro | text-tertiary | transparent | — | 72,395 42x13 |
| E044 | `.legrow:1 .rk` | 14.8 pts | Text | label | text-tertiary | transparent | — | 277,382 73x20 |
| E045 | `.legh:2` | You receive | NativeStack | micro | text-tertiary | transparent | — | 30,425 330x13 |
| E046 | `.legrow:2` |  | TradeLegRow | body | text-primary | surface-1 | text-primary | 30,444 330x55 |
| E047 | `.legrow:2 .ar` | In | Text | micro | accent | transparent | — | 40,465 22x13 |
| E048 | `.legrow:2 .pl` |  | Text | body | text-primary | transparent | — | 72,454 196x35 |
| E049 | `.legrow:2 .pl b` | Tony Pollard | Text | body-sm | text-primary | transparent | — | 72,454 196x15 |
| E050 | `.legrow:2 .pl span` | RB · TEN | Text | micro | text-tertiary | transparent | — | 72,475 40x13 |
| E051 | `.legrow:2 .rk` | 16.2 pts | Text | label | text-tertiary | transparent | — | 278,461 72x20 |
| E052 | `.rsn` | +4.2 to your starting lineup this week · +1.1 to theirs. | Text | body-sm | text-secondary | transparent | — | 30,509 330x18 |
| E053 | `.rsn b:1` | +4.2 | Text | body-sm | text-primary | transparent | — | 30,510 26x15 |
| E054 | `.rsn b:2` | +1.1 | Text | body-sm | text-secondary | transparent | — | 244,510 22x15 |
| E055 | `.ev` |  | EvidenceDisclosure | body | text-primary | transparent | text-primary-overlay | 30,534 330x129 |
| E056 | `.evr:1` |  | EvidenceRow | body-sm | text-primary | transparent | — | 30,545 330x34 |
| E057 | `.evr:1 .k` | Your need | Text | micro | text-tertiary | transparent | — | 30,545 84x16 |
| E058 | `.evr:1 .v` | RB is a hole — you start 2, the league needs 3. | Text | body-sm | text-secondary | transparent | — | 124,545 236x34 |
| E059 | `.evr:2` |  | EvidenceRow | body-sm | text-primary | transparent | — | 30,588 330x34 |
| E060 | `.evr:2 .k` | Their need | Text | micro | text-tertiary | transparent | — | 30,588 84x16 |
| E061 | `.evr:2 .v` | WR is surplus for them — they start 3, roster 6. | Text | body-sm | text-secondary | transparent | — | 124,588 236x34 |
| E062 | `.evr:3` |  | EvidenceRow | body-sm | text-primary | transparent | — | 30,630 330x34 |
| E063 | `.evr:3 .k` | Evidence | Text | micro | text-tertiary | transparent | — | 30,630 84x16 |
| E064 | `.evr:3 .v` | Live roster depth · live lineup-projection delta. | Text | body-sm | text-secondary | transparent | — | 124,630 236x34 |
| E065 | card `span:1` (hidden) | Pass | GestureStamp | label | text-tertiary | transparent (bg on reveal) | text-tertiary | 28,354 62x36, opacity 0 at rest |
| E066 | card `span:2` (hidden) | Save | GestureStamp | label | accent | transparent (bg on reveal) | accent | 300,354 62x36, opacity 0 at rest |
| E067 | `p:1` | Swipe right to save, left to pass — or use the buttons below. | Text | micro | text-tertiary | transparent | — | 16,688 358x15 |
| E068 | button row div |  | SwipeActionRow | body | text-primary | transparent | — | 16,711 358x44 |
| E069 | `.btn.ghost` | Pass | Button.secondary | card-lead | text-secondary | transparent | border | 16,711 175x44 |
| E070 | `.btn` | Save for later | Button.primary | card-lead | text-on-accent | accent | text-on-accent | 201,711 173x44 |
| E071 | `p:2` | Saved picks keep this reasoning. Your queue is coming soon. | Text | micro | text-tertiary | transparent | — | 16,763 358x15 |
| E072 | `.spacer` |  | NativeStack | body | text-primary | transparent | — | 0,778 390x8 |
| E073 | trailing `div` |  | NativeStack | body | text-primary | transparent | — | 0,786 390x0 |
| E074 | `.tabbar` |  | TabNav | body | text-primary | surface-1 | border-subtle | 0,781 390x64 |
| E075 | `.tab:1` | Command | TabNavItem | micro | text-tertiary | transparent | — | 4,792 96x37 |
| E076/77 | icon | — | Icon/IconPath | micro | text-tertiary | transparent | — | 42,792 20x20 / 45,795 13x13 |
| E078 | `.tab:2` | Omen | TabNavItem | micro | text-tertiary | transparent | — | 100,792 96x37 |
| E079/80 | icon | — | Icon/IconPath | micro | text-tertiary | transparent | — | 137,792 20x20 / 140,793 13x17 |
| E081 | `.tab.on:3` | Trade | TabNavItem | micro | accent | transparent | — | 195,792 96x37 |
| E082/83 | icon | — | Icon/IconPath | micro | accent | transparent | — | 233,792 20x20 / 234,794 17x16 |
| E084 | `.tab:4` | League | TabNavItem | micro | text-tertiary | transparent | — | 291,792 96x37 |
| E085/86 | icon | — | Icon/IconPath | micro | text-tertiary | transparent | — | 328,792 20x20 / 332,793 13x17 |

## Data-binding notes (trade-find.v1 → screen)

Bound against `src/services/tradeFind.js` (`buildCandidateRecord`/`findLeagueTradeCandidates`) and
`src/routes/trade.js`'s `/find` handler, read on the T2 branch per this task's brief.

| Element(s) | Field | Notes |
|---|---|---|
| E020 "3 of 6" | position in `candidates[]` / `candidates.length` | Client-side pager state, not a server field — the batch itself is static once fetched. |
| E021 "5 of 6 teams scanned" | `bounds.teams_considered` vs. the league's real team count minus one | Distinct from the candidate count; do not conflate. |
| E029/E030 hatch banner | `degraded_teams[]`, `bounds.teams_skipped_for_cap`, `budget_exceeded` | Renders only when at least one is non-empty/true. Names `degraded_teams[0].team_name`; if more than one team is degraded, the contract needs a plural template ("N teams") — **not specified further here; flag if `degraded_teams.length > 1` is hit in testing.** If `opponent_team_name` on the *current card's own* opponent is `null` (buildCandidateRecord allows this), E033 falls back to "another team in your league" rather than rendering `null` or blank. |
| E033 "vs Davante's Inferno" | `candidates[i].opponent_team_name` | Nullable — see fallback above. |
| E034 "Needs RB" | `candidates[i].reasoning.opponent_receives.need.status` | `"hole"` → `"Needs {POS}"` using `reasoning.opponent_receives.position`; `"surplus"` or `"balanced"` → `"No hole"` (exact copy TradeBuild already uses for the non-hole case — do not invent a third label). |
| E036 "Fills your RB hole" | `candidates[i].reasoning.fills_need_for[]` | `includes("user")` → "Fills your {POS} hole" using `reasoning.user_receives.position`. If it also includes `"opponent"`, a second chip "Fills their {POS} hole" renders beside it (not drawn in this artboard — single-need case drawn for clarity; both-chips case is a straightforward repeat of the same `FilterChip` treatment). If the array is exactly `["no_named_hole_on_either_side"]`, no chip renders; replace with plain text "No named hole on either side" in the same slot. |
| E042/E043/E044 (send row) | `candidates[i].give.name`, `.position`, `.team` (if present), `.projected_points` | `team` is not guaranteed present in every fixture reviewed (`test/tradeFindRoute.test.js`'s fixtures omit it) — if absent, render position alone ("WR") rather than "WR · undefined". `projected_points` renders as "{n.n} pts"; if absent/non-finite, omit the `.rk` slot's number and show "—" (matches `TradeBuild.dc.html`'s own `—` treatment for an unranked player, E065 there). |
| E049/E050/E051 (receive row) | `candidates[i].receive.*` | Same rules as give. |
| E053/E054 | `candidates[i].user_lineup_delta`, `.opponent_lineup_delta` | Signed numbers; render with an explicit `+` for positive (already the common pattern in this codebase's decision surfaces) and without a sign qualifier for negative (the `-` is visible). Neither field is guaranteed non-negative — a candidate could reduce the opponent's lineup while still improving the user's; the copy template ("+4.2 to your starting lineup this week · +1.1 to theirs") must still read correctly with a negative theirs-value ("−0.8 to theirs"). |
| E057/E058 | `candidates[i].reasoning.user_receives.need` (`{status, have, required}`) | Template: "{POS} is a hole — you start {have}, the league needs {required}." for `status: "hole"`; "{POS} is surplus for you — you start {have}, roster {required or a depth count}." for `"surplus"`; a neutral third template for `"balanced"`; "{POS} isn't tracked for this league shape." for `"not_tracked"` (the exact fallback `needEvidenceFor` returns) — never fabricate a need description when the field says `not_tracked`. |
| E060/E061 | `candidates[i].reasoning.opponent_receives.need` | Same template family, "them"/"their" pronoun. |
| E063/E064 | `candidates[i].reasoning.evidence[]` | Map each slug to display text: `live_roster_depth` → "Live roster depth"; `live_lineup_projection_delta` → "Live lineup-projection delta"; `missing_projection_for_some_players` → "Missing a projection for some players" (render this one distinctly, e.g. trailing, since it's a caveat not a strength). Join with " · ". |
| E069/E070 save action | `candidates[i].id` | Passed as `candidate_id` to the save action described under Controls, along with `candidates[i].reasoning` verbatim. |
| Loading state | none yet | Skeleton renders before the first `GET /api/trade/find` response; no data bound. |
| Batch-exhausted state | `bounds.teams_considered`, count of candidates already shown this session | Client-tracked, not a distinct server field — T2 returns the whole batch at once (capped at `MAX_CANDIDATES_RETURNED`), so "exhausted" is reached when the local stack empties, not a separate API call. |
| Zero-candidates state | `status: "ok"` (or `"degraded"`) with `candidates: []` | Distinguish from `status: "unavailable"` (own-roster-unreadable / league-not-active / team-not-found), which is **not this screen's job** — route those to the existing degraded/connect-failed screens instead of rendering "No real gaps to fill" over a read that never actually completed. |

## Acceptance checks

- The reasoning block (`Your need` / `Their need` / `Evidence`, E055–E064) renders unconditionally
  with the card — there is no collapsed/expandable state for it in this screen.
- `Pass` and `Save for later` (E069/E070) are always visible and always tappable regardless of swipe
  gesture support, input method, or accessibility settings — VoiceOver/TalkBack must be able to
  complete either action without performing a drag.
- The degraded banner (E029) renders if and only if `degraded_teams.length > 0 ||
  bounds.teams_skipped_for_cap.length > 0 || budget_exceeded === true`; it is absent otherwise, and
  its absence must not be mistaken for "nothing to check" — a clean scan with no banner and a batch
  with a suppressed banner must be visually identical (no partial/empty banner shell left behind).
- `Saved for later` never navigates to a queue/list screen that does not exist; it only flips its own
  local label to `Saved ✓`.
- `Pass` never calls a network endpoint.
- The batch-exhausted and zero-candidates states use `.empty`/`.eh`/`.ep` exactly as
  `WaiverNoMove.dc.html` established, not a new empty-state visual.
- Use the named symbols above for every glyph. A missing symbol name is a build failure.
- Keep provider, risk, data-source, confidence, and provenance carriers exactly as registry section
  2.3 states — this screen introduces no new data-semantic carrier; `SampleDataPanel`/`.hatch` is
  reused, not reinvented, for the degraded case.
