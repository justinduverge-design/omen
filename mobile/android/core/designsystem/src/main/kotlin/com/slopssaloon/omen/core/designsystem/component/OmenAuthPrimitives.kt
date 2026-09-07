package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * The auth and connect canvas primitives, moved out of `app/` on 2026-09-07.
 *
 * These lived as `private @Composable` functions inside `OmenAuthFlow.kt` and `ConnectScreen.kt`,
 * which is what `PrimitiveEnforcementTest` had been failing on: `app/` sources may not compose
 * raw Material 3 primitives or raw `Color(0xNNNNNNNN)` literals, and `:core:designsystem` is the
 * layer that is allowed to. This module composes the raw primitives so feature code does not
 * have to.
 *
 * **This mirrors the iOS fix, deliberately and to the letter.** The identical scanner caught the
 * identical defect in `SignInView.swift` / `ConnectView.swift` on 2026-09-05, and the obvious
 * move — allowlisting both files — was rejected there because exempting a 500-line file for one
 * line also blanket-exempts every violation added to it later. Android's allowlist stays empty
 * for the same reason. iOS mirrors: `OmenAuthPrimaryButton.swift`, `OmenCanvasTextAction.swift`.
 */

/**
 * The full-width primary action on the auth canvas: "Continue", "Sign in with Google",
 * "Send me a code".
 *
 * Distinct from [OmenButton]: this carries a leading provider glyph and an inline loading state
 * that replaces the glyph rather than sitting beside it. Folding it into `OmenButton` would mean
 * adding both to a primitive used on every other screen — a wider change than this move, and its
 * own decision. iOS mirror: `OmenAuthPrimaryButton`.
 */
@Composable
fun OmenAuthPrimaryButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    loading: Boolean = false,
    icon: (@Composable () -> Unit)? = null,
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
        modifier = modifier
            .fillMaxWidth()
            .heightIn(min = 54.dp)
            .semantics { if (loading) contentDescription = "$text, loading" },
    ) {
        Row(
            horizontalArrangement = Arrangement.spacedBy(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (loading) {
                CircularProgressIndicator(
                    strokeWidth = 2.dp,
                    color = if (enabled) OmenTheme.color.textOnAccent else OmenTheme.color.textTertiary,
                    modifier = Modifier.size(18.dp),
                )
            }
            if (icon != null && !loading) icon()
            Text(text, style = OmenTheme.typography.h3.toTextStyle(), fontWeight = FontWeight.SemiBold)
        }
    }
}

/**
 * The icon-only sibling of [OmenAuthPrimaryButton] — the row of provider tiles under the primary
 * action, and the provider rows on the Connect canvas.
 *
 * `surface1`, not the `Color(0xFF141416)` literal both call sites carried. That literal is the
 * exact defect class the scanner was written after: a dark-only near-black tile renders dark
 * text on a light background, which is how the Connect screen's provider names went invisible in
 * light mode on iOS. `surface1` is trait-aware and answers `#1C1C1E` dark / `#FFFFFF` light.
 * iOS mirror: `OmenAuthIconTile`.
 */
@Composable
fun OmenAuthTile(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    contentDescription: String? = null,
    enabled: Boolean = true,
    loading: Boolean = false,
    shape: RoundedCornerShape = RoundedCornerShape(10.dp),
    content: @Composable () -> Unit,
) {
    Surface(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = shape,
        color = OmenTheme.color.surface1,
        contentColor = if (enabled && !loading) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
        border = BorderStroke(1.dp, OmenTheme.color.border),
        modifier = if (contentDescription != null) {
            modifier.semantics { this.contentDescription = contentDescription }
        } else {
            modifier
        },
    ) {
        Box(contentAlignment = Alignment.Center) {
            if (loading) {
                CircularProgressIndicator(
                    strokeWidth = 2.dp,
                    color = OmenTheme.color.textPrimary,
                    modifier = Modifier.size(18.dp),
                )
            } else {
                content()
            }
        }
    }
}

/**
 * A flat, text-only tappable action — "Use a different email", "Resend the code", "Skip".
 *
 * **This existed twice, privately, in `OmenAuthFlow.kt` and `ConnectScreen.kt` — and the two
 * copies had already drifted.** Auth's took `color`, `fontWeight` and `height`; Connect's had
 * hardcoded them and rendered its disabled state differently (`textTertiary.copy(alpha = 0.45f)`
 * where Auth used a flat `textTertiary`). Neither author could have known, because `private` made
 * each invisible to the other. That divergence is the whole argument for this function: one
 * definition cannot disagree with itself.
 *
 * The parameters are Auth's, because they are the superset; the defaults reproduce Connect's
 * hardcoded values so its call sites are unchanged in appearance. The one deliberate change is
 * the **disabled colour, resolved to Auth's flat `textTertiary`** — the same resolution the iOS
 * merge made, so the two platforms do not re-diverge at the point of being unified.
 */
@Composable
fun OmenCanvasTextAction(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    color: Color = OmenTheme.color.textTertiary,
    fontWeight: FontWeight = FontWeight.SemiBold,
    height: Dp = 48.dp,
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
        modifier = modifier.fillMaxWidth().height(height),
    ) {
        Text(
            text = text,
            style = OmenTheme.typography.label.toTextStyle(),
            fontWeight = fontWeight,
            textAlign = TextAlign.Center,
        )
    }
}
