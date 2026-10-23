import XCTest
@testable import Omen

/// Launch-contract coverage for the deterministic screenshot host, independent of a screen.
final class ScreenshotScenariosTests: XCTestCase {
    func testRegistryResolvesExpectedKeys() {
        XCTAssertTrue(ScreenshotScenarios.isKnown("desk.ready"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("desk.no-league"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.demo"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.disconnected"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.hold"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.hold-no-projections"))
        XCTAssertFalse(ScreenshotScenarios.isKnown("command-center.no-such-fixture"))
        XCTAssertFalse(ScreenshotScenarios.isKnown(nil))
    }

    func testParserReadsEnvironmentAndLaunchArguments() {
        XCTAssertEqual(ScreenshotScenarios.active(from: [ScreenshotScenarios.launchArgumentKey: "desk.ready"], arguments: []), "desk.ready")
        XCTAssertEqual(ScreenshotScenarios.active(from: [:], arguments: ["-\(ScreenshotScenarios.launchArgumentKey)", "desk.no-league"]), "desk.no-league")
        XCTAssertNil(ScreenshotScenarios.active(from: [:], arguments: []))
    }
}
