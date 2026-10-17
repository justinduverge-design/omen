import SwiftUI

/// `SwitchSheet.dc.html` — the team/league switcher sheet, rebuilt to the 2026-09-13 canvas.
///
/// ## Why this is in `DesignSystem/` and not beside the desk screens
///
/// Two reasons, and the second is the one that decided it.
///
/// First, its sibling is already here: `OmenTeamSwitcherSheet` is the same surface built to the
/// **earlier** `design/app-rework-canvas/` artboard, and a component and its replacement living
/// in different layers is how a codebase ends up with two of everything.
///
/// Second, `PrimitiveEnforcementTests` bans raw `Button(` under `App/` and says why:
/// *"the `DesignSystem/` module is out of scope because it **is** the primitive layer."* This
/// sheet is four real buttons — a segment, a row, a star, a scrim — and writing it in `App/`
/// would mean either an allowlist entry or replacing those buttons with tap gestures that
/// announce nothing to VoiceOver. Neither is better than putting the component where the rule
/// already says components go.
///
/// ## What changed from `OmenTeamSwitcherSheet`, and what did not
///
/// Changed, because the artboard changed: a **segmented** provider control rather than a chip
/// row, `Favourites` / `All teams` as labelled dividers rather than one flat list, and a crest
/// on every row.
///
/// Unchanged, deliberately: two targets per row, dismiss-on-switch, stay-open-on-star, and the
/// server's order. Those are behaviour the contract fixed, not composition the canvas owns.

/// One row in the switch sheet.
struct OmenSwitchRow: Identifiable, Equatable {
    let id: String
    let crest: String
    let teamName: String
    /// "ESPN · EB Football", or "ESPN team \u{00B7} name not shared" when the provider never gave one. Composed by the
    /// caller, which is the only layer that knows whether a name was absent or merely empty.
    let subtitle: String
    let isFavorite: Bool
    /// True on **at most one row in the whole sheet**: the league Omen is using right now. This is
    /// not the directory's per-provider `is_active` flag (true for one league per provider at the
    /// same time); callers pass `LeagueCarouselViewModel.isCurrent(page)`.
    let isActive: Bool
}

/// A `.divid` heading and its rows. Favourites first, then everything else.
struct OmenSwitchGroup: Identifiable, Equatable {
    var id: String { title }
    let title: String
    let rows: [OmenSwitchRow]
}

/// One `.seg` segment.
struct OmenSwitchFilter: Identifiable, Equatable {
    let id: String
    let label: String
}

/// The switch sheet's payload.
///
/// **Order is the server's.** `omen-league-switcher-contract-v1.md` names
/// `orderPlatformsByFollowCount` as the single authority and says clients must not re-sort, so
/// `filters`, `groups` and every `rows` array are rendered in the order they arrive. There is no
/// sort call anywhere in this file.
struct OmenSwitchSheetState: Equatable {
    let filters: [OmenSwitchFilter]
    let selectedFilterID: String
    let groups: [OmenSwitchGroup]
    /// A server-authored sentence about a provider whose leagues could not be listed, rendered
    /// verbatim.
    ///
    /// The artboard has no slot for this, because `SwitchSheet.dc.html` draws only the resolved
    /// case and no degraded switcher artboard was ever drawn. It exists anyway, because dropping
    /// a provider the directory failed to return would leave the sheet quietly shorter and the
    /// user certain they had fewer leagues than they do — and
    /// `capability-expression-v1.md` acceptance rule 4 requires every unavailable input to be
    /// **named**, not omitted.
    ///
    /// Nil on the nominal pass, so the redrawn artboard stays the resolved case it always was.
    var notice: String? = nil
    /// A plain sentence under the list saying what the check and the star mean. Nil hides it.
    var caption: String? = nil
}

// MARK: - SwitchSheet

/// J2, screen two: the switcher sheet.
///
/// `SwitchSheet.dc.html`. **The artboard draws this sheet over the Trade destination** — its
/// backdrop carries "Build a deal", the two-team partner rail and the Trade tab selected. That is
/// incidental: the switcher bar is on 25 of 30 artboards, so the sheet is reachable from
/// anywhere, and the artboard happened to be drawn from Trade.
///
/// ## Chrome is the system's, not ours
///
/// Founder, device walk 1 (2026-10-01): *"use the whole system sheet instead of our own chrome."*
/// This view is therefore **content only**. It draws no grab handle, no rounded top edge, no
/// brass lip and no background; the host presents it with `.presentationDetents`,
/// `.presentationDragIndicator(.visible)` and `.presentationBackground`, and iOS supplies the
/// corners, the indicator, the dimming and the dismiss gesture. The earlier version painted its
/// own two-tone top edge and a custom bar and read as a second sheet sitting inside the first.
///
/// ## One check
///
/// The check mark means exactly one thing: *this is the league Omen is using right now.* The
/// caller decides that (`LeagueCarouselViewModel.isCurrent`) and passes it as `isActive` on at
/// most one row. The directory's per-provider "active" flag must never reach this view, because
/// that flag is true for one league per provider at once and put several ticks on screen.
struct OmenSwitchSheet: View {
    let state: OmenSwitchSheetState
    var onSelectFilter: ((String) -> Void)?
    var onSelectRow: ((OmenSwitchRow) -> Void)?
    var onToggleFavorite: ((OmenSwitchRow) -> Void)?
    /// T5, `TradePartnerPicker`: *"Dropped: the star/favourite affordance. Favouriting a
    /// one-time trade partner has no product meaning here."* `onToggleFavorite == nil` already
    /// disables the star's tap target, but the row still reserved its glyph —
    /// this additionally removes the glyph itself. Defaults to `true` so every existing caller
    /// (the real team switcher) renders exactly as it did before T5.
    var showsFavoriteAffordance: Bool = true

    @Environment(\.omenHaptics) private var haptics

    var body: some View {
        VStack(spacing: 0) {
            if state.filters.count > 1 { filterRow }
            if let notice = state.notice, !notice.isEmpty { noticeRow(notice) }
            rows
            if let caption = state.caption, !caption.isEmpty { captionRow(caption) }
        }
        // Clears the system drag indicator, which sits in the sheet's own top margin.
        .padding(.top, OmenSpacing.step24)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .accessibilityIdentifier("j2.switch-sheet")
    }

    // MARK: Height

    /// Row: a 44pt target plus the row's own 6pt of air above and below.
    static let rowHeight: CGFloat = 56
    static let groupHeaderHeight: CGFloat = 26
    static let maximumHeight: CGFloat = 600

    /// The detent height for a given payload. **Grows with the number of teams** — three teams
    /// get a three-team sheet (founder: "the pop up should only grow with the amount of
    /// connected leagues") — and stops at `maximumHeight`, past which the list scrolls.
    static func preferredHeight(
        rowCount: Int,
        groupCount: Int,
        hasFilters: Bool,
        hasNotice: Bool,
        hasCaption: Bool
    ) -> CGFloat {
        let top: CGFloat = 24          // clears the system drag indicator
        let bottom: CGFloat = 34       // home-indicator inset
        let filters: CGFloat = hasFilters ? 56 : 0
        let notice: CGFloat = hasNotice ? 72 : 0
        let caption: CGFloat = hasCaption ? 60 : 0
        let list = CGFloat(rowCount) * rowHeight + CGFloat(groupCount) * groupHeaderHeight
        return min(maximumHeight, top + filters + notice + list + caption + bottom)
    }

    /// True when `preferredHeight` hit the cap, so the host can offer `.large` as a second detent.
    static func isCapped(
        rowCount: Int, groupCount: Int, hasFilters: Bool, hasNotice: Bool, hasCaption: Bool
    ) -> Bool {
        let uncapped = preferredHeight(
            rowCount: rowCount, groupCount: groupCount,
            hasFilters: hasFilters, hasNotice: hasNotice, hasCaption: hasCaption
        )
        return uncapped >= maximumHeight
    }

    // MARK: Pieces

    /// `.seg` — a segmented control, not the chip row the older sheet used.
    ///
    /// Rendered in the order it arrives. `orderPlatformsByFollowCount` is the single authority
    /// for that order and the contract says clients must not re-sort.
    private var filterRow: some View {
        HStack(spacing: 2) {
            ForEach(state.filters) { filter in
                let selected = filter.id == state.selectedFilterID
                Button(action: {
                    guard !selected else { return }
                    haptics.play(.selection)
                    onSelectFilter?(filter.id)
                }) {
                    Text(filter.label)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(selected ? OmenColor.textPrimary : OmenColor.textTertiary)
                        .frame(maxWidth: .infinity)
                        .frame(height: OmenLayout.minTouchTarget)
                        .background(
                            RoundedRectangle(cornerRadius: 6, style: .continuous)
                                .fill(selected ? OmenColor.surface3 : Color.clear)
                        )
                        .contentShape(Rectangle())
                }
                .buttonStyle(OmenPressableButtonStyle())
                .accessibilityLabel(filter.label)
                .accessibilityAddTraits(selected ? [.isButton, .isSelected] : .isButton)
            }
        }
        .padding(2)
        .background(RoundedRectangle(cornerRadius: 9, style: .continuous).fill(OmenColor.bg))
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.bottom, OmenSpacing.step10)
    }

    /// The *could not read* class inside the sheet. Dashed, `text-tertiary`, no evidence
    /// styling — the `.hatch` carrier from registry §2.3, and words doing the actual work.
    private func noticeRow(_ notice: String) -> some View {
        Text(notice)
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textTertiary)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(OmenSpacing.step10)
            .overlay(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .strokeBorder(style: StrokeStyle(lineWidth: 1, dash: [4, 4]))
                    .foregroundStyle(OmenColor.border)
            )
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.bottom, OmenSpacing.step10)
    }

    /// One plain sentence that says what the check and the star mean, so neither is a puzzle.
    private func captionRow(_ caption: String) -> some View {
        Text(caption)
            .omenTextStyle(OmenTypography.bodySmall)
            .foregroundStyle(OmenColor.textTertiary)
            .fixedSize(horizontal: false, vertical: true)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.horizontal, OmenSpacing.step16)
            .padding(.top, OmenSpacing.step10)
            .padding(.bottom, OmenSpacing.step8)
    }

    private var rows: some View {
        // No fixed cap here: the host's detent height is the cap, and this list takes whatever
        // that leaves and scrolls inside it.
        ScrollView {
            VStack(spacing: 0) {
                ForEach(state.groups) { group in
                    Text(group.title)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.textTertiary)
                        .frame(maxWidth: .infinity, minHeight: Self.groupHeaderHeight, alignment: .bottomLeading)
                        .padding(.horizontal, OmenSpacing.step16)
                        .padding(.bottom, OmenSpacing.step4)
                        .accessibilityAddTraits(.isHeader)
                    ForEach(group.rows) { row in
                        OmenSwitchSheetRow(
                            row: row,
                            onSelect: {
                                guard !row.isActive else { return }
                                haptics.play(.mediumImpact)
                                onSelectRow?(row)
                            },
                            onToggleFavorite: onToggleFavorite == nil ? nil : {
                                haptics.play(.selection)
                                onToggleFavorite?(row)
                            },
                            showsFavoriteAffordance: showsFavoriteAffordance
                        )
                    }
                }
            }
        }
    }
}

/// One row: crest, team name over "league · provider", one trailing check, star.
///
/// **Two targets, not one.** The star curates favourites and re-sorts; anywhere else switches.
/// A single row button with a star "decoration" would make starring impossible without also
/// changing the current league. The star is its own 44pt button at the trailing edge, and the
/// check is a plain glyph between the text and the star — never a control.
private struct OmenSwitchSheetRow: View {
    let row: OmenSwitchRow
    let onSelect: () -> Void
    var onToggleFavorite: (() -> Void)?
    var showsFavoriteAffordance: Bool = true

    var body: some View {
        HStack(spacing: 0) {
            Button(action: onSelect) {
                HStack(spacing: OmenSpacing.step12) {
                    crest
                    VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                        Text(row.teamName)
                            .omenTextStyle(OmenTypography.name)
                            .foregroundStyle(OmenColor.textPrimary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                        if !row.subtitle.isEmpty {
                            Text(row.subtitle)
                                .omenTextStyle(OmenTypography.bodySmall)
                                .foregroundStyle(OmenColor.textTertiary)
                                .lineLimit(1)
                                .truncationMode(.tail)
                        }
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    // The one check. A fixed gutter holds the column so names do not shift as
                    // the selection moves.
                    Image(systemName: "checkmark")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(OmenColor.accent)
                        .opacity(row.isActive ? 1 : 0)
                        .frame(width: 24)
                        .accessibilityHidden(true)
                }
                .frame(minHeight: OmenSwitchSheet.rowHeight)
                .contentShape(Rectangle())
            }
            .buttonStyle(OmenPressableButtonStyle())
            .accessibilityLabel(row.subtitle.isEmpty ? row.teamName : "\(row.teamName), \(row.subtitle)")
            .accessibilityValue(row.isActive ? "Current league" : "")
            .accessibilityHint(row.isActive ? "" : "Switch to this team")
            .accessibilityAddTraits(row.isActive ? .isSelected : [])

            if showsFavoriteAffordance {
                if let onToggleFavorite {
                    Button(action: onToggleFavorite) {
                        star
                            .frame(width: OmenLayout.minTouchTarget, height: OmenLayout.minTouchTarget)
                            .contentShape(Rectangle())
                    }
                    .buttonStyle(OmenPressableButtonStyle())
                    .accessibilityLabel(row.isFavorite ? "Unstar \(row.teamName)" : "Star \(row.teamName)")
                } else {
                    star.frame(width: OmenLayout.minTouchTarget)
                }
            }
        }
        .padding(.leading, OmenSpacing.step16)
        .padding(.trailing, OmenSpacing.step8)
    }

    private var crest: some View {
        Text(row.crest)
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(row.isActive ? OmenColor.accentHover : OmenColor.textSecondary)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(width: 36, height: 36)
            .background(
                RoundedRectangle(cornerRadius: 9, style: .continuous)
                    .fill(row.isActive ? OmenColor.accentMuted : OmenColor.surface3)
            )
            .accessibilityHidden(true)
    }

    /// Filled `platinum` when starred, outlined `border` when not.
    ///
    /// The outline colour is `border` rather than the artboard's original `#4A4A4E`, which
    /// measured **1.63:1** on `surface-1` and was invisible. Registry Amendment 01 fixed it to
    /// 3.78:1 and the artboards were re-cut; this is that value, not a local choice.
    private var star: some View {
        Image(systemName: row.isFavorite ? "star.fill" : "star")
            .font(.system(size: 16, weight: .regular))
            .foregroundStyle(row.isFavorite ? OmenColor.platinum : OmenColor.border)
            .accessibilityHidden(true)
    }
}

/// The sheet over its backdrop, for screenshot fixtures only.
///
/// A real `.sheet` does not appear in a `simctl io screenshot` of the host window, so the J2
/// contact sheets compose the sheet inline. Because `OmenSwitchSheet` is now content-only, this
/// stands in for the system chrome (dimmed desk, rounded top, drag indicator) — the app itself
/// never uses this type.
struct OmenSwitchSheetOverlay<Backdrop: View>: View {
    let state: OmenSwitchSheetState
    var onSelectFilter: ((String) -> Void)?
    var onSelectRow: ((OmenSwitchRow) -> Void)?
    var onToggleFavorite: ((OmenSwitchRow) -> Void)?
    var onDismiss: (() -> Void)?
    @ViewBuilder let backdrop: Backdrop

    private var height: CGFloat {
        OmenSwitchSheet.preferredHeight(
            rowCount: state.groups.reduce(0) { $0 + $1.rows.count },
            groupCount: state.groups.count,
            hasFilters: state.filters.count > 1,
            hasNotice: !(state.notice ?? "").isEmpty,
            hasCaption: !(state.caption ?? "").isEmpty
        )
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            backdrop
            Rectangle()
                .fill(Color.black.opacity(0.4))
                .ignoresSafeArea()
                .onTapGesture { onDismiss?() }
                .accessibilityLabel("Dismiss team switcher")
                .accessibilityAddTraits(.isButton)
            OmenSwitchSheet(
                state: state,
                onSelectFilter: onSelectFilter,
                onSelectRow: onSelectRow,
                onToggleFavorite: onToggleFavorite
            )
            .frame(height: height)
            .background(
                UnevenRoundedRectangle(topLeadingRadius: 28, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 28, style: .continuous)
                    .fill(OmenColor.surface1)
                    .ignoresSafeArea(edges: .bottom)
            )
            .overlay(alignment: .top) {
                Capsule().fill(OmenColor.textTertiary.opacity(0.5)).frame(width: 36, height: 5).padding(.top, 5)
            }
        }
        .accessibilityIdentifier("j2.switch-sheet.overlay")
    }
}
