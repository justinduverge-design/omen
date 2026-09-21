package com.slopssaloon.omen.app.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.slopssaloon.omen.core.auth.AccountDeletion
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenFormField
import com.slopssaloon.omen.core.designsystem.component.OmenTextField
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * M4-Auth pass: composes only approved Omen primitives so this file (and its sibling
 * [OmenAuthFlow]) can leave `PrimitiveEnforcementTest.ALLOWLISTED_FILES`.
 */
@Composable
fun OmenDeleteAccountScreen(
    phrase: String,
    message: String?,
    deleting: Boolean,
    onPhraseChange: (String) -> Unit,
    onConfirm: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(OmenTheme.spacing.step16),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step20),
    ) {
            Text(
                text = "Delete your Omen data",
                style = OmenTheme.typography.screenTitle.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                text = "This permanently deletes your Omen account and data. This can't be undone.",
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )

            OmenFormField(
                label = "TYPE \"${AccountDeletion.REQUIRED_PHRASE.uppercase()}\" TO CONFIRM",
                errorMessage = message,
            ) {
                OmenTextField(
                    value = phrase,
                    onValueChange = onPhraseChange,
                    label = "Confirmation phrase",
                    enabled = !deleting,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            OmenButton(
                text = if (deleting) "Deleting…" else "Permanently delete account",
                onClick = onConfirm,
                variant = OmenButtonVariant.Danger,
                enabled = !deleting && AccountDeletion.isConfirmed(phrase),
                loading = deleting,
            )

            OmenButton(
                text = "Cancel",
                onClick = onCancel,
                variant = OmenButtonVariant.Link,
                enabled = !deleting,
            )
    }
}
