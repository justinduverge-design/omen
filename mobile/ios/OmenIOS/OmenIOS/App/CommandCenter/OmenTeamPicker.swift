import SwiftUI

/// One horizontal row of the user's teams, on the screens that are *about* one team.
///
/// Founder sketch, 2026-09-04, left margin: "maybe we can create a small widget of the
/// following pages that lets the user pick other teams."
///
/// Omen, Trade and League each answer a question about **one** league, and until this existed
/// the only way to change which one was to go back to Command Center, swipe the carousel, and
/// come back. Three taps and a screen change to answer "what about my other team?".
///
/// ## Why it shares the carousel's view model
///
/// Enumerating leagues makes live provider calls, so a picker with its own view model would
/// pay for the directory three more times — once per tab — and could disagree with Command
/// Center about which league is active while it did. Sharing one instance means the directory
/// is already loaded by the time any of these screens renders, the tap costs exactly one write,
/// and there is only ever one answer to "which league is active".
///
/// ## Why it is not the carousel
///
/// The carousel swipes because its pages carry a whole matchup each. These screens want a
/// glance and a tap: the row is short, every team is visible at once, and picking one is a
/// single action rather than a settle. Same commit underneath (`commit(_:)`), different
/// gesture, because the two screens are asking different things of the user.
struct OmenTeamPicker: View {
    @ObservedObject var viewModel: LeagueCarouselViewModel
    /// Passed so "demo" reads differently from "signed out", which are identical from the
    /// token alone and must never read the same to a user.
    var userID: String?
    /// The surfaces §10.3 says to re-read once the active league changed.
    let onContextChanged: ([String]) -> Void

    var body: some View {
        // One league is not a choice. Rendering a row with a single chip would be a control
        // that can only ever confirm what the screen already says.
        Group {
            if viewModel.allPages.count > 1 {
                VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                    Text("Your Teams")
                        .omenTextStyle(OmenTypography.label)
                        .foregroundStyle(OmenColor.textSecondary)
                    row
                }
            }
        }
        // Loads only if Command Center has not already — the shared view model makes this a
        // no-op on the common path, and the guard exists for a deep link that lands here first.
        .task {
            if case .loading = viewModel.viewState { await viewModel.load(userID: userID) }
        }
    }

    private var row: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: OmenSpacing.step8) {
                ForEach(viewModel.allPages) { page in
                    OmenChip(
                        // The team, not the league: these screens are about a roster, and the
                        // team name is what the user calls it. The league rides in the
                        // accessibility label, which is where a long name belongs anyway.
                        label: page.displayTeamName,
                        tone: chipTone(page.platform),
                        selected: page.isActive,
                        enabled: viewModel.committingPageID == nil,
                        action: {
                            Task {
                                if let refresh = await viewModel.commit(page) {
                                    onContextChanged(refresh)
                                }
                            }
                        }
                    )
                    .accessibilityLabel(accessibilityLabel(page))
                }
            }
            .padding(.vertical, OmenSpacing.step4)
        }
    }

    /// Each chip carries its provider's colour, so the row doubles as the answer to "which of
    /// these is my ESPN team" without a second line of text.
    private func chipTone(_ platform: String) -> OmenChipTone {
        switch platform {
        case "espn": return .espn
        case "yahoo": return .yahoo
        case "sleeper": return .sleeper
        default: return .omen
        }
    }

    private func accessibilityLabel(_ page: LeagueCarouselViewModel.Page) -> String {
        let state = page.isActive
            ? ", the league Omen is using"
            : (viewModel.committingPageID == page.id ? ", switching" : "")
        return "\(page.displayTeamName), \(page.displayLeagueName), "
            + "\(platformDisplayName(page.platform))\(state)"
    }
}
