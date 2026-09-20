package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.feature.api.MoveReceipt
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.app.feature.shell.OmenScreenContext
import com.slopssaloon.omen.app.feature.shell.OmenScreenHeaderControls
import com.slopssaloon.omen.app.feature.shell.OmenScreenSwitcherBar
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenConfidenceBand
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

// ---------------------------------------------------------------------------------------------
// J6, "the receipts" — the Compose half.
//
// `Ledger.dc.html` and `LedgerDetail.dc.html`. Mirrored from
// `App/CommandCenter/OmenLedgerScreens.swift` so a contact sheet compares the canvas against one
// product rather than two.
//
// The reasoning behind every rule here is written out at length in the Swift file and is NOT
// restated — a copied rule is a second source of truth and the copy is the one that goes stale.
// The two that decide this file's shape, in one line each:
//
//   · **The Ledger's honesty rule is narrower than the general one.** Verified outcome,
//     self-reported action and unknown follow-through stay visually AND semantically separate,
//     so [OmenLedgerAction] and [OmenLedgerOutcome] are two types with no union between them and
//     self-reported wears registry §2.3's **dotted** carrier.
//   · **`LedgerDetail` is an immutable snapshot.** Nothing on it is re-read at view time, and
//     `issued_at` is only meaningful with `issued_at_timezone` — so a bare UTC wall clock is
//     never rendered. See [issuedLabel].
// ---------------------------------------------------------------------------------------------

// MARK: State

/** Who says the user did what the row claims they did. */
enum class OmenLedgerProvenance { Verified, SelfReported }

/**
 * What the user did about the call. **Not** what happened afterwards.
 *
 * [Unknown] is a case rather than an absence: an action slot rendered empty is read as
 * "followed", which is the flattering reading and the wrong one.
 */
sealed interface OmenLedgerAction {
    /**
     * Who says so — and `null` **only** for [Unknown].
     *
     * Declared on the interface rather than read with a `when` at each call site, because the
     * whole point of the type is that a caller cannot forget to ask. [Followed] and [Passed]
     * narrow it to non-null, which is Kotlin's covariant `val` override: a followed action
     * always has a provenance, and an unknown one cannot have.
     */
    val provenance: OmenLedgerProvenance?

    data class Followed(override val provenance: OmenLedgerProvenance) : OmenLedgerAction
    data class Passed(override val provenance: OmenLedgerProvenance) : OmenLedgerAction
    data object Unknown : OmenLedgerAction {
        override val provenance: OmenLedgerProvenance? = null
    }

    /**
     * [Voice.Row] is the Ledger's terse chip; [Voice.Receipt] is `LedgerDetail`'s sentence.
     *
     * Two artboards, two registers, **one set of cases**. `Ledger.dc.html` draws "Followed" in a
     * strip of four rows where a sentence per row would turn a record into an essay;
     * `LedgerDetail.dc.html` draws "You followed it", which is right on a screen about exactly
     * one call.
     *
     * Splitting the *words* while keeping the *cases* costs one parameter and keeps the thing
     * that actually matters — that action and outcome are separate values no code path can
     * merge — in exactly one place.
     */
    enum class Voice { Row, Receipt }

    val label: String get() = label(Voice.Row)

    fun label(voice: Voice): String = when (this) {
        is Followed -> if (voice == Voice.Receipt) "You followed it" else "Followed"
        is Passed -> if (voice == Voice.Receipt) "You passed on it" else "You passed"
        // One register. Nobody knowing what you did is not a fact that reads better as a
        // sentence, and inventing a second phrasing would be two strings to keep true.
        Unknown -> "Follow-through unknown"
    }
}

/**
 * What happened. The four values `moves-history.v2` maps the raw stored column onto.
 *
 * There is deliberately no `Win` or `Loss` here. `MovesHistory.ledgerOutcomeFor` translates, and
 * an untranslated token resolves to [NotVerified] — so there is no type in which a raw provider
 * value can reach this screen.
 */
enum class OmenLedgerOutcome(val label: String) {
    Worked("Worked"),
    DidNotWork("Didn’t work"),

    /** There is a result and nobody has verified it. Distinct from [Pending]. */
    NotVerified("Not verified"),
    Pending("Outcome pending"),
    ;

    /** The same split as [OmenLedgerAction.label], for the same reason. */
    fun label(voice: OmenLedgerAction.Voice): String = when (this) {
        Worked -> if (voice == OmenLedgerAction.Voice.Receipt) "It worked" else "Worked"
        DidNotWork -> if (voice == OmenLedgerAction.Voice.Receipt) "It did not work" else "Didn’t work"
        // Already statements rather than verdicts; they read correctly in both places.
        NotVerified, Pending -> label
    }
}

/** One `.lg` row. */
data class OmenLedgerCall(
    val id: String,
    val summary: String,
    val callType: String,
    val action: OmenLedgerAction,
    val outcome: OmenLedgerOutcome,
    /** `.rsn` — present only when there is something true to add. */
    val note: String? = null,
) {
    /**
     * VoiceOver hears the three facts in the order the rule separates them: what you did, who
     * says so, and what happened.
     */
    val accessibilityLabel: String
        get() = listOfNotNull(
            summary,
            callType,
            action.label,
            "Self-reported".takeIf { action.provenance == OmenLedgerProvenance.SelfReported },
            outcome.label,
            note,
        ).joinToString(". ")
}

/** One `.sh` heading and the rows under it. */
data class OmenLedgerGroup(val title: String, val count: String, val calls: List<OmenLedgerCall>)

/** A named capability the screen could not read, and the sentence saying so. */
data class OmenLedgerUnread(val capability: String, val sentence: String)

/** Everything `Ledger.dc.html` renders. */
data class OmenLedgerState(
    val kicker: String,
    val groups: List<OmenLedgerGroup>,
    val unread: OmenLedgerUnread? = null,
    val footnote: OmenDeskFootnote? = null,
)

/**
 * How one row of `LedgerDetail`'s evidence block stood at issue time.
 *
 * `not_requested` is absent from this enum on purpose: it is the fourth class and the contract
 * says it renders nowhere, so there must be no value that can carry it onto the screen.
 */
enum class OmenReceiptEvidenceClass { Used, ReadNotUsed, CouldNotRead }

/** One `.evr` row. */
data class OmenReceiptEvidence(
    val key: String,
    val statement: String,
    val kind: OmenReceiptEvidenceClass,
)

/**
 * Everything `LedgerDetail.dc.html` renders. An **immutable snapshot**: nothing here is re-read
 * at view time, including the capability list.
 *
 * [reasoning], [band] and [risk] are nullable and null is the common production case —
 * `move-detail.v1`'s `snapshot` carries `recommendation`, `issued_at` and `issued_at_timezone`
 * and nothing else. Filling them from the *current* brief would be the worst possible cheat on a
 * screen whose whole claim is that it shows what was true at issue time. A recorded contract gap.
 */
data class OmenLedgerReceiptState(
    val kicker: String,
    val issuedLabel: String,
    val callType: String,
    val headline: String,
    val status: String,
    val action: OmenLedgerAction,
    val outcome: OmenLedgerOutcome,
    val evidence: List<OmenReceiptEvidence>,
    val fairnessNote: String,
    val reasoning: String? = null,
    val band: OmenConfidenceBand? = null,
    val risk: OmenRiskLevel? = null,
    val noteLead: String? = null,
    val note: String? = null,
)

/**
 * `.scope`'s left-hand label, from `move-detail.v1`'s two fields.
 *
 * `CONTRACTS.md`: *"`issued_at` carries `issued_at_timezone`."* The artboard draws a wall-clock
 * time, which is only meaningful in a zone.
 *
 * **A bare UTC timestamp is not an acceptable fallback.** A receipt issued Tuesday 3:00 AM
 * Eastern renders as 07:00 in UTC, and a user checking whether Omen called it before or after
 * the waiver ran would read that as the wrong day's answer. With no zone the screen says the
 * zone is missing, which is the true statement.
 */
fun issuedLabel(issuedAt: String?, timezone: String?): String {
    if (issuedAt.isNullOrEmpty()) return "Issue time not recorded"
    val zone = timezone?.let { id ->
        // `ZoneId.of` throws on an unknown id; an unknown zone is the same refusal as a missing
        // one, never a silent fall back to UTC.
        runCatching { java.time.ZoneId.of(id) }.getOrNull()
    } ?: return "Issue time zone unavailable"
    val instant = runCatching { java.time.Instant.parse(issuedAt) }.getOrNull()
        ?: runCatching { java.time.OffsetDateTime.parse(issuedAt).toInstant() }.getOrNull()
        ?: return "Issue time not recorded"
    val formatter = java.time.format.DateTimeFormatter
        .ofPattern("EEE h:mm a", java.util.Locale.US)
        .withZone(zone)
    return "Issued ${formatter.format(instant)}"
}

// MARK: Ledger

/**
 * J6, screen one: the record.
 *
 * `Ledger.dc.html`, declared a **scroll** in the canvas README.
 */
@Composable
fun OmenLedgerScreen(
    state: OmenLedgerState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onOpenCall: ((OmenLedgerCall) -> Unit)? = null,
) {
    LedgerScrollShell(modifier = modifier, context = context) {
        LedgerHeader(state.kicker, "The Ledger", onOpenAccount)

        state.unread?.let {
            LedgerUnreadSection(
                it,
                Modifier
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step12),
            )
        }

        state.groups.forEach { group ->
            LedgerSectionHeader(group.title, group.count)
            group.calls.forEach { call -> LedgerRow(call, onOpenCall) }
        }

        state.footnote?.let {
            Spacer(modifier = Modifier.height(OmenTheme.spacing.step12))
            LedgerFootnoteStrip(it)
        }
    }
}

/**
 * One `.lg`.
 *
 * A row is clickable only when there is a receipt to open. A row that looks tappable and is not
 * is the same lie `OmenLeagueSwitcherBar` refuses to tell with its chevron.
 */
@Composable
private fun LedgerRow(call: OmenLedgerCall, onOpenCall: ((OmenLedgerCall) -> Unit)?) {
    val borderSubtle = OmenTheme.color.textPrimary.copy(alpha = 0.05f)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .then(if (onOpenCall == null) Modifier else Modifier.clickable { onOpenCall(call) })
            // The artboard's `.lg` is 10px 16px. The vertical padding is raised to 12 so the
            // tappable row clears the 48dp Android floor on its own content rather than growing
            // the type. Recorded drift: 2dp of vertical padding.
            .heightIn(min = 48.dp)
            .padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12)
            .drawBehind {
                drawRect(
                    color = borderSubtle,
                    topLeft = Offset(0f, size.height - 1.dp.toPx()),
                    size = Size(size.width, 1.dp.toPx()),
                )
            }
            .semantics { contentDescription = call.accessibilityLabel },
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
            verticalAlignment = Alignment.Top,
        ) {
            Text(
                call.summary,
                modifier = Modifier.weight(1f),
                style = OmenTheme.typography.name.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                call.callType,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
                maxLines = 1,
            )
        }
        LedgerOutcomeStrip(call.action, call.outcome)
        call.note?.let {
            Text(it, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        }
    }
}

/**
 * `.outcome` — the chip strip.
 *
 * **Action first, then provenance, then outcome.** Four of the artboard's five rows are drawn in
 * that order and the fifth puts the outcome first; one row differing from four is a drawing slip
 * rather than a second pattern, so the order is normalised here and the difference is recorded.
 *
 * The strip is `clearAndSetSemantics {}` because the row above already speaks all three facts in
 * one sentence — without it VoiceOver reads them twice, once merged and once as loose chips.
 */
@Composable
private fun LedgerOutcomeStrip(
    action: OmenLedgerAction,
    outcome: OmenLedgerOutcome,
    voice: OmenLedgerAction.Voice = OmenLedgerAction.Voice.Row,
) {
    Row(
        modifier = Modifier.clearAndSetSemantics { },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        LedgerChip(
            action.label(voice),
            color = if (action is OmenLedgerAction.Followed) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
        )
        if (action.provenance == OmenLedgerProvenance.SelfReported) {
            LedgerSeparator()
            // `.o-s` — a **dotted** underline, `text-secondary`. Registry §2.3's provenance
            // carrier, and the one thing on this screen that must never be blended with a
            // verified row. Compose has no dotted `TextDecoration`, so the dotted rule is drawn
            // under the text and the word itself is the second carrier (D7: never form alone).
            val dotted = OmenTheme.color.textSecondary
            Text(
                "Self-reported",
                modifier = Modifier.drawBehind {
                    drawLine(
                        color = dotted,
                        start = Offset(0f, size.height),
                        end = Offset(size.width, size.height),
                        strokeWidth = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(1.5.dp.toPx(), 2.5.dp.toPx())),
                    )
                },
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }
        LedgerSeparator()
        // `.o-p` is italic and **deliberately not brass**: giving an unresolved call the accent
        // would read as a result.
        Text(
            outcome.label(voice),
            style = OmenTheme.typography.micro.toTextStyle().let {
                if (outcome == OmenLedgerOutcome.Pending) it.copy(fontStyle = FontStyle.Italic) else it
            },
            color = if (outcome == OmenLedgerOutcome.Worked) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
        )
    }
}

@Composable
private fun LedgerChip(text: String, color: Color) {
    Text(text, style = OmenTheme.typography.micro.toTextStyle(), color = color)
}

@Composable
private fun LedgerSeparator() {
    Text("·", style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
}

// MARK: LedgerDetail

/**
 * J6, screen two: one call, in full — including a loss.
 *
 * `LedgerDetail.dc.html`, declared a **scroll**, and an immutable snapshot.
 */
@Composable
fun OmenLedgerDetailScreen(
    state: OmenLedgerReceiptState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
) {
    LedgerScrollShell(modifier = modifier, context = context) {
        LedgerHeader(state.kicker, "The receipt", onOpenAccount)
        ReceiptScope(state.issuedLabel)
        ReceiptCall(state)
        LedgerSectionHeader("What happened", state.status)
        ReceiptHappened(state)
        LedgerSectionHeader("The evidence as it stood then", null)
        OmenCard(
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
            contentPadding = PaddingValues(OmenTheme.spacing.step12),
        ) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10)) {
                state.evidence.forEach { ReceiptEvidenceRow(it) }
            }
        }
        ReceiptFairnessNote(state.fairnessNote)
    }
}

/** `.scope` — when it was issued, and the promise that it has not changed since. */
@Composable
private fun ReceiptScope(issuedLabel: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12)
            .semantics { contentDescription = "$issuedLabel. This receipt is immutable." },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        Text(
            issuedLabel,
            modifier = Modifier.weight(1f),
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
        Text("Immutable", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
    }
}

/** `.call` — the recommendation as it was made. Confidence is a **band**, never a percentage. */
@Composable
private fun ReceiptCall(state: OmenLedgerReceiptState) {
    val accent = OmenTheme.color.accent
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step10)
            .clip(RoundedCornerShape(16.dp))
            .background(OmenTheme.color.surface2)
            .drawBehind {
                drawRect(
                    color = accent.copy(alpha = 0.34f),
                    topLeft = Offset(0f, 0f),
                    size = Size(size.width, 1.dp.toPx()),
                )
            }
            .padding(OmenTheme.spacing.step14),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
    ) {
        Text(state.callType, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        Text(state.headline, style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
        state.reasoning?.let {
            Text(it, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        }
        if (state.band != null || state.risk != null) {
            Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step14)) {
                state.band?.let {
                    Text(it.label, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accentHover)
                }
                state.risk?.let {
                    Text(
                        when (it) {
                            OmenRiskLevel.Low -> "Low risk"
                            OmenRiskLevel.Medium -> "Medium risk"
                            OmenRiskLevel.High -> "High risk"
                        },
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                    )
                }
            }
        }
    }
}

/** `.card` under "What happened" — the action and the outcome, still separate. */
@Composable
private fun ReceiptHappened(state: OmenLedgerReceiptState) {
    val spoken = listOfNotNull(
        state.action.label(OmenLedgerAction.Voice.Receipt),
        "Self-reported".takeIf { state.action.provenance == OmenLedgerProvenance.SelfReported },
        state.outcome.label(OmenLedgerAction.Voice.Receipt),
        state.noteLead,
        state.note,
    ).joinToString(". ")
    OmenCard(
        modifier = Modifier
            .padding(horizontal = OmenTheme.spacing.step16)
            .semantics { contentDescription = spoken },
        contentPadding = PaddingValues(OmenTheme.spacing.step12),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10)) {
            LedgerOutcomeStrip(state.action, state.outcome, OmenLedgerAction.Voice.Receipt)
            if (state.noteLead != null || state.note != null) {
                Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
                    // `.rsn b` is `text-primary` and bold — the one clause that must not be
                    // skimmed. On the artboard it is "Williams went for 21.4."
                    state.noteLead?.let {
                        Text(
                            it,
                            style = OmenTheme.typography.bodySmall.toTextStyle().copy(fontWeight = FontWeight.Bold),
                            color = OmenTheme.color.textPrimary,
                        )
                    }
                    state.note?.let {
                        Text(
                            it,
                            modifier = Modifier.weight(1f),
                            style = OmenTheme.typography.bodySmall.toTextStyle(),
                            color = OmenTheme.color.textSecondary,
                        )
                    }
                }
            }
        }
    }
}

/**
 * One `.evr`.
 *
 * The three classes differ by prominence, colour role and wording — **never by an icon**. The
 * class is also spoken, because the visual carriers do not survive into the accessibility tree
 * and the class is the part a reader must not miss.
 */
@Composable
private fun ReceiptEvidenceRow(evidence: OmenReceiptEvidence) {
    val spokenPrefix = when (evidence.kind) {
        OmenReceiptEvidenceClass.Used -> "Read and used. "
        OmenReceiptEvidenceClass.ReadNotUsed -> "Read, not used. "
        OmenReceiptEvidenceClass.CouldNotRead -> "Could not read. "
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "${evidence.key}. $spokenPrefix${evidence.statement}" },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            evidence.key,
            modifier = Modifier.width(84.dp),
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
        when (evidence.kind) {
            OmenReceiptEvidenceClass.Used -> Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                verticalAlignment = Alignment.Top,
            ) {
                Text(
                    evidence.statement,
                    modifier = Modifier.weight(1f, fill = false),
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
                // `.ds.live` — a **word**, which is what `capability-symbols-v1.md` means.
                Text(
                    "Live",
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(OmenTheme.color.surface3)
                        .padding(horizontal = OmenTheme.spacing.step6, vertical = OmenTheme.spacing.step2),
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                )
            }
            // Named, de-emphasised, and carrying **no chip**. The chip is evidence styling and
            // `capability-expression-v1.md` acceptance rule 3 forbids it on a `used: false`
            // input — the payload hands you the whole list and this is the easiest claim to
            // overreach on.
            OmenReceiptEvidenceClass.ReadNotUsed -> Text(
                evidence.statement,
                modifier = Modifier.weight(1f),
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
            // `.pv-none` — a **dashed** underline, `text-tertiary`. The artboard's own carrier
            // for "Omen did not read this and is not pretending to."
            OmenReceiptEvidenceClass.CouldNotRead -> Text(
                evidence.statement,
                modifier = Modifier.weight(1f),
                style = OmenTheme.typography.bodySmall.toTextStyle()
                    .copy(textDecoration = TextDecoration.Underline),
                color = OmenTheme.color.textTertiary,
            )
        }
    }
}

/**
 * `.note` — the fairness note, in the artboard's own words, and the point of the screen:
 * *"Losses stay in the Ledger — a record that only shows wins is marketing."*
 */
@Composable
private fun ReceiptFairnessNote(note: String) {
    Text(
        note,
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12)
            .clip(RoundedCornerShape(10.dp))
            .background(OmenTheme.color.surface1)
            .padding(OmenTheme.spacing.step12),
        style = OmenTheme.typography.bodySmall.toTextStyle(),
        color = OmenTheme.color.textSecondary,
    )
}

// MARK: Shared chrome

@Composable
private fun LedgerScrollShell(
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg),
    ) {
        OmenScreenSwitcherBar(context)
        Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
            content()
            Spacer(modifier = Modifier.height(OmenTheme.spacing.step16))
        }
    }
}

/**
 * `.top` — the eyebrow, the title, and E017's two controls.
 *
 * Both J6 artboards draw a lone avatar here. E017 was resolved by the founder on 2026-09-18 as
 * **both** controls — help then account — so the extra width is recorded drift carried forward
 * from J2, not a decision retaken here.
 */
@Composable
private fun LedgerHeader(kicker: String, title: String, onOpenAccount: (() -> Unit)?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.Bottom,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
        ) {
            Text(kicker, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
            Text(title, style = OmenTheme.typography.screenTitle.toTextStyle(), color = OmenTheme.color.textPrimary)
        }
        OmenScreenHeaderControls(OmenHelpDestination.CommandCenter, onOpenAccount = onOpenAccount)
    }
}

/** `.sh` — an uppercase label and an uppercase count. No link: the heading is not a destination. */
@Composable
private fun LedgerSectionHeader(title: String, trailing: String?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12, bottom = OmenTheme.spacing.step6)
            .semantics { contentDescription = listOfNotNull(title, trailing).joinToString(", ") },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            title,
            modifier = Modifier.weight(1f),
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
        trailing?.let {
            Text(it, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
    }
}

/**
 * The *could not read* class. Named plus a sentence, dashed, and **never dropped to make room** —
 * `capability-expression-v1.md` singles this class out as the one that must survive truncation,
 * since it is the only one that costs the reader something.
 */
@Composable
private fun LedgerUnreadSection(unread: OmenLedgerUnread, modifier: Modifier = Modifier) {
    val border = OmenTheme.color.border
    Column(
        modifier = modifier
            .fillMaxWidth()
            .drawBehind {
                drawRoundRect(
                    color = border,
                    style = Stroke(
                        width = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx())),
                    ),
                    cornerRadius = androidx.compose.ui.geometry.CornerRadius(10.dp.toPx()),
                )
            }
            .padding(OmenTheme.spacing.step12)
            .semantics {
                contentDescription = "${unread.capability}. Could not read. ${unread.sentence}"
            },
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
    ) {
        Text(unread.capability, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        Text(unread.sentence, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
    }
}

/** `.oneline` — the foot strip, carrying the *read, not used* class. */
@Composable
private fun LedgerFootnoteStrip(footnote: OmenDeskFootnote) {
    Column(modifier = Modifier.fillMaxWidth().padding(horizontal = OmenTheme.spacing.step16)) {
        Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(OmenTheme.color.borderSubtle))
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = OmenTheme.spacing.step10)
                .semantics {
                    contentDescription = listOfNotNull(footnote.text, footnote.emphasis).joinToString(" ")
                },
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
        ) {
            Text(footnote.text, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
            footnote.emphasis?.let {
                Text(
                    it,
                    style = OmenTheme.typography.bodySmall.toTextStyle().copy(fontWeight = FontWeight.Bold),
                    color = OmenTheme.color.textPrimary,
                )
            }
        }
    }
}

// MARK: Binding the receipts to the real reads

/**
 * Builds the Ledger from the rows the Command Center view model already holds.
 *
 * **The counts are derived from the rows in hand and say so.** `moves-history.v2` is a scoped
 * index with a server-side `limit`, so a count composed here is a count of the page, not of the
 * season. Until the contract carries a group total, this renders what is true of what arrived.
 *
 * [unread] and [footnote] are passed in rather than inferred: whether a capability was
 * unavailable is the server's statement, and a client inferring it from an empty list would be
 * manufacturing the gap `capability-expression-v1.md` forbids inventing.
 */
fun omenLedgerStateFrom(
    entries: List<OmenLedgerEntry>,
    unread: OmenLedgerUnread? = null,
    footnote: OmenDeskFootnote? = null,
): OmenLedgerState {
    val buckets = LinkedHashMap<String, MutableList<OmenLedgerCall>>()
    entries.forEach { entry ->
        buckets.getOrPut(entry.period) { mutableListOf() }.add(
            OmenLedgerCall(
                id = entry.id,
                summary = entry.summary,
                callType = entry.callType.lowercase().replaceFirstChar { it.uppercase() },
                action = entry.action,
                outcome = entry.ledgerOutcome,
            ),
        )
    }
    val groups = buckets.map { (period, calls) ->
        val open = calls.count { it.outcome == OmenLedgerOutcome.Pending }
        val closed = calls.size - open
        val count = when {
            open == 0 -> "$closed closed"
            closed == 0 -> "$open open"
            else -> "$open open · $closed closed"
        }
        OmenLedgerGroup(
            title = period.lowercase().replaceFirstChar { it.uppercase() },
            count = count,
            calls = calls,
        )
    }
    return OmenLedgerState(
        kicker = if (entries.size == 1) "1 call" else "${entries.size} calls",
        groups = groups,
        unread = unread,
        footnote = footnote,
    )
}

/**
 * `move-detail.v1` → the receipt screen.
 *
 * ## What this contract does not carry, and is therefore not drawn
 *
 * `LedgerDetail.dc.html` draws a confidence band, a risk level and a reasoning sentence under the
 * headline. **`move-detail.v1` has none of the three.** So the production receipt renders thinner
 * than its artboard and the three fields stay null rather than being filled from somewhere
 * plausible. Taking the band from the *current* brief would be the obvious cheat and the worst
 * possible one on a screen that exists to say what was true at issue time. A recorded contract
 * gap, not a papered-over one.
 */
fun omenLedgerReceiptStateFrom(entry: OmenLedgerEntry, receipt: MoveReceipt): OmenLedgerReceiptState {
    val callType = entry.callType.lowercase().replaceFirstChar { it.uppercase() }
    return OmenLedgerReceiptState(
        kicker = "${entry.period.lowercase().replaceFirstChar { it.uppercase() }} · $callType",
        issuedLabel = issuedLabel(receipt.issuedAt, receipt.timezone),
        callType = callType,
        headline = receipt.recommendation ?: entry.summary,
        status = if (entry.ledgerOutcome == OmenLedgerOutcome.Pending) "Open" else "Closed",
        action = entry.action,
        outcome = entry.ledgerOutcome,
        noteLead = receipt.outcome.takeIf { it.isNotBlank() },
        note = receipt.action.takeIf { it.isNotBlank() },
        evidence = receiptEvidence(receipt),
        fairnessNote = receipt.fairnessNote,
    )
}

/**
 * The three presentation classes, from the axis that actually answers them.
 *
 * `capabilities` carries `state` and `used` — the two independent axes
 * `capability-expression-v1.md` is built on — so when present it is the only correct source.
 * `evidence_at_the_time` carries `kind`, which is the input's **role** and is explicitly
 * independent of availability; reading a class off `kind` would be the `U1` defect again, a
 * treatment making a claim the field never made.
 *
 * With no `capabilities` block the *read, not used* class is **unexpressible**, and that is
 * stated rather than approximated. A `limitation` row is the one `kind` that does assert
 * something was not read, so it maps; everything else renders as evidence.
 */
private fun receiptEvidence(receipt: MoveReceipt): List<OmenReceiptEvidence> {
    if (receipt.capabilities.isNotEmpty()) {
        return receipt.capabilities.mapNotNull { capability ->
            val name = capability.name?.takeIf { it.isNotBlank() } ?: return@mapNotNull null
            val state = capability.state?.lowercase()
            // `not_requested` renders **nowhere**, on any screen. Rule 2, and the one most likely
            // to be got wrong: a profile only requests what it needs, and printing "we didn't
            // read trade rosters" on a week where trade was never relevant manufactures a gap.
            if (state == "not_requested") return@mapNotNull null
            val kind = when {
                state == "live" && capability.used == true -> OmenReceiptEvidenceClass.Used
                state == "live" -> OmenReceiptEvidenceClass.ReadNotUsed
                // `pending` at render resolves to "could not read", never to a spinner.
                else -> OmenReceiptEvidenceClass.CouldNotRead
            }
            OmenReceiptEvidence(
                key = name.replace('_', ' ').replaceFirstChar { it.uppercase() },
                statement = capability.statement ?: "Omen recorded no statement for this input.",
                kind = kind,
            )
        }
    }

    return receipt.evidence.mapIndexed { index, (kind, statement) ->
        OmenReceiptEvidence(
            key = kind.replace('_', ' ').replaceFirstChar { it.uppercase() } + if (index > 0) " ${index + 1}" else "",
            statement = statement,
            kind = if (kind.lowercase() == "limitation") {
                OmenReceiptEvidenceClass.CouldNotRead
            } else {
                OmenReceiptEvidenceClass.Used
            },
        )
    }
}
