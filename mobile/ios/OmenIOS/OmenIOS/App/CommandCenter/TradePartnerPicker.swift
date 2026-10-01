import SwiftUI

/// T5: `TradePartnerPicker.dc.html` / `TradePartnerPicker-v1.md` — the "add a third team" sheet.
///
/// Not a new picker component. `TradePartnerPicker-v1.md`'s own "Reused pattern" row: *"Same
/// scrim + bottom-sheet + grab-handle + divided-row-list chrome as `SwitchSheet.dc.html`."* This
/// file composes `OmenSwitchSheet` exactly the way `OmenTeamPicker.switcherSheet` already does for
/// the real league switcher, with the three deltas the contract names:
///
///   - **no platform segmented control** — never pass more than one `OmenSwitchFilter`, so
///     `OmenSwitchSheet`'s own `if state.filters.count > 1` guard hides it entirely;
///   - **no star/favourite affordance** — `showsFavoriteAffordance: false`;
///   - **the `.divid` group title repurposed as the sheet's heading** — a single
///     `OmenSwitchGroup` whose `title` is the heading sentence, not a section break.
struct TradePartnerPicker: View {
    /// The league's other teams — already filtered by the caller to exclude the viewer's own
    /// team and the already-selected primary partner, per `TradePartnerPicker-v1.md`'s governing
    /// rule.
    let candidates: [OmenTradePartner]
    var leagueName: String?
    var onSelect: (OmenTradePartner) -> Void
    var onDismiss: (() -> Void)?

    private var heading: String {
        let suffix = leagueName.flatMap { $0.isEmpty ? nil : $0 }
        return suffix.map { "Pick a third team — \($0)" } ?? "Pick a third team"
    }

    var body: some View {
        OmenSwitchSheet(
            state: OmenSwitchSheetState(
                filters: [],
                selectedFilterID: "",
                groups: [OmenSwitchGroup(title: heading, rows: candidates.map(row))]
            ),
            onSelectRow: { row in
                guard let team = candidates.first(where: { $0.id == row.id }) else { return }
                onSelect(team)
            },
            onToggleFavorite: nil,
            showsFavoriteAffordance: false
        )
        .presentationDetents([.height(sheetHeight)])
        .presentationDragIndicator(.visible)
    }

    /// `.row`'s secondary line is the same "need" vocabulary already used on the `.pt` partner
    /// chips ("Needs RB", "No hole") — never the platform/league label `SwitchSheet` shows,
    /// because every candidate here is already known to be in the one league this trade is in.
    private func row(_ team: OmenTradePartner) -> OmenSwitchRow {
        OmenSwitchRow(
            id: team.id,
            crest: team.crest,
            teamName: team.name,
            subtitle: team.need ?? "",
            isFavorite: false,
            // No row is pre-checked on open — `TradePartnerPicker-v1.md`'s acceptance check.
            // This sheet has no notion of an "active" row at all; every candidate is equally
            // un-selected until tapped.
            isActive: false
        )
    }

    /// Three fixed rows plus the heading is the worst case (a beta league's max: viewer + primary
    /// + up to a handful of remaining teams) — sized generously rather than measuring dynamically,
    /// since `OmenSwitchSheet`'s own `.rows` list caps at 300pt and scrolls past that anyway.
    private var sheetHeight: CGFloat {
        min(560, 180 + CGFloat(candidates.count) * 58)
    }
}
