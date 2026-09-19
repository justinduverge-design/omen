import SwiftUI

/// The chrome every destination shares: the E017 header slot and the E005–E012 switcher bar's
/// binding.
///
/// ## Why this is its own file
///
/// J3 built both of these **inside** `OmenFirstCallScreens.swift` — the header controls as a
/// `private struct`, and the switcher-bar context as a type named for that one journey. That was
/// the right size for one journey and the wrong size for six: J2, J4, J5 and J6 all carry the
/// same two pieces of chrome, and three agents independently reinventing them is the expensive
/// failure mode this repo has already paid for elsewhere.
///
/// So the two are promoted here, once, and J3's file now consumes them. Nothing about either
/// changed in the move — this is a relocation, not a redesign.
///
/// ## What is deliberately NOT here
///
/// The tab shell. `CommandCenterView` already owns the four permanent tabs and
/// `ScreenshotScenarios`' `FauxShell` already mirrors it; a third definition would be the exact
/// duplication this file exists to prevent.

/// E017's slot, resolved by the founder on 2026-09-18 as **both** controls rather than one.
///
/// The artboards draw a single 30x30 account avatar in this slot on 25 of the 30 screens, and
/// `M6-ContextualHelp` shipped a help button into the same place. Rather than delete a shipped
/// affordance to match a picture, or leave Account unreachable to keep it, both sit here in
/// Command Center's order — **help, then account**.
///
/// The order is not arbitrary and it is not cosmetic. Account is the destructive one: it holds
/// export, disconnect and delete. Putting the harmless control under the thumb's first stop is
/// the same reasoning that puts Cancel before Delete.
///
/// The extra width against the artboard is **recorded drift**, carried forward from J3. On
/// `CommandCenter` it is more than drift — that artboard draws neither control, and the reason
/// it must gain them is written at `OmenCommandDeskScreen.header`.
struct OmenScreenHeaderControls: View {
    let topic: OmenHelpTopic
    /// Absent when the caller has nowhere to send the user. An avatar that opens nothing is a
    /// lie about what the header can do — the same rule `OmenLeagueSwitcherBar` applies to its
    /// own chevron.
    var onOpenAccount: (() -> Void)?

    var body: some View {
        HStack(spacing: OmenSpacing.step8) {
            OmenContextualHelpButton(topic: topic)
            if let onOpenAccount {
                OmenIconButton(
                    contentDescription: "Account and profile",
                    icon: Image(systemName: "person.crop.circle"),
                    action: onOpenAccount,
                    tone: .neutral
                )
            }
        }
    }
}

/// The league context a screen renders in its switcher bar (E005–E012).
///
/// Passed in rather than read on-screen: these screens are handed a decision or a week, and the
/// context it was made in belongs to the caller that fetched it. A screen that resolved its own
/// league could disagree with the call it is displaying.
///
/// Named `OmenScreenContext` rather than J3's `OmenFirstCallContext` because it is now on five
/// Command Center screens as well as three Omen ones. The old name survives as a typealias so
/// J3's call sites and fixtures did not have to be rewritten to gain a journey.
struct OmenScreenContext {
    let crest: String
    let teamName: String
    let platform: OmenPlatform
    var leagueName: String?
    var onSwitch: (() -> Void)?
    var onAddLeague: (() -> Void)?

    @ViewBuilder var bar: some View {
        OmenLeagueSwitcherBar(
            crest: crest,
            teamName: teamName,
            platform: platform,
            leagueName: leagueName,
            onSwitch: onSwitch,
            onAddLeague: onAddLeague
        )
    }
}

/// J3's name for the above. Kept so the rename cost nothing at the call sites.
typealias OmenFirstCallContext = OmenScreenContext

/// `.sh`'s trailing link — "League \u{203A}", "See all \u{203A}".
///
/// A primitive rather than a `Button` inline in the screen, for the reason
/// `PrimitiveEnforcementTests` gives: `App/` composes `Omen*` primitives and `DesignSystem/` is
/// the layer allowed to touch raw SwiftUI. Every J2 section header uses it and J5's scout's-nest
/// order is five more of them.
///
/// The artboard draws a 12pt link with no padding. `V-CanvasConformance` requires the target to
/// reach 44pt **without growing the glyph**, so the frame grows and the type does not — the same
/// trade `OmenLeagueSwitcherBar` makes for its `+`.
struct OmenSectionLink: View {
    let title: String
    /// Named so VoiceOver hears "See all, The Ledger" rather than five identical "See all"s.
    let section: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step2) {
                Text(title)
                Text("\u{203A}")
            }
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.accent)
            .frame(minWidth: OmenLayout.minTouchTarget, minHeight: OmenLayout.minTouchTarget, alignment: .trailing)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(title), \(section)")
    }
}

// MARK: - D11, measured

private struct OmenFitContentHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

private struct OmenFitViewportHeightKey: PreferenceKey {
    static var defaultValue: CGFloat = 0
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) {
        value = max(value, nextValue())
    }
}

/// Publishes a screen's content and viewport heights as an accessibility value, so D11 can be
/// **measured in points rather than eyeballed from a screenshot**.
///
/// `screen-journeys-v1.md` requires the overflow of any screen whose contract declares a fit to
/// be "stated in px", and `README.md` in the canvas folder is blunter: *"'Fits' is a requirement,
/// not an observation and it is measured, not eyeballed."* Until now the only way to honour that
/// on a built screen was J3's method — read two frames off a running simulator by hand and
/// subtract. That worked once and is not a check.
///
/// This is deliberately not a `#if DEBUG` probe. A measurement that only exists in a
/// configuration nobody ships is a measurement of a different binary, and the existing Command
/// Center already measures exactly these two numbers in release to decide `scrollDisabled`. The
/// cost here is one zero-sized, screen-reader-hidden element.
///
/// Positive overflow means content taller than the space it was given — the screen does not fit.
struct OmenFitProbe: ViewModifier {
    let identifier: String
    @State private var contentHeight: CGFloat = 0
    @State private var viewportHeight: CGFloat = 0

    func body(content: Content) -> some View {
        content
            .background(
                GeometryReader { proxy in
                    Color.clear.preference(key: OmenFitContentHeightKey.self, value: proxy.size.height)
                }
            )
            .onPreferenceChange(OmenFitContentHeightKey.self) { contentHeight = $0 }
            .onPreferenceChange(OmenFitViewportHeightKey.self) { viewportHeight = $0 }
            .overlay(alignment: .topLeading) {
                // 1x1 rather than zero-sized: a zero-area view is dropped from the accessibility
                // tree entirely, so the first version of this published a measurement that
                // XCUITest could never find — the probe reported nothing and the test failed
                // saying so, which is at least the right failure.
                //
                // `accessibilityElement()` is what makes it an element at all; without it a bare
                // `Color` carries an identifier that addresses nothing. It is invisible and
                // unlabelled, so VoiceOver has nothing to announce.
                Color.clear
                    .frame(width: 1, height: 1)
                    .accessibilityElement()
                    .accessibilityIdentifier(identifier)
                    .accessibilityValue("content=\(Int(contentHeight.rounded())) viewport=\(Int(viewportHeight.rounded()))")
            }
    }
}

extension View {
    /// Records the height this view was given, for the probe above to compare against content.
    func omenFitViewport() -> some View {
        background(
            GeometryReader { proxy in
                Color.clear.preference(key: OmenFitViewportHeightKey.self, value: proxy.size.height)
            }
        )
    }

    /// Measures this screen for D11 and publishes the numbers under `identifier`.
    func omenFitProbe(_ identifier: String) -> some View {
        modifier(OmenFitProbe(identifier: identifier))
    }
}
