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
/// cost here is one 1x1, unlabelled element.
///
/// Positive overflow means content taller than the space it was given — the screen does not fit.
///
/// ## It reports overflow, not headroom
///
/// Every screen carrying this probe ends its stack with a `Spacer`, so a stack with room to
/// spare expands to exactly fill its proposal and reports `content == viewport`. A fitting
/// screen therefore always measures 0, never a negative number, and this probe cannot tell you
/// how much slack a screen has left. That is the number D11 actually asks for — "does it fit,
/// and by how much does it miss" — and reading a 0 as "exactly full" would be wrong.
///
/// ## The two measurements are taken at different levels, and that is the whole point
///
/// The first version of this applied `omenFitViewport()` and `omenFitProbe()` one after the
/// other at the *same* level, so both keys measured the same view and the overflow was
/// structurally always zero — a probe that could not fail is not a measurement. The pairing is
/// now asymmetric and the call site cannot get it wrong by accident:
///
/// - ``SwiftUI/View/omenFitContent()`` goes on the **stack**, above the flexible frame, where
///   the view is still free to be as tall as its children need;
/// - ``SwiftUI/View/omenFitViewport()`` goes on the **framed** result, which is exactly the
///   space the screen was granted;
/// - ``SwiftUI/View/omenFitProbe(_:)`` goes outermost and reads both.
///
/// Both travel as preferences, so the probe collects them wherever inside it they were taken.
struct OmenFitProbe: ViewModifier {
    let identifier: String
    @State private var contentHeight: CGFloat = 0

    func body(content: Content) -> some View {
        GeometryReader { proxy in
            content
                .onPreferenceChange(OmenFitContentHeightKey.self) { contentHeight = $0 }
                .overlay(alignment: .topLeading) {
                    // 1x1 rather than zero-sized: a zero-area view is dropped from the
                    // accessibility tree entirely, so the first version of this published a
                    // measurement that XCUITest could never find — the probe reported nothing and
                    // the test failed saying so, which is at least the right failure.
                    //
                    // `accessibilityElement()` is what makes it an element at all; without it a
                    // bare `Color` carries an identifier that addresses nothing. It is invisible
                    // and unlabelled, so VoiceOver has nothing to announce.
                    Color.clear
                        .frame(width: 1, height: 1)
                        .accessibilityElement()
                        .accessibilityIdentifier(identifier)
                        .accessibilityValue(
                            "content=\(Int(contentHeight.rounded())) viewport=\(Int(proxy.size.height.rounded()))"
                        )
                }
        }
    }

    // `proxy.size.height` is the height proposed to this `GeometryReader`, and a
    // `GeometryReader` always accepts its proposal — it does not grow with its child. That
    // property is the entire reason the viewport is taken here rather than from a `.background`
    // on the framed screen, which was the first attempt: a flexible `.frame(maxHeight: .infinity)`
    // reports *at least* its child's height, so when content overflowed the "viewport" grew with
    // it and a deliberately injected 137pt came back as 13pt of overflow. A measurement that
    // moves with the thing it is measured against is not a measurement.
    //
    // It is deliberately NOT reduced by `proxy.safeAreaInsets`. The second attempt subtracted
    // them and produced a flat 80pt of "overflow" on all five screens at once — a number
    // identical across screens of visibly different length, which is the signature of an
    // instrument fault rather than a layout one. On an iPhone 16 the reader measures 710pt with
    // insets of 59 top and 83 bottom, and 59 + 710 + 83 is the whole 852pt screen: the reader is
    // already inside the safe area, so subtracting the insets charges the screen twice for the
    // status bar and the tab bar.
    //
    // What that leaves is a placement requirement, which is why `omenFitProbe` must be applied
    // **above** `safeAreaInset(edge: .top)` rather than below it. A reader outside the inset
    // measures 710 while the stack inside it is proposed 648 — the 62pt the switcher bar is
    // standing in — and the screen is credited with a band of room the bar occupies.
}

extension View {
    /// Measures this view's **natural** height — apply above the flexible frame, on the stack
    /// itself, while it is still free to report more than it was offered.
    func omenFitContent() -> some View {
        background(
            GeometryReader { proxy in
                Color.clear.preference(key: OmenFitContentHeightKey.self, value: proxy.size.height)
            }
        )
    }

    /// Measures this screen for D11 and publishes the numbers under `identifier`.
    ///
    /// Apply it directly above `safeAreaInset(edge: .top)`, so the reader is proposed the same
    /// height the content stack is, and put any screen-level `accessibilityIdentifier` on the
    /// stack *inside* it. An identifier applied over the probe propagates down and renames the
    /// marker to the screen, leaving the measurement unaddressable — which is the other half of
    /// what "published no fit measurement" meant.
    func omenFitProbe(_ identifier: String) -> some View {
        modifier(OmenFitProbe(identifier: identifier))
    }
}
