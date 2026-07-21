package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.ListItem
import androidx.compose.material3.ListItemDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/** Registry §3.1 default and interactive list rows. A missing action means display-only. */
@Composable
fun OmenListRow(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    onClick: (() -> Unit)? = null,
    leadingContent: (@Composable () -> Unit)? = null,
    trailingContent: (@Composable () -> Unit)? = null,
) {
    val colors = OmenTheme.color
    val item: @Composable () -> Unit = {
        Column {
            ListItem(
                headlineContent = { Text(title, style = OmenTheme.typography.body.toTextStyle()) },
                supportingContent = subtitle?.let { { Text(it, style = OmenTheme.typography.bodySmall.toTextStyle()) } },
                leadingContent = leadingContent,
                trailingContent = trailingContent,
                colors = ListItemDefaults.colors(
                    containerColor = colors.surface1,
                    headlineColor = colors.textPrimary,
                    supportingColor = colors.textSecondary,
                ),
            )
            HorizontalDivider(color = colors.borderSubtle)
        }
    }

    if (onClick == null) {
        Surface(modifier = modifier.fillMaxWidth(), color = colors.surface1, content = item)
    } else {
        Surface(
            onClick = onClick,
            modifier = modifier
                .fillMaxWidth()
                .semantics { contentDescription = title },
            enabled = enabled,
            color = colors.surface1,
            contentColor = colors.textPrimary,
        ) { item() }
    }
}
