package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Data-source honesty categories the SignalList exposes (registry §2.3 data-* family).
 * The badge label mirrors this so the meaning survives grayscale — never a badge without
 * its label.
 */
enum class OmenSignalSource { Live, Stub, Mock, Unavailable }

/** Evidence role is independent of whether its source is currently available. */
enum class OmenEvidenceKind(val label: String) {
    Verified("Verified"), Projection("Projection"), Model("Model"),
    Inference("Inference"), Limitation("Limitation"),
}

/**
 * Transport-neutral native binding for `decision-capabilities.v1`.
 *
 * It belongs to the design-system semantic layer, not to an individual screen, so every
 * feature can preserve the server's distinction between availability and evidence role while
 * choosing its own layout. Wire values remain strings so an unknown future value fails safe.
 */
data class OmenDecisionCapability(
    val name: String?,
    val state: String?,
    val used: Boolean?,
    val kind: String?,
    val source: String?,
    val statement: String?,
    val observedAt: String? = null,
    val freshUntil: String? = null,
    val reasonCode: String? = null,
    val coverageState: String? = null,
    val reconciliationState: String? = null,
)

/** One row in a SignalList. `detail` is optional secondary text under the label. */
data class OmenSignalItem(
    val label: String,
    val source: OmenSignalSource,
    val detail: String? = null,
    val kind: OmenEvidenceKind? = null,
    /**
     * **Did this input change the answer?** A separate question from whether it could be read.
     * `shared-decision-context.v1`: *"a resolved source is not described as decision-making
     * evidence until an engine marks it used"*. `capability-expression-v1.md` needs this axis to
     * tell two of its four presentation classes apart. `null` means the server did not say,
     * which is not `false`. iOS mirror: `OmenSignalItem.used`.
     */
    val used: Boolean? = null,
)

/**
 * Registry §3.2 SignalList. Renders a list of data-source signals as badge + text rows so
 * a user can see, at a glance, which parts of a recommendation come from live vs. stubbed
 * vs. mock data. Empty list renders nothing (upstream decides whether to hide or replace
 * with a state surface).
 */
@Composable
fun OmenSignalList(
    signals: List<OmenSignalItem>,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        for (signal in signals) {
            SignalRow(signal)
        }
    }
}

@Composable
private fun SignalRow(signal: OmenSignalItem) {
    val (tone, label) = when (signal.source) {
        OmenSignalSource.Live -> OmenBadgeTone.Live to "Live"
        OmenSignalSource.Stub -> OmenBadgeTone.Stub to "Stub"
        OmenSignalSource.Mock -> OmenBadgeTone.Mock to "Mock"
        OmenSignalSource.Unavailable -> OmenBadgeTone.Unavailable to "Unavailable"
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics {
                contentDescription = listOfNotNull(label, signal.kind?.label, signal.label, signal.detail)
                    .joinToString(". ")
            },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
        verticalAlignment = Alignment.Top,
    ) {
        OmenBadge(label = label, tone = tone)
        Column(
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                text = signal.label,
                style = OmenTheme.typography.body.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            val detail = signal.detail
            if (detail != null) {
                Text(
                    text = detail,
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
        }
    }
}
