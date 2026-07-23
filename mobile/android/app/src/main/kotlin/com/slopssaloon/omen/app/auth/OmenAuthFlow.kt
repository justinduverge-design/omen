package com.slopssaloon.omen.app.auth

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.auth.AuthFailure
import com.slopssaloon.omen.core.auth.AuthFlowState

/**
 * Extracted from `OmenAndroidApp.kt` to isolate its remaining raw-Material-3 surface so
 * the app-shell file can leave the primitive-enforcement allowlist.
 *
 * This file is intentionally allowlisted in
 * [com.slopssaloon.omen.core.designsystem.enforcement.PrimitiveEnforcementTest].
 * Its retirement is tracked as sprint item **M4-Auth**: replace `Button` /
 * `OutlinedButton` / `OutlinedTextField` with `OmenButton` / `OmenTextField` /
 * `OmenFormField` in an Omen-primitive-native auth pass. Exit condition is a single
 * event — this file AND `OmenDeleteAccountScreen.kt` both leave the allowlist together
 * when the redesigned surfaces land and the scanner is still green.
 */
@Composable
fun OmenAuthFlow(
    state: AuthFlowState,
    email: String,
    code: String,
    live: Boolean,
    googleConfigured: Boolean,
    onEmailChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onSubmitEmail: () -> Unit,
    onSubmitCode: () -> Unit,
    onGoogle: () -> Unit,
    onReset: () -> Unit,
    onBack: () -> Unit,
) {
    Column(Modifier.padding(24.dp)) {
        Text("Sign in to Omen")
        Text(
            if (live) "Sign in with your email code or Google."
            else "Local auth flow (fake backend) — live Supabase wiring pending config.",
        )

        when (state) {
            is AuthFlowState.AwaitingOtp, is AuthFlowState.VerifyingOtp -> {
                Text("Enter the 6-digit code sent to $email")
                OutlinedTextField(
                    value = code,
                    onValueChange = onCodeChange,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
                    label = { Text("6-digit code") },
                )
                Button(
                    onClick = onSubmitCode,
                    enabled = state is AuthFlowState.AwaitingOtp,
                ) { Text(if (state is AuthFlowState.VerifyingOtp) "Verifying…" else "Verify code") }
            }
            else -> {
                OutlinedTextField(
                    value = email,
                    onValueChange = onEmailChange,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                    label = { Text("Email") },
                )
                Button(
                    onClick = onSubmitEmail,
                    enabled = state !is AuthFlowState.RequestingOtp,
                ) { Text(if (state is AuthFlowState.RequestingOtp) "Sending code…" else "Email me a code") }
                OutlinedButton(onClick = onGoogle) {
                    Text(if (googleConfigured) "Continue with Google" else "Google (not configured)")
                }
            }
        }

        if (state is AuthFlowState.Failed) {
            Text(authFailureMessage(state.reason))
            Button(onClick = onReset) { Text("Try again") }
        }

        OutlinedButton(onClick = onBack) { Text("Back") }
    }
}

fun authFailureMessage(reason: AuthFailure): String = when (reason) {
    AuthFailure.INVALID_EMAIL -> "That email doesn't look right. Check it and try again."
    AuthFailure.INVALID_CODE -> "That code didn't match. Re-enter it or request a new one."
    AuthFailure.CANCELED -> "Sign-in canceled. You can try again anytime."
    AuthFailure.NETWORK -> "Network problem. Check your connection and retry."
    AuthFailure.TIMEOUT -> "That took too long. Retry when you're ready."
    AuthFailure.SERVER -> "Something went wrong on our side. Try again, or use another sign-in method."
    AuthFailure.GOOGLE_UNAVAILABLE -> "Google sign-in isn't available on this build. Use email instead."
    AuthFailure.NEEDS_REAUTH -> "Your session expired. Please sign in again."
    AuthFailure.UNKNOWN -> "Couldn't complete sign-in. Try again, or contact support."
}
