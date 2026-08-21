import XCTest
@testable import Omen

/// M6-ContextualHelp. These tests exist because the content was ported from a web map that
/// contains two things native must never say. Review catches that once; a test catches it
/// every time.
final class OmenContextualHelpTests: XCTestCase {

    /// The user-facing sentence behind a non-available provider. Read here rather than added
    /// as an accessor on `ConnectAvailability`, so M6 leaves the connect flow untouched.
    private static func reason(_ availability: ConnectAvailability) -> String? {
        switch availability {
        case .available: return nil
        case .onHold(let reason), .useWeb(let reason): return reason
        }
    }

    /// Every individual string, for bans that must hold everywhere including short labels.
    private var allText: [String] {
        OmenContextualHelpContent.all.flatMap { topic in
            [topic.title, topic.summary] + topic.tips.flatMap { [$0.label, $0.body] }
        }
    }

    /// Each *claim* the copy makes, as the reader encounters it. A tip's label and body are
    /// one unit: "ESPN" is a heading for the sentence under it, not a standalone assertion.
    private var claims: [String] {
        OmenContextualHelpContent.all.flatMap { topic in
            [topic.summary] + topic.tips.map { "\($0.label) — \($0.body)" }
        }
    }

    // MARK: - The two required content corrections (sprint item M6, spec §1)

    func testNoDestinationMentionsDraftAssistant() {
        // Cut from 1.0 (facts-of-record #9). The web `PAGE_HELP` still advertises it on
        // `/football` and the default topic; neither may reach native help.
        for text in allText {
            XCTAssertFalse(
                text.lowercased().contains("draft assistant"),
                "Draft Assistant is cut from 1.0 and must not appear in native help copy: \"\(text)\""
            )
        }
    }

    func testEspnIsOfferedAsAWebConnectionRatherThanAnInAppOne() {
        // ESPN connects, and Omen wants people to connect it — the league is linked once on the
        // website and then appears in the app. Only the *mechanism* differs from Sleeper, so the
        // rule is about where help points, not whether ESPN is mentioned.
        for text in claims where text.lowercased().contains("espn") {
            XCTAssertTrue(
                text.lowercased().contains("website"),
                "Native help may only describe ESPN as a website connection: \"\(text)\""
            )
        }

        // The check above would also pass if someone deleted ESPN outright to satisfy it. That
        // would be the wrong fix: it would strand every ESPN user with no path at all. Pin the
        // encouragement, not just the correction.
        let connect = OmenContextualHelpContent.topic(for: .connect)
        XCTAssertTrue(
            connect.tips.contains { $0.label == "ESPN" },
            "Connect help must still tell ESPN users how to connect"
        )
    }

    func testNoDestinationAsksForAProviderPasswordOrCookie() {
        // Onboarding contract §5: a store build must never ask for a password or raw cookie.
        // Help copy is part of the store build.
        for text in allText {
            let lowered = text.lowercased()
            XCTAssertFalse(lowered.contains("cookie"), "Help copy must not mention cookies: \"\(text)\"")
            if lowered.contains("password") {
                XCTAssertTrue(
                    lowered.contains("never"),
                    "The only permitted password sentence is the promise Omen never asks for one: \"\(text)\""
                )
            }
        }
    }

    func testProviderCopyMatchesActualNativeAvailability() {
        let connect = OmenContextualHelpContent.topic(for: .connect)
        let yahoo = connect.tips.first { $0.label == "Yahoo" }
        let espn = connect.tips.first { $0.label == "ESPN" }

        // These sentences are the recorded product facts in ConnectProvider.availability.
        // If that changes, this fails and the copy gets updated with it.
        XCTAssertEqual(yahoo?.body, Self.reason(ConnectProvider.yahoo.availability))
        XCTAssertEqual(espn?.body, Self.reason(ConnectProvider.espn.availability))
        XCTAssertEqual(ConnectProvider.sleeper.availability, .available)
    }

    // MARK: - Contract shape

    func testEveryShippedDestinationHasATopic() {
        XCTAssertEqual(OmenHelpDestination.allCases.count, 4)
        for destination in OmenHelpDestination.allCases {
            let topic = OmenContextualHelpContent.topic(for: destination)
            XCTAssertFalse(topic.title.isEmpty, "\(destination) has no title")
            XCTAssertFalse(topic.summary.isEmpty, "\(destination) has no summary")
            XCTAssertFalse(topic.tips.isEmpty, "\(destination) has no tips")
        }
    }

    func testTradeAndLeagueHaveNoTopicWhileTheyAreStillPlaceholders() {
        // Deliberate omission, not an oversight: both destinations render "landing next"
        // state surfaces. Delete this test when those screens ship, and add their topics.
        XCTAssertFalse(OmenHelpDestination.allCases.contains { $0.rawValue == "trade" })
        XCTAssertFalse(OmenHelpDestination.allCases.contains { $0.rawValue == "league" })
    }

    func testNoTopicExceedsTheShortExplanationCap() {
        // Spec §4: anything longer belongs in Help + Support, not in a contextual surface.
        for topic in OmenContextualHelpContent.all {
            XCTAssertLessThanOrEqual(
                topic.tips.count, OmenHelpTopic.maxTips,
                "\"\(topic.title)\" is too long for a contextual surface — route it to Help Center"
            )
        }
    }

    func testHelpButtonAccessibilityNameNamesWhatItExplains() {
        // Several help buttons can be on screen at once; each must be distinguishable.
        let topic = OmenContextualHelpContent.topic(for: .omen)
        XCTAssertNotNil(OmenContextualHelpButton(topic: topic))
        XCTAssertEqual(topic.title, "Omen of the Week")
    }

    func testScreenshotRegistryIncludesContextualHelpEvidence() {
        XCTAssertTrue(ScreenshotScenarios.isKnown("contextual-help.omen"))
        XCTAssertTrue(ScreenshotScenarios.isKnown("contextual-help.connect"))
    }

    /// The Yahoo attribution wording is contractual. If someone "improves" this sentence, the
    /// app stops satisfying the API Access and Use Agreement, so the exact string is pinned.
    func testYahooAttributionSentenceIsTheContractualWording() {
        XCTAssertEqual(omenYahooAttributionText, "Fantasy data provided by Yahoo Fantasy.")
    }

    /// Attribution must not claim Yahoo data while Yahoo is on hold and no Yahoo data can be
    /// displayed. It is tied to the availability decision so it turns on with Yahoo, not before.
    func testYahooAttributionIsHiddenWhileYahooIsOnHold() {
        XCTAssertNotEqual(ConnectProvider.yahoo.availability, .available)
        XCTAssertFalse(omenShowsYahooAttribution)
    }
}
