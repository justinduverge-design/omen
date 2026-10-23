import XCTest

/// A walk through the real app on a real signed-in account: every tab, every team, the main pages behind them, with a
/// screenshot of each and how long each took to show its content. Nothing is a fixture, so it shows what a person sees.
///
/// Skipped unless asked for, because it needs a device or simulator that is already signed in:
///   TEST_RUNNER_OMEN_LIVE_WALK=1 xcodebuild test -only-testing:OmenIOSUITests/LiveWalkUITests ...
/// It only reads and navigates: it never sends a trade, makes a claim, disconnects, deletes or submits anything.
final class LiveWalkUITests: XCTestCase {
    private var app: XCUIApplication!
    private var timings: [(String, Double)] = []

    override func setUpWithError() throws {
        try XCTSkipUnless(ProcessInfo.processInfo.environment["OMEN_LIVE_WALK"] == "1", "Set TEST_RUNNER_OMEN_LIVE_WALK=1 to walk the live app.")
        continueAfterFailure = true
        app = XCUIApplication()
    }

    func testWalkEveryScreen() throws {
        let launchStart = Date()
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))
        if app.buttons["Use email"].waitForExistence(timeout: 4) || app.buttons["Continue with Apple"].exists {
            snap("signed-out")
            XCTFail("The app is signed out. Sign in once on this device, then run the walk again.")
            return
        }
        settle("desk", since: launchStart, ready: app.buttons["Account and support"])
        snap("desk")

        walkTeams()
        walkOmen()
        walkTrade()
        walkLeague()
        walkLedger()
        walkAccount()
        report()
    }

    // MARK: - Areas

    /// Every team in the Rolodex: swipe, wait for that team's Desk to load, screenshot.
    private func walkTeams() {
        let counter = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", "^1 of [0-9]+$")).firstMatch
        guard counter.waitForExistence(timeout: 5), let total = Int(counter.label.split(separator: " ").last ?? "") else { return }
        let card = app.scrollViews.firstMatch
        for index in 2...max(total, 1) where total > 1 {
            let start = Date()
            card.swipeLeft()
            settle("desk team \(index)", since: start, ready: app.staticTexts["\(index) of \(total)"])
            snap("desk-team-\(index)")
            scrollAndSnap("desk-team-\(index)")
        }
    }

    private func walkOmen() {
        tab("Omen")
        settle("omen call", since: tapped, ready: nil)
        snap("omen")
        scrollAndSnap("omen")
        if tapIfPresent(app.buttons["See the full argument"]) {
            settle("full argument", since: tapped, ready: nil)
            snap("omen-full-argument")
            back()
        }
    }

    private func walkTrade() {
        tab("Trade")
        settle("trade", since: tapped, ready: app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Build a trade")).firstMatch)
        snap("trade")
        if tapIfPresent(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "See what Omen found")).firstMatch) {
            settle("find a trade", since: tapped, ready: nil)
            snap("trade-find-1")
            for index in 2...4 {
                guard tapIfPresent(app.buttons["Next trade"]) else { break }
                settle("next trade \(index)", since: tapped, ready: nil)
                snap("trade-find-\(index)")
            }
            back()
        }
        if tapIfPresent(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Build a trade")).firstMatch) {
            settle("trade builder", since: tapped, ready: nil)
            snap("trade-builder")
            back()
        }
        if tapIfPresent(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Judge an offer")).firstMatch) {
            snap("trade-judge")
            back()
        }
    }

    private func walkLeague() {
        tab("League")
        settle("league", since: tapped, ready: nil)
        snap("league")
        scrollAndSnap("league")
        if tapIfPresent(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Add ")).firstMatch) {
            settle("waivers", since: tapped, ready: nil)
            snap("waivers")
            back()
        }
    }

    private func walkLedger() {
        tab("Desk")
        let ledger = app.buttons.matching(NSPredicate(format: "label CONTAINS[c] %@", "Ledger")).firstMatch
        for _ in 0..<4 where !ledger.exists { app.swipeUp() }
        guard tapIfPresent(ledger) else { return }
        settle("ledger", since: tapped, ready: nil)
        snap("ledger")
        if tapIfPresent(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Right.")).firstMatch)
            || tapIfPresent(app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Wrong.")).firstMatch) {
            settle("receipt", since: tapped, ready: nil)
            snap("ledger-receipt")
            back()
        }
        back()
    }

    private func walkAccount() {
        tab("Desk")
        for _ in 0..<4 { app.swipeDown() }
        guard tapIfPresent(app.buttons["Account and support"]) else { return }
        settle("account", since: tapped, ready: app.buttons["Sign out"])
        snap("account")
        back()
    }

    // MARK: - Helpers

    private var tapped = Date()

    private func tab(_ name: String) {
        let button = app.buttons[name].firstMatch
        XCTAssertTrue(button.waitForExistence(timeout: 10), "the \(name) tab is missing")
        tapped = Date()
        button.tap()
    }

    @discardableResult
    private func tapIfPresent(_ element: XCUIElement) -> Bool {
        guard element.waitForExistence(timeout: 4), element.isHittable else { return false }
        tapped = Date()
        element.tap()
        return true
    }

    private func back() {
        let back = app.navigationBars.buttons.firstMatch
        if back.exists && back.isHittable { back.tap() } else { app.swipeRight() }
        sleepBriefly()
    }

    /// Waits until no spinner is showing (and the given element, if any, exists), then records how long that took.
    private func settle(_ label: String, since start: Date, ready element: XCUIElement?, timeout: TimeInterval = 30) {
        let deadline = Date().addingTimeInterval(timeout)
        sleepBriefly()
        while Date() < deadline {
            let spinning = app.activityIndicators.allElementsBoundByIndex.contains { $0.exists && $0.isHittable }
            let present = element?.exists ?? true
            if !spinning && present { break }
            RunLoop.current.run(until: Date().addingTimeInterval(0.1))
        }
        let seconds = Date().timeIntervalSince(start)
        timings.append((label, seconds))
        if seconds >= timeout { XCTFail("\(label) still loading after \(Int(timeout)) s") }
    }

    private func scrollAndSnap(_ name: String) {
        for page in 2...3 {
            app.swipeUp()
            sleepBriefly()
            snap("\(name)-scroll\(page)")
        }
        for _ in 0..<3 { app.swipeDown() }
    }

    private func snap(_ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    private func sleepBriefly() { RunLoop.current.run(until: Date().addingTimeInterval(0.6)) }

    private func report() {
        let lines = timings.map { String(format: "%-22@ %6.2f s", $0.0 as NSString, $0.1) }
        let text = (["[live-walk] seconds from tap to content (no spinner)"] + lines).joined(separator: "\n")
        print(text)
        let attachment = XCTAttachment(string: text)
        attachment.name = "timings"
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
