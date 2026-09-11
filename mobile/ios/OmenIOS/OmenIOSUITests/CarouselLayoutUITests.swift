import XCTest

/// Layout assertions for the `carousel != nil` branch — the one a real multi-league account
/// runs, and the one no test reached until now.
///
/// Swift twin of `OmenLeagueCarouselLayoutTest.kt`, but the mechanism differs and it is worth
/// knowing why. Compose reports two rectangles per node — where a node would be, and where it
/// is allowed to paint — so clipping is a direct comparison. XCUITest reports one frame, and
/// an element clipped by an ancestor simply reports a frame that leaves its container or
/// stops being hittable. So the iOS equivalent is containment: an element that belongs on
/// screen must actually lie inside the window, and must be reachable.
///
/// The bug this exists to catch: the carousel pager was pinned to a hard 270pt, so on a real
/// account the page header overflowed and the platform badge was sliced in half by the row
/// above it. That shipped, and a human found it.
final class CarouselLayoutUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    private func launch(_ scenario: String, dynamicType: String? = nil) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-OMEN_SCREENSHOT_SCENARIO", scenario]
        if let dynamicType {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", dynamicType]
        }
        app.launch()
        XCTAssertTrue(
            app.wait(for: .runningForeground, timeout: 30),
            "\(scenario) did not reach the foreground"
        )
        return app
    }

    /// Fails when an element is not fully inside the window.
    ///
    /// `.isHittable` is checked too, and deliberately: an element can report a frame that sits
    /// inside the window while an ancestor with a fixed height clips it out of the render,
    /// and hittability is what catches that case.
    private func assertFullyOnScreen(
        _ element: XCUIElement,
        _ what: String,
        in app: XCUIApplication,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        XCTAssertTrue(
            element.waitForExistence(timeout: 15),
            "\(what) never appeared — the fixture did not load.",
            file: file, line: line
        )
        let window = app.windows.firstMatch.frame
        let frame = element.frame

        XCTAssertTrue(
            window.contains(frame),
            """
            \(what) is not fully on screen.
              element: \(frame)
              window:  \(window)
            A fixed height an ancestor cannot grow past is the usual cause.
            """,
            file: file, line: line
        )
        XCTAssertTrue(
            element.isHittable,
            "\(what) is on screen but not hittable — something is covering or clipping it.",
            file: file, line: line
        )
    }

    func testThePageHeaderIsNotClippedByThePager() {
        let app = launch("command-center.carousel")
        // The team name sits in the page header, directly under the "Matchup / 1 of 6" row.
        // This is the node that got sliced.
        assertFullyOnScreen(
            app.staticTexts["Dat Sauce Inc."],
            "The carousel page header",
            in: app
        )
    }

    /// The matchup card, found by the content of its accessibility label.
    ///
    /// Why not query the "WHAT TO WATCH" text directly, the way the Android twin does:
    /// `OmenMatchupHero` applies `.accessibilityLabel` to the whole card, which makes the card
    /// a single accessibility element and removes its children from the tree. The label is
    /// therefore not addressable, and a test that looked for it would fail for a reason that
    /// has nothing to do with layout. This is the same merged-element trap that made the first
    /// Android version of this suite pass against a known bug — the same mistake, a different
    /// symptom, so it is worth naming on both sides.
    ///
    /// The consequence is that the iOS gate is COARSER than the Compose one: it proves the
    /// card as a whole stays inside the window, not that a particular line inside it survived.
    /// Compose can compare a node's clipped and unclipped bounds; XCUITest cannot.
    private func matchupCard(in app: XCUIApplication) -> XCUIElement {
        app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS %@", "Absolutely Enormous"))
            .firstMatch
    }

    func testTheMatchupCardIsNotClippedByThePager() {
        let app = launch("command-center.carousel")
        assertFullyOnScreen(matchupCard(in: app), "The matchup card", in: app)
    }

    func testTheCardSurvivesALargeAccessibilityTextSize() {
        // Registry §4: "all type roles scale; layouts reflow, no clipped text." This is also
        // the condition that actually reproduces the founder's clipping — at the default text
        // size the fixture can fit inside the old fixed height, so a suite that only ran at
        // the default size would pass against the broken code. The Android twin learned this
        // the hard way.
        let app = launch(
            "command-center.carousel",
            dynamicType: "UICTContentSizeCategoryAccessibilityL"
        )
        assertFullyOnScreen(
            matchupCard(in: app),
            "The matchup card at accessibility text size",
            in: app
        )
    }

    func testOneProviderFailingDoesNotBlankTheLeaguesThatAnswered() {
        // ESPN holds four of the six leagues and is the provider that fails here, so if the
        // scoped-failure rule regressed the carousel would be mostly dead while Sleeper and
        // Yahoo were perfectly readable.
        let app = launch("command-center.carousel-provider-down")
        let failure = app.staticTexts["This league didn't load"]
        XCTAssertTrue(
            failure.waitForExistence(timeout: 15),
            "The per-page failure surface never appeared — a failing provider should say so on its own page."
        )
        assertFullyOnScreen(failure, "The scoped per-page failure surface", in: app)
    }
}
