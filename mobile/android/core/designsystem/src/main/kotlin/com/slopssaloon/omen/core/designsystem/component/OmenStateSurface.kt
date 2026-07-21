package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** The six honest registry §3.1 data states. Never collapse one into another. */
enum class OmenStateSurfaceKind { Empty, Loading, Error, Disconnected, Stale, Mock }

/**
 * Token-backed, non-interactive state surface for content areas. Callers supply contextual copy
 * (for example, "Analyzing your matchup…"), never a generic dead-dashboard "Loading…" label.
 * [reducedMotion] renders loading as a static status instead of an animated spinner.
 */
@Composable
fun OmenStateSurface(
    kind: OmenStateSurfaceKind,
    title: String,
    message: String,
    modifier: Modifier = Modifier,
    reducedMotion: Boolean = false,
) {
    val cardVariant = when (kind) {
        OmenStateSurfaceKind.Empty -> OmenCardVariant.Empty
        OmenStateSurfaceKind.Error -> OmenCardVariant.Error
        else -> OmenCardVariant.Outlined
    }
    val tone = when (kind) {
        OmenStateSurfaceKind.Error -> OmenCardTone.Risk
        else -> OmenCardTone.Neutral
    }
    val stateLabel = kind.name.lowercase().replaceFirstChar { it.titlecase() }

    OmenCard(
        modifier = modifier
            .fillMaxWidth()
            .semantics { stateDescription = stateLabel },
        variant = cardVariant,
        tone = tone,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            if (kind == OmenStateSurfaceKind.Loading && !reducedMotion) {
                CircularProgressIndicator(
                    color = OmenTheme.color.accent,
                    trackColor = OmenTheme.color.surface3,
                )
            }
            Text(title, style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
            Text(message, style = OmenTheme.typography.body.toTextStyle(), color = OmenTheme.color.textSecondary)
        }
    }
}
