import SwiftUI

/// Registry §3.1 PlatformBadge: provider identity label. The literal name always renders —
/// color is a redundant signal, never the only signal (registry §4; facts-of-record #7).
///
/// Scope note (2026-07-21): registry §2.3 also names `-chip` legibility overrides and
/// `on-platform-*` foreground tokens that are not yet defined in `OmenColor`. This primitive
/// uses the same tinted-surface recipe as `OmenBadge` so it passes AA on both surface1 and
/// bg without depending on tokens that don't exist yet. Swap to fill-on-platform once the
/// registry token expansion lands.
enum OmenPlatform { case sleeper, yahoo, espn }

struct OmenPlatformBadge: View {
    let platform: OmenPlatform

    private var platformColor: Color {
        switch platform {
        case .sleeper: return OmenColor.Data.platformSleeper
        case .yahoo:   return OmenColor.Data.platformYahoo
        case .espn:    return OmenColor.Data.platformEspn
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
            .foregroundStyle(platformColor)
            .padding(.horizontal, OmenSpacing.step8)
            .padding(.vertical, OmenSpacing.step4)
            .background(platformColor.opacity(0.15))
            .clipShape(Capsule())
    }
}
