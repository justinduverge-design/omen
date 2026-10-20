# Omen whole-app canvas v1

**Status:** Working canvas brief; founder review is the approval gate  
**Date:** 2026-10-18  
**Scope:** Every reachable native screen and every state that materially changes what the user can
understand or do. iPhone is the first rendering target; Android receives the same product contract
through its native expression.

## Why this replaces a screen-by-screen patch cycle

The 2026-09-13 visual lock remains source evidence, but it is not a complete map of the current
product. The app now has real entry, provider, multi-league, Trade Find, Trade Type, account, and
Omen evidence behavior that the 32-artboard set either predates or does not draw. This canvas is the
migration authority for deciding what survives, what is redrawn, and what is retired.

The finished canvas must let a builder follow a user from first open to a completed decision
without inventing a transition, a loading state, a control, or an evidence treatment in code.

## Product-wide spine

| Layer | Product job | Required destinations |
|---|---|---|
| Entry | Let a person understand Omen before committing, then enter safely. | Welcome, demo, sign in, email verification, recovery |
| Connection | Connect a source, understand its limits, and recover without exposing credentials. | Provider picker, ESPN consent/browser return, Yahoo selection, Sleeper connection, success, failure |
| Command | Show what is happening across every followed team and route to the right depth. | Weekly desk, live matchup portfolio, quiet week, partial data, no league |
| Omen | Make one defensible call and show why the provider read and Omen read agree or diverge. | Analyzing, call, hold, evidence, incomplete input, already optimized |
| Trade | Support the way people actually arrive at a trade question. | Find, Build, Type, roster picker, partner picker, analysis, close call, share |
| League | Expose league pressure, opportunities, and movement without pretending every provider is equal. | Table, teams, waiver wire, activity, partial provider, no rosters |
| Receipts | Preserve what Omen said, what the user did, and what can actually be verified. | Ledger, receipt, degraded outcome, self-reported outcome |
| Account | Manage identity, sources, privacy, support, and destructive actions with native controls. | Account, connections, privacy/data, help, about, disconnect, delete account |

## Canvas page map

The visual workspace uses these pages. A frame cannot be marked ready while it exists only in code.

| Page | Contents | Exit criterion |
|---|---|---|
| `00 - Start Here` | authority, product spine, legend, current build and review status | One clear route to every other page |
| `01 - Principles and References` | Omen voice, Apple-native behavior, reference analysis, anti-patterns | References describe principles, never copied layouts |
| `02 - Tokens and Themes` | semantic color, type, spacing, elevation, motion, haptic roles | iOS and Android aliases exist; no screen-local token |
| `03 - Components` | foundations and Omen compositions with variants and states | Every screen component resolves here |
| `04 - iOS Journeys` | complete iPhone journeys, compact and large-phone behavior | Every reachable state and transition is drawn |
| `05 - Android Journeys` | equivalent Compose journeys and platform differences | Product parity without pixel imitation |
| `06 - Data and Evidence` | route, contract, freshness, provenance, disagreement, unavailable states | No displayed fact lacks a source/state rule |
| `07 - Motion and Haptics` | press, selection, paging, loading, success, warning, destructive feedback | Reduce Motion and haptics-disabled behavior specified |
| `08 - QA and Decisions` | screenshots, accessibility, latency observations, deviations, approvals | Each frame has an evidence status and owner |
| `99 - Archive` | superseded September frames and rejected proposals | Nothing archived is referenced by shipping code |

## Journey inventory

### J0 - First open and account entry

1. Welcome with one product promise and two actions: try the demo or continue.
2. Demo with fixture status visibly named and a clear path to connect a real league.
3. Native sign-in choice.
4. Email entry, code verification, resend, invalid code, and expired code.
5. Returning-session resolution: brief progress, recoverable failure, signed-in handoff.

### J1 - Connect and select league

1. Provider choice with current support and security expectations.
2. Provider-specific consent and authentication.
3. League/team selection when a provider account contains more than one.
4. Connection validation with progress that names the active step.
5. Success, partial success, failed connection, and reconnect.
6. League switcher with favorite/filter behavior, add-league action, and a distinct switching state.

### J2 - Command and live team portfolio

1. The first useful selected-team matchup renders without waiting for every provider.
2. The entire matchup card is one horizontal page in the team portfolio.
3. The card exposes team name, opponent, phase, current score, projection state, and remaining-play
   context when known.
4. A separate native team selector opens from the league/team context control. It supports direct
   selection; it is not another horizontal scroller under the card.
5. Paging and selection both commit the same active-league identity.
6. Unknown, pregame, unavailable, and no-matchup states use words or a dash; never a factual zero.
7. Waiver, trade, league movement, and Ledger modules fail independently and route to their owner.

### J3 - Omen

1. Initial state explains what Omen can evaluate for the active league.
2. Analysis progress preserves context and names meaningful work without fake percentages.
3. The result begins with one decision or an honest hold.
4. A short deciding-factor paragraph precedes at most three evidence points.
5. Provider information and Omen information are parallel inputs. Neither is visually declared the
   default authority. The result names agreement, disagreement, missing evidence, and why the final
   call follows one side when they diverge.
6. Expanded evidence shows freshness, source, and limitations without using Sight as a visual or
   naming vocabulary.
7. Re-analysis, stale result, partial provider, no projections, and no defensible move are drawn.

### J4 - Trade

1. Choose Find, Build, or Type without losing active league context.
2. Find is a reviewable candidate deck: paging/swiping changes the candidate, while accept/reject
   remain explicit buttons with accessible labels and undo where the action is local.
3. Build uses native pickers/sheets for partners and rosters, supports the contracted team count,
   and keeps both sides visible.
4. Type parses plain language, echoes the interpreted trade, and requires correction before analysis
   when a player or side is ambiguous.
5. Analysis has loading, verdict, close-call, insufficient-context, unavailable, and retry states.
6. Share uses the system share sheet; identity is off by default and previewed before sharing.

### J5 - League and waiver

1. League overview answers standings pressure, team needs, available players, and recent movement.
2. Each module names provider coverage independently.
3. Waiver opportunity, no credible move, unknown waiver system, no roster access, and stale data are
   separate frames rather than copy swaps inside one optimistic frame.
4. Dense tables become native lists with pinned meaning, Dynamic Type reflow, and useful row actions.

### J6 - Ledger and account

1. Ledger separates recommendation, follow-through, verified result, self-report, and unknown.
2. Receipt preserves the exact original call and the evidence available at that time.
3. Account uses native lists, menus, sheets, toggles, and confirmation dialogs.
4. Disconnect and delete account are destructive, named, confirmed, and never represented by a
   custom imitation of a system confirmation.
5. Help, privacy/data export, about, and report-a-problem are reachable without leaving the user in
   a dead-end sheet.

## Global interaction grammar

| Event | Visual response | Haptic response | Loading/latency rule |
|---|---|---|---|
| Ordinary press | Native pressed state plus Omen tint/elevation response | None by default | Action begins on release; control cannot appear inert |
| Selection change | Selected mark and content transition occur together | Selection feedback | Local state is immediate; remote commit is shown separately |
| Carousel page settles | Card snaps to one stable page; context updates after settle | Selection feedback once, not during drag | Adjacent fixture may prewarm; first page never waits for all pages |
| Primary action accepted | Button enters a stable in-progress state without changing width | Light impact only when the action materially begins | Show progress by 150 ms; replace spinner-only waits with named work after 1 s |
| Success | Result replaces progress; repeated animation is avoided | Success notification | Never show success before the server or local operation confirms it |
| Recoverable failure | Keep entered context; show cause and retry near the failed action | Warning notification | Retry is scoped; healthy screen sections remain useful |
| Destructive confirmation | Native confirmation dialog with exact object/action | Warning on confirmation, not on opening | No optimistic deletion |

Haptics supplement visible and spoken state; they never carry meaning alone. Respect the user's
system settings, Reduce Motion, VoiceOver, Dynamic Type, and Reduce Transparency.

## Component migration register

| Pattern | Decision | Canvas requirement |
|---|---|---|
| Top-level tab bar | Keep, native | Four stable destinations; Account remains contextual |
| League/team context control | Keep, rebuild around native menu/sheet behavior | One reliable tap target; loading and selection states |
| Matchup card carousel | Keep and expand | Full cards page; direct selection lives outside the horizontal gesture |
| Team-initial score rail | Retire | Competes with card paging and reduces names to ambiguous initials |
| Page dots | Transitional | Allowed until the new selector/card relationship is approved |
| DecisionBrief | Keep, revise | Decision, deciding factor, evidence, disagreement, limitations |
| Decorative rankings | Keep with constraints | Rank supports comparison; it never substitutes for evidence or certainty |
| Find-a-trade candidate deck | Keep, native interaction pass | Explicit actions, undo, accessibility, deterministic loading |
| Custom pop-up/menu imitations | Retire | Use native Menu, Picker, sheet, popover, or confirmation dialog |
| Spinner-only loading | Retire for meaningful waits | Preserve structure and name the work/state |
| Legacy duplicate Omen composition | Retire after route proof | One typography and state model from analysis through result |

## Frame definition of done

Every frame carries:

- product job and entry/exit paths;
- API contract, evidence source, freshness, and unavailable behavior;
- compact/large iPhone behavior and Android differences;
- default, pressed, focused, disabled, loading, partial, empty, error, retry, and success states as
  applicable;
- haptic and motion behavior, including disabled/reduced behavior;
- accessibility name, value, hint, grouping, order, and Dynamic Type response;
- expected first-useful and completion latency class;
- approval state: proposal, founder-approved, implemented, simulator-checked, or physical-device
  verified. These states are never collapsed into one "done" label.

## First canvas cut

The first reviewable cut is not 32 polished happy paths. It is:

1. the shared shell and context switcher;
2. the complete J2 live-team portfolio interaction;
3. the complete J3 Omen analysis-to-evidence transition;
4. the J4 Trade mode chooser and Find candidate interaction;
5. the global component state board for buttons, rows, sheets, loading, errors, motion, and haptics;
6. grey-box journey frames for every remaining screen so the whole product is present from day one.

This order settles the interactions reused most widely while keeping the canvas whole.
