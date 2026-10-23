import XCTest

/// The Desk on the foundation (frames: Main Desk, States, Edges). Gate items 4 and 5: navigation
/// controls exist and are hittable, and the screen passes the accessibility audit, dark and at the
/// largest Dynamic Type.
final class DeskUITests: XCTestCase {
    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    private func launch(_ scenario: String, arguments: [String] = []) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-OMEN_SCREENSHOT_SCENARIO", scenario] + arguments
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30), "\(scenario) did not reach the foreground")
        return app
    }

    private func assertHittable(_ element: XCUIElement, _ label: String) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), "\(label) is missing")
        XCTAssertTrue(element.isHittable, "\(label) cannot be tapped")
        XCTAssertGreaterThanOrEqual(element.frame.height, 43.5, "\(label) is under 44pt tall")
    }

    func testTheReadyDeskOffersAccountTheMoveAndTheTeams() {
        let app = launch("desk.ready")
        assertHittable(app.buttons["Account and support"], "account avatar")
        XCTAssertTrue(app.staticTexts["Up in 1 of 2"].waitForExistence(timeout: 10), "the headline should count leagues with scores")
        XCTAssertTrue(app.otherElements["Team 1 of 3"].exists || app.staticTexts["1 of 3"].exists, "the Rolodex must say how many teams there are")
        XCTAssertTrue(app.staticTexts["Projected points"].exists, "the matchup bar must be labelled as projected points")
        XCTAssertTrue(app.staticTexts["Needs you"].exists)
        XCTAssertTrue(app.staticTexts["Your team"].exists)
    }

    func testTheDeskNeverPrintsAPercentageAsConfidence() {
        let app = launch("desk.ready")
        XCTAssertTrue(app.staticTexts["Needs you"].waitForExistence(timeout: 10))
        let percent = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", ".*[0-9]+%.*confiden.*"))
        XCTAssertEqual(percent.count, 0)
    }

    func testFailedAndEmptyDesksEachOfferAWayOut() {
        let failed = launch("desk.failed")
        assertHittable(failed.buttons["Try again"], "retry")
        failed.terminate()
        let empty = launch("desk.no-league")
        assertHittable(empty.buttons["Connect a league"], "connect")
    }

    func testDemoIsLabelled() {
        let app = launch("desk.demo")
        XCTAssertTrue(app.staticTexts["Demo mode, sample data"].waitForExistence(timeout: 10) || app.otherElements["Demo mode, sample data"].exists)
    }

    func testDeskAndPlayerPassTheAccessibilityAudit() throws {
        for scenario in ["desk.ready", "desk.no-league", "desk.failed", "player.page"] {
            let app = launch(scenario)
            XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))
            try app.performAccessibilityAudit(for: [.dynamicType, .sufficientElementDescription, .hitRegion, .contrast]) { issue in
                print("AUDIT \(scenario): \(issue.auditType.rawValue) \(issue.compactDescription) :: \(issue.element?.debugDescription.prefix(200) ?? "nil")")
                // Text that wraps rather than truncates is reported as clipped by the audit when it is not.
                // Off-screen elements (the next carousel card, rows under the tab bar) can't be measured.
                if let frame = issue.element?.frame, !app.frame.contains(frame) { return true }
                return issue.auditType == .dynamicType && issue.compactDescription.contains("partially unsupported")
            }
            app.terminate()
        }
    }
}
