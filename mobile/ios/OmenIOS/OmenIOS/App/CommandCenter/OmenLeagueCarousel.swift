import SwiftUI

/// The Command Center league carousel — provider filter chips over a swipeable stack of
/// matchup cards, one card per league the user follows.
///
/// **This is the switcher and the Matchup Hero, merged.** They were two controls answering
/// halves of one question: the strip said which league you were on, the hero showed that
/// league's week, and changing leagues meant opening a modal list that showed neither.
/// Here the swipe IS the switch, and every page you pass shows you its own week on the way.
///
/// Composition rules this honours, each load-bearing:
///   - built from approved `Omen*` primitives only (`OmenChip`, `OmenMatchupHero`,
///     `OmenCard`, `OmenStateSurface`), per the M1-P P4 enforcement that bans raw SwiftUI
///     controls in `App/` sources;
///   - the page indicator is a **glyph-and-count line, not colour alone** — the same rule
///     §10.2 applies to the switcher's selected row;
///   - every page carries the league AND team name, because "which team am I looking at"
///     is the question the strip existed to answer and must not be lost in the merge;
///   - a page that cannot load says so on its own card. One dead provider must not blank
///     the widget for the leagues that work.
struct OmenLeagueCarousel: View {
    @ObservedObject var viewModel: LeagueCarouselViewModel
    /// Passed so "demo" reads differently from "signed out", which are identical from the
    /// token alone and must never read the same to a user.
    var userID: String?
    /// Demo has one mock league and no directory, so the caller supplies the labelled
    /// fixture hero rather than this view inventing one.
    var demoMatchup: OmenMatchupHeroState?
    let onOpenMatchup: (() -> Void)?
    let onConnect: (() -> Void)?
    /// Add League. Rendered as a trailing `+` chip in the same row as the provider filters
    /// rather than a line of its own above them: it belongs to the same family of controls,
    /// and a full row above the fold is expensive on a screen whose job is to get the user to
    /// their matchup.
    var onAddLeague: (() -> Void)?
    /// The surfaces §10.3 says to re-read once a swipe has changed the active league.
    let onContextChanged: ([String]) -> Void

    /// Layout follows the founder's 2026-09-04 sketch, top to bottom: the league chips sit
    /// **above** the Matchup heading, not inside a "Your Leagues" section of their own. They
    /// are the screen's provider row — the thing the old vertical platform strip used to be —
    /// so they belong directly under the page header, and the matchup is what they act on.
    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            chipRow
            matchupHeader
            content
        }
        .task { await viewModel.load(userID: userID) }
    }

    private var matchupHeader: some View {
        HStack {
            Text("Matchup")
                .omenTextStyle(OmenTypography.label)
                .foregroundStyle(OmenColor.textSecondary)
            Spacer(minLength: OmenSpacing.step8)
            pageIndicator
        }
    }

    /// "2 of 5" rather than a row of dots. Dots stop being countable past about four, and
    /// a user with five leagues is exactly who this widget is for.
    @ViewBuilder
    private var pageIndicator: some View {
        if viewModel.pages.count > 1 {
            Text("\(viewModel.selectedIndex + 1) of \(viewModel.pages.count)")
                .omenTextStyle(OmenTypography.bodySmall)
                .foregroundStyle(OmenColor.textSecondary)
                .monospacedDigit()
                .accessibilityHidden(true)
        }
    }

    @ViewBuilder
    private var content: some View {
        switch viewModel.viewState {
        case .loading:
            OmenStateSurface(
                kind: .loading,
                title: "Reading your leagues",
                message: "Omen is asking each connected platform which leagues you are in."
            )
        case .demo:
            demoPage
        case .empty:
            emptyState
        case .failed(let error):
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                OmenStateSurface(
                    kind: .error,
                    title: "Omen could not read your leagues",
                    message: switcherErrorMessage(error)
                )
                OmenButton(
                    title: "Try again",
                    action: { Task { await viewModel.load(userID: userID) } },
                    variant: .secondary,
                    size: .md
                )
            }
        case .loaded:
            pager
        }
    }

    /// Demo has exactly one mock league, so it gets one labelled card and no chips — a
    /// filter row over a single page would be a control with nothing to do.
    @ViewBuilder
    private var demoPage: some View {
        if let demoMatchup {
            VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                Text("DEMO LEAGUE")
                    .omenTextStyle(OmenTypography.eyebrow)
                    .foregroundStyle(OmenColor.textSecondary)
                OmenMatchupHero(state: demoMatchup, onOpen: onOpenMatchup)
            }
        } else {
            OmenStateSurface(
                kind: .mock,
                title: "Demo league",
                message: "Demo mode runs one mock league, so there is nothing to swipe through."
            )
        }
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            OmenStateSurface(
                kind: .empty,
                title: "No leagues connected yet",
                message: "Connect a league and Omen can read your real roster, then tell you the one move that matters this week."
            )
            if let onConnect {
                OmenButton(title: "Connect a league", action: onConnect, variant: .primary, size: .md)
            }
        }
    }

    /// All · then each provider that actually has a followed league, in the server's
    /// order — most leagues first, ties alphabetical.
    /// One horizontal row naming **only the providers the user actually has**, plus Add
    /// League. Founder, 2026-09-04: "if they don't have that, then it doesn't pop up."
    ///
    /// This replaced a vertical strip that listed all three providers unconditionally, so a
    /// user with one connection spent two rows of the fold reading the word "Disconnected"
    /// about products they do not use.
    @ViewBuilder
    private var chipRow: some View {
        // The filter chips need two or more providers to mean anything, but Add League is
        // useful to a user with one — so the row renders whenever either half has something
        // to say, and each half decides for itself. Never in a state with neither.
        if viewModel.hasLoadedLeagues, viewModel.chips.count > 2 || onAddLeague != nil {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: OmenSpacing.step8) {
                    if viewModel.chips.count > 2 {
                        ForEach(viewModel.chips, id: \.self) { chip in
                            OmenChip(
                                label: chipLabel(chip),
                                tone: chipTone(chip),
                                selected: viewModel.selectedPlatform == chip,
                                action: {
                                    viewModel.selectedPlatform = chip
                                    Task { await viewModel.loadCurrentPage() }
                                }
                            )
                            .accessibilityLabel(chipAccessibilityLabel(chip))
                        }
                    }
                    if let onAddLeague {
                        // "+ League" rather than a bare "+": a lone glyph beside three named
                        // filters reads as a fourth filter, and the label costs one word.
                        OmenChip(
                            label: "+ League",
                            tone: .neutral,
                            selected: false,
                            action: onAddLeague
                        )
                        .accessibilityLabel("Add a league")
                    }
                }
                .padding(.vertical, OmenSpacing.step4)
            }
        }
    }

    private var pager: some View {
        TabView(selection: $viewModel.selectedIndex) {
            ForEach(Array(viewModel.pages.enumerated()), id: \.element.id) { index, page in
                pageCard(page).tag(index)
            }
        }
        // `.never` because this widget draws its own "2 of 5" line. The system dots are
        // colour-only, which §10.2's cue rule rules out for a selection indicator.
        .tabViewStyle(.page(indexDisplayMode: .never))
        .frame(minHeight: 260)
        .onChange(of: viewModel.selectedIndex) { _, _ in
            Task {
                await viewModel.loadCurrentPage()
                // The rested-on page becomes the league Omen uses. `commitSelection`
                // no-ops on the already-active page, so an idle swipe back costs nothing.
                if let refresh = await viewModel.commitSelection() {
                    onContextChanged(refresh)
                }
            }
        }
    }

    private func pageCard(_ page: LeagueCarouselViewModel.Page) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            HStack(spacing: OmenSpacing.step8) {
                OmenPlatformBadge(platform: omenPlatform(page.platform))
                VStack(alignment: .leading, spacing: 0) {
                    Text(page.displayTeamName)
                        .omenTextStyle(OmenTypography.h2)
                        .foregroundStyle(OmenColor.textPrimary)
                        .lineLimit(1)
                    Text(page.displayLeagueName)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                        .lineLimit(1)
                }
                Spacer(minLength: OmenSpacing.step8)
                if viewModel.committingPageID == page.id {
                    ProgressView().controlSize(.small).tint(OmenColor.accent)
                } else if page.isActive {
                    // A glyph, not a colour — §10.2's rule, and the reason the user can
                    // tell "the league I'm reading" from "the league Omen is reasoning
                    // about" while a swipe is still settling.
                    Image(systemName: "checkmark")
                        .foregroundStyle(OmenColor.accent)
                        .accessibilityHidden(true)
                }
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel(pageAccessibilityLabel(page))

            switch viewModel.state(for: page) {
            case .loading:
                OmenStateSurface(
                    kind: .loading,
                    title: "Reading this league's week",
                    message: "Omen is asking \(platformDisplayName(page.platform)) for this matchup."
                )
            case .loaded(let hero):
                OmenMatchupHero(state: hero, onOpen: onOpenMatchup)
            case .unavailable(let message):
                // Scoped to this page on purpose. One provider failing must not blank the
                // leagues that answered.
                OmenStateSurface(kind: .error, title: "This league didn't load", message: message)
            }
        }
        .padding(.horizontal, 2)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private func chipLabel(_ chip: String) -> String {
        chip == LeagueCarouselViewModel.allPlatforms ? "All" : platformDisplayName(chip)
    }

    /// Each provider chip carries its own platform colour; All is neutral so it cannot be
    /// mistaken for a fourth provider.
    private func chipTone(_ chip: String) -> OmenChipTone {
        switch chip {
        case "espn": return .espn
        case "yahoo": return .yahoo
        case "sleeper": return .sleeper
        default: return .neutral
        }
    }

    private func chipAccessibilityLabel(_ chip: String) -> String {
        let count = chip == LeagueCarouselViewModel.allPlatforms
            ? viewModel.allPages.count
            : viewModel.allPages.filter { $0.platform == chip }.count
        let noun = count == 1 ? "league" : "leagues"
        return "\(chipLabel(chip)), \(count) \(noun)"
    }

    private func pageAccessibilityLabel(_ page: LeagueCarouselViewModel.Page) -> String {
        // Full names live here even when the visible labels truncate, per §10.2.
        let position = "\(viewModel.selectedIndex + 1) of \(viewModel.pages.count)"
        let active = page.isActive ? ", the league Omen is using" : ""
        return "\(page.displayTeamName), \(page.displayLeagueName), "
            + "\(platformDisplayName(page.platform))\(active). \(position)."
    }

    private func omenPlatform(_ platform: String) -> OmenPlatform {
        switch platform {
        case "espn": return .espn
        case "yahoo": return .yahoo
        default: return .sleeper
        }
    }
}
