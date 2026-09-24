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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.sizeIn
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Canvas
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.PathEffect
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.feature.api.QuietWeekResponse
import com.slopssaloon.omen.app.feature.help.OmenHelpDestination
import com.slopssaloon.omen.app.feature.shell.OmenScreenContext
import com.slopssaloon.omen.app.feature.shell.OmenScreenHeaderControls
import com.slopssaloon.omen.app.feature.shell.OmenScreenSwitcherBar
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenConfidenceBand
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

// ---------------------------------------------------------------------------------------------
// J2, "the desk" — the Compose half.
//
// The five artboards of `screen-journeys-v1.md`'s second journey: `CommandCenter`,
// `CommandQuiet`, `CommandQuietStraight`, `SwitchSheet` and `SwitchLoading`, mirrored from
// `App/CommandCenter/OmenDeskScreens.swift` so a contact sheet does not compare the canvas
// against two different products.
//
// The capability contract is the same on both platforms and is written out in full in the Swift
// file rather than restated here: four presentation classes, `not_requested` rendered nowhere,
// and no capability glyphs anywhere — `capability-symbols-v1.md` corrected that invented
// requirement on 2026-09-18 and a capability renders as a word.
//
// `OmenCommandCenterScreen` in this same package is NOT replaced. It is the v1.1 assembly built
// against the visual briefs and it still serves the carousel account and three screenshot
// scenarios. Deleting it to land a journey would take those with it.
// ---------------------------------------------------------------------------------------------

// MARK: State

/** One side of the scoreboard. */
data class OmenDeskTeam(
    val crest: String,
    val name: String,
    /**
     * "5–2 · you" / "6–1". The server composes it; the screen never derives "you" from a
     * comparison it would have to guess at.
     */
    val record: String,
    val score: String,
    val isMine: Boolean,
)

/** The `.board` block. */
data class OmenDeskMatchup(
    val platform: OmenPlatform,
    /** "Live · Q2", "Final", "Pre-game". Server wording, rendered verbatim. */
    val status: String,
    val leader: OmenDeskTeam,
    val trailer: OmenDeskTeam,
    /** "119.6 – 114.2". Null when the provider returned no projection for either side. */
    val projection: String? = null,
    val projectionNote: String? = null,
    /**
     * 0..1, the artboard's `--h` on the inset rule.
     *
     * **Null means the rule renders as a bare hairline.** The artboard draws it at 66% and the
     * temptation is to reproduce that from the two live scores, but a bar claiming to show a
     * projected lead cannot be derived from points already scored.
     */
    val leadFraction: Float? = null,
    val watch: String? = null,
)

/**
 * A section's availability, which on this screen is per-section by contract:
 * `CONTRACTS.md` — "Every section fails independently; a dead matchup read sits beside live
 * standings."
 *
 * [Unread] carries the capability **name** and a sentence. Both, because
 * `capability-expression-v1.md` acceptance rule 4 requires every unavailable input to be named,
 * and rule 3 forbids dressing it as evidence.
 */
sealed interface OmenDeskSection<out T> {
    data class Read<T>(val value: T) : OmenDeskSection<T>
    data class Unread(val capability: String, val sentence: String) : OmenDeskSection<Nothing>

    /**
     * Mid-`POST /api/leagues/active`. Distinct from [Unread]: a switch in flight is not a
     * failure, and per §10.3 the previous team's numbers are discarded rather than shown while
     * it resolves.
     */
    data object Switching : OmenDeskSection<Nothing>
}

/**
 * The waiver hero card's move.
 *
 * Everything but the incoming player is optional. The artboard draws the best case and
 * `waiver-analysis.v1` frequently has less — `best_move.bid` is `null` rather than `0` when any
 * input is missing. Modelling the best case as required would force a client to invent the rest.
 */
data class OmenDeskWaiverMove(
    val addName: String,
    val addMeta: String,
    val addPoints: String? = null,
    val dropName: String? = null,
    val dropMeta: String? = null,
    val dropPoints: String? = null,
    val reasoning: String,
    val band: OmenConfidenceBand? = null,
    val risk: OmenRiskLevel = OmenRiskLevel.Low,
)

/** `moves-history.v2` maps stored `win`/`loss` to these. The raw column is never surfaced. */
enum class OmenDeskLedgerOutcome(val label: String) {
    Worked("Worked"),
    DidNotWork("Did not work"),
    Pending("Pending"),
    NotVerified("Not verified"),
}

/** The single `.lrow` under "The Ledger". */
data class OmenDeskLedgerLine(
    val summary: String,
    /** "This week · start / sit · you followed it" */
    val meta: String,
    val outcome: OmenDeskLedgerOutcome,
)

/**
 * The `.oneline` foot strip — where the *read, not used* class lands on a screen with no
 * evidence surface.
 */
data class OmenDeskFootnote(
    val text: String,
    /**
     * Rendered `text-primary` and bold, per `.oneline .tx b`. Used for the one clause that must
     * not be skimmed — on `SwitchLoading` it is the discard guarantee.
     */
    val emphasis: String? = null,
)

/** Everything `CommandCenter`, and `SwitchLoading` as its mid-switch state, renders. */
data class OmenDeskState(
    /** "Week 7 · Sunday". `game_week.phase` rotates this server-side. */
    val weekLabel: String,
    /** "Lineups lock" over "1:00 PM". Absent when nothing is due, rather than rendered empty. */
    val deadlineLabel: String? = null,
    val deadlineTime: String? = null,
    val matchup: OmenDeskSection<OmenDeskMatchup>,
    /** The rail does not render below two leagues — an indicator that cannot move is furniture. */
    val railCount: Int = 0,
    val railIndex: Int = 0,
    val waiver: OmenDeskSection<OmenDeskWaiverMove>,
    val ledger: OmenDeskSection<OmenDeskLedgerLine>,
    val footnote: OmenDeskFootnote? = null,
)

/** `quiet-week.v1`. The variant is **server-owned** and the copy is locked to the artboard. */
enum class OmenQuietVariant { Neutral, Straight }

/**
 * The quiet-week screen's payload.
 *
 * Every string here comes from the server. The screen has no fallback copy, because the whole
 * point of the split is that playfulness is licensed by evidence — `CONTRACTS.md`: *"Playful is
 * permitted **only** here, and only when the server has positive quiet-week evidence."* A client
 * that could compose the neutral line itself could compose it after a loss.
 */
data class OmenQuietState(
    val variant: OmenQuietVariant,
    val weekLabel: String,
    val headline: String,
    val body: String,
    val band: OmenConfidenceBand? = null,
    val risk: OmenRiskLevel = OmenRiskLevel.Low,
    /** "Next read · Tuesday 3:00 AM waivers" */
    val nextRead: String,
    val footnote: OmenDeskFootnote? = null,
) {
    companion object {
        /**
         * Maps `quiet-week.v1` onto the screen's payload. Returns `null` whenever the response
         * cannot honestly support the screen — not eligible, an unrecognised variant, or missing
         * the server-owned copy it is supposed to carry. [weekLabel] comes from the shell's own
         * `game_week` read (`DashboardSummary.GameWeek`), not from this response, which carries
         * no week of its own. iOS mirror: `OmenQuietState.from(response:weekLabel:)`.
         */
        fun from(response: QuietWeekResponse, weekLabel: String): OmenQuietState? {
            if (!response.eligible) return null
            val variant = when (response.variant) {
                "neutral" -> OmenQuietVariant.Neutral
                "straight" -> OmenQuietVariant.Straight
                else -> return null
            }
            val headline = response.headline ?: return null
            val body = response.body ?: return null
            val nextRead = response.nextRead ?: return null
            return OmenQuietState(
                variant = variant,
                weekLabel = weekLabel,
                headline = headline,
                body = body,
                band = OmenConfidenceBand.Confident,
                risk = OmenRiskLevel.Low,
                nextRead = nextRead,
                footnote = null,
            )
        }
    }
}

/** One row in the switch sheet. */
data class OmenSwitchRow(
    val id: String,
    val crest: String,
    val teamName: String,
    /**
     * "ESPN · EB Football", or "unnamed team" when the provider never gave one. Composed by the
     * caller, which is the only layer that knows whether a name was absent or merely empty.
     */
    val subtitle: String,
    val isFavorite: Boolean,
    val isActive: Boolean,
)

/** A `.divid` heading and its rows. */
data class OmenSwitchGroup(val title: String, val rows: List<OmenSwitchRow>)

/** One `.seg` segment. */
data class OmenSwitchFilter(val id: String, val label: String)

/**
 * The switch sheet's payload.
 *
 * **Order is the server's.** `omen-league-switcher-contract-v1.md` names
 * `orderPlatformsByFollowCount` as the single authority and says clients must not re-sort, so
 * every list here is rendered in the order it arrives. There is no sort call in this file.
 */
data class OmenSwitchSheetState(
    val filters: List<OmenSwitchFilter>,
    val selectedFilterId: String,
    val groups: List<OmenSwitchGroup>,
    /**
     * A server-authored sentence about a provider whose leagues could not be listed.
     *
     * The artboard has no slot for this — it draws only the resolved case. It exists anyway,
     * because dropping a provider the directory failed to return would leave the sheet quietly
     * shorter and the user certain they had fewer leagues than they do.
     */
    val notice: String? = null,
)

// MARK: CommandCenter

/**
 * J2, screen one: the desk. `CommandCenter.dc.html`.
 *
 * Declared a **fit** in the canvas README, so this does not scroll.
 */
@Composable
fun OmenCommandDeskScreen(
    state: OmenDeskState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
    onOpenLeague: (() -> Unit)? = null,
    onOpenLedger: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg),
    ) {
        OmenScreenSwitcherBar(context)
        DeskHeader(
            weekLabel = state.weekLabel,
            deadlineLabel = state.deadlineLabel,
            deadlineTime = state.deadlineTime,
            onOpenAccount = onOpenAccount,
        )

        Box(modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step12)) {
            when (val matchup = state.matchup) {
                is OmenDeskSection.Read -> DeskBoard(matchup.value)
                is OmenDeskSection.Unread -> DeskUnreadSection(matchup.capability, matchup.sentence)
                OmenDeskSection.Switching -> DeskBoardSkeleton()
            }
        }

        DeskRail(count = state.railCount, index = state.railIndex)
        DeskSectionHeader("Waiver watch", action = if (onOpenLeague == null) null else "League", onAction = onOpenLeague)
        Box(modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16)) {
            when (val waiver = state.waiver) {
                is OmenDeskSection.Read -> DeskWaiverCard(waiver.value)
                is OmenDeskSection.Unread -> DeskUnreadSection(waiver.capability, waiver.sentence)
                OmenDeskSection.Switching -> DeskCardSkeleton(listOf(0.7f, 0.9f, 0.45f))
            }
        }

        DeskSectionHeader("The Ledger", action = if (onOpenLedger == null) null else "See all", onAction = onOpenLedger)
        Box(modifier = Modifier.padding(horizontal = OmenTheme.spacing.step16)) {
            when (val ledger = state.ledger) {
                is OmenDeskSection.Read -> OmenCard(contentPadding = PaddingValues(OmenTheme.spacing.step12)) {
                    DeskLedgerRow(ledger.value)
                }
                is OmenDeskSection.Unread -> DeskUnreadSection(ledger.capability, ledger.sentence)
                OmenDeskSection.Switching -> DeskCardSkeleton(listOf(0.6f, 0.35f))
            }
        }

        Spacer(modifier = Modifier.weight(1f).heightIn(min = OmenTheme.spacing.step8))
        state.footnote?.let { DeskFootnoteStrip(it) }
        Spacer(modifier = Modifier.height(OmenTheme.spacing.step12))
    }
}

/**
 * `.top`, plus the E017 controls the artboard does not draw.
 *
 * **This is the journey's one deliberate departure from its artboard, and it is recorded.**
 * `CommandCenter.dc.html` puts `Lineups lock / 1:00 PM` alone in the trailing slot; it is one of
 * only five artboards out of thirty with no account avatar. But Account is reached *only* via
 * the Command Center header profile control and is not a permanent tab — so on the artboard as
 * drawn, Account is unreachable from the destination that is supposed to reach it.
 *
 * Under the 2026-09-19 rule the two are mixed and `CommandCenter.dc.html` is redrawn to the
 * merged result in the same commit. The redraw is the step that stops this becoming drift the
 * next agent deletes.
 */
@Composable
private fun DeskHeader(
    weekLabel: String,
    deadlineLabel: String?,
    deadlineTime: String?,
    onOpenAccount: (() -> Unit)?,
) {
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
            if (weekLabel.isNotEmpty()) {
                Text(weekLabel, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accent)
            }
            Text("Command", style = OmenTheme.typography.screenTitle.toTextStyle(), color = OmenTheme.color.textPrimary)
        }
        if (deadlineLabel != null && deadlineTime != null) {
            Column(
                horizontalAlignment = Alignment.End,
                modifier = Modifier.semantics { contentDescription = "$deadlineLabel at $deadlineTime" },
            ) {
                Text(deadlineLabel, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary, textAlign = TextAlign.End)
                Text(deadlineTime, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary, textAlign = TextAlign.End)
            }
        }
        OmenScreenHeaderControls(OmenHelpDestination.CommandCenter, onOpenAccount = onOpenAccount)
    }
}

/** `.dots` — the league rail's page indicator. Absent below two leagues. */
@Composable
private fun DeskRail(count: Int, index: Int) {
    if (count <= 1) return
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = OmenTheme.spacing.step8)
            .semantics { contentDescription = "League ${index + 1} of $count" },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4, Alignment.CenterHorizontally),
    ) {
        repeat(count) { position ->
            val on = position == index
            Box(
                modifier = Modifier
                    .size(width = if (on) 16.dp else 5.dp, height = 5.dp)
                    .clip(RoundedCornerShape(3.dp))
                    .background(if (on) OmenTheme.color.accent else OmenTheme.color.borderSubtle),
            )
        }
    }
}

/** `.sh` — an uppercase label and an optional accent link. */
@Composable
private fun DeskSectionHeader(title: String, action: String?, onAction: (() -> Unit)?) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16)
            .padding(top = OmenTheme.spacing.step12, bottom = OmenTheme.spacing.step6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            title,
            style = OmenTheme.typography.micro.toTextStyle(),
            color = OmenTheme.color.textTertiary,
            modifier = Modifier.weight(1f),
        )
        if (action != null && onAction != null) {
            Text(
                "$action ›",
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.accent,
                modifier = Modifier
                    // The artboard draws a 12sp link with no padding. The target reaches 44dp
                    // without the type growing — the same trade the switcher bar's `+` makes.
                    .sizeIn(minWidth = 44.dp, minHeight = 44.dp)
                    .clickable(onClick = onAction)
                    .semantics { contentDescription = "$action, $title" },
                textAlign = TextAlign.End,
            )
        }
    }
}

// MARK: Quiet week

/**
 * J2, the quiet week — both variants.
 *
 * One composition, two payloads. `CommandQuiet.dc.html` and `CommandQuietStraight.dc.html` are
 * identical apart from the eyebrow and two sentences, and building them as two screens would be
 * two places for the voice fence to drift apart.
 */
@Composable
fun OmenCommandQuietScreen(
    state: OmenQuietState,
    modifier: Modifier = Modifier,
    context: OmenScreenContext? = null,
    onOpenAccount: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg),
    ) {
        OmenScreenSwitcherBar(context)
        DeskHeader(
            weekLabel = state.weekLabel,
            deadlineLabel = null,
            deadlineTime = null,
            onOpenAccount = onOpenAccount,
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = OmenTheme.spacing.step24)
                .padding(top = OmenTheme.spacing.step32),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
        ) {
            QuietMark()
            Text(
                state.headline,
                style = OmenTheme.typography.h2.toTextStyle(),
                color = OmenTheme.color.textPrimary,
                textAlign = TextAlign.Center,
            )
            Text(
                state.body,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
                textAlign = TextAlign.Center,
                // `.qp` caps at 30ch. A centred paragraph running the full width reads as a
                // wall; the cap is what makes it read as a remark.
                modifier = Modifier.widthIn(max = 260.dp),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step14)) {
                state.band?.let {
                    Text(it.label, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accentHover)
                }
                Text(
                    when (state.risk) {
                        OmenRiskLevel.Low -> "Low risk"
                        OmenRiskLevel.Medium -> "Medium risk"
                        OmenRiskLevel.High -> "High risk"
                    },
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                )
            }
            Text(state.nextRead, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
        Spacer(modifier = Modifier.weight(1f).heightIn(min = OmenTheme.spacing.step8))
        state.footnote?.let { DeskFootnoteStrip(it) }
        Spacer(modifier = Modifier.height(OmenTheme.spacing.step14))
    }
}

/**
 * `.quiet`'s 56dp brass mark — a sleeping eye, drawn as the artboard draws it.
 *
 * Inline vector rather than a drawable because it is four primitives and a drawable would need
 * an entry in the resource table to say less.
 */
@Composable
private fun QuietMark() {
    // Read outside the draw lambda: `DrawScope` is not a `@Composable` scope, so `OmenTheme`
    // cannot be reached from inside it. This shipped as a raw eight-digit brass hex literal,
    // which `PrimitiveEnforcementTest` fails on — and rightly: that constant is the *dark*
    // scheme's `accent`, so the mark stayed dark-mode brass in light mode while every other
    // element on the screen switched. The token is both the enforcement fix and the correctness
    // one.
    //
    // The literal is not quoted here even as prose: the enforcement regex reads the file as text
    // and does not skip comments, so naming it would fail the very test this comment explains.
    val brass = OmenTheme.color.accent
    androidx.compose.foundation.Canvas(
        modifier = Modifier
            .size(56.dp)
            .alpha(0.5f)
            .clearAndSetSemantics { },
    ) {
        val s = size.width / 1024f
        // The eyelid: an outer ellipse with an inner one cut out, per the artboard's even-odd path.
        drawOval(
            color = brass,
            topLeft = Offset(298 * s, 150 * s),
            size = Size(428 * s, 724 * s),
            style = Stroke(width = 31 * s),
        )
        // Three lashes and the pupil stem.
        drawRoundRect(
            color = brass,
            topLeft = Offset(497 * s, 360 * s),
            size = Size(30 * s, 304 * s),
            cornerRadius = CornerRadius(15 * s),
        )
        for (y in listOf(404f, 474f, 544f)) {
            drawRoundRect(
                color = brass,
                topLeft = Offset(455 * s, y * s),
                size = Size(114 * s, 26 * s),
                cornerRadius = CornerRadius(13 * s),
            )
        }
    }
}

// MARK: SwitchSheet

/**
 * J2, screen two: the switcher sheet. `SwitchSheet.dc.html`.
 *
 * **The artboard draws this sheet over the Trade destination** — its backdrop carries "Build a
 * deal" and the Trade tab selected. That is incidental: the switcher bar is on 25 of 30
 * artboards, so the sheet is reachable from anywhere and the artboard happened to be drawn from
 * Trade. For J2 it is presented over Command, because J2 *is* "arriving at Command Center,
 * switching teams". The sheet's own composition is taken from the artboard unchanged, and the
 * artboard is redrawn onto the Command backdrop in this commit so the change is recorded.
 */
@Composable
fun OmenSwitchSheet(
    state: OmenSwitchSheetState,
    modifier: Modifier = Modifier,
    onSelectFilter: ((String) -> Unit)? = null,
    onSelectRow: ((OmenSwitchRow) -> Unit)? = null,
    onToggleFavorite: ((OmenSwitchRow) -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp))
            .background(OmenTheme.color.surface1)
            .padding(top = OmenTheme.spacing.step8, bottom = OmenTheme.spacing.step16),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(
            modifier = Modifier
                .padding(bottom = OmenTheme.spacing.step12)
                .size(width = 36.dp, height = 4.dp)
                .clip(RoundedCornerShape(2.dp))
                .background(OmenTheme.color.surface3)
                .clearAndSetSemantics { },
        )

        // `.seg` — a segmented control, not a chip row. Rendered in the order it arrives;
        // `orderPlatformsByFollowCount` is the single authority and clients must not re-sort.
        if (state.filters.size > 1) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(bottom = OmenTheme.spacing.step10)
                    .clip(RoundedCornerShape(9.dp))
                    .background(OmenTheme.color.bg)
                    .padding(2.dp),
                horizontalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                for (filter in state.filters) {
                    val selected = filter.id == state.selectedFilterId
                    Text(
                        filter.label,
                        style = OmenTheme.typography.micro.toTextStyle(),
                        color = if (selected) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
                        textAlign = TextAlign.Center,
                        modifier = Modifier
                            .weight(1f)
                            .heightIn(min = 44.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (selected) OmenTheme.color.surface3 else Color.Transparent)
                            .clickable(enabled = onSelectFilter != null) { onSelectFilter?.invoke(filter.id) }
                            .padding(vertical = OmenTheme.spacing.step14),
                    )
                }
            }
        }

        // The *could not read* class inside the sheet: dashed, `text-tertiary`, no evidence
        // styling — the `.hatch` carrier from registry §2.3, with words doing the actual work.
        state.notice?.takeIf { it.isNotEmpty() }?.let { notice ->
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = OmenTheme.spacing.step16)
                    .padding(bottom = OmenTheme.spacing.step10)
                    .dashedBorder(OmenTheme.color.border)
                    .padding(OmenTheme.spacing.step10),
            ) {
                Text(notice, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
            }
        }

        Column(
            modifier = Modifier
                // `.rows` caps at 300dp and scrolls — a cap rather than a fixed height, so three
                // teams get a three-team sheet.
                .heightIn(max = 300.dp)
                .verticalScroll(rememberScrollState()),
        ) {
            for (group in state.groups) {
                Text(
                    group.title,
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = OmenTheme.spacing.step16)
                        .padding(top = OmenTheme.spacing.step8, bottom = OmenTheme.spacing.step4),
                )
                for (row in group.rows) {
                    SwitchSheetRow(row, onSelectRow, onToggleFavorite)
                }
            }
        }
    }
}

/**
 * One `.row`: crest, star, name, check.
 *
 * **Two targets, not one.** The star curates favourites; anywhere else switches. A single row
 * button with a star "decoration" would make starring impossible without also changing the
 * active league.
 */
@Composable
private fun SwitchSheetRow(
    row: OmenSwitchRow,
    onSelectRow: ((OmenSwitchRow) -> Unit)?,
    onToggleFavorite: ((OmenSwitchRow) -> Unit)?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = OmenTheme.spacing.step16, vertical = OmenTheme.spacing.step4),
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(31.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(if (row.isActive) OmenTheme.color.accentMuted else OmenTheme.color.surface3)
                .clearAndSetSemantics { },
            contentAlignment = Alignment.Center,
        ) {
            Text(
                row.crest,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = if (row.isActive) OmenTheme.color.accentHover else OmenTheme.color.textSecondary,
                maxLines = 1,
            )
        }

        // Filled `platinum` when starred, outlined `border` when not. The outline colour is
        // `border` rather than the artboard's original `#4A4A4E`, which measured 1.63:1 on
        // `surface-1` and was invisible; Registry Amendment 01 fixed it to 3.78:1.
        Text(
            text = if (row.isFavorite) "★" else "☆",
            style = OmenTheme.typography.bodySmall.toTextStyle(),
            // iOS fills a starred star with the `platinum` token (#C7CBD1), which the artboard
            // draws. **Android's colour scheme has no `platinum`** — a real iOS/Android token
            // parity gap that predates J2 — so the nearest legal token is used and the exact
            // hex is recorded as drift rather than hard-coded here. Inventing a local colour
            // would put a fourth source of truth beside the two token files and the registry.
            color = if (row.isFavorite) OmenTheme.color.textPrimary else OmenTheme.color.border,
            textAlign = TextAlign.Center,
            modifier = Modifier
                // The artboard's star is a 14dp glyph, padded to 44dp without the glyph growing.
                // The canvas README flags this exact control as under the touch floor and says so
                // deliberately, because growing it in the artboard would make the artboard wrong.
                .sizeIn(minWidth = 44.dp, minHeight = 44.dp)
                .clickable(enabled = onToggleFavorite != null) { onToggleFavorite?.invoke(row) }
                .semantics {
                    contentDescription = if (row.isFavorite) "Unstar ${row.teamName}" else "Star ${row.teamName}"
                },
        )

        Row(
            modifier = Modifier
                .weight(1f)
                .heightIn(min = 44.dp)
                .clickable(enabled = onSelectRow != null) { onSelectRow?.invoke(row) }
                .semantics { contentDescription = "${row.teamName}, ${row.subtitle}" },
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        ) {
            Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step2)) {
                Text(
                    row.teamName,
                    style = OmenTheme.typography.name.toTextStyle(),
                    color = OmenTheme.color.textPrimary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                Text(
                    row.subtitle,
                    style = OmenTheme.typography.micro.toTextStyle(),
                    color = OmenTheme.color.textTertiary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            // `.chk` — present only on the active team. An empty gutter holds the column so the
            // names do not shift as the selection moves.
            Text(
                if (row.isActive) "✓" else " ",
                style = OmenTheme.typography.name.toTextStyle(),
                color = OmenTheme.color.accent,
                modifier = Modifier.width(16.dp),
            )
        }
    }
    Box(modifier = Modifier.fillMaxWidth().height(1.dp).background(OmenTheme.color.textPrimary.copy(alpha = 0.05f)))
}

/**
 * The sheet over its backdrop, with the scrim.
 *
 * Composed rather than presented as a real modal, for the same reason iOS does it: a modal does
 * not appear in a screenshot of the host window, and a capture must show what a user sees — the
 * desk dimmed, the sheet over it.
 */
@Composable
fun OmenSwitchSheetOverlay(
    state: OmenSwitchSheetState,
    modifier: Modifier = Modifier,
    onSelectFilter: ((String) -> Unit)? = null,
    onSelectRow: ((OmenSwitchRow) -> Unit)? = null,
    onToggleFavorite: ((OmenSwitchRow) -> Unit)? = null,
    onDismiss: (() -> Unit)? = null,
    backdrop: @Composable () -> Unit,
) {
    Box(modifier = modifier.fillMaxSize()) {
        backdrop()
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.64f))
                .clickable(enabled = onDismiss != null) { onDismiss?.invoke() }
                .semantics { contentDescription = "Dismiss team switcher" },
        )
        OmenSwitchSheet(
            state = state,
            modifier = Modifier.align(Alignment.BottomCenter),
            onSelectFilter = onSelectFilter,
            onSelectRow = onSelectRow,
            onToggleFavorite = onToggleFavorite,
        )
    }
}

// MARK: Shared blocks

/** `.board` — the scoreboard. */
@Composable
private fun DeskBoard(matchup: OmenDeskMatchup) {
    val colors = OmenTheme.color
    val providerName = when (matchup.platform) {
        OmenPlatform.Espn -> "ESPN"
        OmenPlatform.Yahoo -> "Yahoo"
        OmenPlatform.Sleeper -> "Sleeper"
    }
    val providerChip = when (matchup.platform) {
        OmenPlatform.Espn -> colors.data.platformEspnChip
        OmenPlatform.Yahoo -> colors.data.platformYahooChip
        OmenPlatform.Sleeper -> colors.data.platformSleeperChip
    }

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Brush.verticalGradient(listOf(colors.surface2, colors.surface1)))
            .padding(OmenTheme.spacing.step12),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(bottom = OmenTheme.spacing.step10),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // The provider hex, never the only carrier — the provider is named beside it (D7).
                Box(modifier = Modifier.size(7.dp).clip(RoundedCornerShape(2.dp)).background(providerChip))
                Text(providerName, style = OmenTheme.typography.micro.toTextStyle(), color = colors.textTertiary)
            }
            Text(matchup.status, style = OmenTheme.typography.micro.toTextStyle(), color = colors.textTertiary)
        }

        DeskBoardRow(matchup.leader, leading = true)

        // `.bmid` — the inset rule and the projection line.
        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = OmenTheme.spacing.step6),
            horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(modifier = Modifier.width(30.dp), contentAlignment = Alignment.Center) {
                Box(
                    modifier = Modifier
                        .size(width = 2.dp, height = 22.dp)
                        .clip(RoundedCornerShape(1.dp))
                        .background(colors.borderSubtle),
                    contentAlignment = Alignment.BottomCenter,
                ) {
                    matchup.leadFraction?.let { fraction ->
                        Box(
                            modifier = Modifier
                                .size(width = 2.dp, height = (22 * fraction.coerceIn(0f, 1f)).dp)
                                .background(colors.accent),
                        )
                    }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                matchup.projection?.let {
                    Text(it, style = OmenTheme.typography.micro.toTextStyle(), color = colors.textSecondary)
                }
                matchup.projectionNote?.let {
                    Text(it, style = OmenTheme.typography.micro.toTextStyle(), color = colors.textTertiary)
                }
            }
        }

        DeskBoardRow(matchup.trailer, leading = false)

        matchup.watch?.let {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = OmenTheme.spacing.step8)
                    .height(1.dp)
                    .background(colors.textPrimary.copy(alpha = 0.08f)),
            )
            Text(
                it,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = colors.textSecondary,
                modifier = Modifier.padding(top = OmenTheme.spacing.step8),
            )
        }
    }
}

@Composable
private fun DeskBoardRow(team: OmenDeskTeam, leading: Boolean) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .semantics { contentDescription = "${team.name}, ${team.record}, ${team.score} points" },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(30.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(if (team.isMine) OmenTheme.color.accentMuted else OmenTheme.color.surface3),
            contentAlignment = Alignment.Center,
        ) {
            Text(
                team.crest,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = if (team.isMine) OmenTheme.color.accentHover else OmenTheme.color.textSecondary,
                maxLines = 1,
            )
        }
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step2)) {
            Text(
                team.name,
                style = OmenTheme.typography.bodySmall.toTextStyle().copy(fontWeight = FontWeight.Bold),
                color = OmenTheme.color.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(team.record, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
        Text(
            team.score,
            style = if (leading) OmenTheme.typography.scoreLead.toTextStyle() else OmenTheme.typography.scoreTrail.toTextStyle(),
            color = if (leading) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary,
        )
    }
}

/** `.card.hero` — the waiver move. */
@Composable
private fun DeskWaiverCard(move: OmenDeskWaiverMove) {
    OmenCard(contentPadding = PaddingValues(OmenTheme.spacing.step12)) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                // `.swap`'s tick rule.
                Box(
                    modifier = Modifier.width(26.dp),
                    contentAlignment = Alignment.TopCenter,
                ) {
                    Box(modifier = Modifier.size(8.dp).clip(RoundedCornerShape(4.dp)).background(OmenTheme.color.accent))
                }
                Column {
                    DeskSwapLine(move.addName, move.addMeta, move.addPoints, incoming = true)
                    move.dropName?.let { DeskSwapLine(it, move.dropMeta, move.dropPoints, incoming = false) }
                }
            }
            Text(move.reasoning, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
            Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step14)) {
                move.band?.let {
                    Text(it.label, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.accentHover)
                }
                Text(
                    when (move.risk) {
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

@Composable
private fun DeskSwapLine(name: String, meta: String?, points: String?, incoming: Boolean) {
    val ink = if (incoming) OmenTheme.color.textPrimary else OmenTheme.color.textTertiary
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = OmenTheme.spacing.step2)
            .semantics {
                contentDescription = listOfNotNull(
                    if (incoming) "Add" else "Drop",
                    name,
                    meta,
                    points?.let { "$it projected" },
                ).joinToString(", ")
            },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            name,
            style = OmenTheme.typography.name.toTextStyle()
                .copy(fontWeight = if (incoming) FontWeight.Bold else FontWeight.Medium),
            color = ink,
            maxLines = 1,
        )
        meta?.let { Text(it, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary) }
        Spacer(modifier = Modifier.weight(1f))
        // No points column when the provider gave none. A dash or a zero would both read as a
        // projection, and `waiver-analysis.v1` is explicit that a missing input is null rather
        // than zero for exactly this reason.
        points?.let {
            Text(
                it,
                style = OmenTheme.typography.bodySmall.toTextStyle().copy(fontWeight = FontWeight.Black),
                color = ink,
            )
        }
    }
}

/** One `.lrow` under The Ledger. */
@Composable
private fun DeskLedgerRow(line: OmenDeskLedgerLine) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = OmenTheme.spacing.step8)
            .semantics { contentDescription = "${line.summary}. ${line.meta}. ${line.outcome.label}." },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step2)) {
            Text(
                line.summary,
                style = OmenTheme.typography.bodySmall.toTextStyle().copy(fontWeight = FontWeight.Bold),
                color = OmenTheme.color.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(line.meta, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
        // `pending` is italic and **deliberately not brass** — `.lrow .lo.pend` says so, and the
        // Ledger's own `.o-p` matches it. Italic is the form carrier; giving an unresolved call
        // the accent would read as a result.
        when (line.outcome) {
            OmenDeskLedgerOutcome.Pending -> Text(
                line.outcome.label,
                style = OmenTheme.typography.bodySmall.toTextStyle().copy(fontStyle = FontStyle.Italic),
                color = OmenTheme.color.textSecondary,
            )
            OmenDeskLedgerOutcome.Worked -> Text(
                line.outcome.label,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
            else -> Text(
                line.outcome.label,
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
        }
    }
}

/**
 * The *could not read* class, rendered in the failed section's own place.
 *
 * Named plus a sentence, per `capability-expression-v1.md` acceptance rules 3 and 4. It carries
 * no evidence styling and it is never dropped to make room: the spec singles this class out as
 * the one that must survive truncation, since it is the only one that costs the reader anything.
 */
@Composable
private fun DeskUnreadSection(capability: String, sentence: String) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .dashedBorder(OmenTheme.color.border)
            .padding(OmenTheme.spacing.step12)
            .semantics { contentDescription = "$capability. Could not read. $sentence" },
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step6),
    ) {
        Text(capability, style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        Text(sentence, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textTertiary)
    }
}

/** `.oneline` — the foot strip. */
@Composable
private fun DeskFootnoteStrip(footnote: OmenDeskFootnote) {
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

// MARK: SwitchLoading

/** `.skel` — one shimmering placeholder line. */
@Composable
private fun SkeletonLine(widthFraction: Float, height: androidx.compose.ui.unit.Dp = 12.dp) {
    Box(
        modifier = Modifier
            .fillMaxWidth(widthFraction)
            .height(height)
            .clip(RoundedCornerShape(6.dp))
            .background(
                Brush.horizontalGradient(
                    listOf(OmenTheme.color.surface1, OmenTheme.color.surface2, OmenTheme.color.surface1),
                ),
            )
            .clearAndSetSemantics { },
    )
}

@Composable
private fun DeskCardSkeleton(lineWidths: List<Float>) {
    OmenCard(contentPadding = PaddingValues(OmenTheme.spacing.step12)) {
        Column(
            modifier = Modifier.semantics { contentDescription = "Loading" },
            verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        ) {
            for (width in lineWidths) SkeletonLine(width)
        }
    }
}

/**
 * The board mid-switch. Note what is **not** here: any number from the previous team.
 *
 * §10.3 is explicit — *"The previous team's numbers are discarded, never reused while loading."*
 * Keeping the outgoing scoreboard visible under a spinner would be the cheaper animation and a
 * false claim: for the second it took to resolve, the screen would be showing one team's numbers
 * under another team's name.
 */
@Composable
private fun DeskBoardSkeleton() {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(14.dp))
            .background(Brush.verticalGradient(listOf(OmenTheme.color.surface2, OmenTheme.color.surface1)))
            .padding(OmenTheme.spacing.step12)
            // The artboard dims the whole board to .55 while it resolves.
            .alpha(0.55f)
            .semantics { contentDescription = "Loading the new team's matchup" },
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
    ) {
        Row(modifier = Modifier.fillMaxWidth()) {
            Text(
                "Reading",
                style = OmenTheme.typography.micro.toTextStyle(),
                color = OmenTheme.color.textTertiary,
                modifier = Modifier.weight(1f),
            )
            Text("Loading", style = OmenTheme.typography.micro.toTextStyle(), color = OmenTheme.color.textTertiary)
        }
        repeat(2) {
            Row(
                horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step10),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(modifier = Modifier.size(30.dp).clip(RoundedCornerShape(8.dp)).background(OmenTheme.color.surface3))
                Column(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
                ) {
                    SkeletonLine(0.6f)
                    SkeletonLine(0.3f, 9.dp)
                }
                Box(modifier = Modifier.width(52.dp)) { SkeletonLine(1f, 22.dp) }
            }
        }
    }
}

/**
 * The three-letter crest the switcher bar draws, derived from the team name.
 *
 * The iOS twin is `OmenDeskState.crest(from:)` and this is the same rule, deliberately: a user
 * with the same team on both phones must see the same three letters. Apostrophes split like
 * spaces so "Puk Around & Find Out" and "O'Dell's Ordeal" both give initials rather than one
 * long token.
 *
 * An em dash rather than an empty string when there is nothing to initial — the bar has a fixed
 * crest slot, and a blank one reads as a failed load rather than an unnamed team.
 */
fun omenDeskCrest(name: String): String {
    val initials = name
        .split(' ', '\'', '\u2019')
        .filter { it.isNotEmpty() }
        .take(3)
        .mapNotNull { it.firstOrNull() }
        .joinToString("")
        .uppercase()
    return initials.ifEmpty { "\u2014" }
}

/**
 * J2, screen three: mid-switch. `SwitchLoading.dc.html`.
 *
 * Not a separate screen so much as `CommandCenter` with every section at `Switching` and the
 * switcher bar already showing the **new** team — which is the point of the frame: the bar
 * commits immediately so the user can see their tap landed, and the numbers arrive when they do.
 */
@Composable
fun OmenSwitchLoadingScreen(
    /** The team being switched **to**. The bar updates first; nothing below it does. */
    context: OmenScreenContext,
    weekLabel: String,
    footnote: OmenDeskFootnote,
    modifier: Modifier = Modifier,
    onOpenAccount: (() -> Unit)? = null,
) {
    OmenCommandDeskScreen(
        state = OmenDeskState(
            weekLabel = weekLabel,
            matchup = OmenDeskSection.Switching,
            waiver = OmenDeskSection.Switching,
            ledger = OmenDeskSection.Switching,
            footnote = footnote,
        ),
        modifier = modifier,
        context = context,
        onOpenAccount = onOpenAccount,
    )
}

/** Registry §2.3's dashed carrier for a source that is not solid live data. */
private fun Modifier.dashedBorder(color: Color) = this.drawBehind {
    drawRoundRect(
        color = color,
        style = Stroke(
            width = 1.dp.toPx(),
            pathEffect = PathEffect.dashPathEffect(floatArrayOf(4.dp.toPx(), 4.dp.toPx())),
        ),
        cornerRadius = CornerRadius(13.dp.toPx()),
    )
}
