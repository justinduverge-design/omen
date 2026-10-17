import XCTest
@testable import Omen

/// Launch-contract coverage for the deterministic screenshot host, independent of a screen.
final class ScreenshotScenariosTests: XCTestCase {
    func testRegistryResolvesExpectedKeys() {
        XCTAssertTrue(ScreenshotScenarios.isKnown("command-center.demo-connected"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("command-center.disconnected"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.demo"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.disconnected"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.hold"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("omen.hold-no-projections"))
        XCTAssertFalse(ScreenshotScenarios.isKnown("command-center.no-such-fixture"))
        XCTAssertFalse(ScreenshotScenarios.isKnown(nil))
    }

    func testParserReadsEnvironmentAndLaunchArguments() {
        XCTAssertEqual(ScreenshotScenarios.active(from: [ScreenshotScenarios.launchArgumentKey: "command-center.demo-connected"], arguments: []), "command-center.demo-connected")
        XCTAssertEqual(ScreenshotScenarios.active(from: [:], arguments: ["-\(ScreenshotScenarios.launchArgumentKey)", "command-center.disconnected"]), "command-center.disconnected")
        XCTAssertNil(ScreenshotScenarios.active(from: [:], arguments: []))
    }
}
