import SwiftUI

// Trade on the foundation (frames: TradeChooser, Main trade builder, Sheets verdict, TradeShare, Edges
// "rosters unreadable"). Built only from `DesignSystem/Foundation`. Omen hands a trade over; it never
// sends one (spec § 5, Verdict sheet).

/// Pushed screens on the Trade tab (navigation map).
enum TradeRoute: Hashable {
    case find
    case build
    case judge
    case threeTeam
    case player(String)
}

// MARK: - Chooser

/// The Trade tab's root: what Omen found first, then build your own or judge one you were sent.
struct OmenTradeChooserView: View {
    var teamControl: (platform: String, team: String)?
    var onSwitchTeam: () -> Void = {}
    var onFind: () -> Void
    var onBuild: () -> Void
    var onJudge: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                    if let teamControl {
                        OmenTeamControl(platform: teamControl.platform, teamName: teamControl.team, action: onSwitchTeam)
                    }
                    Text("Trade").omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary).accessibilityAddTraits(.isHeader)
                }
                OmenPressable(action: onFind) {
                    OmenAnswerSurface {
                        VStack(alignment: .leading, spacing: OmenSpacing.step10) {
                            Text("FIND A TRADE").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                            Text("Trades that help both of you")
                                .omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                            Text("Omen reads every roster in your league and brings back the swaps that make both lineups better.")
                                .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                            HStack(spacing: OmenSpacing.step4) {
                                Text("See what Omen found").omenTextStyle(OmenTypography.rowTitle)
                                Image(systemName: "chevron.right").font(.system(size: 11, weight: .bold))
                            }
                            .foregroundStyle(OmenColor.accentHover)
                        }
                    }
                }
                .accessibilityElement(children: .combine)
                VStack(spacing: 0) {
                    row("Build a trade", "Pick from your roster and theirs", icon: "plus", action: onBuild)
                    OmenHairline().padding(.leading, 56)
                    row("Judge an offer", "Someone sent you one? Get the verdict", icon: "text.alignleft", action: onJudge)
                    OmenHairline().padding(.leading, 56)
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, 120)
        }
        .background(OmenColor.bg)
        .omenScreenReady("trade")
    }

    private func row(_ title: String, _ detail: String, icon: String, action: @escaping () -> Void) -> some View {
        OmenPressable(action: action) {
            HStack(spacing: OmenSpacing.step14) {
                Image(systemName: icon)
                    .font(.system(size: 17, weight: .semibold))
                    .foregroundStyle(OmenColor.textPrimary)
                    .frame(width: 42, height: 42)
                    .background(OmenColor.surface2, in: RoundedRectangle(cornerRadius: 13, style: .continuous))
                VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                    Text(title).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                    Text(detail).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                }
                Spacer(minLength: OmenSpacing.step8)
                Image(systemName: "chevron.right").font(.system(size: 12, weight: .semibold)).foregroundStyle(OmenColor.textTertiary)
            }
            .frame(minHeight: 68)
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Builder

/// Everything the builder draws, as plain values, so a screenshot fixture can mount it without a session.
struct OmenTradeBuilderState: Equatable {
    var mine: [OmenPlayerSummary]
    var theirs: [OmenPlayerSummary]
    var partners: [OmenTradePartner]
    var partnerID: String?
    var send: [TradePlayer]
    var receive: [TradePlayer]
    var judging = false
    /// The last judge failed; said plainly above the dock.
    var judgeError: String?

    func isSelected(_ player: OmenPlayerSummary, side: TradeViewModel.Side) -> Bool {
        (side == .send ? send : receive).contains { ($0.playerKey ?? $0.name) == player.id || $0.name == player.name }
    }
}

/// Build a trade on one screen: partner, the two trays, a roster toggle, a dock that judges it.
struct OmenTradeBuilderScreen: View {
    let state: OmenTradeBuilderState
    var onToggle: (OmenPlayerSummary, TradeViewModel.Side) -> Void
    var onRemove: (Int, TradeViewModel.Side) -> Void
    var onSwitchPartner: (String) -> Void
    var onOpenPlayer: (String) -> Void
    var onJudge: () -> Void
    /// Nil unless the league allows three-team trades.
    var onThreeTeam: (() -> Void)?

    @State private var showingTheirs: Bool

    init(
        state: OmenTradeBuilderState,
        onToggle: @escaping (OmenPlayerSummary, TradeViewModel.Side) -> Void,
        onRemove: @escaping (Int, TradeViewModel.Side) -> Void,
        onSwitchPartner: @escaping (String) -> Void,
        onOpenPlayer: @escaping (String) -> Void,
        onJudge: @escaping () -> Void,
        onThreeTeam: (() -> Void)? = nil,
        showingTheirs: Bool = false
    ) {
        self.onThreeTeam = onThreeTeam
        self.state = state
        self.onToggle = onToggle
        self.onRemove = onRemove
        self.onSwitchPartner = onSwitchPartner
        self.onOpenPlayer = onOpenPlayer
        self.onJudge = onJudge
        _showingTheirs = State(initialValue: showingTheirs)
    }

    private var partner: OmenTradePartner? { state.partners.first { $0.id == state.partnerID } }
    private var ready: Bool { !state.send.isEmpty && !state.receive.isEmpty }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                    Text("Build a trade").omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary).accessibilityAddTraits(.isHeader)
                    OmenTradePartnerMenu(partners: state.partners, partnerID: state.partnerID, onSwitch: onSwitchPartner)
                }
                if let onThreeTeam {
                    OmenBarTextButton(title: "Make it a three-team trade", action: onThreeTeam)
                }
                HStack(alignment: .top, spacing: OmenSpacing.step10) {
                    OmenTradeTray(title: "You send", players: state.send, empty: "Pick from your roster", onRemove: { onRemove($0, .send) })
                    OmenTradeTray(title: "You get", players: state.receive, empty: "Pick from theirs", onRemove: { onRemove($0, .receive) })
                }
                Picker("Roster", selection: $showingTheirs) {
                    Text("Your roster").tag(false)
                    Text(partner?.name ?? "Their roster").tag(true)
                }
                .pickerStyle(.segmented)
                let side: TradeViewModel.Side = showingTheirs ? .receive : .send
                let players = (showingTheirs ? state.theirs : state.mine).sorted { ($0.grade ?? -1) > ($1.grade ?? -1) }
                VStack(spacing: 0) {
                    ForEach(players) { player in
                        OmenPlayerRow(
                            player: player,
                            variant: .pick(selected: state.isSelected(player, side: side), onToggle: { onToggle(player, side) }, onInfo: { onOpenPlayer(player.id) }),
                            showsGrade: true
                        )
                        OmenHairline().padding(.leading, 44)
                    }
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .safeAreaInset(edge: .bottom) {
            OmenBottomDock {
                if let judgeError = state.judgeError {
                    Text(judgeError).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                if ready, points(state.send) != nil, points(state.receive) != nil {
                    HStack {
                        OmenFigure(value: points(state.send).map { "\(OmenPlayerSummary.one($0))" } ?? "\u{2014}", label: "you send, Omen pts")
                        Spacer()
                        OmenFigure(value: points(state.receive).map { "\(OmenPlayerSummary.one($0))" } ?? "\u{2014}", label: "you get, Omen pts")
                    }
                    .accessibilityElement(children: .combine)
                }
                OmenButton(
                    title: state.judging ? "Judging\u{2026}" : ready ? "Judge this trade" : "Pick a player on each side",
                    action: onJudge, variant: .primary, size: .lg, enabled: ready && !state.judging, loading: state.judging, fullWidth: true
                )
            }
        }
        .omenScreenReady("trade-builder")
    }

    /// Omen's points this week for one tray, from the roster read. Nil when any player's read is missing.
    private func points(_ offered: [TradePlayer]) -> Double? {
        let everyone = state.mine + state.theirs
        let values = offered.compactMap { o in
            // Omen's read only: a provider number is never labelled as Omen's.
            everyone.first { $0.id == (o.playerKey ?? o.name) || $0.name == o.name }.flatMap(\.omenPoints)
        }
        return values.count == offered.count ? values.reduce(0, +) : nil
    }
}

// MARK: - Shared

/// "with Gibbs me some Rice · Needs WR · Change": the trade partner, switchable from a menu.
struct OmenTradePartnerMenu: View {
    let partners: [OmenTradePartner]
    let partnerID: String?
    var prefix = "with"
    var onSwitch: (String) -> Void

    private var partner: OmenTradePartner? { partners.first { $0.id == partnerID } }

    var body: some View {
        Menu {
            ForEach(partners) { p in
                OmenBarTextButton(title: p.name) { onSwitch(p.id) }
            }
        } label: {
            HStack(spacing: OmenSpacing.step8) {
                OmenTeamCrest(name: partner?.name ?? "?", side: 28)
                Text("\(prefix) \(partner?.name ?? "a team")").omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textPrimary)
                    .multilineTextAlignment(.leading)
                if let need = partner?.need, !need.isEmpty {
                    Text(need).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.omenChip)
                }
                Text("Change").omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.accentHover)
            }
            .frame(minHeight: 44)
        }
        .accessibilityLabel("Trade partner, \(partner?.name ?? "none"). Change")
    }
}

/// One side of a trade as removable tokens (builder and Judge an offer). `active` outlines the side
/// the next pick goes to.
struct OmenTradeTray: View {
    let title: String
    let players: [TradePlayer]
    let empty: String
    var active = false
    /// When set, the title is a button that makes this the side the next pick goes to.
    var onSelect: (() -> Void)?
    var onRemove: (Int) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            if let onSelect {
                OmenPressable(action: onSelect) {
                    Text(title.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(active ? OmenColor.accentHover : OmenColor.textTertiary)
                        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                }
                .accessibilityLabel("\(title)\(active ? ", adding here" : "")")
                .accessibilityHint("Adds the next player to this side")
            } else {
                Text(title.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textTertiary)
            }
            VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                if players.isEmpty {
                    Text(empty).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).padding(OmenSpacing.step6)
                }
                ForEach(Array(players.enumerated()), id: \.offset) { index, player in
                    OmenPressable(action: { onRemove(index) }) {
                        HStack(spacing: OmenSpacing.step6) {
                            Text(player.name).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary).lineLimit(1)
                            Spacer(minLength: 0)
                            Image(systemName: "xmark").font(.system(size: 10, weight: .bold)).foregroundStyle(OmenColor.textSecondary)
                        }
                        .padding(.horizontal, OmenSpacing.step10)
                        .frame(minHeight: 44)
                        .background(OmenColor.surface3, in: Capsule())
                    }
                    .accessibilityLabel("Remove \(player.name)")
                    .accessibilityHint("Takes him out of the trade")
                }
            }
            .padding(OmenSpacing.step8)
            .frame(maxWidth: .infinity, minHeight: 60, alignment: .topLeading)
            .background(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(active ? OmenColor.accent : players.isEmpty ? OmenColor.borderSubtle : .clear,
                                  style: StrokeStyle(lineWidth: 1.5, dash: active || !players.isEmpty ? [] : [5, 4]))
                    .background(players.isEmpty ? Color.clear : OmenColor.surface1, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            )
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Verdict

/// The verdict as a sheet over the builder or the offer (frame: Sheets, verdict). Adjust closes it with the
/// picks kept; the primary action hands the trade to the provider.
struct OmenTradeVerdictSheet: View {
    enum Kind: Equatable {
        case verdict(OmenTradeVerdictState)
        case needsContext(OmenTradeNeedsContextState)
    }

    let kind: Kind
    var providerName: String?
    var onAdjust: () -> Void
    var onOpenProvider: (() -> Void)?
    var onShare: (() -> Void)?
    var onConnect: (() -> Void)?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                switch kind {
                case .verdict(let state):
                    OmenSheetHeader(title: state.read.headline, eyebrow: "Omen\u{2019}s verdict", closeTitle: "Close", onClose: onAdjust)
                    body(read: state.read, sides: state.sides)
                    if let submission = state.submission {
                        VStack(alignment: .leading, spacing: OmenSpacing.step6) {
                            // Omen never sends a trade; the provider's own words for the steps stay, the heading does not.
                            OmenSectionHeader(title: "Making the offer")
                            Text(submission.caption).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                        }
                    }
                    VStack(spacing: OmenSpacing.step10) {
                        if let providerName, let onOpenProvider {
                            OmenButton(title: "Open in \(providerName)", action: onOpenProvider, variant: .primary, size: .lg, fullWidth: true)
                        }
                        OmenButton(title: "Adjust", action: onAdjust, variant: .secondary, size: .lg, fullWidth: true)
                        if let onShare, state.shareActionTitle != nil {
                            OmenBarTextButton(title: "Share this read", action: onShare)
                        }
                    }
                case .needsContext(let state):
                    OmenSheetHeader(title: state.read.headline, eyebrow: "Omen needs more to judge this", closeTitle: "Close", onClose: onAdjust)
                    body(read: state.read, sides: state.sides)
                    if let remedy = state.remedy {
                        OmenStateBlock(kind: .notEnoughToGoOn, title: "What would make this answerable", message: remedy,
                                       actionTitle: onConnect == nil ? nil : state.connectActionTitle, action: onConnect)
                    }
                    OmenButton(title: "Adjust", action: onAdjust, variant: .secondary, size: .lg, fullWidth: true)
                }
            }
            .padding(OmenSpacing.step20)
        }
        .background(OmenColor.bg)
        .presentationDragIndicator(.visible)
        .omenScreenReady("trade-verdict")
    }

    @ViewBuilder
    private func body(read: OmenTradeRead, sides: [OmenTradeSide]) -> some View {
        Text(read.reasoning).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
        ForEach(Array(sides.enumerated()), id: \.offset) { _, side in
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text(side.heading.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textTertiary)
                ForEach(Array(side.legs.enumerated()), id: \.offset) { _, leg in
                    HStack {
                        Text(leg.name).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                        Spacer()
                        Text(leg.meta).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                    }
                    .frame(minHeight: 36)
                    .accessibilityElement(children: .combine)
                    .accessibilityLabel("\(leg.accessibilityDirection): \(leg.name), \(leg.meta)")
                }
            }
        }
        if let forward = read.forwardWeek {
            OmenFigure(value: (forward >= 0 ? "+" : "\u{2212}") + OmenPlayerSummary.one(abs(forward)), label: "your lineup, a week", emphasized: forward >= 0)
        }
        if let theCatch = read.theCatch {
            Text("The catch: \(theCatch)").omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
        }
        Text(read.caveat).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary).fixedSize(horizontal: false, vertical: true)
    }
}

// MARK: - Share

/// Share Omen's read with the league chat (frame: TradeShare). Team names are off by default.
struct OmenTradeShareSheet: View {
    let state: OmenTradeShareState
    var onToggle: (String) -> Void
    var onShare: () -> Void
    var onCopy: () -> Void
    var onDone: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                OmenSheetHeader(title: "Share this trade", closeTitle: "Done", onClose: onDone)
                Text(state.note).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                OmenAnswerSurface {
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        Text(state.card.eyebrow.uppercased()).omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accentHover)
                        Text(state.card.headline).omenTextStyle(OmenTypography.sectionHeader).foregroundStyle(OmenColor.textPrimary)
                        Text(state.card.reasoning).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary).fixedSize(horizontal: false, vertical: true)
                        Text(state.card.caveat).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                        Text(state.card.footer).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                    }
                }
                .accessibilityElement(children: .combine)
                VStack(spacing: 0) {
                    ForEach(state.inclusions) { inclusion in
                        Toggle(isOn: Binding(get: { inclusion.isOn }, set: { _ in onToggle(inclusion.id) })) {
                            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                                Text(inclusion.title).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                                Text(inclusion.detail).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                            }
                        }
                        .tint(OmenColor.accent)
                        .frame(minHeight: 56)
                        .overlay(alignment: .bottom) { OmenHairline() }
                    }
                }
                if let failure = state.failure {
                    OmenStateBlock(kind: .failed, title: "That share didn\u{2019}t go through", message: failure)
                }
                HStack(spacing: OmenSpacing.step10) {
                    if let secondary = state.secondaryActionTitle {
                        OmenButton(title: secondary, action: onCopy, variant: .secondary, size: .lg, fullWidth: true)
                    }
                    OmenButton(title: state.primaryActionTitle, action: onShare, variant: .primary, size: .lg, fullWidth: true)
                }
            }
            .padding(OmenSpacing.step20)
        }
        .background(OmenColor.bg)
        .presentationDragIndicator(.visible)
        .omenScreenReady("trade-share")
    }
}
