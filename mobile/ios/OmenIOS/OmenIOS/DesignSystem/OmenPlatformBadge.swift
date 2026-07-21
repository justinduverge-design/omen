import SwiftUI

/// Registry §3.1 PlatformBadge: provider identity label. The literal name always renders —
/// color is a redundant signal, never the only signal (registry §4; facts-of-record #7).
///
/// Fill-on-platform treatment: uses registry §2.3 invariant `-chip` legibility overrides for
/// the fill + `on-platform-*` foregrounds tuned so white text meets WCAG AA at chip
/// typography (Sleeper darkened; Yahoo and ESPN near or at base).
enum OmenPlatform { case sleeper, yahoo, espn }

struct OmenPlatformBadge: View {
    let platform: OmenPlatform

    private var fill: Color {
        switch platform {
        case .sleeper: return OmenColor.Data.platformSleeperChip
        case .yahoo:   return OmenColor.Data.platformYahooChip
        case .espn:    return OmenColor.Data.platformEspnChip
        }
    }

    private var onFill: Color {
        switch platform {
        case .sleeper: return OmenColor.Data.onPlatformSleeper
        case .yahoo:   return OmenColor.Data.onPlatformYahoo
        case .espn:    return OmenColor.Data.onPlatformEspn
        }
    }

    private var label: String {
        switch platform {
        case .sleeper: return "Sleeper"
        case .yahoo:   return "Yahoo"
        case .espn:    return "ESPN"
        }
    }

    var body: some View {
        Text(label)
            .omenTextStyle(OmenTypography.chip)
            .foregroundStyle(onFill)
            .padding(.horizontal, OmenSpacing.step8)
            .padding(.vertical, OmenSpacing.step4)
            .background(fill)
            .clipShape(Capsule())
    }
}
