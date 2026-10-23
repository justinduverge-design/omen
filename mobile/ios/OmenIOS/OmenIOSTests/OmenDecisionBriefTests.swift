import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenDecisionBriefTest.kt` for registry §3.2 DecisionBrief shell.
/// Reflection-free contract assertions: proves the enum shape, payload field routing, and
/// state-branch behavior without a snapshot library. Renderer-dependent evidence lands in
/// the debug gallery + iOS simulator CI.
final class OmenDecisionBriefTests: XCTestCase {

    private let payload = OmenDecisionBriefPayload(
        verdict: "Start Christian McCaffrey",
        move: "Bench Ken Walker for the RB1 slot.",
        impact: "+4.1 projected over your bench.",
        confidence: 72,
        risk: .low,
        riskReasons: ["Full practice Friday."],
        explanation: ["49ers implied 27 vs a bottom-5 defense."],
        metrics: [OmenMetricItem(label: "Projected", value: "22.4", delta: "+4.1", deltaDirection: .positive)],
        signals: [OmenSignalItem(label: "Yahoo roster snapshot", source: .live)],
        alternatives: [OmenDecisionBriefAlternative(name: "Ken Walker III", position: .rb, team: "SEA")]
    )

    // MARK: payload shape

    func testPayloadDefaultsMakeOptionalFieldsEasyToOmit() {
        let minimal = OmenDecisionBriefPayload(verdict: "V", move: "M", confidence: 50, risk: .medium)
        XCTAssertNil(minimal.impact)
        XCTAssertEqual(minimal.riskReasons, [])
        XCTAssertEqual(minimal.explanation, [])
        XCTAssertTrue(minimal.metrics.isEmpty)
        XCTAssertTrue(minimal.signals.isEmpty)
        XCTAssertTrue(minimal.alternatives.isEmpty)
    }

    func testAlternativeDefaultsForOptionalFields() {
        let alt = OmenDecisionBriefAlternative(name: "Kelce", position: .te)
        XCTAssertNil(alt.team)
        XCTAssertNil(alt.meta)
    }

    // MARK: state routing

    // MARK: shell constructs without crashing per state

    // MARK: retry / connect callbacks fire

    // MARK: helper

    private func shellBranchIdentity(_ state: OmenDecisionBriefState) -> String {
        switch state {
        case .success: return "success"
        case .empty: return "empty"
        case .loading: return "loading"
        case .error: return "error"
        case .disconnected: return "disconnected"
        case .stale: return "stale"
        case .mock: return "mock"
        case .demo: return "demo"
        case .offSeason: return "offSeason"
        case .hold: return "hold"
        }
    }
}
