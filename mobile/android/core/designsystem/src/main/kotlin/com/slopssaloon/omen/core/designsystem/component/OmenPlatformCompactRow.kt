package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.onClick
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * State for one row of the Command Center platforms compact strip.
 *
 * Contract: `Blueprints/specs/mobile/omen-native-backend-state-contract-v1.md`
 * → "Command Center Platforms Compact Strip — client state contract".
 * Figma: node `73:2` (`APPROVED COMPOSITION — Justin, 2026-08-01`).
 *
 * [lastSyncText] arrives **pre-formatted** from the caller. The client deliberately does not
 * compute relative time, so a screen left open cannot silently age into a wrong claim.
 */
data class OmenPlatformRowState(
    val platform: OmenPlatform,
    val status: OmenConnectionStatus,
    val lastSyncText: String? = null,
) {
    val isConnected: Boolean get() = status == OmenConnectionStatus.Connected

    /**
     * Last sync renders for [OmenConnectionStatus.Connected] only. Showing "4m ago" beside
     * "Reauth needed" would read as "working, recently" — the design house forbids status that
     * hides.
     */
    val resolvedLastSyncText: String? get() = if (isConnected) lastSyncText else null

    val platformName: String
        get() = when (platform) {
            OmenPlatform.Sleeper -> "Sleeper"
            OmenPlatform.Yahoo -> "Yahoo"
            OmenPlatform.Espn -> "ESPN"
        }

    /** One row is one accessible element: platform, status, and last sync as a single label. */
    val accessibilityLabel: String
        get() = buildList {
            add(platformName)
            add(connectionStatusLabel(status))
            resolvedLastSyncText?.let { add("last sync $it") }
        }.joinToString(", ")
}

/**
 * Registry-composed single-line platform row. Connected rows are a whole-row click target with a
 * trailing chevron into the detail sheet; disconnected rows expose an inline Connect action.
 *
 * Deliberately not a [OmenPlatformConnectionCard] variant: the card's full content is not deleted,
 * it moves into the tap-through detail sheet. This row is the surface, the card is the detail.
 */
@Composable
fun OmenPlatformCompactRow(
    state: OmenPlatformRowState,
    onOpenDetail: () -> Unit,
    modifier: Modifier = Modifier,
    onConnect: (() -> Unit)? = null,
) {
    val rowModifier = if (state.isConnected) {
        modifier
            .fillMaxWidth()
            .clickable(onClick = onOpenDetail)
            .clearAndSetSemantics {
                contentDescription = state.accessibilityLabel
                onClick(label = "opens platform details") { onOpenDetail(); true }
            }
    } else {
        modifier.fillMaxWidth().semantics { contentDescription = state.accessibilityLabel }
    }

    Row(
        modifier = rowModifier
            .defaultMinSize(minHeight = 48.dp)
            .padding(horizontal = OmenTheme.spacing.step12),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        OmenPlatformBadge(platform = state.platform)

        Text(
            text = state.platformName,
            style = OmenTheme.typography.label.toTextStyle(),
            color = OmenTheme.color.textPrimary,
            maxLines = 1,
        )

        // Text carries the status; the badge tone only reinforces it.
        Text(
            text = buildList {
                add(connectionStatusLabel(state.status))
                state.resolvedLastSyncText?.let { add(it) }
            }.joinToString(" · ", prefix = "· "),
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textSecondary,
            maxLines = 1,
        )

        Spacer(Modifier.weight(1f))

        if (state.isConnected) {
            // Text chevron rather than a Material icon: the icons artifact is not a dependency
            // of this module and the capability contract forbids adding one for a glyph.
            Text(
                text = "\u203A",
                style = OmenTheme.typography.label.toTextStyle(),
                color = OmenTheme.color.accent,
            )
        } else if (onConnect != null) {
            OmenButton(
                text = "Connect",
                onClick = onConnect,
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Sm,
            )
        }
    }
}

/**
 * The strip itself. Fixed provider order — a strip that reorders as connections change is a
 * moving target for muscle memory and for accessibility focus order.
 */
@Composable
fun OmenPlatformCompactStrip(
    rows: List<OmenPlatformRowState>,
    onOpenDetail: (OmenPlatformRowState) -> Unit,
    modifier: Modifier = Modifier,
    onConnect: ((OmenPlatformRowState) -> Unit)? = null,
) {
    if (rows.isEmpty()) return

    val shape = RoundedCornerShape(OmenTheme.spacing.step12)
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(shape)
            .background(OmenTheme.color.surface1)
            .border(1.dp, OmenTheme.color.border, shape),
    ) {
        rows.forEachIndexed { index, row ->
            if (index > 0) {
                HorizontalDivider(thickness = 1.dp, color = OmenTheme.color.border)
            }
            OmenPlatformCompactRow(
                state = row,
                onOpenDetail = { onOpenDetail(row) },
                onConnect = onConnect?.let { handler -> { handler(row) } },
            )
        }
    }
}
