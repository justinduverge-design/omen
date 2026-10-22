import SwiftUI

// Find a trade on the foundation (frame: FindTrade). One swap at a time: who, what each side sends, what
// each lineup gains a week, the catch. Omen opens it in the builder; it never sends it (spec § 5).

/// Everything Find a trade draws, as plain values, so a screenshot fixture can mount it without a session.
struct OmenFindTradeState: Equatable {
    struct Candidate: Equatable {
        let id: String
        let partnerName: String
        /// "Needs WR" when the partner has a hole the swap fills; nil otherwise.
        let partnerNeed: String?
        let send: OmenPlayerSummary
        let receive: OmenPlayerSummary
        let yourGain: Double?
        let theirGain: Double?
        let theCatch: String?
    }

    enum Phase: Equatable {
        case loading
        case reviewing(Candidate, index: Int, total: Int)
        /// The search ran and came back empty, or every candidate was passed.
        case empty(title: String, message: String)
        /// The search could not run; the message names why. `retry` only where retrying can help.
        case unavailable(title: String, message: String, retry: Bool)
        case failed(String)
    }

    var phase: Phase
    var teamsRead: Int?
}

extension OmenFindTradeState.Candidate {
    init(_ candidate: TradeFindCandidate, providerName: String) {
        let need = candidate.reasoning.opponentReceives
        self.init(
            id: candidate.id,
            partnerName: candidate.opponentDisplayName,
            partnerNeed: need.need.status == "hole" && need.position != "UNK" ? "Needs \(need.position)" : nil,
            send: OmenPlayerSummary(candidate.give, providerName: providerName),
            receive: OmenPlayerSummary(candidate.receive, providerName: providerName),
            yourGain: candidate.userLineupDelta,
            theirGain: candidate.opponentLineupDelta,
            theCatch: candidate.theCatch?.statement?.nilIfEmpty
        )
    }
}

extension OmenPlayerSummary {
    init(_ player: TradeFindPlayer, providerName: String) {
        let lead: Lead = switch player.omenRead?.authority?.state {
        case "omen_leads": .omen
        case "provider_leads": .provider
        default: .unresolved
        }
        self.init(
            id: player.playerKey ?? player.name,
            name: player.name,
            position: player.position?.uppercased(),
            team: player.team,
            omenPoints: player.omenRead?.points,
            providerPoints: player.projectedPoints,
            providerName: providerName,
            grade: player.omenRead?.grade,
            lead: lead
        )
    }
}

struct OmenFindTradeScreen: View {
    let state: OmenFindTradeState
    var onOpenInBuilder: () -> Void
    var onNext: () -> Void
    var onRetry: () -> Void
    var onOpenPlayer: (String) -> Void
    var onBack: () -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: OmenSpacing.step20) {
                VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                    Text("Trades that help you both")
                        .omenTextStyle(OmenTypography.pageTitle).foregroundStyle(OmenColor.textPrimary)
                        .accessibilityAddTraits(.isHeader)
                    if let teams = state.teamsRead, teams > 0 {
                        Text("Omen read all \(teams) other rosters")
                            .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                    }
                }
                content
            }
            .padding(.horizontal, OmenSpacing.step20)
            .padding(.top, OmenSpacing.step8)
            .padding(.bottom, OmenSpacing.step24)
        }
        .background(OmenColor.bg)
        .safeAreaInset(edge: .bottom) {
            if case .reviewing(_, let index, let total) = state.phase {
                OmenBottomDock {
                    OmenButton(title: "Open in builder", action: onOpenInBuilder, variant: .primary, size: .lg, fullWidth: true)
                    if index + 1 < total {
                        OmenButton(title: "Next trade", action: onNext, variant: .secondary, size: .lg, fullWidth: true)
                    }
                }
            }
        }
        .toolbar {
            if case .reviewing(_, let index, let total) = state.phase {
                ToolbarItem(placement: .topBarTrailing) {
                    Text("\(index + 1) of \(total)")
                        .omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.textSecondary)
                        .accessibilityLabel("Trade \(index + 1) of \(total)")
                }
            }
        }
        .omenScreenReady("trade-find")
    }

    @ViewBuilder
    private var content: some View {
        switch state.phase {
        case .loading:
            OmenStateBlock(kind: .loading, title: "Reading every roster", message: "Omen checks each team for a swap that helps both lineups.")
        case .reviewing(let candidate, _, _):
            candidateView(candidate)
        case .empty(let title, let message):
            OmenStateBlock(kind: .nothingWorthDoing, title: title, message: message, actionTitle: "Back to Trade", action: onBack)
        case .unavailable(let title, let message, let retry):
            OmenStateBlock(kind: .notEnoughToGoOn, title: title, message: message, actionTitle: retry ? "Try again" : "Back to Trade", action: retry ? onRetry : onBack)
        case .failed(let message):
            OmenStateBlock(kind: .failed, title: "Omen couldn\u{2019}t search your league", message: message, actionTitle: "Try again", action: onRetry)
        }
    }

    private func candidateView(_ candidate: OmenFindTradeState.Candidate) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step20) {
            HStack(spacing: OmenSpacing.step12) {
                OmenTeamCrest(name: candidate.partnerName, side: 40)
                VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                    Text(candidate.partnerName).omenTextStyle(OmenTypography.rowTitle).foregroundStyle(OmenColor.textPrimary)
                    if let need = candidate.partnerNeed {
                        Text(need).omenTextStyle(OmenTypography.quiet).foregroundStyle(OmenColor.omenChip)
                    }
                }
            }
            .accessibilityElement(children: .combine)

            side("You send", candidate.send)
            side("You get", candidate.receive)

            HStack(alignment: .top) {
                OmenFigure(value: signed(candidate.yourGain), label: "your lineup, a week", emphasized: true)
                Spacer()
                OmenFigure(value: signed(candidate.theirGain), label: "theirs, a week")
            }

            if let theCatch = candidate.theCatch {
                (Text("The catch: ").bold() + Text(theCatch))
                    .omenTextStyle(OmenTypography.body)
                    .foregroundStyle(OmenColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func side(_ title: String, _ player: OmenPlayerSummary) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            OmenSectionHeader(title: title)
            OmenPlayerRow(player: player, variant: .compare(onOpen: { onOpenPlayer(player.id) }))
        }
    }

    /// "+1.9", or a dash when the server sent no number. Never a zero for a missing value (spec § 6).
    private func signed(_ value: Double?) -> String {
        guard let value else { return "\u{2014}" }
        return (value >= 0 ? "+" : "\u{2212}") + OmenPlayerSummary.one(abs(value))
    }
}

extension OmenFindTradeState {
    /// Honest copy for each reason the server gives when it could not run the search at all. None
    /// of these is "no gaps to fill": that answer is only for a search that completed.
    static func unavailableCopy(reason: String, platform: String) -> (title: String, message: String) {
        let provider = TradeFindReviewViewModel.providerName(platform)
        switch reason {
        case "projections_unavailable":
            return (
                "Not enough projections to rank trades",
                "Find a trade ranks swaps by how they change your projected lineup, and Omen could not build enough usable projections for this \(provider) league. Omen won't guess. You can still compare an offer yourself."
            )
        case "provider_reauth_required":
            return (
                "Reconnect \(provider) to search",
                "Omen's \(provider) sign-in has expired, so it can't read your league's rosters. Reconnect from Account, then search again."
            )
        case "league_not_active":
            return (
                "This league hasn't started",
                "Rosters aren't set yet, so there's nothing to match. Come back once the season is underway."
            )
        case "own_roster_unavailable":
            return (
                "Omen can't read your roster",
                "\(provider) didn't return your own roster, so there's nothing to match other teams against. Try again in a moment."
            )
        default:
            return (
                "Omen can't search this league yet",
                "\(provider) doesn't give Omen what a search needs for this league. This isn't a \"no trades found\" answer. You can still compare an offer yourself."
            )
        }
    }

    static func message(for error: OmenApiError) -> String {
        switch error {
        case .cancelled: return "That was interrupted. Try again."
        case .network: return "Omen couldn't reach the server. Check your connection and try again."
        case .unauthorized: return "Your session expired. Sign in again to see your league's candidates."
        case .server: return "Omen is having trouble on our side. Try again in a moment."
        case .decode: return "Omen sent something this version of the app couldn't read."
        }
    }

    static func emptyCopy(reason: String?, teams: Int) -> (title: String, message: String) {
        switch reason {
        case "no_fair_trade":
            return ("Nothing fair on the table.",
                    "Omen found trades that would help your lineup across \(teams) teams, but each one costs the other manager more than it gives them. A deal they'd turn down isn't a move.")
        case "no_trade_helps_both_lineups":
            return ("No swap helps both sides.",
                    "Omen tried every one-for-one across \(teams) teams. None makes both starting lineups better this week.")
        case "no_tradeable_players":
            return ("Nobody to trade right now.",
                    "Every player who could move is locked or has no projection yet. Check back once this week's games are set.")
        case "no_readable_opponents":
            return ("Omen couldn't read the other teams.",
                    "Your roster loaded, but no other roster in this league did. Try again in a minute.")
        case "search_budget_exceeded":
            return ("The search ran out of time.",
                    "This league has more combinations than Omen can check in one pass. Try again, or build the trade yourself.")
        default:
            return ("No real gaps to fill.",
                    "Omen checked \(teams) teams against your roster and found nothing that clearly helps you. Some weeks there's nothing there.")
        }
    }
}
