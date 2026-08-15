package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.semantics
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.1 **Tooltip / Help**, built for M6-ContextualHelp.
 *
 * Authority: `Blueprints/specs/mobile/m4-help-support-v1.md` §1–§5. This is the contextual half
 * of that contract — a short explanation of the surface a person is already looking at. The
 * durable Help + Support destination is `OmenHelpSupportScreen` and is untouched here.
 *
 * Rules this component exists to enforce (spec §2):
 * - never unsolicited — nothing but the person's own tap can open it;
 * - never blocks a decision, so it owns no confirm/deny action and gates nothing;
 * - dismissing returns to the exact prior state, which is why it holds no state beyond its own
 *   visibility and reports nothing back to its host.
 *
 * The DS module stays product-agnostic: the types below carry no Omen concept, and the
 * per-destination copy lives in the feature layer at `app/feature/help/ContextualHelpContent.kt`.
 */
data class OmenHelpTip(val label: String, val body: String)

/**
 * A short, local explanation of one surface.
 *
 * Spec §4: "A contextual surface that needs more than a short explanation routes to the durable
 * Help Center instead of becoming a dense tooltip." [tips] is capped at [MAX_TIPS] so that stays
 * a rule rather than a matter of taste.
 */
data class OmenHelpTopic(
    val title: String,
    val summary: String,
    val tips: List<OmenHelpTip>,
) {
    companion object {
        /** Above this, content belongs in Help + Support, not in a contextual surface. */
        const val MAX_TIPS = 4
    }
}

/**
 * The `What is this?` affordance: an icon-only control that presents its topic on tap.
 *
 * Built on [OmenIconButton] so the 48dp touch target, focus ring, and required content
 * description come from the approved primitive rather than being restated here.
 *
 * [icon] is a slot rather than a built-in glyph: drawable resources live in the app module
 * (`res/drawable/ic_help.xml`), and `:core:designsystem` stays free of product resources. The
 * feature-layer `OmenHelpButton` supplies it, so no screen wires the glyph by hand.
 */
@Composable
fun OmenContextualHelpButton(
    topic: OmenHelpTopic,
    modifier: Modifier = Modifier,
    size: OmenIconButtonSize = OmenIconButtonSize.Md,
    icon: @Composable () -> Unit,
) {
    // rememberSaveable: a rotation while help is open should not silently close it.
    var visible by rememberSaveable(topic.title) { mutableStateOf(false) }

    OmenIconButton(
        // TalkBack reads the purpose *and* what will be explained, so the control stays
        // distinguishable when several sit on one screen (spec §5).
        contentDescription = "What is this? ${topic.title}",
        onClick = { visible = true },
        modifier = modifier,
        tone = OmenIconButtonTone.Neutral,
        size = size,
        icon = icon,
    )

    OmenContextualHelpSheet(
        topic = topic,
        visible = visible,
        // System Back dismisses this sheet before leaving the originating screen (spec §4),
        // which ModalBottomSheet routes through onDismissRequest for us.
        onDismissRequest = { visible = false },
    )
}

/** The presented explanation. Reading order is title, summary, then tips (spec §5). */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OmenContextualHelpSheet(
    topic: OmenHelpTopic,
    visible: Boolean,
    onDismissRequest: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (!visible) return
    val sheetState = rememberModalBottomSheetState()
    val spacing = OmenTheme.spacing
    val colors = OmenTheme.color

    ModalBottomSheet(
        onDismissRequest = onDismissRequest,
        sheetState = sheetState,
        modifier = modifier,
        containerColor = colors.surface2,
        contentColor = colors.textPrimary,
    ) {
        Column(
            Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                // At large font scales the tips outrun the sheet's default height. The
                // content scrolls, and this keeps the last line clear of the gesture bar
                // instead of ending underneath it.
                .navigationBarsPadding()
                .padding(horizontal = spacing.cardInterior)
                .padding(bottom = spacing.bodyToFooter),
            verticalArrangement = Arrangement.spacedBy(spacing.headerToBody),
        ) {
            Text(
                topic.title,
                style = OmenTheme.typography.h2.toTextStyle(),
                color = colors.textPrimary,
                modifier = Modifier.semantics { heading() },
            )
            Text(
                topic.summary,
                style = OmenTheme.typography.body.toTextStyle(),
                // Registry §3.1 Tooltip/Help names `surface-2` + `text-primary`. That pairing
                // is not decorative: `text-secondary` on `surface-2` measures 4.43:1 in light
                // mode — under AA. Caught on iOS by Apple's accessibility audit
                // ("Contrast nearly passed") and corrected on both platforms.
                color = colors.textPrimary,
            )
            Column(verticalArrangement = Arrangement.spacedBy(spacing.fieldToField)) {
                topic.tips.forEach { tip ->
                    Column(verticalArrangement = Arrangement.spacedBy(spacing.inputToHint)) {
                        Text(
                            tip.label,
                            style = OmenTheme.typography.label.toTextStyle(),
                            color = colors.accent,
                        )
                        Text(
                            tip.body,
                            style = OmenTheme.typography.bodySmall.toTextStyle(),
                            color = colors.textPrimary,
                        )
                    }
                }
            }
        }
    }
}
