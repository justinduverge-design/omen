# J1 "Getting in" — pre-build diff

**Date:** 2026-09-18 · **Branch:** `claude/j3-first-call` · **Baseline frames:** `/tmp/j1-before`
**Artboards:** `SignIn`, `EmailCode`, `ConnectLeague`, `EspnConnect`, `ConnectFailed`,
`CommandNoLeague` — 197 contract elements.

## Why this exists before any code

J1 is not J3. Three of its six screens are **live, shipped, recently-fixed auth and provider
flows** — `main` carries ESPN fixes from 2026-09-17/18 — and ESPN is the product's one confirmed
beta failure. Rebuilding those to an artboard without first measuring the delta risks regressing
the flow that was just repaired.

So the existing screens were captured first and diffed against their artboards. **No screen code
has been changed.**

Base check, done before anything else: `2a862e9c`, `34148b22` and `d0222bb6` are all ancestors of
this branch, and the MyDisney handling is present in `ConnectView.swift`. The branch is not stale
against the ESPN fixes.

## Gate question, resolved — ESPN is buildable

`omen-mobile-onboarding-connection-contract-v1.md` §5 calls ESPN **research-gated** and says "do
not ask for ESPN password or raw cookie entry in a store build". Taken at face value that blocks
two of the six screens.

**It is stale, not binding.** `W1-GATE` closed 2026-08-31: ESPN's terms were answered **No**
(Disney ToU §2.B.viii / §2.B.x / §1.F), and the **founder accepted the risk explicitly** and chose
to ship with a consent line. Three constraints carry forward and bind the J1 build:

1. no association-implying ESPN branding,
2. a consent screen,
3. the prepared App Review answer.

## Screen-by-screen

### `ConnectLeague` — the highest-value screen in J1, and two gaps are compliance-relevant

| # | Shipped | Artboard | Assessment |
|---|---|---|---|
| 1 | Order: **ESPN → Yahoo → Sleeper** | **Sleeper → Yahoo → ESPN** | **Artboard is right.** The connection contract's policy matrix calls Sleeper the "first native connection candidate — fast, direct, resumable" and ESPN the most-steps path. Shipped leads with the slowest, most fragile provider, which is also the one that failed in beta. |
| 2 | ESPN subtitle: "Sign in with ESPN" | "A few more steps — ESPN has no read-only sign-in. We walk you through it here, on your phone." | **Artboard is right, and this is the beta failure.** The shipped line implies parity with Yahoo's one-tap OAuth. It is not parity, and the phone path is exactly what beta users could not find. |
| 3 | Provider marks: filled tiles, ESPN red `E`, Yahoo `Y!` | Neutral text crests `SLPR` / `YHOO` / `ESPN` | **Flagged — likely compliance.** A red `E` tile and `Y!` read as the providers' own marks. `W1-GATE` carries "no association-implying ESPN branding" as a binding constraint. The artboard's neutral crest is the safer treatment. **Not a visual preference — route this past the founder.** |
| 4 | Security card + "I'll do this later" | Trailing line: "You can add more leagues later, and switch between them from any screen." | Shipped is arguably better; both are honest. Keep the reassurance. |
| 5 | Back chevron in header | Account avatar | Follows the E017 decision of 2026-09-18 — both controls. |

### `SignIn` — CONFLICT, needs a founder decision before it is built

The artboard draws four full-width buttons (Apple / Google / Discord / email), a tagline and a
subline, and a legal line.

The shipped screen carries **three things the artboard does not**, and two of them are load-bearing:

1. **"Look around without an account →"** — the demo entry point. **Fact-of-record #19: Demo Mode
   is the App Store reviewer's entire path into the app**, and the cut is explicitly deferred until
   after first approval. `omen-store-review-notes-v1.md` opens with "NO SIGN-IN REQUIRED FOR
   REVIEW. On the first screen, tap 'Try Demo'". **Building SignIn to the artboard deletes the
   reviewer's only door.**
2. **"you confirm you're 13 or older"** — an age gate the artboard's legal line omits.
3. "Google and Discord open a secure Omen sign-in page. We only receive the sign-in result." — a
   security explainer the artboard omits.

The artboard also carries a subline the shipped screen lacks ("One call a week for every team you
manage. Plain English, and it shows its work.") and uses four labelled buttons where shipped uses
one labelled plus three icon-only.

**This is exactly the case the precedence rule does not settle.** The artboard owns the look, but
here the shipped screen carries *content* that a fact of record and a store-review document
require. Under "artboard owns look, contract owns truth", the demo link and the age gate are truth.

**Recommendation:** build the artboard's composition — four labelled buttons, tagline, subline —
and **keep the demo link, the age gate and the security explainer**, placing them below the
provider buttons as shipped does. Then redraw `SignIn.dc.html` to match, as was done for
`OmenCall`. Founder confirmation wanted before the build, because it changes the canvas.

### `EmailCode`

Artboard specifies behaviour the contract should keep: six boxes, **paste fills every box**, the
keyboard stays up until the last digit, resend and "use a different email", and a stated 10-minute
expiry. Not yet compared against the shipped screen's behaviour — that is a build-time check, not
a visual one.

### `EspnConnect`, `ConnectFailed`, `CommandNoLeague`

No capture scenarios exist for these three, so there is nothing to diff yet. They need fixtures
before they can be captured. `ConnectFailed` is **J1's degraded pass** — the journey has no
capability profile, so per `screen-journeys-v1.md` the provider failure path is the degraded pass,
and it is the only confirmed beta failure on record.

## Recommended build order

1. **`ConnectLeague`** — highest value, and items 1 and 2 above are the beta failure. Visual and
   copy only; no auth behaviour touched.
2. **`ConnectFailed`** — J1's degraded pass. Needs a fixture and a scenario.
3. **`CommandNoLeague`** — the journey's terminus.
4. **`EmailCode`** — behavioural checks.
5. **`EspnConnect`** — last, deliberately. It is the fragile one, it was fixed on `main` two days
   ago, and a visual pass must not alter the MyDisney handling.
6. **`SignIn`** — blocked on the founder decision above.

## Rules this build will hold itself to

- **No change to auth or provider behaviour.** J1 is a visual and copy pass. The ESPN session
  handling, the MyDisney presentation fix, and the OAuth paths are not touched.
- **No ESPN cookie value is ever shown, logged or echoed** (fact-of-record #6).
- Every non-success state keeps a safe next action, per the connection contract §6.
- Cancellation is not an error.
