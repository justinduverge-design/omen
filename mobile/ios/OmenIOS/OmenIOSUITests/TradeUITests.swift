import XCTest

/// Trade on the foundation (frames: TradeChooser, Main builder, Sheets verdict, TradeShare).
final class TradeUITests: XCTestCase {
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    private func launch(_ scenario: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-OMEN_SCREENSHOT_SCENARIO", scenario]
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "\(scenario) did not reach the foreground")
        return app
    }

    private func assertHittable(_ element: XCUIElement, _ label: String) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), "\(label) is missing")
        var swipes = 0
        while !element.isHittable && swipes < 4 { XCUIApplication().swipeUp(); swipes += 1 }
        XCTAssertTrue(element.isHittable, "\(label) cannot be tapped")
        XCTAssertGreaterThanOrEqual(element.frame.height, 43.5, "\(label) is under 44pt tall")
    }

    func testTheChooserOffersFindBuildAndJudge() {
        let app = launch("trade.chooser")
        XCTAssertTrue(app.staticTexts["Trades that help both of you"].waitForExistence(timeout: 10))
        assertHittable(app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Build a trade")).firstMatch, "build")
        assertHittable(app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Judge an offer")).firstMatch, "judge")
    }

    func testTheBuilderPicksFromYourRosterAndOpensPlayersSeparately() {
        let app = launch("trade.builder")
        XCTAssertTrue(app.staticTexts["Build a trade"].waitForExistence(timeout: 10))
        assertHittable(app.buttons["Remove DeVonta Smith"], "tray token")
        assertHittable(app.buttons["Puka Nacua details"], "separate player info control")
        assertHittable(app.buttons["Judge this trade"], "judge")
    }

    func testTheVerdictHandsOverAndNeverSends() {
        let app = launch("journey-j4.nominal.03-trade-verdict")
        assertHittable(app.buttons["Open in ESPN"], "hand-off")
        assertHittable(app.buttons["Adjust"], "adjust")
        XCTAssertFalse(app.buttons["Send"].exists)
        XCTAssertFalse(app.staticTexts["How to send this"].exists)
    }

    func testTradeScreensPassTheAccessibilityAudit() throws {
        for scenario in ["trade.chooser", "trade.find-review", "trade.find-unavailable", "trade.empty", "trade.builder", "trade.builder-theirs", "journey-j4.nominal.03-trade-verdict", "journey-j4.nominal.04-trade-share"] {
            let app = launch(scenario)
            try app.performAccessibilityAudit(for: [.dynamicType, .sufficientElementDescription, .hitRegion, .contrast]) { issue in
                print("AUDIT \(scenario): \(issue.auditType.rawValue) \(issue.compactDescription) :: \(issue.element?.debugDescription.prefix(200) ?? "nil")")
                return issue.auditType == .dynamicType && issue.compactDescription.contains("partially unsupported")
            }
            app.terminate()
        }
    }

    func testFindOpensTheSwapInTheBuilder() {
        let app = launch("trade.find-review")
        XCTAssertTrue(app.staticTexts["Trades that help you both"].waitForExistence(timeout: 10))
        assertHittable(app.buttons["Open in builder"], "open in builder")
        assertHittable(app.buttons["Next trade"], "next")
        XCTAssertFalse(app.buttons["Send"].exists)
    }

    func testJudgeAnOfferSearchesAndJudges() {
        let app = launch("trade.empty")
        XCTAssertTrue(app.staticTexts["Someone sent you an offer?"].waitForExistence(timeout: 10))
        assertHittable(app.buttons["Add Rashee Rice to they offer"], "add result")
        assertHittable(app.buttons["Judge this offer"], "judge")
    }
}
