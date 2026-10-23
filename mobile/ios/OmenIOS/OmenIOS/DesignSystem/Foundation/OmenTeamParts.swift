import SwiftUI

// Foundation v1 team patterns (spec § 4 Switching teams, § 5 Team Rolodex, Pinned score, team control).

/// One followed team, as every team pattern draws it.
struct OmenTeamCardModel: Equatable, Identifiable {
    enum Status: Equatable {
        /// The game clock when the provider sends one ("Q2"), otherwise just live.
        case live(String?)
        case upcoming(String)
        case final
        /// The provider signed the user out; the card says so and offers the fix.
        case reconnect
        case loading
    }

    let id: String
    let platform: String
    let leagueName: String
    let teamName: String
    var crestURL: URL?
    var record: String?
    var score: Double?
    var opponentName: String?
    var opponentRecord: String?
    var opponentScore: Double?
    var playersLeft: Int?
    var opponentPlayersLeft: Int?
    var projected: Double?
    var opponentProjected: Double?
    /// One line from Omen about this matchup.
    var line: String?
    var status: Status

    /// Share of combined projected points, labelled as such (spec § 6). Never a win probability.
    var projectedShare: Double? {
        guard let projected, let opponentProjected, projected + opponentProjected > 0 else { return nil }
        return projected / (projected + opponentProjected)
    }

    var isAhead: Bool? {
        guard let score, let opponentScore else { return nil }
        return score >= opponentScore
    }
}

/// The Desk's horizontal stack of team cards. The card that settles in front becomes the selected team;
/// nothing commits mid-flick (spec § 4).
struct OmenTeamRolodex: View {
    let teams: [OmenTeamCardModel]
    @Binding var selectedID: String?
    var onReconnect: ((OmenTeamCardModel) -> Void)?

    @State private var scrolledID: String?

    var body: some View {
        VStack(spacing: OmenSpacing.step2) {
            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: OmenSpacing.step12) {
                    ForEach(teams) { team in
                        OmenTeamCard(team: team, onReconnect: onReconnect.map { fix in { fix(team) } })
                            .containerRelativeFrame(.horizontal) { width, _ in teams.count == 1 ? width - 40 : width - 60 }
                            .scrollTransition(.interactive, axis: .horizontal) { view, phase in
                                view.scaleEffect(phase.isIdentity ? 1 : 0.94)
                            }
                            .id(team.id)
                    }
                }
                .scrollTargetLayout()
            }
            .contentMargins(.horizontal, teams.count == 1 ? 20 : 30, for: .scrollContent)
            .scrollTargetBehavior(.viewAligned)
            .scrollPosition(id: $scrolledID)
            .onAppear { scrolledID = selectedID ?? teams.first?.id }
            // Teams can arrive after the first render; land on the selected one when they do.
            .onChange(of: teams.map(\.id)) { _, _ in
                if scrolledID == nil || !teams.contains(where: { $0.id == scrolledID }) {
                    scrolledID = selectedID ?? teams.first?.id
                }
            }
            // Commit only when the scroll comes to rest, never mid-flick (spec § 4.1).
            .modifier(OmenScrollSettle(position: scrolledID) { settled in
                guard let settled, settled != selectedID else { return }
                UISelectionFeedbackGenerator().selectionChanged()
                selectedID = settled
            })
            .onChange(of: selectedID) { _, chosen in
                if chosen != scrolledID { withAnimation { scrolledID = chosen } }
            }
            .accessibilityElement(children: .contain)
            .accessibilityLabel("Your teams")

            if teams.count > 1 { position }
        }
    }

    /// "1 of 3" plus dots, so the stack never relies on colour alone.
    private var position: some View {
        let index = teams.firstIndex { $0.id == (scrolledID ?? selectedID) } ?? 0
        return HStack(spacing: OmenSpacing.step8) {
            HStack(spacing: OmenSpacing.step6) {
                ForEach(Array(teams.enumerated()), id: \.offset) { i, _ in
                    Capsule()
                        .fill(i == index ? OmenColor.accent : OmenColor.surface3)
                        .frame(width: i == index ? 18 : 6, height: 6)
                }
            }
            Text("\(index + 1) of \(teams.count)")
                .omenTextStyle(OmenTypography.quiet)
                .foregroundStyle(OmenColor.textTertiary)
        }
        .frame(minHeight: 44)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Team \(index + 1) of \(teams.count)")
        .accessibilityAddTraits(.isStaticText)
    }
}

/// Calls back once a scroll has come to rest. iOS 18 reports the scroll phase; iOS 17 waits until the
/// position has not changed for a quarter second.
private struct OmenScrollSettle: ViewModifier {
    let position: String?
    let onSettle: (String?) -> Void
    @State private var pending: Task<Void, Never>?

    func body(content: Content) -> some View {
        if #available(iOS 18.0, *) {
            content.onScrollPhaseChange { _, phase in
                if phase == .idle { onSettle(position) }
            }
        } else {
            content.onChange(of: position) { _, value in
                pending?.cancel()
                pending = Task { @MainActor in
                    try? await Task.sleep(for: .milliseconds(250))
                    if !Task.isCancelled { onSettle(value) }
                }
            }
        }
    }
}

/// One team's card in the Rolodex.
struct OmenTeamCard: View {
    let team: OmenTeamCardModel
    var onReconnect: (() -> Void)?

    var body: some View {
        OmenAnswerSurface(padding: OmenSpacing.step20) {
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                HStack {
                    OmenProviderMark(platform: team.platform)
                    Text("\u{00B7} \(team.leagueName)").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary).lineLimit(1)
                    Spacer(minLength: OmenSpacing.step8)
                    Text(statusText).omenTextStyle(OmenTypography.quiet).foregroundStyle(team.status == .reconnect ? OmenColor.accentHover : OmenColor.textTertiary)
                }
                if team.status == .reconnect {
                    reconnect
                } else {
                    side(name: team.teamName, crest: team.crestURL, isYours: true, record: team.record, left: team.playersLeft, score: team.score, lead: true)
                    side(name: team.opponentName ?? "Opponent", crest: nil, isYours: false, record: team.opponentRecord, left: team.opponentPlayersLeft, score: team.opponentScore, lead: false)
                    if let share = team.projectedShare {
                        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                            GeometryReader { geo in
                                HStack(spacing: 2) {
                                    Capsule().fill(OmenColor.accent).frame(width: max(0, (geo.size.width - 2) * share))
                                    Capsule().fill(OmenColor.surface3)
                                }
                            }
                            .frame(height: 6)
                            Text("Projected points")
                                .omenTextStyle(OmenTypography.quiet)
                                .foregroundStyle(OmenColor.textTertiary)
                        }
                        .accessibilityElement(children: .ignore)
                        .accessibilityLabel("Projected points: \(Int((share * 100).rounded())) percent yours")
                    }
                    if let line = team.line {
                        Text(line).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                    }
                }
            }
        }
    }

    private var statusText: String {
        switch team.status {
        case .live(let clock): clock.map { "Live \u{00B7} \($0)" } ?? "Live"
        case .upcoming(let when): when
        case .final: "Final"
        case .reconnect: "Sign in again"
        case .loading: ""
        }
    }

    private func side(name: String, crest: URL?, isYours: Bool, record: String?, left: Int?, score: Double?, lead: Bool) -> some View {
        HStack(spacing: OmenSpacing.step10) {
            OmenTeamCrest(name: name, imageURL: crest, side: 30, isYours: isYours)
            VStack(alignment: .leading, spacing: 1) {
                Text(name).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(lead ? OmenColor.textPrimary : OmenColor.textSecondary).lineLimit(2)
                Text([record, left.map { "\($0) to play" }].compactMap { $0 }.joined(separator: " \u{00B7} "))
                    .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                    .lineLimit(1)
            }
            .layoutPriority(1)
            Spacer(minLength: OmenSpacing.step8)
            Text(score.map(OmenPlayerSummary.one) ?? "\u{2014}")
                .omenTextStyle(lead ? OmenTypography.pageTitle : OmenTypography.figure)
                .monospacedDigit()
                .foregroundStyle(lead ? OmenColor.textPrimary : OmenColor.textTertiary)
                .fixedSize()
        }
        .accessibilityElement(children: .combine)
    }

    private var reconnect: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
            Text(team.teamName).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
            Text("\(OmenProviderMark.displayName(team.platform)) signed you out. Your league is kept; scores come back when you sign in.")
                .omenTextStyle(OmenTypography.body)
                .foregroundStyle(OmenColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
            if let onReconnect {
                OmenButton(title: "Sign in to \(OmenProviderMark.displayName(team.platform))", action: onReconnect, variant: .primary, size: .md)
            }
        }
    }
}

/// The front card shrunk to a slim bar, pinned below the top safe area while the Desk scrolls (spec § 5).
/// Tapping it scrolls back to the top; it does not flick.
struct OmenPinnedScore: View {
    let team: OmenTeamCardModel
    let onTap: () -> Void

    var body: some View {
        OmenPressable(action: onTap) {
            HStack(spacing: OmenSpacing.step10) {
                OmenTeamCrest(name: team.teamName, imageURL: team.crestURL, side: 24, isYours: true)
                Text(team.score.map(OmenPlayerSummary.one) ?? "\u{2014}").omenTextStyle(OmenTypography.numeric).foregroundStyle(OmenColor.textPrimary)
                Text("vs").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                Text(team.opponentScore.map(OmenPlayerSummary.one) ?? "\u{2014}").omenTextStyle(OmenTypography.numeric).foregroundStyle(OmenColor.textSecondary)
                Text(team.opponentName ?? "").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).lineLimit(1)
                Spacer(minLength: 0)
            }
            .padding(.horizontal, OmenSpacing.step16)
            .frame(minHeight: 44)
            .background(.bar)
        }
        .accessibilityLabel("Your score \(team.score.map(OmenPlayerSummary.one) ?? "none"), \(team.opponentName ?? "opponent") \(team.opponentScore.map(OmenPlayerSummary.one) ?? "none"). Scroll to top")
    }
}

/// The compact team control on the roots of Omen, Trade and League: "ESPN · Titans ▾" (spec § 3).
struct OmenTeamControl: View {
    let platform: String
    let teamName: String
    let action: () -> Void

    var body: some View {
        OmenPressable(action: action) {
            HStack(spacing: OmenSpacing.step6) {
                OmenProviderMark(platform: platform)
                Text("\u{00B7} \(teamName)").omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textSecondary).lineLimit(1)
                Image(systemName: "chevron.down").font(.system(size: 11, weight: .bold)).foregroundStyle(OmenColor.textTertiary)
            }
            .frame(minHeight: 44)
        }
        .accessibilityLabel("Team: \(teamName), \(OmenProviderMark.displayName(platform)). Switch team")
    }
}
