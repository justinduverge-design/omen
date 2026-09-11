import SwiftUI
import XCTest
@testable import Omen

/// Layout assertions that do NOT go through XCUITest.
///
/// The first attempt at an iOS clipping gate used XCUITest frames and was worthless: it stayed
/// green with the carousel pager pinned back to its old fixed 270. XCUITest reports one frame
/// per element, already intersected with the window, so containment cannot tell "laid out
/// correctly" from "clipped by an ancestor".
///
/// `UIHostingController.sizeThatFits(in:)` supplies the missing second measurement — a view's
/// INTRINSIC height, independent of any frame a parent is imposing. That is the iOS equivalent
/// of Compose's unclipped bounds, and it is a unit test rather than a UI test, so it costs
/// seconds instead of minutes.
@MainActor
final class MatchupHeroIntrinsicHeightTests: XCTestCase {

    private let phoneWidth: CGFloat = 360

    /// - Parameter textSize: applied through `traitOverrides`, NOT through SwiftUI's
    ///   `.environment(\.dynamicTypeSize)`. A `UIHostingController` measures against its own
    ///   trait collection, so the environment modifier is ignored here — the first version of
    ///   this file used it and measured an identical 270.0 for both text sizes, which is to
    ///   say it compared the same render twice and would have passed whatever the layout did.
    private func intrinsicHeight<V: View>(
        of view: V,
        width: CGFloat,
        textSize: UIContentSizeCategory = .large
    ) -> CGFloat {
        let host = UIHostingController(rootView: view)
        host.view.backgroundColor = .clear
        host.traitOverrides.preferredContentSizeCategory = textSize
        host.view.setNeedsLayout()
        host.view.layoutIfNeeded()
        return host.sizeThatFits(
            in: CGSize(width: width, height: .greatestFiniteMagnitude)
        ).height
    }

    private func team(_ name: String, _ record: String, _ score: String, _ proj: String?) -> OmenMatchupTeam {
        OmenMatchupTeam(name: name, record: record, scoreText: score, projectedText: proj)
    }

    private var hostileSignal: String { CarouselFixtures.hostileSignal }

    private func hero(signal: String?) -> OmenMatchupHero {
        OmenMatchupHero(
            state: .live(
                selectedTeam: team("Justin's Absolutely Enormous Fantasy Team Name", "6-1", "64.8", "119.6"),
                opponent: team("G.O.A.T. SQUAD (Championship Or Bust Edition)", "5-2", "58.1", "114.2"),
                projectedFinish: nil,
                whatToWatch: signal
            )
        )
    }

    /// The card must be TALLER when it carries three lines of signal than when it carries none.
    ///
    /// This is the assertion that catches a fixed height swallowing content. While the card was
    /// floored at 220pt by a greedy `GeometryReader`, both of these measured the same — the
    /// signal was absorbed into space the card was reserving anyway, and on a real account the
    /// text that did not fit was simply cut.
    func testACardWithASignalIsTallerThanOneWithout() {
        let withSignal = intrinsicHeight(of: hero(signal: hostileSignal), width: phoneWidth)
        let without = intrinsicHeight(of: hero(signal: nil), width: phoneWidth)

        XCTAssertGreaterThan(
            withSignal, without,
            """
            The matchup card does not grow for its 'what to watch' signal.
              with a three-line signal: \(withSignal)
              with none:                \(without)
            Equal heights mean a fixed height is absorbing the content instead of the content
            setting the height — the signal is being clipped, not laid out.
            """
        )
    }

    /// The card's height must TRACK the length of its signal.
    ///
    /// Relative, not a magic number. An absolute threshold was tried first and was simply a
    /// worse version of this: a one-line card measures ~239pt when content drives it and
    /// ~268pt when a 220pt floor pads it, so any fixed cutoff either sits between two numbers
    /// that will move the next time the type scale is touched, or fails to separate them at
    /// all. The difference between a one-line and a three-line card does separate them, and
    /// stays true whatever the absolute sizes become:
    ///
    ///   content-driven: ~239 vs ~270 — a real gap
    ///   floored at 220: ~268 vs ~270 — nearly identical, because the floor is absorbing the
    ///                   short card and the long one is only just clearing it
    ///
    /// Note the short *signal* rather than no signal. A card with no `whatToWatch` renders
    /// through a branch that never had a floor, so it cannot detect one — an earlier version
    /// of this test used one and passed happily with the floor restored.
    func testTheCardHeightTracksItsSignalLength() {
        let oneLine = intrinsicHeight(of: hero(signal: "Close game."), width: phoneWidth)
        let threeLines = intrinsicHeight(of: hero(signal: hostileSignal), width: phoneWidth)
        let grew = threeLines - oneLine

        XCTAssertGreaterThan(
            grew, 20,
            """
            The matchup card barely grows for two extra lines of signal.
              one-line signal:   \(oneLine)
              three-line signal: \(threeLines)
              difference:        \(grew)
            A card whose height hardly moves with its content has a fixed floor absorbing the
            difference — the greedy `GeometryReader` with its 220pt `minHeight` is back, and
            the text that does not fit is being clipped rather than laid out.
            """
        )
    }

    // Dynamic Type is deliberately NOT tested here, and the reason is a finding worth
    // keeping. `OmenTypeRoleSpec.font` scales through
    // `UIFontMetrics(forTextStyle:).scaledFont(for:)` with no trait collection, so it resolves
    // against the APP-WIDE content size category rather than the view's. A
    // `UIHostingController` trait override therefore does not reach it: both an ordinary and an
    // accessibility text size measured an identical 270.0 here, which is the same render twice.
    //
    // Real users are unaffected — the app-wide category IS their setting — so this is not a
    // shipped bug, but it does mean per-view text size cannot be driven in-process. Dynamic
    // Type reflow is covered in `CarouselLayoutUITests`, where the
    // `-UIPreferredContentSizeCategoryName` launch argument sets it app-wide and does apply.
    //
    // Making it testable in-process would mean moving the type roles onto
    // `@Environment(\.dynamicTypeSize)` / `ScaledMetric` — a design-system change, not a test fix.
}
