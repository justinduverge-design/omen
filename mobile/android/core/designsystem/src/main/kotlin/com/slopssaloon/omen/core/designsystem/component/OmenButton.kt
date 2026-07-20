package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsFocusedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme
import com.slopssaloon.omen.core.designsystem.token.OmenMinTouchTarget
import com.slopssaloon.omen.core.designsystem.token.omenFocusRing

/** registry §3.1 Button row: primary/secondary/tertiary/danger/link. */
enum class OmenButtonVariant { Primary, Secondary, Tertiary, Danger, Link }

/** Which brand color drives Primary/Secondary/Tertiary — brass CTA vs verdigris AI-signal. */
enum class OmenButtonTone { Accent, Omen }

enum class OmenButtonSize { Sm, Md, Lg }

/**
 * Foundation Button (registry §3.1). Wraps Material3's `Button`/`OutlinedButton`/`TextButton` —
 * per the registry's own iOS/Android mapping row — so focus/press/ripple/disabled semantics come
 * from a well-tested base, with Omen's tone/token/focus-ring treatment layered on top.
 *
 * States covered from the outset: default, focus (via [omenFocusRing], driven by the button's
 * own [MutableInteractionSource] so it reflects real keyboard/D-pad focus, not a synthesized
 * model — brief §3), disabled (`enabled = false`), and loading (spinner + `stateDescription =
 * "Loading"` so TalkBack announces it; loading also disables the click, same as `enabled =
 * false`, per registry §3.1 required-states list).
 *
 * Danger and Link are fixed-color variants (crimson risk-high / accent-underline respectively);
 * [tone] only applies to Primary/Secondary/Tertiary, matching the registry's separate
 * "variants" vs "tones" axes.
 *
 * Text uses the `label` type role (typography brief §5: "Button and IconButton: `label`").
 * **Typography is not visually final** — [OmenTheme.typography]'s roles currently resolve to
 * system sans/serif/mono fallbacks, not real Alegreya files (font-file acquisition is a
 * separately approved, not-yet-made decision; see `OmenTypography.kt`).
 *
 * Android's general minimum interactive size is 48dp (registry §4); applied uniformly across
 * sm/md/lg here rather than only to the 44px "lg = hero size" figure the registry states, since
 * that figure reads as an iOS point value and 44 < the stated 48dp Android minimum — see the
 * handoff for this judgment call.
 */
@Composable
fun OmenButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: OmenButtonVariant = OmenButtonVariant.Primary,
    tone: OmenButtonTone = OmenButtonTone.Accent,
    size: OmenButtonSize = OmenButtonSize.Md,
    enabled: Boolean = true,
    loading: Boolean = false,
) {
    val colors = OmenTheme.color
    val interactionSource = remember { MutableInteractionSource() }
    val focused by interactionSource.collectIsFocusedAsState()
    val isInteractable = enabled && !loading
    val toneColor = if (tone == OmenButtonTone.Accent) colors.accent else colors.omen
    val shape = RoundedCornerShape(8.dp)

    val horizontalPadding = when (size) {
        OmenButtonSize.Sm -> OmenTheme.spacing.step12
        OmenButtonSize.Md -> OmenTheme.spacing.step16
        OmenButtonSize.Lg -> OmenTheme.spacing.step24
    }

    val buttonModifier = modifier
        .heightIn(min = OmenMinTouchTarget)
        .omenFocusRing(
            focused = focused,
            color = colors.focusRing,
            haloColor = colors.focusRingHalo,
            cornerRadius = 8.dp,
        )
        .then(if (loading) Modifier.semantics { stateDescription = "Loading" } else Modifier)

    val label: @Composable () -> Unit = {
        if (loading) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(16.dp),
                    strokeWidth = 2.dp,
                    color = LocalContentColor.current,
                )
                Text(text, style = OmenTheme.typography.label.toTextStyle())
            }
        } else {
            Text(
                text,
                style = OmenTheme.typography.label.toTextStyle(),
                fontWeight = FontWeight.Medium,
                textDecoration = if (variant == OmenButtonVariant.Link) TextDecoration.Underline else null,
            )
        }
    }

    when (variant) {
        OmenButtonVariant.Primary -> Button(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = isInteractable,
            shape = shape,
            interactionSource = interactionSource,
            colors = ButtonDefaults.buttonColors(
                containerColor = toneColor,
                contentColor = colors.textOnAccent,
                disabledContainerColor = colors.surface3,
                disabledContentColor = colors.textTertiary,
            ),
            contentPadding = PaddingValues(horizontal = horizontalPadding),
        ) { label() }

        OmenButtonVariant.Secondary -> OutlinedButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = isInteractable,
            shape = shape,
            interactionSource = interactionSource,
            border = BorderStroke(1.dp, if (isInteractable) toneColor else colors.border),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = toneColor,
                disabledContentColor = colors.textTertiary,
            ),
            contentPadding = PaddingValues(horizontal = horizontalPadding),
        ) { label() }

        OmenButtonVariant.Tertiary -> TextButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = isInteractable,
            shape = shape,
            interactionSource = interactionSource,
            colors = ButtonDefaults.textButtonColors(
                contentColor = toneColor,
                disabledContentColor = colors.textTertiary,
            ),
            contentPadding = PaddingValues(horizontal = horizontalPadding),
        ) { label() }

        OmenButtonVariant.Danger -> OutlinedButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = isInteractable,
            shape = shape,
            interactionSource = interactionSource,
            border = BorderStroke(1.dp, if (isInteractable) colors.data.riskHigh else colors.border),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = colors.data.riskHigh,
                disabledContentColor = colors.textTertiary,
            ),
            contentPadding = PaddingValues(horizontal = horizontalPadding),
        ) { label() }

        OmenButtonVariant.Link -> TextButton(
            onClick = onClick,
            modifier = buttonModifier,
            enabled = isInteractable,
            interactionSource = interactionSource,
            colors = ButtonDefaults.textButtonColors(
                contentColor = colors.accent,
                disabledContentColor = colors.textTertiary,
            ),
        ) { label() }
    }
}
