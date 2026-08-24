import XCTest
@testable import Omen

/// M5-Native-API-Client slice D — `POST /api/omen/mvp-move` → `2026-05-18.omen-live.v1`.
///
/// Before this slice the Omen destination picked between two fixtures, so every real
/// signed-in user saw `realDisconnected` regardless of their actual leagues. These tests
/// cover the mapping from the live envelope to the shipped `OmenDecisionBriefState`.
///
/// The envelope fixtures below are shaped from `src/services/omen.js` — the field names
/// (`expected_value_delta`, `comparison_player`, `why_it_matters`, `recovery.message`) are
/// the server's, not invented for the test.
final class OmenDecisionTests: XCTestCase {

    private func decode(_ json: String) throws -> OmenDecisionEnvelope {
        try JSONDecoder().decode(OmenDecisionEnvelope.self, from: Data(json.utf8))
    }

    // MARK: - success

    func testSuccessDecodesIntoARenderableBrief() throws {
        let envelope = try decode("""
        {
          "contract_version": "2026-05-18.omen-live.v1",
          "state": "success",
          "mode": "live",
          "signals": {"roster": {"status": "live", "source": "sleeper_roster", "message": "Roster imported."}},
          "recommendation": {
            "type": "waiver_pickup",
            "title": "Add Jaylen Wright for Kenneth Walker III",
            "move": "Pick up Jaylen Wright to cover your RB slot while Kenneth Walker III is out.",
            "primary_player": {"name": "Jaylen Wright", "position": "RB", "team": "MIA"},
            "comparison_player": {"name": "Kenneth Walker III", "position": "RB", "team": "SEA"},
            "expected_value_delta": {"points": 4.2, "label": "meaningful"},
            "confidence": {"score": 70, "label": "medium_high", "rationale": "Best projected RB available."},
            "risk": {"level": "medium", "reasons": ["Waiver priority is not modeled."]},
            "explanation": {
              "summary": "Add Jaylen Wright while Kenneth Walker III is out.",
              "why_it_matters": "Your RB slot cannot produce as it stands.",
              "risk": "Risk is medium because the add may not clear."
            }
          }
        }
        """)

        guard case .success(let payload) = envelope.briefState() else {
            return XCTFail("success envelope must render a success brief")
        }
        XCTAssertEqual(payload.verdict, "Add Jaylen Wright for Kenneth Walker III")
        XCTAssertEqual(payload.confidence, 70)
        XCTAssertEqual(payload.risk, .medium)
        XCTAssertEqual(payload.riskReasons, ["Waiver priority is not modeled."])
        XCTAssertEqual(payload.explanation.count, 3, "summary, why_it_matters, and risk all render")
        XCTAssertEqual(payload.impact, "+4.2 projected (meaningful)")
        XCTAssertEqual(payload.alternatives.first?.name, "Kenneth Walker III")

        // facts-of-record #7: live data is labeled live. Demo never reaches this mapping.
        XCTAssertEqual(payload.signals.map(\.source), [.live])
    }

    func testNegativeDeltaKeepsItsSignAndDirection() throws {
        let envelope = try decode("""
        {"state": "success", "mode": "live", "recommendation": {
          "title": "Hold", "move": "Keep your current lineup.",
          "expected_value_delta": {"points": -1.5, "label": "small"}}}
        """)

        guard case .success(let payload) = envelope.briefState() else { return XCTFail("expected success") }
        XCTAssertEqual(payload.impact, "-1.5 projected (small)")
        XCTAssertEqual(payload.metrics.first?.deltaDirection, .negative)
    }

    /// A `success` that carries nothing renderable is a contract violation. Showing an empty
    /// card would look like a broken layout; this must surface as an honest error instead.
    func testSuccessWithNoRenderableRecommendationBecomesAnError() throws {
        let envelope = try decode(#"{"state": "success"}"#)
        guard case .error = envelope.briefState() else {
            return XCTFail("a success with no recommendation must not render as success")
        }
    }

    func testSuccessModeMustBeExplicitAndControlsTheVisibleTruthState() throws {
        let recommendation = #""recommendation": {"title": "Start A", "move": "Bench B"}"#

        guard case .error = try decode("""
        {"state": "success", \(recommendation)}
        """).briefState() else {
            return XCTFail("missing mode must not be inferred as live")
        }
        guard case .mock = try decode("""
        {"state": "success", "mode": "mock", \(recommendation)}
        """).briefState() else {
            return XCTFail("mock mode must render the labeled mock state")
        }
        guard case .demo = try decode("""
        {"state": "success", "mode": "demo", \(recommendation)}
        """).briefState() else {
            return XCTFail("demo mode must render the labeled demo state")
        }
        guard case .error = try decode("""
        {"state": "success", "mode": "future_mode", \(recommendation)}
        """).briefState() else {
            return XCTFail("unknown mode must fail closed")
        }
    }

    func testBackendSignalStatusesArePreservedInsteadOfMintingLive() throws {
        let envelope = try decode("""
        {
          "state": "success",
          "mode": "live",
          "signals": {
            "exact_espn_scoring_unavailable": {"status": "unavailable", "source": "provider_restricted", "message": "Omen cannot verify this recommendation against your final ESPN league score."},
            "roster": {"status": "live", "source": "sleeper_roster", "message": "Roster imported."},
            "matchup_dvp": {"status": "stub", "source": "baseline", "message": "Matchup model unavailable."},
            "weather": {"status": "unavailable", "source": "weather", "message": "No weather feed."}
          },
          "recommendation": {"title": "Start A", "move": "Bench B"}
        }
        """)

        guard case .success(let payload) = envelope.briefState() else { return XCTFail("expected success") }
        XCTAssertEqual(payload.signals.map(\.source), [.unavailable, .stub, .live, .unavailable])
        XCTAssertEqual(payload.signals.first?.label, "Exact ESPN scoring unavailable")
    }

    // MARK: - non-success contract states

    func testEmptyUsesTheServersOwnSummary() throws {
        let envelope = try decode("""
        {"state": "empty", "explanation": {"summary": "No move clears the recommendation threshold this week."}}
        """)
        guard case .empty(let message) = envelope.briefState() else { return XCTFail("expected empty") }
        XCTAssertEqual(message, "No move clears the recommendation threshold this week.")
    }

    func testOffSeasonMapsToItsOwnState() throws {
        let envelope = try decode(#"{"state": "off_season"}"#)
        guard case .offSeason = envelope.briefState() else { return XCTFail("expected offSeason") }
    }

    func testPlatformDisconnectedOffersConnectRatherThanAnError() throws {
        let envelope = try decode("""
        {"state": "platform_disconnected", "recovery": {
          "code": "connect_platform", "message": "Connect a league first.", "cta": "Connect League"}}
        """)
        var connectCalled = false
        guard case .disconnected(let connect) = envelope.briefState(onConnect: { connectCalled = true }) else {
            return XCTFail("expected disconnected")
        }
        connect?()
        XCTAssertTrue(connectCalled, "the disconnected state must reach the app's connect flow")
    }

    /// Every recovery state renders the backend's sentence verbatim. Re-wording them on the
    /// client would create a second copy of this truth that drifts from the server's.
    func testRecoveryStatesSurfaceTheServerMessage() throws {
        let states = [
            "pending_live_engine", "context_unavailable",
            "yahoo_reauth_required", "sleeper_league_context_missing",
            "espn_reauth_required", "espn_league_context_missing", "espn_import_blocked",
            "error",
        ]
        for state in states {
            let envelope = try decode("""
            {"state": "\(state)", "recovery": {"message": "Server sentence for \(state)."}}
            """)
            guard case .error(let message, _) = envelope.briefState() else {
                return XCTFail("\(state) must render an error surface")
            }
            XCTAssertEqual(message, "Server sentence for \(state).")
        }
    }

    /// A state this build has never heard of must not be force-fitted into `success` —
    /// that is exactly where guessing would put invented confidence in front of a user.
    func testUnknownStateFailsSafeRatherThanRenderingAsSuccess() throws {
        let envelope = try decode(#"{"state": "some_state_shipped_after_this_build"}"#)
        guard case .error = envelope.briefState() else {
            return XCTFail("an unrecognised state must fail safe")
        }
    }

    func testRetryIsWiredOnRecoverableStates() throws {
        let envelope = try decode(#"{"state": "error", "recovery": {"message": "Try again."}}"#)
        var retried = false
        guard case .error(_, let retry) = envelope.briefState(onRetry: { retried = true }) else {
            return XCTFail("expected error")
        }
        retry?()
        XCTAssertTrue(retried)
    }

    // MARK: - honest absence

    /// An unknown position cannot be rendered without inventing a position chip next to a
    /// real player's name, so the alternative row is dropped and the verdict still renders.
    func testUnmappablePositionDropsTheAlternativeRatherThanGuessing() throws {
        let envelope = try decode("""
        {"state": "success", "mode": "live", "recommendation": {
          "title": "Start someone", "move": "Make the swap.",
          "comparison_player": {"name": "Someone", "position": "FLEX", "team": "SEA"}}}
        """)
        guard case .success(let payload) = envelope.briefState() else { return XCTFail("expected success") }
        XCTAssertTrue(payload.alternatives.isEmpty, "a position we cannot map must not be guessed")
        XCTAssertEqual(payload.verdict, "Start someone", "the rest of the brief still renders")
    }

    func testUnknownRiskLevelDefaultsToMediumNotLow() throws {
        let envelope = try decode("""
        {"state": "success", "mode": "live", "recommendation": {
          "title": "T", "move": "M", "risk": {"level": "catastrophic", "reasons": []}}}
        """)
        guard case .success(let payload) = envelope.briefState() else { return XCTFail("expected success") }
        XCTAssertEqual(payload.risk, .medium, "an unfamiliar risk must not read as safer than it is")
    }

    /// The envelope legitimately varies by state. Modelling fields as required would turn an
    /// honest backend answer into `.decode` and tell the user the app is broken.
    func testMinimalEnvelopeDecodesWithoutOptionalSections() throws {
        let envelope = try decode(#"{"state": "empty"}"#)
        XCTAssertNil(envelope.recommendation)
        XCTAssertNil(envelope.recovery)
        guard case .empty = envelope.briefState() else { return XCTFail("expected empty") }
    }
}

// MARK: - View model

@MainActor
final class OmenDecisionViewModelTests: XCTestCase {

    /// Mirrors `CommandCenterViewModelTests` — an in-memory store, no keychain, no network.
    private func makeSessionManager(withToken token: String? = "t") -> SessionManager {
        let session = token.map {
            Session(userID: "user-1", accessToken: $0, refreshToken: "refresh", expiresAtEpochSeconds: 2_000)
        }
        return SessionManager(
            store: InMemorySecureSessionStore(initial: session),
            nowEpochSeconds: { 1_000 }
        )
    }

    private var successEnvelope: OmenDecisionEnvelope {
        get throws {
            try JSONDecoder().decode(OmenDecisionEnvelope.self, from: Data("""
            {"state": "success", "mode": "live", "recommendation": {"title": "Start McCaffrey", "move": "Bench Walker."}}
            """.utf8))
        }
    }

    /// Demo never touches the network — facts-of-record #7. If demo could reach the live
    /// path, a mock could be mixed with live data without a label.
    func testDemoRendersTheLabeledFixtureWithoutCallingTheNetwork() async throws {
        final class ExplodingRepository: OmenDecisionRepository {
            var called = false
            func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError> {
                called = true
                return .failure(.network)
            }
        }
        let repository = ExplodingRepository()
        let viewModel = OmenDecisionViewModel(repository: repository, sessionManager: makeSessionManager())

        await viewModel.load(userID: SessionManager.demoUserID)

        XCTAssertFalse(repository.called, "demo must never reach the live engine")
        guard case .demo = viewModel.briefState else {
            return XCTFail("demo must render the labeled demo fixture")
        }
    }

    /// A transport failure must render honestly and must NOT fall back to a fixture —
    /// showing demo content to a real user during an outage is the mixing the doctrine bans.
    func testTransportFailureRendersAnErrorAndNeverAFixture() async {
        let viewModel = OmenDecisionViewModel(
            repository: StubOmenDecisionRepository(result: .failure(.network)),
            sessionManager: makeSessionManager()
        )

        await viewModel.load(userID: "real-user")

        guard case .error(let message, _) = viewModel.briefState else {
            return XCTFail("a failed load must render an error surface")
        }
        XCTAssertTrue(message.contains("connection"), "the message must name what the user can act on")
    }

    /// No session means no bearer, which is `unauthorized` — not a silent empty screen.
    func testMissingSessionIsUnauthorizedRatherThanEmpty() async {
        let viewModel = OmenDecisionViewModel(
            repository: StubOmenDecisionRepository(result: .failure(.network)),
            sessionManager: makeSessionManager(withToken: nil)
        )

        await viewModel.load(userID: "real-user")

        guard case .error = viewModel.briefState else { return XCTFail("expected an error state") }
    }

    func testStateIsLoadingBeforeTheFirstRequestResolves() {
        let viewModel = OmenDecisionViewModel(
            repository: StubOmenDecisionRepository(result: .failure(.network)),
            sessionManager: makeSessionManager()
        )
        // `idle` renders as loading on purpose: an empty state here would claim "Omen has
        // no move for you", which is not something we have earned before the first call.
        guard case .loading = viewModel.briefState else {
            return XCTFail("the pre-request state must be loading, not empty")
        }
    }
}
