# Review: Omen Design Foundation v1 (Android & Cross-Platform Perspective)

**From:** Gemini (Android / Cross-Platform Native)  
**To:** Founder & Claude (`claude/build12-redesign`)  
**Target Spec:** `Blueprints/specs/design/omen-design-foundation-v1.md`  
**Date:** 2026-10-21  

---

Hey — Gemini here. I'm working on the Android side of Omen (`mobile/android/`), and I reviewed `omen-design-foundation-v1.md` against our live Kotlin/Compose codebase, the iOS SwiftUI twin, our CI parity gates, and the Native Mobile Read Gate contracts.

First: **the core thesis of §1, §2, and §5 is a huge leap forward.** Killing the "cookie-cutter card farm" where every screen stacks identical `surface1` rounded boxes—and replacing it with **one primary surface per screen with a single brass top lip (`#C4933B`) while lists sit directly on the `#1F1F1D` ground with hairlines**—is the exact move that makes Omen feel like Apple Sports instead of a generic dashboard.

Because I have to build and certify the Android half of this foundation (and keep our cross-platform gates green), I want to push this spec forward in **8 specific places** where it currently assumes iOS-only mechanics, leaves navigation orphans, or collides with our automated token/accessibility tests. Every point below cites the exact file in the repo so we can lock the spec tightly before retiring the §9 directories.

---

## 1. The Source-of-Truth Blindspot: We Can't Read `claude.ai/artifact/...`

**Spec citation:** Header (`Source of truth for screens: https://claude.ai/artifact/Ft9GK2vot2kPbqf5ha78sC`) & §9 (`Retired as design sources`).

* **The Problem:** `claude.ai/artifact/...` sits behind Anthropic's authenticated web shell (`"Sign in to Claude to continue"`). Neither I (Gemini), Codex, CI scripts, nor a fresh headless session can fetch, inspect, or diff against that URL.
* **Source:**
  * `Blueprints/specs/mobile/omen-native-delivery-governance-v1.md` (requires committed, inspectable screen contracts before native feature code starts).
  * `CLAUDE.md` L41–55 (7-file Native Mobile Read Gate: *"When one is missing or two conflict, flag the gap and stop"*).
* **How to push it forward:**
  1. Export the `Omen Build 12 Redesign` artifact HTML/CSS into the repo at `design/omen-build-12-redesign/index.dc.html` (or `design/foundation-v1-canvas/`) **before** deleting the five §9 directories.
  2. Link the local repo path in the spec header alongside the `claude.ai` URL so every agent and CI gate has offline, deterministic access to the frames.

---

## 2. Navigation Model (§3): Android Back Stack, Predictive Back, and iOS-isms

**Spec citation:** §3 (`Push for depth`, `Back control: Chevron plus the name of where it goes, accent colour, 44pt`).

Right now on Android, **we have zero pushed screens in the signed-in shell**—everything is either an inline state swap or an `OmenModalSheet` (`OmenAndroidApp.kt:544–654, 948–1012`). Moving Player, Trade Builder, Ledger Receipt, Account, and Support to **pushed screens** is the right architectural call, but §3 is written strictly in iOS idioms:

1. **Named Back Chevrons (`< Desk`) are an anti-pattern on Android:**
   * **Source:** `Blueprints/specs/mobile/omen-native-design-house-v1.md` §1 (*"One design house, two native expressions... Same house does not mean same pixels. It means the same product feels deliberately native on each phone"*).
   * On iOS, a chevron + parent title (`< Desk`) in `accent` color is standard HIG. On Android (Material 3), putting the previous screen's name next to the back arrow looks like a ported iOS web wrapper. Android uses a 48dp touch-target back arrow (`Icons.AutoMirrored.Filled.ArrowBack` or our custom vector) in the top bar, with the *current* screen's title beside or below it.
2. **Android Predictive Back & System Edge Swipe:**
   * Spec §3 says: *"edge-swipe back works"*. On iOS, edge-swipe is left-edge only. On Android 14–16, system predictive back triggers from **both the left and right screen edges** via `androidx.activity.compose.BackHandler`.
   * Because `OmenAndroidApp.kt` previously relied on `ModalBottomSheet`'s built-in `onDismissRequest` to catch the back gesture, any new pushed screen on Android **must** register a `BackHandler(enabled = true) { pop() }` or a swipe-back gesture will close the entire app to the Android home screen.
3. **"Pinned under the island" (§4):**
   * Spec §4 says: *"Scrolling the Desk shrinks the front card into a slim bar with both scores, pinned under the island"*.
   * Android devices have punch-holes and status bars (`WindowInsets.statusBars` / `WindowInsets.displayCutout`), not a Dynamic Island. Change wording to: *"pinned below the top safe area / system status bar"*.

---

## 3. Team Context Across Tabs: The "Silent Wrong-League" Trap (§4)

**Spec citation:** §4 (`Team Rolodex`: *"A horizontal stack of team cards at the top of the Desk. Flick to move between teams; the card in front is the team every tab reasons about... The switcher sheet stays as the list view (long-press the Desk tab, as Yahoo does)."*)

* **The Problem:** Look at how `OmenAndroidApp.kt` and `CommandCenterView.swift` currently work:
  * **Source:** `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/OmenAndroidApp.kt:900, 929, 1019, 1057–1084` (`WithTeamPicker` wrapping Omen, Trade, and League) and `OmenLeagueCarousel.kt:54–67`.
  * Currently, the Desk has the carousel, and **Omen, Trade, and League each render `OmenTeamPicker` at the top** so the user always sees *which* league they are acting on and can switch on the spot.
  * If the Rolodex only lives on the Desk, and the switcher sheet is hidden behind a **long-press on the Desk tab**, two things break:
    1. A user with 4 leagues taps the `Trade` or `Omen` tab and has **no persistent visual anchor** telling them whether they are looking at their Yahoo Work League or their Sleeper Dynasty League—or worse, they have to leave `Trade`, go back to `Desk`, flick the Rolodex, and return to `Trade`.
    2. On Android, `androidx.compose.material3.NavigationBarItem` (`OmenAndroidApp.kt:714`) only accepts `onClick: () -> Unit`—it has no native `onLongClick` slot without custom `combinedClickable` pointer interception, and Android users rarely discover long-press on bottom navigation bars.
* **How to push it forward:**
  * Keep the **Team Rolodex** as the hero switcher on the Desk.
  * On the root of **Omen, Trade, and League**, keep a quiet, compact **Team Context Pill** in the top header (e.g., `[ESPN · Gotham League ▾]`) that names the active team/league from the front Rolodex card and opens the **Team Switcher Sheet** on tap. Also support long-pressing the Desk tab as a power-user shortcut.

---

## 4. Navigation Orphans & Header Chrome Conflicts (§3 & §6)

**Spec citation:** §3 (`Four tabs: Desk · Omen · Trade · League`, `One way to Account: The avatar at top right of the Desk. Account holds Help and Support.`) & §6 (`Every screen and its job`).

1. **Where do `Waivers` and `Ledger` live?**
   * §6 lists `Waivers` (*"The one add worth making, and what it replaces"*) and `Ledger` (*"Was Omen right?"*) as full screens, and §3 says tapping a player in `Waivers` or `Ledger` pushes `Player`.
   * Yet neither `Waivers` nor `Ledger` is a tab in §3, and §3 never states which tab pushes them!
   * **Source:** In `OmenCommandCenterScreen.kt:66–68` and `OmenAndroidApp.kt:1038–1050`, Waivers ("Scout Wire") is currently a sheet launched from `League` (and previewed on `Desk`), while `Ledger` is previewed on `Desk` (`OmenLedgerScreens.kt`).
   * **Fix:** Explicitly declare every non-tab screen's parent in §3:
     * **Waivers:** Pushed from `Desk` (when the week's call or secondary call is a waiver add) and from `League` ("Waiver wire" section header link).
     * **Ledger:** Pushed from `Desk` / `Omen call` ("Was Omen right? · 7–2" receipt row) and drills down into a pushed `Ledger receipt`.
     * **Trade chooser / Find a trade / Trade builder:** `Trade` tab root is the `Trade chooser`, which pushes `Trade builder` or `Find a trade`.
2. **Retiring `OmenHelpButton` (`E017`) and `OmenReportPill`:**
   * **Source:** `mobile/android/app/src/main/kotlin/com/slopssaloon/omen/app/feature/shell/OmenScreenShell.kt:31–70` and `OmenAndroidApp.kt:535–542`.
   * On 2026-09-18, the founder locked `E017` (`OmenScreenHeaderControls`) to render **both** the `?` Contextual Help icon and the Account avatar on every screen, plus the floating `OmenReportPill` at the bottom of the Desk (`OmenAndroidApp.kt:536`).
   * §3 now says: *"One way to Account: The avatar at top right of the Desk. Account holds Help and Support."*
   * **Fix:** State explicitly in §3 and §9 that this supersedes the `2026-09-18` `E017` dual-icon header rule and removes the floating `OmenReportPill` from the Desk root (moving Support/Report into `Account`, or keeping "Report this call" as a quiet footer link inside `Omen call` and `Verdict sheet`). Otherwise our existing Android/iOS header tests will fail against the new layout.

---

## 5. Typography & Token Parity Gates (§5 vs. `OmenTypography.kt` & `OmenColor.kt`)

**Spec citation:** §5 (`Visual rules`).

We have strict automated enforcement on both platforms (`scripts/check-token-parity.js`, `OmenColorContrastTest`, and `TypographyDerivationTests`). Three rules in §5 will break those gates unless specified with token precision:

1. **Light Mode Contrast for Brass (`#C4933B`) and Green (`#2F7D5B`):**
   * **Spec §5:** *"Warm dark ground `#1F1F1D`; brass `#C4933B` is the only accent... Green is used only as words for a need or a gain ('Needs WR'), never as a fill. Light mode uses the same roles."*
   * **Source:** `mobile/ios/OmenIOS/OmenIOS/DesignSystem/OmenColor.swift:20–46`, `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/token/OmenColor.kt`, and `scripts/check-token-parity.js`.
   * **Why this matters:** In light mode (`bg = #F1EDE4` Bone White), literal `#C4933B` brass is **~2.3:1 contrast**, which fails `OmenColorContrastTest` (WCAG AA 4.5:1 for text, 3:1 for boundaries). Our token system already solves this:
     * `OmenColor.accent`: Dark `#C4933B` / Light `#7A5C1E`
     * `OmenColor.omenChip` (text-safe green): Dark `#4FAE81` (5.69:1 on `#1F1F1D`) / Light `#1A5C3E` (7.94:1 on `#FFFDF9`). Note that raw `OmenColor.omen` (`#2F7D5B`) is only `3.96:1` on dark `#1F1F1D` (`OmenColor.swift:38–41`), which fails AA for 12–15pt "Needs WR" words!
   * **Fix in §5:** Specify semantic tokens (`OmenColor.accent`, `OmenColor.omenChip` for green words) rather than raw dark-mode hexes, and clarify: **What color is the `Omen grade ring` stroke in §4?** If brass is the only accent and green is only words, is the grade ring stroke `OmenColor.accent` (brass) over a `borderSubtle` track? Lock that explicitly.
2. **Type Ramp Drift (`OmenTypography.kt:101–117`):**
   * **Spec §5:** *"Screen titles 28–34, hero numbers 40–46, body 15, quiet lines 12–13."*
   * **Spec §4:** *"No uppercase micro-labels as section titles."*
   * **Source:** `mobile/android/core/designsystem/src/main/kotlin/com/slopssaloon/omen/core/designsystem/token/OmenTypography.kt:101–117` and `OmenTypography.swift`.
   * Right now in code, our locked roles are:
     * `screenTitle = 22.sp` (not 28–34; `h1` is `32.sp`)
     * `scoreLead = 27.sp` and `display = 48.sp` (nothing sits at `40–46.sp`)
     * `label = 11.sp (uppercase = true)` and `micro = 10.sp (uppercase = true)`
   * **Fix in §5:** Include a concrete token-mapping table in §5 so iOS and Android update `OmenTypography.swift` and `OmenTypography.kt` in lockstep (e.g., `heroNumber = 44pt/sp tabular`, `screenTitle = 30pt/sp`, `sectionHeader = 18pt/sp Display Bold, uppercase = false`).
3. **Android 2.0x Font Scale Celebration ("Command" → "Desk"):**
   * **Source:** `OmenAndroidApp.kt:727–741` (comment from 2026-08-22: at Android's 2.0x accessibility font scale, `"Command"` wrapped to `"Comma / nd"` in the bottom nav bar).
   * Renaming `"Command"` (7 chars) to `"Desk"` (4 chars) in §3 permanently eliminates that 2.0x overflow on small Android screens and iPhone SE. Keep `"Desk"` locked!

---

## 6. Pushing the UX Forward: High-Leverage Upgrades for §4 Patterns

If we are building these 10 components once in `DesignSystem/` (`mobile/ios/.../DesignSystem/` and `mobile/android/core/designsystem/component/`), let's make sure three tricky interaction edge cases are solved in the spec right now:

1. **Team Rolodex + Pinned Score Gesture Coordination (§4):**
   * On both iOS (`ScrollView` + `TabView(.page)`) and Android (`verticalScroll` + `HorizontalPager` + `NestedScrollConnection`), a horizontal deck of cards that *also* shrinks into a pinned score bar on vertical scroll will fight the user's thumb if the angle tolerance isn't locked.
   * **Spec addition:** Define the collapse threshold: once the user scrolls down past the Rolodex card's bottom edge and it collapses into the **Pinned score bar**, horizontal flicking on the pinned bar is **disabled** (or tapping the pinned bar scrolls back to top / opens the switcher sheet). You only flick the full Rolodex when at the top of the Desk.
   * Also specify the **Rolodex stack cue**: how does a user with 3 teams know the first card is a stack? Specify a **peek edge** (e.g., 12pt of the next card peeking on the trailing edge, or a subtle stacked card bottom edge + `1 of 3` count in the header, matching `OmenLeagueCarousel.kt:61`'s accessibility rule that page indicators cannot rely on color alone).
2. **Trade Builder (§4): Three-Team & Provider Lock Truth:**
   * **Source:** `Direction/2026-10-20-build-12-plan.md` L27–35 (*"Build anchors the user's team, excludes it from opponent choices, supports the approved two- and three-team composition... and provider lock/editability state"*).
   * Spec §4 currently describes `Trade builder` as two-sided only: *"Partner, then You send and You get trays, then a roster toggle (yours / theirs) with a check per row"*.
   * **Spec addition:** Account for:
     * **Locked / In-flight players:** A player whose game has started (or is non-tradeable per provider rules) must show a quiet lock state on their `Player row` rather than an active checkbox.
     * **2-team default, 3-team expansion (where provider supports it, e.g. Sleeper):** Keep the 2-team `Yours / Theirs` segmented toggle as the clean default, with an optional `+ Add third team` affordance only when capability `multiTeamTrade == true`.
3. **"The Machine Stays Backstage" vs. Required Mock/Live & Provenance Honesty (§2 & §8):**
   * **Spec §2:** *"Nothing on a main screen says what Omen could not read, which source was stale, or how a signal was weighed. That lives in 'See the full argument'."*
   * **Source:** `Direction/2026-10-20-build-12-plan.md` L37–39 & `OmenCommandCenterScreen.kt:70–74` (Facts-of-record #7: mock/demo data must be visibly labeled, never presented as live; degraded provider sub-reads stay local and honest).
   * **How to reconcile both rules cleanly:**
     * Keep internal signal weights and warehouse coverage telemetry backstage inside `"See the full argument"`.
     * **Never hide Demo Mode or stale provider sync:** If the user is in Demo Mode, the top badge still says `Demo`. If ESPN's cookie expired or a roster read is 6 hours stale, the Rolodex card or section header shows a quiet, human 1-line status (`"ESPN needs sign-in"` or `"Updated Tue 4:10 PM"`), never raw plumbing jargon (`"nflverse_weekly_stats missing"`).

---

## 7. Protecting Build 12 Scope: Sequence the Rollout in §10

**Source:** `Direction/2026-10-20-build-12-plan.md` L16–24 (*"Final Build 12 scope lock — 2026-10-15: Build 12 is one Trade release with supporting provider and data foundations. It is not a general League rewrite..."*).

Right now, §6 lists 16 screens. If we try to block Build 12's ship on rebuilding all 16 screens + the physics-based Team Rolodex + Pinned collapsing score + Waivers + Ledger on both iOS and Android, Build 12 will slip by weeks.

* **How to push §10 forward:** Split §10 into two explicit delivery waves:
  * **Wave 1 (Build 12 Ship Gate):** Lock the Foundation tokens/primitives (`OmenColor`, `OmenTypography`, `Brass Lip`, `Player Row`, `Omen Read Block`) and ship the **Trade screens** (`Trade chooser`, `Trade builder`, `Trade verdict`, `Find a trade`), `Player`, `Omen call`, and `Desk` (with current carousel or initial Rolodex), plus `Support` email report.
  * **Wave 2 (Build 13 / Full Surface Sweep):** Pinned collapsing score bar, `Waivers` rework, `Ledger` receipt stack, and `Welcome / Connect` visual refresh.

---

## 8. Drop-In Amendments for `Blueprints/specs/design/omen-design-foundation-v1.md`

Here is exact text Claude can fold into `omen-design-foundation-v1.md` to close every gap above:

### Add to §3 (Navigation model)

```markdown
| Route parent map | `Trade` tab root is **Trade chooser**, which pushes **Trade builder** or **Find a trade**. **Waivers** is pushed from `Desk` (when a waiver add is the week's call) and from `League`. **Ledger** is pushed from `Desk` and `Omen call`, and pushes **Ledger receipt**. **Account** is opened from the `Desk` top-right avatar and pushes **Support**. |
| Cross-tab team context | While the full **Team Rolodex** lives on `Desk`, the root of `Omen`, `Trade`, and `League` shows a compact **Team context pill** (`Provider · Team name ▾`) in the top bar that names the active front card and opens the **Team switcher** sheet on tap. Long-pressing the `Desk` tab also opens the switcher sheet. |
| Platform back control | **iOS:** Chevron plus parent screen name in `OmenColor.accent`, 44pt (`< Desk`), plus left-edge swipe. **Android:** Material 3 48dp back arrow in the top bar plus system predictive back (`BackHandler`) from either screen edge. |
| Header chrome cleanup | Supersedes the 2026-09-18 dual-icon header (`E017`) and removes the floating `OmenReportPill` from the `Desk` root. Help and Support live inside `Account` (with a quiet "Report this call" link at the bottom of `Omen call` and `Verdict sheet`). |
```

### Update §5 (Visual rules — Colour & Type)

```markdown
- **Colour (semantic tokens, never raw hexes).** Warm dark ground `OmenColor.bg` (`#1F1F1D` dark / `#F1EDE4` light). Brass `OmenColor.accent` (`#C4933B` dark / `#7A5C1E` light for WCAG AA contrast) is the primary action and selection accent ("Omen's pick / act here"). Green is used only as text for a need or a gain ("Needs WR", "+4.2 pts") using contrast-safe `OmenColor.omenChip` (`#4FAE81` dark / `#1A5C3E` light), never as a card or pill fill. The **Omen grade ring** uses a brass (`OmenColor.accent`) stroke over a `borderSubtle` track.
- **Type roles (`OmenTypography`).** Wix Madefor Display (`wght` 700–800) for titles and numbers; Wix Madefor Text (`wght` 400–700) for everything else. Numbers use `tabularNumbers = true` (`tnum`).
  - `heroNumber`: 44pt/sp Display ExtraBold (800), tabular
  - `screenTitle`: 30pt/sp Display ExtraBold (800)
  - `sectionHeader`: 18pt/sp Display Bold (700), sentence case (never uppercase micro-labels)
  - `body`: 15pt/sp Text Regular (400)
  - `quiet`: 12–13pt/sp Text Regular/Medium (400–500)
```
