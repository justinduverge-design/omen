package com.slopssaloon.omen.app.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.R
import com.slopssaloon.omen.core.auth.AuthFailure
import com.slopssaloon.omen.core.auth.AuthFlowState
import com.slopssaloon.omen.core.auth.OtpCodeValidator
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenFormField
import com.slopssaloon.omen.core.designsystem.component.OmenIconButton
import com.slopssaloon.omen.core.designsystem.component.OmenIconButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.component.OmenTextField
import com.slopssaloon.omen.core.designsystem.component.OmenTextFieldVariant
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Provider-first native sign-in. Android's primary credential is Google; email moves to a
 * second six-digit code screen after submission, mirroring the iOS OTP step.
 */
@Composable
fun OmenAuthFlow(
    state: AuthFlowState,
    email: String,
    code: String,
    live: Boolean,
    googleConfigured: Boolean,
    discordConfigured: Boolean = false,
    demoModeEnabled: Boolean = false,
    onEmailChange: (String) -> Unit,
    onCodeChange: (String) -> Unit,
    onSubmitEmail: () -> Unit,
    onSubmitCode: () -> Unit,
    /** Null hides the delivery-help block entirely (e.g. previews). */
    resend: OtpResendController? = null,
    onResendCode: () -> Unit = {},
    onGoogle: () -> Unit,
    onDiscord: () -> Unit = {},
    onReset: () -> Unit,
    onBack: (() -> Unit)? = null,
    onTryDemo: (() -> Unit)? = null,
) {
    var showEmailEntry by rememberSaveable { mutableStateOf(!googleConfigured) }
    val showCodeScreen = state is AuthFlowState.AwaitingOtp ||
        state is AuthFlowState.VerifyingOtp ||
        state is AuthFlowState.Failed && state.reason == AuthFailure.INVALID_CODE && email.isNotBlank()

    LaunchedEffect(state) {
        if (state is AuthFlowState.AwaitingOtp) showEmailEntry = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0xFF0A0A0B)),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(OmenTheme.spacing.cardInterior),
        ) {
            if (showCodeScreen) {
                EmailCodeScreen(
                    state = state,
                    email = email,
                    code = code,
                    onCodeChange = { onCodeChange(OtpCodeValidator.normalize(it).take(6)) },
                    onSubmitCode = onSubmitCode,
                    resend = resend,
                    onResendCode = onResendCode,
                    onUseDifferentEmail = {
                        onReset()
                        onCodeChange("")
                        showEmailEntry = true
                    },
                )
            } else {
                SignInFirstScreen(
                    state = state,
                    email = email,
                    live = live,
                    googleConfigured = googleConfigured,
                    discordConfigured = discordConfigured,
                    demoModeEnabled = demoModeEnabled,
                    showEmailEntry = showEmailEntry,
                    onShowEmailEntry = { showEmailEntry = true },
                    onEmailChange = onEmailChange,
                    onSubmitEmail = onSubmitEmail,
                    onGoogle = onGoogle,
                    onDiscord = onDiscord,
                    onReset = onReset,
                    onBack = onBack,
                    onTryDemo = onTryDemo,
                )
            }
        }
    }
}

@Composable
private fun SignInFirstScreen(
    state: AuthFlowState,
    email: String,
    live: Boolean,
    googleConfigured: Boolean,
    discordConfigured: Boolean,
    demoModeEnabled: Boolean,
    showEmailEntry: Boolean,
    onShowEmailEntry: () -> Unit,
    onEmailChange: (String) -> Unit,
    onSubmitEmail: () -> Unit,
    onGoogle: () -> Unit,
    onDiscord: () -> Unit,
    onReset: () -> Unit,
    onBack: (() -> Unit)?,
    onTryDemo: (() -> Unit)?,
) {
    Column(modifier = Modifier.fillMaxHeight()) {
        if (onBack != null) {
            OmenIconButton(
                contentDescription = "Back",
                onClick = onBack,
                size = OmenIconButtonSize.Sm,
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_canvas_chevron_left),
                    contentDescription = null,
                    tint = Color.Unspecified,
                    modifier = Modifier.size(24.dp),
                )
            }
        } else {
            Spacer(Modifier.height(34.dp))
        }

        Box(
            contentAlignment = Alignment.Center,
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
        ) {
            Image(
                painter = painterResource(id = R.drawable.omen_lockup_stacked),
                contentDescription = "Omen",
                modifier = Modifier.widthIn(max = 300.dp),
            )
        }

        Text(
            text = "See the move before the league does.",
            style = OmenTheme.typography.body.toTextStyle(),
            color = OmenTheme.color.textSecondary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(horizontal = OmenTheme.spacing.step16),
        )
        if (!live) {
            Text(
                text = "Local auth flow. Live Supabase wiring depends on build config.",
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }
        Spacer(Modifier.height(32.dp))

        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
            AuthPrimaryButton(
                text = if (googleConfigured) "Continue with Google" else "Google unavailable",
                icon = {
                    Image(
                        painter = painterResource(id = R.drawable.ic_auth_google),
                        contentDescription = null,
                        modifier = Modifier.size(19.dp),
                    )
                },
                onClick = onGoogle,
                enabled = googleConfigured &&
                    state !is AuthFlowState.LaunchingGoogle &&
                    state !is AuthFlowState.ExchangingGoogleToken,
                loading = state is AuthFlowState.LaunchingGoogle ||
                    state is AuthFlowState.ExchangingGoogleToken,
            )

            Row(
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
                modifier = Modifier.fillMaxWidth(),
            ) {
                if (discordConfigured) {
                    AuthProviderTile(
                        contentDescription = "Continue with Discord",
                        onClick = onDiscord,
                        enabled = state !is AuthFlowState.LaunchingOAuth &&
                            state !is AuthFlowState.ExchangingOAuthCode,
                        loading = state is AuthFlowState.LaunchingOAuth ||
                            state is AuthFlowState.ExchangingOAuthCode,
                        modifier = Modifier.weight(1f),
                    ) {
                        Icon(
                            painter = painterResource(id = R.drawable.ic_auth_discord),
                            contentDescription = null,
                            tint = Color.Unspecified,
                            modifier = Modifier.size(19.dp),
                        )
                    }
                }
                AuthProviderTile(
                    contentDescription = "Continue with email",
                    onClick = onShowEmailEntry,
                    enabled = state !is AuthFlowState.RequestingOtp,
                    modifier = Modifier.weight(1f),
                ) {
                    Icon(
                        painter = painterResource(id = R.drawable.ic_auth_email),
                        contentDescription = null,
                        tint = Color.Unspecified,
                        modifier = Modifier.size(19.dp),
                    )
                }
            }

            if (showEmailEntry) {
                EmailEntry(
                    state = state,
                    email = email,
                    onEmailChange = onEmailChange,
                    onSubmitEmail = onSubmitEmail,
                )
            }

            if (demoModeEnabled && onTryDemo != null) {
                CanvasTextAction(
                    text = "Look around without an account →",
                    onClick = onTryDemo,
                    color = OmenTheme.color.accent,
                    fontWeight = FontWeight.SemiBold,
                    height = 48.dp,
                    enabled = state !is AuthFlowState.RequestingOtp,
                )
            }
        }
        Spacer(Modifier.height(10.dp))

        Text(
            text = "By continuing you confirm you're 13 or older and agree to the Terms and Privacy Notice.",
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            textAlign = TextAlign.Center,
            modifier = Modifier.fillMaxWidth().padding(horizontal = OmenTheme.spacing.step16),
        )
        Spacer(Modifier.height(OmenTheme.spacing.step24))

        if (state is AuthFlowState.Failed) {
            OmenStateSurface(
                kind = OmenStateSurfaceKind.Error,
                title = "Sign-in didn't complete",
                message = authFailureMessage(state.reason),
            )
            OmenButton(
                text = "Try again",
                onClick = onReset,
                variant = OmenButtonVariant.Secondary,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}

@Composable
private fun AuthPrimaryButton(
    text: String,
    icon: (@Composable () -> Unit)? = null,
    onClick: () -> Unit,
    enabled: Boolean,
    loading: Boolean,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(10.dp),
        colors = ButtonDefaults.buttonColors(
            containerColor = OmenTheme.color.textPrimary,
            contentColor = OmenTheme.color.textOnAccent,
            disabledContainerColor = OmenTheme.color.surface3,
            disabledContentColor = OmenTheme.color.textTertiary,
        ),
        modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp),
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (icon != null && !loading) icon()
            Text(text, style = OmenTheme.typography.h3.toTextStyle(), fontWeight = FontWeight.SemiBold)
        }
    }
}

@Composable
private fun AuthProviderTile(
    contentDescription: String,
    onClick: () -> Unit,
    enabled: Boolean,
    modifier: Modifier = Modifier,
    loading: Boolean = false,
    icon: @Composable () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = RoundedCornerShape(10.dp),
        color = Color(0xFF141416),
        contentColor = if (enabled && !loading) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
        border = BorderStroke(1.dp, OmenTheme.color.border),
        modifier = modifier.height(54.dp),
    ) {
        Box(contentAlignment = Alignment.Center, modifier = Modifier.fillMaxSize()) {
            if (loading) {
                androidx.compose.material3.CircularProgressIndicator(
                    modifier = Modifier.size(18.dp),
                    strokeWidth = 2.dp,
                    color = OmenTheme.color.textPrimary,
                )
            } else {
                icon()
            }
        }
    }
}

@Composable
private fun EmailEntry(
    state: AuthFlowState,
    email: String,
    onEmailChange: (String) -> Unit,
    onSubmitEmail: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(OmenTheme.color.surface1)
            .border(1.dp, OmenTheme.color.border, RoundedCornerShape(8.dp))
            .padding(OmenTheme.spacing.step16),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
    ) {
        OmenFormField(
            label = "Email",
            errorMessage = if (state is AuthFlowState.Failed && state.reason == AuthFailure.INVALID_EMAIL) {
                authFailureMessage(state.reason)
            } else null,
        ) {
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
            text = if (state is AuthFlowState.RequestingOtp) "Sending code" else "Email me a code",
            onClick = onSubmitEmail,
            variant = OmenButtonVariant.Secondary,
            enabled = state !is AuthFlowState.RequestingOtp,
            loading = state is AuthFlowState.RequestingOtp,
            modifier = Modifier.fillMaxWidth(),
        )
    }
}

@Composable
private fun EmailCodeScreen(
    state: AuthFlowState,
    email: String,
    code: String,
    onCodeChange: (String) -> Unit,
    onSubmitCode: () -> Unit,
    resend: OtpResendController?,
    onResendCode: () -> Unit,
    onUseDifferentEmail: () -> Unit,
) {
    val isVerifying = state is AuthFlowState.VerifyingOtp
    Column(
        modifier = Modifier.fillMaxHeight(),
    ) {
        Spacer(Modifier.height(OmenTheme.spacing.step12))
        OmenIconButton(
            contentDescription = "Use a different email",
            onClick = onUseDifferentEmail,
            size = OmenIconButtonSize.Sm,
            enabled = !isVerifying,
        ) {
            Icon(
                painter = painterResource(id = R.drawable.ic_canvas_chevron_left),
                contentDescription = null,
                tint = Color.Unspecified,
                modifier = Modifier.size(24.dp),
            )
        }
        Spacer(Modifier.height(40.dp))

        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            Text(
                text = "Check your email.",
                style = OmenTheme.typography.h1.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                text = "We sent a six-digit code to $email. It's good for ten minutes.",
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }

        Spacer(Modifier.height(OmenTheme.spacing.step32))
        CodeEntry(code = code, enabled = !isVerifying, onCodeChange = onCodeChange)
        Spacer(Modifier.height(OmenTheme.spacing.step24))

        OmenButton(
            text = "Continue",
            onClick = onSubmitCode,
            enabled = OtpCodeValidator.isValid(code) && !isVerifying,
            loading = isVerifying,
            modifier = Modifier.fillMaxWidth(),
        )

        Spacer(Modifier.height(OmenTheme.spacing.step16))
        if (resend != null) {
            CanvasTextAction(
                text = if (resend.secondsRemaining > 0) "Send it again in ${resend.secondsRemaining}s" else "Send it again",
                onClick = onResendCode,
                color = if (resend.canResend && !isVerifying) OmenTheme.color.accent else OmenTheme.color.textTertiary,
                fontWeight = FontWeight.SemiBold,
                height = 44.dp,
                enabled = resend.canResend && !isVerifying,
            )
            if (resend.resent) {
                Text(
                    text = "Sent again.",
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
            val resendError = resend.error
            if (resendError != null) {
                Text(
                    text = resendError,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.data.riskHigh,
                )
            }
        }

        Spacer(Modifier.weight(1f))

        CanvasTextAction(
            text = "Use a different email",
            onClick = onUseDifferentEmail,
            color = OmenTheme.color.textTertiary,
            fontWeight = FontWeight.Medium,
            height = 44.dp,
            enabled = !isVerifying,
        )
        Spacer(Modifier.height(OmenTheme.spacing.step24))

        if (state is AuthFlowState.Failed) {
            OmenStateSurface(
                kind = OmenStateSurfaceKind.Error,
                title = "That code didn't work",
                message = authFailureMessage(state.reason),
            )
        }
    }
}

@Composable
private fun CanvasTextAction(
    text: String,
    onClick: () -> Unit,
    color: Color,
    fontWeight: FontWeight,
    height: androidx.compose.ui.unit.Dp,
    enabled: Boolean = true,
) {
    TextButton(
        onClick = onClick,
        enabled = enabled,
        colors = ButtonDefaults.textButtonColors(
            contentColor = color,
            disabledContentColor = OmenTheme.color.textTertiary,
        ),
        contentPadding = PaddingValues(0.dp),
        modifier = Modifier.fillMaxWidth().height(height),
    ) {
        Text(
            text = text,
            style = OmenTheme.typography.label.toTextStyle(),
            fontWeight = fontWeight,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun CodeEntry(code: String, enabled: Boolean, onCodeChange: (String) -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().height(60.dp)) {
        CodeBoxes(code)
        BasicTextField(
            value = code,
            onValueChange = onCodeChange,
            enabled = enabled,
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
            cursorBrush = SolidColor(Color.Transparent),
            textStyle = OmenTheme.typography.h2.toTextStyle().copy(color = Color.Transparent),
            modifier = Modifier
                .fillMaxSize()
                .semantics { contentDescription = "6-digit code" },
        )
    }
}

@Composable
private fun CodeBoxes(code: String) {
    Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8), modifier = Modifier.fillMaxSize()) {
        repeat(6) { index ->
            val digit = code.getOrNull(index)?.toString().orEmpty()
            val filled = digit.isNotEmpty()
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(60.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(if (filled) OmenTheme.color.accentMuted else Color(0xFF141416))
                    .border(
                        width = 1.dp,
                        color = if (filled) OmenTheme.color.accent else OmenTheme.color.border,
                        shape = RoundedCornerShape(10.dp),
                    ),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = digit,
                    style = OmenTheme.typography.h2.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                )
            }
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
    AuthFailure.OAUTH_PROVIDER_NOT_CONFIGURED -> "That sign-in option isn't available right now. Use another method."
    AuthFailure.OAUTH_CALLBACK_MISMATCH -> "Sign-in couldn't be verified. Start again."
    AuthFailure.PASSKEY_UNAVAILABLE -> "Passkeys aren't available on this device. Use another method."
    AuthFailure.PASSKEY_NO_CREDENTIAL -> "No passkey found for this account on this device. Sign in another way to pair one."
    AuthFailure.UNKNOWN -> "Couldn't complete sign-in. Try again, or contact support."
}
