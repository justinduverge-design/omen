import SwiftUI

// The team switcher on the foundation (frame: Sheets, "Your teams"). Every team, its league and record, this
// week's score; the current one is checked. A team signed out of its provider says "Sign in again" and opens
// Connect. Connect a league and Account sit at the bottom.

struct OmenTeamSwitcherSheet: View {
    let teams: [OmenTeamCardModel]
    let selectedID: String?
    var committingID: String?
    var error: String?
    let onSelect: (OmenTeamCardModel) -> Void
    let onReconnect: (OmenTeamCardModel) -> Void
    let onConnect: () -> Void
    let onAccount: () -> Void
    let onDone: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                OmenSheetHeader(title: "Your teams", closeTitle: "Done", onClose: onDone)
                if teams.isEmpty {
                    OmenStateBlock(kind: .nothingWorthDoing, title: "No teams yet", message: "Connect a league and its teams show up here.")
                }
                VStack(spacing: 0) {
                    ForEach(teams) { team in row(team) }
                }
                if let error {
                    Text(error).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.Data.riskMedium)
                        .fixedSize(horizontal: false, vertical: true)
                }
                HStack(spacing: OmenSpacing.step8) {
                    OmenButton(title: "Connect a league", action: onConnect, variant: .secondary, size: .md)
                    OmenButton(title: "Account", action: onAccount, variant: .secondary, size: .md)
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step20)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.surface1.ignoresSafeArea())
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .omenScreenReady("team-switcher")
    }

    private func row(_ team: OmenTeamCardModel) -> some View {
        let selected = team.id == selectedID
        let reconnect = team.status == .reconnect
        return OmenPressable(action: { reconnect ? onReconnect(team) : onSelect(team) }) {
            HStack(spacing: OmenSpacing.step12) {
                OmenProviderMark(platform: team.platform, style: .tag)
                VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                    Text(team.teamName).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary).lineLimit(1)
                    Text([team.leagueName, team.record].compactMap { $0 }.joined(separator: " \u{00B7} "))
                        .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).lineLimit(1)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                if committingID == team.id {
                    ProgressView().tint(OmenColor.textTertiary)
                } else if reconnect {
                    Text("Sign in again").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.Data.riskMedium)
                } else if let score = Self.score(team) {
                    Text(score).omenTextStyle(OmenTypography.numeric).foregroundStyle(OmenColor.textSecondary)
                }
                if selected {
                    Image(systemName: "checkmark").font(.system(size: 14, weight: .bold)).foregroundStyle(OmenColor.accentHover)
                        .accessibilityHidden(true)
                }
            }
            .frame(minHeight: 64)
            .contentShape(Rectangle())
            .overlay(alignment: .bottom) { OmenHairline() }
        }
        .disabled(committingID != nil)
        .accessibilityLabel(Self.accessibilityLabel(team, selected: selected))
        .accessibilityAddTraits(selected ? .isSelected : [])
        .accessibilityHint(reconnect ? "Opens Connect" : "")
    }

    /// "64.8–51.2", only when both scores came back.
    static func score(_ team: OmenTeamCardModel) -> String? {
        guard let mine = team.score, let theirs = team.opponentScore else { return nil }
        return String(format: "%.1f\u{2013}%.1f", mine, theirs)
    }

    static func accessibilityLabel(_ team: OmenTeamCardModel, selected: Bool) -> String {
        var parts = ["\(team.teamName), \(team.leagueName), \(OmenProviderMark.displayName(team.platform))"]
        if let record = team.record { parts.append("record \(record)") }
        if team.status == .reconnect {
            parts.append("sign in again")
        } else if let mine = team.score, let theirs = team.opponentScore {
            parts.append(String(format: "%.1f to %.1f", mine, theirs))
        }
        if selected { parts.append("current team") }
        return parts.joined(separator: ", ")
    }
}
