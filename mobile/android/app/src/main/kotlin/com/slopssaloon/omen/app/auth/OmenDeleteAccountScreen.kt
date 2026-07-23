package com.slopssaloon.omen.app.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.auth.AccountDeletion

/**
 * Extracted from `OmenAndroidApp.kt` alongside [OmenAuthFlow] so the app-shell file can
 * leave the primitive-enforcement allowlist. Retirement is tracked as sprint item
 * **M4-Auth** — see the note on [OmenAuthFlow] for the shared exit condition.
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
    Column(Modifier.padding(24.dp)) {
        Text("Delete your Omen account")
        Text("This permanently deletes your account and data. It cannot be undone.")
        Text("Type ${AccountDeletion.REQUIRED_PHRASE} to confirm.")
        OutlinedTextField(
            value = phrase,
            onValueChange = onPhraseChange,
            label = { Text("Confirmation phrase") },
        )
        if (message != null) Text(message)
        Button(
            onClick = onConfirm,
            enabled = !deleting && AccountDeletion.isConfirmed(phrase),
        ) { Text(if (deleting) "Deleting…" else "Permanently delete account") }
        OutlinedButton(onClick = onCancel, enabled = !deleting) { Text("Cancel") }
    }
}
