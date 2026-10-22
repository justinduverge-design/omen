import SwiftUI

/// The Desk (frame: Main, Desk; States; Edges "No league" and "Demo"). Built only from the foundation
/// (`omen-design-foundation-v1.md` § 5). Answers "am I winning, in every league, and what needs me?"
///
/// Order, top to bottom: the week and a one-line answer across every league, the Team Rolodex, this
/// week's move, what needs you, your team, and Omen's record. Every section is independent: a section
/// whose read failed is left out or says so in one line; it never blanks the rest.
struct OmenDeskView: View {
    enum Phase: Equatable {
        /// The directory or the first read has not answered. Shows the Desk's outline, never a spinner.
        case loading
        /// The directory could not be read at all.
        case failed(message: String)
        /// Signed in, nothing connected.
        case noLeague
        case ready
    }

    /// One thing that needs the user, with one way to act on it.
    struct Need: Identifiable, Equatable {
        enum Kind: Equatable { case waiver, reconnect }
        let id: String
        let kind: Kind
        let title: String
        let detail: String?
    }

    let phase: Phase
    var weekLabel: String?
    var teams: [OmenTeamCardModel] = []
    @Binding var selectedTeamID: String?
    var move: OmenDeskMovePreview?
    var needs: [Need] = []
    var team: [OmenPlayerSummary] = []
    var teamProvider = "Provider"
    var ledgerLine: String?
    var isDemo = false
    /// A team switch is being written. The front card is already the new team; everything below it
    /// still belongs to the old one, so it is outlined, never shown under the new name (spec § 4).
    var switchingTo: String?
    /// The last switch did not land. Said plainly, with a retry.
    var switchError: String?
    var onRetrySwitch: () -> Void = {}

    var onAccount: () -> Void = {}
    var onRetry: () -> Void = {}
    var onConnect: () -> Void = {}
    var onTryDemo: (() -> Void)?
    var onOpenMove: () -> Void = {}
    var onNeed: (Need) -> Void = { _ in }
    var onReconnect: (OmenTeamCardModel) -> Void = { _ in }
    var onOpenPlayer: (String) -> Void = { _ in }
    var onOpenLedger: (() -> Void)?

    @State private var rolodexBottom: CGFloat = .greatestFiniteMagnitude

    var body: some View {
        ScrollViewReader { proxy in
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    header.id("top")
                    switch phase {
                    case .loading: loadingOutline
                    case .failed(let message):
                        OmenStateBlock(kind: .failed, title: "Omen couldn\u{2019}t load your leagues", message: message, actionTitle: "Try again", action: onRetry)
                            .padding(.horizontal, OmenSpacing.step20)
                            .padding(.top, OmenSpacing.step24)
                    case .noLeague: noLeague
                    case .ready: ready
                    }
                }
                .padding(.bottom, 120)
            }
            .coordinateSpace(name: "desk")
            .onPreferenceChange(RolodexBottomKey.self) { rolodexBottom = $0 }
            .overlay(alignment: .top) {
                if phase == .ready, rolodexBottom < 0, let front = frontTeam, front.status != .reconnect {
                    OmenPinnedScore(team: front) { withAnimation { proxy.scrollTo("top", anchor: .top) } }
                        .transition(.opacity)
                }
            }
            .animation(.easeOut(duration: 0.2), value: rolodexBottom < 0)
        }
        .background(OmenColor.bg)
        .omenScreenReady("desk", when: phase != .loading)
    }

    private var frontTeam: OmenTeamCardModel? {
        teams.first { $0.id == selectedTeamID } ?? teams.first
    }

    // MARK: Header

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                HStack(spacing: OmenSpacing.step8) {
                    if isDemo { demoLabel }
                    if let weekLabel, !weekLabel.isEmpty {
                        Text(weekLabel.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                    }
                }
                Text(headline)
                    .omenTextStyle(OmenTypography.pageTitle)
                    .foregroundStyle(OmenColor.textPrimary)
                    .accessibilityAddTraits(.isHeader)
            }
            Spacer(minLength: OmenSpacing.step12)
            OmenAvatar(action: onAccount)
        }
        .padding(.horizontal, OmenSpacing.step20)
        .padding(.top, OmenSpacing.step8)
    }

    /// "Up in 2 of 3" when games are on; otherwise the plain name of the page.
    private var headline: String {
        switch phase {
        case .noLeague: return "Connect a league to start"
        case .loading, .failed: return "Desk"
        case .ready:
            let scored = teams.filter { $0.isAhead != nil }
            guard !scored.isEmpty else { return teams.count > 1 ? "Your \(teams.count) teams" : "Your team" }
            let up = scored.filter { $0.isAhead == true }.count
            return "Up in \(up) of \(scored.count)"
        }
    }

    private var demoLabel: some View {
        Text("DEMO")
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(OmenColor.Data.demoText)
            .padding(.horizontal, OmenSpacing.step8)
            .padding(.vertical, OmenSpacing.step2)
            .overlay(Capsule().stroke(OmenColor.Data.demoText, lineWidth: 1.5))
            .accessibilityLabel("Demo mode, sample data")
    }

    // MARK: Ready

    @ViewBuilder
    private var ready: some View {
        OmenTeamRolodex(teams: teams, selectedID: $selectedTeamID, onReconnect: onReconnect)
            .padding(.top, OmenSpacing.step20)
            .background(GeometryReader { geo in
                Color.clear.preference(key: RolodexBottomKey.self, value: geo.frame(in: .named("desk")).maxY - 60)
            })

        VStack(alignment: .leading, spacing: OmenSpacing.step32) {
            if let switchError {
                OmenStateBlock(kind: .failed, title: "That switch didn\u{2019}t go through", message: switchError, actionTitle: "Try again", action: onRetrySwitch)
            }
            if let switchingTo {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    RoundedRectangle(cornerRadius: 22, style: .continuous).fill(OmenColor.surface1).frame(height: 150)
                    RoundedRectangle(cornerRadius: 14).fill(OmenColor.surface1).frame(height: 56)
                    Text("Reading \(switchingTo)").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).frame(maxWidth: .infinity)
                }
                .accessibilityElement(children: .ignore)
                .accessibilityLabel("Reading \(switchingTo)")
            } else {
            if let move { moveCard(move) }
            if !needs.isEmpty { needsSection }
            if !team.isEmpty { teamSection }
            }
            if switchingTo == nil, let ledgerLine, let onOpenLedger {
                OmenPressable(action: onOpenLedger) {
                    HStack {
                        Text(ledgerLine).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                        Spacer()
                        Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(OmenColor.textTertiary)
                    }
                    .frame(minHeight: 44)
                }
                .accessibilityHint("Opens the Ledger")
            }
        }
        .padding(.horizontal, OmenSpacing.step20)
        .padding(.top, OmenSpacing.step32)
    }

    private func moveCard(_ move: OmenDeskMovePreview) -> some View {
        OmenPressable(action: onOpenMove) {
            OmenAnswerSurface {
                VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                    HStack {
                        Text(move.isHold ? "THIS WEEK" : "THIS WEEK\u{2019}S MOVE").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                        Spacer()
                        if let band = move.band {
                            Text(band.label).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                        }
                    }
                    Text(move.headline)
                        .omenTextStyle(OmenTypography.sectionHeader)
                        .foregroundStyle(OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let reason = move.reason {
                        Text(reason)
                            .omenTextStyle(OmenTypography.body)
                            .foregroundStyle(OmenColor.textSecondary)
                            .lineLimit(3)
                    }
                    HStack(spacing: OmenSpacing.step4) {
                        Text("See why").omenTextStyle(OmenTypography.rowTitle)
                        Image(systemName: "chevron.right").font(.system(size: 11, weight: .bold))
                    }
                    .foregroundStyle(OmenColor.accentHover)
                }
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityHint("Opens the Omen tab")
    }

    private var needsSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            OmenSectionHeader(title: "Needs you", trailing: "\(needs.count)")
            ForEach(needs) { need in
                OmenPressable(action: { onNeed(need) }) {
                    HStack(spacing: OmenSpacing.step12) {
                        Image(systemName: icon(for: need.kind))
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(OmenColor.accentHover)
                            .frame(width: 40, height: 40)
                            .background(OmenColor.surface2, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                            Text(need.title).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                            if let detail = need.detail {
                                Text(detail).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                            }
                        }
                        Spacer(minLength: OmenSpacing.step8)
                        Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(OmenColor.textTertiary)
                    }
                    .frame(minHeight: 58)
                }
                .accessibilityElement(children: .combine)
                OmenHairline().padding(.leading, 52)
            }
        }
    }

    private func icon(for kind: Need.Kind) -> String {
        switch kind {
        case .waiver: "plus"
        case .reconnect: "arrow.clockwise"
        }
    }

    private var teamSection: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
            OmenSectionHeader(title: "Your team", trailing: "Omen \u{00B7} \(teamProvider)")
            ForEach(team) { player in
                OmenPlayerRow(player: player, variant: .compare(onOpen: { onOpenPlayer(player.id) }))
                OmenHairline().padding(.leading, 52)
            }
        }
    }

    // MARK: Loading and no league

    private var loadingOutline: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step24) {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(OmenColor.surface1)
                .frame(height: 200)
                .padding(.horizontal, 30)
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                RoundedRectangle(cornerRadius: 8).fill(OmenColor.surface1).frame(width: 140, height: 18)
                RoundedRectangle(cornerRadius: 14).fill(OmenColor.surface1).frame(height: 56)
                RoundedRectangle(cornerRadius: 14).fill(OmenColor.surface1).frame(height: 56)
            }
            .padding(.horizontal, OmenSpacing.step20)
            Text("Reading your leagues")
                .omenTextStyle(OmenTypography.quiet)
                .foregroundStyle(OmenColor.textTertiary)
                .frame(maxWidth: .infinity)
        }
        .padding(.top, OmenSpacing.step20)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Reading your leagues")
    }

    private var noLeague: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step20) {
            Text("Your scores, this week\u{2019}s move and your trades show up here.")
                .omenTextStyle(OmenTypography.body)
                .foregroundStyle(OmenColor.textSecondary)
            RoundedRectangle(cornerRadius: 24, style: .continuous)
                .strokeBorder(OmenColor.borderSubtle, style: StrokeStyle(lineWidth: 1.5, dash: [6, 5]))
                .frame(height: 190)
                .accessibilityHidden(true)
            OmenButton(title: "Connect a league", action: onConnect, variant: .primary, size: .lg, fullWidth: true)
            if let onTryDemo {
                OmenBarTextButton(title: "Look around with a sample league", action: onTryDemo)
                    .frame(maxWidth: .infinity)
            }
        }
        .padding(.horizontal, OmenSpacing.step20)
        .padding(.top, OmenSpacing.step12)
    }
}

private struct RolodexBottomKey: PreferenceKey {
    static let defaultValue: CGFloat = .greatestFiniteMagnitude
    static func reduce(value: inout CGFloat, nextValue: () -> CGFloat) { value = nextValue() }
}

// MARK: - Adapting today's reads

extension OmenTeamCardModel {
    /// One followed team from the league directory and its matchup read.
    init(page: LeagueCarouselViewModel.Page, state: LeagueCarouselViewModel.PageState) {
        func number(_ text: String?) -> Double? { text.flatMap { Double($0.trimmingCharacters(in: .whitespaces)) } }
        var model = OmenTeamCardModel(
            id: page.id,
            platform: page.platform,
            leagueName: page.displayLeagueName,
            teamName: page.displayTeamName,
            status: .loading
        )
        switch state {
        case .loading:
            model.status = .loading
        case .needsReauth:
            model.status = .reconnect
        case .unavailable(let message):
            model.status = .upcoming("")
            model.line = message
        case .loaded(let hero):
            let pair: (OmenMatchupTeam, OmenMatchupTeam, String?)?
            switch hero {
            case .beforeGames(let mine, let theirs, let start, let watch):
                model.status = .upcoming(start)
                pair = (mine, theirs, watch)
            case .live(let mine, let theirs, let finish, let watch):
                model.status = .live(nil)
                model.line = finish
                pair = (mine, theirs, watch)
            case .final(let mine, let theirs, let summary, _):
                model.status = .final
                model.line = summary
                pair = (mine, theirs, nil)
            case .noMatchup(let reason):
                model.status = .upcoming("No matchup")
                model.line = reason
                pair = nil
            }
            if let (mine, theirs, watch) = pair {
                model.record = mine.record
                model.score = number(mine.scoreText)
                model.projected = number(mine.projectedText)
                model.opponentName = theirs.name
                model.opponentRecord = theirs.record
                model.opponentScore = number(theirs.scoreText)
                model.opponentProjected = number(theirs.projectedText)
                if model.line == nil { model.line = watch }
            }
        }
        self = model
    }
}

extension OmenPlayerSummary {
    /// A player from the league roster read (the same read Trade uses).
    init(_ player: TradeRosterResponse.Player, providerName: String) {
        let lead: Lead = switch player.omenRead?.authority?.state {
        case "omen_leads": .omen
        case "provider_leads": .provider
        default: .unresolved
        }
        self.init(
            id: player.id,
            name: player.name,
            position: player.position?.uppercased(),
            team: player.team,
            number: nil,
            omenPoints: player.omenRead?.points,
            providerPoints: player.projectedPoints,
            providerName: providerName,
            grade: player.omenRead?.grade,
            lead: lead
        )
    }
}
