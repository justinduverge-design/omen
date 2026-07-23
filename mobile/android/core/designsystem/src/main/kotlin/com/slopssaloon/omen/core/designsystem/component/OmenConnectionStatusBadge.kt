package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier

/**
 * Union of the connection states named in registry §3.2 for both ConnectionStatusBadge
 * (connected/disconnected/reauth/recovery) and PlatformConnectionCard (adds error/pending).
 * One enum keeps native clients from inventing a second status vocabulary. The text label
 * lives on the badge so meaning survives grayscale (registry §1, §4).
 */
enum class OmenConnectionStatus { Connected, Disconnected, NeedsReauth, Error, Pending, Recovering }

private fun OmenConnectionStatus.badgeTone(): OmenBadgeTone = when (this) {
    OmenConnectionStatus.Connected -> OmenBadgeTone.Success
    OmenConnectionStatus.Disconnected -> OmenBadgeTone.Neutral
    OmenConnectionStatus.NeedsReauth -> OmenBadgeTone.Risk
    OmenConnectionStatus.Error -> OmenBadgeTone.Risk
    OmenConnectionStatus.Pending -> OmenBadgeTone.Stub
    OmenConnectionStatus.Recovering -> OmenBadgeTone.Stub
}

private fun OmenConnectionStatus.label(): String = when (this) {
    OmenConnectionStatus.Connected -> "Connected"
    OmenConnectionStatus.Disconnected -> "Disconnected"
    OmenConnectionStatus.NeedsReauth -> "Reauth needed"
    OmenConnectionStatus.Error -> "Error"
    OmenConnectionStatus.Pending -> "Pending"
    OmenConnectionStatus.Recovering -> "Recovering"
}

/**
 * Registry §3.2 ConnectionStatusBadge. Renders the current connection state as a labeled
 * badge. Callers must not derive their own status text — the enum is the label source.
 */
@Composable
fun OmenConnectionStatusBadge(
    status: OmenConnectionStatus,
    modifier: Modifier = Modifier,
) {
    OmenBadge(label = status.label(), tone = status.badgeTone(), modifier = modifier)
}

// Exposed for PlatformConnectionCard and equivalent higher-level compositions that need to
// query the settled badge label without re-declaring the switch.
internal fun connectionStatusLabel(status: OmenConnectionStatus): String = status.label()
