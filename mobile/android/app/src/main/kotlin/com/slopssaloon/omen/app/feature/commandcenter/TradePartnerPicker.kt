package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.runtime.Composable

/**
 * T5: `TradePartnerPicker.dc.html` / `TradePartnerPicker-v1.md` — the "add a third team" sheet.
 * Compose mirror of `App/CommandCenter/TradePartnerPicker.swift`.
 *
 * Not a new picker component. `TradePartnerPicker-v1.md`'s own "Reused pattern" row: *"Same
 * scrim + bottom-sheet + grab-handle + divided-row-list chrome as `SwitchSheet.dc.html`."* This
 * file composes [OmenSwitchSheet] inside the same [ModalBottomSheet] shell
 * `CommandCenterDetailSheet` already uses elsewhere in this app, with the three deltas the
 * contract names:
 *
 *   - **no platform segmented control** — never pass more than one `OmenSwitchFilter`, so
 *     [OmenSwitchSheet]'s own `if (state.filters.size > 1)` guard hides it entirely;
 *   - **no star/favourite affordance** — `showsFavoriteAffordance = false`;
 *   - **the `.divid` group title repurposed as the sheet's heading** — a single
 *     [OmenSwitchGroup] whose `title` is the heading sentence, not a section break.
 */
@Composable
@OptIn(ExperimentalMaterial3Api::class)
fun TradePartnerPicker(
    /**
     * The league's other teams — already filtered by the caller to exclude the viewer's own team
     * and the already-selected primary partner, per `TradePartnerPicker-v1.md`'s governing rule.
     */
    candidates: List<OmenTradePartner>,
    leagueName: String? = null,
    onSelect: (OmenTradePartner) -> Unit,
    onDismiss: () -> Unit,
) {
    val heading = leagueName?.takeIf { it.isNotEmpty() }?.let { "Pick a third team — $it" } ?: "Pick a third team"

    ModalBottomSheet(onDismissRequest = onDismiss) {
        OmenSwitchSheet(
            state = OmenSwitchSheetState(
                filters = emptyList(),
                selectedFilterId = "",
                groups = listOf(
                    OmenSwitchGroup(
                        title = heading,
                        // `.row`'s secondary line is the same "need" vocabulary already used on
                        // the `.pt` partner chips — never the platform/league label
                        // `SwitchSheet` shows, because every candidate here is already known to
                        // be in the one league this trade is in.
                        rows = candidates.map { team ->
                            OmenSwitchRow(
                                id = team.id,
                                crest = team.crest,
                                teamName = team.name,
                                subtitle = team.need ?: "",
                                isFavorite = false,
                                // No row is pre-checked on open — `TradePartnerPicker-v1.md`'s
                                // acceptance check.
                                isActive = false,
                            )
                        },
                    ),
                ),
            ),
            onSelectRow = { row ->
                candidates.firstOrNull { it.id == row.id }?.let(onSelect)
            },
            onToggleFavorite = null,
            showsFavoriteAffordance = false,
        )
    }
}
