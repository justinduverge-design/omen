import SwiftUI

/// Registry §3.2 approved **screen assembly** (feature layer). Rebuilt for v1.1 per
/// mobile-visual-briefs §1.1 to orient and prioritize the selected roster's week — it
/// does NOT duplicate Omen's full decision workspace. The full DecisionBrief lives on the
/// Omen destination, not here.
///
/// v1.1 hierarchy:
///   1. Header (page title + profile control)
///   2. Persistent OmenContextStrip (approved node 25:2)
///   3. OmenMatchupHero / Matchup Spine (approved node 25:26)
///   4. Waiver Watch — approved M4-CC-WaiverWatch composition
///   5. Ledger preview placeholder — blocked follow-up M4-CC-LedgerPreview
///   6. League Pulse placeholder — blocked follow-up M4-CC-LeaguePulse
///
/// Callers own the state and choose an honest fixture (demo mode vs real signed-in user).
/// This composition never selects a "connected" fixture on its own — exposing
/// demo-connected provider claims to a real user would violate facts-of-record #7.
struct OmenCommandCenterScreen: View {
    let state: OmenCommandCenterState
    let onSwitchContext: (() -> Void)?
    let onOpenMatchup: (() -> Void)?
    let onOpenAccount: (() -> Void)?
    let onOpenOmen: (() -> Void)?

    init(
        state: OmenCommandCenterState,
        onSwitchContext: (() -> Void)? = nil,
        onOpenMatchup: (() -> Void)? = nil,
        onOpenAccount: (() -> Void)? = nil,
        onOpenOmen: (() -> Void)? = nil
    ) {
        self.state = state
        self.onSwitchContext = onSwitchContext
        self.onOpenMatchup = onOpenMatchup
        self.onOpenAccount = onOpenAccount
        self.onOpenOmen = onOpenOmen
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                header
                OmenContextStrip(state: state.context, onSwitch: onSwitchContext)
                OmenMatchupHero(state: state.matchup, onOpen: onOpenMatchup)
                waiverWatch
                ledgerPlaceholder
                leaguePulsePlaceholder
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step24)
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .background(OmenColor.bg.ignoresSafeArea())
    }

    private var header: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: OmenSpacing.step4) {
                Text("Command Center")
                    .omenTextStyle(OmenTypography.eyebrow)
                    .foregroundStyle(OmenColor.textSecondary)
                Text(state.greeting)
                    .omenTextStyle(OmenTypography.h1)
                    .foregroundStyle(OmenColor.textPrimary)
            }
            Spacer(minLength: OmenSpacing.step8)
            if let onOpenAccount {
                OmenIconButton(
                    contentDescription: "Account and profile",
                    icon: Image(systemName: "person.crop.circle"),
                    action: onOpenAccount,
                    tone: .neutral
                )
            }
        }
    }

    @ViewBuilder
    private var waiverWatch: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("Waiver Watch")
            switch state.waiverWatch {
            case let .urgent(deadlineText, bestMove, longHorizonMoves):
                urgentWaiverBriefing(deadlineText: deadlineText, bestMove: bestMove, longHorizonMoves: longHorizonMoves)
            case let .calm(opportunities):
                calmWaiverList(opportunities: opportunities)
            case .pending:
                waiverStatusCard(title: "Claim pending", message: "Omen has identified an opportunity. Claim outcome is not yet known.")
            case .processed:
                waiverStatusCard(
                    title: "Waivers processed",
                    message: "Your league’s waivers have processed. Review current opportunities.",
                    showOmenLink: true
                )
            case .availabilityUnknown:
                waiverStatusCard(title: "Availability needs confirmation", message: "Omen cannot confirm availability for this league.")
            case .noCredibleMove:
                OmenStateSurface(
                    kind: .empty,
                    title: "No credible move",
                    message: "No waiver move stands out for this roster right now."
                )
            case .notConnected:
                OmenStateSurface(
                    kind: .disconnected,
                    title: "Personalized waiver moves need a league",
                    message: "Connect a league to see roster-aware opportunities, or use Try Demo to explore a labeled example."
                )
            case .offSeason:
                OmenStateSurface(
                    kind: .empty,
                    title: "Long-horizon waiver context",
                    message: "Omen will surface relevant draft and roster opportunities without weekly waiver urgency."
                )
            }
        }
    }

    private func urgentWaiverBriefing(
        deadlineText: String,
        bestMove: OmenWaiverOpportunity,
        longHorizonMoves: [OmenWaiverOpportunity]
    ) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text(deadlineText).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
            OmenCard(variant: .preview) {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    Rectangle().fill(OmenColor.accent).frame(height: OmenSpacing.step4)
                    Text("Best Move").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.accent)
                    opportunityContent(bestMove)
                }
            }
            omenLinkButton(title: "Review Omen’s waiver analysis")
            if !longHorizonMoves.isEmpty {
                Text("For the long horizon").omenTextStyle(OmenTypography.eyebrow).foregroundStyle(OmenColor.textSecondary)
                ForEach(Array(longHorizonMoves.prefix(2))) { opportunity in
                    opportunityRow(opportunity)
                }
            }
        }
    }

    private func calmWaiverList(opportunities: [OmenWaiverOpportunity]) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            ForEach(Array(opportunities.enumerated()), id: \.element.id) { index, opportunity in
                opportunityRow(opportunity, rank: index + 1)
            }
            omenLinkButton(title: "See full waiver analysis")
        }
    }

    private func waiverStatusCard(title: String, message: String, showOmenLink: Bool = false) -> some View {
        OmenCard(variant: .outlined) {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                Text(title).omenTextStyle(OmenTypography.h2).foregroundStyle(OmenColor.textPrimary)
                Text(message).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textSecondary)
                if showOmenLink { omenLinkButton(title: "Review Omen’s waiver analysis") }
            }
        }
    }

    private func opportunityRow(_ opportunity: OmenWaiverOpportunity, rank: Int? = nil) -> some View {
        OmenCard(variant: .outlined) {
            opportunityContent(opportunity, rank: rank)
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(opportunity.accessibilityLabel(rank: rank))
    }

    private func opportunityContent(_ opportunity: OmenWaiverOpportunity, rank: Int? = nil) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            Text([rank.map(String.init), "\(opportunity.playerName) · \(opportunity.position)"].compactMap { $0 }.joined(separator: "  "))
                .omenTextStyle(OmenTypography.h2).foregroundStyle(OmenColor.textPrimary)
            Text(opportunity.team).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
            Text(opportunity.availability).omenTextStyle(OmenTypography.bodySmall).foregroundStyle(OmenColor.textSecondary)
            Text(opportunity.reason).omenTextStyle(OmenTypography.body).foregroundStyle(OmenColor.textPrimary)
        }
    }

    @ViewBuilder
    private func omenLinkButton(title: String) -> some View {
        if let onOpenOmen {
            OmenButton(title: "\(title) →", action: onOpenOmen, variant: .link, size: .lg)
        }
    }

    private var ledgerPlaceholder: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("The Ledger")
            OmenStateSurface(
                kind: .empty,
                title: "The Ledger is landing next",
                message: "Blocked on the Figma-approved Ledger preview proposal (sprint item M4-CC-LedgerPreview)."
            )
        }
    }

    private var leaguePulsePlaceholder: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("League Pulse")
            OmenStateSurface(
                kind: .empty,
                title: "League Pulse is landing next",
                message: "Blocked on the Figma-approved League Pulse proposal (sprint item M4-CC-LeaguePulse)."
            )
        }
    }

    private func sectionLabel(_ text: String) -> some View {
        Text(text)
            .omenTextStyle(OmenTypography.label)
            .foregroundStyle(OmenColor.textSecondary)
    }
}

/// Immutable view state.
struct OmenCommandCenterState {
    let greeting: String
    let context: OmenContextStripState
    let matchup: OmenMatchupHeroState
    let waiverWatch: OmenWaiverWatchState

    init(
        greeting: String,
        context: OmenContextStripState,
        matchup: OmenMatchupHeroState,
        waiverWatch: OmenWaiverWatchState = .notConnected
    ) {
        self.greeting = greeting
        self.context = context
        self.matchup = matchup
        self.waiverWatch = waiverWatch
    }
}

/// View-only contract: callers provide verified data or an explicit honest state. This view never
/// infers a provider, availability, or waiver deadline.
enum OmenWaiverWatchState {
    case urgent(deadlineText: String, bestMove: OmenWaiverOpportunity, longHorizonMoves: [OmenWaiverOpportunity] = [])
    case calm(opportunities: [OmenWaiverOpportunity])
    case pending, processed, availabilityUnknown, noCredibleMove, notConnected, offSeason
}

struct OmenWaiverOpportunity: Identifiable {
    let id = UUID()
    let playerName: String
    let position: String
    let team: String
    let availability: String
    let reason: String

    func accessibilityLabel(rank: Int?) -> String {
        [rank.map { "Opportunity \($0)" }, playerName, position, team, availability, reason]
            .compactMap { $0 }
            .joined(separator: ", ")
    }
}

/// Fixture registry. Every fixture is explicitly labelled by its variable name; none
/// mints a "connected provider" claim for a real user. Screenshot workflow and
/// `Try Demo` session both consume these; a real signed-in user without connected
/// context sees `realDisconnected` until live wiring exists.
enum OmenCommandCenterFixtures {
    static let demoConnected = OmenCommandCenterState(
        greeting: "Demo · this week's move is ready.",
        context: .selected(platform: .sleeper, leagueName: "Demo Slate (mock league)", teamName: "Demo Titans"),
        matchup: .live(
            selectedTeam: OmenMatchupTeam(name: "Demo Titans", record: "6–1", scoreText: "64.8"),
            opponent: OmenMatchupTeam(name: "Demo Rivals", record: "5–2", scoreText: "58.1"),
            projectedFinish: "119.6–114.2",
            whatToWatch: "Opponent has two demo players remaining Monday night."
        ),
        waiverWatch: .urgent(
            deadlineText: "Demo deadline · Wed 3:00 AM",
            bestMove: OmenWaiverOpportunity(
                playerName: "Tyrone Tracy Jr.", position: "RB", team: "NYG",
                availability: "Available in this demo league", reason: "Immediate help at RB during a thin Week 7."
            ),
            longHorizonMoves: [
                OmenWaiverOpportunity(playerName: "Demo Player A", position: "WR", team: "ATL", availability: "Available", reason: "Dynasty upside."),
                OmenWaiverOpportunity(playerName: "Demo Player B", position: "TE", team: "SEA", availability: "Available", reason: "Future opportunity.")
            ]
        )
    )

    /// Honest disconnected state — what a real signed-in user without a connected
    /// league sees. No fabricated provider status, no fake matchup, no no-op CTA.
    static let realDisconnected = OmenCommandCenterState(
        greeting: "Connect a league to see your matchup.",
        context: .empty,
        matchup: .noMatchup(reason: "No matchup yet — connect Sleeper, Yahoo, or ESPN to see your team's week.")
    )

    /// Honest loading state — session restore or dashboard-summary in flight.
    static let realLoading = OmenCommandCenterState(
        greeting: "Restoring your session…",
        context: .empty,
        matchup: .noMatchup(reason: "Loading…")
    )
}

#if DEBUG
#Preview("CC — demo connected") { OmenCommandCenterScreen(state: OmenCommandCenterFixtures.demoConnected) }
#Preview("CC — real disconnected") { OmenCommandCenterScreen(state: OmenCommandCenterFixtures.realDisconnected) }
#endif
