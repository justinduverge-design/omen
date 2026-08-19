import XCTest

/// O7 — accessibility evidence for the forced-update gate screen.
///
/// Follows the pattern M6 established in `ContextualHelpAccessibilityUITests`: the simulator
/// cannot run VoiceOver, so `performAccessibilityAudit()` is the nearest executable equivalent.
/// It walks the same accessibility tree VoiceOver would and reports unlabeled elements,
/// contrast failures, hit regions below the minimum target, and text clipped under large
/// Dynamic Type. It is **not** a substitute for a human VoiceOver pass — it cannot judge
/// whether an announcement is useful, only that one exists and is well-formed.
///
/// This screen matters more than most: a blocked user cannot navigate past it, so if it is
/// unreadable or unusable there is no other route through the app.
final class ForcedUpdateAccessibilityUITests: XCTestCase {

    override func setUp() {
        continueAfterFailure = false
    }

    /// `.dynamicType` is excluded for the same app-wide reason M6 documented: `OmenTypography`
    /// builds every role as `Font(UIFontMetrics.scaledFont(for:))`, which resolves a point size
    /// at construction rather than vending a text-style-relative font, so the audit cannot see
    /// the roles as scalable on **any** screen. Excluding it keeps every other category
    /// (contrast, element description, hit region, clipped text, trait) genuinely enforced
    /// rather than the whole audit being written off. See `Direction/known_issues.md`.
    private static let auditedCategories: XCUIAccessibilityAuditType =
        XCUIAccessibilityAuditType.all.subtracting(.dynamicType)

    private func launch(_ scenario: String = "forced-update.blocked", dynamicType: String? = nil) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-OMEN_SCREENSHOT_SCENARIO", scenario]
        if let dynamicType {
            app.launchArguments += ["-UIPreferredContentSizeCategoryName", dynamicType]
        }
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "\(scenario) did not reach the foreground")
        return app
    }

    func testForcedUpdateScreenPassesTheAccessibilityAudit() throws {
        let app = launch()
        try app.performAccessibilityAudit(for: Self.auditedCategories)
    }

    /// The blocking copy interpolates a version number, so it is the variable-length string on
    /// this screen and the one most likely to clip once the text is scaled up.
    func testForcedUpdateScreenPassesTheAuditAtTheLargestDynamicType() throws {
        let app = launch(dynamicType: "UICTContentSizeCategoryAccessibilityExtraExtraExtraLarge")
        try app.performAccessibilityAudit(for: Self.auditedCategories)
    }

    /// The way out has to be reachable by name. A blocked user has no other route through the
    /// app, so an unlabeled or missing update control is a dead end rather than an annoyance.
    func testUpdateControlIsReachableAndLabeled() {
        let app = launch()
        let updateButton = app.buttons["Update now"]
        XCTAssertTrue(updateButton.waitForExistence(timeout: 10), "The update control must be exposed to assistive technology by name")
        XCTAssertTrue(updateButton.isHittable, "The update control must be hittable, not merely present in the tree")
    }

    /// Pins the app-wide `OmenTypography` finding on *this* screen rather than asserting it by
    /// analogy with M6's. The unfiltered audit is expected to fail here for that one reason —
    /// and, unlike the Command Center, **not** for contrast: the filtered audit above includes
    /// `.contrast` and passes, so this screen's colour pairings are genuinely sound.
    ///
    /// Recorded as expected rather than skipped, so this test fails loudly the day
    /// `OmenTypography` starts vending text-style-relative fonts and can then be retired.
    func testUnfilteredAuditRecordsOnlyTheAppWideDynamicTypeFinding() throws {
        XCTExpectFailure("App-wide OmenTypography Dynamic Type audit finding; not in O7 scope — see Direction/known_issues.md")
        let app = launch()
        try app.performAccessibilityAudit()
    }

    /// The screen must state *why* the user is blocked and *what* clears it. An honest prompt
    /// is a `Done when:` requirement, not a copy preference.
    func testBlockingCopyNamesTheReasonAndTheRequiredVersion() {
        let app = launch()
        XCTAssertTrue(app.staticTexts["Update required"].waitForExistence(timeout: 10))
        let explanation = app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "1.2.0")).firstMatch
        XCTAssertTrue(explanation.waitForExistence(timeout: 10), "The prompt must name the version that clears the block")
    }

    // MARK: - The state that ships today: no store listing yet

    /// With no `storeURL` the button must not be drawn at all. A control that silently does
    /// nothing is worse than none here, because this screen blocks the whole shell — the user
    /// has no other route through the app to discover it was a dead end.
    func testNoUpdateButtonIsDrawnWhenThereIsNoStoreListing() {
        let app = launch("forced-update.no-store-link")
        XCTAssertTrue(app.staticTexts["Update required"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Update now"].exists, "A button with nowhere to go must not be rendered")
        XCTAssertTrue(
            app.staticTexts["Update Omen from the App Store to continue."].exists,
            "The screen must still say how to resolve the block when it cannot link out"
        )
    }

    func testNoStoreLinkStatePassesTheAccessibilityAudit() throws {
        let app = launch("forced-update.no-store-link")
        try app.performAccessibilityAudit(for: Self.auditedCategories)
    }
}
