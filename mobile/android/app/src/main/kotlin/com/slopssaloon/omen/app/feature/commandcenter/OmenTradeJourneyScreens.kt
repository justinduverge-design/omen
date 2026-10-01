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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
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
import com.slopssaloon.omen.app.feature.api.TradeOffer
import com.slopssaloon.omen.app.feature.api.TradePlayer
import com.slopssaloon.omen.app.feature.api.TradeThreeTeamCompare
import com.slopssaloon.omen.app.feature.api.TradeThreeTeamLeg
import com.slopssaloon.omen.app.feature.api.TradeThreeTeamOffer
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
    /**
     * T5 adds [Lateral]: a 3-team ring can move a player between two teams that are neither
     * "you" — this enum used to be exhaustive with only two cases because a 2-team trade only
     * ever has two participants, and anything not sent by you was received by you.
     * `TradeBuildThreeTeam-v1.md`'s own interaction note: rather than mislabel a lateral leg
     * "In" (wrong — it never reaches you) or invent a new glyph, this state renders no label at
     * all — `_shared.css`'s "absence is the state" philosophy, same tier as `.rk.lo`.
     */
    enum class Direction { Sending, Receiving, Lateral }

    /** The visible label. Blank, not a dash, for [Direction.Lateral]. */
    val label: String
        get() = when (direction) {
            Direction.Sending -> "Out"
            Direction.Receiving -> "In"
            Direction.Lateral -> ""
        }

    /**
     * What TalkBack says for the direction, independent of [label]. A blank visible label must
     * still be **announced**, not just visually absent —
     * `TradeBuildThreeTeam-v1.md`'s own acceptance rule: "never color as the only carrier of the
     * blank state."
     */
    val accessibilityDirection: String
        get() = when (direction) {
            Direction.Sending -> "Sent by you"
            Direction.Receiving -> "Received by you"
            Direction.Lateral -> "Not sent or received by you"
        }
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

/**
 * T5, `TradeRoster`'s three-team recipient chooser — the addendum to `TradeRoster-v1.md`. One
 * pill per other team in the trade: `id` is the team id (`"you"` for the viewer), `label` is
 * "Send to you" / "Send to Chubb Rock".
 */
data class OmenTradeRecipient(val id: String, val label: String)

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
data class OmenTradeSubmission(
    val title: String,
    val caption: String,
    val steps: List<String>,
    /**
     * T5: one flag per [steps] entry — a client-local "done" toggle for the 3-team split-handoff
     * checklist. **Empty for the 2-team case**, which has no checklist at all (`omenTradeAnswer`
     * never sets `submission` for a 2-team verdict), so this is purely additive.
     *
     * Never synced, never sent to the server, never read back as proof a leg went through —
     * `TradeBuildThreeTeam-v1.md`'s own rule.
     */
    val stepDone: List<Boolean> = emptyList(),
    /** "0 of 3 legs sent." Derived purely from [stepDone]. Null where there is nothing to count. */
    val progressCaption: String? = null,
)

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
    /**
     * T5: present once a third team is active. When set, `.partners` renders exactly the primary
     * partner plus this chip — two fixed `.pt.on` chips and no browsable candidates — per
     * `TradeBuildThreeTeam-v1.md`'s own rule. `null` is the entire existing 2-team behavior,
     * unchanged.
     */
    val thirdPartner: OmenTradePartner? = null,
    /** "Removed Chubb Rock. Any legs with them were cleared too." Transient; null otherwise. */
    val removalDisclosure: String? = null,
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

    data class Row(
        val id: String,
        val name: String,
        val meta: String,
        val availability: Availability,
        /**
         * T5: non-empty only while three teams are active and this row's team is not one of the
         * recipients. `TradeRoster-v1.md`'s addendum: at most two pills, one per other team in
         * the trade.
         */
        val recipients: List<OmenTradeRecipient> = emptyList(),
    )

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
    /**
     * T5: opens `TradePartnerPicker`. Only ever invoked from the live `.pt.addt` chip, which only
     * renders when `capability.threeTeamSupported` is true and no third partner is active.
     */
    onOpenPartnerPicker: (() -> Unit)? = null,
    /**
     * T5: tapping the already-selected third-partner chip a second time. Never invoked for the
     * primary chip — `TradeBuildThreeTeam-v1.md`: "The primary partner chip is not removable
     * this way."
     */
    onRemoveThirdPartner: (() -> Unit)? = null,
    /** T5: present only when `submission.stepDone` is non-empty (the 3-team checklist case). */
    onToggleSubmissionStepDone: ((Int) -> Unit)? = null,
    onCopySubmissionStep: ((Int) -> Unit)? = null,
) {
    TradeScrollShell(modifier = modifier, context = context) {
        TradeJourneyHeader(state.kicker, state.title, onOpenAccount)
        TradeTabs(state.tabTitles, state.selectedTabIndex, onSelectTab)
        if (state.thirdPartner != null) {
            ThreeTeamPartnerRow(
                primary = state.partners.firstOrNull { it.id == state.selectedPartnerId },
                thirdPartner = state.thirdPartner,
                onRemoveThirdPartner = onRemoveThirdPartner,
            )
        } else {
            TradePartnerRow(
                partners = state.partners,
                selectedId = state.selectedPartnerId,
                onSelect = onSelectPartner,
                addTeamReason = state.capability?.reasonSentence ?: UNKNOWN_FORMAT,
                threeTeamSupported = state.capability?.threeTeamSupported == true,
                onOpenPartnerPicker = onOpenPartnerPicker,
            )
        }
        state.removalDisclosure?.let {
            TradeNoteBlock(text = it, modifier = Modifier.padding(top = OmenTheme.spacing.step8))
        }
        TradeFilterRow(state.filters, state.selectedFilterId, onSelectFilter)
        // Once three teams are active there is nothing left to explain about the chip row.
        if (state.thirdPartner == null) {
            TradeNoteBlock(
                text = state.capability?.reasonSentence ?: UNKNOWN_FORMAT,
                modifier = Modifier.padding(top = OmenTheme.spacing.step12),
            )
        }
        state.sides.forEach { TradeLegBlock(it) }
        state.read?.let {
            TradeReadBlock(it, state.submission, onToggleSubmissionStepDone, onCopySubmissionStep)
        }
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
    /** T5: fires when a recipient pill is tapped on a row with a choice to make. */
    onChooseRecipient: ((playerId: String, recipientTeamId: String) -> Unit)? = null,
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
                            TradeRosterRow(
                                row = row,
                                onClick = { onAddPlayer?.invoke(row.id) },
                                onChooseRecipient = { recipient -> onChooseRecipient?.invoke(row.id, recipient.id) },
                            )
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
    // Hoisted out of `drawBehind`: that lambda is a `DrawScope`, not a `@Composable`, so it
    // cannot read `OmenTheme.color` itself. Reading the token here and capturing it is the
    // same pattern `accent` below already uses.
    val borderSubtle = OmenTheme.color.borderSubtle
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
    /** T5: swaps the unavailable chip for the live one that opens `TradePartnerPicker`. */
    threeTeamSupported: Boolean = false,
    onOpenPartnerPicker: (() -> Unit)? = null,
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
        if (threeTeamSupported) {
            TradeAddTeamLive(onClick = { onOpenPartnerPicker?.invoke() })
        } else {
            addTeamReason?.let { TradeAddTeamUnavailable(it) }
        }
    }
}

/**
 * T5: the two fixed chips shown once a third team is active — no candidates, no add-team chip.
 * `TradeBuildThreeTeam-v1.md`'s own rule: swapping the third team is remove-then-reopen-the-
 * picker, not a direct tap, so the primary chip is a no-op here and only the third chip removes.
 */
@Composable
private fun ThreeTeamPartnerRow(
    primary: OmenTradePartner?,
    thirdPartner: OmenTradePartner,
    onRemoveThirdPartner: (() -> Unit)?,
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
        if (primary != null) {
            TradePartnerChip(primary, selected = true, onClick = {})
        }
        TradePartnerChip(thirdPartner, selected = true, onClick = { onRemoveThirdPartner?.invoke() })
    }
}

/**
 * The `.pt.addt` chip, **live**. `TradePartnerPicker-v1.md`: "the live `Add team` chip is a new
 * enabled state of an existing component, not a new component" — same shell, same accent-dashed
 * treatment already defined for `.fc.smart`, just no longer wrapped in the unavailable carrier.
 */
@Composable
private fun TradeAddTeamLive(onClick: () -> Unit) {
    val accent = OmenTheme.color.accent
    Column(
        modifier = Modifier
            .width(66.dp)
            .clickable(onClick = onClick)
            .semantics { contentDescription = "Add a third team" },
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
    ) {
        Box(
            modifier = Modifier
                .size(44.dp)
                .drawBehind {
                    drawRoundRect(
                        color = accent,
                        cornerRadius = CornerRadius(13.dp.toPx()),
                        style = Stroke(
                            width = 1.dp.toPx(),
                            pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx()), 0f),
                        ),
                    )
                },
            contentAlignment = Alignment.Center,
        ) {
            Text("+", style = OmenTheme.typography.h3.toTextStyle(), color = accent)
        }
        Text("Add team", style = OmenTheme.typography.bodySmall.toTextStyle(), color = accent, maxLines = 1, textAlign = TextAlign.Center)
        Text(
            "Add a third team",
            style = OmenTheme.typography.micro.toTextStyle(),
            color = accent,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
        )
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
                        contentDescription = listOfNotNull(leg.accessibilityDirection, leg.name, leg.meta, leg.rank)
                            .joinToString(", ")
                    },
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // `.lateral` renders no glyph at all — not even a dash — per
                // `TradeBuildThreeTeam-v1.md`'s acceptance check. The 22dp column stays reserved
                // so the name/meta column does not shift between rows.
                Text(
                    leg.label,
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = if (leg.direction == OmenTradeLeg.Direction.Receiving) {
                        OmenTheme.color.accent
                    } else {
                        OmenTheme.color.textTertiary
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
private fun TradeReadBlock(
    read: OmenTradeRead,
    submission: OmenTradeSubmission?,
    onToggleStepDone: ((Int) -> Unit)? = null,
    onCopyStep: ((Int) -> Unit)? = null,
) {
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
                // T5: "0 of 3 legs sent." Derived client-side from `stepDone`; never implies the
                // provider confirmed anything.
                it.progressCaption?.let { progress ->
                    Text(progress, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
                }
                it.steps.forEachIndexed { index, step ->
                    val isDone = it.stepDone.getOrNull(index)
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                        verticalAlignment = Alignment.Top,
                    ) {
                        Row(
                            // **Not `.clickable` at all** when there is nothing to toggle — the
                            // 2-team-style read-only checklist (`onToggleStepDone == null`) stays
                            // exactly the plain, non-interactive list item it was before T5. A
                            // `clickable(enabled = false)` here still exposes a clickable
                            // semantics role, which is the wrong hit-testing/TalkBack surface for
                            // a row nothing can ever activate.
                            modifier = Modifier
                                .weight(1f)
                                .let { m ->
                                    if (onToggleStepDone != null) {
                                        m.sizeIn(minHeight = 44.dp).clickable { onToggleStepDone(index) }
                                    } else {
                                        m
                                    }
                                }
                                .semantics {
                                    contentDescription = "Step ${index + 1}. $step." +
                                        when (isDone) {
                                            true -> " Done."
                                            false -> " Not done."
                                            null -> ""
                                        }
                                },
                            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
                            verticalAlignment = Alignment.Top,
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(17.dp)
                                    .clip(CircleShape)
                                    .background(if (isDone == true) OmenTheme.color.accent else OmenTheme.color.surface3),
                                contentAlignment = Alignment.Center,
                            ) {
                                if (isDone == null) {
                                    Text(
                                        "${index + 1}",
                                        style = OmenTheme.typography.micro.toTextStyle(),
                                        color = OmenTheme.color.textSecondary,
                                    )
                                }
                            }
                            Text(
                                step,
                                style = OmenTheme.typography.bodySmall.toTextStyle(),
                                color = OmenTheme.color.textSecondary,
                            )
                        }
                        // Sibling tap target, not nested inside the row's own clickable — a
                        // second "Copy" micro-action that copies only this leg's player names.
                        if (onCopyStep != null) {
                            Text(
                                "Copy",
                                style = OmenTheme.typography.micro.toTextStyle(),
                                color = OmenTheme.color.accent,
                                modifier = Modifier
                                    .sizeIn(minWidth = 44.dp, minHeight = 44.dp)
                                    .clickable { onCopyStep(index) }
                                    .semantics { contentDescription = "Copy step ${index + 1}" },
                            )
                        }
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

/**
 * A player on someone else's roster, and what you may do about them.
 *
 * T5, `TradeRoster-v1.md`'s addendum: when [row] carries [OmenTradeRosterState.Row.recipients],
 * tapping the row expands it in place to a recipient chooser instead of calling [onClick]
 * directly — [onChooseRecipient] fires only once a pill is tapped. With no recipients (the
 * existing 2-team case) this is byte-for-byte the original row: a single tap commits straight to
 * "you" via [onClick], unchanged.
 */
@Composable
private fun TradeRosterRow(
    row: OmenTradeRosterState.Row,
    onClick: () -> Unit,
    onChooseRecipient: ((OmenTradeRecipient) -> Unit)? = null,
) {
    val actionTitle = when (row.availability) {
        OmenTradeRosterState.Availability.Available -> "Add to deal"
        // Still tappable. The artboard's own note: "You can still offer; Omen is telling you the
        // odds, not stopping you." A disabled row turns advice into a rule.
        OmenTradeRosterState.Availability.TheyNeedThis -> "They need this"
        OmenTradeRosterState.Availability.Added -> "In the deal"
    }
    val hasRecipientChoice = row.availability == OmenTradeRosterState.Availability.Available && row.recipients.isNotEmpty()
    var isExpanded by remember(row.id) { mutableStateOf(false) }

    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .sizeIn(minHeight = 44.dp)
                .clickable(onClick = { if (hasRecipientChoice) isExpanded = !isExpanded else onClick() })
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
        // Expands in place — no new screen, no modal. Collapsing without a choice (tapping
        // "Add to deal" again) leaves the row exactly as it was: no leg committed either way.
        if (hasRecipientChoice && isExpanded) {
            val accentOutline = OmenTheme.color.accent.copy(alpha = 0.38f)
            Row(
                modifier = Modifier.padding(bottom = OmenTheme.spacing.step8),
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
            ) {
                row.recipients.forEach { recipient ->
                    Box(
                        modifier = Modifier
                            .sizeIn(minWidth = 44.dp, minHeight = 44.dp)
                            .clip(RoundedCornerShape(7.dp))
                            .drawBehind {
                                drawRoundRect(
                                    color = accentOutline,
                                    cornerRadius = CornerRadius(7.dp.toPx()),
                                    style = Stroke(width = 1.dp.toPx()),
                                )
                            }
                            .clickable {
                                isExpanded = false
                                onChooseRecipient?.invoke(recipient)
                            }
                            .padding(horizontal = OmenTheme.spacing.step10),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(recipient.label, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent, maxLines = 1)
                    }
                }
            }
        }
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
private fun omenTradeCaveat(compare: TradeCompare): String = omenTradeCaveat(compare.analysisContext)

/**
 * T5: hoisted so the three-team read builder — which carries the identical `analysis_context`
 * vocabulary but is a distinct type — reads the same sentences rather than a second copy.
 */
private fun omenTradeCaveat(analysisContext: TradeCompare.AnalysisContext): String {
    analysisContext.unavailableReason?.let { reason ->
        return when (reason) {
            "unauthenticated" ->
                "Omen used standard scoring — sign in and it will use your league's settings instead."
            "provider_unsupported" ->
                "This provider does not support personalized trade analysis yet, so this is standard scoring."
            else -> "Omen used standard scoring for this one, not your league's settings."
        }
    }
    if (analysisContext.isPersonalized) {
        val league = analysisContext.leagueName
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
 * T5: the "your own" read for a three-team compare. `TradeThreeTeamCompare` has no top-level
 * `explanation` field (T1's route never sets one for the `legs` branch), so the reasoning line
 * is composed the same way [TradeCompare.subhead] is — from `verdictState` and `evaluability` —
 * rather than left blank. There are no `capabilities` in this response either, so `inputs` is
 * always empty.
 */
fun omenTradeThreeTeamRead(compare: TradeThreeTeamCompare): OmenTradeRead = OmenTradeRead(
    headline = TradeCompare.headlineFor(compare.verdictState),
    reasoning = omenTradeThreeTeamSubhead(compare),
    caveat = omenTradeCaveat(compare.analysisContext),
    isPersonalized = compare.analysisContext.isPersonalized,
    inputs = emptyList(),
)

/** The three-team mirror of [TradeCompare.subhead]. */
private fun omenTradeThreeTeamSubhead(compare: TradeThreeTeamCompare): String =
    when (compare.verdictState) {
        TradeCompare.VerdictState.InsufficientData -> when (compare.evaluability.reason) {
            "no_players" -> "Add players to every leg and Omen will look at it."
            "missing_projections" -> {
                val n = compare.evaluability.missingProjectionCount
                if (n == 1) {
                    "Omen has no projection for 1 of these players, so it won't force a verdict."
                } else {
                    "Omen has no projection for $n of these players, so it won't force a verdict."
                }
            }
            else -> "Omen doesn't have enough to evaluate this three-team deal."
        }
        TradeCompare.VerdictState.CloseNeedsContext ->
            "The value is close enough that your roster and league settings decide it."
        else -> if (compare.analysisContext.isPersonalized) {
            "Based on your league's scoring and your roster."
        } else {
            "Based on standard scoring — not your league's settings."
        }
    }

/**
 * T5: builds the split-handoff checklist from T1's `submission` block plus the client-local
 * `doneSteps` set. `doneSteps` is never sent anywhere.
 */
fun omenTradeThreeTeamSubmission(
    submission: TradeThreeTeamCompare.Submission,
    platform: String?,
    doneSteps: Set<Int>,
): OmenTradeSubmission {
    val doneFlags = submission.steps.indices.map { doneSteps.contains(it) }
    val doneCount = doneFlags.count { it }
    val caption = listOfNotNull(platform?.uppercase(), "Handoff only").joinToString(" · ")
    return OmenTradeSubmission(
        title = "How to submit this",
        caption = caption.ifEmpty { "Handoff only" },
        steps = submission.steps,
        stepDone = doneFlags,
        progressCaption = "$doneCount of ${submission.steps.size} legs sent.",
    )
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

// MARK: The production route into J4

/**
 * The J4 answer, built from a real `trade-compare.v2` response. The Compose half of
 * `OmenTradeAnswer` in `OmenTradeJourneyScreens.swift`.
 *
 * `TradeVerdict`/`TradeNeedsContext` are "the answer" and route through here.
 * `TradeBuild`/`TradeRoster`/`TradeShare` route independently, from `OmenAndroidApp.kt`, driven
 * by `TradeViewModel.rosterBuildState`/`.rosterScreenState`/`.shareScreenState` — see that file's
 * doc comment for why they are not "the answer" and do not belong in this sealed interface. A
 * copied rule is a second source of truth and the copy is the one that goes stale.
 */
sealed interface OmenTradeAnswer {
    data class Verdict(val state: OmenTradeVerdictState) : OmenTradeAnswer
    data class NeedsContext(val state: OmenTradeNeedsContextState) : OmenTradeAnswer
}

/**
 * Null where there is no answer to show — an offer with nothing on either side has no two sides
 * to draw.
 */
fun omenTradeAnswer(compare: TradeCompare, offer: TradeOffer): OmenTradeAnswer? {
    val sides = omenTradeSides(offer)
    if (sides.none { it.legs.isNotEmpty() }) return null
    val read = omenTradeRead(compare)

    return when (compare.verdictState) {
        TradeCompare.VerdictState.CloseNeedsContext,
        TradeCompare.VerdictState.InsufficientData,
        -> OmenTradeAnswer.NeedsContext(
            OmenTradeNeedsContextState(
                // The screen is titled; the call lives in the read block. Putting
                // `compare.headline` in both prints it twice on one screen.
                kicker = "Two teams",
                title = "Not yet",
                sides = sides,
                read = read,
                // Offered only where it is genuinely the remedy. A personalized read that still
                // could not call it is not fixed by connecting a league already connected.
                remedy = if (compare.analysisContext.isPersonalized) {
                    null
                } else {
                    "Connect the league this offer is in and Omen can score it against your " +
                        "own settings instead of standard scoring."
                },
                connectActionTitle = if (compare.analysisContext.isPersonalized) {
                    null
                } else {
                    "Connect this league"
                },
                // The secondary slot. There is no "show it anyway" here — the read above already
                // is the standard-scoring read — so the honest secondary is the way back.
                showAnywayActionTitle = "Change the offer",
            ),
        )

        TradeCompare.VerdictState.FavorsYou,
        TradeCompare.VerdictState.YouGiveUpTooMuch,
        -> OmenTradeAnswer.Verdict(
            OmenTradeVerdictState(
                kicker = "Two teams",
                title = "The read",
                sides = sides,
                read = read,
                // `trade-capabilities.v1`'s `submission` is one word about how a provider accepts
                // a trade, not a list of steps. Three plausible ESPN steps composed here would be
                // the client inventing a procedure.
                submission = null,
                primaryActionTitle = "Change the offer",
                // No counter builder exists yet — separate product work from wiring the
                // existing `POST /api/trade/share` route.
                counterActionTitle = null,
                // `TradeViewModel.share(userId)` now calls `POST /api/trade/share` for real.
                shareActionTitle = "Share this read",
            ),
        )
    }
}

/**
 * Both sides, always — Trade "must show both sides". Not private: [TradeViewModel]'s
 * roster-browse wiring (`rosterBuildState`) reuses this to render the same block on `TradeBuild`
 * before a verdict exists.
 */
fun omenTradeSides(offer: TradeOffer): List<OmenTradeSide> = listOf(
    OmenTradeSide("You send", offer.send.map { omenTradeLeg(it, OmenTradeLeg.Direction.Sending) }),
    OmenTradeSide("You receive", offer.receive.map { omenTradeLeg(it, OmenTradeLeg.Direction.Receiving) }),
)

/**
 * `rank` is always null on a live offer, and that is correct rather than missing: the offer
 * carries names and positions, and `trade-compare.v2` returns no per-player rank.
 */
private fun omenTradeLeg(player: TradePlayer, direction: OmenTradeLeg.Direction) = OmenTradeLeg(
    direction = direction,
    name = player.name,
    meta = listOfNotNull(player.position, player.team).joinToString(" · "),
    rank = null,
)

// MARK: T5: three-team leg blocks

/**
 * Generalizes the fixed "You send"/"You receive" pair into N team-headed blocks, one per team
 * that sends something — `TradeBuildThreeTeam-v1.md`'s own rule: *"each leg block is headed by a
 * team, not by a direction... never one block per pairwise leg."*
 *
 * **Built from the locally-authored [TradeThreeTeamOffer.legs], not from
 * `TradeThreeTeamCompare.participants[].sends`.** The two disagree in one respect the contract
 * does not resolve: T1's `participant.sends` pools every leg that team sent into one flat list
 * with no per-player destination and no player `team` (NFL) field (see
 * `TradeThreeTeamCompare.Player`'s doc comment). This beta's only tested shape is a ring where
 * each team sends to exactly one recipient, so the two sources agree there — but reading the
 * destination and NFL-team abbreviation off the client's own authored legs is the only way to
 * build the exact `meta` string (`"RB · IND → Davante's"`) the contract specifies without
 * fabricating a `team` the server never returns. This is enrichment of already-known data, not
 * the "leg-to-side reassembly" the contract warns against — the grouping (which teams get a
 * block, and in what order) still comes from [teamOrder], which the caller derives from the same
 * `uniqueTeamIdsFromLegs`-style bookkeeping T1 itself does server-side.
 *
 * @param teamOrder viewer id first, then partner ids in the order they were added to the trade —
 * `TradeBuildThreeTeam-v1.md`: "block order matches the `.partners` chip order above it." A team
 * with nothing to send is filtered out — only participants that send something get a block.
 */
fun omenTradeThreeTeamSides(offer: TradeThreeTeamOffer, viewerTeamId: String, teamOrder: List<String>): List<OmenTradeSide> {
    val sendingTeamIds = offer.legs.map { it.from }.toSet()
    return teamOrder.filter(sendingTeamIds::contains).map { teamId ->
        val legsFromTeam = offer.legs.filter { it.from == teamId }
        val heading = if (teamId == viewerTeamId) {
            "You send"
        } else {
            "${legsFromTeam.firstOrNull()?.fromName?.takeIf { it.isNotEmpty() } ?: teamId} sends"
        }
        val rows = legsFromTeam.flatMap { leg -> leg.players.map { player -> omenTradeThreeTeamLeg(player, leg, viewerTeamId) } }
        OmenTradeSide(heading, rows)
    }
}

/**
 * One row of a three-team leg block. `rank` stays null for the same reason the 2-team
 * [omenTradeLeg] helper leaves it null — `trade-compare.v2` computes no per-player rank in
 * either shape.
 */
private fun omenTradeThreeTeamLeg(player: TradePlayer, leg: TradeThreeTeamLeg, viewerTeamId: String): OmenTradeLeg {
    val direction = when {
        leg.from == viewerTeamId -> OmenTradeLeg.Direction.Sending
        leg.to == viewerTeamId -> OmenTradeLeg.Direction.Receiving
        else -> OmenTradeLeg.Direction.Lateral
    }
    val parts = listOfNotNull(player.position, player.team).filter { it.isNotEmpty() }
    var meta = parts.joinToString(" · ")
    // The destination suffix is load-bearing only when the recipient is not the viewer — never
    // "→ you" for a row where the viewer is the recipient.
    if (leg.to != viewerTeamId && !leg.toName.isNullOrEmpty()) {
        meta = if (meta.isEmpty()) "→ ${leg.toName}" else "$meta → ${leg.toName}"
    }
    return OmenTradeLeg(direction = direction, name = player.name, meta = meta, rank = null)
}
