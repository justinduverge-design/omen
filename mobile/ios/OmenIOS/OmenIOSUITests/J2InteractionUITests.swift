import XCTest

/// J2's controls, driven rather than photographed — and J2's fit, measured rather than eyeballed.
///
/// ## Why this exists
///
/// The same reason `J1InteractionUITests` does: the journey captures prove composition, and
/// `screen-journeys-v1.md` says so plainly — *"It is a storyboard, not a flow test."* A
/// screenshot cannot tell you that the account control is reachable, that the switcher's `+` is
/// big enough for a thumb, or that the star and the row are two separate targets rather than one.
///
/// J2 adds a second job. Every one of its five artboards is declared a **fit** in the canvas
/// README, which is blunt about what that means: *"'Fits' is a requirement, not an observation
/// and it is measured, not eyeballed."* `testEveryDeclaredFitActuallyFits` is that measurement.
/// Before it, D11 was checked once by reading two frames off a running simulator by hand —
/// which is evidence about one afternoon, not a check.
///
/// ## What these assert, and what they deliberately do not
///
/// They assert the controls **exist, are hittable, and are at least 44x44 points**, and that the
/// content of each declared-fit screen is no taller than the space it was given.
///
/// They do **not** assert what a tap navigates to. In a screenshot scenario the action closures
/// are `{}` by construction, so asserting a destination here would only prove the fixture. Where
/// a tap leads is production wiring, and it belongs to `slops-verify` and the device matrix.
final class J2InteractionUITests: XCTestCase {

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
    /// **This deliberately does not tap.** J1's first draft did, and two of its tests failed
    /// claiming controls were "missing" — because tapping the control before them had navigated
    /// the screen away. Those were the test's bug, not the product's, and a suite that cries wolf
    /// about missing controls is worse than no suite. Tapping is asserted separately, once per
    /// screen, by `assertTapDoesNotBreak`.
    ///
    /// The tolerance is 0.5pt rather than an exact 44, carried over from J1 for the reason
    /// recorded there: `Reconnect ESPN` measured 43.99999999999994 — six parts in 10^14 short of
    /// 44, which is CGFloat layout arithmetic and not a thumb-sized problem. An exact comparison
    /// fails on rounding and teaches the next person to delete the assertion.
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

    /// The contextual-help button labels itself "What is this? <topic title>", so it is matched
    /// by prefix rather than by a title this test would otherwise have to keep in sync with
    /// `OmenContextualHelpContent`.
    private func helpButton(_ app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "What is this?")).firstMatch
    }

    // MARK: - E017 and the switcher bar, on every screen that carries them

    func testTheDeskCarriesBothHeaderControlsAndTheSwitcher() {
        let app = launch("journey-j2.nominal.01-command-center")
        // Both, in Command Center's order. The artboard draws neither in this slot; the founder
        // resolved E017 as both on 2026-09-18, and without the account control this destination
        // is the only route to Account and it does not exist.
        assertTappable(helpButton(app), "contextual help")
        assertTappable(app.buttons["Account and profile"], "account control")
        // E012. The artboard's `+` is a 13x18 glyph; the frame grows to 44 and the glyph does not.
        assertTappable(app.buttons["Add a league"], "add a league")
        assertTapDoesNotBreak(helpButton(app), app)
    }

    func testTheDeskSectionLinksAreReachable() {
        let app = launch("journey-j2.nominal.01-command-center")
        assertTappable(app.buttons["League, Waiver watch"], "waiver watch league link")
        assertTappable(app.buttons["See all, The Ledger"], "ledger see-all link")
        assertTapDoesNotBreak(app.buttons["See all, The Ledger"], app)
    }

    func testTheQuietWeekKeepsTheSameChrome() {
        let app = launch("journey-j2.nominal.04-command-quiet")
        // A quiet week is the screen a user is most likely to leave from, so the two ways out —
        // help and account — matter more here than anywhere else on the journey, not less.
        assertTappable(helpButton(app), "contextual help")
        assertTappable(app.buttons["Account and profile"], "account control")
        assertTapDoesNotBreak(app.buttons["Account and profile"], app)
    }

    func testTheStraightQuietWeekKeepsTheSameChrome() {
        let app = launch("journey-j2.degraded.04-command-quiet-straight")
        assertTappable(helpButton(app), "contextual help")
        assertTappable(app.buttons["Account and profile"], "account control")
        assertTapDoesNotBreak(helpButton(app), app)
    }

    func testMidSwitchTheChromeStaysReachable() {
        let app = launch("journey-j2.nominal.03-switch-loading")
        // The whole point of this frame is that the bar has already committed to the new team
        // while the numbers have not arrived. If the chrome went with them, the user would have
        // a screen they cannot leave for as long as the read takes.
        assertTappable(helpButton(app), "contextual help")
        assertTappable(app.buttons["Account and profile"], "account control")
        assertTapDoesNotBreak(helpButton(app), app)
    }

    // MARK: - The switcher sheet

    func testTheSwitcherSheetOffersEveryProviderSegment() {
        let app = launch("journey-j2.nominal.02-switch-sheet")
        for provider in ["All", "ESPN", "Yahoo", "Sleeper"] {
            assertTappable(app.buttons[provider], "\(provider) segment")
        }
        assertTapDoesNotBreak(app.buttons["Sleeper"], app)
    }

    /// The star and the row are **two targets**, and this is the assertion that keeps them that
    /// way. Collapsing them into one row button would make curating favourites impossible
    /// without also switching the active league four times.
    func testEveryTeamRowHasASeparateStarAndASeparateSwitch() {
        let app = launch("journey-j2.nominal.02-switch-sheet")
        assertTappable(app.buttons["Unstar Titans of Slopsilonia"], "star on the active team")
        assertTappable(app.buttons["Star Puk Around & Find Out"], "star on an unstarred team")
        let row = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Davante")).firstMatch
        assertTappable(row, "a switchable team row")
        // The star, not the row: tapping the row switches team and dismisses the sheet, which
        // would take the rest of this screen's tree with it.
        assertTapDoesNotBreak(app.buttons["Star Puk Around & Find Out"], app)
    }

    /// A provider the directory could not list is **named**, not quietly missing.
    ///
    /// `capability-expression-v1.md` acceptance rule 4 requires it, and the failure it prevents
    /// is specific: a user whose Yahoo teams silently vanished from this sheet concludes they
    /// have lost them.
    func testTheDegradedSwitcherNamesTheProviderItCouldNotList() {
        let app = launch("journey-j2.degraded.02-switch-sheet")
        let notice = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Yahoo did not answer")).firstMatch
        XCTAssertTrue(notice.waitForExistence(timeout: 10), "the unread provider is not named in the sheet")
    }

    // MARK: - The degraded pass says what it could not read

    /// The two classes a `consumes` degraded pass must show, on one screen.
    ///
    /// Not a screenshot assertion: a capture proves the pixels existed, and this proves the
    /// words did. `capability-expression-v1.md` allows a screen to satisfy the entire contract
    /// while no capture would ever show it, which is exactly the gap that produced this test.
    func testTheDegradedDeskNamesWhatItCouldNotReadAndWhatItIgnored() {
        let app = launch("journey-j2.degraded.01-command-center")

        // Class 3, "could not read": named, with a sentence.
        let unread = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "League matchup")).firstMatch
        XCTAssertTrue(unread.waitForExistence(timeout: 10), "the unavailable capability is not named")

        // Class 2, "read, not used": named, and explicitly NOT claimed as evidence.
        let unused = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "did not change this week")).firstMatch
        XCTAssertTrue(unused.waitForExistence(timeout: 10), "the read-but-unused capability is not named")

        // And the sections that did read are still there beside them, which is the whole claim
        // of this frame: a dead matchup read sits beside a live wire.
        let waiver = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Jaylen Wright")).firstMatch
        XCTAssertTrue(waiver.waitForExistence(timeout: 10), "the live waiver section did not survive a failed matchup read")
    }

    // MARK: - D11, measured

    /// Every J2 artboard is declared a fit in `design/native-visual-lock-2026-09-13/README.md`,
    /// so every J2 screen must fit, and the overflow is stated in points rather than judged from
    /// a picture.
    ///
    /// The numbers come from `OmenFitProbe`, which publishes the measured content and viewport
    /// heights as an accessibility value. A failure here reports the actual overflow, so the next
    /// person gets "18pt over" rather than "looks like it scrolls".
    func testEveryDeclaredFitActuallyFits() {
        // The one test in this class that keeps going after a failure. Every other assertion here
        // stops on first failure because a missing control usually invalidates the ones after it;
        // here the opposite holds — five independent screens, and knowing that one of them
        // overflows tells you nothing about the other four.
        continueAfterFailure = true
        let screens: [(scenario: String, probe: String)] = [
            ("journey-j2.nominal.01-command-center", "j2.fit.command-center"),
            ("journey-j2.degraded.01-command-center", "j2.fit.command-center"),
            ("journey-j2.nominal.04-command-quiet", "j2.fit.command-quiet"),
            ("journey-j2.degraded.04-command-quiet-straight", "j2.fit.command-quiet"),
            ("journey-j2.nominal.03-switch-loading", "j2.fit.switch-loading")
        ]

        for screen in screens {
            let app = launch(screen.scenario)
            let probe = app.descendants(matching: .any)[screen.probe]
            XCTAssertTrue(probe.waitForExistence(timeout: 15), "\(screen.scenario) published no fit measurement")

            guard let overflow = Self.overflow(from: probe.value as? String) else {
                XCTFail("\(screen.scenario) reported an unreadable measurement: \(String(describing: probe.value))")
                app.terminate()
                continue
            }
            // Emitted on pass as well as on failure. D11 asks for the overflow of every
            // declared fit to be *stated*, and a number that only appears when the assertion
            // breaks is not a statement — it is an alarm. This line is what the close-out report
            // quotes.
            print("D11 \(screen.scenario): \(String(describing: probe.value)) overflow=\(overflow)pt")
            XCTAssertLessThanOrEqual(
                overflow, 0,
                "\(screen.scenario) overflows its frame by \(overflow)pt — D11 declares this screen a fit"
            )
            app.terminate()
        }
    }

    /// Parses `content=NNN viewport=NNN` and returns content minus viewport. Positive is overflow.
    private static func overflow(from value: String?) -> Int? {
        guard let value else { return nil }
        let numbers = value
            .split(separator: " ")
            .compactMap { part -> Int? in
                guard let equals = part.firstIndex(of: "=") else { return nil }
                return Int(part[part.index(after: equals)...])
            }
        guard numbers.count == 2, numbers[1] > 0 else { return nil }
        return numbers[0] - numbers[1]
    }
}
