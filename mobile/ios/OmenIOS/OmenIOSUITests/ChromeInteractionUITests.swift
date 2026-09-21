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
        XCTAssertTrue(element.waitForExistence(timeout: 10), "\(label) is missing", file: file, line: line)
        scrollIntoView(element)
        XCTAssertTrue(element.isHittable, "\(label) exists but cannot be tapped", file: file, line: line)
        let frame = element.frame
        XCTAssertGreaterThanOrEqual(frame.height, 43.5, "\(label) is \(frame.height)pt tall, under the 44pt minimum", file: file, line: line)
        XCTAssertGreaterThanOrEqual(frame.width, 43.5, "\(label) is \(frame.width)pt wide, under the 44pt minimum", file: file, line: line)
    }

    /// `Account` is a declared scroll, so a control can legitimately start below the fold.
    private func scrollIntoView(_ element: XCUIElement, attempts: Int = 8) {
        var remaining = attempts
        while !element.isHittable && remaining > 0 {
            XCUIApplication().swipeUp()
            remaining -= 1
        }
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

    /// Account carries help and **not** an account control.
    ///
    /// `OmenScreenHeaderControls` puts help then account in the slot on 25 of the 30 artboards.
    /// On Account the second control would open the screen it is already on, so `onOpenAccount`
    /// is nil here and the control is absent rather than inert — the rule the component's own
    /// documentation states: *"An avatar that opens nothing is a lie about what the header can
    /// do."*
    ///
    /// Asserted rather than assumed because the regression is a one-word change at a call site
    /// and produces a screen that looks completely correct.
    func testAccountCarriesHelpAndNoAccountControl() {
        continueAfterFailure = true
        for scenario in ["chrome.account.connected", "chrome.account.no-leagues", "chrome.account.connections-unavailable"] {
            let app = launch(scenario)
            assertTappable(helpButton(app), "\(scenario): contextual help")
            XCTAssertFalse(
                app.buttons["Account and profile"].exists,
                "\(scenario): the Account screen offers a control that opens the Account screen"
            )
            app.terminate()
        }
    }

    // MARK: - Account

    func testAccountOffersItsIdentityConnectionsAndSupportRows() {
        let app = launch("chrome.account.connected")

        // Matched by prefix. `OmenListRow` combines its title and subtitle into ONE
        // accessibility label, so these rows announce "Report a problem, Sends device and
        // version. Never your league data." An exact match on the title finds nothing, which
        // is how the first run of this file failed — the row was there and the predicate was
        // wrong. Prefix is also what keeps this test from breaking every time a subtitle is
        // reworded, which is the more common change.
        assertTappable(row("justin@slopssaloon.com", in: app), "the identity row")
        assertTappable(app.buttons["Add a league"], "add a league")

        // Three leagues, three providers, and each Disconnect names its own league. Three
        // identical "Disconnect" labels is the defect this assertion is about: a user who
        // cannot tell which row a control belongs to disconnects the wrong one. Check these
        // before the Support rows: Account is a scroll, and the one-direction helper follows
        // the same top-to-bottom order a user does.
        for team in ["Titans of Slopsilonia", "Davante\u{2019}s Inferno", "Puk Around & Find Out"] {
            let control = app.buttons.matching(
                NSPredicate(format: "label BEGINSWITH[c] %@", "Disconnect \(team)")
            ).firstMatch
            assertTappable(control, "the Disconnect control for \(team)")
        }

        for (title, label) in [
            ("Report a problem", "report a problem"),
            ("Help centre", "help centre"),
            ("Privacy & data", "privacy and data")
        ] {
            assertTappable(row(title, in: app), label)
        }
        assertTappable(app.buttons["Sign out"], "sign out")

        assertTapDoesNotBreak(row("Report a problem", in: app), app)
    }

    /// The whole reason `OmenAccountConnections` has three cases rather than two.
    ///
    /// A failed directory read renders as an **empty list** unless something stops it, and an
    /// empty list on this screen reads as "your leagues were disconnected". The screen has to
    /// say unread, and it has to say it in a sentence a user can act on.
    func testAnUnreadConnectionListSaysUnreadRatherThanEmpty() {
        let app = launch("chrome.account.connections-unavailable")

        XCTAssertTrue(
            text(containing: "unread, not empty", in: app).waitForExistence(timeout: 10),
            "the unavailable state does not say the list is unread rather than empty"
        )
        XCTAssertTrue(
            text(containing: "nothing has been disconnected", in: app).exists,
            "the unavailable state does not say the connections are still there"
        )
        // A count beside "Connected leagues" would be a claim, and an unread list supports no
        // claim. `0` is the specific wrong answer here.
        XCTAssertFalse(
            app.staticTexts["Connected leagues, 0"].exists,
            "an unread connection list is reporting a count of zero"
        )
    }

    /// The zero state is not the unread state, and it is not an error.
    ///
    /// `CommandNoLeague`'s contract row: *"Not an error state — nothing dashed or struck
    /// through."* The same applies here.
    func testTheZeroStateIsAZeroStateAndNotAFailure() {
        let app = launch("chrome.account.no-leagues")

        XCTAssertTrue(
            text(containing: "No leagues connected yet", in: app).waitForExistence(timeout: 10),
            "the zero state does not say there are no leagues"
        )
        XCTAssertFalse(
            text(containing: "couldn\u{2019}t read", in: app).exists,
            "the zero state is claiming something failed"
        )
    }

    // MARK: - The destructive control

    /// Delete exists, is hittable, and **does not fire**.
    ///
    /// Three claims, and the third is the one worth having. `OmenPrivacyAndDataSheet`'s red
    /// button opens the phrase gate; the phrase gate's own button is the only thing that can
    /// delete, and it is disabled until `AccountDeletion.isConfirmed` passes.
    ///
    /// The test taps it. If a future edit wires the red button straight to the repository,
    /// this test is what notices — an assertion that only checked for the button's existence
    /// would pass through that change unchanged.
    func testTheDeleteControlCannotFireWithoutTheExactPhrase() {
        let app = launch("chrome.account.privacy")

        let open = app.buttons["Delete my Omen data"]
        assertTappable(open, "the delete control")
        assertTapDoesNotBreak(open, app)

        // Export is deliberately NOT here: `GET /api/user/export` has no native carrier yet, so
        // the section renders with no button rather than a button that does nothing. Asserting
        // its absence pins that choice — a button appearing here later should be a decision,
        // not a drift.
        XCTAssertFalse(
            app.buttons["Export my data"].exists,
            "an export control appeared with no carrier behind it"
        )
        // The export *promise* is still on screen, because a user needs to know what an export
        // would and would not contain before they ask for one. `CONTRACTS.md`: export excludes
        // OAuth tokens, ESPN cookies and Vault ids.
        XCTAssertTrue(
            text(containing: "sign-in tokens", in: app).exists,
            "the export section does not say what an export excludes"
        )
    }

    func testThePhraseGateStaysDisabledUntilThePhraseMatches() {
        let app = launch("chrome.account.delete-confirmation")

        let confirm = app.buttons["Delete my Omen data"]
        XCTAssertTrue(confirm.waitForExistence(timeout: 10), "the phrase gate's confirm control is missing")
        // Existence is not the assertion. `isEnabled` is.
        XCTAssertFalse(
            confirm.isEnabled,
            "the delete confirmation is enabled with nothing typed into it"
        )
        XCTAssertGreaterThanOrEqual(confirm.frame.height, 43.5, "the confirm control is \(confirm.frame.height)pt tall")
        XCTAssertGreaterThanOrEqual(confirm.frame.width, 43.5, "the confirm control is \(confirm.frame.width)pt wide")

        // The gate names the phrase it wants rather than making the user guess. It reads the
        // constant, so this asserts the screen shows *a* phrase and not which one — the
        // constant changed once already (founder, 2026-09-03) and a test hardcoding the old
        // string would have failed for being right about the wrong thing.
        XCTAssertTrue(
            text(containing: "to confirm", in: app).exists,
            "the phrase gate does not tell the user what to type"
        )
    }

    // MARK: - The report pill

    func testTheReportPillIsPresentAndSaysWhatItSends() {
        let app = launch("chrome.report-pill.resting")

        let pill = app.buttons["chrome.report-pill"]
        assertTappable(pill, "the report pill")
        // The promise is in the accessibility label because the pill is one combined element.
        // It is the whole reason `OmenBetaReport` is a closed struct, so it is pinned here as
        // well as in `BetaReportTests`.
        XCTAssertTrue(
            pill.label.contains("never your league data"),
            "the report pill no longer states what it will not send: \(pill.label)"
        )
        assertTapDoesNotBreak(pill, app)
    }

    /// What the composer tells a user before they send, itemised from the payload itself.
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
            text(containing: "Report received", in: sent).waitForExistence(timeout: 10),
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
        for scenario in Self.probes.map(\.scenario) + ["chrome.report-pill.composer", "chrome.account.privacy"] {
            let app = launch(scenario)
            let percentages = app.descendants(matching: .any)
                .matching(NSPredicate(format: "label CONTAINS %@", "%"))
                .allElementsBoundByIndex
                .map(\.label)
            XCTAssertEqual(percentages, [], "\(scenario) renders a percentage: \(percentages)")
            app.terminate()
        }
    }

    // MARK: - D11, measured

    /// `Account` is declared **scrolls** and `ReportPill` is declared **fits**
    /// (`design/native-visual-lock-2026-09-13/README.md`). A declared scroll still owes a
    /// number: 12pt of overflow and 400pt of overflow are different screens.
    func testEveryChromeScreenReportsItsOverflow() {
        continueAfterFailure = true
        for screen in Self.probes {
            let app = launch(screen.scenario)
            let probe = app.descendants(matching: .any)[screen.probe]
            XCTAssertTrue(probe.waitForExistence(timeout: 15), "\(screen.scenario) published no fit measurement")
            guard let overflow = Self.overflow(from: probe.value as? String) else {
                XCTFail("\(screen.scenario) reported an unreadable measurement: \(String(describing: probe.value))")
                app.terminate()
                continue
            }
            // Printed on pass as well as on failure. D11 asks for the overflow to be *stated*,
            // and a number that only appears when an assertion breaks is an alarm rather than
            // a statement. This line is what the close-out report quotes.
            print("D11 \(screen.scenario): \(String(describing: probe.value)) overflow=\(overflow)pt declared=\(screen.declared)")
            // **Deliberately not asserted for the two Command Center frames.** Both report
            // ~1185pt of overflow, identically, with and without the pill — and that is a
            // pre-existing property of the `carousel == nil` stacked layout, which this branch
            // did not build and did not change. `CommandCenter.dc.html`'s fit declaration
            // describes the carousel composition; the stacked fallback is a different screen
            // wearing the same name. Asserting it here would fail a test for something the
            // pill did not cause, and the number is reported instead. See the handoff.
            //
            // What IS asserted about the pill is that it costs zero —
            // `testTheReportPillDoesNotCostCommandCenterItsFit`.
            if screen.declared == "fit", screen.probe == "chrome.fit.account" {
                XCTAssertLessThanOrEqual(
                    overflow, 0,
                    "\(screen.scenario) is declared a fit and overflows by \(overflow)pt"
                )
            }
            app.terminate()
        }
    }

    /// J2's first fit probe measured the same view twice, so its overflow was structurally
    /// always zero — a probe that cannot fail is not a measurement.
    ///
    /// The injection here is the connections list itself: `chrome.account.connected` draws
    /// three league rows and `chrome.account.no-leagues` draws a one-line sentence in their
    /// place. Real content the product actually has, rather than a spacer wired in for a test.
    func testTheFitProbeActuallyDetectsInjectedHeight() {
        let tall = Self.measure("chrome.account.connected", self)
        let short = Self.measure("chrome.account.no-leagues", self)
        guard let tall, let short else {
            return XCTFail("could not measure one of the two Account frames — connected=\(String(describing: tall)) empty=\(String(describing: short))")
        }
        print("D11 probe sanity: account connected=\(tall)pt no-leagues=\(short)pt delta=\(tall - short)pt")
        XCTAssertGreaterThan(
            tall, short,
            "the fit probe reported the same height for a screen with three extra league rows — it is not measuring anything"
        )
    }

    /// The pill must not cost Command Center its `fits` declaration.
    ///
    /// It is an overlay rather than a block for exactly this reason, and "it is an overlay" is
    /// a claim about code that a future refactor can quietly falsify. This measures instead:
    /// the Command Center content height with the pill present must equal the height without
    /// it. `OmenCommandCenterScreen` does not carry an `OmenFitProbe` — it has its own
    /// `contentFits` measurement predating J2 — so this reads the frame of the screen's own
    /// scroll content via the tab shell rather than a probe value.
    func testTheReportPillDoesNotCostCommandCenterItsFit() {
        let withPill = launch("chrome.report-pill.resting")
        let pill = withPill.buttons["chrome.report-pill"]
        XCTAssertTrue(pill.waitForExistence(timeout: 15), "the pill is not on the Command Center frame")
        withPill.terminate()

        let withPillHeight = Self.contentHeight("chrome.report-pill.resting", "chrome.fit.command-center", self)
        let withoutPillHeight = Self.contentHeight("command-center.demo-connected", "chrome.fit.command-center", self)
        guard let withPillHeight, let withoutPillHeight else {
            return XCTFail("could not measure both Command Center frames — with=\(String(describing: withPillHeight)) without=\(String(describing: withoutPillHeight))")
        }
        print("D11 pill cost: command-center content with=\(withPillHeight)pt without=\(withoutPillHeight)pt delta=\(withPillHeight - withoutPillHeight)pt")
        XCTAssertEqual(
            withPillHeight, withoutPillHeight,
            "the report pill added \(withPillHeight - withoutPillHeight)pt to Command Center's content — it is in the stack, not an overlay, and CommandCenter is declared a fit"
        )

        let without = launch("command-center.demo-connected")
        XCTAssertFalse(
            without.buttons["chrome.report-pill"].exists,
            "the pill appeared on a scenario that never asked for it — every existing Command Center capture just changed"
        )
        without.terminate()
    }

    /// `Account.dc.html` is declared **scrolls**; `ReportPill.dc.html` is declared **fits**.
    ///
    /// `ReportPill` is Command Center with the pill on it, so its probe is Command Center's —
    /// `chrome.fit.command-center`, which this branch added by applying J2's existing
    /// `OmenFitProbe` to `OmenCommandCenterScreen`. The screen has measured these two heights
    /// privately since 2026-09-10 to decide `scrollDisabled`; the probe is what makes them
    /// readable, so `CommandCenter` and `ReportPill` can finally state a number.
    ///
    /// `command-center.demo-connected` is in the list as the control: the same screen without
    /// the pill. The two must report the **same content height**, which is what turns "the
    /// pill is an overlay" from a claim about code into a measurement.
    private static let probes: [(scenario: String, probe: String, declared: String)] = [
        ("chrome.account.connected", "chrome.fit.account", "scroll"),
        ("chrome.account.no-leagues", "chrome.fit.account", "scroll"),
        ("chrome.account.connections-unavailable", "chrome.fit.account", "scroll"),
        ("chrome.report-pill.resting", "chrome.fit.command-center", "fit"),
        ("command-center.demo-connected", "chrome.fit.command-center", "fit")
    ]

    private static func measure(_ scenario: String, _ test: ChromeInteractionUITests) -> Int? {
        guard let probe = probes.first(where: { $0.scenario == scenario })?.probe else { return nil }
        let app = test.launch(scenario)
        let element = app.descendants(matching: .any)[probe]
        guard element.waitForExistence(timeout: 15) else {
            app.terminate()
            return nil
        }
        let value = overflow(from: element.value as? String)
        app.terminate()
        return value
    }

    /// The content height alone, for comparisons where the viewport is a constant.
    private static func contentHeight(_ scenario: String, _ probe: String, _ test: ChromeInteractionUITests) -> Int? {
        let app = test.launch(scenario)
        let element = app.descendants(matching: .any)[probe]
        guard element.waitForExistence(timeout: 15) else {
            app.terminate()
            return nil
        }
        let value = heights(from: element.value as? String)?.content
        app.terminate()
        return value
    }

    private static func heights(from value: String?) -> (content: Int, viewport: Int)? {
        guard let value else { return nil }
        let numbers = value
            .split(separator: " ")
            .compactMap { part -> Int? in
                guard let equals = part.firstIndex(of: "=") else { return nil }
                let digits = part[part.index(after: equals)...].filter(\.isNumber)
                return digits.isEmpty ? nil : Int(digits)
            }
        guard numbers.count == 2, numbers[1] > 0 else { return nil }
        return (numbers[0], numbers[1])
    }

    /// Parses `content=NNN viewport=NNN` and returns content minus viewport. Positive is
    /// overflow. Digits only, because UIKit localises the value and a content height of 1084
    /// arrives as `content=1,084` — which `Int(_:)` reads as nil.
    private static func overflow(from value: String?) -> Int? {
        guard let value else { return nil }
        let numbers = value
            .split(separator: " ")
            .compactMap { part -> Int? in
                guard let equals = part.firstIndex(of: "=") else { return nil }
                let digits = part[part.index(after: equals)...].filter(\.isNumber)
                return digits.isEmpty ? nil : Int(digits)
            }
        guard numbers.count == 2, numbers[1] > 0 else { return nil }
        return numbers[0] - numbers[1]
    }
}
