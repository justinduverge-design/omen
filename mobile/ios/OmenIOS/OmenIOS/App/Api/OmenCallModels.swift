import SwiftUI

// The Omen call's data: what the decision brief carries, moved out of the old DesignSystem view files
// (2026-10-22) so those views can be deleted. Views live in `App/CommandCenter/OmenCall.swift`.

/// Registry §3.2 DecisionBrief shell state, per
/// `Blueprints/specs/mobile/m1-p-p3-decision-brief-shell-brief-v1.md`. One enum for all 8
/// required state surfaces so callers cannot mix a Success render with a preview badge — the
/// shell decides which surface renders.
enum OmenDecisionBriefState {
    case success(OmenDecisionBriefPayload)
    case empty(String)
    case loading
    case error(String, retry: (() -> Void)?)
    case disconnected(connect: (() -> Void)?)
    case stale(OmenDecisionBriefPayload, lastSynced: String)
    case mock(OmenDecisionBriefPayload)
    case demo(OmenDecisionBriefPayload)
    case offSeason
    /// `state: "empty"` with `call_kind: "hold"`: Omen weighed everything and the honest call is to keep
    /// the lineup. Distinct from `.empty`, which says only that nothing cleared the bar and shows no work.
    case hold(OmenHoldPayload)
}

/// What the Hold call shows. Every figure in it is one the engine computed and the server sent; nothing
/// here is derived on the client except formatting, so a missing number is simply not drawn.
struct OmenHoldPayload: Equatable {
    struct Reason: Equatable, Identifiable {
        let id: Int
        let text: String
    }

    /// The closest swap that lost, with the engine's own explanation of why.
    struct Alternative: Equatable {
        let title: String
        let figures: String?
        let whyItLost: String?
    }

    struct Considered: Equatable, Identifiable {
        let id: Int
        let kind: String
        let detail: String
    }

    /// True when the league has no projections to rank against (Yahoo today). Rendered as "cannot rank",
    /// never as a confident hold.
    let cannotRank: Bool
    let headline: String
    let summary: String?
    let reasons: [Reason]
    let alternative: Alternative?
    let considered: [Considered]
    /// "14 of 16 players have a projection", or the absence of projections, as the server reported it.
    let coverage: String?
}

/// DecisionBrief payload per shell brief §2 field set. Any field may be absent.
struct OmenDecisionBriefPayload {
    /// `recommendation.type` — "start_sit", "waiver_pickup", … Rendered as the call's kind above
    /// the call itself (`OmenCall-v1` E023). The envelope has always sent it; the client dropped
    /// it until 2026-09-17.
    let callType: String?
    let verdict: String
    let move: String
    let impact: String?
    /// Optional since 2026-08-29. It was `Int`, and `OmenDecision` filled a missing score with
    /// `?? 0`, so a brief the server declined to score displayed "Confidence 0" — a claim Omen
    /// never made, and indistinguishable from genuine zero confidence. The struct's own
    /// contract above already said any field may be absent; this one did not honour it.
    let confidence: Int?
    /// `omen-decision-brief.v2`: a qualitative band chosen server-side. Not a calibrated
    /// probability — the server's own policy note says so, and neither is the vocabulary a
    /// relabelled percentage the client may re-derive.
    let confidenceBand: OmenConfidenceBand?
    let confidenceDrivers: [String]
    /// What Omen could not read, when there is no band at all. Never rendered alongside one.
    let confidenceUnavailableReason: [String]
    let risk: OmenRiskLevel
    let riskReasons: [String]
    let explanation: [String]
    let metrics: [OmenMetricItem]
    let signals: [OmenSignalItem]
    let alternatives: [OmenDecisionBriefAlternative]
    let readComparison: OmenReadComparison?
    /// The call's players with their real numbers (warehouse stats and Omen Grades).
    let players: [OmenCallPlayerNumbers]
    /// Optional published football-intelligence context. This is supporting evidence for the
    /// server-owned call, never a second recommendation. The API mapper admits only published
    /// `available` or `stale` signals with a real summary. Insufficient coverage remains a
    /// limitation and cannot become contextual advice.
    let footballIntelligence: OmenFootballIntelligenceContext?
    /// Set only for `recommendation.type == "trade_suggestion"`. Drives the trade presentation and the
    /// hand-off to the Trade screens.
    let tradeCall: OmenTradeCall?

    init(
        verdict: String,
        callType: String? = nil,
        move: String,
        impact: String? = nil,
        confidence: Int? = nil,
        confidenceBand: OmenConfidenceBand? = nil,
        confidenceDrivers: [String] = [],
        confidenceUnavailableReason: [String] = [],
        risk: OmenRiskLevel,
        riskReasons: [String] = [],
        explanation: [String] = [],
        metrics: [OmenMetricItem] = [],
        signals: [OmenSignalItem] = [],
        alternatives: [OmenDecisionBriefAlternative] = [],
        readComparison: OmenReadComparison? = nil,
        footballIntelligence: OmenFootballIntelligenceContext? = nil,
        tradeCall: OmenTradeCall? = nil,
        players: [OmenCallPlayerNumbers] = []
    ) {
        self.players = players
        self.callType = callType
        self.verdict = verdict
        self.move = move
        self.impact = impact
        self.confidence = confidence
        self.confidenceBand = confidenceBand
        self.confidenceDrivers = confidenceDrivers
        self.confidenceUnavailableReason = confidenceUnavailableReason
        self.risk = risk
        self.riskReasons = riskReasons
        self.explanation = explanation
        self.metrics = metrics
        self.signals = signals
        self.alternatives = alternatives
        self.readComparison = readComparison
        self.footballIntelligence = footballIntelligence
        self.tradeCall = tradeCall
    }
}

/// One player in the call, with the real numbers behind him: season PPG and last games, recent usage,
/// and the Omen Grade with the efficiency stats under it. Lines the server could not fill are nil.
struct OmenCallPlayerNumbers: Equatable, Identifiable {
    let name: String
    let role: String
    let statsLine: String?
    let usageLine: String?
    let gradeLine: String?
    let gradeDetails: [String]

    var id: String { "\(role)-\(name)" }
    var isEmpty: Bool { statsLine == nil && usageLine == nil && gradeLine == nil }
}

struct OmenReadComparison {
    let authority: OmenReadAuthority
    let providerLabel: String
    let providerPoints: Double?
    let omenPoints: Double?
    let position: String?
    let scoringFamily: String?
    let sampleSize: Int?
    let weeks: Int?
    let evaluatedAt: String?
    let omenMAE: Double?
    let providerMAE: Double?
    let crosswindGap: Double?
    let crosswindThreshold: Double?
    let portents: [String]

    var scopeLabel: String? {
        let scope = [position, scoringFamily?.uppercased()].compactMap { $0 }.joined(separator: " · ")
        return scope.isEmpty ? nil : scope
    }

    var authorityLabel: String {
        switch authority {
        case .providerLeads: "\(providerLabel) leads"
        default: authority.customerLabel
        }
    }
}

struct OmenFootballIntelligenceContext {
    let status: String
    let summary: String
    let evidenceAuthority: String
    let coverage: String?
    let freshness: String
    let whatCouldChangeThis: [String]
}

enum OmenConfidenceBand: String, Equatable {
    case confident, leaning, coinFlip = "coin_flip"
    var label: String { self == .coinFlip ? "Coin flip" : rawValue.capitalized }
}

/// One "considered but not recommended" player row under the primary recommendation.
struct OmenDecisionBriefAlternative: Identifiable {
    let id = UUID()
    let name: String
    let position: OmenPosition
    let team: String?
    let meta: String?

    init(name: String, position: OmenPosition, team: String? = nil, meta: String? = nil) {
        self.name = name
        self.position = position
        self.team = team
        self.meta = meta
    }
}

/// Data-source honesty categories the SignalList exposes (registry §2.3 data-* family).
/// The badge label mirrors this so the meaning survives grayscale — never a badge without
/// its label.
enum OmenSignalSource { case live, stub, mock, unavailable }

/// Evidence role is independent of availability. A live projection is still a projection,
/// and an unavailable verified source is still a limitation for this decision.
enum OmenEvidenceKind: String { case verified, projection, model, inference, limitation }

/// The transport-neutral native binding for `decision-capabilities.v1`.
///
/// This lives beside the evidence presentation primitives so Omen, Command, League,
/// Start/Sit, Trade, and Ledger use the same semantic vocabulary without sharing a layout.
/// Unknown wire values remain strings: callers must fail safe rather than promote a future
/// server state into a live or verified claim.
struct OmenDecisionCapability: Decodable, Equatable {
    let name: String?
    let state: String?
    let used: Bool?
    let kind: String?
    let source: String?
    let statement: String?
    let observedAt: String?
    let freshUntil: String?
    let reasonCode: String?
    let coverageState: String?
    let reconciliationState: String?

    enum CodingKeys: String, CodingKey {
        case name, state, used, kind, source, statement
        case observedAt = "observed_at"
        case freshUntil = "fresh_until"
        case reasonCode = "reason_code"
        case coverageState = "coverage_state"
        case reconciliationState = "reconciliation_state"
    }
}

/// One row in a SignalList. `detail` is optional secondary text under the label.
struct OmenSignalItem: Identifiable {
    let id = UUID()
    let label: String
    let source: OmenSignalSource
    let detail: String?
    let kind: OmenEvidenceKind?
    /// **Did this input change the answer?** A separate question from whether it could be read,
    /// and the client dropped it until 2026-09-17 — so "we used this" and "we have it and it did
    /// not matter here" were indistinguishable on screen.
    ///
    /// `shared-decision-context.v1` is explicit that *"a resolved source is not described as
    /// decision-making evidence until an engine marks it used"*, and
    /// `capability-expression-v1.md` needs this axis to tell two of its four presentation classes
    /// apart. `nil` means the server did not say, which is not the same as `false`.
    let used: Bool?

    init(
        label: String,
        source: OmenSignalSource,
        detail: String? = nil,
        kind: OmenEvidenceKind? = nil,
        used: Bool? = nil
    ) {
        self.label = label
        self.source = source
        self.detail = detail
        self.kind = kind
        self.used = used
    }
}

/// Sign of the delta drives which invariant token colors the delta text.
enum OmenMetricDelta { case none, positive, negative }

/// One metric row inside a MetricStrip. `confidence` is optional 0..100 for a subline bar.
struct OmenMetricItem: Identifiable {
    let id = UUID()
    let label: String
    let value: String
    let delta: String?
    let deltaDirection: OmenMetricDelta
    let confidence: Int?

    init(
        label: String,
        value: String,
        delta: String? = nil,
        deltaDirection: OmenMetricDelta = .none,
        confidence: Int? = nil
    ) {
        self.label = label
        self.value = value
        self.delta = delta
        self.deltaDirection = deltaDirection
        self.confidence = confidence
    }
}

/// Registry §2.3 risk families — badge + text label together always (color is never alone).
enum OmenRiskLevel { case low, medium, high }

/// Registry §2.3 position families. The uppercase abbreviation is what renders on both
/// PlayerRow and PlayerChip so meaning survives grayscale (color is never alone —
/// registry §1, §4).
enum OmenPosition { case rb, wr, qb, te, def, k }

extension OmenDecisionBriefState {
    /// The call's payload when there is one, for the full argument.
    var payload: OmenDecisionBriefPayload? {
        switch self {
        case .success(let p), .stale(let p, _), .mock(let p), .demo(let p): return p
        default: return nil
        }
    }
}
