import SwiftUI

/// M5 slice F — the League destination.
///
/// Built against the ratified `M1-Screen-League` contract: Matchup Spine, Playoff Picture, the
/// rank table, and Around the League.
///
/// **Sections render independently**, because `league-overview.v1` reports them independently.
/// A dead matchup read shows an unavailable matchup above live standings; it never blanks the
/// screen. That is the whole reason the contract carries a per-section `status`.
///
/// Per the scope correction carried by the contract, this screen has **no Draft entry** —
/// Draft is cut from 1.0.
struct OmenLeagueScreen: View {
    let state: LeagueViewModel.ViewState
    var onRetry: (() -> Void)?
    var onConnect: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                switch state {
                case .idle, .loading:
                    // Idle and loading are the same surface on purpose: before the first
                    // request resolves there is nothing truthful to show but a spinner, and an
                    // empty state would claim the user has no league.
                    OmenStateSurface(
                        kind: .loading,
                        title: "Reading your league",
                        message: "Matchup and standings come from your provider."
                    )
                case .demo:
                    OmenStateSurface(
                        kind: .mock,
                        title: "Demo league",
                        message: "Demo mode shows no live league. Sign in with a connected league to see your own."
                    )
                case .failed(let error):
                    failure(error)
                case .loaded(let overview):
                    loaded(overview)
                }
            }
            .padding(OmenSpacing.step24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.bg)
    }

    // MARK: - Loaded

    @ViewBuilder
    private func loaded(_ overview: LeagueOverview) -> some View {
        header(overview)
        matchupSection(overview)
        standingsSection(overview)
        activitySection(overview)
    }

    @ViewBuilder
    private func header(_ overview: LeagueOverview) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            Text(overview.leagueName ?? "Your league")
                .omenTextStyle(OmenTypography.h1)
                .foregroundStyle(OmenColor.textPrimary)
            if let week = overview.week {
                Text("Week \(week)")
                    .omenTextStyle(OmenTypography.label)
                    .foregroundStyle(OmenColor.textSecondary)
            }
        }
    }

    // MARK: - Matchup

    @ViewBuilder
    private func matchupSection(_ overview: LeagueOverview) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("Matchup")
            if let hero = overview.matchupHero {
                OmenMatchupHero(state: hero)
            } else {
                switch overview.matchup.status {
                case .noMatchup:
                    OmenStateSurface(
                        kind: .empty,
                        title: "No matchup this week",
                        message: "Your league has you on a bye. Standings below are still current."
                    )
                default:
                    // Named rather than generic: the client was told which half failed, so it
                    // says so instead of implying the whole league is unreachable.
                    OmenStateSurface(
                        kind: .empty,
                        title: "Matchup didn't come back",
                        message: matchupUnavailableMessage(overview.matchup.unavailableReason)
                    )
                }
            }
        }
    }

    private func matchupUnavailableMessage(_ reason: String?) -> String {
        switch reason {
        case "provider_unsupported":
            return "This provider doesn't give Omen matchup data yet. Standings below are current."
        case "team_unknown":
            return "Omen can't tell which team is yours in this league. Reconnect it in Account to fix that."
        case "off_season":
            return "Matchups return when the regular season starts."
        default:
            return "Omen couldn't read this week's matchup. Standings below are still current."
        }
    }

    // MARK: - Standings

    @ViewBuilder
    private func standingsSection(_ overview: LeagueOverview) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("Standings")

            switch overview.standings.status {
            case .offSeason:
                OmenStateSurface(
                    kind: .empty,
                    title: "Standings return in the regular season",
                    message: "Your league has no standings to show yet."
                )
            case .unavailable:
                OmenStateSurface(
                    kind: .empty,
                    title: "Standings didn't come back",
                    message: "Omen won't show a stale table. Pull to refresh, or try again shortly."
                )
            case .available:
                if let picture = overview.standings.playoffPicture {
                    OmenCard(variant: .outlined) {
                        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                            Text(picture.line)
                                .omenTextStyle(OmenTypography.h2)
                                .foregroundStyle(OmenColor.textPrimary)
                            // Only when the server actually read playoff settings. Omen states
                            // no playoff likelihood in v1 — position only.
                            if picture.settingsKnown, let note = picture.cutLineNote {
                                Text(note)
                                    .omenTextStyle(OmenTypography.body)
                                    .foregroundStyle(OmenColor.textSecondary)
                            }
                        }
                    }
                }
                standingsTable(overview.standings.teams)
            }
        }
    }

    /// Provider rank order, preserved exactly — Omen never reorders a league (§14.1).
    @ViewBuilder
    private func standingsTable(_ teams: [LeagueStandings.Team]) -> some View {
        VStack(spacing: 0) {
            ForEach(Array(teams.enumerated()), id: \.offset) { _, team in
                OmenStandingsRow(team: team)
            }
        }
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(OmenColor.border))
    }

    // MARK: - Activity

    /// v1 derives no activity signals, so this section is normally the approved empty line.
    /// It is a real section with a real state — not a placeholder — and the waiver/trade work
    /// fills `items` without touching this view.
    @ViewBuilder
    private func activitySection(_ overview: LeagueOverview) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("Around the League")

            if overview.activity.items.isEmpty {
                OmenStateSurface(
                    kind: .empty,
                    title: "No major league activity to flag right now",
                    message: activityMessage(overview.activity)
                )
            } else {
                OmenCard(variant: .outlined) {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        ForEach(overview.activity.items) { item in
                            Text(item.text)
                                .omenTextStyle(OmenTypography.body)
                                .foregroundStyle(OmenColor.textSecondary)
                                .frame(maxWidth: .infinity, alignment: .leading)
                        }
                    }
                }
            }
        }
    }

    /// The missing family is NAMED. §14.3 requires the screen to say *which* half is
    /// unavailable, and it can only do that because the contract tells it.
    private func activityMessage(_ activity: LeagueOverview.Activity) -> String {
        activity.unavailableFamilies.contains("transactions")
            ? "Waiver and trade activity isn't connected yet, so Omen isn't reporting on it."
            : "Omen will flag standings and deadline moves here as they happen."
    }

    // MARK: - Failure

    @ViewBuilder
    private func failure(_ error: OmenApiError) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            OmenStateSurface(
                kind: error == .unauthorized ? .disconnected : .error,
                title: "Omen couldn't load your league",
                message: LeagueViewModel.message(for: error)
            )
            if let onRetry {
                OmenButton(title: "Try again", action: onRetry, variant: .secondary, size: .md)
            }
            if let onConnect, error == .unauthorized {
                OmenButton(title: "Connect a league", action: onConnect, variant: .primary, size: .md)
            }
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .omenTextStyle(OmenTypography.label)
            .foregroundStyle(OmenColor.textSecondary)
    }
}

/// One standings row. Split out of `OmenLeagueScreen` because the inline expression exceeded
/// the Swift type-checker's budget — not a stylistic split.
private struct OmenStandingsRow: View {
    let team: LeagueStandings.Team

    private var rankText: String {
        guard let rank = team.rank else { return "–" }
        return String(rank)
    }

    private var recordText: String? {
        guard let wins = team.wins, let losses = team.losses else { return nil }
        return "\(wins)-\(losses)"
    }

    /// Points for. Shown because it is what the league is actually sorted by — without it two
    /// teams at the same record appear ranked arbitrarily. Absent when the provider omits it.
    private var pointsText: String? {
        team.pointsFor.map { String(format: "%.1f", $0) }
    }

    private var accessibilityText: String {
        var parts: [String] = []
        if let rank = team.rank { parts.append("Rank \(rank)") }
        parts.append(team.teamName ?? "Unnamed team")
        if let recordText { parts.append(recordText) }
        if let pointsText { parts.append("\(pointsText) points for") }
        if team.isCurrentUser { parts.append("your team") }
        return parts.joined(separator: ", ")
    }

    var body: some View {
        HStack(spacing: OmenSpacing.step12) {
            Text(rankText)
                .omenTextStyle(OmenTypography.label)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(minWidth: 24, alignment: .leading)

            Text(team.teamName ?? "Unnamed team")
                .omenTextStyle(OmenTypography.body)
                .foregroundStyle(OmenColor.textPrimary)
                .frame(maxWidth: .infinity, alignment: .leading)

            if let recordText {
                Text(recordText)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
            }

            if let pointsText {
                Text(pointsText)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textTertiary)
            }

            if team.isCurrentUser {
                OmenBadge(label: "You", tone: .live)
            }
        }
        .padding(OmenSpacing.step12)
        .background(rowBackground)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityText)
    }

    private var rowBackground: Color {
        team.isCurrentUser ? OmenColor.surface2 : Color.clear
    }
}
