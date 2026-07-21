package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.semantics
import androidx.compose.material3.Text
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** Registry §3.1 form wrapper: label plus optional hint, error, or success feedback. */
@Composable
fun OmenFormField(
    label: String,
    modifier: Modifier = Modifier,
    hint: String? = null,
    errorMessage: String? = null,
    successMessage: String? = null,
    content: @Composable () -> Unit,
) {
    val feedback = errorMessage ?: successMessage
    val feedbackColor = if (errorMessage != null) OmenTheme.color.data.riskHigh else OmenTheme.color.data.riskLow

    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        Text(label, style = OmenTheme.typography.label.toTextStyle(), color = OmenTheme.color.textSecondary)
        content()
        if (feedback != null) {
            Text(
                text = feedback,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = feedbackColor,
                modifier = Modifier.semantics { liveRegion = LiveRegionMode.Polite },
            )
        } else if (hint != null) {
            Text(hint, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
    }
}
