import SwiftUI

// Judge an offer on the foundation (frame: JudgeOffer). Someone sent you a trade: type the names on each side,
// pick who sent it, and Omen judges it against both lineups. The verdict is the same sheet the builder uses.

/// Everything Judge an offer draws, as plain values, so a screenshot fixture can mount it without a session.
struct OmenJudgeOfferState: Equatable {
    struct Result: Equatable, Identifiable {
        let id: String
        let name: String
        let position: String?
        let team: String?
        /// "on Gibbs me some Rice", "free agent", or nil when Omen hasn't read the rosters.
        let owner: String?
        let isCorrection: Bool
    }

    /// What they want from you.
    var send: [TradePlayer]
    /// What they offer you.
    var receive: [TradePlayer]
    var partners: [OmenTradePartner]
    var partnerID: String?
    var results: [Result] = []
    /// One quiet line under the field: searching, nothing found, or why the search failed.
    var searchNote: String?
    var judging = false
    var judgeError: String?
}

struct OmenJudgeOfferScreen: View {
    let state: OmenJudgeOfferState
    var onQuery: (String, TradeViewModel.Side) -> Void
    var onAdd: (OmenJudgeOfferState.Result, TradeViewModel.Side) -> Void
    var onRemove: (Int, TradeViewModel.Side) -> Void
    var onSwitchPartner: (String) -> Void
    var onJudge: () -> Void

    @State private var side: TradeViewModel.Side
    @State private var query: String

    init(
        state: OmenJudgeOfferState,
        onQuery: @escaping (String, TradeViewModel.Side) -> Void,
        onAdd: @escaping (OmenJudgeOfferState.Result, TradeViewModel.Side) -> Void,
        onRemove: @escaping (Int, TradeViewModel.Side) -> Void,
        onSwitchPartner: @escaping (String) -> Void,
        onJudge: @escaping () -> Void,
        side: TradeViewModel.Side = .send,
        query: String = ""
    ) {
        self.state = state
        self.onQuery = onQuery
        self.onAdd = onAdd
        self.onRemove = onRemove
        self.onSwitchPartner = onSwitchPartner
        self.onJudge = onJudge
        _side = State(initialValue: side)
        _query = State(initialValue: query)
    }

    private var ready: Bool { !state.send.isEmpty && !state.receive.isEmpty }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                    Text("Someone sent you an offer?")
                        .omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                        .accessibilityAddTraits(.isHeader)
                    Text("Type the names. Omen checks it against both lineups.")
                        .omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                }
                HStack(alignment: .top, spacing: OmenSpacing.step10) {
                    tray("They want", players: state.send, side: .send, empty: "Your players")
                    tray("They offer", players: state.receive, side: .receive, empty: "Their players")
                }
                OmenTextField(value: $query, label: side == .send ? "Add a player they want" : "Add a player they offer",
                              placeholder: side == .send ? "A player they want" : "A player they offer")
                    .onChange(of: query) { _, new in onQuery(new, side) }
                if let note = state.searchNote {
                    Text(note).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                }
                VStack(spacing: 0) {
                    ForEach(state.results) { result in
                        resultRow(result)
                        OmenHairline().padding(.leading, 56)
                    }
                }
                if !state.partners.isEmpty {
                    OmenTradePartnerMenu(partners: state.partners, partnerID: state.partnerID, prefix: "From", onSwitch: onSwitchPartner)
                }
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(OmenColor.bg)
        .safeAreaInset(edge: .bottom) {
            OmenBottomDock {
                if let judgeError = state.judgeError {
                    Text(judgeError).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                OmenButton(
                    title: state.judging ? "Judging\u{2026}" : ready ? "Judge this offer" : "Add a player on each side",
                    action: onJudge, variant: .primary, size: .lg, enabled: ready && !state.judging, loading: state.judging, fullWidth: true
                )
            }
        }
        .omenScreenReady("trade-judge")
    }

    private func tray(_ title: String, players: [TradePlayer], side traySide: TradeViewModel.Side, empty: String) -> some View {
        OmenTradeTray(title: title, players: players, empty: empty, active: side == traySide, onSelect: {
            side = traySide
            if !query.isEmpty { onQuery(query, traySide) }
        }, onRemove: { onRemove($0, traySide) })
    }

    private func resultRow(_ result: OmenJudgeOfferState.Result) -> some View {
        HStack(spacing: OmenSpacing.step12) {
            OmenPlayerBadge(team: result.team, number: nil, position: result.position?.uppercased())
            VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                Text(result.isCorrection ? "Did you mean \(result.name)?" : result.name)
                    .omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                if let line = [result.team, result.owner].compactMap({ $0 }).joined(separator: " \u{00B7} ").nilIfEmpty {
                    Text(line).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textTertiary)
                }
            }
            Spacer(minLength: OmenSpacing.step8)
            OmenBarTextButton(title: "Add") {
                onAdd(result, side)
                query = ""
            }
            .accessibilityLabel("Add \(result.name) to \(side == .send ? "they want" : "they offer")")
        }
        .frame(minHeight: 58)
    }
}
