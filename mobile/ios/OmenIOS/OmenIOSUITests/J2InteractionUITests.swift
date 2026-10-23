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

    // MARK: - The switcher sheet

    // MARK: - The degraded pass says what it could not read

    // MARK: - D11, measured

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
