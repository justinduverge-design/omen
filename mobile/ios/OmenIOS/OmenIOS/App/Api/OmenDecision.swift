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
    /// `omen-decision-brief.v3` puts the recovery block under `platform.recovery`, not at the top
    /// level (the pre-v3 envelope did). Both are read; see `recoveryMessage`.
    let platform: Platform?
    /// Present on `state: "error"`: `{ code, message, retryable }`.
    let error: ErrorBody?
    let explanation: Explanation?
    let confidence: Confidence?
    let warnings: [String]?
    let signals: [String: Signal]?
    let capabilities: [OmenDecisionCapability]?
    /// Optional evidence. If its shape ever drifts, the recommendation must still render, so this
    /// is read leniently: an unreadable football-intelligence block becomes nil instead of failing
    /// the whole brief (this is exactly how a numeric `quality.confidence` broke every Omen call).
    @LenientDecoded var footballIntelligence: FootballIntelligence?
    /// `success` carries the kind of call (`start_sit`, `waiver_pickup`, `trade_suggestion`); `empty` carries
    /// `hold`. Read leniently, so a drifting value is nil, not a failure.
    @LenientDecoded var callKind: String?
    /// Which league the server actually answered for. Lenient for the same reason as every optional block
    /// added after the first release: it must never discard the brief (#504).
    @LenientDecoded var answeredFor: AnsweredFor?
    /// The reasoned Hold call that replaced "Nothing to recommend". Lenient at every level.
    @LenientDecoded var hold: Hold?

    enum CodingKeys: String, CodingKey {
        case contractVersion = "contract_version"
        case state, mode, recommendation, recovery, platform, error, explanation, confidence, warnings, signals, capabilities
        case footballIntelligence = "football_intelligence"
        case callKind = "call_kind"
        case answeredFor = "answered_for"
        case hold
    }

    struct AnsweredFor: Decodable, Equatable {
        let contextID: String?
        let platform: String?
        let leagueID: String?
        let teamID: String?
        /// `requested` or `account_selected`.
        let selection: String?
        /// False when the league asked for is not one the account plays in.
        let matched: Bool?

        enum CodingKeys: String, CodingKey {
            case platform, selection, matched
            case contextID = "context_id"
            case leagueID = "league_id"
            case teamID = "team_id"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            contextID = (try? c.decodeIfPresent(String.self, forKey: .contextID)) ?? nil
            platform = (try? c.decodeIfPresent(String.self, forKey: .platform)) ?? nil
            // Provider league ids are strings on the wire; tolerate a number rather than lose the field.
            if let text = (try? c.decodeIfPresent(String.self, forKey: .leagueID)) ?? nil {
                leagueID = text
            } else if let number = (try? c.decodeIfPresent(Int.self, forKey: .leagueID)) ?? nil {
                leagueID = String(number)
            } else {
                leagueID = nil
            }
            teamID = (try? c.decodeIfPresent(String.self, forKey: .teamID)) ?? nil
            selection = (try? c.decodeIfPresent(String.self, forKey: .selection)) ?? nil
            matched = (try? c.decodeIfPresent(Bool.self, forKey: .matched)) ?? nil
        }

        /// The league named, when both halves of it are present.
        var scope: OmenCallScope? {
            guard let platform, let leagueID else { return nil }
            return OmenCallScope(platform: platform, leagueID: leagueID)
        }

        init(platform: String?, leagueID: String?, matched: Bool? = true, selection: String? = nil) {
            self.contextID = nil
            self.platform = platform
            self.leagueID = leagueID
            self.teamID = nil
            self.selection = selection
            self.matched = matched
        }
    }

    struct Hold: Decodable, Equatable {
        struct Reason: Decodable, Equatable {
            let code: String?
            let text: String?
        }
        struct Figure: Decodable, Equatable {
            let name: String?
            let projected: Double?
        }
        struct Alternative: Decodable, Equatable {
            let kind: String?
            let slot: String?
            let start: Figure?
            let sit: Figure?
            let delta: Double?
            let threshold: Double?
            let whyNot: String?
            enum CodingKeys: String, CodingKey {
                case kind, slot, start, sit, delta, threshold
                case whyNot = "why_not"
            }
            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                kind = (try? c.decodeIfPresent(String.self, forKey: .kind)) ?? nil
                slot = (try? c.decodeIfPresent(String.self, forKey: .slot)) ?? nil
                start = (try? c.decodeIfPresent(Figure.self, forKey: .start)) ?? nil
                sit = (try? c.decodeIfPresent(Figure.self, forKey: .sit)) ?? nil
                delta = (try? c.decodeIfPresent(Double.self, forKey: .delta)) ?? nil
                threshold = (try? c.decodeIfPresent(Double.self, forKey: .threshold)) ?? nil
                whyNot = (try? c.decodeIfPresent(String.self, forKey: .whyNot)) ?? nil
            }
        }
        struct Considered: Decodable, Equatable {
            let kind: String?
            let outcome: String?
            let reason: String?
            let detail: String?
        }
        struct Projections: Decodable, Equatable {
            let available: Bool?
            let playersWithProjection: Int?
            let playersTotal: Int?
            enum CodingKeys: String, CodingKey {
                case available
                case playersWithProjection = "players_with_projection"
                case playersTotal = "players_total"
            }
        }

        let headline: String?
        let summary: String?
        let reasons: [Reason]
        let bestAlternative: Alternative?
        let considered: [Considered]
        let projections: Projections?
        let thresholdPoints: Double?

        enum CodingKeys: String, CodingKey {
            case headline, summary, reasons, considered, projections
            case bestAlternative = "best_alternative"
            case thresholdPoints = "threshold_points"
        }

        /// Each member is read on its own and each list element on its own, so one drifting reason does not
        /// take the other reasons, or the brief, with it.
        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            headline = (try? c.decodeIfPresent(String.self, forKey: .headline)) ?? nil
            summary = (try? c.decodeIfPresent(String.self, forKey: .summary)) ?? nil
            reasons = Self.lenientList(c, .reasons)
            considered = Self.lenientList(c, .considered)
            bestAlternative = (try? c.decodeIfPresent(Alternative.self, forKey: .bestAlternative)) ?? nil
            projections = (try? c.decodeIfPresent(Projections.self, forKey: .projections)) ?? nil
            thresholdPoints = (try? c.decodeIfPresent(Double.self, forKey: .thresholdPoints)) ?? nil
        }

        private static func lenientList<T: Decodable>(_ c: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys) -> [T] {
            guard var list = try? c.nestedUnkeyedContainer(forKey: key) else { return [] }
            var out: [T] = []
            while !list.isAtEnd {
                if let item = try? list.decode(T.self) { out.append(item) } else { _ = try? list.decode(Skip.self) }
            }
            return out
        }

        private struct Skip: Decodable {}
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
        /// The structured swap on a `trade_suggestion` call. Optional and lenient: absent on older servers
        /// and on other call kinds, and a malformed block decodes to nil instead of discarding the brief.
        @LenientDecoded var trade: Trade?

        enum CodingKeys: String, CodingKey {
            case type, title, move, confidence, risk, explanation, trade
            case primaryPlayer = "primary_player"
            case comparisonPlayer = "comparison_player"
            case expectedValueDelta = "expected_value_delta"
        }
    }

    /// `recommendation.trade`: the partner and the players on each side, as the server computed them.
    /// Each player entry decodes on its own, so one bad entry is dropped rather than failing the block.
    struct Trade: Decodable, Equatable {
        struct TradePlayer: Decodable, Equatable {
            let name: String?
            let position: String?
            let playerKey: String?

            enum CodingKeys: String, CodingKey {
                case name, position
                case playerKey = "player_key"
            }
        }

        let partnerTeamName: String?
        let partnerTeamID: String?
        let give: [TradePlayer]
        let receive: [TradePlayer]

        enum CodingKeys: String, CodingKey {
            case give, receive
            case partnerTeamName = "partner_team_name"
            case partnerTeamID = "partner_team_id"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            partnerTeamName = try? c.decodeIfPresent(String.self, forKey: .partnerTeamName)
            // The id is a string on the wire; tolerate a number rather than losing the partner.
            if let id = try? c.decodeIfPresent(String.self, forKey: .partnerTeamID) {
                partnerTeamID = id
            } else if let n = try? c.decodeIfPresent(Int.self, forKey: .partnerTeamID) {
                partnerTeamID = String(n)
            } else {
                partnerTeamID = nil
            }
            give = Self.players(c, .give)
            receive = Self.players(c, .receive)
        }

        private static func players(_ c: KeyedDecodingContainer<CodingKeys>, _ key: CodingKeys) -> [TradePlayer] {
            guard var list = try? c.nestedUnkeyedContainer(forKey: key) else { return [] }
            var out: [TradePlayer] = []
            while !list.isAtEnd {
                if let p = try? list.decode(TradePlayer.self) { out.append(p) } else { _ = try? list.decode(Skip.self) }
            }
            return out
        }

        private struct Skip: Decodable {}
    }

    /// The server's own user-safe recovery sentence for every non-success state. Rendered
    /// verbatim rather than re-worded on the client, so there is one copy of this truth.
    struct Recovery: Decodable, Equatable {
        let code: String?
        let message: String?
        let cta: String?
    }

    struct Platform: Decodable, Equatable {
        let name: String?
        let status: String?
        let recovery: Recovery?
    }

    struct ErrorBody: Decodable, Equatable {
        let code: String?
        let message: String?
    }

    struct Player: Decodable, Equatable {
        /// The provider's player key. Carried so a trade call can hand Compare the same ids the server used.
        let id: String?
        let name: String?
        let position: String?
        let team: String?
        let providerPoints: Double?
        /// Internal wire key is `sight`; native product copy always presents this as Omen's Read.
        /// Lenient so an experimental driver cannot discard the recommendation.
        @LenientDecoded var omenRead: OmenRead?

        enum CodingKeys: String, CodingKey {
            case id, name, position, team
            case providerPoints = "projected_points"
            case omenRead = "sight"
        }
    }

    struct OmenRead: Decodable, Equatable {
        struct Driver: Decodable, Equatable {
            let name: String?
            let points: Double?
        }

        struct Authority: Decodable, Equatable {
            let version: String?
            let state: String?
            let position: String?
            let scoringFamily: String?
            let horizon: String?
            let modelVersion: String?
            let sampleSize: Int?
            let weeks: Int?
            let evaluatedAt: String?
            let metric: String?
            let omenMAE: Double?
            let providerMAE: Double?

            enum CodingKeys: String, CodingKey {
                case version, state, position, horizon, weeks, metric
                case scoringFamily = "scoring_family"
                case modelVersion = "model_version"
                case sampleSize = "sample_size"
                case evaluatedAt = "evaluated_at"
                case omenMAE = "omen_mae"
                case providerMAE = "provider_mae"
            }
        }

        struct Crosswind: Decodable, Equatable {
            let gapPoints: Double?
            let thresholdPoints: Double?
            let drivers: [Driver]

            enum CodingKeys: String, CodingKey {
                case drivers
                case gapPoints = "gap_points"
                case thresholdPoints = "threshold_points"
            }

            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                gapPoints = try? c.decodeIfPresent(Double.self, forKey: .gapPoints)
                thresholdPoints = try? c.decodeIfPresent(Double.self, forKey: .thresholdPoints)
                drivers = (try? c.decodeIfPresent([Driver].self, forKey: .drivers)) ?? []
            }
        }

        let version: String?
        let season: Int?
        let throughWeek: Int?
        let position: String?
        let phase: String?
        let grade: Int?
        let confidence: String?
        let flexGrade: Int?
        let points: Double?
        let drivers: [Driver]
        let authority: Authority?
        let crosswind: Crosswind?

        enum CodingKeys: String, CodingKey {
            case version, season, position, phase, grade, confidence, drivers, authority, crosswind
            case throughWeek = "through_week"
            case flexGrade = "flex_grade"
            case points = "sight_points"
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            version = try? c.decodeIfPresent(String.self, forKey: .version)
            season = try? c.decodeIfPresent(Int.self, forKey: .season)
            throughWeek = try? c.decodeIfPresent(Int.self, forKey: .throughWeek)
            position = try? c.decodeIfPresent(String.self, forKey: .position)
            phase = try? c.decodeIfPresent(String.self, forKey: .phase)
            grade = try? c.decodeIfPresent(Int.self, forKey: .grade)
            confidence = try? c.decodeIfPresent(String.self, forKey: .confidence)
            flexGrade = try? c.decodeIfPresent(Int.self, forKey: .flexGrade)
            points = try? c.decodeIfPresent(Double.self, forKey: .points)
            drivers = (try? c.decodeIfPresent([Driver].self, forKey: .drivers)) ?? []
            authority = try? c.decodeIfPresent(Authority.self, forKey: .authority)
            crosswind = try? c.decodeIfPresent(Crosswind.self, forKey: .crosswind)
        }
    }

    struct ExpectedValueDelta: Decodable, Equatable {
        let points: Double?
        let label: String?
    }

    struct Confidence: Decodable, Equatable {
        let score: Int?
        let band: String?
        let drivers: [String]?
        /// Present only when the server produced no confidence at all. Says what Omen could
        /// not read, rather than naming a fourth, worst band.
        let unavailableReason: [String]?
        let label: String?
        let rationale: String?

        enum CodingKeys: String, CodingKey {
            case score, band, drivers, label, rationale
            case unavailableReason = "unavailable_reason"
        }
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

    struct FootballIntelligence: Decodable, Equatable {
        let contractVersion: String?
        let status: String?
        let reasonCode: String?
        let signalType: String?
        let asOfUTC: String?
        let summary: String?
        let interpretation: Interpretation?
        let evidence: Evidence?
        let quality: Quality?
        let freshness: Freshness?
        let publication: Publication?

        enum CodingKeys: String, CodingKey {
            case status, summary, interpretation, evidence, quality, freshness, publication
            case contractVersion = "contract_version"
            case reasonCode = "reason_code"
            case signalType = "signal_type"
            case asOfUTC = "as_of_utc"
        }

        struct Interpretation: Decodable, Equatable {
            let direction: String?
            let associationOnly: Bool?
            let whatCouldChangeThis: [String]?
            enum CodingKeys: String, CodingKey {
                case direction
                case associationOnly = "association_only"
                case whatCouldChangeThis = "what_could_change_this"
            }
        }

        struct Evidence: Decodable, Equatable {
            let sourceArtifacts: [String]?
            let games: Int?
            let plays: Int?
            let chartedPlays: Int?
            let coverageRatio: Double?
            enum CodingKeys: String, CodingKey {
                case games, plays
                case sourceArtifacts = "source_artifacts"
                case chartedPlays = "charted_plays"
                case coverageRatio = "coverage_ratio"
            }
        }

        struct Quality: Decodable, Equatable {
            let state: String?
            let coverage: String?
            let confidence: String?
            let limitations: [String]?

            init(from decoder: Decoder) throws {
                let c = try decoder.container(keyedBy: CodingKeys.self)
                state = try c.decodeIfPresent(String.self, forKey: .state)
                coverage = try c.decodeIfPresent(String.self, forKey: .coverage)
                limitations = try? c.decodeIfPresent([String].self, forKey: .limitations)
                // The server has sent a label, null, and a number here. Keep whichever it is as text.
                if let text = try? c.decodeIfPresent(String.self, forKey: .confidence) {
                    confidence = text
                } else if let number = try? c.decodeIfPresent(Double.self, forKey: .confidence) {
                    confidence = String(number)
                } else {
                    confidence = nil
                }
            }

            enum CodingKeys: String, CodingKey { case state, coverage, confidence, limitations }
        }

        struct Freshness: Decodable, Equatable {
            let state: String?
            let computedAtUTC: String?
            let latestObservationAtUTC: String?
            let staleAfterUTC: String?
            enum CodingKeys: String, CodingKey {
                case state
                case computedAtUTC = "computed_at_utc"
                case latestObservationAtUTC = "latest_observation_at_utc"
                case staleAfterUTC = "stale_after_utc"
            }
        }

        struct Publication: Decodable, Equatable {
            let artifactID: String?
            let artifactVersion: String?
            let publishedAtUTC: String?
            enum CodingKeys: String, CodingKey {
                case artifactID = "artifact_id"
                case artifactVersion = "artifact_version"
                case publishedAtUTC = "published_at_utc"
            }
        }
    }

}

extension LeagueCarouselViewModel.Page {
    /// The league this page stands for, in the form every personalized request names it.
    var omenCallScope: OmenCallScope { OmenCallScope(platform: platform, leagueID: leagueID) }
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
            if callKind == "hold", let holdState = holdPayload() {
                return .hold(holdState)
            }
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
            return .error(recoveryMessage ?? Self.unreadableMessage, retry: onRetry)
        }
    }

    /// The server's own user-safe sentence for a state the user cannot render a recommendation from,
    /// wherever the contract version put it: the legacy top-level `recovery`, v3's
    /// `platform.recovery`, or an `error.message`. Before this read all three, an expired ESPN
    /// connection told the user to "update the app" instead of to reconnect ESPN (S0 contract test).
    var recoveryMessage: String? {
        [recovery?.message, platform?.recovery?.message, error?.message]
            .compactMap { $0?.trimmingCharacters(in: .whitespacesAndNewlines) }
            .first { !$0.isEmpty }
    }

    /// Maps the server's Hold block to what the screen draws. Returns nil when there is nothing to show, so
    /// the caller falls back to the plain empty state rather than a blank card.
    private func holdPayload() -> OmenHoldPayload? {
        guard let hold else { return nil }
        let reasons = hold.reasons.compactMap { $0.text.nonEmpty }
        let cannotRank = hold.projections?.available == false
            || hold.reasons.first?.code == "projections_unavailable"
        let headline: String
        if cannotRank {
            headline = "Omen cannot rank a move for this league"
        } else {
            headline = hold.headline.nonEmpty ?? "Hold your lineup this week"
        }
        // With no projections the server's summary talks about waivers; the first reason carries the truth.
        let summary = cannotRank ? reasons.first : hold.summary.nonEmpty
        guard summary != nil || !reasons.isEmpty else { return nil }

        let considered = hold.considered.enumerated().compactMap { index, item -> OmenHoldPayload.Considered? in
            guard let detail = item.detail.nonEmpty else { return nil }
            return .init(id: index, kind: Self.consideredLabel(item.kind), detail: detail)
        }
        return OmenHoldPayload(
            cannotRank: cannotRank,
            headline: headline,
            summary: summary,
            // When the first reason is already the summary it is not listed twice.
            reasons: (cannotRank ? Array(reasons.dropFirst()) : reasons).enumerated().map { .init(id: $0.offset, text: $0.element) },
            alternative: Self.holdAlternative(hold.bestAlternative, threshold: hold.thresholdPoints),
            considered: considered,
            coverage: Self.projectionCoverage(hold.projections)
        )
    }

    private static func consideredLabel(_ kind: String?) -> String {
        switch kind {
        case "start_sit": return "Lineup swap"
        case "waiver_pickup": return "Waiver pickup"
        case "trade_suggestion": return "Trade"
        default: return "Also weighed"
        }
    }

    private static func holdAlternative(_ alt: Hold.Alternative?, threshold: Double?) -> OmenHoldPayload.Alternative? {
        // `best_alternative` is null when there is nothing to compare; no number is invented in that case.
        guard let alt, let start = alt.start?.name.nonEmpty, let sit = alt.sit?.name.nonEmpty else { return nil }
        let slot = alt.slot.nonEmpty.map { " at \($0)" } ?? ""
        var figures: String?
        if let a = alt.start?.projected, let b = alt.sit?.projected {
            var line = String(format: "%.1f vs %.1f projected", a, b)
            if let delta = alt.delta {
                line += String(format: ", %@%.1f", delta >= 0 ? "+" : "-", abs(delta))
                if let bar = alt.threshold ?? threshold { line += String(format: " against a %.1f point bar", bar) }
            }
            figures = line
        }
        return .init(title: "Start \(start) over \(sit)\(slot)", figures: figures, whyItLost: alt.whyNot.nonEmpty)
    }

    private static func projectionCoverage(_ projections: Hold.Projections?) -> String? {
        guard let projections else { return nil }
        if projections.available == false { return "No projections for this league this week." }
        guard let have = projections.playersWithProjection, let total = projections.playersTotal, total > 0 else { return nil }
        return "\(have) of \(total) players on your roster have a projection."
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
            callType: recommendation.type,
            move: move,
            impact: recommendation.expectedValueDelta.flatMap(Self.impactText),
            // Never `?? 0`. `src/routes/omen.js` persists a missing score as null behind a
            // `Number.isFinite` guard — the server treats absence as a real, expected state,
            // and the client must not manufacture a number the server declined to give.
            confidence: conf?.score,
            confidenceBand: Self.confidenceBand(conf?.band),
            confidenceDrivers: conf?.drivers ?? [],
            confidenceUnavailableReason: conf?.unavailableReason ?? [],
            risk: Self.riskLevel(recommendation.risk?.level),
            riskReasons: recommendation.risk?.reasons ?? [],
            explanation: Self.explanationLines(explanationBlock),
            metrics: Self.metrics(from: recommendation),
            signals: Self.signalItems(capabilities: capabilities, legacySignals: signals),
            alternatives: Self.alternatives(from: recommendation),
            readComparison: Self.readComparison(
                player: recommendation.primaryPlayer,
                provider: answeredFor?.platform ?? platform?.name
            ),
            footballIntelligence: Self.footballIntelligenceContext(footballIntelligence),
            tradeCall: tradeCall()
        )
    }

    private static func readComparison(player: Player?, provider: String?) -> OmenReadComparison? {
        guard let read = player?.omenRead, read.points != nil || player?.providerPoints != nil else { return nil }
        let authority = read.authority
        let state = authority?.state.flatMap(OmenReadAuthority.init(rawValue:)) ?? .unresolvedLowSample
        let providerKey = provider?.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        let providerName: String
        switch providerKey {
        case "espn": providerName = "ESPN"
        case "yahoo": providerName = "Yahoo"
        case "sleeper": providerName = "Sleeper"
        default: providerName = "Provider"
        }
        return OmenReadComparison(
            authority: state,
            providerLabel: "\(providerName) Read",
            providerPoints: player?.providerPoints,
            omenPoints: read.points,
            position: authority?.position ?? read.position ?? player?.position,
            scoringFamily: authority?.scoringFamily,
            sampleSize: authority?.sampleSize,
            weeks: authority?.weeks,
            evaluatedAt: authority?.evaluatedAt,
            omenMAE: authority?.omenMAE,
            providerMAE: authority?.providerMAE,
            crosswindGap: read.crosswind?.gapPoints,
            crosswindThreshold: read.crosswind?.thresholdPoints,
            portents: read.drivers.compactMap { driver in
                guard let name = driver.name else { return nil }
                let label = name.replacingOccurrences(of: "_", with: " ").capitalized
                return driver.points.map { "\(label) · \(String(format: "%+.1f", $0))" } ?? label
            }
        )
    }

    private static func footballIntelligenceContext(
        _ signal: FootballIntelligence?
    ) -> OmenFootballIntelligenceContext? {
        guard let signal,
              ["available", "stale"].contains(signal.status),
              let status = signal.status,
              let summary = signal.summary?.trimmingCharacters(in: .whitespacesAndNewlines),
              !summary.isEmpty,
              signal.quality?.state != "candidate",
              signal.quality?.state != "unaccepted",
              signal.quality?.state != "disputed",
              let artifactID = signal.publication?.artifactID, !artifactID.isEmpty,
              let artifactVersion = signal.publication?.artifactVersion, !artifactVersion.isEmpty,
              let publishedAt = signal.publication?.publishedAtUTC, !publishedAt.isEmpty
        else { return nil }

        let authority = signal.interpretation?.associationOnly == true
            ? "Published derived signal · association only"
            : "Published derived signal"
        let coverage = coverageSummary(signal.evidence, quality: signal.quality)
        let freshnessState = signal.freshness?.state ?? status
        let observed = signal.freshness?.latestObservationAtUTC ?? signal.asOfUTC
        let freshness = observed.map { "\(freshnessState.replacingOccurrences(of: "_", with: " ")) · observations through \($0)" }
            ?? freshnessState.replacingOccurrences(of: "_", with: " ")

        return OmenFootballIntelligenceContext(
            status: status,
            summary: summary,
            evidenceAuthority: authority,
            coverage: coverage,
            freshness: freshness,
            whatCouldChangeThis: signal.interpretation?.whatCouldChangeThis ?? []
        )
    }

    private static func coverageSummary(_ evidence: FootballIntelligence.Evidence?, quality: FootballIntelligence.Quality?) -> String? {
        guard let evidence else { return quality?.coverage }
        var parts: [String] = []
        if let games = evidence.games { parts.append("\(games) games") }
        if let plays = evidence.plays { parts.append("\(plays) plays") }
        if let charted = evidence.chartedPlays { parts.append("\(charted) charted") }
        if let ratio = evidence.coverageRatio { parts.append("\(Int((ratio * 100).rounded()))% coverage") }
        if parts.isEmpty, let coverage = quality?.coverage { parts.append(coverage.replacingOccurrences(of: "_", with: " ")) }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    private static func confidenceBand(_ raw: String?) -> OmenConfidenceBand? {
        guard let raw else { return nil }
        return OmenConfidenceBand(rawValue: raw)
    }

    private static func signalItems(capabilities: [OmenDecisionCapability]?, legacySignals signals: [String: Signal]?) -> [OmenSignalItem] {
        if let capabilities, !capabilities.isEmpty {
            // `not_requested` is NOT a limitation and must never render as one. A profile only
            // resolves what it needs — `omen_mvp` does not request trade rosters unless no
            // lineup or waiver candidate clears the threshold — so an input that was never asked
            // for is out of scope, not missing. It fell through `signalSource`'s default to
            // `.unavailable` until 2026-09-17, which told the user Omen had failed to read
            // something it never wanted. Absence of a claim is not a claim of absence, and a
            // manufactured limitation is what teaches people to ignore the real ones.
            // Rule: `capability-expression-v1.md`, "the four presentation classes".
            // Server order is preserved. This alphabetised until 2026-09-17, which is a claim
            // about relative importance that no contract supports — and Android never sorted, so
            // the two platforms showed the same evidence in different orders.
            return capabilities.filter { $0.state != "not_requested" }.map { capability in
                OmenSignalItem(
                    label: signalLabel(capability.name ?? "unknown_capability"),
                    source: signalSource(capability.state),
                    detail: capability.statement ?? capability.source,
                    kind: evidenceKind(capability.kind),
                    used: capability.used
                )
            }
        }
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

    private static func evidenceKind(_ raw: String?) -> OmenEvidenceKind? {
        raw.flatMap(OmenEvidenceKind.init(rawValue:))
    }

    private static func signalLabel(_ key: String) -> String {
        if key == "exact_espn_scoring_unavailable" {
            return "Exact ESPN scoring unavailable"
        }
        return key.split(separator: "_")
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


private extension Optional where Wrapped == String {
    /// Trimmed text, or nil when absent or blank.
    var nonEmpty: String? {
        guard let text = self?.trimmingCharacters(in: .whitespacesAndNewlines), !text.isEmpty else { return nil }
        return text
    }
}

/// Decodes `T?` and swallows a shape mismatch inside it, so one drifting optional block cannot take
/// down the whole response. Missing key and null are nil, as for any optional.
@propertyWrapper
struct LenientDecoded<T: Decodable>: Decodable {
    var wrappedValue: T?
    init(wrappedValue: T?) { self.wrappedValue = wrappedValue }
    init(from decoder: Decoder) throws {
        wrappedValue = try? T(from: decoder)
    }
}

extension LenientDecoded: Equatable where T: Equatable {}

extension KeyedDecodingContainer {
    func decode<T>(_ type: LenientDecoded<T>.Type, forKey key: Key) throws -> LenientDecoded<T> {
        LenientDecoded(wrappedValue: try? decodeIfPresent(T.self, forKey: key))
    }
}
