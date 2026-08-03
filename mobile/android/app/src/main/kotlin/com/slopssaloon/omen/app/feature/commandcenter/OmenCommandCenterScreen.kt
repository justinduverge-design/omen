package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.res.painterResource
import com.slopssaloon.omen.R
import com.slopssaloon.omen.core.designsystem.component.OmenContextStrip
import com.slopssaloon.omen.core.designsystem.component.OmenContextStripState
import com.slopssaloon.omen.core.designsystem.component.OmenIconButton
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHeroState
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupTeam
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.2 approved **screen assembly** (feature layer). Rebuilt for v1.1 per
 * mobile-visual-briefs §1.1 to orient and prioritize the selected roster's week — it does
 * NOT duplicate Omen's full decision workspace. The full DecisionBrief lives on the Omen
 * destination, not here.
 *
 * v1.1 hierarchy:
 *   1. Header (page title + profile control)
 *   2. Persistent OmenContextStrip (approved node 25:2)
 *   3. OmenMatchupHero / Matchup Spine (approved node 25:26)
 *   4. Waiver Watch — approved M4-CC-WaiverWatch composition
 *   5. Ledger preview placeholder — blocked follow-up M4-CC-LedgerPreview
 *   6. League Pulse placeholder — blocked follow-up M4-CC-LeaguePulse
 *
 * Callers own the [OmenCommandCenterState] and choose an honest fixture (demo mode vs
 * real signed-in user). This composition never selects a "connected" fixture on its own —
 * exposing a demo-connected provider claim to a real user would violate facts-of-record
 * #7 (mock/demo data must be visibly labeled, never presented as live).
 */
@Composable
fun OmenCommandCenterScreen(
    state: OmenCommandCenterState,
    modifier: Modifier = Modifier,
    onSwitchContext: (() -> Unit)? = null,
    onOpenMatchup: (() -> Unit)? = null,
    onOpenAccount: (() -> Unit)? = null,
    onOpenOmen: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(
                PaddingValues(
                    horizontal = OmenTheme.spacing.step16,
                    vertical = OmenTheme.spacing.step24,
                )
            ),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.sectionStack),
    ) {
        HeaderBlock(state.greeting, onOpenAccount)
        OmenContextStrip(state = state.context, onSwitch = onSwitchContext)
        OmenMatchupHero(state = state.matchup, onOpen = onOpenMatchup)
        WaiverWatch(state = state.waiverWatch, onOpenOmen = onOpenOmen)
        LedgerPlaceholder()
        LeaguePulsePlaceholder()
    }
}

@Composable
private fun HeaderBlock(greeting: String, onOpenAccount: (() -> Unit)?) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.Top,
    ) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
            Text(
                text = "Command Center",
                style = OmenTheme.typography.eyebrow.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
            Text(
                text = greeting,
                style = OmenTheme.typography.h1.toTextStyle(),
                color = OmenTheme.color.textPrimary,
            )
        }
        if (onOpenAccount != null) {
            OmenIconButton(
                contentDescription = "Account and profile",
                onClick = onOpenAccount,
            ) {
                Icon(
                    painter = painterResource(id = R.drawable.ic_nav_account),
                    contentDescription = null,
                )
            }
        }
    }
}

@Composable
private fun WaiverWatch(state: OmenWaiverWatchState, onOpenOmen: (() -> Unit)?) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("Waiver Watch")
        when (state) {
            is OmenWaiverWatchState.Urgent -> UrgentWaiverBriefing(state, onOpenOmen)
            is OmenWaiverWatchState.Calm -> CalmWaiverList(state, onOpenOmen)
            OmenWaiverWatchState.Pending -> WaiverStatusCard(
                title = "Claim pending",
                message = "Omen has identified an opportunity. Claim outcome is not yet known.",
            )
            OmenWaiverWatchState.Processed -> WaiverStatusCard(
                title = "Waivers processed",
                message = "Your league’s waivers have processed. Review current opportunities.",
                onOpenOmen = onOpenOmen,
            )
            OmenWaiverWatchState.AvailabilityUnknown -> WaiverStatusCard(
                title = "Availability needs confirmation",
                message = "Omen cannot confirm availability for this league.",
            )
            OmenWaiverWatchState.NoCredibleMove -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "No credible move",
                message = "No waiver move stands out for this roster right now.",
            )
            OmenWaiverWatchState.NotConnected -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Disconnected,
                title = "Personalized waiver moves need a league",
                message = "Connect a league to see roster-aware opportunities, or use Try Demo to explore a labeled example.",
            )
            OmenWaiverWatchState.OffSeason -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "Long-horizon waiver context",
                message = "Omen will surface relevant draft and roster opportunities without weekly waiver urgency.",
            )
        }
    }
}

@Composable
private fun UrgentWaiverBriefing(state: OmenWaiverWatchState.Urgent, onOpenOmen: (() -> Unit)?) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        Text(state.deadlineText, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        OmenCard(variant = OmenCardVariant.Preview) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
                Box(Modifier.fillMaxWidth().height(OmenTheme.spacing.step4).background(OmenTheme.color.accent))
                Text("Best Move", style = OmenTheme.typography.eyebrow.toTextStyle(), color = OmenTheme.color.accent)
                OpportunityContent(state.bestMove)
            }
        }
        OmenLinkButton("Review Omen’s waiver analysis", onOpenOmen)
        if (state.longHorizonMoves.isNotEmpty()) {
            Text("For the long horizon", style = OmenTheme.typography.eyebrow.toTextStyle(), color = OmenTheme.color.textSecondary)
            state.longHorizonMoves.take(2).forEach { OpportunityRow(it) }
        }
    }
}

@Composable
private fun CalmWaiverList(state: OmenWaiverWatchState.Calm, onOpenOmen: (() -> Unit)?) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
        state.opportunities.forEachIndexed { index, opportunity ->
            OpportunityRow(opportunity, rank = index + 1)
        }
        OmenLinkButton("See full waiver analysis", onOpenOmen)
    }
}

@Composable
private fun WaiverStatusCard(title: String, message: String, onOpenOmen: (() -> Unit)? = null) {
    OmenCard(variant = OmenCardVariant.Outlined) {
        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
            Text(title, style = OmenTheme.typography.h2.toTextStyle(), color = OmenTheme.color.textPrimary)
            Text(message, style = OmenTheme.typography.body.toTextStyle(), color = OmenTheme.color.textSecondary)
            if (onOpenOmen != null) OmenLinkButton("Review Omen’s waiver analysis", onOpenOmen)
        }
    }
}

@Composable
private fun OpportunityRow(opportunity: OmenWaiverOpportunity, rank: Int? = null) {
    OmenCard(
        variant = OmenCardVariant.Outlined,
        modifier = Modifier.semantics(mergeDescendants = true) {
            contentDescription = opportunity.accessibilityLabel(rank)
        },
    ) { OpportunityContent(opportunity, rank) }
}

@Composable
private fun OpportunityContent(opportunity: OmenWaiverOpportunity, rank: Int? = null) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
        Text(
            text = listOfNotNull(rank?.toString(), "${opportunity.playerName} · ${opportunity.position}").joinToString("  "),
            style = OmenTheme.typography.h2.toTextStyle(),
            color = OmenTheme.color.textPrimary,
        )
        Text(opportunity.team, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        Text(opportunity.availability, style = OmenTheme.typography.bodySmall.toTextStyle(), color = OmenTheme.color.textSecondary)
        Text(opportunity.reason, style = OmenTheme.typography.body.toTextStyle(), color = OmenTheme.color.textPrimary)
    }
}

@Composable
private fun OmenLinkButton(title: String, onOpenOmen: (() -> Unit)?) {
    if (onOpenOmen != null) {
        OmenButton(
            text = "$title →",
            onClick = onOpenOmen,
            variant = OmenButtonVariant.Link,
            size = OmenButtonSize.Lg,
        )
    }
}

private fun OmenWaiverOpportunity.accessibilityLabel(rank: Int?): String = listOfNotNull(
    rank?.let { "Opportunity $it" }, playerName, position, team, availability, reason,
).joinToString(", ")

@Composable
private fun LedgerPlaceholder() {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("The Ledger")
        OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "The Ledger is landing next",
            message = "Blocked on the Figma-approved Ledger preview proposal (sprint item M4-CC-LedgerPreview).",
        )
    }
}

@Composable
private fun LeaguePulsePlaceholder() {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("League Pulse")
        OmenStateSurface(
            kind = OmenStateSurfaceKind.Empty,
            title = "League Pulse is landing next",
            message = "Blocked on the Figma-approved League Pulse proposal (sprint item M4-CC-LeaguePulse).",
        )
    }
}

@Composable
private fun SectionLabel(text: String) {
    Text(
        text = text,
        style = OmenTheme.typography.label.toTextStyle(),
        color = OmenTheme.color.textSecondary,
    )
}

/**
 * Immutable view state for [OmenCommandCenterScreen]. Feature callers build one of these
 * from whatever data source is authoritative for the session (demo fixtures for
 * Try-Demo users; honest disconnected/loading state for real users until live wiring
 * lands). The screen renders honestly for every combination without inspecting the
 * source.
 */
data class OmenCommandCenterState(
    val greeting: String,
    val context: OmenContextStripState,
    val matchup: OmenMatchupHeroState,
    val waiverWatch: OmenWaiverWatchState = OmenWaiverWatchState.NotConnected,
)

/**
 * View-only Waiver Watch contract. Callers supply only verified data or an explicit state;
 * this layer never infers a provider, availability, or waiver deadline.
 */
sealed interface OmenWaiverWatchState {
    data class Urgent(
        val deadlineText: String,
        val bestMove: OmenWaiverOpportunity,
        val longHorizonMoves: List<OmenWaiverOpportunity> = emptyList(),
    ) : OmenWaiverWatchState

    data class Calm(val opportunities: List<OmenWaiverOpportunity>) : OmenWaiverWatchState
    data object Pending : OmenWaiverWatchState
    data object Processed : OmenWaiverWatchState
    data object AvailabilityUnknown : OmenWaiverWatchState
    data object NoCredibleMove : OmenWaiverWatchState
    data object NotConnected : OmenWaiverWatchState
    data object OffSeason : OmenWaiverWatchState
}

data class OmenWaiverOpportunity(
    val playerName: String,
    val position: String,
    val team: String,
    val availability: String,
    val reason: String,
)

/**
 * Fixture registry. Every fixture is explicitly labelled by its variable name; none of
 * these mints a "connected provider" claim for a real user. The screenshot workflow and
 * the `Try Demo` session both consume these; a real signed-in user without connected
 * context sees [realDisconnected] until live wiring exists.
 */
object OmenCommandCenterFixtures {
    val demoConnected: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "Demo · this week's move is ready.",
        context = OmenContextStripState.Selected(
            platform = OmenPlatform.Sleeper,
            leagueName = "Demo Slate (mock league)",
            teamName = "Demo Titans",
        ),
        matchup = OmenMatchupHeroState.Live(
            selectedTeam = OmenMatchupTeam(name = "Demo Titans", record = "6–1", scoreText = "64.8"),
            opponent = OmenMatchupTeam(name = "Demo Rivals", record = "5–2", scoreText = "58.1"),
            projectedFinish = "119.6–114.2",
            whatToWatch = "Opponent has two demo players remaining Monday night.",
        ),
        waiverWatch = OmenWaiverWatchState.Urgent(
            deadlineText = "Demo deadline · Wed 3:00 AM",
            bestMove = OmenWaiverOpportunity(
                playerName = "Tyrone Tracy Jr.", position = "RB", team = "NYG",
                availability = "Available in this demo league", reason = "Immediate help at RB during a thin Week 7.",
            ),
            longHorizonMoves = listOf(
                OmenWaiverOpportunity("Demo Player A", "WR", "ATL", "Available", "Dynasty upside."),
                OmenWaiverOpportunity("Demo Player B", "TE", "SEA", "Available", "Future opportunity."),
            ),
        ),
    )

    /**
     * Honest disconnected state — what a real signed-in user without a connected league
     * sees. No fabricated provider status, no fake matchup, no "manage league" no-op CTA.
     */
    val realDisconnected: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "Connect a league to see your matchup.",
        context = OmenContextStripState.Empty,
        matchup = OmenMatchupHeroState.NoMatchup(
            reason = "No matchup yet — connect Sleeper, Yahoo, or ESPN to see your team's week.",
        ),
    )

    /**
     * Honest loading state — while the app is restoring session or the dashboard-summary
     * call is in flight.
     */
    val realLoading: OmenCommandCenterState = OmenCommandCenterState(
        greeting = "Restoring your session…",
        context = OmenContextStripState.Empty,
        matchup = OmenMatchupHeroState.NoMatchup(reason = "Loading…"),
    )
}
