import XCTest

/// J4's controls, driven rather than photographed — and J4's five scrolls, measured.
///
/// ## Why this exists
///
/// The same reason `J2InteractionUITests` does, and `screen-journeys-v1.md` says it plainly:
/// a journey capture *"is a storyboard, not a flow test."* A screenshot cannot tell you that the
/// third-team control is unavailable **rather than disabled**, that the share card's names toggle
/// is genuinely off, or that the roster rows are three separate targets rather than one.
///
/// J4 adds a second job that is the mirror image of J2's. Every one of J2's five artboards is
/// declared a **fit**; every one of J4's five is declared a **scroll**. A declared scroll still
/// owes a number — `screen-journeys-v1.md` asks for the overflow of every screen to be stated,
/// and a declared scroll with 12pt of overflow is a different screen from one with 400pt.
/// `testEveryDeclaredScrollReportsItsOverflow` states them.
///
/// ## What these assert, and what they deliberately do not
///
/// They assert the controls **exist, are hittable, and are at least 44x44 points**; that the four
/// contract facts this journey is most likely to lose are on screen in words; and that every
/// screen publishes a measurement.
///
/// They do **not** assert what a tap navigates to. In a screenshot scenario the action closures
/// are `{}` by construction, so asserting a destination here would only prove the fixture.
final class J4InteractionUITests: XCTestCase {

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

    /// 44x44 points, per Apple's Human Interface Guidelines.
    ///
    /// **This deliberately does not tap.** J1's first draft did, and two of its tests failed
    /// claiming controls were "missing" — because tapping the control before them had navigated
    /// the screen away. Those were the test's bug, not the product's. Tapping is asserted
    /// separately, once per screen, by `assertTapDoesNotBreak`.
    ///
    /// The tolerance is 0.5pt rather than an exact 44, carried from J1 and J2 for the reason
    /// recorded there: `Reconnect ESPN` measured 43.99999999999994 — six parts in 10^14 short of
    /// 44, which is CGFloat layout arithmetic and not a thumb-sized problem. An exact comparison
    /// fails on rounding and teaches the next person to delete the assertion.
    private func assertTappable(_ element: XCUIElement, _ label: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), "\(label) is missing", file: file, line: line)
        scrollIntoView(element)
        XCTAssertTrue(element.isHittable, "\(label) exists but cannot be tapped", file: file, line: line)
        let frame = element.frame
        XCTAssertGreaterThanOrEqual(frame.height, 43.5, "\(label) is \(frame.height)pt tall, under the 44pt minimum", file: file, line: line)
        XCTAssertGreaterThanOrEqual(frame.width, 43.5, "\(label) is \(frame.width)pt wide, under the 44pt minimum", file: file, line: line)
    }

    /// One real tap per screen. It asserts the app survives the tap and stays in the foreground —
    /// in a screenshot scenario the action closure is `{}`, so where the tap *leads* is not
    /// knowable here and is not claimed.
    /// Bring `element` into the viewport, because **all five J4 artboards are declared scrolls**.
    ///
    /// J2 needed nothing like this: its five screens are declared fits, so every control was on
    /// screen the moment the app launched and `isHittable` was true immediately. J4's are not,
    /// and the first run of this file failed two assertions with "exists but cannot be tapped"
    /// for `How to send this` and `Use my league's settings` — both of which are simply below
    /// the fold on a screen the canvas README says scrolls.
    ///
    /// A control off the bottom of a scroll is not a defect, so this scrolls to it and *then*
    /// asks whether it can be tapped. A control that never becomes hittable still fails, which
    /// is the case worth catching: something under a fixed footer, or off the end of the content.
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

    /// The contextual-help button labels itself "What is this? <topic title>", so it is matched
    /// by prefix rather than by a title this test would otherwise have to keep in sync with
    /// `OmenContextualHelpContent`.
    private func helpButton(_ app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "What is this?")).firstMatch
    }

    private func text(containing fragment: String, in app: XCUIApplication) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", fragment)).firstMatch
    }

    // MARK: - E017, on every screen that carries it

    /// The header slot carries **both** controls, help then account, on all five screens.
    ///
    /// Not once on a representative screen: the founder's 2026-09-18 resolution covers 25 of the
    /// 30 artboards, and the way that regresses is one screen at a time.
    func testEveryJ4ScreenCarriesBothHeaderControls() {
        // Five independent screens. Knowing that one of them lost the account control tells you
        // nothing about the other four, so this one keeps going.
        continueAfterFailure = true
        let scenarios = [
            "journey-j4.nominal.01-trade-build",
            "journey-j4.nominal.02-trade-roster",
            "journey-j4.nominal.03-trade-verdict",
            "journey-j4.nominal.04-trade-share",
            "journey-j4.degraded.03-trade-needs-context"
        ]
        for scenario in scenarios {
            let app = launch(scenario)
            assertTappable(helpButton(app), "\(scenario): contextual help")
            assertTappable(app.buttons["Account and profile"], "\(scenario): account control")
            app.terminate()
        }
    }

    // MARK: - TradeBuild

    func testTheBuildScreenOffersItsTabsFiltersAndPartners() {
        let app = launch("journey-j4.nominal.01-trade-build")
        assertTappable(app.buttons["Build"], "Build tab")
        assertTappable(app.buttons["Rosters"], "Rosters tab")
        assertTappable(app.buttons["All"], "All filter")
        // The two-letter ones, deliberately. They are the narrowest controls on the journey and
        // the first run of this test caught both under the 44pt floor — "RB" at 37.3pt and "WR"
        // at 40.7pt. Asserting only "All" and "Buy low" would have missed it.
        assertTappable(app.buttons["RB"], "RB filter")
        assertTappable(app.buttons["WR"], "WR filter")
        // `.fc.smart` — the brass filter that names a conclusion rather than a position. It is
        // the one most likely to be quietly dropped as "just another chip".
        assertTappable(app.buttons["Buy low"], "the smart filter")
        // CONTAINS rather than BEGINSWITH: the chip's accessibility label leads with the crest,
        // "DSI, Davante's Inferno, Needs RB". The first run of this test asserted BEGINSWITH and
        // reported the chip missing when it was on screen the whole time.
        let partner = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Davante")).firstMatch
        assertTappable(partner, "a trade partner chip")
        // Their hole is on the chip. A partner whose roster was not read carries no `need` at
        // all rather than "No hole", which is a claim about a roster nobody read.
        XCTAssertTrue((partner.label as String).contains("Needs RB"), "the partner chip does not carry their hole: \(partner.label)")
        assertTapDoesNotBreak(app.buttons["Rosters"], app)
    }

    /// **`max_teams: 2`, and the third-team control renders UNAVAILABLE.**
    ///
    /// Three things have to hold at once and each fails differently:
    ///
    ///   1. The control is **present**. Hiding it denies the product ever meant to do this.
    ///   2. It is **not a button**. A control that answers a tap by doing nothing is worse than
    ///      one that plainly does not respond, and `.disabled()` on a live-looking control reads
    ///      as a bug in the app rather than a limit of the product.
    ///   3. The reason is **named in words a user can read**, not a code and not only a
    ///      VoiceOver label — a dashed control with no visible explanation is the thing users
    ///      file bug reports about.
    func testTheThirdTeamControlIsUnavailableRatherThanHiddenOrWorking() {
        let app = launch("journey-j4.nominal.01-trade-build")

        // 1 and 3 together: the accessibility label carries the name, the word "Unavailable",
        // and the server's reason said as English.
        let control = app.descendants(matching: .any)
            .matching(NSPredicate(format: "label BEGINSWITH %@", "Add a third team. Unavailable."))
            .firstMatch
        XCTAssertTrue(control.waitForExistence(timeout: 10), "the third-team control is not on screen at all")
        XCTAssertTrue(
            (control.label as String).contains("has not been built yet"),
            "the third-team control does not say why: \(control.label)"
        )

        // 2: nothing in the button tree offers to add a team.
        let asButton = app.buttons
            .matching(NSPredicate(format: "label CONTAINS %@", "Add a third team"))
            .firstMatch
        XCTAssertFalse(asButton.exists, "the third-team control is a live button — it must not be tappable")

        // And the sighted reader gets the same sentence, outside the accessibility label.
        XCTAssertTrue(
            text(containing: "only compare two teams", in: app).waitForExistence(timeout: 10),
            "the two-team limit is not stated in visible copy"
        )
    }

    // MARK: - TradeRoster

    func testTheRosterRowsAreSeparateTargetsAndSayWhichAreAvailable() {
        let app = launch("journey-j4.nominal.02-trade-roster")
        let available = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Jaylen Wright")).firstMatch
        let alreadyIn = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Tony Pollard")).firstMatch
        let theyNeed = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Jahmyr Gibbs")).firstMatch
        assertTappable(available, "an addable roster row")
        assertTappable(alreadyIn, "a row already in the deal")
        assertTappable(theyNeed, "a row the other team needs")
        // The three states are said in words on the row, not carried by colour alone.
        XCTAssertTrue((available.label as String).contains("Add to deal"), "available row: \(available.label)")
        XCTAssertTrue((alreadyIn.label as String).contains("In the deal"), "added row: \(alreadyIn.label)")
        XCTAssertTrue((theyNeed.label as String).contains("They need this"), "needed row: \(theyNeed.label)")
        assertTapDoesNotBreak(available, app)
    }

    /// **A permanent provider limit is not an outage, and it must not offer a retry.**
    ///
    /// Fact of record #16. Where a provider will not hand over the other teams' rosters, Omen
    /// issues no trade call at all — and "try again" is a promise that later helps. It does not.
    /// This is the assertion that keeps a well-meaning later edit from adding one.
    func testTheUnreadableRosterIsPermanentAndOffersNoRetry() {
        let app = launch("journey-j4.degraded.02-trade-roster")

        XCTAssertTrue(
            text(containing: "Opponent rosters", in: app).waitForExistence(timeout: 10),
            "the capability that could not be read is not named"
        )
        XCTAssertTrue(
            text(containing: "will not change by trying again", in: app).waitForExistence(timeout: 10),
            "the screen does not say the limit is permanent"
        )
        for retryish in ["Retry", "Try again", "Reload", "Refresh"] {
            XCTAssertFalse(
                app.buttons[retryish].exists,
                "a '\(retryish)' control exists on a permanent provider limit"
            )
        }
    }

    // MARK: - TradeVerdict

    /// Trade is the argument-settler: **show both sides and state the caveat.**
    func testTheVerdictShowsBothSidesAndStatesTheCaveat() {
        let app = launch("journey-j4.nominal.03-trade-verdict")
        XCTAssertTrue(text(containing: "You send", in: app).waitForExistence(timeout: 10), "the sending side is missing")
        XCTAssertTrue(text(containing: "sends", in: app).waitForExistence(timeout: 10), "the receiving side is missing")
        XCTAssertTrue(
            text(containing: "Scored against", in: app).waitForExistence(timeout: 10),
            "the verdict does not state its caveat"
        )
        assertTappable(app.buttons["How to send this"], "the submission control")
        assertTappable(app.buttons["Build a counter"], "the counter control")
        assertTappable(app.buttons["Share this read"], "the route to TradeShare")
        assertTapDoesNotBreak(app.buttons["Build a counter"], app)
    }

    /// **Confidence is a band, never a percentage.**
    ///
    /// `trade-compare.v2` returns neither a band nor a percentage, so J4 shows neither — and the
    /// failure this guards is the `U1` defect repeating: a client minting a number the server
    /// never sent. A regex rather than a fixture check, because the way this comes back is
    /// somebody adding `"\(confidence)%"` to a subtitle, not somebody editing the fixture.
    func testNoJ4ScreenPrintsAConfidencePercentage() {
        continueAfterFailure = true
        let percentage = try! NSRegularExpression(pattern: "\\b\\d{1,3}\\s?%")
        for scenario in [
            "journey-j4.nominal.01-trade-build",
            "journey-j4.nominal.03-trade-verdict",
            "journey-j4.degraded.03-trade-needs-context"
        ] {
            let app = launch(scenario)
            XCTAssertTrue(app.staticTexts.firstMatch.waitForExistence(timeout: 15), "\(scenario) rendered no text")
            for label in app.staticTexts.allElementsBoundByIndex.map(\.label) {
                let range = NSRange(label.startIndex..., in: label)
                XCTAssertNil(
                    percentage.firstMatch(in: label, range: range),
                    "\(scenario) prints a percentage: \"\(label)\" — confidence is a band, never a number"
                )
            }
            app.terminate()
        }
    }

    // MARK: - TradeNeedsContext, the journey's degraded surface

    /// The two capability classes a degraded pass must show, on one screen.
    ///
    /// Not a screenshot assertion: a capture proves the pixels existed, and this proves the words
    /// did. `capability-expression-v1.md` allows a screen to satisfy the whole contract while no
    /// capture would ever show it, which is exactly the gap that produced J2's version of this.
    func testNeedsContextNamesWhatItCouldNotReadAndWhatItIgnored() {
        let app = launch("journey-j4.degraded.03-trade-needs-context")

        // Class 3, "could not read": named, with a sentence.
        XCTAssertTrue(
            text(containing: "Roster availability", in: app).waitForExistence(timeout: 10),
            "the unavailable capability is not named"
        )
        // Class 2, "read, not used": named, and explicitly NOT claimed as evidence.
        XCTAssertTrue(
            text(containing: "Schedule strength", in: app).waitForExistence(timeout: 10),
            "the read-but-unused capability is not named"
        )
        XCTAssertTrue(
            text(containing: "did not move this call", in: app).waitForExistence(timeout: 10),
            "the read-but-unused capability is not disclaimed as evidence"
        )
        // And the answer is still an answer rather than an error: §9.4, name incomplete input,
        // do not force a verdict.
        XCTAssertTrue(
            text(containing: "Too close to call blind", in: app).waitForExistence(timeout: 10),
            "the honest non-verdict is missing"
        )
        assertTappable(app.buttons["Use my league\u{2019}s settings"], "the remedy control")
        assertTapDoesNotBreak(app.buttons["Use my league\u{2019}s settings"], app)
    }

    // MARK: - TradeShare

    /// **Names are OFF by default on the card.** `trade-share.v1`, and a contract not a
    /// preference: a default that drifts to on leaks league-mates' names into a group chat.
    func testShareNamesAreOffByDefaultAndTheCardCarriesTheCaveat() {
        let app = launch("journey-j4.nominal.04-trade-share")

        let names = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Team names")).firstMatch
        assertTappable(names, "the team-names toggle")
        // The state is read off the **label**, not off `value`.
        //
        // `OmenTradeShareToggleRow` sets `.accessibilityValue(isOn ? "On" : "Off")`, and SwiftUI
        // folds that into the element's label rather than exposing it as `XCUIElement.value` —
        // the first run of this test read `value` and got `""`. The label is what a VoiceOver
        // user actually hears, so it is also the honest thing to assert on, and the sighted
        // reader gets the same word rendered in the row (D7: never colour alone).
        XCTAssertTrue(
            (names.label as String).hasSuffix(", Off"),
            "team names are not off by default — the row reads: \(names.label)"
        )

        // The caveat travels ON the card, not only on the screen. A shared read that drops it is
        // the one that ends up in a group chat claiming more than Omen said.
        XCTAssertTrue(
            text(containing: "may score it differently", in: app).waitForExistence(timeout: 10),
            "the card does not carry its own caveat"
        )
        // 30 days, stated. The hash expires and cannot be renewed.
        XCTAssertTrue(
            text(containing: "30 days", in: app).waitForExistence(timeout: 10),
            "the share screen does not state the 30-day expiry"
        )
        assertTappable(app.buttons["Create the link"], "the share action")
        assertTapDoesNotBreak(names, app)
    }

    /// A failed share is the **share service** failing, and the screen says which.
    func testAFailedShareIsNamedAndDoesNotImpugnTheRead() {
        let app = launch("journey-j4.degraded.04-trade-share")
        XCTAssertTrue(
            text(containing: "this is the sharing service, not the call", in: app).waitForExistence(timeout: 10),
            "a failed share is not distinguished from a failed read"
        )
    }

    // MARK: - D11, measured

    /// All five J4 artboards are declared **scrolls** in
    /// `design/native-visual-lock-2026-09-13/README.md`, so none of them is required to fit —
    /// but each still owes a number.
    ///
    /// The measurements come from `OmenFitProbe`, the same probe J2 built and this journey
    /// reuses rather than duplicating. It publishes content and viewport heights as an
    /// accessibility value; `content - viewport` is the overflow, and positive is overflow.
    ///
    /// **This prints rather than asserts a bound**, which is the opposite of J2's version and is
    /// deliberate. D11 binds declared fits. Asserting `<= 0` here would fail every one of these
    /// screens for doing exactly what the canvas README says they do.
    func testEveryDeclaredScrollReportsItsOverflow() {
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
            // Emitted on pass as well as on failure. D11 asks for the overflow of every screen to
            // be *stated*, and a number that only appears when an assertion breaks is not a
            // statement — it is an alarm. This line is what the close-out report quotes.
            print("D11 \(screen.scenario): \(String(describing: probe.value)) overflow=\(overflow)pt declared=scroll")
            app.terminate()
        }
    }

    /// The probe sanity check J2's session paid for the hard way.
    ///
    /// J2 found its first fit probe **structurally incapable of failing** — it measured the
    /// scroll content against itself, so it reported 0 whatever was in it, and a check that
    /// cannot fail is not a check. This reuses J2's corrected probe, and reuse is not proof.
    ///
    /// So: two scenarios of the **same screen** that differ only by one real block of content.
    /// `journey-j4.degraded.04-trade-share` is `journey-j4.nominal.04-trade-share` plus the
    /// named share failure. If the probe still cannot see height, the two measurements are
    /// identical. That is the injection, using content the product actually has rather than a
    /// spacer wired in for the test.
    func testTheFitProbeActuallyDetectsInjectedHeight() {
        let nominal = Self.measure("journey-j4.nominal.04-trade-share", self)
        let degraded = Self.measure("journey-j4.degraded.04-trade-share", self)
        guard let nominal, let degraded else {
            return XCTFail("could not measure one of the two share frames — nominal=\(String(describing: nominal)) degraded=\(String(describing: degraded))")
        }
        print("D11 probe sanity: share nominal=\(nominal)pt degraded=\(degraded)pt delta=\(degraded - nominal)pt")
        XCTAssertGreaterThan(
            degraded, nominal,
            "the fit probe reported the same height for a screen with an extra block of content — it is not measuring anything"
        )
    }

    private static let probes: [(scenario: String, probe: String)] = [
        ("journey-j4.nominal.01-trade-build", "j4.fit.trade-build"),
        ("journey-j4.nominal.02-trade-roster", "j4.fit.trade-roster"),
        ("journey-j4.nominal.03-trade-verdict", "j4.fit.trade-verdict"),
        ("journey-j4.nominal.04-trade-share", "j4.fit.trade-share"),
        ("journey-j4.degraded.01-trade-build", "j4.fit.trade-build"),
        ("journey-j4.degraded.02-trade-roster", "j4.fit.trade-roster"),
        ("journey-j4.degraded.03-trade-needs-context", "j4.fit.trade-needs-context"),
        ("journey-j4.degraded.04-trade-share", "j4.fit.trade-share")
    ]

    private static func measure(_ scenario: String, _ test: J4InteractionUITests) -> Int? {
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

    /// Parses `content=NNN viewport=NNN` and returns content minus viewport. Positive is overflow.
    private static func overflow(from value: String?) -> Int? {
        guard let value else { return nil }
        let numbers = value
            .split(separator: " ")
            .compactMap { part -> Int? in
                guard let equals = part.firstIndex(of: "=") else { return nil }
                // Digits only. UIKit localises the accessibility value, so a content height of
                // 1084 arrives as `content=1,084` — and `Int("1,084")` is nil, which this
                // parser then reported as "an unreadable measurement". J2 never hit it because
                // every one of its screens fits inside 844pt and so never reached four digits;
                // J4's five are declared scrolls and every one of them does.
                let digits = part[part.index(after: equals)...].filter(\.isNumber)
                return digits.isEmpty ? nil : Int(digits)
            }
        guard numbers.count == 2, numbers[1] > 0 else { return nil }
        return numbers[0] - numbers[1]
    }
}
