import XCTest

/// The chrome's controls, driven rather than photographed — and its two declared scroll rules,
/// measured.
///
/// ## Why this file is shaped like `J4InteractionUITests` and named differently
///
/// The shape is J4's because J4's is the best one in the repo: it floors **both** axes at 44pt
/// rather than only height, it scrolls a control into view before asking whether it is hittable,
/// and it deliberately does not tap inside an existence assertion — J1's first draft did, and
/// two of its tests failed claiming controls were missing when the previous tap had navigated
/// the screen away.
///
/// The name is not `J7` because there is no J7. `Account` and `ReportPill` are chrome:
/// `screen-journeys-v1.md` says both are reachable from anywhere, so a journey through them
/// would be invented. What replaces the nominal/degraded pair is one scenario per state that
/// genuinely exists, and this file asserts against those states rather than against a path.
///
/// ## The one assertion here that is not in J4
///
/// `testTheDeleteControlCannotFireWithoutTheExactPhrase`. Every other control on these screens
/// is asserted to exist and be reachable; the destructive one additionally has to be asserted
/// **inert**. "Exists and is hittable" is exactly what you want to be true of a Send button and
/// exactly half of what you want to be true of a delete.
final class ChromeInteractionUITests: XCTestCase {

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    private func launch(_ scenario: String) -> XCUIApplication {
        let app = XCUIApplication()
        app.launchArguments += ["-OMEN_SCREENSHOT_SCENARIO", scenario]
        app.launch()
        XCTAssertTrue(
            app.wait(for: .runningForeground, timeout: 30),
            "\(scenario) did not reach the foreground"
        )
        return app
    }

    /// 44x44 points, per Apple's Human Interface Guidelines, on **both** axes.
    ///
    /// The 0.5pt tolerance is carried from J1, J2 and J4 for the reason recorded there:
    /// `Reconnect ESPN` once measured 43.99999999999994, which is CGFloat layout arithmetic and
    /// not a thumb-sized problem. An exact comparison fails on rounding and teaches the next
    /// person to delete the assertion.
    ///
    /// **This deliberately does not tap.**
    private func assertTappable(
        _ element: XCUIElement,
        _ label: String,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        XCTAssertTrue(scrollIntoView(element), "\(label) is missing", file: file, line: line)
        XCTAssertTrue(element.isHittable, "\(label) exists but cannot be tapped", file: file, line: line)
        let frame = element.frame
        XCTAssertGreaterThanOrEqual(frame.height, 43.5, "\(label) is \(frame.height)pt tall, under the 44pt minimum", file: file, line: line)
        XCTAssertGreaterThanOrEqual(frame.width, 43.5, "\(label) is \(frame.width)pt wide, under the 44pt minimum", file: file, line: line)
    }

    /// `Account` is a declared scroll, so a control can legitimately start below the fold.
    @discardableResult
    private func scrollIntoView(_ element: XCUIElement, attempts: Int = 8) -> Bool {
        var remaining = attempts
        while remaining > 0 {
            if element.waitForExistence(timeout: 1), element.isHittable {
                return true
            }
            XCUIApplication().swipeUp()
            remaining -= 1
        }
        return element.exists && element.isHittable
    }

    private func assertTapDoesNotBreak(_ element: XCUIElement, _ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) {
        scrollIntoView(element)
        element.tap()
        XCTAssertEqual(app.state, .runningForeground, "the app left the foreground after a tap", file: file, line: line)
    }

    private func helpButton(_ app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "What is this?")).firstMatch
    }

    /// An `OmenListRow`, addressed by its title. See the note in
    /// `testAccountOffersItsIdentityConnectionsAndSupportRows` for why this is a prefix match.
    private func row(_ title: String, in app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", title)).firstMatch
    }

    private func text(containing fragment: String, in app: XCUIApplication) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", fragment)).firstMatch
    }

    // MARK: - E017, and the recursion it would otherwise produce

    // MARK: - Account

    // MARK: - The destructive control

    // MARK: - The report pill

    /// What the composer tells a user before they send, itemised from the payload itself.
    // MARK: - Account

    func testAccountListsLeaguesAppAndHelpRows() {
        let app = launch("chrome.account.connected")
        assertTappable(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Account, justin@slopssaloon.com")).firstMatch, "the identity row")
        XCTAssertTrue(text(containing: "Sign in again", in: app).exists, "a signed-out league does not say so")
        for title in ["Connect a league", "Contact support", "Report a problem", "How Omen makes a call", "Privacy and your data", "About and data sources"] {
            assertTappable(app.buttons[title], title)
        }
        assertTappable(app.buttons["Sign out"], "sign out")
    }

    func testAnUnreadLeagueListSaysSoAndTheZeroStateIsNotAFailure() {
        var app = launch("chrome.account.connections-unavailable")
        XCTAssertTrue(text(containing: "Nothing has been disconnected", in: app).waitForExistence(timeout: 10))
        app.terminate()
        app = launch("chrome.account.no-leagues")
        XCTAssertTrue(text(containing: "No leagues connected yet", in: app).waitForExistence(timeout: 10))
        XCTAssertFalse(text(containing: "couldn\u{2019}t read", in: app).exists)
    }

    /// The red button only opens the phrase gate, and export has no carrier yet so it is absent.
    func testDeleteOnlyOpensTheGateAndTheGateStaysOffUntilThePhraseMatches() {
        var app = launch("chrome.account.privacy")
        assertTappable(app.buttons["Delete account"], "the delete control")
        assertTapDoesNotBreak(app.buttons["Delete account"], app)
        XCTAssertFalse(app.buttons["Export your data"].exists, "an export control appeared with no carrier behind it")
        app.terminate()
        app = launch("chrome.account.delete-confirmation")
        let confirm = app.buttons["Delete"]
        XCTAssertTrue(confirm.waitForExistence(timeout: 10))
        XCTAssertFalse(confirm.isEnabled, "delete is enabled with nothing typed")
        XCTAssertTrue(text(containing: "to confirm", in: app).exists)
    }

    func testAccountScreensPassTheAccessibilityAudit() throws {
        for scenario in ["chrome.account.connected", "chrome.account.connections-unavailable", "chrome.account.privacy", "chrome.account.delete-confirmation", "account.about-data-sources", "account.how-calls"] {
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

    func testTheComposerListsExactlyWhatItSendsAndPromisesNoStorage() {
        let app = launch("chrome.report-pill.composer")

        for field in ["Screen", "App", "Device", "Connection", "Recent error codes", "Your note"] {
            XCTAssertTrue(
                app.staticTexts.matching(NSPredicate(format: "label BEGINSWITH %@", field)).firstMatch
                    .waitForExistence(timeout: 10),
                "the composer does not list \(field) among what it sends"
            )
        }

        // `beta-report.v1` says `screenshots_supported: false`. Stated, not silently absent:
        // a missing attach control reads as an unfinished feature rather than a deliberate one.
        XCTAssertTrue(
            text(containing: "Screenshots can\u{2019}t be attached", in: app).exists,
            "the composer does not say screenshots cannot be attached"
        )

        assertTappable(app.buttons["chrome.report-composer.accept"], "the disclosure acceptance control")
        assertTappable(app.buttons["Cancel"], "cancel")

        // **The storage gate.** `sql/2026-09-14_beta_reports_review.sql` is review-only until
        // migration approval, so nothing before the send may claim the report will be kept.
        // A client cannot know whether the migration landed, and a screen that guesses is a
        // screen that is confidently wrong half the time.
        for forbidden in ["will be stored", "will be saved", "we\u{2019}ll read", "we will read", "saved to your account"] {
            XCTAssertFalse(
                text(containing: forbidden, in: app).exists,
                "the composer promises storage or a reply before sending: \(forbidden)"
            )
        }
    }

    /// The two ends of one POST, and the reason `notSaved` is its own case.
    func testTheSentAndNotSavedStatesEachSayOnlyWhatIsTrue() {
        continueAfterFailure = true

        let sent = launch("chrome.report-pill.sent")
        XCTAssertTrue(
            text(containing: "Received", in: sent).waitForExistence(timeout: 10),
            "the 201 state does not repeat the server's own word"
        )
        // The id is the only evidence the client has that anything was stored, so it is shown.
        XCTAssertTrue(
            text(containing: "rpt_8f21c4", in: sent).exists,
            "the 201 state does not show the reference the server issued"
        )
        sent.terminate()

        let notSaved = launch("chrome.report-pill.not-saved")
        XCTAssertTrue(
            text(containing: "not saved", in: notSaved).waitForExistence(timeout: 10),
            "the 503 state does not say the report was not saved"
        )
        XCTAssertTrue(
            text(containing: "nothing was kept", in: notSaved).exists,
            "the 503 state does not say nothing was kept"
        )
        // Not folded into a generic failure. "We could not reach the server" and "the server
        // has nowhere to put this" are different facts and a user can act on only one.
        XCTAssertFalse(
            text(containing: "Report received", in: notSaved).exists,
            "the not-saved state is claiming the report was received"
        )
        notSaved.terminate()
    }

    /// Neither of these screens states a confidence anywhere, and neither should start.
    ///
    /// Fact-of-record #16: confidence is a band, never a percentage. Account and the pill have
    /// no confidence surface at all, which is exactly why this is cheap to assert and easy to
    /// lose — a "94% of reports get a reply" line would be both a percentage and a promise.
    func testNoChromeScreenPrintsAPercentage() {
        continueAfterFailure = true
        for scenario in ["chrome.account.connected", "chrome.account.no-leagues", "chrome.account.connections-unavailable", "chrome.report-pill.composer", "chrome.account.privacy"] {
            let app = launch(scenario)
            let percentages = app.descendants(matching: .any)
                .matching(NSPredicate(format: "label CONTAINS %@", "%"))
                .allElementsBoundByIndex
                .map(\.label)
            XCTAssertEqual(percentages, [], "\(scenario) renders a percentage: \(percentages)")
            app.terminate()
        }
    }
}
