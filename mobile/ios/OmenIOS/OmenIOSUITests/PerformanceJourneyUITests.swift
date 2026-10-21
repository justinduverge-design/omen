import XCTest

/// Load times, measured by Xcode rather than felt by a thumb.
///
/// These drive the real app shell (not a screenshot scenario) through the demo door the App Store
/// reviewer uses, so they need no account and no network credentials. Each test records an Xcode
/// baseline; once a baseline is accepted in the test report, a regression past it fails the run.
///
/// The app emits `com.slopssaloon.omen` signposts (`api/request` intervals, `screen/ready` events),
/// so a run under `xctrace record --template "Time Profiler"` lines every frame up with the request
/// and screen that caused it.
final class PerformanceJourneyUITests: XCTestCase {

    private let demoTitle = "Look around without an account →"
    private let tabs = ["Omen", "Trade", "League", "Desk"]

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
    }

    /// Cold launch to a responsive first frame.
    func testColdLaunch() {
        let options = XCTMeasureOptions()
        options.iterationCount = 5
        measure(metrics: [XCTApplicationLaunchMetric(waitUntilResponsive: true)], options: options) {
            XCUIApplication().launch()
        }
    }

    /// Launch to the desk. The first iteration takes the demo door; later ones reopen the demo session.
    func testDemoEntryToDesk() {
        let options = XCTMeasureOptions()
        options.invocationOptions = [.manuallyStop]
        options.iterationCount = 5
        measure(metrics: [XCTClockMetric(), XCTCPUMetric(), XCTMemoryMetric()], options: options) {
            let app = XCUIApplication()
            app.launch()
            enterDesk(app)
            stopMeasuring()
            app.terminate()
        }
    }

    /// Every tab switch, from tap to the destination's tab being selected and its content hittable.
    func testTabSwitching() {
        let app = XCUIApplication()
        app.launch()
        enterDesk(app)

        let options = XCTMeasureOptions()
        options.iterationCount = 3
        measure(metrics: [XCTClockMetric()], options: options) {
            for name in tabs {
                let tab = app.tabBars.buttons[name]
                guard tab.waitForExistence(timeout: 5) else { XCTFail("no \(name) tab"); return }
                tab.tap()
                XCTAssertTrue(tab.wait(for: \.isSelected, toEqual: true, timeout: 5), "\(name) never became selected")
            }
        }
    }

    /// Drives the production shell rather than a screenshot fixture. The mode chooser used to
    /// have coverage only as a static artboard, which allowed Build a trade to look present while
    /// its real transition was broken by competing presentation state.
    func testBuildATradeOpensFromTheRealTradeChooser() {
        let app = XCUIApplication()
        app.launch()
        enterDesk(app)

        let tradeTab = app.tabBars.buttons["Trade"]
        XCTAssertTrue(tradeTab.waitForExistence(timeout: 5), "the Trade tab is missing")
        tradeTab.tap()
        XCTAssertTrue(tradeTab.wait(for: \.isSelected, toEqual: true, timeout: 5), "Trade never became selected")

        let build = app.buttons.containing(.staticText, identifier: "Build a trade").firstMatch
        XCTAssertTrue(build.waitForExistence(timeout: 5), "Build a trade is missing from the chooser")
        XCTAssertTrue(build.isHittable, "Build a trade is covered by another presentation")
        build.tap()

        XCTAssertTrue(
            app.staticTexts["Building a trade needs your league"].waitForExistence(timeout: 10),
            "Build a trade did not open its production destination"
        )
        XCTAssertFalse(build.exists, "the chooser is still trying to show over Build a trade")
    }

    /// Apple's own accessibility audit (contrast, hit regions, Dynamic Type clipping, labels) on each
    /// tab of the demo desk. Findings are attached to the report; any issue fails the test.
    func testAccessibilityAuditEveryTab() throws {
        let app = XCUIApplication()
        app.launch()
        enterDesk(app)
        var found: [String] = []
        for name in tabs.reversed() {
            let tab = app.tabBars.buttons[name]
            guard tab.waitForExistence(timeout: 5) else { XCTFail("no \(name) tab"); return }
            tab.tap()
            _ = tab.wait(for: \.isSelected, toEqual: true, timeout: 5)
            try app.performAccessibilityAudit { issue in
                let element = issue.element.map { "\($0.elementType.rawValue) '\($0.label)'" } ?? "screen"
                found.append("\(name): \(issue.auditType) — \(issue.compactDescription) — \(element)")
                return true // record every issue, then fail once with the full list
            }
        }
        let attachment = XCTAttachment(string: found.joined(separator: "\n"))
        attachment.name = "accessibility-audit"
        attachment.lifetime = .keepAlways
        add(attachment)
        XCTAssertTrue(found.isEmpty, "\(found.count) accessibility issues:\n" + found.joined(separator: "\n"))
    }

    /// Whichever comes first: the desk (a demo session is already open) or the demo door.
    private func enterDesk(_ app: XCUIApplication, file: StaticString = #filePath, line: UInt = #line) {
        let desk = app.tabBars.firstMatch
        let demo = app.buttons[demoTitle]
        let deadline = Date().addingTimeInterval(20)
        while Date() < deadline {
            if desk.exists { return }
            if demo.exists && demo.isHittable { demo.tap(); break }
            RunLoop.current.run(until: Date().addingTimeInterval(0.05))
        }
        XCTAssertTrue(desk.waitForExistence(timeout: 20), "the desk never appeared", file: file, line: line)
    }
}
