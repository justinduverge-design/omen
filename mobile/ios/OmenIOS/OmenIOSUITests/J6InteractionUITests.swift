import XCTest

/// J6's two screens, driven rather than photographed — and their two scrolls, measured.
///
/// ## Why this exists
///
/// `screen-journeys-v1.md`: a journey capture *"is a storyboard, not a flow test."* Modelled on
/// `J4InteractionUITests`, which is the best of the five — it floors **both** axes at 44pt rather
/// than height alone, it taps once per screen to prove the tap survives, and it prints every D11
/// measurement whether or not anything failed.
///
/// ## What J6 adds that no other journey has
///
/// The Ledger's honesty rule is **narrower** than the general one. `CONTRACTS.md`: *"verified
/// outcomes, self-reported action, and unknown follow-through stay visually and semantically
/// separate."* That is a claim about what must never be blended, and blending is exactly the kind
/// of regression a screenshot cannot show — two chips that read fine individually can be merged
/// into one sentence by a well-meaning edit and the picture still looks right.
///
/// So this file asserts the separation in the accessibility tree, which is where the semantics
/// live: a self-reported row must carry the word "Self-reported" as its own statement, and an
/// unknown follow-through must say so rather than render an empty slot that a reader completes
/// as "followed".
///
/// And it asserts the thing the previous agent's contract fix was for:
/// **a raw `win` or `loss` never appears on either screen.**
final class J6InteractionUITests: XCTestCase {

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

    /// 44x44 points, per Apple's HIG, with J1/J2/J4's 0.5pt tolerance for CGFloat layout
    /// arithmetic — `Reconnect ESPN` once measured 43.99999999999994 and an exact comparison
    /// teaches the next person to delete the assertion.
    private func assertTappable(_ element: XCUIElement, _ label: String, file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertTrue(element.waitForExistence(timeout: 10), "\(label) is missing", file: file, line: line)
        scrollIntoView(element)
        XCTAssertTrue(element.isHittable, "\(label) exists but cannot be tapped", file: file, line: line)
        let frame = element.frame
        XCTAssertGreaterThanOrEqual(frame.height, 43.5, "\(label) is \(frame.height)pt tall, under the 44pt minimum", file: file, line: line)
        XCTAssertGreaterThanOrEqual(frame.width, 43.5, "\(label) is \(frame.width)pt wide, under the 44pt minimum", file: file, line: line)
    }

    /// **Both J6 artboards are declared scrolls**, so a control below the fold is not a defect.
    /// A control that never becomes hittable still fails, which is the case worth catching.
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

    private func text(containing fragment: String, in app: XCUIApplication) -> XCUIElement {
        app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", fragment)).firstMatch
    }

    /// Every label the app is currently rendering, buttons included.
    ///
    /// The raw-token sweep below has to read buttons as well as static texts: a Ledger row **is**
    /// a button, and its accessibility label is where the outcome word actually lives. A sweep
    /// over `staticTexts` alone would pass while every row said "win".
    private func allLabels(in app: XCUIApplication) -> [String] {
        app.staticTexts.allElementsBoundByIndex.map(\.label)
            + app.buttons.allElementsBoundByIndex.map(\.label)
    }

    private static let scenarios = [
        "journey-j6.nominal.01-ledger",
        "journey-j6.nominal.02-ledger-detail",
        "journey-j6.degraded.01-ledger",
        "journey-j6.degraded.02-ledger-detail"
    ]

    // MARK: - E017, on both screens

    /// The header slot carries **both** controls, help then account.
    ///
    /// The founder's 2026-09-18 resolution covers 25 of the 30 artboards and the way it regresses
    /// is one screen at a time, so this checks all four frames rather than a representative one.
    func testEveryJ6ScreenCarriesBothHeaderControls() {
        continueAfterFailure = true
        for scenario in Self.scenarios {
            let app = launch(scenario)
            assertTappable(helpButton(app), "\(scenario): contextual help")
            assertTappable(app.buttons["Account and profile"], "\(scenario): account control")
            app.terminate()
        }
    }

    // MARK: - The contract fix, pinned at the surface

    /// **A raw `win` or `loss` never reaches a reader.**
    ///
    /// `CONTRACTS.md` on `LedgerDetail`: the stored `outcome` column holds raw `win`/`loss` and
    /// *"is translated, never surfaced raw"*. `MovesHistoryTests.testARawWinIsNeverSurfaced`
    /// pins the mapping at the unit level. This pins it at the only level that matters to the
    /// claim — the screen — and it is the assertion that would have caught the live defect this
    /// journey opened with, where `MovesHistory.swift` rendered "Outcome: win".
    ///
    /// Whole-word matching, deliberately. A substring sweep for "win" would fire on "Wright",
    /// "showing" and "winner", and a check that cries wolf gets deleted.
    func testNoJ6ScreenPrintsARawProviderOutcomeToken() {
        continueAfterFailure = true
        let raw = try! NSRegularExpression(
            pattern: "(?i)\\b(win|loss|did_not_work|not_verified|worked)\\b"
        )
        // The translated vocabulary. `moves-history.v2`'s three outputs render as English —
        // "Worked", "Didn't work", "Not verified" — and "Worked" is a legitimate rendered word,
        // so the sweep exempts the exact translated forms and fires on everything else.
        let translated: Set<String> = ["worked"]
        for scenario in Self.scenarios {
            let app = launch(scenario)
            XCTAssertTrue(app.staticTexts.firstMatch.waitForExistence(timeout: 15), "\(scenario) rendered no text")
            for label in allLabels(in: app) {
                let range = NSRange(label.startIndex..., in: label)
                for match in raw.matches(in: label, range: range) {
                    guard let matched = Range(match.range, in: label).map({ String(label[$0]).lowercased() }) else { continue }
                    if translated.contains(matched) { continue }
                    XCTFail(
                        "\(scenario) surfaces the raw token \"\(matched)\" in: \"\(label)\" — "
                            + "the stored column is translated, never surfaced raw"
                    )
                }
            }
            app.terminate()
        }
    }

    // MARK: - Ledger

    /// **The three states stay separate, in words.**
    ///
    /// Not a colour assertion and not a screenshot: the rule is semantic, so it is asserted on
    /// the accessibility label, which is both what a VoiceOver user hears and the place a
    /// blending edit would show up first.
    ///
    ///   - a verified followed row says "Followed" and does **not** say "Self-reported",
    ///   - a self-reported row says both, its own word for the claim,
    ///   - and the artboard's second row is a **pass** — the one row whose action Omen did not
    ///     observe, and the one most likely to be quietly promoted to a verified pass.
    func testTheLedgerKeepsVerifiedAndSelfReportedApart() {
        let app = launch("journey-j6.nominal.01-ledger")

        let verified = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Trade Kupp for Nacua")).firstMatch
        assertTappable(verified, "a verified Ledger row")
        XCTAssertTrue((verified.label as String).contains("Followed"), "verified row: \(verified.label)")
        XCTAssertFalse(
            (verified.label as String).contains("Self-reported"),
            "a verified row is labelled self-reported: \(verified.label)"
        )

        let selfReported = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Claim Wright, drop Johnson")).firstMatch
        assertTappable(selfReported, "a self-reported Ledger row")
        XCTAssertTrue(
            (selfReported.label as String).contains("Self-reported"),
            "a self-reported row does not say so: \(selfReported.label)"
        )
        XCTAssertTrue(
            (selfReported.label as String).contains("You passed"),
            "the passed action is missing from the row: \(selfReported.label)"
        )

        assertTapDoesNotBreak(verified, app)
    }

    /// **A loss is on the nominal screen.**
    ///
    /// The journey's own closing line is *"Losses stay in the Ledger — a record that only shows
    /// wins is marketing."* A Ledger whose nominal pass showed only wins would make that
    /// sentence decorative, so the fixture carries a loss and this is what keeps it there.
    func testTheNominalLedgerShowsALossAndAPendingCall() {
        let app = launch("journey-j6.nominal.01-ledger")
        let loss = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Bench Kyren Williams")).firstMatch
        XCTAssertTrue(loss.waitForExistence(timeout: 10), "the nominal Ledger shows no losing call")
        XCTAssertTrue(
            (loss.label as String).contains("Didn\u{2019}t work"),
            "the losing row does not state its outcome: \(loss.label)"
        )
        XCTAssertTrue(
            text(containing: "Outcome pending", in: app).waitForExistence(timeout: 10),
            "no open call is shown as pending"
        )
    }

    /// **Unknown follow-through is a statement, not an empty slot.**
    ///
    /// `OmenLedgerAction.unknown` exists because a row that silently omits the action reads as a
    /// followed one — the flattering reading and the wrong one. This asserts the words are there.
    func testUnknownFollowThroughIsSaidRatherThanLeftBlank() {
        let app = launch("journey-j6.degraded.01-ledger")
        let unknown = app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Claim Jaylen Wright")).firstMatch
        XCTAssertTrue(unknown.waitForExistence(timeout: 10), "the unknown-follow-through row is missing")
        XCTAssertTrue(
            (unknown.label as String).contains("Follow-through unknown"),
            "an unread follow-through renders as nothing: \(unknown.label)"
        )
    }

    /// The degraded Ledger's two required capability classes, in words on one screen.
    ///
    /// Class 3, *could not read*: named with a sentence, and placed where truncation cannot
    /// reach it. Class 2, *read, not used*: named and explicitly disclaimed as evidence.
    func testTheDegradedLedgerNamesWhatItCouldNotReadAndWhatItIgnored() {
        let app = launch("journey-j6.degraded.01-ledger")
        XCTAssertTrue(
            text(containing: "Move outcomes", in: app).waitForExistence(timeout: 10),
            "the unavailable capability is not named"
        )
        XCTAssertTrue(
            text(containing: "not because the call was wrong", in: app).waitForExistence(timeout: 10),
            "the unavailable capability carries no sentence saying what it costs the reader"
        )
        XCTAssertTrue(
            text(containing: "League scoring", in: app).waitForExistence(timeout: 10),
            "the read-but-unused capability is not named"
        )
        XCTAssertTrue(
            text(containing: "did not change any row here", in: app).waitForExistence(timeout: 10),
            "the read-but-unused capability is not disclaimed as evidence"
        )
    }

    // MARK: - LedgerDetail

    /// **The receipt is an immutable snapshot and says so, with a zone-qualified issue time.**
    ///
    /// `CONTRACTS.md`: *"`issued_at` carries `issued_at_timezone`."* The artboard draws a
    /// wall-clock time, which is only meaningful in a zone — so this asserts the rendered time is
    /// the Eastern one the fixture's zone implies, not the UTC the timestamp literally holds.
    /// 07:00Z in `America/New_York` is 3:00 AM; a bare-UTC regression would render "7:00 AM" and
    /// this is what catches it.
    func testTheReceiptStatesWhenItWasIssuedInItsOwnZoneAndThatItIsImmutable() {
        let app = launch("journey-j6.nominal.02-ledger-detail")
        XCTAssertTrue(
            text(containing: "3:00 AM", in: app).waitForExistence(timeout: 10),
            "the issue time is not rendered in the receipt's own zone — a bare UTC timestamp reads as the wrong day"
        )
        XCTAssertFalse(
            text(containing: "7:00 AM", in: app).exists,
            "the receipt renders the raw UTC wall clock"
        )
        // Case-insensitive, deliberately. `.scope` is a **combined** accessibility element:
        // its children are hidden and its label reads "Issued Tue 3:00 AM. This receipt is
        // immutable." — lowercase, mid-sentence. The first run of this test asserted on the
        // rendered word "Immutable" and reported the receipt did not say it was immutable when
        // it says so in both places. The product is right; the assertion was reading the wrong
        // tree.
        XCTAssertTrue(
            app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "immutable")).firstMatch
                .waitForExistence(timeout: 10),
            "the receipt does not say it is immutable"
        )
        XCTAssertTrue(
            text(containing: "only shows wins is marketing", in: app).waitForExistence(timeout: 10),
            "the fairness note is missing from the receipt"
        )
    }

    /// **A missing zone is stated, never guessed.**
    ///
    /// The degraded receipt arrives with `issued_at` and no `issued_at_timezone`. Rendering the
    /// UTC wall clock would tell a user checking whether Omen called it before the waiver ran the
    /// wrong day's answer, so the screen says the zone is missing instead.
    func testAReceiptWithNoZoneSaysSoRatherThanRenderingUTC() {
        let app = launch("journey-j6.degraded.02-ledger-detail")
        XCTAssertTrue(
            text(containing: "Issue time zone unavailable", in: app).waitForExistence(timeout: 10),
            "a receipt with no timezone does not say the zone is missing"
        )
        for clock in ["7:00 AM", "07:00"] {
            XCTAssertFalse(
                text(containing: clock, in: app).exists,
                "a receipt with no timezone still renders a wall clock: \(clock)"
            )
        }
    }

    /// The receipt's three evidence classes, each said in words.
    ///
    /// `capability-symbols-v1.md`: a capability renders as a **word**, never a glyph. The visual
    /// carriers — a dashed underline, a dropped chip — do not survive into the accessibility
    /// tree, so the class is spoken, and this asserts the spoken form.
    func testTheReceiptEvidenceNamesItsThreeClassesInWords() {
        let app = launch("journey-j6.degraded.02-ledger-detail")

        let used = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Read and used")).firstMatch
        XCTAssertTrue(used.waitForExistence(timeout: 10), "no evidence row is marked read and used")

        let notUsed = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Read, not used")).firstMatch
        XCTAssertTrue(notUsed.waitForExistence(timeout: 10), "no evidence row is marked read but not used")
        XCTAssertTrue(
            (notUsed.label as String).contains("Schedule strength"),
            "the read-but-unused input is not named: \(notUsed.label)"
        )

        let couldNotRead = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "Could not read")).firstMatch
        XCTAssertTrue(couldNotRead.waitForExistence(timeout: 10), "no evidence row is marked could not read")

        // `not_requested` renders **nowhere**, on any screen. Rule 2, and the one most likely to
        // be got wrong by a builder who has the whole capability list in hand.
        XCTAssertFalse(
            text(containing: "not_requested", in: app).exists,
            "a not_requested capability reached the screen"
        )
        XCTAssertFalse(
            text(containing: "Not requested", in: app).exists,
            "a not_requested capability reached the screen in prose"
        )
    }

    /// **Confidence is a band, never a percentage.**
    ///
    /// Fact-of-record #16, and the `U1` defect this guards is a client minting a number the
    /// server never sent. The receipt is the worst place for it: a percentage on a screen whose
    /// whole claim is "this was true at issue time" would be a fabricated historical fact.
    ///
    /// ## Why this is not J4's sweep
    ///
    /// J4 forbids **every** percentage on every J4 screen, and that is correct there because no
    /// J4 artboard has a legitimate one. J6's receipt does: `LedgerDetail.dc.html`'s evidence
    /// block quotes real snap shares — *"54% over two weeks, down from 71%"* — which are
    /// measurements the server sent, not confidence Omen minted.
    ///
    /// The first run of this test used J4's blunt sweep with a content exemption and failed on
    /// exactly those two sentences. An exemption list would have made the check pass by making
    /// it weaker, and the next fixture edit would have re-broken it. So the rule is split into
    /// the two things actually being claimed, and neither has an exemption:
    ///
    ///   1. **The two Ledger frames forbid every percentage.** `Ledger.dc.html` has no figure on
    ///      it at all, so any number with a `%` there is minted.
    ///   2. **No screen pairs a percentage with confidence vocabulary.** This is the defect
    ///      itself — `"\(confidence)%"` appended to a subtitle — and it fires wherever it
    ///      appears, receipt included.
    func testNoJ6ScreenPrintsAConfidencePercentage() {
        continueAfterFailure = true
        let percentage = try! NSRegularExpression(pattern: "\\b\\d{1,3}\\s?%")
        let confidenceWord = try! NSRegularExpression(
            pattern: "(?i)\\b(confidence|confident|leaning|coin.?flip|certainty|sure|odds|chance)\\b"
        )

        for scenario in Self.scenarios {
            let app = launch(scenario)
            XCTAssertTrue(app.staticTexts.firstMatch.waitForExistence(timeout: 15), "\(scenario) rendered no text")
            let ledgerFrame = scenario.contains("-ledger-detail") == false
            for label in allLabels(in: app) {
                let range = NSRange(label.startIndex..., in: label)
                guard percentage.firstMatch(in: label, range: range) != nil else { continue }
                if ledgerFrame {
                    XCTFail("\(scenario) prints a percentage: \"\(label)\" — the Ledger has no figure on it")
                    continue
                }
                XCTAssertNil(
                    confidenceWord.firstMatch(in: label, range: range),
                    "\(scenario) pairs a percentage with confidence: \"\(label)\" — confidence is a band, never a number"
                )
            }
            app.terminate()
        }
    }

    /// And the positive half: the band is rendered, **as a word**.
    ///
    /// A sweep that only forbids numbers passes on a screen that dropped confidence entirely.
    /// The nominal receipt carries `.leaning`, so "Leaning" is on screen and no digit is.
    func testTheReceiptRendersItsConfidenceAsABandWord() {
        let app = launch("journey-j6.nominal.02-ledger-detail")
        let band = app.staticTexts.matching(NSPredicate(format: "label CONTAINS[c] %@", "Leaning")).firstMatch
        XCTAssertTrue(band.waitForExistence(timeout: 10), "the receipt renders no confidence band")
        let digits = try! NSRegularExpression(pattern: "\\d")
        let label = band.label as String
        XCTAssertNil(
            digits.firstMatch(in: label, range: NSRange(label.startIndex..., in: label)),
            "the confidence band carries a number: \(label)"
        )
    }

    // MARK: - D11, measured

    /// Both J6 artboards are declared **scrolls** in `design/native-visual-lock-2026-09-13/`,
    /// so neither is required to fit — and each still owes a number.
    ///
    /// **This prints rather than asserts a bound.** D11 binds declared fits; asserting `<= 0`
    /// here would fail both screens for doing exactly what the canvas README says they do. The
    /// number is what tells the next person whether an edit made a scroll worse.
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
            print("D11 \(screen.scenario): \(String(describing: probe.value)) overflow=\(overflow)pt declared=scroll")
            app.terminate()
        }
    }

    /// The probe sanity check J2's session paid for the hard way.
    ///
    /// J2's first fit probe measured the scroll content against itself, so it reported 0 whatever
    /// was in it — **a check that cannot fail is not a check.** This journey reuses that
    /// corrected probe, and reuse is not proof.
    ///
    /// So: two scenarios of the **same screen** differing by real content. The nominal Ledger has
    /// five rows across two groups; the degraded Ledger has four rows plus an unread block and a
    /// foot line. They are not the same height unless the probe is blind, and the assertion is
    /// on inequality rather than a direction, because which of the two is taller is a fact about
    /// the fixtures rather than about the probe.
    func testTheFitProbeActuallyDetectsInjectedHeight() {
        let nominal = Self.measure("journey-j6.nominal.01-ledger", self)
        let degraded = Self.measure("journey-j6.degraded.01-ledger", self)
        guard let nominal, let degraded else {
            return XCTFail("could not measure one of the two Ledger frames — nominal=\(String(describing: nominal)) degraded=\(String(describing: degraded))")
        }
        print("D11 probe sanity: ledger nominal=\(nominal)pt degraded=\(degraded)pt delta=\(degraded - nominal)pt")
        XCTAssertNotEqual(
            degraded, nominal,
            "the fit probe reported the same height for two materially different screens — it is not measuring anything"
        )
    }

    private static let probes: [(scenario: String, probe: String)] = [
        ("journey-j6.nominal.01-ledger", "j6.fit.ledger"),
        ("journey-j6.nominal.02-ledger-detail", "j6.fit.ledger-detail"),
        ("journey-j6.degraded.01-ledger", "j6.fit.ledger"),
        ("journey-j6.degraded.02-ledger-detail", "j6.fit.ledger-detail")
    ]

    private static func measure(_ scenario: String, _ test: J6InteractionUITests) -> Int? {
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
    ///
    /// Digits only: UIKit localises the accessibility value, so a content height of 1084 arrives
    /// as `content=1,084` and `Int("1,084")` is nil. J4 found that; both J6 screens are scrolls
    /// and reach four digits.
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
