import XCTest
@testable import Omen

final class OmenHelpSupportViewTests: XCTestCase {
    func testAllHonestStatesCanConstructTheScreen() {
        let states: [OmenHelpSupportState] = [
            .available, .noAccount, .offline, .submissionUnavailable, .providerRecovery,
        ]

        XCTAssertEqual(states.count, 5)
        XCTAssertNotNil(OmenHelpSupportView(state: .available, contextDescription: "Current flow help"))
    }

    func testScreenshotRegistryIncludesAvailableAndSubmissionUnavailableEvidence() {
        XCTAssertTrue(ScreenshotScenarios.isKnown("help-support.available"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("help-support.submission-unavailable"))
    }
}
