package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.1 ConfirmationDialog: presents a titled decision with a required confirm
 * action and a cancel escape hatch. Destructive variant uses `data.riskHigh` for the confirm
 * button so the danger is a *redundant* signal — the button label still carries the meaning
 * (registry §4; facts-of-record #7).
 *
 * Not a login/OTP flow, not a bottom sheet with multiple options — for those, see
 * [OmenModalSheet]. This wraps Material 3 [AlertDialog] so system a11y, Dynamic Type,
 * outside-touch dismissal, and back-button handling are inherited.
 */
enum class OmenConfirmationVariant { Default, Destructive }

@Composable
fun OmenConfirmationDialog(
    visible: Boolean,
    title: String,
    message: String,
    confirmLabel: String,
    cancelLabel: String,
    onConfirm: () -> Unit,
    onDismiss: () -> Unit,
    variant: OmenConfirmationVariant = OmenConfirmationVariant.Default,
    modifier: Modifier = Modifier,
) {
    if (!visible) return
    val colors = OmenTheme.color
    val confirmColor = when (variant) {
        OmenConfirmationVariant.Default -> colors.accent
        OmenConfirmationVariant.Destructive -> colors.data.riskHigh
    }

    AlertDialog(
        onDismissRequest = onDismiss,
        modifier = modifier,
        containerColor = colors.surface1,
        titleContentColor = colors.textPrimary,
        textContentColor = colors.textSecondary,
        title = { Text(title, style = OmenTheme.typography.h2.toTextStyle()) },
        text = { Text(message, style = OmenTheme.typography.body.toTextStyle()) },
        confirmButton = {
            TextButton(
                onClick = onConfirm,
                colors = ButtonDefaults.textButtonColors(contentColor = confirmColor),
            ) { Text(confirmLabel, style = OmenTheme.typography.body.toTextStyle()) }
        },
        dismissButton = {
            TextButton(
                onClick = onDismiss,
                colors = ButtonDefaults.textButtonColors(contentColor = colors.textSecondary),
            ) { Text(cancelLabel, style = OmenTheme.typography.body.toTextStyle()) }
        },
    )
}
