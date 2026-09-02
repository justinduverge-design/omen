package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.2 ContextStrip (Figma node `25:2`, approved 2026-07-20). The persistent
 * "which team/league am I looking at?" surface pinned above every Command Center render.
 * Sealed state models the four required variants; the switcher gesture is opaque — this
 * composition renders the strip and the tap target, the calling screen owns the switcher
 * sheet / bottom-sheet.
 *
 * Built from: [OmenPlatformBadge] + [OmenBadge] (recovery flag) + typography/spacing
 * tokens, inside a token-driven surface. Not a Card — the strip sits inline in the
 * screen, not as a bounded content container.
 */
sealed interface OmenContextStripState {
    /**
     * A team/league is selected and considered healthy.
     *
     * [leagueName] is nullable because a provider can genuinely fail to supply one — ESPN did,
     * for every user, until the adapter learned to read the name `mSettings` already returns.
     * The strip previously demanded a league name and rendered the **Empty** state without it,
     * so a real connected team vanished behind "Choose a team". Omitting one line is honest;
     * erasing the selection, or inventing a name for it, is not.
     */
    data class Selected(
        val platform: OmenPlatform,
        val leagueName: String?,
        val teamName: String,
    ) : OmenContextStripState

    /** A selection exists but its provider connection needs reconnect/recovery. */
    data class NeedsRecovery(
        val platform: OmenPlatform,
        val leagueName: String,
        val teamName: String,
        val reason: String,
    ) : OmenContextStripState

    /** No team/league selected yet — surface a "choose" hint. */
    data object Empty : OmenContextStripState

    /** Selection exists, but the account owns multiple teams in this league. */
    data class MultiTeamHint(
        val platform: OmenPlatform,
        val leagueName: String,
        val teamName: String,
        val otherTeamCount: Int,
    ) : OmenContextStripState
}

/**
 * @param onSwitch invoked when the user taps the strip's switcher affordance. `null` renders
 * the strip as display-only (screenshot mode, previews).
 */
@Composable
fun OmenContextStrip(
    state: OmenContextStripState,
    modifier: Modifier = Modifier,
    onSwitch: (() -> Unit)? = null,
) {
    val colors = OmenTheme.color
    val a11y = contextStripAccessibilityLabel(state)
    val baseModifier = modifier
        .fillMaxWidth()
        .clip(RoundedCornerShape(12.dp))
        .background(colors.surface1)

    val interactiveModifier = if (onSwitch != null) {
        baseModifier.semantics {
            role = Role.Button
            contentDescription = a11y
        }
    } else {
        baseModifier.semantics { contentDescription = a11y }
    }

    Surface(
        onClick = onSwitch ?: {},
        enabled = onSwitch != null,
        modifier = interactiveModifier,
        color = colors.surface1,
        contentColor = colors.textPrimary,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12),
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Leading(state)
            Column(
                modifier = Modifier
                    .weight(1f, fill = true)
                    .padding(end = OmenTheme.spacing.step8),
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
            ) {
                Body(state)
            }
            Trailing(state, showSwitchHint = onSwitch != null)
        }
    }
}

@Composable
private fun Leading(state: OmenContextStripState) {
    when (state) {
        is OmenContextStripState.Selected -> OmenPlatformBadge(platform = state.platform)
        is OmenContextStripState.NeedsRecovery -> OmenPlatformBadge(platform = state.platform)
        is OmenContextStripState.MultiTeamHint -> OmenPlatformBadge(platform = state.platform)
        OmenContextStripState.Empty -> Box(
            modifier = Modifier
                .padding(vertical = OmenTheme.spacing.step4)
                .heightIn(min = 20.dp),
        ) {
            OmenBadge(label = "No league", tone = OmenBadgeTone.Neutral)
        }
    }
}

@Composable
private fun Body(state: OmenContextStripState) {
    val colors = OmenTheme.color
    when (state) {
        is OmenContextStripState.Selected -> {
            Text(
                text = state.teamName,
                style = OmenTheme.typography.h3.toTextStyle(),
                color = colors.textPrimary,
            )
            // Omitted entirely when the provider gave no name — never a placeholder.
            val leagueName = state.leagueName
            if (leagueName != null) {
                Text(
                    text = leagueName,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = colors.textSecondary,
                )
            }
        }
        is OmenContextStripState.NeedsRecovery -> {
            Text(
                text = state.teamName,
                style = OmenTheme.typography.h3.toTextStyle(),
                color = colors.textPrimary,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                OmenBadge(label = "Reauth", tone = OmenBadgeTone.Risk)
                Text(
                    text = state.reason,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = colors.textSecondary,
                )
            }
        }
        is OmenContextStripState.MultiTeamHint -> {
            Text(
                text = state.teamName,
                style = OmenTheme.typography.h3.toTextStyle(),
                color = colors.textPrimary,
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = state.leagueName,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = colors.textSecondary,
                )
                OmenBadge(label = "+${state.otherTeamCount} more", tone = OmenBadgeTone.Neutral)
            }
        }
        OmenContextStripState.Empty -> {
            Text(
                text = "Choose a team",
                style = OmenTheme.typography.h3.toTextStyle(),
                color = colors.textPrimary,
            )
            Text(
                text = "Pick a connected league to focus Command Center.",
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = colors.textSecondary,
            )
        }
    }
}

@Composable
private fun Trailing(state: OmenContextStripState, showSwitchHint: Boolean) {
    if (!showSwitchHint) return
    // Text glyph rather than an icon drawable — Trailing switch affordance is a chevron
    // hint, not iconography per registry §4 (no new icon assets introduced here).
    Text(
        text = "Switch",
        style = OmenTheme.typography.label.toTextStyle(),
        color = OmenTheme.color.accent,
    )
}

/** Publicly exposed for callers/tests that need the same a11y string the view uses. */
fun contextStripAccessibilityLabel(state: OmenContextStripState): String = when (state) {
    is OmenContextStripState.Selected ->
        state.leagueName
            ?.let { "Selected: ${state.teamName} in $it on ${platformLabel(state.platform)}. Tap to switch." }
            ?: "Selected: ${state.teamName} on ${platformLabel(state.platform)}. Tap to switch."
    is OmenContextStripState.NeedsRecovery ->
        "Reauth needed for ${state.teamName} in ${state.leagueName} on ${platformLabel(state.platform)}. ${state.reason}. Tap to switch."
    is OmenContextStripState.MultiTeamHint ->
        "Selected: ${state.teamName} in ${state.leagueName} on ${platformLabel(state.platform)}. +${state.otherTeamCount} other teams in this league. Tap to switch."
    OmenContextStripState.Empty ->
        "No team selected. Tap to choose."
}

private fun platformLabel(platform: OmenPlatform): String = when (platform) {
    OmenPlatform.Sleeper -> "Sleeper"
    OmenPlatform.Yahoo -> "Yahoo"
    OmenPlatform.Espn -> "ESPN"
}
