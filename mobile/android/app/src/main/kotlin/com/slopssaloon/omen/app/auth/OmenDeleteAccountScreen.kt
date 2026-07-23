package com.slopssaloon.omen.app.auth

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.auth.AccountDeletion
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardTone
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
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
    OmenCard(
        modifier = Modifier.padding(24.dp).fillMaxWidth(),
        variant = OmenCardVariant.Outlined,
        tone = OmenCardTone.Risk,
        contentPadding = PaddingValues(OmenTheme.spacing.cardInterior),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16)) {
            Text(
                text = "Delete your Omen account",
                style = OmenTheme.typography.h1.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                text = "This permanently deletes your account and data. It cannot be undone.",
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )

            OmenFormField(
                label = "Confirmation phrase",
                hint = "Type ${AccountDeletion.REQUIRED_PHRASE} to confirm.",
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
                modifier = Modifier.fillMaxWidth(),
            )

            OmenButton(
                text = "Cancel",
                onClick = onCancel,
                variant = OmenButtonVariant.Secondary,
                enabled = !deleting,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
