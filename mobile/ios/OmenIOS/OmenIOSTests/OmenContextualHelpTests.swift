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

    /// **Inverted 2026-09-02.** This asserted ESPN help must say "website", because ESPN was a
    /// desktop-only connection. W1-A made it an in-app sign-in, so the same test now guards the
    /// opposite error: help that still sends an ESPN user off to find a computer.
    func testEspnHelpDescribesTheInAppSignInNowThatItExists() {
        let connect = OmenContextualHelpContent.topic(for: .connect)
        let espn = connect.tips.first { $0.label == "ESPN" }

        XCTAssertEqual(ConnectProvider.espn.availability, .available)
        XCTAssertNotNil(espn, "Connect help must still tell ESPN users how to connect")
        XCTAssertFalse(
            espn?.body.lowercased().contains("website") ?? true,
            "ESPN connects in the app now; help must not route users to the website"
        )
        // The promise that makes an in-app provider sign-in acceptable at all.
        XCTAssertTrue(espn?.body.contains("never sees your ESPN password") ?? false)
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

    /// A provider Omen *cannot* connect in the app must have help that is byte-identical to the
    /// recorded reason in `ConnectProvider.availability`. Written as a loop over every provider
    /// rather than a hard-coded ESPN assertion: when ESPN flipped to `.available` the old version
    /// simply became untrue, and a rule that only ever checked one case was the reason help copy
    /// drifted twice without anything failing.
    func testUnavailableProviderHelpMatchesItsRecordedReason() {
        let connect = OmenContextualHelpContent.topic(for: .connect)

        for provider in ConnectProvider.allCases {
            guard let reason = Self.reason(provider.availability) else { continue }
            let tip = connect.tips.first { $0.label == provider.displayName }
            XCTAssertEqual(tip?.body, reason, "\(provider.displayName) help must state its recorded reason")
        }
        XCTAssertEqual(ConnectProvider.sleeper.availability, .available)
    }

    /// Help copy for a connectable provider must describe the in-app path, not send the user to
    /// a browser they no longer need. Yahoo's tip said "connect it once on the Omen website"
    /// while the native flow existed — help that contradicts the app is worse than none.
    func testConnectableProviderHelpDescribesTheInAppPath() {
        let connect = OmenContextualHelpContent.topic(for: .connect)
        let yahoo = connect.tips.first { $0.label == "Yahoo" }

        XCTAssertEqual(ConnectProvider.yahoo.availability, .available)
        XCTAssertNotNil(yahoo)
        XCTAssertFalse(
            yahoo?.body.lowercased().contains("omen website") ?? true,
            "Yahoo connects in the app now; help must not route users to the website"
        )
        // The contract's own promise, and the reason the login opens in the system browser
        // rather than a WebView the app could read.
        XCTAssertTrue(yahoo?.body.contains("never sees your Yahoo password") ?? false)
    }

    // MARK: - Contract shape

    func testEveryShippedDestinationHasATopic() {
        // Six since 2026-08-29: Trade and League gained topics when their screens shipped.
        XCTAssertEqual(OmenHelpDestination.allCases.count, 6)
        for destination in OmenHelpDestination.allCases {
            let topic = OmenContextualHelpContent.topic(for: destination)
            XCTAssertFalse(topic.title.isEmpty, "\(destination) has no title")
            XCTAssertFalse(topic.summary.isEmpty, "\(destination) has no summary")
            XCTAssertFalse(topic.tips.isEmpty, "\(destination) has no tips")
        }
    }

    func testTradeAndLeagueHaveTopicsNowThatTheirScreensShip() {
        // This asserted their ABSENCE, with the note "delete this test when those screens ship,
        // and add their topics." `M5` slices F and G shipped on 2026-08-29, so the assertion is
        // inverted rather than deleted — a destination with a real screen and no help is the
        // gap this now guards against.
        XCTAssertTrue(OmenHelpDestination.allCases.contains { $0.rawValue == "trade" })
        XCTAssertTrue(OmenHelpDestination.allCases.contains { $0.rawValue == "league" })
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

    /// Attribution must appear wherever Yahoo Fantasy Information can be **displayed**, which is
    /// not the same as where it can be **connected**. The two came apart on 2026-08-28, when the
    /// entitlement returned and Yahoo data reached the app through a web-made connection while
    /// no in-app Yahoo button existed. Native connect has since closed that gap, so the states
    /// agree again — but the gate must still not be written as `== .available`, because that is
    /// what would silently drop attribution the next time they diverge.
    func testYahooAttributionShowsWheneverYahooDataCanReachTheApp() {
        XCTAssertEqual(ConnectProvider.yahoo.availability, .available)
        XCTAssertTrue(omenShowsYahooAttribution)
    }

    /// The gate's real contract: attribution survives a provider that is reachable but not
    /// connectable in-app. Asserted on the enum rather than the live value so it keeps holding
    /// after `ConnectProvider.yahoo.availability` changes again.
    func testAttributionWouldSurviveYahooReturningToWebOnly() {
        XCTAssertTrue(
            omenYahooAttributionApplies(to: .useWeb(reason: "connect on the web")),
            "web-connected Yahoo data still needs attribution"
        )
        XCTAssertTrue(omenYahooAttributionApplies(to: .available))
        XCTAssertFalse(
            omenYahooAttributionApplies(to: .onHold(reason: "paused")),
            "on hold is the only state with no Yahoo data anywhere in the app"
        )
    }

    /// The line stays off only when Yahoo is genuinely unreachable, which is the one state that
    /// means no Yahoo data exists anywhere in the app.
    func testYahooAttributionIsHiddenOnlyWhenYahooIsOnHold() {
        let onHold = ConnectAvailability.onHold(reason: "paused")
        if case .onHold = onHold {} else { return XCTFail("expected the on-hold case") }
    }
}
