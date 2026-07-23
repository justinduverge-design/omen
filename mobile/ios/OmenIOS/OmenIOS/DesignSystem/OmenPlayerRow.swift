import SwiftUI

/// Registry §2.3 position families. The uppercase abbreviation is what renders on both
/// PlayerRow and PlayerChip so meaning survives grayscale (color is never alone —
/// registry §1, §4).
enum OmenPosition { case rb, wr, qb, te, def, k }

extension OmenPosition {
    fileprivate var chipTone: OmenChipTone {
        switch self {
        case .rb: return .rb
        case .wr: return .wr
        case .qb: return .qb
        case .te: return .te
        case .def: return .def
        case .k: return .k
        }
    }

    fileprivate var label: String {
        switch self {
        case .rb: return "RB"
        case .wr: return "WR"
        case .qb: return "QB"
        case .te: return "TE"
        case .def: return "DEF"
        case .k: return "K"
        }
    }
}

/// Registry §3.2 PlayerRow. Player identity for lists — name + position chip + optional
/// team/meta subline. Composes the approved ListRow shell. `action == nil` renders
/// display-only.
struct OmenPlayerRow: View {
    let name: String
    let position: OmenPosition
    let team: String?
    let meta: String?
    let enabled: Bool
    let action: (() -> Void)?

    init(
        name: String,
        position: OmenPosition,
        team: String? = nil,
        meta: String? = nil,
        enabled: Bool = true,
        action: (() -> Void)? = nil
    ) {
        self.name = name
        self.position = position
        self.team = team
        self.meta = meta
        self.enabled = enabled
        self.action = action
    }

    private var subtitle: String? {
        let parts = [team, meta].compactMap { $0 }.filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }

    var body: some View {
        OmenListRow(title: name, subtitle: subtitle, enabled: enabled, action: action) {
            OmenChip(label: position.label, tone: position.chipTone)
        } trailing: {
            EmptyView()
        }
    }
}

/// Registry §3.2 PlayerChip. Compact single-chip player identity for inline lists.
/// Position abbreviation is folded into the label so a grayscale reader still gets
/// position and name in one tap-target.
struct OmenPlayerChip: View {
    let name: String
    let position: OmenPosition

    var body: some View {
        OmenChip(label: "\(position.label) · \(name)", tone: position.chipTone)
    }
}

#if DEBUG
#Preview {
    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
        OmenPlayerRow(name: "Christian McCaffrey", position: .rb, team: "SF", meta: "Q vs Dal, 4:25p ET")
        OmenPlayerRow(name: "Justin Jefferson", position: .wr, team: "MIN", meta: "vs GB, 1:00p ET", action: {})
        OmenPlayerRow(name: "Patrick Mahomes", position: .qb, team: "KC")
        HStack(spacing: OmenSpacing.step8) {
            OmenPlayerChip(name: "Kelce", position: .te)
            OmenPlayerChip(name: "49ers D/ST", position: .def)
        }
    }
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
