import XCTest

/// J5's controls, driven rather than photographed — and J5's six frames, measured.
///
/// ## Why this exists
///
/// The same reason `J2InteractionUITests` and `J4InteractionUITests` do, and
/// `screen-journeys-v1.md` says it plainly: a journey capture *"is a storyboard, not a flow
/// test."* A screenshot cannot tell you that `WaiverNotDetermined` is withholding the budget
/// **rather than failing to fetch it**, that `LeagueNoRosters` has no retry, or that the Waiver
/// section's link to the wire is a real 44pt target rather than two words of accent text.
///
/// ## The fit/scroll split, which is the reverse of J4's
///
/// J4's five artboards are all declared scrolls. J5's six are **five scrolls and one fit** —
/// `WaiverNoMove.dc.html` is the fit. So this file does both jobs: it *asserts* the declared fit
/// fits, which is what D11 binds, and it *prints* a measurement for the five declared scrolls,
/// which D11 asks to be stated rather than bounded.
///
/// ## What these assert, and what they deliberately do not
///
/// They assert the controls **exist, are hittable, and are at least 44x44 points**; that the
/// contract facts this journey is most likely to lose are on screen in words; and that every
/// screen publishes a measurement.
///
/// They do **not** assert what a tap navigates to. In a screenshot scenario the action closures
/// are `{}` by construction, so asserting a destination here would only prove the fixture.
final class J5InteractionUITests: XCTestCase {

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

    /// 44x44 points, per Apple's Human Interface Guidelines — **both** axes.
    ///
    /// Width matters as much as height here and J4 is the reason it is checked: a section link
    /// reading "The wire" is two words of accent text, and a height-only assertion passes on a
    /// target 30pt wide. `OmenSectionLink` floors both, and this is what holds it there.
    ///
    /// **This deliberately does not tap.** J1's first draft did, and two of its tests failed
    /// claiming controls were "missing" — because tapping the control before them had navigated
    /// the screen away. Those were the test's bug, not the product's. Tapping is asserted
    /// separately by `assertTapDoesNotBreak`.
    ///
    /// The tolerance is 0.5pt rather than an exact 44, carried from J1, J2 and J4 for the reason
    /// recorded there: `Reconnect ESPN` measured 43.99999999999994, which is CGFloat layout
    /// arithmetic and not a thumb-sized problem.
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
        XCTAssertGreaterThanOrEqual(
            frame.height, 43.5,
            "\(label) is \(frame.height)pt tall, under the 44pt minimum", file: file, line: line
        )
        XCTAssertGreaterThanOrEqual(
            frame.width, 43.5,
            "\(label) is \(frame.width)pt wide, under the 44pt minimum", file: file, line: line
        )
    }

    /// Bring `element` into the viewport. Five of J5's six frames are declared scrolls, so a
    /// control below the fold is not a defect. A control that never becomes hittable still
    /// fails, which is the case worth catching.
    private func scrollIntoView(_ element: XCUIElement, attempts: Int = 8) {
        var remaining = attempts
        while !element.isHittable && remaining > 0 {
            XCUIApplication().swipeUp()
            remaining -= 1
        }
    }

    private func assertTapDoesNotBreak(
        _ element: XCUIElement,
        _ app: XCUIApplication,
        file: StaticString = #filePath,
        line: UInt = #line
    ) {
        scrollIntoView(element)
        element.tap()
        XCTAssertEqual(app.state, .runningForeground, "the app left the foreground after a tap", file: file, line: line)
    }

    /// The contextual-help button labels itself "What is this? <topic title>", so it is matched
    /// by prefix rather than by a title this test would have to keep in sync with
    /// `OmenContextualHelpContent`.
    private func helpButton(_ app: XCUIApplication) -> XCUIElement {
        app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "What is this?")).firstMatch
    }

    private func text(containing fragment: String, in app: XCUIApplication) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", fragment)).firstMatch
    }

    private func anyElement(containing fragment: String, in app: XCUIApplication) -> XCUIElement {
        app.descendants(matching: .any)
            .matching(NSPredicate(format: "label CONTAINS %@", fragment))
            .firstMatch
    }

    /// Every J5 scenario, so a per-screen regression cannot hide behind a representative one.
    private static let allScenarios = [
        "journey-j5.nominal.01-league-table",
        "journey-j5.nominal.02-league-waiver",
        "journey-j5.nominal.03-waiver-no-move",
        "journey-j5.degraded.01-league-degraded",
        "journey-j5.degraded.02-league-no-rosters",
        "journey-j5.degraded.03-waiver-not-determined"
    ]

    // MARK: - E017, on every screen that carries it

    /// The header slot carries **both** controls, help then account, on all six screens.
    ///
    /// Not once on a representative screen: the founder's 2026-09-18 resolution covers 25 of the
    /// 30 artboards, and the way that regresses is one screen at a time.
    func testEveryJ5ScreenCarriesBothHeaderControls() {
        continueAfterFailure = true
        for scenario in Self.allScenarios {
            let app = launch(scenario)
            assertTappable(helpButton(app), "\(scenario): the help control")
            assertTappable(app.buttons["Account"], "\(scenario): the account control")
            app.terminate()
        }
    }

    // MARK: - The Table

    /// The scout's-nest order, asserted as an order rather than as a set of present sections.
    ///
    /// Fact-of-record #16 as amended 2026-09-13: **your week → The Table → Trade targets →
    /// Waiver → Activity**. The order carries the argument — terrain, then opportunity, then
    /// movement — and Activity is last because it is partial on ESPN and Yahoo, and a degraded
    /// section high on a screen teaches people the whole screen is unreliable.
    ///
    /// A test that only asserted the five sections exist would pass on every permutation,
    /// including the one that puts the flakiest section at the top.
    func testTheTableRunsInScoutsNestOrder() {
        let app = launch("journey-j5.nominal.01-league-table")
        let headers = ["The table", "Trade targets", "Waiver", "Activity"]
        var lastY: CGFloat = -.greatestFiniteMagnitude
        for header in headers {
            let element = app.staticTexts[header]
            XCTAssertTrue(element.waitForExistence(timeout: 10), "the \(header) section header is missing")
            scrollIntoView(element)
            let y = element.frame.minY
            XCTAssertGreaterThan(
                y, lastY,
                "\(header) is above the section that should precede it — the scout's-nest order is broken"
            )
            lastY = y
        }
    }

    /// The Waiver section's route to the wire is a real target, not two words of accent text.
    ///
    /// The link is also the **only** route to `LeagueWaiver`, `WaiverNoMove` and
    /// `WaiverNotDetermined`, because Waiver is a section inside League rather than a fifth tab.
    /// If this control is not tappable those three screens are unreachable in the product while
    /// still photographing perfectly.
    func testTheWaiverSectionLinksToTheWireAsARealTarget() {
        let app = launch("journey-j5.nominal.01-league-table")
        let link = app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "The wire")).firstMatch
        assertTappable(link, "the Waiver section's link to the wire")
        assertTapDoesNotBreak(link, app)
    }

    /// The activity list is **unread, not empty**, and the screen says which.
    ///
    /// This is the distinction `LeagueDegraded` exists to draw, and the nominal Table screen is
    /// where it is easiest to lose: the list has real rows, so a partial read looks complete.
    /// The note names the missing family and the provider.
    func testAPartialActivityListSaysItIsUnreadRatherThanEmpty() {
        let app = launch("journey-j5.nominal.01-league-table")
        let note = text(containing: "unread rather than empty", in: app)
        scrollIntoView(note)
        XCTAssertTrue(note.exists, "the partial activity list does not say it is unread rather than empty")
        XCTAssertTrue(
            text(containing: "Transactions unavailable for ESPN", in: app).exists,
            "the missing activity family is not named"
        )
        // "Partial", not "Live". The section's own status word has to disagree with the rows.
        XCTAssertTrue(app.staticTexts["Partial"].exists, "the Activity section claims to be Live while carrying an unread note")
    }

    // MARK: - LeagueDegraded

    /// The degraded pass names what it could not read **and** what it read and did not use.
    ///
    /// `capability-expression-v1.md` asks a degraded frame to carry both classes, because they
    /// are the two that get conflated. Losing either one is a silent change in what the screen
    /// claims, and neither is visible in a screenshot diff.
    func testTheDegradedTableNamesBothCapabilityClasses() {
        let app = launch("journey-j5.degraded.01-league-degraded")

        // Unavailable — named, in the failed section's own place, in words.
        XCTAssertTrue(
            anyElement(containing: "Trade rosters", in: app).waitForExistence(timeout: 10),
            "the unavailable trade-roster capability is not named"
        )
        let activity = anyElement(containing: "League activity", in: app)
        scrollIntoView(activity)
        XCTAssertTrue(activity.exists, "the unavailable activity capability is not named")

        // Read and not used — in the foot line, with no evidence styling.
        let footnote = text(containing: "did not change anything on this screen", in: app)
        scrollIntoView(footnote)
        XCTAssertTrue(footnote.exists, "the read-but-unused capability is not named in the foot line")
    }

    /// A refusing provider may stop refusing, so `LeagueDegraded` — and only it — offers a retry.
    func testTheDegradedTableOffersARetryBecauseRetryingCouldChangeTheAnswer() {
        let app = launch("journey-j5.degraded.01-league-degraded")
        let retry = app.buttons["Retry ESPN"]
        assertTappable(retry, "the degraded table's retry")
        assertTapDoesNotBreak(retry, app)
    }

    // MARK: - LeagueNoRosters

    /// **A permanent provider limit, not an outage — so there is no retry, ever.**
    ///
    /// `CONTRACTS.md` is explicit: "Do not build a retry for it." A retry button on a permanent
    /// limit is a promise the product cannot keep, and the user presses it every week. This is
    /// the assertion that stops a well-meaning later edit from adding one for symmetry with
    /// `LeagueDegraded`, which is one screen away and does carry one.
    func testTheNoRostersScreenOffersNoRetryAnywhere() {
        let app = launch("journey-j5.degraded.02-league-no-rosters")
        XCTAssertTrue(
            anyElement(containing: "Trade rosters", in: app).waitForExistence(timeout: 10),
            "the permanently unavailable capability is not named"
        )
        for title in ["Try again", "Retry", "Retry Yahoo", "Retry ESPN", "Reload"] {
            XCTAssertFalse(
                app.buttons[title].exists,
                "\(title) is offered on a permanent provider limit — retrying cannot change it"
            )
        }
        // "Not possible here", not "Unavailable". The two words a user must be able to tell
        // apart are "came back empty this time" and "cannot happen here".
        XCTAssertTrue(
            app.staticTexts["Not possible here"].exists,
            "the trade-target section reads as a transient outage rather than a permanent limit"
        )
        // And the second sentence, which says what the limit costs the reader.
        XCTAssertTrue(
            text(containing: "permanent limit of the provider", in: app).exists,
            "the permanent limit does not say what the user loses by it"
        )
    }

    // MARK: - The wire

    /// `LeagueWaiver` carries a bid only because this payload carries one.
    ///
    /// `best_move.bid` is **null, never `0`**, when any input is missing — so a bid line is
    /// evidence that a bid was returned, and its absence must never be rendered as "$0". The
    /// companion assertion lives in `testNoJ5ScreenPrintsADollarZeroBid`.
    func testTheWireCarriesTheBidAndTheScopeItWasComputedAgainst() {
        let app = launch("journey-j5.nominal.02-league-waiver")
        XCTAssertTrue(
            text(containing: "Suggested bid", in: app).waitForExistence(timeout: 10),
            "the wire does not carry the suggested bid this payload returned"
        )
        // The FAAB scope strip, which this league is positively determined to use.
        XCTAssertTrue(anyElement(containing: "Your budget", in: app).exists, "the FAAB budget is missing")
        XCTAssertTrue(anyElement(containing: "Claim order", in: app).exists, "the claim order is missing")
    }

    /// **The §6.2 gate, driven.**
    ///
    /// `not_determined` gets **neither** a budget nor a claim order — not a dashed one, not a
    /// greyed one, none. A dashed budget is still a claim that this is a budget league, and ESPN
    /// and Yahoo both return `not_determined` today, so this is the common case rather than the
    /// exotic one.
    ///
    /// The screen must also **name** the three answers it is withholding, which is acceptance
    /// rule 4 for the `waiver` profile.
    func testTheNotDeterminedWireWithholdsBudgetAndClaimOrderAndSaysSo() {
        let app = launch("journey-j5.degraded.03-waiver-not-determined")

        XCTAssertTrue(
            text(containing: "could not tell which waiver system", in: app).waitForExistence(timeout: 10),
            "the not-determined wire does not state its own premise"
        )
        XCTAssertFalse(
            anyElement(containing: "Your budget", in: app).exists,
            "a budget is shown for a league whose waiver system was never determined"
        )
        XCTAssertFalse(
            anyElement(containing: "Claim order", in: app).exists,
            "a claim order is shown for a league whose waiver system was never determined"
        )
        XCTAssertFalse(
            text(containing: "Suggested bid $", in: app).exists,
            "a bid figure is shown without a confirmed budget"
        )

        // The three withheld answers, each named, each with what it needed.
        for withheld in ["Suggested bid", "Your claim order", "Odds you win the claim"] {
            XCTAssertTrue(
                anyElement(containing: withheld, in: app).exists,
                "\(withheld) is not named as withheld — the reader is not told which answer is missing"
            )
        }

        // The player read survives, which is the whole argument of this screen.
        XCTAssertTrue(
            anyElement(containing: "Jaylen Wright", in: app).exists,
            "the player read was dropped along with the waiver system it does not depend on"
        )
    }

    /// Claim probability is **never** returned, for any league — so no screen may imply Omen
    /// would produce odds if only it knew more.
    ///
    /// The withheld row is worded "Omen never estimates this, in any league" rather than the
    /// artboard's "needs both", precisely because "needs both" implies the opposite.
    func testTheWireNeverPromisesOddsItWillNeverHave() {
        let app = launch("journey-j5.degraded.03-waiver-not-determined")
        XCTAssertTrue(
            anyElement(containing: "never estimates this", in: app).waitForExistence(timeout: 10),
            "claim probability is presented as something a better read could supply"
        )
    }

    /// `WaiverNoMove` is an answer, not a failure — and it says what doing nothing costs.
    func testTheNoMoveWireStatesTheCostOfDoingNothing() {
        let app = launch("journey-j5.nominal.03-waiver-no-move")
        XCTAssertTrue(
            text(containing: "Nothing on this wire beats what you have", in: app).waitForExistence(timeout: 10),
            "the no-move wire does not state its answer"
        )
        XCTAssertTrue(
            app.staticTexts["What it would have cost"].exists,
            "the no-move wire does not say what the move would have cost"
        )
    }

    // MARK: - Contract facts no J5 screen may break

    /// Confidence is a **band**, never a percentage — on all six screens.
    func testNoJ5ScreenPrintsAConfidencePercentage() {
        continueAfterFailure = true
        for scenario in Self.allScenarios {
            let app = launch(scenario)
            let percent = app.descendants(matching: .any)
                .matching(NSPredicate(format: "label MATCHES %@", ".*[0-9]+% *(confiden|certain|sure).*"))
                .firstMatch
            XCTAssertFalse(
                percent.exists,
                "\(scenario) prints a confidence percentage: \(percent.label)"
            )
            app.terminate()
        }
    }

    /// **`best_move.bid` is null, never `0`.** A "$0" suggestion is a recommendation to bid
    /// nothing, which is a different and wrong piece of advice — so it must appear nowhere.
    func testNoJ5ScreenPrintsADollarZeroBid() {
        continueAfterFailure = true
        for scenario in Self.allScenarios {
            let app = launch(scenario)
            for forbidden in ["Suggested bid $0", "$0 of", "bid $0"] {
                XCTAssertFalse(
                    text(containing: forbidden, in: app).exists,
                    "\(scenario) renders a missing bid as \(forbidden)"
                )
            }
            app.terminate()
        }
    }

    /// Capabilities render as **words, never glyphs**, and an `unavailable` one must survive
    /// truncation — so it is spelled out rather than abbreviated to a mark.
    func testUnavailableCapabilitiesAreNamedInWords() {
        continueAfterFailure = true
        for scenario in ["journey-j5.degraded.01-league-degraded",
                         "journey-j5.degraded.02-league-no-rosters",
                         "journey-j5.degraded.03-waiver-not-determined"] {
            let app = launch(scenario)
            XCTAssertTrue(
                anyElement(containing: "Unavailable", in: app).waitForExistence(timeout: 10),
                "\(scenario) carries no capability named Unavailable in words"
            )
            app.terminate()
        }
    }

    // MARK: - D11, measured

    /// The **declared fit**, asserted.
    ///
    /// `WaiverNoMove.dc.html` is the one J5 artboard the canvas README declares a fit, so it is
    /// the one D11 binds. The other five are declared scrolls and are measured by
    /// `testEveryDeclaredScrollReportsItsOverflow` instead — asserting a bound on them would
    /// fail them for doing exactly what the README says they do.
    func testTheDeclaredFitActuallyFits() {
        let app = launch("journey-j5.nominal.03-waiver-no-move")
        let probe = app.descendants(matching: .any)["j5.fit.waiver-no-move"]
        XCTAssertTrue(probe.waitForExistence(timeout: 15), "WaiverNoMove published no fit measurement")
        guard let overflow = Self.overflow(from: probe.value as? String) else {
            return XCTFail("WaiverNoMove reported an unreadable measurement: \(String(describing: probe.value))")
        }
        print("D11 journey-j5.nominal.03-waiver-no-move: \(String(describing: probe.value)) overflow=\(overflow)pt declared=fit")
        XCTAssertLessThanOrEqual(
            overflow, 0,
            "WaiverNoMove is declared a fit in the canvas README and overflows by \(overflow)pt"
        )
    }

    /// The five declared scrolls, each publishing a number.
    ///
    /// **This prints rather than asserts a bound**, which is deliberate. D11 binds declared fits.
    /// A declared scroll with 12pt of overflow is still a different screen from one with 400pt,
    /// and knowing by how much a scroller scrolls is what tells the next person whether an edit
    /// made it worse.
    func testEveryDeclaredScrollReportsItsOverflow() {
        continueAfterFailure = true
        for screen in Self.scrollProbes {
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
    /// cannot fail is not a check. This journey reuses J2's corrected probe, and reuse is not
    /// proof.
    ///
    /// So: two scenarios of the **same screen** — both are `OmenLeagueTableScreen` behind the
    /// same `j5.fit.league-table` probe — that differ by several real blocks of content.
    ///
    /// It asserts the two measurements **differ** rather than asserting an ordering, and that is
    /// a deliberate limit rather than a weaker test. The degraded frame trades two table rows and
    /// the cut line for a notice, two dashed unread blocks, a retry and a foot strip, so neither
    /// frame is a superset of the other and I have no principled basis for predicting which is
    /// taller. A probe that reports a constant — which is exactly the defect J2 shipped — fails
    /// this, because it would report the same number for both.
    func testTheFitProbeActuallyDetectsInjectedHeight() {
        let nominal = Self.measure("journey-j5.nominal.01-league-table", self)
        let degraded = Self.measure("journey-j5.degraded.01-league-degraded", self)
        guard let nominal, let degraded else {
            return XCTFail(
                "could not measure one of the two table frames — nominal=\(String(describing: nominal)) degraded=\(String(describing: degraded))"
            )
        }
        print("D11 probe sanity: table nominal=\(nominal)pt degraded=\(degraded)pt delta=\(degraded - nominal)pt")
        XCTAssertNotEqual(
            degraded, nominal,
            "the fit probe reported the same height for two frames with different content — it is not measuring anything"
        )
    }

    /// The five declared scrolls. `WaiverNoMove` is absent on purpose: it is the declared fit and
    /// `testTheDeclaredFitActuallyFits` binds it.
    private static let scrollProbes: [(scenario: String, probe: String)] = [
        ("journey-j5.nominal.01-league-table", "j5.fit.league-table"),
        ("journey-j5.nominal.02-league-waiver", "j5.fit.league-wire"),
        ("journey-j5.degraded.01-league-degraded", "j5.fit.league-table"),
        ("journey-j5.degraded.02-league-no-rosters", "j5.fit.league-table"),
        ("journey-j5.degraded.03-waiver-not-determined", "j5.fit.waiver-not-determined")
    ]

    private static func measure(_ scenario: String, _ test: J5InteractionUITests) -> Int? {
        let known: [String: String] = Dictionary(
            uniqueKeysWithValues: scrollProbes.map { ($0.scenario, $0.probe) }
        )
        guard let probe = known[scenario] else { return nil }
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
                // 1084 arrives as `content=1,084` — and `Int("1,084")` is nil, which an earlier
                // parser reported as "an unreadable measurement". J4 found and fixed this;
                // inherited here because J5's table frames are taller than J4's and every one of
                // them reaches four digits.
                let digits = part[part.index(after: equals)...].filter(\.isNumber)
                return digits.isEmpty ? nil : Int(digits)
            }
        guard numbers.count == 2, numbers[1] > 0 else { return nil }
        return numbers[0] - numbers[1]
    }
}
