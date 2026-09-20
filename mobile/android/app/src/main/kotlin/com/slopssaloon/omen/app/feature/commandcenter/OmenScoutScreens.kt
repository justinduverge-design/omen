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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.app.feature.shell.OmenScreenContext
import com.slopssaloon.omen.app.feature.shell.OmenScreenHeaderControls
import com.slopssaloon.omen.app.feature.shell.OmenScreenSwitcherBar
import com.slopssaloon.omen.core.designsystem.component.OmenBadge
import com.slopssaloon.omen.core.designsystem.component.OmenBadgeTone
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenConfidenceBand
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

// ---------------------------------------------------------------------------------------------
// J5, "the scout's nest" — the Compose half.
//
// The six artboards of `screen-journeys-v1.md`'s fifth journey: `LeagueTable`, `LeagueDegraded`,
// `LeagueNoRosters`, `LeagueWaiver`, `WaiverNoMove` and `WaiverNotDetermined`. Two capability
// profiles: `league` and `waiver`. Mirrored from
// `App/CommandCenter/OmenScoutScreens.swift` so a contact sheet compares the canvas against one
// product rather than two.
//
// Six artboards, two screens. `LeagueTable`, `LeagueDegraded` and `LeagueNoRosters` are one
// screen in three states, and the wire's three are likewise — which is why this file declares
// `OmenLeagueTableScreen` and `OmenLeagueWireScreen` and not six composables.
//
// The section order is fixed by fact-of-record #16 as amended 2026-09-13: **your week (strip) →
// The Table → Trade targets → Waiver → Activity**. It is a scout's nest — a screen about the
// other eleven managers — so it runs terrain → opportunity → movement. Activity is last because
// it is partial on ESPN and Yahoo, and a degraded section high on a screen teaches people the
// whole screen is unreliable.
//
// The contract rules these screens exist to hold are written out in full in the Swift file
// rather than restated here — a copied rule is a second source of truth and the copy is the one
// that goes stale. In short: the cut line is drawn only where `playoff_picture.settings_known`
// is true, which is **Sleeper only**; `best_move.bid` is null and never `0`, so a missing bid
// renders nothing rather than "$0"; claim probability is never returned and has nowhere to go;
// `not_determined` gets neither a budget nor a claim order; `LeagueNoRosters` is a permanent
// provider limit and carries **no retry**; and an unread list is never drawn as an empty one.
//
// `OmenLeagueScreen` in this same package is NOT deleted — it is rewritten to resolve the
// destination's state and hand it to `OmenLeagueTableScreen`, which is the built artboard.
// ---------------------------------------------------------------------------------------------

// MARK: State

/**
 * A League section's availability. Per-section by contract — `league-overview.v1` reports each
 * section's `status` independently and the screen does the same.
 *
 * The third case is the one this journey adds over J2's. [ProviderLimit] is **not** an outage: it
 * is a permanent limit of this provider for this league, and the difference is load-bearing,
 * because an outage gets a retry and a limit must not. A single `Unread` case would have made the
 * two indistinguishable at the call site and the retry would have been drawn on both.
 */
sealed interface OmenScoutSection<out Value> {
    data class Read<Value>(val value: Value) : OmenScoutSection<Value>

    /** Could not read, and it might read next time. Retry is legitimate. */
    data class Unread(val capability: String, val sentence: String) : OmenScoutSection<Nothing>

    /**
     * A permanent limit of this provider for this league. **No retry, ever.**
     *
     * [consequence] is what the user loses by it, stated plainly. Without that second sentence the
     * screen names a gap and leaves the reader to guess how much it costs them.
     */
    data class ProviderLimit(
        val capability: String,
        val sentence: String,
        val consequence: String,
    ) : OmenScoutSection<Nothing>
}

/** One row of the rank table (`.trow`). */
data class OmenScoutTableRow(
    val rank: Int,
    val crest: String,
    val teamName: String,
    /**
     * Most recent five, most recent LAST — the order the artboard draws and the order a reader
     * expects. **Null when the provider gave no form history**; the strip then renders nothing
     * rather than five empty pips, which would read as five losses.
     */
    val form: List<Boolean>? = null,
    val record: String,
    val isMine: Boolean = false,
)

/** A `.hole` — an opponent whose roster shape complements yours. */
data class OmenScoutTradeTarget(
    val crest: String,
    val teamName: String,
    val read: String,
)

/** An `.act` row. [category] is the server's own word ("Standings"), rendered verbatim. */
data class OmenScoutActivityRow(
    val category: String,
    val text: String,
)

/**
 * The playoff cut line, drawn between two rows.
 *
 * **Only when the provider actually read playoff settings.** `playoff_picture.settings_known` is
 * `true` on **Sleeper ONLY**; ESPN and Yahoo are unproven, so on those the line is absent rather
 * than guessed at the halfway point. A cut line in the wrong place is worse than none — it is a
 * claim about who is in the playoffs.
 */
data class OmenScoutCutLine(
    /** The rank the line sits BELOW. A line under rank 4 separates 4 from 5. */
    val afterRank: Int,
    val label: String,
)

/** The `.strip` — your own week, one line, at the top of the scout's nest. */
data class OmenScoutStrip(
    val platform: OmenPlatform,
    val myScore: String,
    val theirScore: String,
    /** "Live · Q2", "Final". Server wording, verbatim. */
    val status: String,
)

/** Everything `LeagueTable`, `LeagueDegraded` and `LeagueNoRosters` render. */
data class OmenScoutTableState(
    /** "Week 7 · 12 teams" */
    val weekLabel: String,
    /**
     * The `.hatch` banner above the sections. Present only when something screen-wide is true —
     * on `LeagueDegraded`, that the provider is partial. Absent on the nominal pass: a banner that
     * always shows teaches people to stop reading it.
     */
    val notice: String? = null,
    val strip: OmenScoutSection<OmenScoutStrip>,
    val table: OmenScoutSection<List<OmenScoutTableRow>>,
    val cutLine: OmenScoutCutLine? = null,
    val tradeTargets: OmenScoutSection<List<OmenScoutTradeTarget>>,
    val waiver: OmenScoutSection<OmenDeskWaiverMove>,
    val activity: OmenScoutSection<List<OmenScoutActivityRow>>,
    /**
     * The `.hatch` under a PARTIAL activity list. The list is unread, not empty, and this is the
     * sentence that says which.
     */
    val activityUnreadNote: String? = null,
    /** The `.oneline` foot strip — where *read, not used* lands. */
    val footnote: OmenDeskFootnote? = null,
    /**
     * Present only when retrying could change the answer.
     *
     * **Null on `LeagueNoRosters` and that is the contract, not an oversight.** A retry button on
     * a permanent limit is a promise the product cannot keep, and the user presses it every week.
     */
    val retryTitle: String? = null,
)

/**
 * How this league decides who gets a claim.
 *
 * **The §6.2 gate, modelled as a type so it cannot be forgotten.** FAAB appears only for a
 * positively-determined FAAB league; priority only for a determined priority league; NEITHER for
 * `not_determined` — which is what ESPN and Yahoo return today.
 *
 * A single nullable `budgetText: String?` would have made the third case indistinguishable from
 * "a FAAB league whose budget we happen not to have", and the screen would have shown a claim
 * order beside a missing budget as though the system were known.
 */
sealed interface OmenWaiverSystem {
    /** `waiver_system.system: "faab"`, positively determined. */
    data class Faab(val budgetText: String, val orderText: String? = null) : OmenWaiverSystem

    /** `waiver_system.system: "priority"` or `"reverse_standings"`, positively determined. */
    data class Priority(val orderText: String) : OmenWaiverSystem

    /** `waiver_system.system: "not_determined"`. Renders no scope strip at all. */
    data object NotDetermined : OmenWaiverSystem
}

/** One line of the wire's swap (`.sline`). The out side is optional throughout. */
data class OmenScoutWireMove(
    val addName: String,
    val addMeta: String,
    val addPoints: String? = null,
    /**
     * Absent when there is no defensible drop. The artboard draws that case explicitly, with an em
     * dash and "no low-cost drop" — `waiver-analysis.v1`'s `no_low_cost_drop` surfacing inside an
     * alternative rather than as a whole screen.
     */
    val dropName: String? = null,
    val dropMeta: String? = null,
    val dropPoints: String? = null,
    val reasoning: String,
)

/** The status word on a wire row. A **word**, never a glyph. */
enum class OmenScoutWireRowStatus { Live, Watching, Unavailable }

/** A `.lrow` in one of the wire's labelled lists. */
data class OmenScoutWireRow(
    val title: String,
    val detail: String,
    val status: OmenScoutWireRowStatus,
)

/** The three states of `waiver-analysis.v1` this journey draws. */
sealed interface OmenScoutWireBody {
    /**
     * `state: "confirmed_opportunity"` — `LeagueWaiver`.
     *
     * [suggestedBid] is nullable and the reason is written into `waiver-analysis.v1` itself:
     * **`best_move.bid` is `null` — never `0` — when any input is missing.** A "$0" suggestion is
     * a recommendation to bid nothing, which is a different and wrong piece of advice.
     *
     * There is no claim-probability field on this type, on purpose. Claim probability is never
     * returned, for any league, so a client that had somewhere to put it would eventually put
     * something there.
     */
    data class Opportunity(
        val best: OmenScoutWireMove,
        val suggestedBid: String? = null,
        val alternatives: List<OmenScoutWireMove> = emptyList(),
    ) : OmenScoutWireBody

    /** `state: "no_credible_move"` or `"no_low_cost_drop"` — `WaiverNoMove`. */
    data class NoMove(
        val headline: String,
        val body: String,
        val costTitle: String,
        val cost: String,
        val band: OmenConfidenceBand? = null,
        val risk: OmenRiskLevel = OmenRiskLevel.Low,
        val watchTitle: String,
        val watching: List<OmenScoutWireRow> = emptyList(),
    ) : OmenScoutWireBody

    /**
     * `waiver_system.system: "not_determined"` — `WaiverNotDetermined`.
     *
     * Two lists, and the split is the whole screen: what survives not knowing the system, and what
     * does not. [note] is the sentence that says a figure invented without the budget would be
     * worse than no figure.
     */
    data class NotDetermined(
        val stillTrueTitle: String,
        val stillTrue: List<OmenScoutWireRow>,
        val withheldTitle: String,
        val withheld: List<OmenScoutWireRow>,
        val note: String,
    ) : OmenScoutWireBody
}

/** Everything `LeagueWaiver`, `WaiverNoMove` and `WaiverNotDetermined` render. */
data class OmenScoutWireState(
    /** "Week 7 · Waiver" */
    val weekLabel: String,
    /** "Claims process" / "Tue 3:00 AM". Both or neither — a label with no time says nothing. */
    val processLabel: String? = null,
    val processTime: String? = null,
    val system: OmenWaiverSystem,
    /** The `.hatch` banner. On `WaiverNotDetermined` it is the screen's whole premise. */
    val notice: String? = null,
    val body: OmenScoutWireBody,
    val footnote: OmenDeskFootnote? = null,
)

// MARK: The Table screen

/**
 * J5, the scout's nest. `LeagueTable.dc.html`, `LeagueDegraded.dc.html`,
 * `LeagueNoRosters.dc.html`.
 *
 * Declared **scrolls** in the canvas README, all three.
 */
@Composable
fun OmenLeagueTableScreen(
    state: OmenScoutTableState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onOpenWaiver: (() -> Unit)? = null,
    onBuildTrade: ((OmenScoutTradeTarget) -> Unit)? = null,
    onRetry: (() -> Unit)? = null,
) {
    ScoutScrollShell(modifier = modifier, context = context) {
        ScoutHeader(state.weekLabel, "The Table", onOpenAccount)

        state.notice?.let {
            ScoutNotice(
                it,
                Modifier
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step12),
            )
        }

        // Your week. The strip, not a full matchup card: this screen is about the other eleven
        // managers, and your own game is the one line of context that makes theirs mean something.
        ScoutSectionBody(
            section = state.strip,
            modifier = Modifier
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step12),
        ) { strip -> ScoutStripRow(strip) }

        ScoutSectionHeader("The table", tableTrailing(state.table))
        ScoutSectionBody(
            section = state.table,
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
        ) { rows ->
            Column {
                rows.forEach { row ->
                    ScoutTableRowView(row)
                    // The cut line is drawn between rows and ONLY when the provider read playoff
                    // settings. See [OmenScoutCutLine].
                    state.cutLine?.takeIf { it.afterRank == row.rank }?.let { ScoutCutLineRow(it.label) }
                }
            }
        }

        ScoutSectionHeader("Trade targets", tradeTrailing(state.tradeTargets))
        ScoutSectionBody(
            section = state.tradeTargets,
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
        ) { targets ->
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                targets.forEach { target ->
                    ScoutTradeTargetRow(target, onBuildTrade?.let { build -> { build(target) } })
                }
            }
        }

        ScoutSectionHeader(
            "Waiver",
            waiverTrailing(state.waiver),
            link = if (onOpenWaiver == null) null else "The wire",
            onLink = onOpenWaiver,
        )
        ScoutSectionBody(
            section = state.waiver,
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
        ) { move -> ScoutWaiverCard(move) }

        // Last, and that placement is a decision rather than a leftover. Activity is partial on
        // ESPN and Yahoo, and a degraded section high on a screen teaches people the screen is
        // unreliable.
        ScoutSectionHeader("Activity", activityTrailing(state.activity, state.activityUnreadNote))
        ScoutSectionBody(
            section = state.activity,
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
        ) { rows ->
            Column {
                rows.forEach { ScoutActivityRowView(it) }
                // The list is UNREAD, not empty, and this is the line that says which. It sits
                // under the rows that did arrive rather than replacing them, because the partial
                // case is the common one on ESPN and both halves are true at once.
                state.activityUnreadNote?.let {
                    ScoutNotice(it, Modifier.padding(top = OmenTheme.spacing.step8))
                }
            }
        }

        if (state.retryTitle != null && onRetry != null) {
            OmenButton(
                text = state.retryTitle,
                onClick = onRetry,
                modifier = Modifier
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step14),
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Md,
            )
        }

        state.footnote?.let {
            ScoutFootnoteStrip(it, Modifier.padding(top = OmenTheme.spacing.step12))
        }
    }
}

private fun tableTrailing(section: OmenScoutSection<List<OmenScoutTableRow>>): String =
    when (section) {
        is OmenScoutSection.Read -> "Form · last 5"
        else -> "Unavailable"
    }

private fun tradeTrailing(section: OmenScoutSection<List<OmenScoutTradeTarget>>): String =
    when (section) {
        is OmenScoutSection.Read ->
            if (section.value.size == 1) "1 opening" else "${section.value.size} openings"
        is OmenScoutSection.Unread -> "Unavailable"
        // Not "Unavailable": this league will never have it, and the two things a user needs to
        // tell apart are "came back empty this time" and "cannot happen here".
        is OmenScoutSection.ProviderLimit -> "Not possible here"
    }

private fun waiverTrailing(section: OmenScoutSection<OmenDeskWaiverMove>): String =
    when (section) {
        is OmenScoutSection.Read -> "Best move"
        else -> "Unavailable"
    }

private fun activityTrailing(
    section: OmenScoutSection<List<OmenScoutActivityRow>>,
    unreadNote: String?,
): String = when (section) {
    is OmenScoutSection.Read -> if (unreadNote == null) "Live" else "Partial"
    is OmenScoutSection.Unread -> "Unavailable"
    is OmenScoutSection.ProviderLimit -> "Not possible here"
}

// MARK: The wire screen

/**
 * J5, the wire. `LeagueWaiver.dc.html`, `WaiverNoMove.dc.html`, `WaiverNotDetermined.dc.html`.
 *
 * Waiver is a section **inside** the League destination rather than a fifth tab, which is why
 * this screen is reached from `OmenLeagueTableScreen`'s Waiver section header and from nowhere
 * else.
 */
@Composable
fun OmenLeagueWireScreen(
    state: OmenScoutWireState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
) {
    ScoutScrollShell(modifier = modifier, context = context) {
        WireHeader(state, onOpenAccount)

        // `.scope` — the §6.2 gate, rendered. FAAB only for a determined FAAB league, priority
        // only for a determined priority league, and for `not_determined` the strip does not
        // exist — no placeholder, no dash, no greyed-out "$— of $—". A dashed budget is still a
        // claim that this is a budget league.
        when (val system = state.system) {
            is OmenWaiverSystem.Faab ->
                ScoutScopeStrip(listOfNotNull(system.budgetText, system.orderText))
            is OmenWaiverSystem.Priority -> ScoutScopeStrip(listOf(system.orderText))
            OmenWaiverSystem.NotDetermined -> Unit
        }

        state.notice?.let {
            ScoutNotice(
                it,
                Modifier
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step12),
            )
        }

        when (val body = state.body) {
            is OmenScoutWireBody.Opportunity -> {
                ScoutSectionHeader("The move", "Best available")
                ScoutWireHeroCard(
                    body.best,
                    body.suggestedBid,
                    Modifier.padding(horizontal = OmenTheme.spacing.step16),
                )
                if (body.alternatives.isNotEmpty()) {
                    ScoutSectionHeader(
                        "Also worth a claim",
                        if (body.alternatives.size == 1) "1 alternative" else "${body.alternatives.size} alternatives",
                    )
                    Column(
                        modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
                        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                    ) {
                        body.alternatives.forEach { ScoutWireAlternativeCard(it) }
                    }
                }
            }

            is OmenScoutWireBody.NoMove -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = OmenTheme.spacing.step16)
                        .padding(top = OmenTheme.spacing.step24),
                    verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
                ) {
                    Text(
                        body.headline,
                        style = OmenTheme.typography.h2.toTextStyle(),
                        color = OmenTheme.color.textPrimary,
                    )
                    Text(
                        body.body,
                        style = OmenTheme.typography.bodySmall.toTextStyle(),
                        color = OmenTheme.color.textSecondary,
                    )
                }

                ScoutSectionHeader(body.costTitle, null)
                OmenCard(
                    modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
                    contentPadding = PaddingValues(OmenTheme.spacing.step12),
                ) {
                    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                        Text(
                            body.cost,
                            style = OmenTheme.typography.bodySmall.toTextStyle(),
                            color = OmenTheme.color.textSecondary,
                        )
                        ScoutBandAndRisk(body.band, body.risk)
                    }
                }

                if (body.watching.isNotEmpty()) {
                    ScoutSectionHeader(body.watchTitle, "Omen will flag these")
                    OmenCard(
                        modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
                        contentPadding = PaddingValues(OmenTheme.spacing.step12),
                    ) {
                        Column { body.watching.forEach { ScoutWireRowView(it) } }
                    }
                }
            }

            is OmenScoutWireBody.NotDetermined -> {
                if (body.stillTrue.isNotEmpty()) {
                    ScoutSectionHeader(body.stillTrueTitle, null)
                    OmenCard(
                        modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
                        contentPadding = PaddingValues(OmenTheme.spacing.step12),
                    ) {
                        Column { body.stillTrue.forEach { ScoutWireRowView(it) } }
                    }
                }
                // Every row here is `unavailable` and every one is NAMED. This block is the
                // acceptance-rule-4 surface for the `waiver` profile: the reader is told exactly
                // which answers they are not getting and what each one needed.
                ScoutSectionHeader(body.withheldTitle, null)
                OmenCard(
                    modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
                    contentPadding = PaddingValues(OmenTheme.spacing.step12),
                ) {
                    Column { body.withheld.forEach { ScoutWireRowView(it) } }
                }
                Text(
                    body.note,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = OmenTheme.spacing.step16)
                        .padding(top = OmenTheme.spacing.step12),
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                )
            }
        }

        state.footnote?.let {
            ScoutFootnoteStrip(it, Modifier.padding(top = OmenTheme.spacing.step12))
        }
    }
}

// MARK: Shell and headers

@Composable
private fun ScoutScrollShell(
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
 * All six J5 artboards draw a lone 30pt avatar here. E017 was resolved by the founder on
 * 2026-09-18 as **both** controls — help then account — so the extra width is recorded drift
 * carried forward from J2 and J3 rather than a decision retaken here.
 */
@Composable
private fun ScoutHeader(weekLabel: String, title: String, onOpenAccount: (() -> Unit)?) {
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
            Text(weekLabel, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
            Text(
                title,
                style = OmenTheme.typography.screenTitle.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
        }
        OmenScreenHeaderControls(OmenHelpDestination.League, onOpenAccount = onOpenAccount)
    }
}

@Composable
private fun WireHeader(state: OmenScoutWireState, onOpenAccount: (() -> Unit)?) {
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
            Text(
                state.weekLabel,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.accent,
            )
            Text(
                "The wire",
                style = OmenTheme.typography.screenTitle.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
        }
        // Both or neither. `LeagueWaiver.dc.html` draws "Claims process / Tue 3:00 AM" here; a
        // label with no time would tell the reader a deadline exists and not when.
        val label = state.processLabel
        val time = state.processTime
        if (label != null && time != null) {
            Column(
                horizontalAlignment = Alignment.End,
                modifier = Modifier.semantics { contentDescription = "$label $time" },
            ) {
                Text(label, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
                Text(time, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
            }
        }
        OmenScreenHeaderControls(OmenHelpDestination.League, onOpenAccount = onOpenAccount)
    }
}

/** `.sh` — an uppercase label, an optional status word and an optional accent link. */
@Composable
private fun ScoutSectionHeader(
    title: String,
    trailing: String?,
    link: String? = null,
    onLink: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step14, bottom = OmenTheme.spacing.step6),
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
        if (link != null && onLink != null) {
            ScoutSectionLink(link, title, onLink)
        }
    }
}

/**
 * An accent link inside a section header.
 *
 * Floors **both** axes at 44dp rather than height alone — a link two characters wide passes a
 * height-only check and is still not tappable. The label carries the section name so a screen
 * reader hears "The wire, Waiver" rather than four identical "The wire" links.
 */
@Composable
private fun ScoutSectionLink(title: String, section: String, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .sizeIn(minWidth = 44.dp, minHeight = 44.dp)
            .clip(RoundedCornerShape(8.dp))
            .clickable(onClick = onClick)
            .semantics { contentDescription = "$title, $section" },
        contentAlignment = Alignment.CenterEnd,
    ) {
        Text(
            title,
            modifier = Modifier
                .padding(horizontal = OmenTheme.spacing.step8)
                .clearAndSetSemantics { },
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.accent,
            fontWeight = FontWeight.Bold,
        )
    }
}

/**
 * Renders a section in its own place: the value when it read, and otherwise the block that says
 * which of the two silences this is.
 */
@Composable
private fun <Value> ScoutSectionBody(
    section: OmenScoutSection<Value>,
    modifier: Modifier = Modifier,
    read: @Composable (Value) -> Unit,
) {
    Box(modifier = modifier) {
        when (section) {
            is OmenScoutSection.Read -> read(section.value)
            is OmenScoutSection.Unread -> ScoutUnreadBlock(section.capability, section.sentence)
            is OmenScoutSection.ProviderLimit ->
                ScoutLimitBlock(section.capability, section.sentence, section.consequence)
        }
    }
}

// MARK: Blocks

/** `.strip` — your own week, compressed to one line. */
@Composable
private fun ScoutStripRow(strip: OmenScoutStrip) {
    val colors = OmenTheme.color
    val chip = when (strip.platform) {
        OmenPlatform.Espn -> colors.data.platformEspnChip
        OmenPlatform.Yahoo -> colors.data.platformYahooChip
        OmenPlatform.Sleeper -> colors.data.platformSleeperChip
    }
    val platformName = when (strip.platform) {
        OmenPlatform.Espn -> "ESPN"
        OmenPlatform.Yahoo -> "Yahoo"
        OmenPlatform.Sleeper -> "Sleeper"
    }
    val accent = colors.accent
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(13.dp))
            .background(colors.surface1)
            .drawBehind {
                drawRect(
                    color = accent.copy(alpha = 0.34f),
                    size = Size(size.width, 1.dp.toPx()),
                )
            }
            .padding(horizontal = OmenTheme.spacing.step12, vertical = OmenTheme.spacing.step10)
            .semantics {
                contentDescription =
                    "Your week on $platformName. ${strip.myScore} to ${strip.theirScore}. ${strip.status}."
            },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // The provider hex is never the only carrier (D7) — the status word sits beside it and
        // the platform is named in the accessibility label.
        Box(modifier = Modifier.size(7.dp).clip(RoundedCornerShape(2.dp)).background(chip))
        Text(strip.myScore, style = OmenTheme.typography.scoreTrail.toTextStyle(), color = colors.textPrimary)
        Text("VS", style = OmenTheme.typography.micro.toTextStyle(), color = colors.textTertiary)
        Text(
            strip.theirScore,
            modifier = Modifier.weight(1f),
            style = OmenTheme.typography.scoreTrail.toTextStyle(),
            color = colors.textTertiary,
        )
        Text(strip.status, style = OmenTheme.typography.micro.toTextStyle(), color = colors.textTertiary)
    }
}

/** `.trow` — one rank row. */
@Composable
private fun ScoutTableRowView(row: OmenScoutTableRow) {
    val colors = OmenTheme.color
    val description = buildList {
        add("Rank ${row.rank}")
        add(row.teamName)
        add(row.record)
        row.form?.let { form ->
            add("last five: " + form.joinToString(", ") { if (it) "win" else "loss" })
        }
        if (row.isMine) add("your team")
    }.joinToString(", ")

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(8.dp))
            .background(if (row.isMine) colors.surface2 else Color.Transparent)
            .padding(horizontal = OmenTheme.spacing.step10, vertical = OmenTheme.spacing.step8)
            .semantics { contentDescription = description },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            row.rank.toString(),
            modifier = Modifier.width(14.dp),
            style = OmenTheme.typography.micro.toTextStyle(),
            color = colors.textTertiary,
        )
        Text(
            row.crest,
            modifier = Modifier
                .size(width = 26.dp, height = 20.dp)
                .clip(RoundedCornerShape(5.dp))
                .background(if (row.isMine) colors.accentMuted else colors.surface3),
            style = OmenTheme.typography.micro.toTextStyle(),
            color = if (row.isMine) colors.accentHover else colors.textSecondary,
            maxLines = 1,
        )
        Text(
            row.teamName,
            modifier = Modifier.weight(1f),
            style = OmenTheme.typography.name.toTextStyle(),
            color = if (row.isMine) colors.textPrimary else colors.textSecondary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        // Five pips, most recent last. Absent entirely when the provider gave no history — five
        // empty pips would read as five losses, which is a result rather than a silence.
        row.form?.let { form ->
            Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                form.forEach { won ->
                    Box(
                        modifier = Modifier
                            .size(5.dp)
                            .clip(RoundedCornerShape(1.5.dp))
                            .background(if (won) colors.accent else colors.surface3),
                    )
                }
            }
        }
        Text(row.record, style = OmenTheme.typography.bodySmall.toTextStyle(), color = if (row.isMine) colors.textPrimary else colors.textTertiary)
    }
}

/** `.cutline` — the playoff cut, drawn only when playoff settings were actually read. */
@Composable
private fun ScoutCutLineRow(label: String) {
    val accent = OmenTheme.color.accent.copy(alpha = 0.34f)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = OmenTheme.spacing.step6)
            .semantics { contentDescription = label },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(modifier = Modifier.weight(1f).height(1.dp).background(accent))
        Text(label, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
        Box(modifier = Modifier.weight(1f).height(1.dp).background(accent))
    }
}

/** `.hole` — a trade target. */
@Composable
private fun ScoutTradeTargetRow(target: OmenScoutTradeTarget, onBuild: (() -> Unit)?) {
    val colors = OmenTheme.color
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(colors.surface1)
            .padding(OmenTheme.spacing.step10),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            target.crest,
            modifier = Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(colors.surface3),
            style = OmenTheme.typography.micro.toTextStyle(),
            color = colors.textSecondary,
            maxLines = 1,
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .semantics { contentDescription = "${target.teamName}. ${target.read}" },
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
        ) {
            Text(target.teamName, style = OmenTheme.typography.name.toTextStyle(), color = colors.textPrimary)
            Text(target.read, style = OmenTheme.typography.bodySmall.toTextStyle(), color = colors.textTertiary)
        }
        onBuild?.let { ScoutSectionLink("Build", target.teamName, it) }
    }
}

/** `.wrow` — the waiver move as it appears inside the Table screen's Waiver section. */
@Composable
private fun ScoutWaiverCard(move: OmenDeskWaiverMove) {
    OmenCard(contentPadding = PaddingValues(OmenTheme.spacing.step12)) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            ScoutSwap(
                move.addName, move.addMeta, move.addPoints,
                move.dropName, move.dropMeta, move.dropPoints,
            )
            Text(move.reasoning, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
            ScoutBandAndRisk(move.band, move.risk)
        }
    }
}

/** `.card.hero` on the wire — the best move plus its bid line. */
@Composable
private fun ScoutWireHeroCard(
    move: OmenScoutWireMove,
    suggestedBid: String?,
    modifier: Modifier = Modifier,
) {
    val borderSubtle = OmenTheme.color.borderSubtle
    OmenCard(
        modifier = modifier,
        variant = OmenCardVariant.Outlined,
        contentPadding = PaddingValues(OmenTheme.spacing.step12),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10)) {
            ScoutSwap(
                move.addName, move.addMeta, move.addPoints,
                move.dropName, move.dropMeta, move.dropPoints,
            )
            Text(move.reasoning, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
            // Absent when `best_move.bid` is null, which is what the contract sends whenever any
            // input to the bid is missing. There is no "$0" fallback and no dash: a suggestion of
            // zero is a real and different recommendation.
            suggestedBid?.let {
                Text(
                    it,
                    modifier = Modifier
                        .fillMaxWidth()
                        .drawBehind { drawRect(color = borderSubtle, size = Size(size.width, 1.dp.toPx())) }
                        .padding(top = OmenTheme.spacing.step10),
                    style = OmenTheme.typography.bodySmall.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
        }
    }
}

/** `.wrow` on the wire — an alternative claim. */
@Composable
private fun ScoutWireAlternativeCard(move: OmenScoutWireMove) {
    OmenCard(contentPadding = PaddingValues(OmenTheme.spacing.step12)) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            ScoutSwap(
                move.addName, move.addMeta, move.addPoints,
                move.dropName, move.dropMeta, move.dropPoints,
            )
            Text(move.reasoning, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        }
    }
}

/**
 * `.swap` — the in/out pair against the tick rule. Shared by every card that carries a move,
 * which is the reason it is one composable rather than three copies.
 */
@Composable
private fun ScoutSwap(
    addName: String,
    addMeta: String,
    addPoints: String?,
    dropName: String?,
    dropMeta: String?,
    dropPoints: String?,
) {
    Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
        Box(modifier = Modifier.width(24.dp), contentAlignment = Alignment.TopCenter) {
            Box(
                modifier = Modifier
                    .size(8.dp)
                    .clip(CircleShape)
                    .background(OmenTheme.color.accent),
            )
        }
        Column {
            ScoutSwapLine(addName, addMeta, addPoints, incoming = true)
            dropName?.let { ScoutSwapLine(it, dropMeta, dropPoints, incoming = false) }
        }
    }
}

@Composable
private fun ScoutSwapLine(name: String, meta: String?, points: String?, incoming: Boolean) {
    val ink = if (incoming) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary
    val description = listOfNotNull(
        if (incoming) "Add" else "Drop",
        name,
        meta,
        points?.let { "$it projected" },
    ).joinToString(", ")

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = OmenTheme.spacing.step2)
            .semantics { contentDescription = description },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            name,
            style = OmenTheme.typography.name.toTextStyle(),
            color = ink,
            fontWeight = if (incoming) FontWeight.Bold else FontWeight.Medium,
            maxLines = 1,
        )
        meta?.let {
            Text(
                it,
                modifier = Modifier.weight(1f),
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
        }
        if (meta == null) Spacer(modifier = Modifier.weight(1f))
        points?.let {
            Text(
                it,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = ink,
                fontWeight = FontWeight.ExtraBold,
            )
        }
    }
}

/** `.act` — one activity line. */
@Composable
private fun ScoutActivityRowView(row: OmenScoutActivityRow) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = OmenTheme.spacing.step8)
            .semantics { contentDescription = "${row.category}. ${row.text}" },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            row.category,
            modifier = Modifier.width(74.dp),
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
        Text(
            row.text,
            modifier = Modifier.weight(1f),
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textSecondary,
        )
    }
}

/** `.lrow` — a titled row with a status **word** on the right. */
@Composable
private fun ScoutWireRowView(row: OmenScoutWireRow) {
    val statusWord = when (row.status) {
        OmenScoutWireRowStatus.Live -> "Live"
        OmenScoutWireRowStatus.Watching -> "Watching"
        OmenScoutWireRowStatus.Unavailable -> "Unavailable"
    }
    // An `unavailable` row is `text-tertiary` throughout — it is named, and it is not dressed as
    // evidence. Acceptance rules 3 and 4, on one row.
    val titleColor =
        if (row.status == OmenScoutWireRowStatus.Unavailable) OmenTheme.color.textTertiary
        else OmenTheme.color.textPrimary

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = OmenTheme.spacing.step8)
            .semantics { contentDescription = "${row.title}. ${row.detail}. $statusWord." },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.Top,
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step2),
        ) {
            Text(row.title, style = OmenTheme.typography.name.toTextStyle(), color = titleColor)
            Text(row.detail, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
        // A word, never a glyph. `capability-symbols-v1.md`: a missing symbol says nothing, a
        // wrong one says something untrue, and no capability has a symbol at all.
        when (row.status) {
            OmenScoutWireRowStatus.Live -> OmenBadge(label = statusWord, tone = OmenBadgeTone.Live)
            OmenScoutWireRowStatus.Unavailable ->
                OmenBadge(label = statusWord, tone = OmenBadgeTone.Unavailable)
            OmenScoutWireRowStatus.Watching -> Text(
                statusWord,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
                fontStyle = FontStyle.Italic,
            )
        }
    }
}

/** Confidence is a **band**, never a percentage. No number is rendered here, ever. */
@Composable
private fun ScoutBandAndRisk(band: OmenConfidenceBand?, risk: OmenRiskLevel) {
    Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step14)) {
        band?.let {
            Text(it.label, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accentHover)
        }
        Text(
            when (risk) {
                OmenRiskLevel.Low -> "Low risk"
                OmenRiskLevel.Medium -> "Medium risk"
                OmenRiskLevel.High -> "High risk"
            },
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
    }
}

/** `.scope` — the budget / order strip. */
@Composable
private fun ScoutScopeStrip(items: List<String>) {
    val borderSubtle = OmenTheme.color.borderSubtle
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12)
            .drawBehind {
                drawRect(
                    color = borderSubtle,
                    topLeft = Offset(0f, size.height - 1.dp.toPx()),
                    size = Size(size.width, 1.dp.toPx()),
                )
            }
            .padding(vertical = OmenTheme.spacing.step8)
            .semantics { contentDescription = items.joinToString(". ") },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16),
    ) {
        items.forEach {
            Text(it, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        }
    }
}

/**
 * `.hatch` — a dashed, hatched banner for something that is not solid live data.
 *
 * Colour is never the only carrier (D7), so the sentence does the work and the dash confirms it.
 */
@Composable
private fun ScoutNotice(text: String, modifier: Modifier = Modifier) {
    ScoutDashedSurface(modifier = modifier, cornerRadius = 12.dp) {
        Text(
            text,
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
    }
}

/** The *could not read* class, rendered in the failed section's own place. */
@Composable
private fun ScoutUnreadBlock(capability: String, sentence: String) {
    ScoutDashedSurface(
        modifier = Modifier.semantics {
            contentDescription = "$capability. Unavailable. $sentence"
        },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6)) {
            // NAMED. Acceptance rule 4, and the reason this block is never dropped to make room:
            // it is the one class that costs the reader something.
            Text(capability, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
            OmenBadge(label = "Unavailable", tone = OmenBadgeTone.Unavailable)
            Text(sentence, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
    }
}

/**
 * A **permanent** provider limit for this league. Visually a sibling of the unread block and
 * semantically not the same thing: there is no retry beside it and the second sentence says what
 * the user gets instead.
 */
@Composable
private fun ScoutLimitBlock(capability: String, sentence: String, consequence: String) {
    ScoutDashedSurface(
        modifier = Modifier.semantics {
            contentDescription = "$capability. Unavailable. $sentence $consequence"
        },
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6)) {
            Text(capability, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
            OmenBadge(label = "Unavailable", tone = OmenBadgeTone.Unavailable)
            Text(sentence, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
            Text(consequence, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
    }
}

@Composable
private fun ScoutDashedSurface(
    modifier: Modifier = Modifier,
    cornerRadius: androidx.compose.ui.unit.Dp = 13.dp,
    content: @Composable () -> Unit,
) {
    // Hoisted out of `drawBehind`: that lambda is a `DrawScope`, not a `@Composable`, so it
    // cannot read `OmenTheme.color` itself.
    val fill = OmenTheme.color.surface1.copy(alpha = 0.5f)
    val border = OmenTheme.color.border
    Box(
        modifier = modifier
            .fillMaxWidth()
            .drawBehind {
                val radius = CornerRadius(cornerRadius.toPx(), cornerRadius.toPx())
                drawRoundRect(color = fill, cornerRadius = radius)
                drawRoundRect(
                    color = border,
                    cornerRadius = radius,
                    style = Stroke(
                        width = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(
                            floatArrayOf(4.dp.toPx(), 4.dp.toPx()),
                            0f,
                        ),
                    ),
                )
            }
            .padding(OmenTheme.spacing.step12),
    ) {
        content()
    }
}

/** `.oneline` — the foot strip. Where *read, not used* lands. */
@Composable
private fun ScoutFootnoteStrip(footnote: OmenDeskFootnote, modifier: Modifier = Modifier) {
    val borderSubtle = OmenTheme.color.borderSubtle
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .drawBehind { drawRect(color = borderSubtle, size = Size(size.width, 1.dp.toPx())) }
            .padding(top = OmenTheme.spacing.step10)
            .semantics {
                contentDescription = listOfNotNull(footnote.text, footnote.emphasis).joinToString(" ")
            },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
    ) {
        // `text-tertiary`, and no evidence styling. Acceptance rule 3: a source that was read and
        // did not decide anything must not look like one that did.
        Text(
            footnote.text,
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
        footnote.emphasis?.let {
            Text(
                it,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textPrimary,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}
