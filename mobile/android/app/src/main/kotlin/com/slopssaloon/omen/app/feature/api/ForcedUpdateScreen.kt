package com.slopssaloon.omen.app.feature.api

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardTone
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * O7 — full-screen block for a build below the server minimum. iOS mirror:
 * `App/ForcedUpdateView.swift`.
 *
 * Unlike `OmenStateSurface`, this is interactive: it must offer the way out (the store
 * listing), not merely describe the state.
 */
@Composable
fun ForcedUpdateScreen(
    minimumVersion: String,
    onUpdate: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(OmenTheme.spacing.cardInterior),
        verticalArrangement = Arrangement.Center,
    ) {
        OmenCard(variant = OmenCardVariant.Outlined, tone = OmenCardTone.Risk) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
                Text(
                    text = "Update required",
                    style = OmenTheme.typography.h2.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                )
                Text(
                    text = "This version of Omen is no longer supported. Update to at least version $minimumVersion to keep using the app.",
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                OmenButton(text = "Update now", onClick = onUpdate)
            }
        }
    }
}
