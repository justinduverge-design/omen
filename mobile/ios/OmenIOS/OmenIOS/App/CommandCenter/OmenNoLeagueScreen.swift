import SwiftUI

/// `CommandNoLeague.dc.html` — J1's terminus, and the first screen a signed-in user with no
/// connected league actually sees.
///
/// ## Why this replaces a populated-but-empty Command Center
///
/// The shipped disconnected state renders the full Command Center furniture — a greeting, three
/// disconnected platform rows, a "no matchup" line. It is honest, but it reads as a broken
/// dashboard rather than a deliberate one, and it never says *why* there is nothing here.
///
/// The artboard's answer is better and is the reason this screen exists: **"Until then this
/// screen would be guessing, so it stays empty."** That sentence converts an absence into a
/// stated policy. It is the same commitment the capability contract makes on the decision
/// screens — Omen would rather show nothing than show something it cannot stand behind — and
/// this is the first place a new user meets it.
///
/// ## What it must not do
///
/// It must not name a provider the user cannot currently connect — but it must name every one
/// they **can**.
///
/// The first draft of this screen listed Sleeper and ESPN only, copying the artboard. That was
/// wrong. Yahoo's entitlement was granted **2026-08-28**, `ConnectProvider.yahoo.availability` is
/// `.available`, and native OAuth is wired. Omitting it silently told a Yahoo user this product
/// was not for them, on the first screen they saw.
///
/// The omission came from a stale comment on the old `realDisconnected` fixture, written while
/// Yahoo really was on hold — the same way the "ESPN is gated" assumption survived its own
/// decision by eighteen days. **Read the availability, do not remember it.**
struct OmenNoLeagueScreen: View {
    var onConnect: (() -> Void)?
    var onSeeHowOmenDecides: (() -> Void)?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: OmenSpacing.step16) {
                header
                explanation
                actions
                footnote
                Color.clear.frame(height: OmenSpacing.step16)
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.vertical, OmenSpacing.step12)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.bottom, 64)
        }
        .background(OmenColor.bg)
        .accessibilityIdentifier("j1.command-no-league")
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step4) {
            Text("No league yet")
                .omenTextStyle(OmenTypography.micro)
                .foregroundStyle(OmenColor.accent)
            Text("Nothing to read")
                .omenTextStyle(OmenTypography.screenTitle)
                .foregroundStyle(OmenColor.textPrimary)
        }
    }

    /// The policy sentence is the point of the screen. It is deliberately not softened into
    /// "check back soon" — Omen is not waiting on itself, it is waiting on a league.
    private var explanation: some View {
        OmenCard(contentPadding: OmenSpacing.step12) {
            Text("Omen has nothing to read yet. Connect a league and the first call lands within a minute. Until then this screen would be guessing, so it stays empty.")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
    }

    private var actions: some View {
        VStack(spacing: OmenSpacing.step12) {
            if let onConnect {
                OmenButton(title: "Connect a league", action: onConnect, size: .lg)
                    .frame(maxWidth: .infinity)
            }
            // The second action exists so an empty screen is not a dead end. Someone who is not
            // ready to hand over a league can still find out what they would get.
            if let onSeeHowOmenDecides {
                OmenButton(
                    title: "See how Omen decides",
                    action: onSeeHowOmenDecides,
                    variant: .secondary,
                    size: .lg
                )
                .frame(maxWidth: .infinity)
            }
        }
    }

    /// Sets the cost before the tap, for **all three** connectable providers. ESPN's "a few more
    /// steps" is the same honest line the provider picker carries — the two must not drift,
    /// because they describe one journey. The order matches the picker: fastest first.
    private var footnote: some View {
        Text("Sleeper takes about ten seconds. Yahoo is one sign-in, read-only. ESPN takes a few more steps and we walk you through them.")
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textTertiary)
            .frame(maxWidth: .infinity, alignment: .leading)
    }
}
