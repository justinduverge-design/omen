import XCTest

/// League, Waivers and the Ledger on the foundation (frames: Main League, Waivers, Ledger, LedgerReceipt).
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

    func testTheLedgerLeadsWithTheRecordAndKeepsSelfReportsMarked() {
        let app = launch("ledger.root")
        XCTAssertTrue(app.staticTexts["41 right, 19 wrong"].waitForExistence(timeout: 10))
        let passed = app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "Add Spears, drop Tracy")).firstMatch
        assertHittable(passed, "a call")
        XCTAssertTrue(passed.label.hasPrefix("Wrong."))
        XCTAssertTrue(passed.label.contains("(your word)"))
        XCTAssertTrue(app.buttons.containing(NSPredicate(format: "label CONTAINS %@", "couldn\u{2019}t see what you did")).firstMatch.exists)
    }

    func testAReceiptIsFrozenAndAnOpenOneSaysTheWeekIsUnplayed() {
        var app = launch("ledger.receipt")
        XCTAssertTrue(app.staticTexts["What Omen said then"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.staticTexts["Tue 3:00 AM"].exists)
        app.terminate()
        app = launch("journey-j6.degraded.02-ledger-detail")
        XCTAssertTrue(app.staticTexts["The week hasn\u{2019}t been played yet"].waitForExistence(timeout: 10))
    }

    func testTheSwitcherChecksTheCurrentTeamAndSendsASignedOutOneToConnect() {
        let app = launch("switcher.sheet")
        let current = app.buttons.containing(NSPredicate(format: "label BEGINSWITH %@", "Titans of Slopsilonia")).firstMatch
        assertHittable(current, "the current team")
        XCTAssertTrue(current.label.hasSuffix("current team"))
        let signedOut = app.buttons.containing(NSPredicate(format: "label BEGINSWITH %@", "Gridiron Gumbo")).firstMatch
        XCTAssertTrue(signedOut.label.contains("sign in again"))
        assertHittable(app.buttons["Connect a league"], "connect")
        assertHittable(app.buttons["Account"], "account")
        assertHittable(app.buttons["Done"], "done")
    }

    func testContactSupportOpensOnQuestionAndCannotSendUntilAccepted() {
        let app = launch("support.contact")
        XCTAssertTrue(app.staticTexts["Contact support"].waitForExistence(timeout: 10))
        XCTAssertTrue(app.buttons["Question"].isSelected)
        XCTAssertFalse(app.buttons["chrome.report-composer.send"].isEnabled)
    }

    func testLeagueScreensPassTheAccessibilityAudit() throws {
        for scenario in ["league.root", "journey-j5.degraded.01-league-degraded", "waivers.move", "journey-j5.nominal.03-waiver-no-move", "ledger.root", "journey-j6.degraded.01-ledger", "ledger.receipt", "journey-j6.degraded.02-ledger-detail", "switcher.sheet", "support.contact"] {
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
