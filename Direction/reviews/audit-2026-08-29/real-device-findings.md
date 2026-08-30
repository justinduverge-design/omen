# Real-device findings — founder, 2026-08-30 evening

**The first session where a person used the app on their own phone with their own leagues.**
It found two defects in under ten minutes that six audit passes did not.

Recorded separately from the audit register because the *method* is the finding: every pass
looked at rendered state, and none of them **typed, tapped, or switched anything**.

---

## F-DEV-01 — The Trade screen traps the keyboard. **FIXED.**

- **Reported:** *"trade… doesn't really work trying to type players names in… It won't close. I
  can't tap out of it."*
- **Cause:** `OmenTradeScreen` had two `OmenTextField`s and **no dismissal path of any kind** —
  no `.scrollDismissesKeyboard`, no keyboard toolbar, no tap-to-dismiss, no `.onSubmit`. Once
  the keyboard opened, the screen was unusable and the tab could not be left cleanly.
- **Why no pass caught it:** Phase B captured screenshots of rendered states. **A keyboard trap
  is invisible in a screenshot** — it only exists once a finger enters a field. `F-VET-B03`
  noted Trade had no scenario; even with one, a scenario would not have typed.
- **Fixed 2026-08-30:** `@FocusState` on both fields, `.scrollDismissesKeyboard(.interactively)`,
  a keyboard-toolbar **Done**, tap-anywhere-to-dismiss, and `.submitLabel(.done)` with
  `.onSubmit` so Return adds the player and closes the keyboard in one gesture.
- **Severity:** was BETA-BLOCKING. One of the four destinations was unusable.

## F-DEV-02 — Switching to ESPN does not take. **OPEN — cause not established.**

- **Reported:** *"I hit switch, wait for it to load, and then I hit ESPN, and it still stays on
  my sleeper."*
- **What the code does:** `LeagueSwitcherViewModel.select()` POSTs the selection, then re-reads
  rather than mutating locally — deliberately, so the switcher cannot invent an active flag.
  `CommandCenterView` then reloads Command Center, Omen, and League. That chain looks correct.
- **Two candidate causes, and they are NOT distinguishable from the code alone:**
  1. **The ESPN connection is not `usable`.** `connectionUsable()` requires `is_active`, a bound
     `league_id`, **and** both `espn_secret_id` and `swid_secret_id`. An ESPN connection without
     a bound league is filtered out of `selectConnections()` entirely — so the overview keeps
     answering from Sleeper and **no error is shown anywhere**, which matches the report exactly.
  2. **The selection POST failed.** `selectionError` renders a "That switch did not take"
     surface in the sheet; if the sheet was dismissed quickly it could be missed.
- **Why candidate 1 is the stronger read:** `PLATFORM_ORDER` is `["espn", "sleeper", "yahoo"]`,
  so with *no* stored selection the route would prefer **ESPN**. Landing on Sleeper means either
  a stored selection pointing at Sleeper, or ESPN being excluded as unusable.
- **This is `connected` ≠ `usable` — facts-of-record #12 — reaching a user.** The audit recorded
  that distinction repeatedly and never checked whether the UI expresses it. **`F-VET-07` is the
  same wound:** `OmenContextStripState.needsRecovery` exists precisely to say "this connection
  needs attention" and has no production producer. A user whose ESPN is connected-but-unusable
  gets silence.
- **Next step, and it needs the founder:** read the ESPN row's `league_id` on his account. If it
  is null or the `yahoo`-style pre-bind sentinel, candidate 1 is confirmed and the fix is a real
  state on the switcher — not a silent no-op.

## F-DEV-03 — Trade had no player search at all, and then had a broken one. **FIXED.**

- **Reported:** *"players' names don't pop up. You can't add. You can't do any of that. It's
  like the page wasn't wired to the code."* **That diagnosis was exactly right.**
- **Cause 1 — never wired.** `GET /api/players/search` → `players-search.v1` has existed all
  along. `Blueprints/api-routes.md` describes it in words as **"Free Trade Analyzer
  autocomplete"** — public Sleeper data, no auth, max 10 rows. The web client uses it. The
  native Trade screen shipped with a **bare free-text field** and never called it. Verified live:
  `?q=jefferson` returns Justin Jefferson (WR/MIN), Van Jefferson (WR/WAS), and three others.
- **Cause 2 — the first fix was broken, and only real use would have shown it.** The wiring used
  `client.get("api/players/search?q=\(query)")`, and `OmenApiClient` builds URLs with
  `URL.appendingPathComponent`, **which treats the whole string as ONE path segment and
  percent-encodes the `?`**. Every request went to `api/players/search%3Fq=jefferson` and 404'd.
  Silent: autocomplete simply never appeared, exactly like having no search at all.
- **Fixed:** query items now go through `URLComponents`; a debounce (250 ms, 2-char minimum)
  keeps a fast typist inside the route's 30-per-minute-per-IP limit; results render as
  `OmenListRow`s under the field being typed into; picking one adds the player and closes the
  keyboard.
- **Verified on the simulator against the live API**, not asserted: typing "jeffer" returns five
  real players with positions and teams, and tapping one adds it and updates the hint to "Add a
  player you'd receive."
- **Severity:** was BETA-BLOCKING. Trade was the destination the founder called "the front door"
  in `context.md`, and it could not be used.

**This is `F-SCR-01`'s exact shape a second time** — a capability the backend already serves that
the native client did not consume. The Scrappy pass swept for that and found `points_for`; it did
not find this, because the sweep compared *provider payloads* against clients and never asked
**which of our own routes no client calls.**

### Android had the identical gap, and the identical fix

The founder's standing rule is that both platforms ship together, so Android was checked rather
than assumed. It had **the same bare field and the same never-called route** — the defect was
never iOS-specific, it was one omission made twice.

The URL bug, though, was *mirror-imaged*, and this is the part worth keeping:

| | how the query was built | what happened |
|---|---|---|
| iOS | `URL.appendingPathComponent("search?q=…")` | encoded the whole thing as ONE path segment → `search%3Fq=…` → **404 on every request** |
| Android | `"$base/$path"` string concatenation | would have *appeared* to work — until a name contained a space (malformed URL, rejected before sending) or an `&` (a second query parameter injected from user input) |

The iOS version failed loudly on the first try. The Android version would have passed a casual
test with "jefferson" and failed on "Justin Jefferson". Both clients now build query items
through a real encoder — `URLComponents` on iOS, `URLEncoder` on Android — and neither may
hand-assemble a query string again. `PlayerSearchTest` pins both properties, including that an
`&` in a name cannot inject a parameter.

Android also now clears focus when a player is picked, matching iOS. Android was never a keyboard
*trap* — the system back button always dismissed it — so this is parity, not a rescue.

**Verified live on the emulator against the production API**, same as iOS: "jeffer" returned
Justin Jefferson (WR·MIN), Alshon Jeffery (WR·FA), Ramon Jefferson (RB·FA), Van Jefferson
(WR·WAS), Jermar Jefferson (RB·MIN); tapping the first added it with a Remove control, cleared
the field, closed the picker and the keyboard, and moved the hint to "Add a player you'd receive."

**One detour worth recording, because it nearly produced a false bug report.** The first two
emulator runs showed no rows and looked like a wiring defect. The cause was that the Android
**debug build points at `https://example.invalid` by default** — a deliberate placeholder guard —
so every request went nowhere, silently. Demo mode is served locally, so Command Center rendered
normally and the app looked healthy. Passing `-Pomen.debugApiBaseUrl` did *not* help either:
`cfg()` reads environment variables and `local.properties`, never Gradle project properties.
`OMEN_DEBUG_API_BASE_URL=… ./gradlew :app:installDebug` is the working form. Had I trusted the
screen, I would have filed a wiring bug that did not exist — or worse, "fixed" working code.

## F-DEV-02 — the ESPN switch that "didn't take". **DIAGNOSED. Client made honest; the real fix is a founder-gated migration.**

- **Reported:** *"I hit switch, wait for it to load, and then I hit ESPN, and it still stays on
  my sleeper."*
- **The switch was never ignored.** `POST /api/leagues/active` did exactly what it promises: it
  bound the league *within* ESPN. What it cannot do is record **which provider** was chosen.
- **Root cause, and it is documented in our own contract.** `platform_connections` holds one row
  per `(user_id, platform)` and **has no column for the user's cross-provider choice**.
  `api-routes.md` §Active-league selection says so plainly: until
  `sql/2026-08-26_league_selection_review.sql` is applied, `selection_persistence` reports
  `provider_binding_only` and `src/services/activeSelection.js` falls back to the deterministic
  tie-break — which for `omen.js` is **sleeper → espn → yahoo**. Sleeper wins. Every time.
- **The client defect was silence, not the switch.** Both clients *decode*
  `selection_persistence` and neither renders anything from it. The iOS model's own doc comment
  claimed *"the sheet reads this to avoid promising a cross-provider choice that the server has
  told us it cannot yet persist"* — **the sheet did not read it.** A comment asserting behavior
  that does not exist is worse than no comment: it retires the question.
- **Fixed:** both sheets now show a `.stale` surface — "Omen will keep using Sleeper… choosing a
  league on a different platform won't stick yet" — gated on
  `crossProviderChoiceCannotPersist`, which requires *both* the server's own
  `provider_binding_only` signal *and* more than one provider with leagues. One provider has
  nothing to cross, and warning there would describe a limit the user cannot reach.
- **It expires by itself.** Applying the column flips the server to `explicit` and the notice
  disappears with **no client release and no flag to remember to remove**. Three tests per
  platform pin that, including the disappearance.
- **The real fix is the founder's call, not mine.** Applying SQL is the gated founder sequence
  (facts-of-record #8: approval → staging → verification → production). The migration is
  additive and reversible — one nullable `is_selected` column plus a partial unique index, no
  existing row rewritten, rollback in the file's own footer. **Until it is applied, no client
  change can make cross-provider switching work.**

**Why no audit pass caught this.** Every lens read the switcher as *rendered state* and it
rendered correctly: real leagues, correct grouping, checkmark on the active row, honest error
surface. The defect only exists **across a state transition** — pick, close, re-read, observe the
old context — and it needed a second connected provider to be visible at all. The founder had
both. No pass had either.

## Two design-system checks caught the fix mid-flight

Worth recording as the system working:

- `PrimitiveEnforcementTests` rejected the suggestion rows for using a raw SwiftUI `Button`, then
  rejected the keyboard toolbar for the same reason. Both became `OmenListRow` / `OmenButton`.
- The contrast audits on Help + Support failed on a dirty simulator and passed clean — the same
  environment-sensitivity already recorded for `ContextualHelpAccessibilityUITests` (register #8).
  **A second instance of that flake class**, and the trigger is now clearly "simulator driven by
  hand during a session," not the tests themselves.

## Confirmed working, on device, with a real league

League: standings render, matchup renders, playoff line reads **"1st … in a playoff spot"** —
the `settings.playoff_teams` parse shipped hours earlier, working against a live Sleeper league.

---

## The method lesson

Six passes, sixteen findings, two beta blockers closed — and **ten minutes of a person tapping
around found a screen that could not be used at all.**

Phase B was run on a simulator through a screenshot harness, and the founder's own audit criteria
say B must be run *"against a running app on a real device."* It was not, and the gap was
recorded as `F-AUDIT-01`. This is what that gap cost: **screenshots prove what a screen renders;
they cannot prove it can be operated.**

Any future Phase B must include *typing into every text field and dismissing the keyboard* as an
explicit step, alongside the existing B1 walk.
