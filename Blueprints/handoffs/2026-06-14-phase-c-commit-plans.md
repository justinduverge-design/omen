# Phase C Commit Plans

**Layer:** 2 (Corvus)
**Date:** 2026-06-14
**Branch:** `claude/phase1-3-ios-sweep` (existing — two commits already: `f86cbb2` Phase A, `2551f45` PWA)
**Status:** Plans built. Awaiting Justin's "go" to execute.

---

## Commit 1 — iOS Safari leftovers

**Goal:** finish the audit items deferred from Phase A. Pure design-token / utility-class work; no behavior changes.

### Files & changes

| # | File | Line(s) | Change | Why |
| --- | --- | --- | --- | --- |
| 1 | [frontend/src/pages/Landing.jsx](frontend/src/pages/Landing.jsx) | 35 | `className="sticky top-0 z-50 border-b border-white/8 bg-[#050505]/88 backdrop-blur-xl"` → add `pt-[env(safe-area-inset-top)]` | Landscape iPhone: status bar overlays page top; without this, wordmark renders under it. |
| 2 | [frontend/src/pages/CorvusLanding.jsx](frontend/src/pages/CorvusLanding.jsx) | 7 | Same `pt-[env(safe-area-inset-top)]` addition | Same reason as Landing. |
| 3 | [frontend/src/components/layout/Header.jsx](frontend/src/components/layout/Header.jsx) | 151 (drawer header `<div>`) | Add `pt-[env(safe-area-inset-top)]` to the drawer's `<div className="flex items-center justify-between px-5 py-4">` | Drawer is `h-full` with `viewport-fit=cover`; top can sit under status bar. |
| 4 | [frontend/src/components/layout/Header.jsx](frontend/src/components/layout/Header.jsx) | 235 (drawer footer `<div>`) | Add `pb-[env(safe-area-inset-bottom)]` to the drawer's footer `<div className="px-5 py-4">` | Bottom of drawer can sit behind home indicator. |
| 5 | [frontend/src/components/ui/HelpButton.jsx](frontend/src/components/ui/HelpButton.jsx) | 173 (panel header) | Add `pt-[env(safe-area-inset-top)]` | Same as nav drawer top. |
| 6 | [frontend/src/components/ui/HelpButton.jsx](frontend/src/components/ui/HelpButton.jsx) | 297 (panel footer) | Add `pb-[env(safe-area-inset-bottom)]` | Same as nav drawer bottom. |
| 7 | [frontend/src/pages/OmenPage.jsx](frontend/src/pages/OmenPage.jsx) | 99-103 | Wrap `<Link>` body in `inline-flex items-center min-h-[44px]` | "← Back to dashboard" link is `text-xs` only — tap zone ~22px. Wrapping the text in a min-44px flex shell expands the tap area without bloating the visible text. |
| 8 | [frontend/src/pages/Landing.jsx](frontend/src/pages/Landing.jsx) | 39-50 | Wrap "Join Waitlist" + "Sign In" links in `inline-flex items-center min-h-[44px]` | Header CTAs are `text-xs` — same problem, same fix. |
| 9 | [frontend/src/pages/Football.jsx](frontend/src/pages/Football.jsx) | 231 | Change `py-3` to `py-3 min-h-[44px]` on tab buttons | Tab strip is ~40-42px tall. Bump to 44px exactly. |

### Items NOT in this commit (and why)

- **Body scroll-lock `position: fixed` rewrite** — Phase A flagged this as a known iOS Safari quirk. Justin's iPhone QA green-checked the nav drawer with no rubber-band note → no evidence the bug fires in our usage. Skip; revisit only if reported later.

### Verification

1. `npm --prefix frontend run build` clean.
2. `git diff --check` clean.
3. Visual sanity at iPhone 14 Pro viewport (390×844) in any browser dev tools — the sticky landing header should have padding-top reflecting the inset; the drawer headers/footers should have insets too. (Full real-device verification happens in Phase D.)

### Draft commit message

```
feat(phase1.3): iOS Safari Phase C leftovers — safe-area + touch target polish

- Sticky landing + CorvusLanding headers: pt-env(safe-area-inset-top) so the
  wordmark clears the notch / Dynamic Island in landscape
- Nav drawer (Header.jsx) + Help panel (HelpButton.jsx): inset top/bottom
  padding so drawer header/footer don't clip behind status bar / home indicator
- Borderline text-link touch targets: wrap OmenPage back link, Landing header
  Join Waitlist / Sign In, and Football tab buttons in min-h-[44px] shells so
  the tap zone hits HIG 44px while visual stays compact

Body scroll-lock rubber-band check skipped: Justin's iPhone QA green-checked
the nav drawer with no rubber-band complaint, so no evidence the fix is needed.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Commit 2 — Paywall copy replacements

**Goal:** rewrite every visible paywall/Pro/subscription/unlock string with neutral or platform-connection framing. Pure copy pass; no structural changes. Behavior unchanged.

### Files & changes

Grouped by file for one diff per file.

#### [frontend/src/pages/CorvusLanding.jsx](frontend/src/pages/CorvusLanding.jsx)

| Line | Was | Becomes |
| --- | --- | --- |
| 40-43 | `FEATURES` array entries have `pro: true/false` field | Remove the `pro` field from all three entries |
| 53 | "The trade check is free. Everything else is Pro." | "Every Corvus tool — built for your roster, every week." |
| 62-66 | `{f.pro && (<span ...>Pro</span>)}` Pro badge block | Delete the entire conditional block |
| 89 | "No credit card required · 7-day Pro trial included" | "Try Trade Analyzer without an account · Sign in for your roster" |

#### [frontend/src/pages/DraftAssistant.jsx](frontend/src/pages/DraftAssistant.jsx)

| Line | Was | Becomes |
| --- | --- | --- |
| 346-348 | `<span ...>{`Free · ${new Date().getFullYear()} Season`}</span>` badge | Delete the badge entirely. Keep the surrounding `<h2>` "Your next pick" and `<p>` description. |

#### [frontend/src/pages/OmenPage.jsx](frontend/src/pages/OmenPage.jsx)

| Line | Was | Becomes |
| --- | --- | --- |
| 14 | `<p className="text-xs ...">Corvus Pro</p>` eyebrow | `<p className="text-xs ...">Omen</p>` |

#### [frontend/src/pages/Account.jsx](frontend/src/pages/Account.jsx)

| Line | Was | Becomes |
| --- | --- | --- |
| 328 | "Every Corvus tool — Omen of the Week, Waiver Wire, and more — is available on your account. No subscription required." | "Every Corvus tool is available on your account." |
| 495 | "Manage your Corvus Pro subscription and fantasy platform connections." | "Manage your fantasy platform connections and account preferences." |

#### [frontend/src/pages/Login.jsx](frontend/src/pages/Login.jsx)

| Line | Was | Becomes |
| --- | --- | --- |
| 240-242 | "Sign in to unlock Omen of the Week — your weekly Most Valuable Play. Trade Analyzer stays free without an account." | "Sign in to get your weekly Omen — your Most Valuable Play. Or try Trade Analyzer without an account." |

#### [frontend/src/components/ui/HelpButton.jsx](frontend/src/components/ui/HelpButton.jsx)

The `PAGE_HELP` object is the main copy surface here. Multiple sub-edits:

| Line | Was | Becomes |
| --- | --- | --- |
| 21 | `{ label: 'Free to use', body: 'No account or subscription needed.' }` (Trade Analyzer help) | `{ label: 'No account required', body: 'Use Trade Analyzer without signing in.' }` |
| 31 | `{ label: 'Free to use', body: 'No account or subscription needed.' }` (Draft Assistant help) | `{ label: 'No account required', body: 'Use Draft Assistant without signing in.' }` |
| 41 | `{ label: 'Pro required', body: 'Omen unlocks with a Corvus Pro subscription.' }` | `{ label: 'Platform required', body: 'Omen reads from your connected fantasy platform.' }` |
| 66-75 (`/account` help section) | "Manage your Corvus Pro subscription and your connected fantasy platforms." + Subscription/Manage/Platforms/Appearance tips block (4 tips) | Rewrite as: description = "Manage your fantasy platform connections and appearance preferences." Tips = 3 entries focused on Platforms, Appearance, Sign out. Drop the Subscription and Manage tips entirely. |
| 88 | `{ label: 'Omen of the Week', body: 'Pro — your one weekly move, surfaced every Tuesday.' }` | `{ label: 'Omen of the Week', body: 'Your one weekly move, surfaced every Tuesday.' }` |
| 253 | `{ label: 'Account & Subscription', to: '/account' }` quick-link | `{ label: 'Account', to: '/account' }` |

### Verification

1. `npm --prefix frontend run build` clean.
2. Grep sanity (these should return ZERO hits in `frontend/src/` after the commit, ignoring `WaiverWire.jsx` which is dead code, and ignoring word-boundary false-positives like `Promise`):
   - `grep -rn "Corvus Pro" frontend/src/`
   - `grep -rn "No subscription required" frontend/src/`
   - `grep -rn "No credit card required" frontend/src/`
   - `grep -rn "Free · 2026" frontend/src/`
   - `grep -rn "Free · \${" frontend/src/`
   - `grep -rn "unlock with a.*subscription" frontend/src/`
   - `grep -rn "Pro trial" frontend/src/`
   - `grep -rn "Account & Subscription" frontend/src/`

### Draft commit message

```
feat(phase1.3): remove paywall-coded copy across all routes

Replaces explicit Pro / Subscription / Free / unlock / paywall language with
neutral or platform-connection framing. Behavior unchanged; pure copy pass.

Surfaces touched:
- CorvusLanding: hero feature pitch (Pro badge dropped, copy rewritten)
- DraftAssistant: "Free · 2026 Season" badge removed
- OmenPage: eyebrow "Corvus Pro" -> "Omen"
- Account: "Manage your Corvus Pro subscription" -> platform-connection focused
- Login: "Sign in to unlock" softened; "stays free" removed
- HelpButton: every Pro/subscription mention rewritten; /account help section
  rebuilt around platform connections + appearance + sign-out
- HelpButton quick-link: "Account & Subscription" -> "Account"

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## Commit 3 — `BILLING_ENABLED` wraps + dead-branch removal

**Goal:** when billing is off (the current product direction), no billing UI should *ever* render. Tighten the env-flag coverage where it's currently inconsistent, and delete dead `needs_subscription` branches that already render nothing useful when billing is off.

### Files & changes

#### [frontend/src/pages/Account.jsx](frontend/src/pages/Account.jsx)

| Line | Change | Why |
| --- | --- | --- |
| 489 | Wrap `{banner && <SubscriptionBanner ... />}` in `{BILLING_ENABLED && banner && <SubscriptionBanner ... />}` | The subscription banner ("Welcome to Corvus Pro." etc.) shouldn't fire when billing is off. |
| 499-505 | Wrap entire `<SubscriptionSection ... />` in `{BILLING_ENABLED && <SubscriptionSection ... />}` | This is the section Justin red-X'd. Disappears entirely when billing off. |
| 509-510 | Drop the `<p>Platforms</p>` eyebrow on line 509; keep the `<h2>Platform Connections</h2>` on line 510 | Redundant — same word twice. |

#### [frontend/src/pages/Football.jsx](frontend/src/pages/Football.jsx)

| Line | Change | Why |
| --- | --- | --- |
| 161-168 | Delete the entire `if (omenStatus === 'needs_subscription') { ... UpgradeState ... }` branch | When billing is off, backend should never return `needs_subscription`. If it ever does (contract violation), falling through to the default which renders `<OmenOfTheWeek />` is the safe behavior — `OmenOfTheWeek` handles its own states. |

#### [frontend/src/pages/OmenPage.jsx](frontend/src/pages/OmenPage.jsx)

| Line | Change | Why |
| --- | --- | --- |
| 68-76 | Delete the entire `if (omenStatus === 'needs_subscription') { ... UpgradeState ... }` branch | Same reasoning as Football.jsx. |

#### [frontend/src/pages/OmenOfTheWeek.jsx](frontend/src/pages/OmenOfTheWeek.jsx)

| Line | Change | Why |
| --- | --- | --- |
| ~500-510 | Locate and remove the `needs_subscription` UpgradeState render | Dead. UpgradeState already null-renders when billing is off. |

(I'll confirm the exact line range during execution — the grep earlier showed `OmenOfTheWeek.jsx:507-508` is where the Pro copy lives.)

### Verification

1. `npm --prefix frontend run build` clean.
2. Manual flow check: open every route at `BILLING_ENABLED=false` (current default). Nothing related to subscription, Pro, billing, upgrade, or Stripe should be visible anywhere.
3. Grep sanity:
   - `grep -rn "BILLING_ENABLED" frontend/src/` — should show consistent gating (every place that *previously* could render billing UI now reads `BILLING_ENABLED`).
   - `grep -rn "needs_subscription" frontend/src/` — should only appear inside backend contract types/comments, never inside JSX branches.

### Draft commit message

```
feat(phase1.3): gate Account Subscription UI behind BILLING_ENABLED, remove
dead Pro-paywall branches

When VITE_BILLING_ENABLED is false (the current product direction), no
billing UI should render. Tighten coverage:

- Account.jsx: SubscriptionBanner and the entire SubscriptionSection are now
  BILLING_ENABLED-gated (previously rendered unconditionally and relied on
  internal flag checks to null-render — leaky)
- Football.jsx, OmenPage.jsx, OmenOfTheWeek.jsx: remove the
  `needs_subscription` UpgradeState branches. UpgradeState already returns
  null when billing is off; the branches were dead-but-still-coded. The
  status now falls through to OmenOfTheWeek which handles its own states.
- Account.jsx: drop the redundant "PLATFORMS" eyebrow above the "Platform
  Connections" heading (duplicative).

When VITE_BILLING_ENABLED flips back to true, the wrapped UI returns
automatically. The removed needs_subscription branches will need fresh code
when billing returns — assumed acceptable because the pricing model is
expected to change before re-introduction.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## After the three commits

1. Final build clean check.
2. `git status` clean (no stray untracked files).
3. `git log --oneline -6` should show the chain: original Phase A (`f86cbb2`) → PWA (`2551f45`) → Commit 1 → Commit 2 → Commit 3.
4. Pause. Justin runs a real-device check on a preview deploy or local server to confirm nothing weird happened.
5. If clean: open the PR. PR description includes a summary of Phase A + B + C, references the audit doc and the QA findings sheet, and lists the backlog items spun off.

---

## Estimated impact

| Commit | Files | Approx LOC | Risk |
| --- | --- | --- | --- |
| 1 — iOS leftovers | 5 | ~15 | Low — pure utility class additions |
| 2 — Paywall copy | 6 | ~50 | Low — copy strings only, no logic |
| 3 — BILLING_ENABLED gates | 4 | ~30 (mostly deletions) | Low-medium — needs careful diff review since it touches conditional rendering |

Total Phase C: 6-8 files, ~95 LOC, low risk overall.

---

## Open question for Justin

Three places where copy choice is judgment, and I'd rather you choose:

1. **CorvusLanding hero replacement** — I drafted "Every Corvus tool — built for your roster, every week." Alternative angles: "Built for the manager who hates guessing." / "Your fantasy intelligence, every week." / something else you prefer.

2. **Login page copy** — I drafted "Sign in to get your weekly Omen — your Most Valuable Play. Or try Trade Analyzer without an account." Alternative: keep "unlock" since you only flagged the headline as serif and didn't mark the body. Could leave the body alone.

3. **"Most Valuable Play" terminology** — appears in multiple places. Not paywall language strictly, but tied to the Pro positioning. Keep as-is, or rebrand as just "Omen" / "your weekly call" / etc.? My read: keep "Most Valuable Play" — it's a strong brand term independent of pricing. But your call.

If you'd rather just say "execute as drafted" — that's fine, I'll pick the safer copy and you can revise in a separate copy-polish commit later.
