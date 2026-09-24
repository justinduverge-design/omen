import SwiftUI

/// Hosts J4's `TradeBuild` → `TradeRoster` roster-picking flow, reached from the Trade
/// destination's "Browse a real roster" control.
///
/// `OmenTradeRosterScreen` (and `OmenTradeBuildScreen`) deliberately model no loading state and
/// no retry — `TradeRoster.dc.html`'s own rule: a permanent provider limit is not an outage, and
/// this file's header record says not to build one. This view is where that loading/failure
/// surface actually lives, ahead of either journey screen: a plain progress state while
/// `GET /api/trade/roster` is in flight, and a retryable error surface for a genuine transport
/// failure (which is different from the server's own honest "unavailable" answer — that answer
/// is a 200, and it routes into `OmenTradeRosterScreen`'s `permanentlyUnavailable` case exactly
/// as designed, with no retry offered for it either).
struct TradeRosterFlowView: View {
    @ObservedObject var tradeViewModel: TradeViewModel
    let userID: String
    var onOpenAccount: (() -> Void)?
    var onDismiss: (() -> Void)?

    @State private var path: [Step] = []

    private enum Step: Hashable { case roster }

    var body: some View {
        NavigationStack(path: $path) {
            content
                .navigationDestination(for: Step.self) { step in
                    switch step {
                    case .roster:
                        rosterDestination
                    }
                }
        }
        .task { await tradeViewModel.loadRoster(userID: userID) }
    }

    @ViewBuilder
    private var content: some View {
        switch tradeViewModel.rosterBrowseState {
        case .idle, .loading:
            OmenTradeBuildScreen(
                state: loadingBuildState,
                onOpenAccount: onOpenAccount,
                onPrimaryAction: {}
            )
        case .failed(let error):
            VStack(spacing: OmenSpacing.step16) {
                OmenStateSurface(
                    kind: .error,
                    title: "Omen couldn't load your league's teams",
                    message: TradeViewModel.message(for: error)
                )
                OmenButton(
                    title: "Try again",
                    action: { Task { await tradeViewModel.loadRoster(userID: userID) } },
                    variant: .secondary,
                    size: .md
                )
            }
            .padding(OmenSpacing.step16)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(OmenColor.bg)
        case .loaded:
            OmenTradeBuildScreen(
                state: tradeViewModel.rosterBuildState,
                onOpenAccount: onOpenAccount,
                onSelectPartner: { id in
                    tradeViewModel.selectPartnerTeam(id)
                    path = [.roster]
                },
                onPrimaryAction: { path = [.roster] }
            )
        }
    }

    @ViewBuilder
    private var rosterDestination: some View {
        if let state = tradeViewModel.rosterScreenState {
            OmenTradeRosterScreen(
                state: state,
                onOpenAccount: onOpenAccount,
                onSelectPartner: { tradeViewModel.selectPartnerTeam($0) },
                onAddPlayer: { playerID in
                    guard case .loaded(let response) = tradeViewModel.rosterBrowseState,
                          let team = response.teams.first(where: { $0.id == (tradeViewModel.selectedPartnerTeamID ?? "") }),
                          let player = team.players.first(where: { $0.id == playerID })
                    else { return }
                    tradeViewModel.addFromRoster(player)
                    onDismiss?()
                }
            )
        } else {
            // The roster read has not landed yet for this partner (mid-navigation). Never a
            // permanent-unavailable claim for a read that simply has not run.
            ProgressView()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(OmenColor.bg)
        }
    }

    /// `TradeBuild` while the read is in flight: real sides (the offer built so far), no
    /// partners yet — the partner chips populate the moment the read lands.
    private var loadingBuildState: OmenTradeBuildState {
        OmenTradeBuildState(
            kicker: "Two teams",
            title: "Trade with a real team",
            tabTitles: [],
            selectedTabIndex: 0,
            partners: [],
            selectedPartnerID: nil,
            filters: [],
            selectedFilterID: nil,
            capability: tradeViewModel.rosterCapability,
            sides: OmenTradeAnswer.sides(of: tradeViewModel.offer),
            read: nil,
            submission: nil,
            primaryActionTitle: "Loading your league's teams…"
        )
    }
}
