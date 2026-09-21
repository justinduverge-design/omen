import SwiftUI

/// A tappable provider row on the Connect canvas: platform mark, name, one line of
/// explanation, chevron.
///
/// Moved out of `ConnectView.swift`, where it was a `private struct` and therefore a
/// primitive exactly one file could use.
///
/// **Takes `OmenPlatform`, not `ConnectProvider`.** The original held the App-layer
/// `ConnectProvider` enum, which would have made this design-system file depend on feature
/// code — the wrong direction, and the reason a "just move the file" refactor can quietly
/// make an architecture worse. `OmenPlatform` already exists here for `OmenPlatformBadge`,
/// so the mapping happens at the call site where the feature type is already in hand.
///
/// The mark colours are unchanged from the original and match `OmenPlatformBadge`, which is
/// the point of them living in one layer.
struct OmenProviderCard: View {
    let platform: OmenPlatform
    let title: String
    let subtitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: OmenSpacing.step12) {
                providerMark
                VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                    Text(title)
                        .omenTextStyle(OmenTypography.h3)
                        .foregroundStyle(OmenColor.textPrimary)
                    Text(subtitle)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textTertiary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer(minLength: OmenSpacing.step8)
                Image("CanvasChevronRight")
                    .resizable()
                    .renderingMode(.original)
                    .frame(width: 20, height: 20)
                    .accessibilityHidden(true)
            }
            .padding(OmenSpacing.step16)
            .frame(maxWidth: .infinity, minHeight: 76, alignment: .leading)
            .background(OmenColor.surface1)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(OmenColor.border, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(title), \(subtitle)")
        .accessibilityHint("Double tap to open")
    }

    private var providerMark: some View {
        Text(markText)
            .omenTextStyle(OmenTypography.micro)
            .fontWeight(.bold)
            .foregroundStyle(markForeground)
            .lineLimit(1)
            .minimumScaleFactor(0.7)
            .frame(width: 44, height: 44)
            .background(markBackground)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .accessibilityHidden(true)
    }

    /// Neutral four-letter crests, per `ConnectLeague.dc.html`.
    ///
    /// These were `E`, `Y!` and `S` on filled provider hexes. A red `E` tile and `Y!` are close
    /// enough to the providers' own marks to read as their branding, and `W1-GATE` carries **no
    /// association-implying ESPN branding** as a binding constraint out of the 2026-08-31 terms
    /// finding. The artboard already drew the safer treatment; this adopts it.
    ///
    /// The provider hex stays as the tile background — it is the sole sanctioned colour exception
    /// and it is never the only carrier, because the provider is named in the row beside it (D7).
    private var markText: String {
        switch platform {
        case .espn: return "ESPN"
        case .yahoo: return "YHOO"
        case .sleeper: return "SLPR"
        }
    }

    private var markBackground: Color {
        switch platform {
        case .espn: return OmenColor.Data.platformEspnChip
        case .yahoo: return OmenColor.Data.platformYahooChip
        case .sleeper: return OmenColor.Data.platformSleeperChip
        }
    }

    private var markForeground: Color {
        switch platform {
        case .espn: return OmenColor.Data.onPlatformEspn
        case .yahoo: return OmenColor.Data.onPlatformYahoo
        case .sleeper: return OmenColor.Data.onPlatformSleeper
        }
    }
}
