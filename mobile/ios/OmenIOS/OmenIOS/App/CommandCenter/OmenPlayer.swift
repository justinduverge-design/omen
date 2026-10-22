import SwiftUI

/// The Player page (frame: Main, Player). Omen's read first, then the last games, the role and the season.
/// Nothing here says what Omen could not read: a missing number is a missing row (spec § 2).
struct OmenPlayerPage: Equatable {
    struct Game: Equatable, Hashable {
        let label: String
        let points: Double
    }

    var player: OmenPlayerSummary
    var ownerLabel: String?
    var gameLine: String?
    var reasons: [OmenReadBlock.Reason] = []
    var lastGames: [Game] = []
    var role: [OmenStatGrid.Stat] = []
    var season: [OmenStatGrid.Stat] = []
}

extension OmenPlayerPage {
    /// A player from the league roster read. Drivers are the server's (`sight.drivers`), at most three.
    init(_ roster: TradeRosterResponse.Player, ownerLabel: String?, providerName: String) {
        let read = roster.omenRead
        let stats = roster.stats
        let recent = stats?.recent
        let pos = roster.position?.uppercased()
        func one(_ v: Double) -> String { OmenPlayerSummary.one(v) }

        var role: [OmenStatGrid.Stat] = []
        if let share = recent?.snapShare { role.append(.init(label: "Snap share", value: "\(Int((share <= 1 ? share * 100 : share).rounded()))%")) }
        if let games = recent?.games, games > 0 {
            let g = Double(games)
            if let t = recent?.targets, pos != "QB" { role.append(.init(label: "Targets a game", value: one(t / g))) }
            if let c = recent?.carries, pos == "RB" || pos == "QB" { role.append(.init(label: "Carries a game", value: one(c / g))) }
            if let r = recent?.receptions, pos != "QB" { role.append(.init(label: "Catches a game", value: one(r / g))) }
        }
        var season: [OmenStatGrid.Stat] = []
        if let ppg = stats?.pointsPerGame { season.append(.init(label: "Points a game", value: one(ppg))) }
        if let total = stats?.seasonPoints { season.append(.init(label: "Season points", value: one(total))) }
        if let games = stats?.games { season.append(.init(label: "Games", value: "\(games)")) }
        if let yards = recent?.yards, let catches = recent?.receptions, catches > 0, pos == "WR" || pos == "TE" {
            season.append(.init(label: "Yards a catch, recent", value: one(yards / catches)))
        }

        self.init(
            player: OmenPlayerSummary(roster, providerName: providerName),
            ownerLabel: ownerLabel,
            reasons: (read?.drivers ?? [])
                .compactMap { d in d.name.flatMap { n in d.points.map { OmenReadBlock.Reason(text: n, points: $0) } } }
                .sorted { abs($0.points) > abs($1.points) }
                .prefix(3).map { $0 },
            // A game with no points or no opponent and no week has nothing honest to label; it is left out.
            lastGames: (stats?.lastGames ?? []).suffix(5).compactMap { g in
                guard let points = g.points, let label = g.opponent ?? g.week.map({ "W\($0)" }) else { return nil }
                return Game(label: label, points: points)
            },
            role: role,
            season: season
        )
    }
}

struct OmenPlayerScreen: View {
    let page: OmenPlayerPage
    /// "Shop him in a trade" or "Trade for him". Nil hides it.
    var tradeTitle: String?
    var onTrade: (() -> Void)?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step32) {
                header
                if page.player.omenPoints != nil || page.player.providerPoints != nil || page.player.grade != nil {
                    OmenReadBlock(player: page.player, reasons: page.reasons, title: "Omen\u{2019}s read \u{00B7} this week")
                }
                if !page.lastGames.isEmpty { lastGames }
                if !page.role.isEmpty {
                    VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                        OmenSectionHeader(title: "Role")
                        OmenStatGrid(stats: page.role)
                    }
                }
                if !page.season.isEmpty {
                    VStack(alignment: .leading, spacing: 0) {
                        OmenSectionHeader(title: "Season")
                        ForEach(page.season, id: \.self) { OmenKeyValueRow(key: $0.label, value: $0.value) }
                    }
                }
                if let tradeTitle, let onTrade {
                    OmenButton(title: tradeTitle, action: onTrade, variant: .secondary, size: .lg)
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step48)
        }
        .background(OmenColor.bg)
        .navigationBarTitleDisplayMode(.inline)
        .omenScreenReady("player")
    }

    private var header: some View {
        HStack(spacing: OmenSpacing.step16) {
            OmenPlayerBadge(team: page.player.team, number: page.player.number, position: page.player.position, size: .hero)
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(page.player.name)
                    .omenTextStyle(OmenTypography.pageTitle)
                    .foregroundStyle(OmenColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
                    .accessibilityAddTraits(.isHeader)
                Text([page.player.position, page.player.team, page.ownerLabel].compactMap { $0 }.joined(separator: " \u{00B7} "))
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                if let gameLine = page.gameLine {
                    Text(gameLine).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                }
            }
        }
        .accessibilityElement(children: .combine)
    }

    private var lastGames: some View {
        let points = page.lastGames.map(\.points)
        let peak = max(points.max() ?? 1, 1)
        let average = points.reduce(0, +) / Double(points.count)
        return VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            OmenSectionHeader(title: "Last \(page.lastGames.count) games", trailing: "avg \(OmenPlayerSummary.one(average))")
            HStack(alignment: .bottom, spacing: OmenSpacing.step8) {
                ForEach(Array(page.lastGames.enumerated()), id: \.offset) { _, game in
                    VStack(spacing: OmenSpacing.step6) {
                        RoundedRectangle(cornerRadius: 4, style: .continuous)
                            .fill(game.points >= average ? OmenColor.accent : OmenColor.surface3)
                            .frame(height: max(8, 64 * game.points / peak))
                        Text(OmenPlayerSummary.one(game.points)).omenTextStyle(OmenTypography.numeric).foregroundStyle(OmenColor.textPrimary)
                        Text(game.label).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                    }
                    .frame(maxWidth: .infinity, alignment: .bottom)
                    .accessibilityElement(children: .ignore)
                    .accessibilityLabel("\(game.label), \(OmenPlayerSummary.one(game.points)) points")
                }
            }
        }
    }
}
