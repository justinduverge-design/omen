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
    /// "ESPN · EB Football", or "unnamed team" when the provider never gave one. Composed by the
    /// caller, which is the only layer that knows whether a name was absent or merely empty.
    let subtitle: String
    let isFavorite: Bool
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
}

// MARK: - SwitchSheet

/// J2, screen two: the switcher sheet.
///
/// `SwitchSheet.dc.html`. **The artboard draws this sheet over the Trade destination** — its
/// backdrop carries "Build a deal", the two-team partner rail and the Trade tab selected. That is
/// incidental: the switcher bar is on 25 of 30 artboards, so the sheet is reachable from
/// anywhere, and the artboard happened to be drawn from Trade.
///
/// For J2 it is presented over Command, because J2 *is* "arriving at Command Center, switching
/// teams" and a contact sheet whose second frame jumps to Trade and whose third returns to
/// Command is not a path anyone takes. The sheet's own composition — grab handle, segmented
/// provider filter, Favourites and All teams dividers, crest/star/name/check rows — is taken from
/// the artboard unchanged, and `SwitchSheet.dc.html` is redrawn onto the Command backdrop in this
/// commit so the change is recorded rather than rediscovered.
struct OmenSwitchSheet: View {
    let state: OmenSwitchSheetState
    var onSelectFilter: ((String) -> Void)?
    var onSelectRow: ((OmenSwitchRow) -> Void)?
    var onToggleFavorite: ((OmenSwitchRow) -> Void)?

    var body: some View {
        VStack(spacing: 0) {
            grabHandle
            if state.filters.count > 1 { filterRow }
            if let notice = state.notice, !notice.isEmpty { noticeRow(notice) }
            rows
        }
        .padding(.top, OmenSpacing.step8)
        .padding(.bottom, OmenSpacing.step16)
        .frame(maxWidth: .infinity)
        .background(
            UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 20, style: .continuous)
                .fill(OmenColor.surface1)
                .overlay(alignment: .top) {
                    // `--lip`, the brass edge highlight that separates the sheet from the scrim.
                    UnevenRoundedRectangle(topLeadingRadius: 20, bottomLeadingRadius: 0, bottomTrailingRadius: 0, topTrailingRadius: 20, style: .continuous)
                        .stroke(OmenColor.accent.opacity(0.34), lineWidth: 1)
                        .mask(alignment: .top) { Rectangle().frame(height: 22) }
                }
        )
        .accessibilityIdentifier("j2.switch-sheet")
    }

    private var grabHandle: some View {
        RoundedRectangle(cornerRadius: 2, style: .continuous)
            .fill(OmenColor.surface3)
            .frame(width: 36, height: 4)
            .padding(.bottom, OmenSpacing.step12)
            .accessibilityHidden(true)
    }

    /// `.seg` — a segmented control, not the chip row the older sheet used.
    ///
    /// Rendered in the order it arrives. `orderPlatformsByFollowCount` is the single authority
    /// for that order and the contract says clients must not re-sort.
    private var filterRow: some View {
        HStack(spacing: 2) {
            ForEach(state.filters) { filter in
                let selected = filter.id == state.selectedFilterID
                Button(action: { onSelectFilter?(filter.id) }) {
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
                .buttonStyle(.plain)
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

    private var rows: some View {
        ScrollView {
            VStack(spacing: 0) {
                ForEach(state.groups) { group in
                    Text(group.title)
                        .omenTextStyle(OmenTypography.micro)
                        .foregroundStyle(OmenColor.textTertiary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, OmenSpacing.step16)
                        .padding(.top, OmenSpacing.step8)
                        .padding(.bottom, OmenSpacing.step4)
                    ForEach(group.rows) { row in
                        OmenSwitchSheetRow(
                            row: row,
                            onSelect: { onSelectRow?(row) },
                            onToggleFavorite: onToggleFavorite == nil ? nil : { onToggleFavorite?(row) }
                        )
                    }
                }
            }
        }
        // `.rows` caps at 300px and scrolls. The founder's note on the older sheet — "the pop up
        // should only grow with the amount of connected leagues" — is why this is a cap rather
        // than a fixed height: three teams get a three-team sheet.
        .frame(maxHeight: 300)
    }
}

/// One `.row`: crest, star, name, check.
///
/// **Two targets, not one.** The star curates favourites and re-sorts; anywhere else switches.
/// A single row button with a star "decoration" would make starring impossible without also
/// changing the active league — the same reasoning the previous sheet recorded, kept here
/// because the artboard's row geometry changed and the rule did not.
private struct OmenSwitchSheetRow: View {
    let row: OmenSwitchRow
    let onSelect: () -> Void
    var onToggleFavorite: (() -> Void)?

    var body: some View {
        HStack(spacing: OmenSpacing.step10) {
            crest
            if let onToggleFavorite {
                Button(action: onToggleFavorite) {
                    star
                        // The artboard's star is a 14pt glyph. Padded to 44pt without moving the
                        // glyph — the canvas README flags this exact control as under the touch
                        // floor and says so deliberately, because growing it in the artboard
                        // would make the artboard wrong.
                        .frame(width: OmenLayout.minTouchTarget, height: OmenLayout.minTouchTarget)
                        .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel(row.isFavorite ? "Unstar \(row.teamName)" : "Star \(row.teamName)")
            } else {
                star.frame(width: 20)
            }
            Button(action: onSelect) {
                HStack(spacing: OmenSpacing.step10) {
                    VStack(alignment: .leading, spacing: OmenSpacing.step2) {
                        Text(row.teamName)
                            .omenTextStyle(OmenTypography.name)
                            .foregroundStyle(OmenColor.textPrimary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                        Text(row.subtitle)
                            .omenTextStyle(OmenTypography.micro)
                            .foregroundStyle(OmenColor.textTertiary)
                            .lineLimit(1)
                            .truncationMode(.tail)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    // `.chk` — present only on the active team. An empty 16pt gutter holds the
                    // column so the names do not shift as the selection moves.
                    Text(row.isActive ? "\u{2713}" : " ")
                        .omenTextStyle(OmenTypography.name)
                        .foregroundStyle(OmenColor.accent)
                        .frame(width: 16)
                }
                .frame(minHeight: OmenLayout.minTouchTarget)
                .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(row.teamName), \(row.subtitle)")
            .accessibilityValue(row.isActive ? "Active team" : "")
            .accessibilityHint(row.isActive ? "" : "Switch to this team")
        }
        .padding(.horizontal, OmenSpacing.step16)
        .padding(.vertical, OmenSpacing.step4)
        .overlay(alignment: .bottom) {
            Rectangle().fill(OmenColor.textPrimary.opacity(0.05)).frame(height: 1)
        }
    }

    private var crest: some View {
        Text(row.crest)
            .omenTextStyle(OmenTypography.micro)
            .foregroundStyle(row.isActive ? OmenColor.accentHover : OmenColor.textSecondary)
            .lineLimit(1)
            .minimumScaleFactor(0.6)
            .frame(width: 31, height: 31)
            .background(
                RoundedRectangle(cornerRadius: 8, style: .continuous)
                    .fill(
                        row.isActive
                            ? LinearGradient(colors: [OmenColor.accentMuted, OmenColor.accentMuted.opacity(0.7)], startPoint: .top, endPoint: .bottom)
                            : LinearGradient(colors: [OmenColor.surface3, OmenColor.surface3], startPoint: .top, endPoint: .bottom)
                    )
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
            .font(.system(size: 14, weight: .regular))
            .foregroundStyle(row.isFavorite ? OmenColor.platinum : OmenColor.border)
            .accessibilityHidden(true)
    }
}

/// The sheet over its backdrop, with the scrim.
///
/// A real `.sheet` presentation does not appear in a `simctl io screenshot` of the host window,
/// which is why the previous switcher host rendered its sheet inline too. This composes the two
/// so a capture shows what a user sees: the desk dimmed, the sheet over it.
struct OmenSwitchSheetOverlay<Backdrop: View>: View {
    let state: OmenSwitchSheetState
    var onSelectFilter: ((String) -> Void)?
    var onSelectRow: ((OmenSwitchRow) -> Void)?
    var onToggleFavorite: ((OmenSwitchRow) -> Void)?
    var onDismiss: (() -> Void)?
    @ViewBuilder let backdrop: Backdrop

    var body: some View {
        ZStack(alignment: .bottom) {
            backdrop
            Rectangle()
                .fill(Color.black.opacity(0.64))
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
        }
        .accessibilityIdentifier("j2.switch-sheet.overlay")
    }
}
