import SwiftUI

/// The team context bar: which team you are looking at, and the way to change it.
///
/// Contract: `Blueprints/specs/mobile/omen-league-switcher-contract-v1.md`.
/// Screen artifacts: `design/app-rework-canvas/Main.dc.html` (carousel form),
/// `SwitchSheet.dc.html` (the sheet).
///
/// ## What changed on 2026-09-05, and why
///
/// This was a bare `ScrollView` of team chips under a "Your Teams" heading. Two defects, both
/// visible in the founder's own screenshot of the Omen tab:
///
///   1. **The row ran off the right edge with nothing pinned.** A user with four teams could
///      scroll the last one out of reach and had no fixed control to fall back on. `Switch` now
///      sits outside the scroll container, always reachable — that pin is the whole point.
///   2. **It disagreed with the canvas**, which specified a switcher the app never grew. Rather
///      than delete the carousel the founder liked, the canvas was amended to the carousel and
///      this bar now implements *both*: scroll for a glance, `Switch` for the full list.
///
/// ## Why the sheet and the row share an order
///
/// Both read `viewModel.allPages`, which applies the favourites sort once. The sheet is the
/// row opened up; two orderings would eventually disagree and the star would appear to mean
/// different things six inches apart on the same screen.
struct OmenTeamPicker: View {
    @ObservedObject var viewModel: LeagueCarouselViewModel
    /// Passed so "demo" reads differently from "signed out", which are identical from the
    /// token alone and must never read the same to a user.
    var userID: String?
    /// The surfaces §10.3 says to re-read once the active league changed.
    let onContextChanged: ([String]) -> Void
    var onAddLeague: (() -> Void)?

    /// Command Center has a second entry point — `OmenContextStrip`'s own "Switch" — and both
    /// must open the *same* sheet. When the host owns the flag it passes it in here; everywhere
    /// else this view is the only trigger and keeps its own.
    ///
    /// Two sheets would be the drift this whole change exists to remove: one switcher the canvas
    /// specified and another the app grew, disagreeing about order and favourites.
    var externalPresentation: Binding<Bool>?

    @State private var localPresentation = false

    private var isSwitcherPresented: Binding<Bool> { externalPresentation ?? $localPresentation }

    var body: some View {
        Group {
            // One team is not a choice. A row with a single chip and a Switch button beside it
            // would be two controls that can only ever confirm what the screen already says.
            if viewModel.allPages.count > 1 {
                HStack(spacing: 0) {
                    teamRow
                    pinnedControls
                }
            }
        }
        // Loads only if Command Center has not already — the shared view model makes this a
        // no-op on the common path, and the guard exists for a deep link that lands here first.
        .task {
            if case .loading = viewModel.viewState { await viewModel.load(userID: userID) }
        }
        .sheet(isPresented: isSwitcherPresented) { switcherSheet }
    }

    /// The scrolling half. Everything in here is allowed to leave the viewport, because
    /// `pinnedControls` guarantees a way to reach what scrolled away.
    private var teamRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: OmenSpacing.step8) {
                ForEach(viewModel.allPages) { page in
                    OmenChip(
                        // The team, not the league: these screens are about a roster, and the
                        // team name is what the user calls it. The league rides in the
                        // accessibility label, which is where a long name belongs anyway.
                        label: chipLabel(page),
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
        // Fades the row out where it meets the pinned controls instead of slicing a chip in
        // half. The hard cut read as a rendering bug in the shipped build; a fade reads as
        // "there is more this way", which is what it is.
        .mask(
            LinearGradient(
                stops: [
                    .init(color: .black, location: 0),
                    .init(color: .black, location: 0.88),
                    .init(color: .clear, location: 1),
                ],
                startPoint: .leading,
                endPoint: .trailing
            )
        )
    }

    /// Never scrolls. This is the fix for the defect in the founder's screenshot.
    private var pinnedControls: some View {
        HStack(spacing: OmenSpacing.step8) {
            if let onAddLeague {
                OmenIconButton(
                    contentDescription: "Add a league",
                    icon: Image(systemName: "plus"),
                    action: onAddLeague,
                    // Verdigris: the only control in this bar that changes what you have
                    // rather than which of it you are looking at.
                    tone: .omen,
                    size: .sm
                )
            }
            OmenIconButton(
                contentDescription: "Switch team",
                icon: Image(systemName: "chevron.right"),
                action: { isSwitcherPresented.wrappedValue = true },
                tone: .accent,
                size: .sm
            )
        }
        .padding(.leading, OmenSpacing.step8)
    }

    // MARK: - Sheet

    private var switcherSheet: some View {
        OmenTeamSwitcherSheet(
            teams: switcherTeams,
            platformFilters: platformFilters,
            selectedFilter: viewModel.selectedPlatform,
            notice: switcherNotice,
            onSelectFilter: { viewModel.selectedPlatform = $0 },
            onSelectTeam: { team in
                guard let page = viewModel.allPages.first(where: { $0.id == team.id }) else { return }
                // Dismiss first. The switch is fast but not instant, and holding the sheet open
                // over a screen that is already updating underneath it hides the very thing the
                // user asked for. The write continues after dismissal.
                isSwitcherPresented.wrappedValue = false
                Task {
                    if let refresh = await viewModel.commit(page) {
                        onContextChanged(refresh)
                    }
                }
            },
            onToggleFavorite: { team in
                guard let page = viewModel.allPages.first(where: { $0.id == team.id }) else { return }
                // Stays open, deliberately. Starring is curation, and a sheet that closed on
                // every star would make ordering four favourites a four-trip errand.
                viewModel.toggleFavorite(page)
            },
            onAddLeague: onAddLeague.map { add in
                {
                    isSwitcherPresented.wrappedValue = false
                    add()
                }
            }
        )
        .presentationDetents([.height(sheetHeight)])
        .presentationDragIndicator(.visible)
    }

    /// The sheet lists the *filtered* set, so the provider chips do something, while the bar
    /// itself always shows every team.
    private var switcherTeams: [OmenSwitcherTeam] { viewModel.pages.map(switcherTeam) }

    private var sheetHeight: CGFloat {
        OmenTeamSwitcherSheet.preferredHeight(
            forTeamCount: switcherTeams.count,
            showsFilters: platformFilters.count > 1,
            showsAddLeague: onAddLeague != nil
        )
    }

    /// All, then only the providers that actually have a team. A filter that can only ever
    /// return the same list is a control with nothing to do, so a single-provider user gets
    /// no segment at all.
    private var platformFilters: [OmenSwitcherPlatformFilter] {
        let providers = viewModel.availablePlatforms.map { platform in
            OmenSwitcherPlatformFilter(
                id: platform,
                label: platformDisplayName(platform),
                tone: chipTone(platform),
                count: viewModel.allPages.filter { $0.platform == platform }.count
            )
        }
        guard providers.count > 1 else { return [] }
        return [
            OmenSwitcherPlatformFilter(
                id: LeagueCarouselViewModel.allPlatforms,
                label: "All",
                tone: .omen,
                count: viewModel.allPages.count
            )
        ] + providers
    }

    /// The server's own explanation for a partial provider group, rendered verbatim on the
    /// filter it belongs to. The app must not invent a reason for a provider's state.
    private var switcherNotice: String? {
        guard viewModel.selectedPlatform != LeagueCarouselViewModel.allPlatforms else { return nil }
        return viewModel.directory?.platforms
            .first { $0.platform == viewModel.selectedPlatform }?
            .notice
    }

    // MARK: - Labels

    /// Contract §2: the team's name is the primary label, and when the provider never gave one
    /// the **league** name takes its place — not "Your team", and not the user's own name.
    /// `Page.displayTeamName` falls back to "Your team", which is honest on a matchup card but
    /// useless in a list where every unnamed row would read identically.
    private func chipLabel(_ page: LeagueCarouselViewModel.Page) -> String {
        page.teamName?.isEmpty == false ? page.teamName! : page.displayLeagueName
    }

    /// The second line. When the league name has already been promoted to the primary line,
    /// this says so rather than repeating it.
    private func subtitle(_ page: LeagueCarouselViewModel.Page) -> String {
        let provider = platformDisplayName(page.platform)
        guard page.teamName?.isEmpty == false else { return "\(provider) · unnamed team" }
        // ESPN exposes no league list, so `league_name` is routinely null and
        // `displayLeagueName` falls back to "League 884411". That id is a fine last resort on a
        // matchup card, where it is the only thing distinguishing two pages — but as a subtitle
        // under a real team name it is noise the user cannot act on. The provider alone is the
        // honest line: we know it is their ESPN team, and we do not know the league's name.
        guard page.leagueName?.isEmpty == false else { return provider }
        return "\(provider) · \(page.displayLeagueName)"
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

    private func omenPlatform(_ platform: String) -> OmenPlatform {
        switch platform {
        case "espn": return .espn
        case "yahoo": return .yahoo
        default: return .sleeper
        }
    }

    private func accessibilityLabel(_ page: LeagueCarouselViewModel.Page) -> String {
        let state = page.isActive
            ? ", the league Omen is using"
            : (viewModel.committingPageID == page.id ? ", switching" : "")
        let favorite = viewModel.isFavorite(page) ? ", favourite" : ""
        return "\(chipLabel(page)), \(page.displayLeagueName), "
            + "\(platformDisplayName(page.platform))\(favorite)\(state)"
    }
}

extension OmenTeamPicker {
    /// Bridges the carousel's `Page` to the primitive layer's flat row model.
    func switcherTeam(_ page: LeagueCarouselViewModel.Page) -> OmenSwitcherTeam {
        OmenSwitcherTeam(
            id: page.id,
            platform: omenPlatform(page.platform),
            teamName: chipLabel(page),
            subtitle: subtitle(page),
            isActive: page.isActive,
            isFavorite: viewModel.isFavorite(page),
            isCommitting: viewModel.committingPageID == page.id
        )
    }
}
