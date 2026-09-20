import SwiftUI

/// The League destination — the scout's nest.
///
/// ## What changed here, and why it is a rebuild rather than a re-skin
///
/// This screen was M5 slice F: a Matchup Spine, a Playoff Picture card, a rank table and "Around
/// the League", built against the ratified `M1-Screen-League` contract before the canvas existed.
/// `design/native-visual-lock-2026-09-13/` draws the destination as the **scout's nest** — a
/// screen about the other eleven managers rather than about you — and `CONTRACTS.md` fixes its
/// section order: **strip → The Table → Trade targets → Waiver → Activity**.
///
/// Those are not the same screen with different paint. The old composition had no trade-target
/// section at all, put your own matchup at full card size at the top, and had no route to the
/// wire. So this file now does what it should always have done: it **resolves** the League
/// destination's state and hands it to `OmenLeagueTableScreen`, which is the built artboard.
///
/// **Sections still render independently**, because `league-overview.v1` reports them
/// independently — that rule survived the rebuild intact and is now expressed as
/// `OmenScoutSection` per section rather than as four `if` branches.
///
/// Per the scope correction carried by the contract, this screen has **no seasonal entry point
/// beyond the week it is showing**.
struct OmenLeagueScreen: View {
    let state: LeagueViewModel.ViewState
    var onRetry: (() -> Void)?
    var onConnect: (() -> Void)?
    /// The switcher bar's context, resolved by the caller that fetched the league. A screen that
    /// resolved its own could disagree with the table it is displaying.
    var context: OmenScreenContext?
    var onOpenAccount: (() -> Void)?
    /// The wire, when the caller has actually read `waiver-analysis.v1`.
    ///
    /// **Optional, and its absence removes the link rather than disabling it.** A "The wire ›"
    /// affordance that opens an empty screen is the same lie as an avatar that opens nothing —
    /// the rule `OmenScreenShell` states for the header, applied to a section header.
    var wire: OmenScoutWireState?
    /// Trade targets, when something has read other managers' rosters. See `tradeTargets`.
    var tradeTargets: OmenScoutSection<[OmenScoutTradeTarget]> = OmenLeagueScreen.tradeTargetsUnread
    /// The waiver section's summary card on the Table screen.
    var waiverSummary: OmenScoutSection<OmenDeskWaiverMove> = OmenLeagueScreen.waiverUnread

    @State private var showingWire = false

    var body: some View {
        content
            .background(OmenColor.bg)
            .sheet(isPresented: $showingWire) {
                if let wire {
                    OmenLeagueWireScreen(
                        state: wire,
                        context: context,
                        onOpenAccount: onOpenAccount
                    )
                }
            }
    }

    @ViewBuilder private var content: some View {
        switch state {
        case .loaded(let overview):
            OmenLeagueTableScreen(
                state: OmenScoutTableState.from(
                    overview: overview,
                    waiver: waiverSummary,
                    tradeTargets: tradeTargets,
                    notice: nil,
                    footnote: nil,
                    // A retry belongs only where retrying could change the answer. When the
                    // whole read failed the failure surface below carries it instead.
                    retryTitle: nil
                ),
                context: context,
                onOpenAccount: onOpenAccount,
                onOpenWaiver: wire == nil ? nil : { showingWire = true }
            )
        default:
            ScrollView {
                VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                    switch state {
                    case .idle, .loading:
                        // Idle and loading are the same surface on purpose: before the first
                        // request resolves there is nothing truthful to show but a spinner, and
                        // an empty state would claim the user has no league.
                        OmenStateSurface(
                            kind: .loading,
                            title: "Reading your league",
                            message: "The table and the wire come from your provider."
                        )
                    case .demo:
                        OmenStateSurface(
                            kind: .mock,
                            title: "Demo league",
                            message: "Demo mode shows no live league. Sign in with a connected league to see your own."
                        )
                    case .failed(let error):
                        failure(error)
                    case .loaded:
                        EmptyView()
                    }
                }
                .padding(OmenSpacing.step24)
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

    // MARK: - Failure

    @ViewBuilder
    private func failure(_ error: OmenApiError) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            OmenStateSurface(
                kind: error == .unauthorized ? .disconnected : .error,
                title: "Omen couldn\u{2019}t load your league",
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

    // MARK: - The two sections `league-overview.v1` does not carry

    /// `league-overview.v1` carries standings, matchup and activity. It does **not** carry other
    /// managers' rosters, which is what a trade target is derived from — so until a caller has
    /// read them, the section says so in words rather than rendering an empty list.
    ///
    /// An empty list and an unread one look identical and mean opposite things. That distinction
    /// is the whole subject of `LeagueDegraded`, so this screen must not be the place that
    /// quietly gets it wrong.
    static let tradeTargetsUnread = OmenScoutSection<[OmenScoutTradeTarget]>.unread(
        capability: "Trade rosters",
        sentence: "Omen has not read the other managers\u{2019} rosters for this league yet, so it names no trade targets. It will not guess one from the standings."
    )

    /// Same rule for the waiver summary: `waiver-analysis.v1` is a separate read.
    static let waiverUnread = OmenScoutSection<OmenDeskWaiverMove>.unread(
        capability: "Waivers",
        sentence: "The wire has not been read for this league yet."
    )
}
