import XCTest

/// J1's controls, driven rather than photographed.
///
/// ## Why this exists
///
/// The journey captures prove composition, and `screen-journeys-v1.md` says so plainly: *"It is a
/// storyboard, not a flow test."* Every J1 screen was signed off on a screenshot, and a
/// screenshot cannot tell you that a button is reachable, that its hit region is big enough for a
/// thumb, or that tapping it does anything at all.
///
/// The gap is not hypothetical here. Both `OmenNoLeagueScreen` and `OmenConnectFailedScreen` were
/// captured for a day while being referenced **only** by screenshot scenarios — no production
/// path reached either one. A capture looked perfect and the screen was unreachable.
///
/// ## What these assert, and what they deliberately do not
///
/// They assert the controls **exist, are hittable, and are at least 44x44 points** — Apple's
/// minimum, and the number `V-CanvasConformance` already holds the switcher to.
///
/// They do **not** assert what a tap navigates to. In a screenshot scenario the action closures
/// are `{}` by construction, so asserting a destination here would only prove the fixture. Where
/// a tap leads is production wiring, and it belongs to `slops-verify` and the device matrix.
final class J1InteractionUITests: XCTestCase {

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

    /// 44x44 points, per Apple's Human Interface Guidelines. A control that renders correctly and
    /// cannot be hit reliably is not a working control.
    ///
    /// **This deliberately does not tap.** The first draft did, and two tests failed claiming
    /// "Yahoo provider row is missing" and "consent decline is missing" — because tapping the
    /// control before them had navigated the screen away. Those were the test's bug, not the
    /// product's, and a suite that cries wolf about missing controls is worse than no suite.
    /// Tapping is asserted separately, once per screen, by `assertTapDoesNotBreak`.
    ///
    /// The tolerance is 0.5pt rather than an exact 44. `Reconnect ESPN` measured
    /// 43.99999999999994 — six parts in 10^14 short of 44, which is CGFloat layout arithmetic,
    /// not a thumb-sized problem. An exact comparison here fails on rounding and teaches the
    /// next person to delete the assertion.
    private func assertTappable(_ element: XCUIElement, _ label: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), "\(label) is missing", file: file, line: line)
        XCTAssertTrue(element.isHittable, "\(label) exists but cannot be tapped", file: file, line: line)
        let frame = element.frame
        XCTAssertGreaterThanOrEqual(frame.height, 43.5, "\(label) is \(frame.height)pt tall, under the 44pt minimum", file: file, line: line)
        XCTAssertGreaterThanOrEqual(frame.width, 43.5, "\(label) is \(frame.width)pt wide, under the 44pt minimum", file: file, line: line)
    }

    /// One real tap per screen. It asserts the app survives the tap and stays in the foreground —
    /// in a screenshot scenario the action closure is `{}`, so where the tap *leads* is not
    /// knowable here and is not claimed.
    private func assertTapDoesNotBreak(_ element: XCUIElement, _ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) {
        element.tap()
        XCTAssertEqual(app.state, .runningForeground, "the app left the foreground after a tap", file: file, line: line)
    }

    func testSignInOffersEveryProviderAsAHittableControl() {
        let app = launch("onboarding.sign-in")
        // The four labelled rows that replaced three icon-only tiles. Labels matter to this
        // assertion as much as to the user: an icon-only tile gives the query nothing to find,
        // which is the same thing it gives VoiceOver.
        for title in ["Continue with Apple", "Continue with Google", "Continue with Discord", "Continue with email"] {
            assertTappable(app.buttons[title], title)
        }
        assertTapDoesNotBreak(app.buttons["Continue with email"], app)
    }

    /// The demo link is the App Store reviewer's only path into the app (fact-of-record #19), so
    /// it gets its own assertion rather than sitting in a list where a failure reads as cosmetic.
    func testSignInKeepsTheDemoEntryPointReachable() {
        let app = launch("onboarding.sign-in")
        let demo = app.buttons["Look around without an account →"]
        XCTAssertTrue(demo.waitForExistence(timeout: 10), "the reviewer's demo entry point is missing")
        XCTAssertTrue(demo.isHittable, "the demo entry point is present but unreachable")
    }

    func testConnectLeagueOffersEveryProviderInOrder() {
        let app = launch("onboarding.connect-league")
        for provider in ["Sleeper", "Yahoo", "ESPN"] {
            let row = app.buttons.containing(.staticText, identifier: provider).firstMatch
            assertTappable(row, "\(provider) provider row")
        }
        assertTapDoesNotBreak(app.buttons.containing(.staticText, identifier: "Sleeper").firstMatch, app)
    }

    func testEspnConsentOffersBothDecisions() {
        let app = launch("journey-j1.nominal.04-espn-consent")
        // Both, because a consent screen with only the accept path is not a consent screen.
        assertTappable(app.buttons["I understand — open the ESPN sheet"], "consent accept")
        assertTappable(app.buttons["Use Sleeper or Yahoo instead"], "consent decline")
        // Decline, not accept: accepting opens ESPN's real sheet.
        assertTapDoesNotBreak(app.buttons["Use Sleeper or Yahoo instead"], app)
    }

    func testConnectFailedOffersBothRecoveryActions() {
        let app = launch("journey-j1.degraded.05-connect-failed")
        // Connection contract §6: every non-success state carries a safe next action. Reconnect
        // is the fix; support is the escape for whoever's league really was deleted.
        assertTappable(app.buttons["Reconnect ESPN"], "reconnect")
        assertTappable(app.buttons["Send this to support"], "send to support")
        assertTapDoesNotBreak(app.buttons["Reconnect ESPN"], app)
    }

    func testNoLeagueTerminusIsNotADeadEnd() {
        let app = launch("journey-j1.nominal.06-command-no-league")
        assertTappable(app.buttons["Connect a league"], "connect")
        assertTappable(app.buttons["See how Omen decides"], "see how Omen decides")
        assertTapDoesNotBreak(app.buttons["Connect a league"], app)
    }
}
