# Session prompt — "Is this actually Omen?"

Paste this whole file to start the session.

---

You are working in the Omen product layer. Read the CLAUDE.md gate list before touching anything,
including the native mobile read gate.

## Why this session exists

On 2026-08-30 Omen reached TestFlight. Build 4 installed on the founder's phone, Trade worked,
Omen of the Week worked. Then he used it, and said this:

> "The app that we currently have right now is a bit of the imagination in which we used to create
> this app. **It's not there. It's not beating the bar.**"

And the bar, in his words:

> "It's supposed to be a **centralized place to get all of your info, one stop shop for fantasy
> advice, and it's free and ahead of the curve.**"

**Shipping a beta and shipping Omen are two different achievements. Only the first happened.**

Read `Direction/product/2026-08-30-the-bar-omen-has-not-met.md` first. It has the seven
requirements with the verified state of each. Do not re-derive it; do verify it.

## The rule that governs this session

**Trust nothing the code says about itself.**

That is not a slogan. It is the direct lesson of the session that produced this prompt, where the
same failure fired three times:

1. A `LeagueDirectory` doc comment said *"the sheet reads this"* about a field the sheet ignored.
2. The switcher told demo users *"your session expired"* when there was no session.
3. **The worst one:** both native clients said Yahoo was *"paused while we wait on Yahoo to restore
   our data access"* for two days after Yahoo restored it. Backend live, web live, native
   blocking. That comment was then read and reported to the founder as current fact — the same
   mistake, committed while holding the note about it.

So: **for every claim you rely on, check the thing itself.** Check the flag, not the comment.
Check the route, not the doc. Check the running app, not the test.

**And defects live in transitions and intersections, not in states.** Every defect the founder
found personally was invisible to six audit passes and 300+ tests, because those examined
*rendered states*. Nobody typed into a field. Nobody opened the switcher *while in demo*. Nobody
pressed Compare after adding a player, because nobody could add a player.

## The three lenses

Same system as `Blueprints/playbooks/audit-grading-system-v1.md`. Run every finding through all
three. Order by cost of reversal; break ties by reversibility.

**The Veteran — "Does it hold?"**
KISS, fundamentals, decades of shipping. Suspicious of cleverness. Asks whether a thing works on
the tenth try and the hundredth user, not the first. Owns: correctness, honest states, the
contracts, anything that silently lies.

**The Scrappy one — "What does this cost?"**
Drives a Honda Civic, does more with less, probably knows the product best. Asks what we already
have that we are not using. **This lens found `F-SCR-01` and would have found `F-DEV-03`:** both
were capabilities the backend already served that the client never consumed. Its sharpest
question this session: *which of our own routes does no client call?*

**The Hotshot — "What are we locking in?"**
Newest tech, forward-thinking, thinks in decisions that are expensive to reverse. Asks which of
today's choices we will still be paying for in a year. Owns: contract shape, extensibility, the
cost of a wrong abstraction.

**A fourth lens is proposed, and the founder should rule on it:**

**The Fact-Checker — "Is that still true?"**
Trusts no comment, no doc, no status line, no prior finding. Diffs what each surface *claims*
against what the system *does*, and diffs surfaces against each other — backend vs web vs iOS vs
Android. **Every single miss in the 2026-08-30 session would have been caught by this lens and by
no other.** If the founder declines it, its questions fold into the Veteran.

## What to audit — every page, both platforms

For each screen: **open it, use it, and try to break it.** Rendered-state review is what missed
everything last time.

Screens: Welcome, Sign in, Command Center, Omen of the Week, Trade, League, Switch Team & League,
Account, Help + Support, Connect.

For each one, answer:

1. **League context** — does it say which league and team you are in? (R2 says every window. Today
   only Command Center does.)
2. **Provider colour** — Sleeper blue, ESPN red, Yahoo purple, everywhere a provider is named.
   `OmenPlatformBadge` exists and is correct; the switcher does not use it.
3. **Web parity** — what does the web version of this surface do that native cannot? List it.
   Do not assume parity; open both.
4. **Transitions** — every button, every field, every state change. Type into it. Submit it.
   Cancel it. Rotate it. Background and restore it.
5. **Intersections** — demo × every screen, signed-out × every screen, one-provider ×
   multi-provider, off-season × in-season.
6. **Freshness** — does any copy, comment or gate on this screen describe a state the system has
   already left? Yahoo is the proof this is worth asking.

## The seven requirements to verify or build

From the founder, verbatim, with today's state in the product doc:

- **R1** — native connect for every provider **except ESPN**. Sleeper works; **Yahoo needs native
  OAuth.** Browser plumbing already exists for Supabase sign-in on both platforms.
- **R2** — league context on **every** window.
- **R3** — positions in Trade.
- **R4** — two-team **and** three-team deals, and picking a real league-mate. **The Sleeper
  adapter already fetches every roster and every user, then throws the opponents away.** Spec:
  `b2d3-live-trade-capability-sleeper-v1.md`, which also carries the rule that keeps it honest —
  only suggest a trade where **both** teams' projected lineups improve.
- **R5** — keep free-text player entry as the fallback.
- **R6** — share a trade. `POST /api/trade/share` exists (30-day hash + OG SVG). **Native has no
  share affordance and no QR exists anywhere.** QR is new work.
- **R7** — *"I need to be able to watch stuff."* **Ambiguous. Ask the founder before building.**
  Best reading is Waiver Watch.

## Non-negotiables

- **Both platforms ship together.** Every fix lands on iOS and Android in the same commit, with
  tests, verified on simulator *and* emulator. This held all through 2026-08-30; do not break it.
- **Honest states.** Six content states, never substituted for one another. An error surface in
  place of an honest "insufficient data" is a defect — that was `F-DEV-04`.
- **No dead affordances.** A button with nothing behind it is worse than no button. This is why
  Yahoo is `useWeb` and not `available`.
- **Design system only.** `PrimitiveEnforcementTests` bans raw SwiftUI controls in `App/` sources
  and it will catch you.
- **Facts of record still bind**, especially #6 (no provider credential in any artifact), #7 (mock
  data always labelled), #8 (SQL is founder-gated), #10 (season floor clears 2026-09-05) and #12
  (`connected` ≠ `usable`).
- **Yahoo attribution** must render wherever Yahoo data can be *displayed*, not merely where it
  can be connected. Contractual, not editorial.

## Environment traps that cost real time on 2026-08-30

- Android debug builds point at `https://example.invalid` by default and fail **silently**, while
  demo data keeps the app looking healthy. `-P` properties do **not** reach `cfg()`. Use:
  `OMEN_DEBUG_API_BASE_URL=https://slopssaloon.com ./gradlew :app:installDebug`
- Gradle `BUILD SUCCESSFUL in 1s` often means **no work was done.** Use `--rerun-tasks` and count
  the tests in `app/build/test-results`.
- `HelpSupportAccessibilityUITests` contrast audits fail on a hand-driven simulator and pass on a
  clean boot. Environment, not the tests.
- `adb shell input text` drops and reorders characters. Type one character at a time with a delay.

## Deliverables

1. Findings in `Direction/reviews/`, one home, three-lens grading, ordered by reversal cost.
2. Every finding **verified by opening the thing**, with the evidence stated.
3. A parity table: web vs iOS vs Android, per surface.
4. R1–R7 each marked **present / partial / absent**, with the check that proved it.
5. An explicit list of what you did **not** verify and why. The 2026-08-30 session's most useful
   artifact was its "what this did not prove" section.

## The standard

The founder's, and it is the right one:

> "Valor Ventures should be absolutely proud of this."

Every state in Omen today is honest. That discipline held and is worth keeping. **But honest is
the floor, not the bar.**
