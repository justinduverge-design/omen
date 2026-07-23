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
///   4. Waiver Watch placeholder — blocked follow-up M4-CC-WaiverWatch
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

    init(
        state: OmenCommandCenterState,
        onSwitchContext: (() -> Void)? = nil,
        onOpenMatchup: (() -> Void)? = nil,
        onOpenAccount: (() -> Void)? = nil
    ) {
        self.state = state
        self.onSwitchContext = onSwitchContext
        self.onOpenMatchup = onOpenMatchup
        self.onOpenAccount = onOpenAccount
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.sectionStack) {
                header
                OmenContextStrip(state: state.context, onSwitch: onSwitchContext)
                OmenMatchupHero(state: state.matchup, onOpen: onOpenMatchup)
                waiverWatchPlaceholder
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
                Button(action: onOpenAccount) {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 24))
                        .foregroundStyle(OmenColor.textPrimary)
                }
                .accessibilityLabel("Account and profile")
            }
        }
    }

    private var waiverWatchPlaceholder: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            sectionLabel("Waiver Watch")
            OmenStateSurface(
                kind: .empty,
                title: "Waiver Watch is landing next",
                message: "Blocked on the Figma-approved Waiver Watch proposal (sprint item M4-CC-WaiverWatch)."
            )
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
