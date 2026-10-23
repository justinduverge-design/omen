import XCTest

/// The Omen call on the foundation (frames: Main Omen call, OmenTradeCall, States hold, FullArgument).
final class OmenCallUITests: XCTestCase {
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
        // The actions sit below the call; scroll to them the way a person would.
        var swipes = 0
        while !element.isHittable && swipes < 4 { XCUIApplication().swipeUp(); swipes += 1 }
        XCTAssertTrue(element.isHittable, "\(label) cannot be tapped")
        XCTAssertGreaterThanOrEqual(element.frame.height, 43.5, "\(label) is under 44pt tall")
    }

    func testTheStartSitCallHandsTheMoveOverAndKeepsTheArgumentOneTapAway() {
        let app = launch("journey-j3.nominal.03-start-sit")
        assertHittable(app.buttons["Make this move in ESPN"], "hand-off")
        assertHittable(app.buttons["See the full argument"], "full argument")
        assertHittable(app.buttons["Report this"], "report")
        XCTAssertTrue(app.staticTexts["START"].exists && app.staticTexts["SIT"].exists, "the call must show both sides")
    }

    func testTheTradeCallOffersReviewNotSend() {
        let app = launch("omen.trade-call")
        assertHittable(app.buttons["Check it in the builder"], "review in builder")
        XCTAssertFalse(app.buttons["Send"].exists, "Omen hands a trade over; it never sends one")
    }

    func testHoldAndFailureStatesEachSayWhatIsTrue() {
        let hold = launch("omen.hold")
        assertHittable(hold.buttons["See the full argument"], "full argument from a hold")
        hold.terminate()
        let off = launch("omen.disconnected")
        XCTAssertTrue(off.buttons["Connect a league"].waitForExistence(timeout: 10) || off.staticTexts["Connect a league for a call"].exists)
    }

    func testNoConfidenceIsEverAPercentage() {
        let app = launch("journey-j3.nominal.03-start-sit")
        XCTAssertTrue(app.buttons["See the full argument"].waitForExistence(timeout: 10))
        let percent = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", ".*[0-9]+ ?%.*"))
        XCTAssertEqual(percent.count, 0)
    }

    func testOmenScreensPassTheAccessibilityAudit() throws {
        for scenario in ["journey-j3.nominal.03-start-sit", "omen.trade-call", "omen.hold", "journey-j3.nominal.02-omen-evidence"] {
            let app = launch(scenario)
            try app.performAccessibilityAudit(for: [.dynamicType, .sufficientElementDescription, .hitRegion, .contrast]) { issue in
                print("AUDIT \(scenario): \(issue.auditType.rawValue) \(issue.compactDescription) :: \(issue.element?.debugDescription.prefix(200) ?? "nil")")
                // Off-screen elements (the next carousel card, rows under the tab bar) can't be measured.
                if let frame = issue.element?.frame, !app.frame.contains(frame) { return true }
                return issue.auditType == .dynamicType && issue.compactDescription.contains("partially unsupported")
            }
            app.terminate()
        }
    }
}
