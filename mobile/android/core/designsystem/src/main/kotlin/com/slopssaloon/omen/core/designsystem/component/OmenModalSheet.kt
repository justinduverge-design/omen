package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OmenModalSheet(visible: Boolean, onDismissRequest: () -> Unit, title: String, modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    if (!visible) return
    ModalBottomSheet(onDismissRequest = onDismissRequest, modifier = modifier, containerColor = OmenTheme.color.surface1, contentColor = OmenTheme.color.textPrimary) {
        Column(Modifier.fillMaxWidth().padding(horizontal = OmenTheme.spacing.cardInterior), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.headerToBody)) {
            Text(title, style = OmenTheme.typography.h2.toTextStyle())
            content()
        }
    }
}
