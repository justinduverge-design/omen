import SwiftUI

/// `omen` is the brand tone, added 2026-09-03 and corrected 2026-09-04.
///
/// It exists for the chips that are Omen's own rather than a provider's or a position's:
/// **All**, **+ Add League**, and the **Waiver / Ledger / Pulse** tabs. Borrowing a platform
/// tone for those reads as a fourth provider — an "All" chip tinted Sleeper-blue is actively
/// misleading — so they needed a tone of their own.
///
/// It shipped for one build as `neutral`, drawn from `textSecondary`, and that was wrong: on a
/// device it rendered five grey chips beside a red ESPN and a blue Sleeper, so the controls
/// that belong to Omen looked like the disabled ones. Founder, seeing it: "you didn't put the
/// buttons into theme." Grey is not a neutral choice on this screen, it is an absent one.
/// Drawing from `accent` puts Omen's own brass on Omen's own controls.
///
/// Provider chips keep their platform colours, deliberately — that is how a user finds their
/// ESPN team in a row of six.
enum OmenChipTone { case rb, wr, qb, te, def, k, sleeper, yahoo, espn, demo, omen }

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
        case .omen: return OmenColor.accent
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
