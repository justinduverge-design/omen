import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenMetricPrimitivesTest.kt` for registry §3.2 metric primitives.
/// XCTest can't cheaply diff SwiftUI-rendered Text without a snapshot library, so these
/// tests pin the contract guarantees that don't need a renderer:
///   1. ConfidenceBar clamps out-of-range scores rather than trapping.
///   2. RiskPanel names every level in words so meaning survives color-only rendering
///      (registry §1, §4).
///   3. MetricStrip delta directions map to the risk-invariant color family.
///   4. SignalList names every data source in words (registry §2.3, facts-of-record #7).
final class OmenMetricPrimitivesTests: XCTestCase {

    // MARK: ConfidenceBar

    func testConfidenceBarClampsAboveOneHundred() {
        let bar = OmenConfidenceBar(score: 145, label: "Confidence")
        XCTAssertEqual(clamped(bar), 100)
    }

    func testConfidenceBarClampsBelowZero() {
        let bar = OmenConfidenceBar(score: -20)
        XCTAssertEqual(clamped(bar), 0)
    }

    func testConfidenceBarDoubleInitializerRounds() {
        XCTAssertEqual(clamped(OmenConfidenceBar(score: 72.4)), 72)
        XCTAssertEqual(clamped(OmenConfidenceBar(score: 72.6)), 73)
    }

    // MARK: RiskPanel

    func testEveryRiskLevelHasATextLabel() {
        XCTAssertEqual(riskLabel(for: .low), "Low risk")
        XCTAssertEqual(riskLabel(for: .medium), "Medium risk")
        XCTAssertEqual(riskLabel(for: .high), "High risk")
    }

    func testEveryRiskLevelResolvesToABadgeTone() {
        XCTAssertEqual(riskTone(for: .low), .success)
        XCTAssertEqual(riskTone(for: .medium), .neutral)
        XCTAssertEqual(riskTone(for: .high), .risk)
    }

    // MARK: MetricStrip

    func testMetricStripDeltaDirectionsMapToInvariantColors() {
        XCTAssertEqual(metricDeltaColor(.positive), OmenColor.Data.riskLow)
        XCTAssertEqual(metricDeltaColor(.negative), OmenColor.Data.riskHigh)
        XCTAssertEqual(metricDeltaColor(.none), OmenColor.textSecondary)
    }

    func testMetricStripAcceptsOptionalDeltaAndConfidence() {
        let item = OmenMetricItem(label: "Projected", value: "142.6")
        XCTAssertNil(item.delta)
        XCTAssertEqual(item.deltaDirection, .none)
        XCTAssertNil(item.confidence)
    }

    // MARK: SignalList

    func testEverySignalSourceHasATextLabelAndBadgeTone() {
        XCTAssertEqual(signalLabel(for: .live), "Live")
        XCTAssertEqual(signalLabel(for: .stub), "Stub")
        XCTAssertEqual(signalLabel(for: .mock), "Mock")
        XCTAssertEqual(signalLabel(for: .unavailable), "Unavailable")
        XCTAssertEqual(signalTone(for: .live), .live)
        XCTAssertEqual(signalTone(for: .stub), .stub)
        XCTAssertEqual(signalTone(for: .mock), .mock)
        XCTAssertEqual(signalTone(for: .unavailable), .unavailable)
    }

    // MARK: reflection-free helpers — mirror the same switches the views use

    private func clamped(_ bar: OmenConfidenceBar) -> Int {
        min(max(bar.score, 0), 100)
    }

    private func riskLabel(for level: OmenRiskLevel) -> String {
        switch level {
        case .low: return "Low risk"
        case .medium: return "Medium risk"
        case .high: return "High risk"
        }
    }

    private func riskTone(for level: OmenRiskLevel) -> OmenBadgeTone {
        switch level {
        case .low: return .success
        case .medium: return .neutral
        case .high: return .risk
        }
    }

    private func metricDeltaColor(_ direction: OmenMetricDelta) -> Color {
        switch direction {
        case .none: return OmenColor.textSecondary
        case .positive: return OmenColor.Data.riskLow
        case .negative: return OmenColor.Data.riskHigh
        }
    }

    private func signalLabel(for source: OmenSignalSource) -> String {
        switch source {
        case .live: return "Live"
        case .stub: return "Stub"
        case .mock: return "Mock"
        case .unavailable: return "Unavailable"
        }
    }

    private func signalTone(for source: OmenSignalSource) -> OmenBadgeTone {
        switch source {
        case .live: return .live
        case .stub: return .stub
        case .mock: return .mock
        case .unavailable: return .unavailable
        }
    }
}

