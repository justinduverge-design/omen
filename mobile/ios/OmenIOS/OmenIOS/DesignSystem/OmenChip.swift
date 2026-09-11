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
/// `verdigris` was split out of `omen` on 2026-09-06. Both are Omen's own tones, but they are
/// not one tone: `omen` is brass and marks the controls that *filter* or *select* (All, the
/// Waiver / Ledger / Pulse tabs), and `verdigris` is green and marks **+ Add League**, the one
/// chip in that row that changes what you have rather than what you are looking at.
///
/// That distinction was already written into `OmenLeagueCarousel` in prose — Add League was
/// moved out of the filter row precisely because "the provider chips are a *filter* and this is
/// an *action*" — but both still rendered brass, so the row said in colour what the layout had
/// just stopped saying. Now they differ.
enum OmenChipTone { case rb, wr, qb, te, def, k, sleeper, yahoo, espn, demo, omen, verdigris }

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
        // The `-chip` family, not the raw brand hex. See `isPlatform` below — these tones
        // fill with the brand and reverse the label to white, rather than drawing the brand
        // as text. Android mirror: `OmenChip.kt`.
        case .sleeper: return OmenColor.Data.platformSleeperChip
        case .yahoo: return OmenColor.Data.platformYahooChip
        case .espn: return OmenColor.Data.platformEspnChip
        case .demo: return OmenColor.Data.demoText
        case .omen: return OmenColor.accent
        // `omenChip`, not `omen`: the base verdigris is 3.96:1 on `bg` and chip type is 11pt.
        case .verdigris: return OmenColor.omenChip
        }
    }

    /// Platform tones render FILLED with a white label; every other tone keeps the tinted
    /// outline it has always had.
    ///
    /// The tinted treatment draws the tone colour as text over a 15% wash of itself, which
    /// only reads when the tone is light enough to carry type on the app background. Position
    /// chips, demo and verdigris all are. The three platform brands are not — they are dark,
    /// saturated identity colours, and Yahoo in particular is a deep purple that landed within
    /// **1.33:1** of `surface1`: an invisible filter control that shipped.
    ///
    /// A brand colour is the one thing here that cannot be tuned for legibility, since the
    /// hexes are sourced brand values. So the treatment changes instead of the colour:
    /// `#410093` is untouched and now carries white at 12.76:1.
    private var isPlatform: Bool {
        switch tone {
        case .sleeper, .yahoo, .espn: return true
        default: return false
        }
    }

    private var onPlatform: Color {
        switch tone {
        case .sleeper: return OmenColor.Data.onPlatformSleeper
        case .yahoo: return OmenColor.Data.onPlatformYahoo
        case .espn: return OmenColor.Data.onPlatformEspn
        default: return foreground
        }
    }

    private var labelView: some View {
        HStack(spacing: OmenSpacing.step4) {
            if selected { Image(systemName: "checkmark").accessibilityHidden(true) }
            Text(label).omenTextStyle(OmenTypography.chip)
        }
        .foregroundStyle(enabled ? (isPlatform ? onPlatform : foreground) : OmenColor.textTertiary)
        .padding(.horizontal, OmenSpacing.step8)
        .padding(.vertical, OmenSpacing.step4)
        .background(
            isPlatform
                ? foreground
                : (selected ? foreground.opacity(0.28) : foreground.opacity(0.15))
        )
        .clipShape(Capsule())
        // Selection keeps a non-colour carrier either way: the checkmark glyph above, plus a
        // ring. A filled chip cannot lean on fill alpha the way the tinted ones do, so on
        // those the ring is brass and appears only when selected.
        .overlay(
            Capsule().stroke(
                isPlatform
                    ? (selected ? OmenColor.accent : Color.clear)
                    : foreground.opacity(selected ? 1 : 0.5),
                lineWidth: isPlatform && selected ? 2 : 1
            )
        )
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
