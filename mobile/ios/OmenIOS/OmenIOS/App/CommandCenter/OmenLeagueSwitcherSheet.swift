import SwiftUI

/// Visual briefs §10.2 — the native selection sheet the context strip opens.
///
/// `OmenContextStrip`'s own doc comment says "the switcher gesture is opaque … the
/// calling screen owns the switcher sheet". This is that sheet. Before it existed the
/// strip's `onSwitch` was never passed in the real app, so the "Switch" control did not
/// render at all and a user with a connected league had no way to choose it.
///
/// Composed from approved `Omen*` primitives only — `OmenListRow` carries the tap, per
/// the M1-P P4 enforcement that bans raw SwiftUI controls in `App/` sources.
///
/// NOTE: that sentence cannot name the banned symbol literally. `PrimitiveEnforcementTests`
/// is a plain source-text regex with no comment awareness, so writing the forbidden token
/// in prose fails the scan — documenting the rule beside the code it governs breaks it.
/// Recorded rather than worked around silently.
///
/// Contract points this composition honours, each one load-bearing:
///   - group by platform, platform order stable across visits (the server already sorts);
///   - team and league both shown on every row;
///   - the selected row carries a **visible checkmark glyph**, never colour alone;
///   - long names truncate but stay fully available to accessibility;
///   - Connect another league / Manage connected leagues stay secondary, at the bottom.
struct OmenLeagueSwitcherSheet: View {
    @ObservedObject var viewModel: LeagueSwitcherViewModel
    let onSelected: ([String]) -> Void
    let onConnectAnother: () -> Void
    let onManageConnections: () -> Void
    let onDismiss: () -> Void

    var body: some View {
        // OmenModalSheet is the design system's own sheet chrome, and it is what the Android
        // mirror uses. An earlier revision used a NavigationStack toolbar item instead; the
        // captured screenshot showed iOS 26 squeezing the Done control into a circular glass
        // button that clipped its label to a vertical "D o n e". Only a rendered capture
        // caught that — every test passed.
        ScrollView {
            OmenModalSheet(title: "Switch Team & League") {
                VStack(alignment: .leading, spacing: OmenSpacing.step24) {
                    content
                    secondaryActions
                }
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(OmenColor.bg)
        .task { await viewModel.load() }
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
        case .failed(let error):
            // §10.3: never a dead selector, and never a fixture standing in for real
            // data — showing demo leagues to a real user is the mock/live mixing
            // facts-of-record #7 rules out.
            VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                OmenStateSurface(
                    kind: .error,
                    title: "Omen could not read your leagues",
                    message: switcherErrorMessage(error)
                )
                OmenButton(
                    title: "Try again",
                    action: { Task { await viewModel.load() } },
                    variant: .secondary,
                    size: .md
                )
            }
        case .loaded(let directory):
            loadedList(directory)
        }
    }

    @ViewBuilder
    private func loadedList(_ directory: LeagueDirectory) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step24) {
            if let error = viewModel.selectionError {
                // The selected row does not move on a failed switch — §10.3 forbids a
                // stale context looking current.
                OmenStateSurface(
                    kind: .error,
                    title: "That switch did not take",
                    message: switcherErrorMessage(error)
                )
            }

            // F-DEV-02. The founder, on a real device: "I hit switch… and then I hit ESPN,
            // and it still stays on my sleeper." The switch was not ignored — the server
            // bound the league inside ESPN exactly as asked. What it cannot yet do is record
            // WHICH PROVIDER he chose: `platform_connections` has no such column until
            // `sql/2026-08-26_league_selection_review.sql` is applied, so every surface falls
            // back to its deterministic tie-break, which puts Sleeper first.
            //
            // The server says so plainly in `selection_persistence`, and this sheet decoded
            // that field and then ignored it — closing on a switch it had been told would not
            // hold across providers. Saying nothing was the defect; the switch itself works.
            //
            // Shown only when it can actually bite: one connected provider has nothing to
            // cross. When the column is applied the server reports `explicit` and this
            // disappears on its own, with no client release.
            if directory.crossProviderChoiceCannotPersist {
                OmenStateSurface(
                    kind: .stale,
                    title: "Omen will keep using \(activeProviderName(directory))",
                    message: "You can pick any league here and Omen will use it within that "
                        + "platform. Choosing a league on a different platform won't stick yet — "
                        + "Omen can't remember which platform you picked."
                )
            }

            if directory.platforms.allSatisfy({ $0.leagues.isEmpty }) {
                emptyState
            } else {
                ForEach(directory.platforms) { group in
                    platformSection(group)
                }
            }
        }
    }

    /// The provider Omen is actually resolving to, in the user's words rather than a key.
    private func activeProviderName(_ directory: LeagueDirectory) -> String {
        guard let platform = directory.active?.platform else { return "your current platform" }
        return platformDisplayName(platform)
    }

    @ViewBuilder
    private func platformSection(_ group: LeagueDirectory.PlatformGroup) -> some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step8) {
            Text(platformDisplayName(group.platform).uppercased())
                .omenTextStyle(OmenTypography.label)
                .foregroundStyle(OmenColor.textSecondary)
                .accessibilityAddTraits(.isHeader)

            if group.leagues.isEmpty {
                // A provider with nothing to show says why, in the server's own words
                // where it supplied them.
                Text(group.notice ?? emptyGroupMessage(group))
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                ForEach(group.leagues) { league in
                    leagueRow(group: group, league: league)
                }
                if let notice = group.notice {
                    Text(notice)
                        .omenTextStyle(OmenTypography.bodySmall)
                        .foregroundStyle(OmenColor.textSecondary)
                }
            }
        }
    }

    private func leagueRow(
        group: LeagueDirectory.PlatformGroup,
        league: LeagueDirectory.League
    ) -> some View {
        OmenListRow(
            title: league.teamName ?? "Your team",
            subtitle: leagueSubtitle(group: group, league: league),
            enabled: viewModel.selectingLeagueID == nil,
            action: {
                Task {
                    if let refresh = await viewModel.select(
                        platform: group.platform,
                        leagueID: league.leagueID,
                        teamID: league.teamID
                    ) {
                        onSelected(refresh)
                    }
                }
            },
            leading: { EmptyView() },
            trailing: {
                if viewModel.selectingLeagueID == league.leagueID {
                    ProgressView().controlSize(.small).tint(OmenColor.accent)
                } else if league.isActive {
                    // A glyph, not a colour. §10.2 forbids a colour-only selection cue.
                    Image(systemName: "checkmark")
                        .foregroundStyle(OmenColor.accent)
                        .accessibilityHidden(true)
                } else {
                    EmptyView()
                }
            }
        )
        // The full names live here even when the visible labels truncate.
        .accessibilityLabel(switcherRowAccessibilityLabel(group: group, league: league))
    }

    private var emptyState: some View {
        // §10.3: the empty state explains the value of connecting and offers a route. It
        // never becomes a dead dashboard and never forces sign-in inside the selector.
        OmenStateSurface(
            kind: .empty,
            title: "No leagues connected yet",
            message: "Connect a league and Omen can read your real roster, then tell you the one move that matters this week."
        )
    }

    private var secondaryActions: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            OmenButton(title: "Connect another league", action: onConnectAnother, variant: .link, size: .sm)
            OmenButton(title: "Manage connected leagues", action: onManageConnections, variant: .link, size: .sm)
            // Explicit dismiss as well as the sheet's native swipe: a drag gesture is not an
            // accessible affordance on its own.
            OmenButton(title: "Done", action: onDismiss, variant: .secondary, size: .md)
        }
    }

    private func leagueSubtitle(
        group: LeagueDirectory.PlatformGroup,
        league: LeagueDirectory.League
    ) -> String {
        // ESPN returns no league name, because it exposes no league list to Omen. Naming
        // the league by id beats printing an empty separator or inventing a name.
        let name = league.leagueName ?? "League \(league.leagueID)"
        return "\(name) · \(platformDisplayName(group.platform))"
    }

    private func emptyGroupMessage(_ group: LeagueDirectory.PlatformGroup) -> String {
        switch group.connectionState {
        case "reconnect_required":
            return "\(platformDisplayName(group.platform)) needs to be reconnected before Omen can list its leagues."
        case "not_connected":
            return "\(platformDisplayName(group.platform)) is not connected."
        default:
            return "No \(platformDisplayName(group.platform)) leagues are available right now."
        }
    }
}

func platformDisplayName(_ platform: String) -> String {
    switch platform {
    case "sleeper": return "Sleeper"
    case "espn": return "ESPN"
    case "yahoo": return "Yahoo"
    default: return platform.capitalized
    }
}

/// Full team, league and platform in one label, per §10.2's accessibility requirement,
/// regardless of what the visible rows truncated.
func switcherRowAccessibilityLabel(
    group: LeagueDirectory.PlatformGroup,
    league: LeagueDirectory.League
) -> String {
    let team = league.teamName ?? "Your team"
    let name = league.leagueName ?? "league \(league.leagueID)"
    let selected = league.isActive ? ", selected" : ""
    return "\(team), \(name), \(platformDisplayName(group.platform))\(selected)"
}

/// Never surfaces a provider message or a bare status code — the user gets an action, and
/// no credential or raw provider error can ride along (§10.3).
func switcherErrorMessage(_ error: OmenApiError) -> String {
    switch error {
    case .unauthorized:
        return "Your session expired. Sign in again to see your leagues."
    default:
        return "Omen could not reach your leagues just now. Try again in a moment."
    }
}
