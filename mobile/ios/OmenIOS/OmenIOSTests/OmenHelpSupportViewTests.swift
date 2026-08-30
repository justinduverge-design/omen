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

    // MARK: - F-VET-06 — feedback must reach a human

    /// Regression. Both Help affordances used to be dead ends: `action: { feedbackUnavailable
    /// = true }`, whose only effect was to tell the user reporting was unavailable. Native never
    /// called any submit path, so a beta tester who hit a broken connection could not reach us —
    /// which fired ratified abort class 3, "we cannot hear testers".
    func testFeedbackComposesToTheSameSupportAddressTheWebPublishes() throws {
        let url = try XCTUnwrap(OmenHelpSupportView.mailtoURL(subject: "Omen problem report"))

        XCTAssertEqual(url.scheme, "mailto")
        XCTAssertTrue(
            url.absoluteString.contains(OmenHelpSupportView.supportAddress),
            "must route to the address the web app already publishes, not a new contract"
        )
        XCTAssertEqual(OmenHelpSupportView.supportAddress, "support@slopssaloon.com")
    }

    /// The screen's own privacy card promises Omen "never automatically attaches your selected
    /// league, roster, credentials, tokens, cookies, or raw provider errors to support." The
    /// prefilled body must keep that promise by construction.
    func testTheComposedBodyCarriesNothingThePrivacyCardForbids() throws {
        let url = try XCTUnwrap(OmenHelpSupportView.mailtoURL(subject: "Omen feedback"))
        let body = (url.absoluteString as NSString).removingPercentEncoding ?? url.absoluteString

        for forbidden in ["league", "roster", "token", "cookie", "swid", "espn_s2", "Bearer", "authorization"] {
            XCTAssertFalse(
                body.lowercased().contains(forbidden.lowercased()),
                "the support draft must never carry \(forbidden) — see the privacy card on this screen"
            )
        }
    }


}
