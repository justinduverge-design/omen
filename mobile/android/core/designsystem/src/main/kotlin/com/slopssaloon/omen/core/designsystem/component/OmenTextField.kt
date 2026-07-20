package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import com.slopssaloon.omen.core.designsystem.token.OmenMinTouchTarget
import com.slopssaloon.omen.core.designsystem.token.omenFocusRing

/** Registry §3.1 text/email/number/password variants. */
enum class OmenTextFieldVariant { Text, Email, Number, Password }

enum class OmenFieldSize { Sm, Md, Lg }

/**
 * Foundation text input backed by Material3 `OutlinedTextField` (registry §3.1).
 *
 * Validation copy belongs in [OmenFormField]; [isError] conveys the matching native control
 * state and TalkBack state description without duplicating that message visually.
 */
@Composable
fun OmenTextField(
    value: String,
    onValueChange: (String) -> Unit,
    label: String,
    modifier: Modifier = Modifier,
    placeholder: String? = null,
    variant: OmenTextFieldVariant = OmenTextFieldVariant.Text,
    size: OmenFieldSize = OmenFieldSize.Md,
    enabled: Boolean = true,
    isError: Boolean = false,
) {
    val colors = OmenTheme.color
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    val height = when (size) {
        OmenFieldSize.Sm -> OmenMinTouchTarget
        OmenFieldSize.Md -> 56.dp
        OmenFieldSize.Lg -> 64.dp
    }
    val keyboardType = when (variant) {
        OmenTextFieldVariant.Text -> KeyboardType.Text
        OmenTextFieldVariant.Email -> KeyboardType.Email
        OmenTextFieldVariant.Number -> KeyboardType.Number
        OmenTextFieldVariant.Password -> KeyboardType.Password
    }
    val visualTransformation = if (variant == OmenTextFieldVariant.Password) PasswordVisualTransformation() else VisualTransformation.None

    OutlinedTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier
            .heightIn(min = height)
            .omenFocusRing(
                focused = focused,
                color = colors.focusRing,
                haloColor = colors.focusRingHalo,
                cornerRadius = 8.dp,
            )
            .then(if (isError) Modifier.semantics { stateDescription = "Error" } else Modifier),
        enabled = enabled,
        isError = isError,
        singleLine = true,
        label = { Text(label, style = OmenTheme.typography.label.toTextStyle()) },
        placeholder = placeholder?.let { { Text(it, style = OmenTheme.typography.body.toTextStyle()) } },
        textStyle = OmenTheme.typography.body.toTextStyle(),
        keyboardOptions = KeyboardOptions(keyboardType = keyboardType),
        visualTransformation = visualTransformation,
        interactionSource = interactionSource,
        colors = OutlinedTextFieldDefaults.colors(
            focusedTextColor = colors.textPrimary,
            unfocusedTextColor = colors.textPrimary,
            disabledTextColor = colors.textTertiary,
            focusedBorderColor = colors.focusRing,
            unfocusedBorderColor = colors.border,
            errorBorderColor = colors.data.riskHigh,
            disabledBorderColor = colors.border,
            focusedLabelColor = colors.textPrimary,
            unfocusedLabelColor = colors.textSecondary,
            errorLabelColor = colors.data.riskHigh,
            cursorColor = colors.accent,
        ),
    )
}
