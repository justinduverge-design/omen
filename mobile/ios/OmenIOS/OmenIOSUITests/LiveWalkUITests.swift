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
        // The app reopens on the last tab used, so the walk starts from the Desk on purpose.
        tab("Desk")
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

    // MARK: - Walkthrough: every team, judged

    /// For each team: the Desk (with the roster), the Omen call, the trades Omen found and the waiver move, each saved as
    /// text so the advice can be judged against the roster, each audited for clipped text, small targets and contrast.
    func testWalkthroughEveryTeam() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))
        if app.buttons["Use email"].waitForExistence(timeout: 4) {
            XCTFail("The app is signed out. Sign in once on this device, then run the walk again.")
            return
        }
        tab("Desk")
        settle("desk", since: tapped, ready: app.buttons["Account and support"])
        guard let (current, total) = teamPosition() else {
            XCTFail("no teams on the Desk")
            return
        }
        let card = app.scrollViews.firstMatch
        for _ in 0..<(current - 1) { card.swipeRight(); sleepBriefly() }
        for team in 1...total {
            tab("Desk")
            for _ in 0..<4 { app.swipeDown() }
            if team > 1 {
                let start = Date()
                app.scrollViews.firstMatch.swipeLeft()
                settle("team \(team): switch", since: start, ready: nil)
            }
            let tag = "t\(team)"
            audit("\(tag)-desk")
            snap("\(tag)-desk")
            collectText("\(tag)-desk")

            tab("Omen")
            settle("team \(team): omen", since: tapped, ready: nil)
            audit("\(tag)-omen")
            snap("\(tag)-omen")
            collectText("\(tag)-omen")

            tab("Trade")
            settle("team \(team): trade", since: tapped, ready: nil)
            if tapIfPresent(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "See what Omen found")).firstMatch) {
                settle("team \(team): find", since: tapped, ready: nil)
                audit("\(tag)-find")
                var trades: [String] = []
                for index in 1...3 {
                    snap("\(tag)-find-\(index)")
                    trades.append("--- trade \(index)\n" + screenText().joined(separator: "\n"))
                    guard tapIfPresent(app.buttons["Next trade"]) else { break }
                    settle("team \(team): next trade", since: tapped, ready: nil)
                }
                attach("\(tag)-find", trades.joined(separator: "\n"))
                back()
            }

            tab("League")
            settle("team \(team): league", since: tapped, ready: nil)
            collectText("\(tag)-league")
            if tapIfPresent(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Drop ")).firstMatch) {
                settle("team \(team): waivers", since: tapped, ready: nil)
                audit("\(tag)-waivers")
                snap("\(tag)-waivers")
                collectText("\(tag)-waivers")
                back()
            }
        }
        attach("audit", auditIssues.isEmpty ? "no audit issues" : auditIssues.joined(separator: "\n"))
        attach("layout", layoutIssues.isEmpty ? "no collisions" : layoutIssues.joined(separator: "\n"))
        report()
    }

    /// Scrolling and swiping smoothness: iOS's own hitch measurement while the Desk scrolls and the Rolodex swipes.
    func testScrollAndSwipeFeel() throws {
        app.launch()
        XCTAssertTrue(app.wait(for: .runningForeground, timeout: 30))
        tab("Desk")
        settle("desk", since: tapped, ready: app.buttons["Account and support"])
        let options = XCTMeasureOptions()
        options.invocationOptions = [.manuallyStop]
        options.iterationCount = 5
        measure(metrics: [XCTOSSignpostMetric.scrollingAndDecelerationMetric], options: options) {
            app.swipeUp(velocity: .fast)
            stopMeasuring()
            app.swipeDown(velocity: .fast)
        }
        let rolodex = app.scrollViews.firstMatch
        measure(metrics: [XCTOSSignpostMetric.scrollingAndDecelerationMetric], options: options) {
            rolodex.swipeLeft(velocity: .fast)
            stopMeasuring()
            rolodex.swipeRight(velocity: .fast)
        }
    }

    private var auditIssues: [String] = []

    /// Buttons, cards and text that run into each other or off the side of the screen. Two elements collide when their
    /// frames overlap and neither contains the other; anything only partly on screen sideways is cut off. Things fully
    /// off screen (the next Rolodex card) and anything under the tab bar (content scrolls beneath it) are left alone.
    private func layoutCheck(_ name: String) {
        guard let snapshot = try? app.snapshot() else { return }
        let screen = app.frame
        let tabBarTop = screen.maxY - 100
        var items: [(String, CGRect)] = []
        func walk(_ node: XCUIElementSnapshot) {
            let frame = node.frame
            let label = node.label.trimmingCharacters(in: .whitespacesAndNewlines)
            if [.button, .staticText].contains(node.elementType), !label.isEmpty, frame.width > 1, frame.height > 1,
               frame.intersects(screen), frame.maxY < tabBarTop {
                items.append((label, frame))
                if frame.minX < screen.minX - 0.5 || frame.maxX > screen.maxX + 0.5 {
                    layoutIssues.append("\(name): cut off at the screen edge — \"\(label)\"")
                }
            }
            node.children.forEach(walk)
        }
        walk(snapshot)
        for i in items.indices {
            for j in items.indices where j > i {
                let (a, fa) = items[i], (b, fb) = items[j]
                let overlap = fa.intersection(fb)
                guard !overlap.isNull, overlap.width > 2, overlap.height > 2 else { continue }
                if fa.contains(fb) || fb.contains(fa) { continue }
                layoutIssues.append("\(name): \"\(a)\" runs into \"\(b)\" (\(Int(overlap.width))×\(Int(overlap.height)) pt)")
            }
        }
    }

    private var layoutIssues: [String] = []

    /// Clipped text, small tap targets and low contrast on the live screen. Recorded, never fails the walk.
    private func audit(_ name: String) {
        layoutCheck(name)
        try? app.performAccessibilityAudit(for: [.textClipped, .hitRegion, .contrast]) { issue in
            if let frame = issue.element?.frame, !self.app.frame.contains(frame) { return true }
            let label = issue.element?.label ?? "?"
            self.auditIssues.append("\(name): \(issue.compactDescription) — \"\(label)\"")
            return true
        }
    }

    /// Every label on screen, top to bottom, from one snapshot (fast, unlike querying each element).
    private func screenText() -> [String] {
        guard let snapshot = try? app.snapshot() else { return [] }
        var lines: [String] = []
        func walk(_ node: XCUIElementSnapshot) {
            let label = node.label.trimmingCharacters(in: .whitespacesAndNewlines)
            if !label.isEmpty, [.staticText, .button, .other].contains(node.elementType), !lines.contains(label), node.frame.height > 0 {
                lines.append(label)
            }
            node.children.forEach(walk)
        }
        walk(snapshot)
        return lines
    }

    /// The whole screen's text, scrolling down to collect what is below the fold.
    private func collectText(_ name: String, pages: Int = 5) {
        var lines: [String] = []
        for page in 0..<pages {
            for line in screenText() where !lines.contains(line) { lines.append(line) }
            if page < pages - 1 { app.swipeUp(); sleepBriefly() }
        }
        for _ in 0..<pages { app.swipeDown() }
        attach(name, lines.joined(separator: "\n"))
    }

    private func attach(_ name: String, _ text: String) {
        let attachment = XCTAttachment(string: text)
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }

    // MARK: - Areas

    /// Every team in the Rolodex: swipe, wait for that team's Desk to load, screenshot.
    private func walkTeams() {
        guard let (current, total) = teamPosition(), total > 1 else { return }
        let card = app.scrollViews.firstMatch
        // Back to the first team, then forward through every one.
        for _ in 0..<(current - 1) { card.swipeRight(); sleepBriefly() }
        for index in 1...total {
            if index > 1 {
                let start = Date()
                card.swipeLeft()
                settle("desk team \(index)", since: start, ready: nil)
            }
            let name = "desk-team-\(teamPosition()?.0 ?? index)"
            snap(name)
            scrollAndSnap(name)
        }
    }

    /// The Rolodex says "Team 5 of 8" to VoiceOver.
    private func teamPosition() -> (Int, Int)? {
        let element = app.descendants(matching: .any).matching(NSPredicate(format: "label MATCHES %@", "^Team [0-9]+ of [0-9]+$")).firstMatch
        guard element.waitForExistence(timeout: 5) else { return nil }
        let numbers = element.label.split(separator: " ").compactMap { Int($0) }
        return numbers.count == 2 ? (numbers[0], numbers[1]) : nil
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
        if tapIfPresent(app.buttons.matching(NSPredicate(format: "label CONTAINS %@", "Drop ")).firstMatch) {
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
        guard element.waitForExistence(timeout: 4) else { return false }
        for _ in 0..<5 where !element.isHittable { app.swipeUp(); sleepBriefly() }
        guard element.isHittable else { return false }
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
