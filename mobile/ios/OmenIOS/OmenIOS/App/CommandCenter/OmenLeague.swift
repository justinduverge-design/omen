import SwiftUI

// League on the foundation (frame: Main, League). Where I stand, who needs what I have, the one waiver move,
// and what happened this week. Sections render on their own: one unreadable read never blanks the rest.

/// Pushed screens on the League tab (navigation map).
enum LeagueRoute: Hashable {
    case waivers
}

/// Everything League draws, as plain values, so a screenshot fixture can mount it without a session.
struct OmenLeagueState: Equatable {
    struct Standing: Equatable, Identifiable {
        let id: String
        let rank: Int?
        let name: String
        let record: String?
        let pointsFor: Double?
        let isYou: Bool
    }

    struct Activity: Equatable, Identifiable {
        let id: String
        let text: String
        let category: String
    }

    /// The wire's one move, summarised for the League page.
    struct Waiver: Equatable {
        let line: String
        let gain: Double?
    }

    enum Phase: Equatable {
        case loading
        case failed(String)
        case noLeague
        case ready
    }

    var phase: Phase
    var eyebrow: String?
    var headline: String?
    var subline: String?
    var standings: [Standing] = []
    /// Why the table is missing, when it is.
    var standingsNote: String?
    var targets: [OmenFindTradeState.Candidate] = []
    var targetsNote: String?
    var waiver: Waiver?
    var activity: [Activity] = []
    var activityNote: String?
}

extension OmenLeagueState {
    init(overview: LeagueOverview, targets: [OmenFindTradeState.Candidate], targetsNote: String?, waiver: Waiver?) {
        let teamCount = overview.standings.teams.count
        let provider = OmenProviderMark.displayName(overview.platform)
        self.init(
            phase: .ready,
            eyebrow: [overview.leagueName, provider, teamCount > 0 ? "\(teamCount) teams" : nil].compactMap { $0?.nilIfEmpty }.joined(separator: " \u{00B7} ").nilIfEmpty,
            headline: overview.standings.playoffPicture?.line.nilIfEmpty,
            subline: overview.standings.playoffPicture?.cutLineNote?.nilIfEmpty,
            standings: overview.standings.teams.enumerated().map { index, team in
                Standing(
                    id: "\(index)|\(team.teamName ?? "")",
                    rank: team.rank,
                    name: team.teamName ?? "Team \(index + 1)",
                    record: { if let w = team.wins, let l = team.losses { return "\(w)\u{2013}\(l)" } else { return nil } }(),
                    pointsFor: team.pointsFor,
                    isYou: team.isCurrentUser
                )
            },
            standingsNote: {
                switch overview.standings.status {
                case .available: return nil
                case .offSeason: return "The season hasn\u{2019}t started, so there\u{2019}s no table yet."
                case .unavailable: return "\(provider) didn\u{2019}t send the standings this time."
                }
            }(),
            targets: targets,
            targetsNote: targetsNote,
            waiver: waiver,
            activity: overview.activity.items.map { Activity(id: $0.id, text: $0.text, category: $0.category) },
            activityNote: {
                switch overview.activity.status {
                case .available, .partial: return nil
                case .empty: return "Quiet week. No trades or adds yet."
                case .unavailable: return "\(provider) didn\u{2019}t send this week\u{2019}s moves."
                }
            }()
        )
    }
}

struct OmenLeagueView: View {
    let state: OmenLeagueState
    var teamControl: (platform: String, team: String)?
    var onSwitchTeam: () -> Void = {}
    var onRetry: () -> Void = {}
    var onConnect: () -> Void = {}
    var onOpenTarget: (String) -> Void = { _ in }
    var onOpenWaivers: (() -> Void)?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step32) {
                VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                    if let teamControl {
                        OmenTeamControl(platform: teamControl.platform, teamName: teamControl.team, action: onSwitchTeam)
                    }
                    if let eyebrow = state.eyebrow {
                        Text(eyebrow.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textTertiary)
                    }
                    Text(state.headline ?? "League")
                        .omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                        .accessibilityAddTraits(.isHeader)
                    if let subline = state.subline {
                        Text(subline).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.horizontal, OmenSpacing.step20)

                switch state.phase {
                case .loading:
                    OmenStateBlock(kind: .loading, title: "Reading your league").padding(.horizontal, OmenSpacing.step20)
                case .failed(let message):
                    OmenStateBlock(kind: .failed, title: "Omen couldn\u{2019}t read your league", message: message, actionTitle: "Try again", action: onRetry)
                        .padding(.horizontal, OmenSpacing.step20)
                case .noLeague:
                    OmenStateBlock(kind: .notEnoughToGoOn, title: "Connect a league to see it here", message: "Standings, who needs what you have, and the week\u{2019}s moves.", actionTitle: "Connect a league", action: onConnect)
                        .padding(.horizontal, OmenSpacing.step20)
                case .ready:
                    standings
                    targets
                    if let waiver = state.waiver, let onOpenWaivers { waiverRow(waiver, onOpenWaivers) }
                    activity
                }
            }
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, 120)
        }
        .background(OmenColor.bg)
        .omenScreenReady("league")
    }

    // MARK: Standings

    private var standings: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            if let note = state.standingsNote {
                Text(note).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
            } else {
                HStack {
                    Text("#").frame(width: 24, alignment: .leading)
                    Text("Team").frame(maxWidth: .infinity, alignment: .leading)
                    Text("W\u{2013}L").frame(width: 52, alignment: .trailing)
                    Text("PF").frame(width: 60, alignment: .trailing)
                }
                .omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textTertiary)
                .accessibilityHidden(true)
                ForEach(state.standings) { row in
                    HStack {
                        Text(row.rank.map(String.init) ?? "\u{2014}").foregroundStyle(OmenColor.textTertiary).frame(width: 24, alignment: .leading)
                        Text(row.name).foregroundStyle(OmenColor.textPrimary).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                        Text(row.record ?? "\u{2014}").foregroundStyle(OmenColor.textSecondary).frame(width: 52, alignment: .trailing)
                        Text(row.pointsFor.map { String(format: "%.0f", $0) } ?? "\u{2014}").foregroundStyle(OmenColor.textSecondary).frame(width: 60, alignment: .trailing)
                    }
                    .omenTextStyle(row.isYou ? OmenTypography.rowTitle : OmenTypography.body)
                    .monospacedDigit()
                    .padding(.horizontal, OmenSpacing.step8)
                    .frame(minHeight: 40)
                    .background(row.isYou ? OmenColor.surface2 : .clear, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
                    .padding(.horizontal, -OmenSpacing.step8)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel(standingLabel(row))
                }
            }
        }
        .padding(.horizontal, OmenSpacing.step20)
    }

    private func standingLabel(_ row: OmenLeagueState.Standing) -> String {
        var parts = [row.rank.map { "\($0)." } ?? "", row.isYou ? "\(row.name), you" : row.name]
        if let record = row.record { parts.append(record.replacingOccurrences(of: "\u{2013}", with: " and ")) }
        if let pf = row.pointsFor { parts.append("\(Int(pf)) points for") }
        return parts.filter { !$0.isEmpty }.joined(separator: ", ")
    }

    // MARK: Who needs what you have

    @ViewBuilder
    private var targets: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text("Who needs what you have").omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                    .accessibilityAddTraits(.isHeader)
                Text("Ranked by how much both lineups gain").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
            }
            .padding(.horizontal, OmenSpacing.step20)
            if let note = state.targetsNote {
                Text(note).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(.horizontal, OmenSpacing.step20)
            } else if state.targets.isEmpty {
                Text("Omen is reading the other rosters.").omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                    .padding(.horizontal, OmenSpacing.step20)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: OmenSpacing.step12) {
                        ForEach(state.targets, id: \.id) { target in
                            OmenPressable(action: { onOpenTarget(target.id) }) { targetCard(target) }
                                .accessibilityElement(children: .combine)
                                .accessibilityHint("Opens it in the trade builder")
                        }
                    }
                    .padding(.horizontal, OmenSpacing.step20)
                }
            }
        }
    }

    private func targetCard(_ target: OmenFindTradeState.Candidate) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            HStack(alignment: .firstTextBaseline) {
                Text(target.partnerName).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary).lineLimit(1)
                Spacer(minLength: OmenSpacing.step8)
                if let need = target.partnerNeed {
                    Text(need).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.omenChip)
                }
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text("Send").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                Text(target.send.name).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text("Get").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                Text(target.receive.name).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
            }
            HStack {
                Text("\(signed(target.yourGain)) you").omenTextStyle(OmenTypography.numeric).foregroundStyle(OmenColor.accentHover)
                Spacer()
                Text("\(signed(target.theirGain)) them").omenTextStyle(OmenTypography.numeric).foregroundStyle(OmenColor.textSecondary)
            }
            .padding(.top, OmenSpacing.step4)
        }
        .padding(OmenSpacing.step16)
        .frame(width: 250, alignment: .leading)
        .background(OmenColor.surface1, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private func signed(_ value: Double?) -> String {
        guard let value else { return "\u{2014}" }
        return (value >= 0 ? "+" : "\u{2212}") + OmenPlayerSummary.one(abs(value))
    }

    // MARK: The wire

    private func waiverRow(_ waiver: OmenLeagueState.Waiver, _ action: @escaping () -> Void) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text("On the wire").omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                .accessibilityAddTraits(.isHeader)
            OmenPressable(action: action) {
                HStack(spacing: OmenSpacing.step12) {
                    Text(waiver.line).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    Spacer(minLength: OmenSpacing.step8)
                    if let gain = waiver.gain {
                        Text(signed(gain)).omenTextStyle(OmenTypography.numeric).foregroundStyle(OmenColor.accentHover)
                    }
                    Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(OmenColor.textTertiary)
                }
                .frame(minHeight: 52)
            }
            .accessibilityElement(children: .combine)
            .accessibilityHint("Opens the waiver move")
        }
        .padding(.horizontal, OmenSpacing.step20)
    }

    // MARK: This week

    private var activity: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            Text("This week in the league").omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                .accessibilityAddTraits(.isHeader)
            if let note = state.activityNote {
                Text(note).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
            }
            ForEach(state.activity) { item in
                HStack(spacing: OmenSpacing.step12) {
                    Circle().fill(dot(item.category)).frame(width: 8, height: 8).accessibilityHidden(true)
                    Text(item.text).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(minHeight: 44, alignment: .leading)
                OmenHairline().padding(.leading, 20)
            }
        }
        .padding(.horizontal, OmenSpacing.step20)
    }

    private func dot(_ category: String) -> Color {
        switch category.lowercased() {
        case "trade", "trades": return OmenColor.accent
        case "add", "adds", "waiver", "waivers": return OmenColor.omenChip
        default: return OmenColor.textTertiary
        }
    }
}
