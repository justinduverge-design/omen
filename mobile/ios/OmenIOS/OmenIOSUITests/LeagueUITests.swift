import XCTest

/// League and Waivers on the foundation (frames: Main League, Waivers).
final class LeagueUITests: XCTestCase {
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

    func testLeagueShowsWhereYouStandWhoNeedsWhatAndTheWire() {
        let app = launch("league.root")
        XCTAssertTrue(app.staticTexts["3rd, one game back of first"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Who needs what you have"].exists)
        assertHittable(app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Gibbs me some Rice")).firstMatch, "trade target")
        assertHittable(app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Add Tyjae Spears")).firstMatch, "waiver move")
    }

    func testWaiversHandsTheClaimOverAndNeverPrintsOddsOrAZeroBid() {
        let app = launch("waivers.move")
        XCTAssertTrue(app.staticTexts["Add Tyjae Spears. Drop Roschon Johnson."].waitForExistence(timeout: 10))
        assertHittable(app.buttons["Make this claim in ESPN"], "hand-off")
        XCTAssertFalse(app.staticTexts.containing(NSPredicate(format: "label CONTAINS %@", "%")).allElementsBoundByIndex.contains { $0.label.contains("chance") })
        XCTAssertFalse(app.staticTexts["Bid $0"].exists)
    }

    func testNothingWorthDoingIsSaidNotBlank() {
        let app = launch("journey-j5.nominal.03-waiver-no-move")
        XCTAssertTrue(app.staticTexts["Nothing on the wire beats your bench"].waitForExistence(timeout: 10))
        XCTAssertFalse(app.buttons["Make this claim in ESPN"].exists, "no hand-off without a move")
    }

    func testLeagueScreensPassTheAccessibilityAudit() throws {
        for scenario in ["league.root", "journey-j5.degraded.01-league-degraded", "waivers.move", "journey-j5.nominal.03-waiver-no-move"] {
            let app = launch(scenario)
            try app.performAccessibilityAudit(for: [.dynamicType, .sufficientElementDescription, .hitRegion, .contrast]) { issue in
                print("AUDIT \(scenario): \(issue.auditType.rawValue) \(issue.compactDescription) :: \(issue.element?.debugDescription.prefix(200) ?? "nil")")
                return issue.auditType == .dynamicType && issue.compactDescription.contains("partially unsupported")
            }
            app.terminate()
        }
    }
}
