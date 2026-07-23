import SwiftUI

/// Registry §3.2 ContextStrip (Figma node `25:2`, approved 2026-07-20). The persistent
/// "which team/league am I looking at?" surface pinned above every Command Center render.
/// Sealed state models the four required variants; the switcher gesture is opaque — this
/// composition renders the strip and the tap target, the calling screen owns the switcher
/// sheet.
enum OmenContextStripState {
    case selected(platform: OmenPlatform, leagueName: String, teamName: String)
    case needsRecovery(platform: OmenPlatform, leagueName: String, teamName: String, reason: String)
    case empty
    case multiTeamHint(platform: OmenPlatform, leagueName: String, teamName: String, otherTeamCount: Int)
}

struct OmenContextStrip: View {
    let state: OmenContextStripState
    let onSwitch: (() -> Void)?

    init(state: OmenContextStripState, onSwitch: (() -> Void)? = nil) {
        self.state = state
        self.onSwitch = onSwitch
    }

    var body: some View {
        Group {
            if let onSwitch {
                Button(action: onSwitch) { content }
                    .buttonStyle(.plain)
                    .accessibilityLabel(omenContextStripAccessibilityLabel(state))
                    .accessibilityHint("Tap to switch")
            } else {
                content.accessibilityLabel(omenContextStripAccessibilityLabel(state))
            }
        }
    }

    private var content: some View {
        HStack(alignment: .center, spacing: OmenSpacing.step12) {
            leading
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                body(for: state)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.trailing, OmenSpacing.step8)
            if onSwitch != nil {
                Text("Switch")
                    .omenTextStyle(OmenTypography.label)
                    .foregroundStyle(OmenColor.accent)
            }
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.vertical, OmenSpacing.step12)
        .frame(minHeight: 48)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .fill(OmenColor.surface1)
        )
    }

    @ViewBuilder
    private var leading: some View {
        switch state {
        case let .selected(platform, _, _),
             let .needsRecovery(platform, _, _, _),
             let .multiTeamHint(platform, _, _, _):
            OmenPlatformBadge(platform: platform)
        case .empty:
            OmenBadge(label: "No league", tone: .neutral)
        }
    }

    @ViewBuilder
    private func body(for state: OmenContextStripState) -> some View {
        switch state {
        case let .selected(_, leagueName, teamName):
            Text(teamName)
                .omenTextStyle(OmenTypography.h3)
                .foregroundStyle(OmenColor.textPrimary)
            Text(leagueName)
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
        case let .needsRecovery(_, _, teamName, reason):
            Text(teamName)
                .omenTextStyle(OmenTypography.h3)
                .foregroundStyle(OmenColor.textPrimary)
            HStack(spacing: OmenSpacing.step8) {
                OmenBadge(label: "Reauth", tone: .risk)
                Text(reason)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }
        case let .multiTeamHint(_, leagueName, teamName, otherTeamCount):
            Text(teamName)
                .omenTextStyle(OmenTypography.h3)
                .foregroundStyle(OmenColor.textPrimary)
            HStack(spacing: OmenSpacing.step8) {
                Text(leagueName)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                OmenBadge(label: "+\(otherTeamCount) more", tone: .neutral)
            }
        case .empty:
            Text("Choose a team")
                .omenTextStyle(OmenTypography.h3)
                .foregroundStyle(OmenColor.textPrimary)
            Text("Pick a connected league to focus Command Center.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
        }
    }
}

/// Publicly exposed for callers/tests that need the same a11y string the view uses.
func omenContextStripAccessibilityLabel(_ state: OmenContextStripState) -> String {
    switch state {
    case let .selected(platform, leagueName, teamName):
        return "Selected: \(teamName) in \(leagueName) on \(platformLabel(platform)). Tap to switch."
    case let .needsRecovery(platform, leagueName, teamName, reason):
        return "Reauth needed for \(teamName) in \(leagueName) on \(platformLabel(platform)). \(reason). Tap to switch."
    case let .multiTeamHint(platform, leagueName, teamName, otherTeamCount):
        return "Selected: \(teamName) in \(leagueName) on \(platformLabel(platform)). +\(otherTeamCount) other teams in this league. Tap to switch."
    case .empty:
        return "No team selected. Tap to choose."
    }
}

private func platformLabel(_ platform: OmenPlatform) -> String {
    switch platform {
    case .sleeper: return "Sleeper"
    case .yahoo:   return "Yahoo"
    case .espn:    return "ESPN"
    }
}

#if DEBUG
#Preview("Context Strip — selected + reauth + empty") {
    VStack(alignment: .leading, spacing: OmenSpacing.step12) {
        OmenContextStrip(state: .selected(platform: .sleeper, leagueName: "Sunday Slate", teamName: "Justin Titans"), onSwitch: {})
        OmenContextStrip(state: .needsRecovery(platform: .yahoo, leagueName: "Sunday Slate", teamName: "Justin Titans", reason: "Session expired"), onSwitch: {})
        OmenContextStrip(state: .multiTeamHint(platform: .sleeper, leagueName: "Sunday Slate", teamName: "Justin Titans", otherTeamCount: 2), onSwitch: {})
        OmenContextStrip(state: .empty, onSwitch: {})
    }
    .padding(OmenSpacing.step16)
    .background(OmenColor.bg)
}
#endif
