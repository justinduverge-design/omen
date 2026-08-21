import Foundation

/// M5-Native-API-Client slice D — `POST /api/omen/mvp-move` → `2026-05-18.omen-live.v1`.
///
/// Decodes only what the Omen destination renders. Every field is optional because the
/// envelope genuinely varies by state: a `platform_disconnected` body carries `recovery`
/// and no `recommendation`, an `empty` body carries `explanation` and `confidence` but no
/// `recommendation`, and only `success` carries all three. Modelling those as required
/// would turn an honest backend answer into a `.decode` failure, which would show the user
/// "Omen sent something this app couldn't read" when the truth is "connect a league".
struct OmenDecisionEnvelope: Decodable, Equatable {
    let contractVersion: String?
    let state: String
    let mode: String?
    let recommendation: Recommendation?
    let recovery: Recovery?
    let explanation: Explanation?
    let confidence: Confidence?
    let warnings: [String]?
    let signals: [String: Signal]?

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case state, mode, recommendation, recovery, explanation, confidence, warnings, signals
    }

    struct Recommendation: Decodable, Equatable {
        let type: String?
        let title: String?
        let move: String?
        let primaryPlayer: Player?
        let comparisonPlayer: Player?
        let expectedValueDelta: ExpectedValueDelta?
        let confidence: Confidence?
        let risk: Risk?
        let explanation: Explanation?

        enum CodingKeys: String, CodingKey {
            case type, title, move, confidence, risk, explanation
            case primaryPlayer = "primary_player"
            case comparisonPlayer = "comparison_player"
            case expectedValueDelta = "expected_value_delta"
        }
    }

    /// The server's own user-safe recovery sentence for every non-success state. Rendered
    /// verbatim rather than re-worded on the client, so there is one copy of this truth.
    struct Recovery: Decodable, Equatable {
        let code: String?
        let message: String?
        let cta: String?
    }

    struct Player: Decodable, Equatable {
        let name: String?
        let position: String?
        let team: String?
    }

    struct ExpectedValueDelta: Decodable, Equatable {
        let points: Double?
        let label: String?
    }

    struct Confidence: Decodable, Equatable {
        let score: Int?
        let label: String?
        let rationale: String?
    }

    struct Risk: Decodable, Equatable {
        let level: String?
        let reasons: [String]?
    }

    struct Explanation: Decodable, Equatable {
        let summary: String?
        let whyItMatters: String?
        let risk: String?
        let confidence: String?
        let dataUsed: [String]?

        enum CodingKeys: String, CodingKey {
            case summary, risk, confidence
            case whyItMatters = "why_it_matters"
            case dataUsed = "data_used"
        }
    }

    struct Signal: Decodable, Equatable {
        let status: String?
        let source: String?
        let message: String?
    }
}

// MARK: - Contract → screen state

extension OmenDecisionEnvelope {
    /// Maps the live envelope onto the shipped `OmenDecisionBriefState`.
    ///
    /// The state names come from `omen-native-backend-state-contract-v1.md` §F2 and
    /// `src/services/omen.js`; this does not invent its own. Anything unrecognised is
    /// treated as a recoverable error rather than being force-fitted into `success`,
    /// because a state this client has never heard of is precisely the case where
    /// guessing would put invented confidence in front of a real user.
    ///
    /// `onRetry` and `onConnect` are injected so this stays a pure mapping the tests can
    /// exercise without a view.
    func briefState(onRetry: (() -> Void)? = nil, onConnect: (() -> Void)? = nil) -> OmenDecisionBriefState {
        switch state {
        case "success":
            // Only `success` may render a recommendation. If the backend says success and
            // sends nothing renderable, that is a contract violation, not something to
            // paper over with placeholder text — fall through to an honest error.
            guard let payload = successPayload() else {
                return .error(Self.unreadableMessage, retry: onRetry)
            }
            switch mode {
            case "live": return .success(payload)
            case "mock": return .mock(payload)
            case "demo": return .demo(payload)
            default: return .error(Self.unverifiedModeMessage, retry: onRetry)
            }

        case "empty":
            return .empty(explanation?.summary ?? "No move clears the recommendation threshold this week.")

        case "off_season":
            return .offSeason

        case "platform_disconnected":
            return .disconnected(connect: onConnect)

        default:
            // Everything else — `pending_live_engine`, `context_unavailable`,
            // `yahoo_reauth_required`, `sleeper_league_context_missing`,
            // `espn_reauth_required`, `espn_league_context_missing`,
            // `espn_import_blocked`, `error`, and any state added later — is surfaced
            // with the backend's own recovery message. The server already writes a
            // user-safe sentence for these; rewriting it here would be a second, drifting
            // copy of the same truth.
            return .error(recovery?.message ?? Self.unreadableMessage, retry: onRetry)
        }
    }

    private static let unreadableMessage =
        "Omen sent something this version of the app couldn't read. Updating the app may fix it."
    private static let unverifiedModeMessage =
        "Omen could not verify whether this recommendation is live. Refresh or update before acting."

    private func successPayload() -> OmenDecisionBriefPayload? {
        guard let recommendation else { return nil }
        // A recommendation with neither a headline nor a move has nothing to say. Render
        // the error rather than an empty card that looks like a broken layout.
        guard let verdict = recommendation.title, let move = recommendation.move else { return nil }

        let conf = recommendation.confidence ?? confidence
        let explanationBlock = recommendation.explanation ?? explanation

        return OmenDecisionBriefPayload(
            verdict: verdict,
            move: move,
            impact: recommendation.expectedValueDelta.flatMap(Self.impactText),
            confidence: conf?.score ?? 0,
            risk: Self.riskLevel(recommendation.risk?.level),
            riskReasons: recommendation.risk?.reasons ?? [],
            explanation: Self.explanationLines(explanationBlock),
            metrics: Self.metrics(from: recommendation),
            signals: Self.signalItems(signals),
            alternatives: Self.alternatives(from: recommendation)
        )
    }

    private static func signalItems(_ signals: [String: Signal]?) -> [OmenSignalItem] {
        guard let signals else { return [] }
        return signals.keys.sorted().compactMap { key in
            guard let signal = signals[key] else { return nil }
            return OmenSignalItem(
                label: signalLabel(key),
                source: signalSource(signal.status),
                detail: signal.message ?? signal.source
            )
        }
    }

    private static func signalSource(_ status: String?) -> OmenSignalSource {
        switch status {
        case "live": return .live
        case "stub": return .stub
        case "mock", "demo": return .mock
        default: return .unavailable
        }
    }

    private static func signalLabel(_ key: String) -> String {
        key.split(separator: "_")
            .map { $0.prefix(1).uppercased() + $0.dropFirst().lowercased() }
            .joined(separator: " ")
    }

    private static func impactText(_ delta: ExpectedValueDelta) -> String? {
        guard let points = delta.points else { return nil }
        let sign = points >= 0 ? "+" : ""
        let formatted = String(format: "%@%.1f projected", sign, points)
        guard let label = delta.label else { return formatted }
        return "\(formatted) (\(label))"
    }

    private static func riskLevel(_ raw: String?) -> OmenRiskLevel {
        switch raw {
        case "low": return .low
        case "high": return .high
        // `medium` and anything unrecognised both land here. Defaulting an unknown risk
        // to `.medium` rather than `.low` keeps an unfamiliar value from reading as safer
        // than it is.
        default: return .medium
        }
    }

    private static func explanationLines(_ explanation: Explanation?) -> [String] {
        guard let explanation else { return [] }
        return [explanation.summary, explanation.whyItMatters, explanation.risk].compactMap { $0 }
    }

    private static func metrics(from recommendation: Recommendation) -> [OmenMetricItem] {
        guard let points = recommendation.expectedValueDelta?.points else { return [] }
        let sign = points >= 0 ? "+" : ""
        return [
            OmenMetricItem(
                label: "Expected value",
                value: String(format: "%.1f", points),
                delta: String(format: "%@%.1f", sign, points),
                deltaDirection: points >= 0 ? .positive : .negative
            )
        ]
    }

    private static func alternatives(from recommendation: Recommendation) -> [OmenDecisionBriefAlternative] {
        // The comparison player is the person being moved off, which is the only
        // alternative the live envelope actually names. Inventing more would be fabrication.
        guard let player = recommendation.comparisonPlayer, let name = player.name else { return [] }
        // `OmenPosition` has no "unknown" case, and picking one to satisfy the type would
        // put a fabricated position chip next to a real player's name. Omitting the row is
        // the honest failure: the verdict and move still render.
        guard let position = position(fromCode: player.position) else { return [] }
        return [
            OmenDecisionBriefAlternative(
                name: name,
                position: position,
                team: player.team,
                meta: nil
            )
        ]
    }

    private static func position(fromCode code: String?) -> OmenPosition? {
        switch code?.uppercased() {
        case "RB": return .rb
        case "WR": return .wr
        case "QB": return .qb
        case "TE": return .te
        case "DEF", "DST", "D/ST": return .def
        case "K": return .k
        default: return nil
        }
    }
}
