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
import com.slopssaloon.omen.core.auth.AuthFailure
import com.slopssaloon.omen.core.auth.AuthFlowState
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenFormField
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.component.OmenTextField
import com.slopssaloon.omen.core.designsystem.component.OmenTextFieldVariant
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * M4-Auth pass: composes only approved Omen primitives from `:core:designsystem` so this file
 * (and its sibling [OmenDeleteAccountScreen]) can leave `PrimitiveEnforcementTest.ALLOWLISTED_FILES`.
 */
@Composable
fun OmenAuthFlow(
    state: AuthFlowState,
    email: String,
    code: String,
    live: Boolean,
    googleConfigured: Boolean,
    discordConfigured: Boolean = false,
    onEmailChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onSubmitEmail: () -> Unit,
    onSubmitCode: () -> Unit,
    onGoogle: () -> Unit,
    onDiscord: () -> Unit = {},
    onReset: () -> Unit,
    onBack: () -> Unit,
) {
    OmenCard(
        modifier = Modifier.padding(24.dp).fillMaxWidth(),
        variant = OmenCardVariant.Solid,
        contentPadding = PaddingValues(OmenTheme.spacing.cardInterior),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16)) {
            Text(
                text = "Sign in to Omen",
                style = OmenTheme.typography.h1.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                text = if (live) "Sign in with your email code or Google."
                else "Local auth flow (fake backend) — live Supabase wiring pending config.",
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )

            when (state) {
                is AuthFlowState.AwaitingOtp, is AuthFlowState.VerifyingOtp -> {
                    OmenFormField(
                        label = "6-digit code",
                        hint = "Enter the 6-digit code sent to $email",
                    ) {
                        OmenTextField(
                            value = code,
                            onValueChange = onCodeChange,
                            label = "6-digit code",
                            variant = OmenTextFieldVariant.Number,
                            enabled = state is AuthFlowState.AwaitingOtp,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    OmenButton(
                        text = if (state is AuthFlowState.VerifyingOtp) "Verifying…" else "Verify code",
                        onClick = onSubmitCode,
                        variant = OmenButtonVariant.Primary,
                        enabled = state is AuthFlowState.AwaitingOtp,
                        loading = state is AuthFlowState.VerifyingOtp,
                        modifier = Modifier.fillMaxWidth(),
                    )
                }
                else -> {
                    OmenFormField(label = "Email") {
                        OmenTextField(
                            value = email,
                            onValueChange = onEmailChange,
                            label = "Email",
                            variant = OmenTextFieldVariant.Email,
                            enabled = state !is AuthFlowState.RequestingOtp,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                    OmenButton(
                        text = if (state is AuthFlowState.RequestingOtp) "Sending code…" else "Email me a code",
                        onClick = onSubmitEmail,
                        variant = OmenButtonVariant.Primary,
                        enabled = state !is AuthFlowState.RequestingOtp,
                        loading = state is AuthFlowState.RequestingOtp,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    OmenButton(
                        text = if (googleConfigured) "Continue with Google" else "Google (not configured)",
                        onClick = onGoogle,
                        variant = OmenButtonVariant.Secondary,
                        enabled = googleConfigured,
                        modifier = Modifier.fillMaxWidth(),
                    )
                    // M4-Auth-Providers-v1 §3 — first user of the provider-agnostic OAuth seam.
                    // Rendered only when Supabase config is present; hidden entirely otherwise so
                    // the auth surface stays clean on unconfigured / demo builds. Passkey button
                    // deliberately absent — see M4-Auth-Passkeys-Onramp follow-up.
                    if (discordConfigured) {
                        Text(
                            text = "More ways to sign in",
                            style = OmenTheme.typography.label.toTextStyle(),
                            color = OmenTheme.color.textSecondary,
                        )
                        OmenButton(
                            text = "Continue with Discord",
                            onClick = onDiscord,
                            variant = OmenButtonVariant.Secondary,
                            enabled = state !is AuthFlowState.LaunchingOAuth &&
                                state !is AuthFlowState.ExchangingOAuthCode,
                            loading = state is AuthFlowState.LaunchingOAuth ||
                                state is AuthFlowState.ExchangingOAuthCode,
                            modifier = Modifier.fillMaxWidth(),
                        )
                    }
                }
            }

            if (state is AuthFlowState.Failed) {
                OmenStateSurface(
                    kind = OmenStateSurfaceKind.Error,
                    title = "Sign-in didn't complete",
                    message = authFailureMessage(state.reason),
                )
                OmenButton(
                    text = "Try again",
                    onClick = onReset,
                    variant = OmenButtonVariant.Primary,
                    modifier = Modifier.fillMaxWidth(),
                )
            }

            OmenButton(
                text = "Back",
                onClick = onBack,
                variant = OmenButtonVariant.Tertiary,
                modifier = Modifier.fillMaxWidth(),
            )
        }
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
    // M4-Auth-Providers-v1: placeholder copy per brief §10; slops-ux-copy tunes wording after
    // the mechanical seam works. Keeping strings functional so nothing surfaces as blank.
    AuthFailure.OAUTH_PROVIDER_NOT_CONFIGURED -> "That sign-in option isn't available right now. Use another method."
    AuthFailure.OAUTH_CALLBACK_MISMATCH -> "Sign-in couldn't be verified. Start again."
    AuthFailure.PASSKEY_UNAVAILABLE -> "Passkeys aren't available on this device. Use another method."
    AuthFailure.PASSKEY_NO_CREDENTIAL -> "No passkey found for this account on this device. Sign in another way to pair one."
    AuthFailure.UNKNOWN -> "Couldn't complete sign-in. Try again, or contact support."
}
