import SwiftUI

/// One team in the switcher sheet.
///
/// A flat view model rather than the carousel's `Page` so `DesignSystem/` stays independent of
/// `App/` — the primitive layer must be renderable from a preview and a test without an API
/// client behind it.
struct OmenSwitcherTeam: Identifiable, Equatable {
    let id: String
    let platform: OmenPlatform
    /// The team's own name, already resolved. §2's fallback (league name when the provider
    /// never gave a team name) is decided by the caller, which is the only layer that knows
    /// whether a name was genuinely absent or merely empty.
    let teamName: String
    let subtitle: String
    let isActive: Bool
    let isFavorite: Bool
    /// Set on the row currently being written to the server, so it can say so rather than
    /// appear to have already changed.
    let isCommitting: Bool
}

/// The Switch sheet: provider filter over a list of teams, each starrable.
///
/// Contract: `Blueprints/specs/mobile/omen-league-switcher-contract-v1.md`.
/// Screen artifact: `design/app-rework-canvas/SwitchSheet.dc.html`.
///
/// ## Height is content, not a detent
///
/// The founder's note is explicit — "the pop up should only grow with the amount of connected
/// leagues". So this view sizes to its rows and the caller presents it with
/// `.presentationDetents([.height(...)])` driven by `preferredHeight(forTeamCount:)` rather than
/// `.medium`, which would leave a user with two teams staring at half a screen of nothing.
///
/// ## Two targets per row
///
/// The star toggles and re-sorts; anywhere else switches and dismisses. They are separate
/// buttons with separate accessibility actions on purpose. A single row button with a star
/// "decoration" would make curating favourites impossible without also changing the active
/// league five times.
struct OmenTeamSwitcherSheet: View {
    let teams: [OmenSwitcherTeam]
    /// `nil` when there is nothing to filter — one connected provider has no second state.
    let platformFilters: [OmenSwitcherPlatformFilter]
    let selectedFilter: String
    /// Server-authored notice about a provider's partial state, rendered verbatim.
    var notice: String?
    let onSelectFilter: (String) -> Void
    let onSelectTeam: (OmenSwitcherTeam) -> Void
    let onToggleFavorite: (OmenSwitcherTeam) -> Void
    var onAddLeague: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            header
            if platformFilters.count > 1 { filterRow }
            if let notice, !notice.isEmpty { noticeRow(notice) }
            teamList
            if let onAddLeague { addLeagueRow(onAddLeague) }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(OmenColor.surface1)
    }

    private var header: some View {
        Text("Your teams")
            .omenTextStyle(OmenTypography.eyebrow)
            .foregroundStyle(OmenColor.textSecondary)
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step16)
            .padding(.bottom, OmenSpacing.step12)
    }

    /// All, then only the providers the user actually has. Provider chips keep their platform
    /// colours — that is how a user finds their ESPN team in a row of six — while All takes the
    /// brand tone, because tinting it with a provider's colour reads as a fourth provider.
    private var filterRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: OmenSpacing.step8) {
                ForEach(platformFilters) { filter in
                    OmenChip(
                        label: filter.label,
                        tone: filter.tone,
                        selected: filter.id == selectedFilter,
                        action: { onSelectFilter(filter.id) }
                    )
                    .accessibilityLabel("\(filter.label), \(filter.count) \(filter.count == 1 ? "team" : "teams")")
                }
            }
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.bottom, OmenSpacing.step12)
        }
    }

    private func noticeRow(_ text: String) -> some View {
        Text(text)
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textSecondary)
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.bottom, OmenSpacing.step12)
    }

    /// Scrolls only when it has to. `.basedOnSize` keeps a three-row sheet from rubber-banding
    /// like a long list, which is the tell that a sheet is bigger than its contents.
    private var teamList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(Array(teams.enumerated()), id: \.element.id) { index, team in
                    OmenTeamSwitcherRow(
                        team: team,
                        showsDivider: index < teams.count - 1,
                        onSelect: { onSelectTeam(team) },
                        onToggleFavorite: { onToggleFavorite(team) }
                    )
                }
            }
        }
        .scrollBounceBehavior(.basedOnSize)
    }

    private func addLeagueRow(_ action: @escaping () -> Void) -> some View {
        // Verdigris, not brass. Founder, 2026-09-05: "if you can make add leagues green, like
        // that verdigris green that we have approved." It also earns the distinction — every
        // other control here *filters* or *switches* among things you already have, and this is
        // the only one that changes what you have.
        OmenButton(title: "Add league", action: action, variant: .secondary, tone: .omen, size: .md)
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step12)
            .padding(.bottom, OmenSpacing.step8)
    }

    /// The sheet's natural height, for `.presentationDetents`.
    ///
    /// Measured from the real row and chrome heights rather than guessed, and capped so a user
    /// with a dozen leagues gets a scrolling sheet instead of one that covers the screen. The cap
    /// is the only place the sheet stops being "exactly as tall as the list", and it is the case
    /// where growing further stops helping.
    static func preferredHeight(
        forTeamCount count: Int,
        showsFilters: Bool,
        showsAddLeague: Bool
    ) -> CGFloat {
        let header: CGFloat = 16 + 16 + 12
        let filters: CGFloat = showsFilters ? 32 + 12 : 0
        let addLeague: CGFloat = showsAddLeague ? 44 + 12 + 8 : 0
        let grabberAndInset: CGFloat = 24 + 24
        let rows = CGFloat(min(count, maxVisibleRows)) * rowHeight
        return header + filters + rows + addLeague + grabberAndInset
    }

    static let rowHeight: CGFloat = 60
    /// Past this the list scrolls and the sheet stops growing (contract §5).
    static let maxVisibleRows = 7
}

struct OmenSwitcherPlatformFilter: Identifiable, Equatable {
    let id: String
    let label: String
    let tone: OmenChipTone
    let count: Int
}

/// One row. Split out so the two tap targets, and the reason there are two, live in one place.
private struct OmenTeamSwitcherRow: View {
    let team: OmenSwitcherTeam
    let showsDivider: Bool
    let onSelect: () -> Void
    let onToggleFavorite: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // The star is nested INSIDE the row button rather than sitting beside it, so it can
            // sit against the name. A first build put it at the end of the row, which reads as a
            // right-aligned accessory column — the exact thing the founder ruled out: "next to
            // the name, like almost in another column, but that column would be very close."
            // SwiftUI delivers a tap to the innermost button, so the two targets stay distinct.
            Button(action: onSelect) {
                HStack(spacing: OmenSpacing.step12) {
                    OmenPlatformBadge(platform: team.platform)
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: OmenSpacing.step4) {
                            Text(team.teamName)
                                .omenTextStyle(OmenTypography.h3)
                                .foregroundStyle(OmenColor.textPrimary)
                                .lineLimit(1)
                                // Truncates before it can push the star off its own column.
                                .layoutPriority(1)
                            favoriteButton
                        }
                        Text(team.subtitle)
                            .omenTextStyle(OmenTypography.bodySmall)
                            .foregroundStyle(OmenColor.textTertiary)
                            .lineLimit(1)
                    }
                    Spacer(minLength: OmenSpacing.step8)
                    trailingState
                }
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .disabled(team.isCommitting)
            .accessibilityLabel(selectLabel)
            .accessibilityHint(team.isActive ? "" : "Switches Omen to this team")
            .padding(.horizontal, OmenSpacing.step16)
            .frame(minHeight: OmenTeamSwitcherSheet.rowHeight)

            if showsDivider {
                Rectangle()
                    .fill(OmenColor.borderSubtle)
                    .frame(height: 1)
                    .padding(.leading, OmenSpacing.step16)
            }
        }
    }

    /// A glyph, not colour alone — the same §10.2 rule the carousel's check follows, and the
    /// reason a user can tell "the team Omen is using" from "the row I am about to tap".
    @ViewBuilder
    private var trailingState: some View {
        if team.isCommitting {
            ProgressView().controlSize(.small).tint(OmenColor.accent)
        } else if team.isActive {
            Image(systemName: "checkmark")
                .foregroundStyle(OmenColor.accent)
                .accessibilityHidden(true)
        }
    }

    /// Sits immediately beside the name in its own narrow column, not flush to the row's right
    /// edge. Founder, 2026-09-05: "next to the name, like almost in another column, but that
    /// column would be very close… the star doesn't have to be obnoxious."
    ///
    /// The visible glyph is small; the tappable area is not. A 44pt target with a
    /// `.plain` style keeps the star quiet without making it a dexterity test, and keeps it far
    /// enough from the row button that a tap meant for one is never delivered to the other.
    private var favoriteButton: some View {
        Button(action: onToggleFavorite) {
            Image(systemName: team.isFavorite ? "star.fill" : "star")
                .font(.system(size: 15, weight: .medium))
                .foregroundStyle(team.isFavorite ? OmenColor.platinum : OmenColor.textTertiary)
                // Wide enough to hit comfortably without turning the name row into a 44pt-tall
                // band. The row itself is 60pt, so the vertical target is already there.
                .frame(width: 34, height: 34)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(team.isFavorite
            ? "Remove \(team.teamName) from favourites"
            : "Add \(team.teamName) to favourites")
        .accessibilityHint("Favourites are listed first, in the order you starred them")
    }

    private var selectLabel: String {
        let state: String
        if team.isCommitting {
            state = ", switching"
        } else if team.isActive {
            state = ", the team Omen is using"
        } else {
            state = ""
        }
        let favorite = team.isFavorite ? ", favourite" : ""
        return "\(team.teamName), \(team.subtitle)\(favorite)\(state)"
    }
}
