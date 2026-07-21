import SwiftUI

enum OmenChipTone { case rb, wr, qb, te, def, k, sleeper, yahoo, espn, demo }

/// Registry §3.1 position/platform/mode chip. `action == nil` produces a display chip.
struct OmenChip: View {
    let label: String
    let tone: OmenChipTone
    var selected = false
    var enabled = true
    var action: (() -> Void)?

    private var foreground: Color {
        switch tone {
        case .rb: return OmenColor.Data.posRb
        case .wr: return OmenColor.Data.posWr
        case .qb: return OmenColor.Data.posQb
        case .te: return OmenColor.Data.posTe
        case .def: return OmenColor.Data.posDef
        case .k: return OmenColor.Data.posK
        case .sleeper: return OmenColor.Data.platformSleeper
        case .yahoo: return OmenColor.Data.platformYahoo
        case .espn: return OmenColor.Data.platformEspn
        case .demo: return OmenColor.Data.demoText
        }
    }

    private var labelView: some View {
        HStack(spacing: OmenSpacing.step4) {
            if selected { Image(systemName: "checkmark").accessibilityHidden(true) }
            Text(label).omenTextStyle(OmenTypography.chip)
        }
        .foregroundStyle(enabled ? foreground : OmenColor.textTertiary)
        .padding(.horizontal, OmenSpacing.step8)
        .padding(.vertical, OmenSpacing.step4)
        .background(selected ? foreground.opacity(0.28) : foreground.opacity(0.15))
        .clipShape(Capsule())
        .overlay(Capsule().stroke(foreground.opacity(selected ? 1 : 0.5), lineWidth: 1))
    }

    var body: some View {
        if let action {
            Button(action: action) { labelView }
                .buttonStyle(.plain)
                .disabled(!enabled)
                .accessibilityValue(selected ? "Selected" : "")
        } else {
            labelView
        }
    }
}
