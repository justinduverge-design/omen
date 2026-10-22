import SwiftUI

// Three-team trade on the foundation (frame: ThreeTeam). Pick a third team, send players between any two of
// the three, then Omen judges every lineup. Omen can't send trades: the provider steps are ticked off by hand.

/// Everything the three-team screen draws, as plain values, so a screenshot fixture can mount it without a session.
struct OmenThreeTeamState: Equatable {
    struct Move: Equatable, Identifiable {
        let id: String
        let players: [String]
        let fromID: String
        let toID: String
    }

    struct Line: Equatable, Identifiable {
        let id: String
        let name: String
        let sends: String?
        let gets: String?
        let net: Double?
    }

    struct Step: Equatable, Identifiable {
        let id: Int
        let text: String
        let done: Bool
    }

    enum Phase: Equatable {
        case building
        case judging
        case failed(String)
        case judged(lines: [Line], caption: String, steps: [Step])
    }

    var providerName: String
    /// You, the partner, the third team. Empty until a third team is picked.
    var teams: [OmenTradePartner]
    /// Teams that can be the third one.
    var candidates: [OmenTradePartner]
    var rosters: [String: [OmenPlayerSummary]]
    /// "teamID|playerID" -> where he is going.
    var destinations: [String: String]
    var moves: [Move]
    var phase: Phase = .building

    func name(_ id: String) -> String { teams.first { $0.id == id }?.name ?? id }
    var canJudge: Bool { teams.count == 3 && Set(moves.flatMap { [$0.fromID, $0.toID] }).count == 3 }
}

struct OmenThreeTeamScreen: View {
    let state: OmenThreeTeamState
    var onPickThird: (String) -> Void
    var onRemoveThird: () -> Void
    var onSend: (_ player: OmenPlayerSummary, _ from: String, _ to: String) -> Void
    var onOpenPlayer: (String) -> Void
    var onJudge: () -> Void
    var onAdjust: () -> Void
    var onToggleStep: (Int) -> Void
    var onCopyStep: (Int) -> Void
    var onOpenProvider: (() -> Void)?

    @State private var browsing: String

    init(
        state: OmenThreeTeamState,
        onPickThird: @escaping (String) -> Void,
        onRemoveThird: @escaping () -> Void,
        onSend: @escaping (OmenPlayerSummary, String, String) -> Void,
        onOpenPlayer: @escaping (String) -> Void,
        onJudge: @escaping () -> Void,
        onAdjust: @escaping () -> Void,
        onToggleStep: @escaping (Int) -> Void,
        onCopyStep: @escaping (Int) -> Void,
        onOpenProvider: (() -> Void)?,
        browsing: String = "you"
    ) {
        self.state = state
        self.onPickThird = onPickThird
        self.onRemoveThird = onRemoveThird
        self.onSend = onSend
        self.onOpenPlayer = onOpenPlayer
        self.onJudge = onJudge
        self.onAdjust = onAdjust
        self.onToggleStep = onToggleStep
        self.onCopyStep = onCopyStep
        self.onOpenProvider = onOpenProvider
        _browsing = State(initialValue: browsing)
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                    Text("Three teams, everyone better.")
                        .omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                        .accessibilityAddTraits(.isHeader)
                    Text("\(state.providerName) allows three-team trades in this league.")
                        .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                    if state.teams.count == 3 {
                        OmenBarTextButton(title: "Remove third team", action: onRemoveThird)
                    }
                }
                if state.teams.count < 3 {
                    pickThird
                } else if case .judged(let lines, let caption, let steps) = state.phase {
                    judged(lines, caption: caption, steps: steps)
                } else {
                    building
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .safeAreaInset(edge: .bottom) { dock }
        .omenScreenReady("trade-three-team")
    }

    // MARK: Pick the third team

    private var pickThird: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            OmenSectionHeader(title: "Pick the third team")
            if state.candidates.isEmpty {
                Text("Omen hasn\u{2019}t read the other rosters yet.").omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
            }
            ForEach(state.candidates) { team in
                OmenPressable(action: { onPickThird(team.id) }) {
                    HStack(spacing: OmenSpacing.step12) {
                        OmenTeamCrest(name: team.name, side: 36)
                        VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                            Text(team.name).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                            if let need = team.need, !need.isEmpty {
                                Text(need).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.omenChip)
                            }
                        }
                        Spacer()
                        Image(systemName: "plus").font(.system(size: 13, weight: .semibold)).foregroundStyle(OmenColor.accentHover)
                    }
                    .frame(minHeight: 58)
                }
                .accessibilityElement(children: .combine)
                .accessibilityHint("Adds them as the third team")
                OmenHairline().padding(.leading, 48)
            }
        }
    }

    // MARK: Building

    private var building: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step20) {
            VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                OmenSectionHeader(title: "Who sends what")
                if state.moves.isEmpty {
                    Text("Pick a player, then the team he goes to. Every team has to send someone.")
                        .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                ForEach(state.moves) { move in
                    Text("\(state.name(move.fromID)) \(move.fromID == "you" ? "send" : "sends") \(move.players.joined(separator: ", ")) to \(move.toID == "you" ? "you" : state.name(move.toID))")
                        .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            Picker("Roster", selection: $browsing) {
                ForEach(state.teams) { team in Text(team.name).tag(team.id) }
            }
            .pickerStyle(.segmented)
            VStack(spacing: 0) {
                ForEach((state.rosters[browsing] ?? []).sorted { ($0.grade ?? -1) > ($1.grade ?? -1) }) { player in
                    row(player)
                    OmenHairline().padding(.leading, 56)
                }
            }
        }
    }

    private func row(_ player: OmenPlayerSummary) -> some View {
        let destination = state.destinations["\(browsing)|\(player.id)"]
        return HStack(spacing: OmenSpacing.step8) {
            OmenPlayerRow(player: player, variant: .browse(onOpen: { onOpenPlayer(player.id) }))
            Menu {
                ForEach(state.teams.filter { $0.id != browsing }) { team in
                    OmenBarTextButton(title: destination == team.id ? "Keep him" : "Send to \(team.name)") {
                        onSend(player, browsing, team.id)
                    }
                }
            } label: {
                Group {
                    if let destination {
                        HStack(spacing: OmenSpacing.step4) {
                            Image(systemName: "arrow.right").font(.system(size: 12, weight: .bold)).foregroundStyle(OmenColor.accentHover)
                            OmenTeamCrest(name: state.name(destination), side: 28, isYours: destination == "you")
                        }
                    } else {
                        Text("Send").omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.accentHover)
                    }
                }
                .frame(minWidth: 44, minHeight: 44, alignment: .trailing)
            }
            .disabled(player.locked)
            .accessibilityLabel(destination.map { "\(player.name) goes to \(state.name($0)). Change" } ?? "Send \(player.name)")
        }
    }

    // MARK: Judged

    private func judged(_ lines: [OmenThreeTeamState.Line], caption: String, steps: [OmenThreeTeamState.Step]) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step20) {
            VStack(spacing: 0) {
                ForEach(lines) { line in
                    HStack(alignment: .top, spacing: OmenSpacing.step12) {
                        OmenTeamCrest(name: line.name, side: 36, isYours: line.id == "you")
                        VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                            Text(line.name).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                            if let sends = line.sends { Text(sends).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary) }
                            if let gets = line.gets { Text(gets).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary) }
                        }
                        Spacer(minLength: OmenSpacing.step8)
                        Text(line.net.map { ($0 >= 0 ? "+" : "\u{2212}") + OmenPlayerSummary.one(abs($0)) } ?? "\u{2014}")
                            .omenTextStyle(OmenTypography.figure)
                            .foregroundStyle(line.id == "you" ? OmenColor.accentHover : OmenColor.textPrimary)
                    }
                    .padding(.vertical, OmenSpacing.step12)
                    .accessibilityElement(children: .combine)
                    OmenHairline()
                }
                Text("Points per week, each lineup.").omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                    .frame(maxWidth: .infinity, alignment: .leading).padding(.top, OmenSpacing.step8)
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                OmenSectionHeader(title: "Set it up in \(state.providerName)")
                Text(caption.nilIfEmpty ?? "Omen can\u{2019}t send trades. Tick each one as you do it.")
                    .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                ForEach(steps) { step in
                    HStack(spacing: OmenSpacing.step10) {
                        OmenPressable(action: { onToggleStep(step.id) }) {
                            HStack(spacing: OmenSpacing.step10) {
                                Image(systemName: step.done ? "checkmark.circle.fill" : "circle")
                                    .font(.system(size: 22)).foregroundStyle(step.done ? OmenColor.accent : OmenColor.border)
                                Text(step.text).omenTextStyle(OmenTypography.body)
                                    .foregroundStyle(step.done ? OmenColor.textTertiary : OmenColor.textPrimary)
                                    .strikethrough(step.done)
                                    .fixedSize(horizontal: false, vertical: true)
                                Spacer(minLength: 0)
                            }
                            .frame(minHeight: 44)
                        }
                        .accessibilityLabel(step.text)
                        .accessibilityValue(step.done ? "Done" : "Not done")
                        OmenBarTextButton(title: "Copy") { onCopyStep(step.id) }
                            .accessibilityLabel("Copy the players for this step")
                    }
                }
            }
        }
    }

    // MARK: Dock

    @ViewBuilder
    private var dock: some View {
        switch state.phase {
        case .judged:
            OmenBottomDock {
                if let onOpenProvider {
                    OmenButton(title: "Open \(state.providerName)", action: onOpenProvider, variant: .primary, size: .lg, fullWidth: true)
                }
                OmenButton(title: "Adjust", action: onAdjust, variant: .secondary, size: .lg, fullWidth: true)
            }
        case .building, .judging, .failed:
            if state.teams.count == 3 {
                OmenBottomDock {
                    if case .failed(let message) = state.phase {
                        Text(message).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    }
                    let judging = state.phase == .judging
                    OmenButton(
                        title: judging ? "Judging\u{2026}" : state.canJudge ? "Judge this trade" : "Every team sends someone",
                        action: onJudge, variant: .primary, size: .lg, enabled: state.canJudge && !judging, loading: judging, fullWidth: true
                    )
                }
            }
        }
    }
}
