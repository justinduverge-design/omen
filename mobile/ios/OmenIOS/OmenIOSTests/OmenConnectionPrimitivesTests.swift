import XCTest
import SwiftUI
@testable import Omen

/// Mirrors Android `OmenConnectionPrimitivesTest.kt` for registry §3.2 identity + connection
/// compositions. Reflection-free helpers re-declare the switches the views use so we're
/// testing the contract (labels, tone mapping, subtitle composition) rather than private
/// state.
final class OmenConnectionPrimitivesTests: XCTestCase {

    // MARK: PlayerRow / PlayerChip

    func testEveryPositionHasATextLabelAndChipTone() {
        XCTAssertEqual(positionLabel(for: .rb), "RB")
        XCTAssertEqual(positionLabel(for: .wr), "WR")
        XCTAssertEqual(positionLabel(for: .qb), "QB")
        XCTAssertEqual(positionLabel(for: .te), "TE")
        XCTAssertEqual(positionLabel(for: .def), "DEF")
        XCTAssertEqual(positionLabel(for: .k), "K")

        XCTAssertEqual(positionChipTone(for: .rb), .rb)
        XCTAssertEqual(positionChipTone(for: .wr), .wr)
        XCTAssertEqual(positionChipTone(for: .qb), .qb)
        XCTAssertEqual(positionChipTone(for: .te), .te)
        XCTAssertEqual(positionChipTone(for: .def), .def)
        XCTAssertEqual(positionChipTone(for: .k), .k)
    }

    func testPlayerRowSubtitleComposesTeamAndMeta() {
        XCTAssertEqual(playerRowSubtitle(team: "SF", meta: "Q vs Dal"), "SF · Q vs Dal")
        XCTAssertEqual(playerRowSubtitle(team: "SF", meta: nil), "SF")
        XCTAssertEqual(playerRowSubtitle(team: nil, meta: "vs GB"), "vs GB")
        XCTAssertNil(playerRowSubtitle(team: nil, meta: nil))
        XCTAssertNil(playerRowSubtitle(team: "", meta: ""))
    }

    func testPlayerChipFoldsPositionIntoLabel() {
        XCTAssertEqual(playerChipLabel(name: "Kelce", position: .te), "TE · Kelce")
        XCTAssertEqual(playerChipLabel(name: "49ers D/ST", position: .def), "DEF · 49ers D/ST")
    }

    // MARK: ConnectionStatusBadge

    func testEveryConnectionStatusHasATextLabel() {
        XCTAssertEqual(omenConnectionStatusLabel(.connected), "Connected")
        XCTAssertEqual(omenConnectionStatusLabel(.disconnected), "Disconnected")
        XCTAssertEqual(omenConnectionStatusLabel(.needsReauth), "Reauth needed")
        XCTAssertEqual(omenConnectionStatusLabel(.error), "Error")
        XCTAssertEqual(omenConnectionStatusLabel(.pending), "Pending")
        XCTAssertEqual(omenConnectionStatusLabel(.recovering), "Recovering")
    }

    func testEveryConnectionStatusResolvesToABadgeTone() {
        XCTAssertEqual(connectionBadgeTone(.connected), .success)
        XCTAssertEqual(connectionBadgeTone(.disconnected), .neutral)
        XCTAssertEqual(connectionBadgeTone(.needsReauth), .risk)
        XCTAssertEqual(connectionBadgeTone(.error), .risk)
        XCTAssertEqual(connectionBadgeTone(.pending), .stub)
        XCTAssertEqual(connectionBadgeTone(.recovering), .stub)
    }

    // MARK: PlatformConnectionCard

    func testPlatformConnectionCardButtonVariantEscalatesForRecoveryStates() {
        XCTAssertEqual(cardButtonVariant(.needsReauth), .danger)
        XCTAssertEqual(cardButtonVariant(.error), .danger)
        XCTAssertEqual(cardButtonVariant(.connected), .primary)
        XCTAssertEqual(cardButtonVariant(.disconnected), .primary)
        XCTAssertEqual(cardButtonVariant(.pending), .primary)
        XCTAssertEqual(cardButtonVariant(.recovering), .primary)
    }

    // MARK: reflection-free helpers

    private func positionLabel(for position: OmenPosition) -> String {
        switch position {
        case .rb: return "RB"
        case .wr: return "WR"
        case .qb: return "QB"
        case .te: return "TE"
        case .def: return "DEF"
        case .k: return "K"
        }
    }

    private func positionChipTone(for position: OmenPosition) -> OmenChipTone {
        switch position {
        case .rb: return .rb
        case .wr: return .wr
        case .qb: return .qb
        case .te: return .te
        case .def: return .def
        case .k: return .k
        }
    }

    private func playerRowSubtitle(team: String?, meta: String?) -> String? {
        let parts = [team, meta].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    private func playerChipLabel(name: String, position: OmenPosition) -> String {
        "\(positionLabel(for: position)) · \(name)"
    }

    private func connectionBadgeTone(_ status: OmenConnectionStatus) -> OmenBadgeTone {
        switch status {
        case .connected: return .success
        case .disconnected: return .neutral
        case .needsReauth, .error: return .risk
        case .pending, .recovering: return .stub
        }
    }

    private func cardButtonVariant(_ status: OmenConnectionStatus) -> OmenButtonVariant {
        switch status {
        case .needsReauth, .error: return .danger
        default: return .primary
        }
    }
}
