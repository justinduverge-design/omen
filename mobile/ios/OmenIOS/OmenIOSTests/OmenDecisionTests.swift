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

    func testLiveOmenRequestOptsIntoBoundedPrivateNarrationWithoutSendingLeagueData() async throws {
        final class RecordingFetcher: OmenHTTPFetching {
            var captured: URLRequest?

            func data(for request: URLRequest) async throws -> (Data, URLResponse) {
                captured = request
                return (
                    Data(#"{"state":"empty","mode":"live"}"#.utf8),
                    HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
                )
            }
        }

        let fetcher = RecordingFetcher()
        let client = OmenApiClient(baseURL: try XCTUnwrap(URL(string: "https://api.example.com")), fetcher: fetcher)
        _ = await ApiOmenDecisionRepository(client: client).fetchDecision(accessToken: "access-token")

        let bodyData = try XCTUnwrap(fetcher.captured?.httpBody)
        let body = try XCTUnwrap(JSONSerialization.jsonObject(with: bodyData) as? [String: Any])
        XCTAssertEqual(body["contract_version"] as? String, "omen-decision-brief.v3")
        XCTAssertEqual((body["include_signals"] as? [String: Any])?["llm_reasoning"] as? Bool, true)
        XCTAssertNil(body["league_id"])
        XCTAssertNil(body["roster"])
    }

    private func decode(_ json: String) throws -> OmenDecisionEnvelope {
        try JSONDecoder().decode(OmenDecisionEnvelope.self, from: Data(json.utf8))
    }

    func testV2ConfidenceBandAndServerDriversSurviveMapping() throws {
        let envelope = try decode("""
        {"contract_version":"omen-decision-brief.v2","state":"success","mode":"live",
         "recommendation":{"title":"Hold","move":"Keep your lineup.",
         "confidence":{"band":"leaning","drivers":["Live roster read","Small weekly edge"]}}}
        """)
        guard case .success(let payload) = envelope.briefState() else { return XCTFail("expected success") }
        XCTAssertEqual(payload.confidenceBand, .leaning)
        XCTAssertEqual(payload.confidenceDrivers, ["Live roster read", "Small weekly edge"])
        XCTAssertNil(payload.confidence, "v2 must not manufacture a retired numeric score")
    }

    func testStartSitV2DecodesSharedCapabilitiesWithoutPromotingUnknownScoring() throws {
        let detail = try JSONDecoder().decode(StartSitDetail.self, from: Data("""
        {
          "contract_version": "start-sit-detail.v2",
          "state": "clear_decision",
          "recommendation": {"slot": "WR", "points_delta": 4.2},
          "capabilities": [
            {"name": "league_scoring", "state": "unavailable", "used": false, "kind": "limitation", "source": "league_settings", "statement": "Omen has not verified this league's scoring rules.", "reason_code": "coverage_pending", "coverage_state": "pending", "reconciliation_state": "pending"},
            {"name": "player_projections", "state": "live", "used": true, "kind": "projection", "source": "normalized_roster", "statement": "Omen compared available provider projections."}
          ]
        }
        """.utf8))

        XCTAssertEqual(detail.contractVersion, "start-sit-detail.v2")
        XCTAssertEqual(detail.capabilities.map(\.kind), ["limitation", "projection"])
        XCTAssertEqual(detail.capabilities.first?.state, "unavailable")
        XCTAssertEqual(detail.capabilities.first?.used, false)
        XCTAssertEqual(detail.capabilities.first?.reasonCode, "coverage_pending")
        XCTAssertEqual(detail.capabilities.first?.coverageState, "pending")
        XCTAssertEqual(detail.capabilities.first?.reconciliationState, "pending")
    }

    func testStartSitV2KeepsTheServerRecommendationPairAndDoesNotInventRosterRows() throws {
        let detail = try JSONDecoder().decode(StartSitDetail.self, from: Data("""
        {
          "contract_version": "start-sit-detail.v2",
          "state": "clear_decision",
          "platform": "espn",
          "league_id": "L1",
          "league_name": "Canvas League",
          "team_name": "Fixture Team",
          "season": 2026,
          "week": 7,
          "scoring_format": null,
          "recommendation": {
            "slot": "WR",
            "start": {"player_key":"p-a","name":"Sample WR1","position":"WR","team":"MIA","projected_points":14.8,"status":null,"kickoff":null},
            "over": {"player_key":"p-b","name":"Sample WR2","position":"WR","team":"CHI","projected_points":11.6,"status":"Q","kickoff":null},
            "points_delta": 3.2,
            "confidence": "moderate"
          },
          "why": ["Higher projected output in this league's scoring (+3.2)."],
          "what_could_change_this": ["Sample WR2's final injury status."],
          "evidence": [{"category":"player_game_fact","kind":"projection","statement":"Sample WR1 projects 14.8 and Sample WR2 projects 11.6."}],
          "alternatives": [{"slot":"FLEX","start":"Sample RB1","over":"Sample RB2","points_delta":1.1}],
          "capabilities": []
        }
        """.utf8))

        XCTAssertEqual(detail.platform, "espn")
        XCTAssertEqual(detail.week, 7)
        XCTAssertNil(detail.scoringFormat, "unknown scoring must stay absent")
        XCTAssertEqual(detail.recommendation?.start?.name, "Sample WR1")
        XCTAssertEqual(detail.recommendation?.over?.status, "Q")
        XCTAssertEqual(detail.recommendation?.pointsDelta, 3.2)
        XCTAssertEqual(detail.why.count, 1)
        XCTAssertEqual(detail.whatCouldChangeThis.count, 1)
        XCTAssertEqual(detail.alternatives.first?.slot, "FLEX")
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
            "exact_espn_scoring_unavailable": {"status": "unavailable", "source": "provider_restricted", "message": "Omen cannot verify every scoring rule and final ESPN result."},
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

    func testV3CapabilitiesReplaceLegacyStubPresentationAndKeepEvidenceKindsServerOwned() throws {
        let envelope = try decode("""
        {
          "contract_version": "omen-decision-brief.v3",
          "state": "success", "mode": "live",
          "signals": {
            "matchup_dvp": {"status": "stub", "source": "legacy", "message": "Legacy implementation marker."},
            "projections": {"status": "live", "source": "optimizer", "message": "Legacy projection."}
          },
          "capabilities": [
            {"name": "matchup_dvp", "state": "unavailable", "used": false, "kind": "limitation", "source": "nflverse_data", "statement": "Not enough verified matchup context.", "observed_at": null, "fresh_until": null},
            {"name": "projections", "state": "live", "used": true, "kind": "projection", "source": "optimizer", "statement": "Projection edge is normalized.", "observed_at": "2026-09-16T12:00:00Z", "fresh_until": null}
          ],
          "recommendation": {"title": "Start A", "move": "Bench B"}
        }
        """)

        guard case .success(let payload) = envelope.briefState() else { return XCTFail("expected success") }
        XCTAssertEqual(payload.signals.map(\.source), [.unavailable, .live])
        XCTAssertEqual(payload.signals.map(\.detail), [
            "Not enough verified matchup context.",
            "Projection edge is normalized.",
        ])
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

    // MARK: - Capability expression (capability-expression-v1.md)

    private func capabilityEnvelope() throws -> OmenDecisionEnvelope {
        try decode("""
        {
          "contract_version": "omen-decision-brief.v3",
          "state": "success", "mode": "live",
          "recommendation": {
            "type": "start_sit", "title": "Start Achane", "move": "Start Achane over Pollard.",
            "confidence": {"band": "confident", "drivers": ["Volume is stable."]},
            "risk": {"level": "low", "reasons": []},
            "explanation": {"summary": "Start Achane."}
          },
          "capabilities": [
            {"name":"roster","state":"live","used":true,"kind":"verified","statement":"Roster read."},
            {"name":"matchup_dvp","state":"live","used":false,"kind":"projection","statement":"Read, not decisive."},
            {"name":"weather","state":"unavailable","used":false,"kind":"limitation","statement":"Weather not read."},
            {"name":"trade_rosters","state":"not_requested","used":false,"kind":"model","statement":"Never asked for."}
          ]
        }
        """)
    }

    /// The two axes are different questions. `state` asks whether we could read it; `used` asks
    /// whether it changed the answer. The client dropped `used` entirely until 2026-09-17, which
    /// made "this moved the call" and "we have it and it did not matter" indistinguishable and
    /// left two of the four presentation classes unexpressible.
    func testUsedSurvivesTheMappingSoEvidenceIsDistinguishableFromMerelyResolved() throws {
        guard case .success(let payload) = try capabilityEnvelope().briefState() else {
            return XCTFail("expected success")
        }
        let byLabel = Dictionary(uniqueKeysWithValues: payload.signals.map { ($0.label, $0) })
        XCTAssertEqual(byLabel["Roster"]?.used, true, "a used input must be marked used")
        XCTAssertEqual(byLabel["Matchup Dvp"]?.used, false, "a resolved-but-unused input is not evidence")
        XCTAssertNotNil(byLabel["Roster"], "capability names map to display labels")
    }

    /// `not_requested` is NOT a limitation. A profile resolves only what it needs, so an input it
    /// never asked for is out of scope rather than missing. It fell through to `.unavailable`
    /// until 2026-09-17 — telling the user Omen failed to read something it never wanted, which
    /// is the manufactured limitation that teaches people to ignore the real ones.
    func testAnInputThatWasNeverRequestedIsNotRenderedAtAll() throws {
        guard case .success(let payload) = try capabilityEnvelope().briefState() else {
            return XCTFail("expected success")
        }
        XCTAssertFalse(
            payload.signals.contains { $0.label.lowercased().contains("trade") },
            "a not_requested input must not reach the screen in any form"
        )
        XCTAssertTrue(
            payload.signals.contains { $0.source == .unavailable },
            "a genuinely unavailable input must still be named"
        )
    }

    /// The server orders the evidence. iOS alphabetised it until 2026-09-17 while Android did
    /// not, so the two platforms showed the same evidence in different orders and iOS asserted a
    /// relative importance no contract supports.
    func testServerOrderIsPreservedRatherThanAlphabetised() throws {
        guard case .success(let payload) = try capabilityEnvelope().briefState() else {
            return XCTFail("expected success")
        }
        // Server order is roster, matchup_dvp, weather (trade_rosters filtered out).
        XCTAssertEqual(payload.signals.map(\.label), ["Roster", "Matchup Dvp", "Weather"])
    }

    /// The envelope legitimately varies by state. Modelling fields as required would turn an
    /// honest backend answer into `.decode` and tell the user the app is broken.
    func testMinimalEnvelopeDecodesWithoutOptionalSections() throws {
        let envelope = try decode(#"{"state": "empty"}"#)
        XCTAssertNil(envelope.recommendation)
        XCTAssertNil(envelope.recovery)
        guard case .empty = envelope.briefState() else { return XCTFail("expected empty") }
    }

    /// Regression, `F-VET-01`. `OmenDecision` filled a missing confidence score with `?? 0`,
    /// and `OmenConfidenceBar` prints its score verbatim — so a brief the server declined to
    /// score displayed **"Confidence 0"**, which reads as "Omen has no confidence in this move"
    /// rather than "Omen did not say". The server models the absence deliberately:
    /// `src/routes/omen.js` persists it as `null` behind a `Number.isFinite` guard.
    func testAMissingConfidenceScoreIsAbsentRatherThanZero() throws {
        let envelope = try decode("""
        {
          "contract_version": "2026-05-18.omen-live.v1",
          "state": "success",
          "mode": "live",
          "recommendation": {
            "type": "waiver_pickup",
            "title": "Add Jaylen Wright",
            "move": "Pick up Jaylen Wright to cover your RB slot.",
            "risk": {"level": "medium", "reasons": []},
            "explanation": {"summary": "Add Jaylen Wright."}
          }
        }
        """)

        guard case .success(let payload) = envelope.briefState() else {
            return XCTFail("a scoreless recommendation is still a renderable brief")
        }
        XCTAssertNil(payload.confidence, "absence must survive the mapping, not become 0")
        // The rest of the brief is unaffected — one absent field must not degrade the others.
        XCTAssertEqual(payload.verdict, "Add Jaylen Wright")
        XCTAssertEqual(payload.risk, .medium)
    }

    /// The whole confidence block absent, not merely its score.
    func testAnEntirelyAbsentConfidenceBlockIsAlsoAbsent() throws {
        let envelope = try decode("""
        {
          "contract_version": "2026-05-18.omen-live.v1",
          "state": "success",
          "mode": "live",
          "recommendation": {
            "type": "start_sit",
            "title": "Start DeVonta Smith",
            "move": "Start DeVonta Smith over Chris Olave.",
            "confidence": {"label": "medium_high", "rationale": "No numeric score supplied."},
            "risk": {"level": "low", "reasons": []},
            "explanation": {"summary": "Start Smith."}
          }
        }
        """)

        guard case .success(let payload) = envelope.briefState() else {
            return XCTFail("expected a success brief")
        }
        XCTAssertNil(payload.confidence, "a confidence block with a label but no score is still scoreless")
    }

    /// A real score must still survive untouched — the fix must not suppress valid data.
    func testARealConfidenceScoreStillRenders() throws {
        XCTAssertEqual(try zeroConfidencePayload(score: "0")?.confidence, 0,
                       "a genuine 0 from the server is a real answer and must be kept")
        XCTAssertEqual(try zeroConfidencePayload(score: "83")?.confidence, 83)
    }

    private func zeroConfidencePayload(score: String) throws -> OmenDecisionBriefPayload? {
        let envelope = try decode("""
        {
          "contract_version": "2026-05-18.omen-live.v1",
          "state": "success",
          "mode": "live",
          "recommendation": {
            "type": "start_sit",
            "title": "Start DeVonta Smith",
            "move": "Start DeVonta Smith over Chris Olave.",
            "confidence": {"score": \(score), "label": "low", "rationale": "r"},
            "risk": {"level": "low", "reasons": []},
            "explanation": {"summary": "Start Smith."}
          }
        }
        """)
        guard case .success(let payload) = envelope.briefState() else { return nil }
        return payload
    }

    /// `omen-decision-brief.v2` — a graded call carries a band and no explanation.
    func testAGradedCallCarriesABandAndNoAbsenceExplanation() throws {
        let envelope = try decode("""
        {
          "contract_version": "omen-decision-brief.v2",
          "state": "success",
          "mode": "live",
          "recommendation": {
            "type": "start_sit",
            "title": "Start Achane",
            "move": "Start Achane over Pollard.",
            "confidence": {"band": "confident", "drivers": ["Volume is stable."]},
            "risk": {"level": "low", "reasons": []},
            "explanation": {"summary": "Start Achane."}
          }
        }
        """)

        guard case .success(let payload) = envelope.briefState() else { return XCTFail("expected success") }
        XCTAssertEqual(payload.confidenceBand, .confident)
        XCTAssertEqual(payload.confidenceDrivers, ["Volume is stable."])
        XCTAssertTrue(payload.confidenceUnavailableReason.isEmpty,
                      "a graded call has nothing to explain away")
    }

    /// The defect this replaced: the server returned `coin_flip` for a call it had never
    /// scored, so the absence of a judgement rendered as a judgement. A missing confidence now
    /// carries no band at all and says what Omen could not read instead.
    ///
    /// The brief renders the band panel only when a band exists, and the explanation only when
    /// it does not — so this mapping is what keeps the two from ever appearing together.
    func testAnUnscoredCallExplainsItselfRatherThanClaimingACoinFlip() throws {
        let envelope = try decode("""
        {
          "contract_version": "omen-decision-brief.v2",
          "state": "success",
          "mode": "live",
          "recommendation": {
            "type": "start_sit",
            "title": "Start Achane",
            "move": "Start Achane over Pollard.",
            "confidence": {
              "band": null,
              "drivers": [],
              "unavailable_reason": ["Omen cannot yet verify every scoring rule for this league."]
            },
            "risk": {"level": "low", "reasons": []},
            "explanation": {"summary": "Start Achane."}
          }
        }
        """)

        guard case .success(let payload) = envelope.briefState() else { return XCTFail("expected success") }
        XCTAssertNil(payload.confidenceBand, "no score must not become a fourth, worst band")
        XCTAssertEqual(payload.confidenceUnavailableReason,
                       ["Omen cannot yet verify every scoring rule for this league."])
        XCTAssertNil(payload.confidence, "and it must not fall back to a numeral either")
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
