package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.stateDescription
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.feature.api.TradeCompare
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
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionCapability
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

// ---------------------------------------------------------------------------------------------
// J4, "settling an argument" — the Compose half.
//
// The five artboards of `screen-journeys-v1.md`'s fourth journey: `TradeBuild`, `TradeRoster`,
// `TradeNeedsContext`, `TradeVerdict` and `TradeShare`. Capability profile: `trade`. Mirrored
// from `App/CommandCenter/OmenTradeJourneyScreens.swift` so a contact sheet compares the canvas
// against one product rather than two.
//
// The three places the artboards claim more than `trade-compare.v2` can pay for are written out
// in full in the Swift file rather than restated here — a copied rule is a second source of truth
// and the copy is the one that goes stale. In short: three-team controls render **unavailable**
// rather than hidden or live; the confidence band and risk chip are **absent**, because v2
// returns neither and a client that mints one repeats the `U1` defect; and `TradeRoster` carries
// a permanent-provider-limit state with **no retry**, per fact-of-record #16.
//
// `OmenTradeScreen` in this same package is NOT replaced. It is the M5 slice-G form and it still
// serves the typed-trade path, two screenshot scenarios and the live Trade destination.
// ---------------------------------------------------------------------------------------------

// MARK: State

/** One line of an offer. */
data class OmenTradeLeg(
    val direction: Direction,
    val name: String,
    val meta: String,
    /** "RB 8". **Null renders nothing** — `—` in this column reads as a rank of zero. */
    val rank: String? = null,
) {
    enum class Direction { Sending, Receiving }

    val label: String get() = if (direction == Direction.Sending) "Out" else "In"
}

/** One side of the deal. Both sides always render: Trade "must show both sides". */
data class OmenTradeSide(val heading: String, val legs: List<OmenTradeLeg>)

/**
 * One input behind the read, in exactly one of `capability-expression-v1.md`'s four classes.
 *
 * There is no case for `not_requested`. The fourth class renders as nothing, so such an input
 * never becomes an [OmenTradeInput] at all — a case here would eventually get a treatment.
 */
data class OmenTradeInput(
    val capability: String,
    val statement: String,
    val presentation: Presentation,
) {
    enum class Presentation { Used, ReadNotUsed, CouldNotRead }
}

/** A team you could trade with. [need] is null where their roster was not read. */
data class OmenTradePartner(
    val id: String,
    val crest: String,
    val name: String,
    val need: String? = null,
)

/** `trade-capabilities.v1`'s three-team answer, carried rather than assumed. */
data class OmenTradeCapability(
    val maxTeams: Int,
    val threeTeamSupported: Boolean,
    val threeTeamReason: String?,
) {
    val reasonSentence: String
        get() = when (threeTeamReason) {
            "multi_team_comparison_not_implemented" ->
                "Omen can only compare two teams today. A third team is not a setting you can " +
                    "turn on — the comparison itself has not been built yet."
            else -> "Omen can only compare $maxTeams teams today."
        }
}

/** `.fc` — a position filter, or the brass `.fc.smart` one that names a conclusion. */
data class OmenTradeFilter(val id: String, val title: String, val isSmart: Boolean = false)

/** The verdict block (`.verd`), shared by Build, Verdict and NeedsContext. */
data class OmenTradeRead(
    /** `TradeCompare.headline`. Server-owned; nothing here re-derives it. */
    val headline: String,
    val reasoning: String,
    /**
     * **Non-null by design.** `CONTRACTS.md` requires Trade to state the caveat, and a nullable
     * field is a caveat that goes missing on the day the payload is thin.
     */
    val caveat: String,
    val isPersonalized: Boolean,
    /** Already in the server's order. The screen does not re-rank. */
    val inputs: List<OmenTradeInput> = emptyList(),
)

/** `.howto` — Omen never submits on anyone's behalf, so it says how to. */
data class OmenTradeSubmission(val title: String, val caption: String, val steps: List<String>)

/** `TradeBuild`. */
data class OmenTradeBuildState(
    val kicker: String,
    val title: String,
    val tabTitles: List<String>,
    val selectedTabIndex: Int,
    val partners: List<OmenTradePartner>,
    val selectedPartnerId: String?,
    val filters: List<OmenTradeFilter>,
    val selectedFilterId: String?,
    val capability: OmenTradeCapability?,
    val sides: List<OmenTradeSide>,
    val read: OmenTradeRead?,
    val submission: OmenTradeSubmission?,
    val primaryActionTitle: String,
)

/** `TradeRoster`. */
data class OmenTradeRosterState(
    val kicker: String,
    val title: String,
    val tabTitles: List<String>,
    val selectedTabIndex: Int,
    val partners: List<OmenTradePartner>,
    val selectedPartnerId: String?,
    val filters: List<OmenTradeFilter>,
    val selectedFilterId: String?,
    val capability: OmenTradeCapability?,
    val rosters: Rosters,
    val note: String? = null,
) {
    enum class Availability { Available, TheyNeedThis, Added }

    data class Row(val id: String, val name: String, val meta: String, val availability: Availability)

    sealed interface Rosters {
        data class Read(
            val teamName: String,
            val playerCount: Int,
            val rows: List<Row>,
            val freshness: String,
        ) : Rosters

        /**
         * Fact-of-record #16. The provider will not give the other teams' rosters for this
         * league, so Omen issues no trade call at all — and this is **not an outage**.
         */
        data class PermanentlyUnavailable(val capability: String, val sentence: String) : Rosters
    }
}

/** `TradeVerdict`. */
data class OmenTradeVerdictState(
    val kicker: String,
    val title: String,
    val sides: List<OmenTradeSide>,
    val read: OmenTradeRead,
    val submission: OmenTradeSubmission?,
    val primaryActionTitle: String,
    val counterActionTitle: String? = null,
    /** The route to `TradeShare`. Null where there is nothing worth sharing. */
    val shareActionTitle: String? = null,
)

/** `TradeNeedsContext`. */
data class OmenTradeNeedsContextState(
    val kicker: String,
    val title: String,
    val sides: List<OmenTradeSide>,
    val read: OmenTradeRead,
    val remedy: String? = null,
    val connectActionTitle: String? = null,
    val showAnywayActionTitle: String? = null,
)

/** `TradeShare`. */
data class OmenTradeShareState(
    val kicker: String,
    val title: String,
    val card: Card,
    val inclusions: List<Inclusion>,
    val note: String,
    val primaryActionTitle: String,
    val secondaryActionTitle: String? = null,
    /** A share that failed, named. 503 from the share route is not a failed trade read. */
    val failure: String? = null,
) {
    data class Inclusion(val id: String, val title: String, val detail: String, val isOn: Boolean)

    data class Card(
        val eyebrow: String,
        val headline: String,
        val reasoning: String,
        /** The caveat travels **on the card** — the card is what leaves the app. */
        val caveat: String,
        val footer: String,
    )
}

// MARK: TradeBuild

/**
 * J4, screen one: build a deal. `TradeBuild.dc.html`.
 *
 * Declared a **scroll** in the canvas README, so it scrolls.
 */
@Composable
fun OmenTradeBuildScreen(
    state: OmenTradeBuildState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onSelectTab: ((Int) -> Unit)? = null,
    onSelectPartner: ((String) -> Unit)? = null,
    onSelectFilter: ((String) -> Unit)? = null,
    onPrimaryAction: (() -> Unit)? = null,
) {
    TradeScrollShell(modifier = modifier, context = context) {
        TradeJourneyHeader(state.kicker, state.title, onOpenAccount)
        TradeTabs(state.tabTitles, state.selectedTabIndex, onSelectTab)
        TradePartnerRow(
            partners = state.partners,
            selectedId = state.selectedPartnerId,
            onSelect = onSelectPartner,
            addTeamReason = state.capability?.reasonSentence ?: UNKNOWN_FORMAT,
        )
        TradeFilterRow(state.filters, state.selectedFilterId, onSelectFilter)
        TradeNoteBlock(
            text = state.capability?.reasonSentence ?: UNKNOWN_FORMAT,
            modifier = Modifier.padding(top = OmenTheme.spacing.step12),
        )
        state.sides.forEach { TradeLegBlock(it) }
        state.read?.let { TradeReadBlock(it, state.submission) }
        OmenButton(
            text = state.primaryActionTitle,
            onClick = { onPrimaryAction?.invoke() },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step12),
            variant = OmenButtonVariant.Primary,
            size = OmenButtonSize.Lg,
        )
    }
}

// MARK: TradeRoster

/** J4, screen two: picking from a real roster. `TradeRoster.dc.html`. */
@Composable
fun OmenTradeRosterScreen(
    state: OmenTradeRosterState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onSelectTab: ((Int) -> Unit)? = null,
    onSelectPartner: ((String) -> Unit)? = null,
    onSelectFilter: ((String) -> Unit)? = null,
    onAddPlayer: ((String) -> Unit)? = null,
) {
    TradeScrollShell(modifier = modifier, context = context) {
        TradeJourneyHeader(state.kicker, state.title, onOpenAccount)
        TradeTabs(state.tabTitles, state.selectedTabIndex, onSelectTab)
        TradePartnerRow(
            partners = state.partners,
            selectedId = state.selectedPartnerId,
            onSelect = onSelectPartner,
            addTeamReason = null,
        )
        TradeFilterRow(state.filters, state.selectedFilterId, onSelectFilter)

        when (val rosters = state.rosters) {
            is OmenTradeRosterState.Rosters.Read -> {
                TradeSectionHeader(rosters.teamName, "${rosters.playerCount} players")
                OmenCard(
                    modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
                    contentPadding = PaddingValues(OmenTheme.spacing.step12),
                ) {
                    Column {
                        rosters.rows.forEach { row ->
                            TradeRosterRow(row) { onAddPlayer?.invoke(row.id) }
                        }
                    }
                }
                // Live is a *claim*, so it is made only where the roster actually read, and it
                // names the time it read at.
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = OmenTheme.spacing.step16)
                        .padding(top = OmenTheme.spacing.step12),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        rosters.freshness,
                        style = OmenTheme.typography.bodySmall.toTextStyle(),
                        color = OmenTheme.color.textSecondary,
                        modifier = Modifier.weight(1f),
                    )
                    OmenBadge(label = "Live", tone = OmenBadgeTone.Live)
                }
            }

            is OmenTradeRosterState.Rosters.PermanentlyUnavailable ->
                // No retry, deliberately. A Try again that can never succeed teaches a user to
                // keep pressing it.
                TradeUnreadBlock(
                    capability = rosters.capability,
                    sentence = rosters.sentence,
                    modifier = Modifier
                        .padding(horizontal = OmenTheme.spacing.step16)
                        .padding(top = OmenTheme.spacing.step16),
                )
        }

        state.note?.let {
            TradeNoteBlock(it, modifier = Modifier.padding(top = OmenTheme.spacing.step12))
        }
    }
}

// MARK: TradeVerdict

/** J4, screen three: the read. `TradeVerdict.dc.html`, `trade-compare.v2`'s four states. */
@Composable
fun OmenTradeVerdictScreen(
    state: OmenTradeVerdictState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onPrimaryAction: (() -> Unit)? = null,
    onCounter: (() -> Unit)? = null,
    onShare: (() -> Unit)? = null,
) {
    TradeScrollShell(modifier = modifier, context = context) {
        TradeJourneyHeader(state.kicker, state.title, onOpenAccount)
        state.sides.forEach { TradeLegBlock(it) }
        TradeReadBlock(state.read, state.submission)
        OmenButton(
            text = state.primaryActionTitle,
            onClick = { onPrimaryAction?.invoke() },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step12),
            variant = OmenButtonVariant.Primary,
            size = OmenButtonSize.Lg,
        )
        state.counterActionTitle?.let {
            OmenButton(
                text = it,
                onClick = { onCounter?.invoke() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step8),
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Lg,
            )
        }
        // The route to `TradeShare`, which the artboard does not draw — and without which that
        // screen is captured and unreachable. `TradeVerdict.dc.html` is redrawn with this third
        // control in the same commit.
        state.shareActionTitle?.let {
            OmenButton(
                text = it,
                onClick = { onShare?.invoke() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step8),
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Lg,
            )
        }
    }
}

// MARK: TradeNeedsContext

/**
 * J4, screen four: too close to call blind. `TradeNeedsContext.dc.html`.
 *
 * Covers `close_needs_context` **and** `insufficient_data` — both live in production, both
 * answers rather than errors. This is the journey's natural degraded surface, and the frame that
 * carries two capability classes at once.
 */
@Composable
fun OmenTradeNeedsContextScreen(
    state: OmenTradeNeedsContextState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onConnect: (() -> Unit)? = null,
    onShowAnyway: (() -> Unit)? = null,
) {
    TradeScrollShell(modifier = modifier, context = context) {
        TradeJourneyHeader(state.kicker, state.title, onOpenAccount)
        state.sides.forEach { TradeLegBlock(it) }
        TradeReadBlock(state.read, submission = null)
        state.remedy?.let {
            TradeNoteBlock(it, modifier = Modifier.padding(top = OmenTheme.spacing.step12))
        }
        state.connectActionTitle?.let {
            OmenButton(
                text = it,
                onClick = { onConnect?.invoke() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step12),
                variant = OmenButtonVariant.Primary,
                size = OmenButtonSize.Lg,
            )
        }
        state.showAnywayActionTitle?.let {
            OmenButton(
                text = it,
                onClick = { onShowAnyway?.invoke() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step8),
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Lg,
            )
        }
    }
}

// MARK: TradeShare

/**
 * J4, screen five: send the read. `TradeShare.dc.html`.
 *
 * `POST /api/trade/share` → `trade-share.v1`: a 30-day hash, no auth, no provider data. **Names
 * are off by default**, which is a contract and not a preference; the default is set by whoever
 * builds the state rather than by this composable.
 */
@Composable
fun OmenTradeShareScreen(
    state: OmenTradeShareState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onToggleInclusion: ((String) -> Unit)? = null,
    onShare: (() -> Unit)? = null,
    onCopyAsText: (() -> Unit)? = null,
) {
    TradeScrollShell(modifier = modifier, context = context) {
        TradeJourneyHeader(state.kicker, state.title, onOpenAccount)
        TradeShareCard(state.card)
        TradeSectionHeader("What goes in the card", null)
        OmenCard(
            modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16),
            contentPadding = PaddingValues(OmenTheme.spacing.step12),
        ) {
            Column {
                state.inclusions.forEach { inclusion ->
                    TradeShareToggleRow(inclusion) { onToggleInclusion?.invoke(inclusion.id) }
                }
            }
        }
        TradeNoteBlock(state.note, modifier = Modifier.padding(top = OmenTheme.spacing.step12))
        state.failure?.let {
            TradeUnreadBlock(
                capability = "Share link",
                sentence = it,
                modifier = Modifier
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step12),
            )
        }
        OmenButton(
            text = state.primaryActionTitle,
            onClick = { onShare?.invoke() },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step16)
                .padding(top = OmenTheme.spacing.step12),
            variant = OmenButtonVariant.Primary,
            size = OmenButtonSize.Lg,
        )
        state.secondaryActionTitle?.let {
            OmenButton(
                text = it,
                onClick = { onCopyAsText?.invoke() },
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(top = OmenTheme.spacing.step8),
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Lg,
            )
        }
    }
}

// MARK: Shared blocks

private const val UNKNOWN_FORMAT =
    "Omen has not read this league's trade format yet, so it is comparing two teams."

/** The chrome and the scroll every J4 screen sits in. All five artboards declare a scroll. */
@Composable
private fun TradeScrollShell(
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

/** `.top` — the eyebrow, the title, and E017's two controls. */
@Composable
private fun TradeJourneyHeader(kicker: String, title: String, onOpenAccount: (() -> Unit)?) {
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
            Text(
                title,
                style = OmenTheme.typography.screenTitle.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
        }
        OmenScreenHeaderControls(OmenHelpDestination.Trade, onOpenAccount = onOpenAccount)
    }
}

/** `.tabs2` — two tabs, not a general segmented control. */
@Composable
private fun TradeTabs(titles: List<String>, selectedIndex: Int, onSelect: ((Int) -> Unit)?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12)
            .drawBehind {
                drawRect(
                    color = borderSubtle,
                    topLeft = Offset(0f, size.height - 1f),
                    size = Size(size.width, 1f),
                )
            },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16),
    ) {
        titles.forEachIndexed { index, title ->
            val on = index == selectedIndex
            val accent = OmenTheme.color.accent
            Box(
                modifier = Modifier
                    .sizeIn(minWidth = 44.dp, minHeight = 44.dp)
                    .clickable(enabled = onSelect != null) { onSelect?.invoke(index) }
                    .drawBehind {
                        if (on) {
                            drawRect(
                                color = accent,
                                topLeft = Offset(0f, size.height - 2f),
                                size = Size(size.width, 2f),
                            )
                        }
                    }
                    .semantics { selected = on },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    title,
                    style = OmenTheme.typography.label.toTextStyle(),
                    color = if (on) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
                )
            }
        }
    }
}

/** `.partners`, plus the `Add team` control the contract will not let work. */
@Composable
private fun TradePartnerRow(
    partners: List<OmenTradePartner>,
    selectedId: String?,
    onSelect: ((String) -> Unit)?,
    /** Null omits the unavailable `Add team` chip entirely — used where it is already stated. */
    addTeamReason: String?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.Top,
    ) {
        partners.forEach { partner ->
            TradePartnerChip(partner, partner.id == selectedId) { onSelect?.invoke(partner.id) }
        }
        addTeamReason?.let { TradeAddTeamUnavailable(it) }
    }
}

@Composable
private fun TradePartnerChip(partner: OmenTradePartner, selected: Boolean, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(66.dp)
            .clickable(onClick = onClick)
            .semantics {
                contentDescription = listOfNotNull(partner.name, partner.need).joinToString(", ")
                this.selected = selected
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .clip(RoundedCornerShape(13.dp))
                .background(if (selected) OmenTheme.color.accentMuted else OmenTheme.color.surface3),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                partner.crest,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = if (selected) OmenTheme.color.accentHover else OmenTheme.color.textSecondary,
                maxLines = 1,
            )
        }
        Text(
            partner.name,
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = if (selected) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
        partner.need?.let {
            Text(
                it,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.accent,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                textAlign = TextAlign.Center,
            )
        }
    }
}

/**
 * The `.pt.addt` chip, rendered **unavailable**.
 *
 * `CONTRACTS.md`: *"Three-team controls must render unavailable until that changes."* Unavailable
 * is the third thing — not hidden, which would deny the product ever meant to do this, and not
 * live, which would let a user build an offer `POST /api/trade/compare` cannot score.
 *
 * Carriers per registry §2.3 and D7: tertiary ink, a **dashed** hairline, and — load-bearing —
 * a sentence beside it saying why. There is deliberately no `clickable`: a control that responds
 * to a tap by doing nothing is worse than one that plainly does not respond.
 */
@Composable
private fun TradeAddTeamUnavailable(reason: String) {
    val border = OmenTheme.color.border
    Column(
        modifier = Modifier
            .width(66.dp)
            .clearAndSetSemantics {
                contentDescription = "Add a third team. Unavailable. $reason"
            },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .drawBehind {
                    drawRoundRect(
                        color = border,
                        cornerRadius = CornerRadius(13.dp.toPx()),
                        style = Stroke(
                            width = 1.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(
                                floatArrayOf(4.dp.toPx(), 4.dp.toPx()),
                                0f,
                            ),
                        ),
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            Text("+", style = OmenTheme.typography.h3.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
        Text(
            "Add team",
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            maxLines = 1,
            textAlign = TextAlign.Center,
        )
        Text(
            "Two teams max",
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun TradeFilterRow(
    filters: List<OmenTradeFilter>,
    selectedId: String?,
    onSelect: ((String) -> Unit)?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step10),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        filters.forEach { filter ->
            val on = filter.id == selectedId
            val outline = when {
                on -> Color.Transparent
                filter.isSmart -> OmenTheme.color.accent.copy(alpha = 0.38f)
                else -> OmenTheme.color.borderSubtle
            }
            Box(
                modifier = Modifier
                    .sizeIn(minWidth = 44.dp, minHeight = 44.dp)
                    .clip(RoundedCornerShape(7.dp))
                    .background(if (on) OmenTheme.color.surface3 else Color.Transparent)
                    .drawBehind {
                        drawRoundRect(
                            color = outline,
                            cornerRadius = CornerRadius(7.dp.toPx()),
                            style = Stroke(width = 1.dp.toPx()),
                        )
                    }
                    .clickable(enabled = onSelect != null) { onSelect?.invoke(filter.id) }
                    .padding(horizontal = OmenTheme.spacing.step10)
                    .semantics { selected = on },
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    filter.title,
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = when {
                        on -> OmenTheme.color.textPrimary
                        filter.isSmart -> OmenTheme.color.accent
                        else -> OmenTheme.color.textTertiary
                    },
                    maxLines = 1,
                )
            }
        }
    }
}

/** `.leg` — one side of the offer, headed and ruled. */
@Composable
private fun TradeLegBlock(side: OmenTradeSide) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                side.heading,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
            Spacer(modifier = Modifier.width(OmenTheme.spacing.step8))
            Box(
                modifier = Modifier
                    .weight(1f)
                    .height(1.dp)
                    .background(OmenTheme.color.borderSubtle),
            )
        }
        side.legs.forEach { leg ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(10.dp))
                    .background(OmenTheme.color.surface1)
                    .padding(OmenTheme.spacing.step10)
                    .semantics {
                        contentDescription = listOfNotNull(leg.label, leg.name, leg.meta, leg.rank)
                            .joinToString(", ")
                    },
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    leg.label,
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = if (leg.direction == OmenTradeLeg.Direction.Sending) {
                        OmenTheme.color.textTertiary
                    } else {
                        OmenTheme.color.accent
                    },
                    modifier = Modifier.width(22.dp),
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        leg.name,
                        style = OmenTheme.typography.name.toTextStyle(),
                        color = OmenTheme.color.textPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        leg.meta,
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                // Nothing where there is no rank.
                leg.rank?.let {
                    Text(
                        it,
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                    )
                }
            }
        }
    }
}

/** `.verd` — the read, its caveat, its inputs and how to act on it. */
@Composable
private fun TradeReadBlock(read: OmenTradeRead, submission: OmenTradeSubmission?) {
    val hairline = OmenTheme.color.textPrimary.copy(alpha = 0.08f)
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step14)
            .clip(RoundedCornerShape(15.dp))
            .background(
                Brush.verticalGradient(
                    listOf(OmenTheme.color.surface2, OmenTheme.color.surface1),
                ),
            )
            .padding(OmenTheme.spacing.step14),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        // `.verdh` without the band. `trade-compare.v2` returns no confidence and no risk, and a
        // client that mints one is the `U1` defect.
        Text(
            read.headline,
            style = OmenTheme.typography.h3.toTextStyle(),
            color = OmenTheme.color.textPrimary,
        )
        Text(
            read.reasoning,
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textSecondary,
        )
        // `.meta` — the caveat, in the slot the risk chip used to hold. The half of Trade's
        // contract rule that is easiest to lose.
        Row(
            verticalAlignment = Alignment.Top,
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        ) {
            OmenBadge(
                label = if (read.isPersonalized) "Your league" else "Standard scoring",
                tone = if (read.isPersonalized) OmenBadgeTone.Live else OmenBadgeTone.Neutral,
            )
            Text(
                read.caveat,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
        }

        if (read.inputs.isNotEmpty()) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind { drawRect(color = hairline, size = Size(size.width, 1f)) }
                    .padding(top = OmenTheme.spacing.step10),
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
            ) {
                read.inputs.forEach { TradeInputRow(it) }
            }
        }

        submission?.let {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind { drawRect(color = hairline, size = Size(size.width, 1f)) }
                    .padding(top = OmenTheme.spacing.step10),
                verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        it.title,
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        it.caption,
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = OmenTheme.color.textTertiary,
                    )
                }
                it.steps.forEachIndexed { index, step ->
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                        verticalAlignment = Alignment.Top,
                        modifier = Modifier.semantics {
                            contentDescription = "Step ${index + 1}. $step"
                        },
                    ) {
                        Box(
                            modifier = Modifier
                                .size(17.dp)
                                .clip(CircleShape)
                                .background(OmenTheme.color.surface3),
                            contentAlignment = Alignment.Center,
                        ) {
                            Text(
                                "${index + 1}",
                                style = OmenTheme.typography.micro.toTextStyle(),
                                color = OmenTheme.color.textSecondary,
                            )
                        }
                        Text(
                            step,
                            style = OmenTheme.typography.bodySmall.toTextStyle(),
                            color = OmenTheme.color.textSecondary,
                        )
                    }
                }
            }
        }
    }
}

/** One `.evr` — a capability, in exactly one of the three renderable classes. */
@Composable
private fun TradeInputRow(input: OmenTradeInput) {
    Row(
        modifier = Modifier.fillMaxWidth().semantics {
            contentDescription = when (input.presentation) {
                OmenTradeInput.Presentation.Used -> "${input.capability}. ${input.statement}"
                OmenTradeInput.Presentation.ReadNotUsed ->
                    "${input.capability}. Read, and it did not decide this. ${input.statement}"
                OmenTradeInput.Presentation.CouldNotRead ->
                    "${input.capability}. Could not read. ${input.statement}"
            }
        },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
        verticalAlignment = Alignment.Top,
    ) {
        Text(
            input.capability,
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            maxLines = 2,
            modifier = Modifier
                .width(84.dp)
                .padding(top = OmenTheme.spacing.step4),
        )
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
        ) {
            Text(
                input.statement,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = if (input.presentation == OmenTradeInput.Presentation.Used) {
                    OmenTheme.color.textSecondary
                } else {
                    OmenTheme.color.textTertiary
                },
            )
            // Only the could-not-read class gets a badge. Acceptance rule 3 forbids evidence
            // styling on `used: false`, and a "Read" badge beside an input that did not matter
            // is exactly that styling.
            if (input.presentation == OmenTradeInput.Presentation.CouldNotRead) {
                OmenBadge(label = "Unavailable", tone = OmenBadgeTone.Unavailable)
            }
        }
    }
}

/** A player on someone else's roster, and what you may do about them. */
@Composable
private fun TradeRosterRow(row: OmenTradeRosterState.Row, onClick: () -> Unit) {
    val actionTitle = when (row.availability) {
        OmenTradeRosterState.Availability.Available -> "Add to deal"
        // Still tappable. The artboard's own note: "You can still offer; Omen is telling you the
        // odds, not stopping you." A disabled row turns advice into a rule.
        OmenTradeRosterState.Availability.TheyNeedThis -> "They need this"
        OmenTradeRosterState.Availability.Added -> "In the deal"
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .sizeIn(minHeight = 44.dp)
            .clickable(onClick = onClick)
            .padding(vertical = OmenTheme.spacing.step10)
            .clearAndSetSemantics {
                contentDescription = "${row.name}. ${row.meta}. $actionTitle."
            },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                row.name,
                style = OmenTheme.typography.name.toTextStyle(),
                color = if (row.availability == OmenTradeRosterState.Availability.TheyNeedThis) {
                    OmenTheme.color.textTertiary
                } else {
                    OmenTheme.color.textPrimary
                },
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                row.meta,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            actionTitle,
            style = OmenTheme.typography.micro.toTextStyle(),
            color = when (row.availability) {
                OmenTradeRosterState.Availability.Available -> OmenTheme.color.accent
                OmenTradeRosterState.Availability.TheyNeedThis -> OmenTheme.color.textTertiary
                OmenTradeRosterState.Availability.Added -> OmenTheme.color.textPrimary
            },
        )
    }
}

/**
 * One thing the share card may carry, and whether it does.
 *
 * The word, not a switch glyph, and not colour alone (D7) — "On"/"Off" is what the artboard draws
 * and the only carrier that survives a greyscale screenshot.
 */
@Composable
private fun TradeShareToggleRow(inclusion: OmenTradeShareState.Inclusion, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .sizeIn(minHeight = 44.dp)
            .clickable(onClick = onClick)
            .padding(vertical = OmenTheme.spacing.step10)
            .clearAndSetSemantics {
                contentDescription = "${inclusion.title}, ${inclusion.detail}"
                stateDescription = if (inclusion.isOn) "On" else "Off"
            },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                inclusion.title,
                style = OmenTheme.typography.name.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                inclusion.detail,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Text(
            if (inclusion.isOn) "On" else "Off",
            style = OmenTheme.typography.micro.toTextStyle(),
            color = if (inclusion.isOn) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
        )
    }
}

/** `.card.hero` — the card exactly as the share route will render it, caveat included. */
@Composable
private fun TradeShareCard(card: OmenTradeShareState.Card) {
    val hairline = OmenTheme.color.borderSubtle
    OmenCard(
        modifier = Modifier
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step14),
        contentPadding = PaddingValues(OmenTheme.spacing.step12),
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
            Text(
                card.eyebrow,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
            Text(
                card.headline,
                style = OmenTheme.typography.h3.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            Text(
                card.reasoning,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
            Text(
                card.caveat,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
            Text(
                card.footer,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
                modifier = Modifier
                    .fillMaxWidth()
                    .drawBehind { drawRect(color = hairline, size = Size(size.width, 1f)) }
                    .padding(top = OmenTheme.spacing.step10),
            )
        }
    }
}

/**
 * The *could not read* class rendered as a whole block — used where an entire section failed, as
 * `TradeRoster`'s permanent provider limit does. Named, a sentence, a dashed hairline, and no
 * evidence styling. Never dropped to make room.
 */
@Composable
private fun TradeUnreadBlock(capability: String, sentence: String, modifier: Modifier = Modifier) {
    val border = OmenTheme.color.border
    Column(
        modifier = modifier
            .fillMaxWidth()
            .drawBehind {
                drawRoundRect(
                    color = border,
                    cornerRadius = CornerRadius(13.dp.toPx()),
                    style = Stroke(
                        width = 1.dp.toPx(),
                        pathEffect = PathEffect.dashPathEffect(
                            floatArrayOf(4.dp.toPx(), 4.dp.toPx()),
                            0f,
                        ),
                    ),
                )
            }
            .padding(OmenTheme.spacing.step12)
            .semantics { contentDescription = "$capability. Could not read. $sentence" },
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
    ) {
        Text(
            capability,
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
        Text(
            sentence,
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            color = OmenTheme.color.textTertiary,
        )
    }
}

/** `.note` — a paragraph on `surface-1`, for the thing the screen wants read rather than skimmed. */
@Composable
private fun TradeNoteBlock(text: String, modifier: Modifier = Modifier) {
    Text(
        text,
        style = OmenTheme.typography.bodySmall.toTextStyle(),
        color = OmenTheme.color.textSecondary,
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .clip(RoundedCornerShape(10.dp))
            .background(OmenTheme.color.surface1)
            .padding(OmenTheme.spacing.step12),
    )
}

/** `.sh` — a bold name and an optional count on the right. */
@Composable
private fun TradeSectionHeader(title: String, trailing: String?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step14, bottom = OmenTheme.spacing.step6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            title,
            style = OmenTheme.typography.cardLead.toTextStyle(),
            color = OmenTheme.color.textPrimary,
            modifier = Modifier.weight(1f),
        )
        trailing?.let {
            Text(
                it,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
        }
    }
}

// MARK: Binding the journey to `trade-compare.v2`

/**
 * Builds the read block from a real Compare response.
 *
 * **Nothing here invents a value.** The headline is [TradeCompare.headline], which switches on
 * `verdict_state` and nothing else. The caveat is `analysis_context`'s own mode. The inputs are
 * the server's `capabilities` list mapped class-for-class, with `not_requested` dropped rather
 * than rendered. There is deliberately no band and no risk level.
 */
fun omenTradeRead(compare: TradeCompare): OmenTradeRead = OmenTradeRead(
    headline = compare.headline,
    reasoning = compare.explanation?.takeIf { it.isNotBlank() } ?: compare.subhead,
    caveat = omenTradeCaveat(compare),
    isPersonalized = compare.analysisContext.isPersonalized,
    inputs = compare.capabilities.mapNotNull(::omenTradeInput),
)

/** The caveat is composed from `analysis_context` and never from the verdict. */
private fun omenTradeCaveat(compare: TradeCompare): String {
    compare.analysisContext.unavailableReason?.let { reason ->
        return when (reason) {
            "unauthenticated" ->
                "Omen used standard scoring — sign in and it will use your league's settings instead."
            "provider_unsupported" ->
                "This provider does not support personalized trade analysis yet, so this is standard scoring."
            else -> "Omen used standard scoring for this one, not your league's settings."
        }
    }
    if (compare.analysisContext.isPersonalized) {
        val league = compare.analysisContext.leagueName
        return if (league != null) {
            "Scored against $league's settings and your roster."
        } else {
            "Scored against your league's settings and your roster."
        }
    }
    return "Standard scoring — not your league's settings. Need usually decides a trade, and " +
        "need is what standard scoring cannot see."
}

/**
 * Maps one server-resolved capability onto a presentation class.
 *
 * Returns null for `not_requested`: the fourth class renders as nothing, and the cleanest way to
 * guarantee that is for such an input never to become an [OmenTradeInput].
 *
 * `pending` resolves to *could not read*, never to a spinner — the 2026-09-17 latency contract.
 */
fun omenTradeInput(capability: OmenDecisionCapability): OmenTradeInput? {
    val label = capability.name.orEmpty()
        .split('_')
        .filter { it.isNotBlank() }
        .joinToString(" ") { it.replaceFirstChar(Char::uppercaseChar) }
    if (label.isEmpty()) return null

    return when (capability.state) {
        "not_requested" -> null
        "live", "stub", "mock", "demo" -> OmenTradeInput(
            capability = label,
            // `used == null` means the server did not say, which is not `false` and is also not
            // permission to claim it decided anything.
            statement = capability.statement ?: capability.source.orEmpty(),
            presentation = if (capability.used == true) {
                OmenTradeInput.Presentation.Used
            } else {
                OmenTradeInput.Presentation.ReadNotUsed
            },
        )
        else -> OmenTradeInput(
            capability = label,
            statement = capability.statement ?: "Omen could not read this.",
            presentation = OmenTradeInput.Presentation.CouldNotRead,
        )
    }
}
