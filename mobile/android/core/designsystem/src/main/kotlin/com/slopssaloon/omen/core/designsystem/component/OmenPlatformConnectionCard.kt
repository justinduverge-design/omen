package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.2 PlatformConnectionCard. Provider identity + current connection state +
 * optional recovery/manage action, all inside a Card. Composes PlatformBadge, the shared
 * OmenConnectionStatus vocabulary, and OmenButton. No provider icons or brand chrome are
 * introduced — the PlatformBadge already carries brand identity redundantly with its text
 * label.
 *
 * `actionLabel == null` renders without a button (display-only "connected" state).
 * `description` is an optional single line of plain-English context under the badges
 * (e.g. "Last synced 4 minutes ago" or "Reconnect to restore this week's roster").
 *
 * The card tone stays Neutral even for Error / NeedsReauth — the status badge carries the
 * urgency and the action button supplies the recovery affordance; painting the whole card
 * red would over-signal for a compact status surface.
 */
@Composable
fun OmenPlatformConnectionCard(
    platform: OmenPlatform,
    status: OmenConnectionStatus,
    modifier: Modifier = Modifier,
    description: String? = null,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    OmenCard(
        modifier = modifier.fillMaxWidth(),
        variant = OmenCardVariant.Solid,
        tone = OmenCardTone.Neutral,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OmenPlatformBadge(platform = platform)
                OmenConnectionStatusBadge(status = status)
            }
            if (description != null) {
                Text(
                    text = description,
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
            if (actionLabel != null && onAction != null) {
                OmenButton(
                    text = actionLabel,
                    onClick = onAction,
                    variant = when (status) {
                        OmenConnectionStatus.NeedsReauth, OmenConnectionStatus.Error ->
                            OmenButtonVariant.Danger
                        else -> OmenButtonVariant.Primary
                    },
                    size = OmenButtonSize.Md,
                )
            }
        }
    }
}
