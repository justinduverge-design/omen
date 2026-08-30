package com.slopssaloon.omen.app.feature.commandcenter

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import com.slopssaloon.omen.app.feature.api.LeagueOverview
import com.slopssaloon.omen.app.feature.api.LeagueStandings
import com.slopssaloon.omen.app.feature.api.LeagueViewModel
import com.slopssaloon.omen.app.feature.api.OmenApiError
import com.slopssaloon.omen.core.designsystem.component.OmenBadge
import com.slopssaloon.omen.core.designsystem.component.OmenBadgeTone
import com.slopssaloon.omen.core.designsystem.component.OmenButton
import com.slopssaloon.omen.core.designsystem.component.OmenButtonSize
import com.slopssaloon.omen.core.designsystem.component.OmenButtonVariant
import com.slopssaloon.omen.core.designsystem.component.OmenCard
import com.slopssaloon.omen.core.designsystem.component.OmenCardVariant
import com.slopssaloon.omen.core.designsystem.component.OmenMatchupHero
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurface
import com.slopssaloon.omen.core.designsystem.component.OmenStateSurfaceKind
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * M5 slice F — the League destination. iOS mirror: `App/CommandCenter/OmenLeagueScreen.swift`.
 *
 * Built against the ratified `M1-Screen-League` contract: matchup spine, playoff picture, rank
 * table, and Around the League.
 *
 * **Sections render independently**, because `league-overview.v1` reports them independently.
 * A dead matchup read shows an unavailable matchup above live standings; it never blanks the
 * screen.
 *
 * Per the scope correction carried by the contract, this screen has **no Draft entry**.
 */
@Composable
fun OmenLeagueScreen(
    state: LeagueViewModel.ViewState,
    modifier: Modifier = Modifier,
    onRetry: (() -> Unit)? = null,
    onConnect: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .background(OmenTheme.color.bg)
            .verticalScroll(rememberScrollState())
            .padding(OmenTheme.spacing.step24),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step24),
    ) {
        when (state) {
            // Idle and Loading are the same surface on purpose: before the first request
            // resolves there is nothing truthful to show but a spinner, and an empty state
            // would claim the user has no league.
            LeagueViewModel.ViewState.Idle,
            LeagueViewModel.ViewState.Loading -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Loading,
                title = "Reading your league",
                message = "Matchup and standings come from your provider.",
            )
            LeagueViewModel.ViewState.Demo -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Mock,
                title = "Demo league",
                message = "Demo mode shows no live league. Sign in with a connected league to see your own.",
            )
            is LeagueViewModel.ViewState.Failed -> LeagueFailure(state.error, onRetry, onConnect)
            is LeagueViewModel.ViewState.Loaded -> {
                LeagueHeader(state.overview)
                MatchupSection(state.overview)
                StandingsSection(state.overview)
                ActivitySection(state.overview)
            }
        }
    }
}

@Composable
private fun LeagueHeader(overview: LeagueOverview) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
        Text(
            text = overview.leagueName ?: "Your league",
            style = OmenTheme.typography.h1.toTextStyle(),
            color = OmenTheme.color.textPrimary,
        )
        overview.week?.let {
            Text(
                text = "Week $it",
                style = OmenTheme.typography.label.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }
    }
}

@Composable
private fun MatchupSection(overview: LeagueOverview) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("Matchup")

        val hero = overview.matchupHero
        when {
            hero != null -> OmenMatchupHero(state = hero)
            overview.matchup.status == LeagueOverview.Matchup.Status.NoMatchup -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "No matchup this week",
                message = "Your league has you on a bye. Standings below are still current.",
            )
            // Named rather than generic: the client was told which half failed, so it says so
            // instead of implying the whole league is unreachable.
            else -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "Matchup didn't come back",
                message = matchupUnavailableMessage(overview.matchup.unavailableReason),
            )
        }
    }
}

private fun matchupUnavailableMessage(reason: String?): String = when (reason) {
    "provider_unsupported" ->
        "This provider doesn't give Omen matchup data yet. Standings below are current."
    "team_unknown" ->
        "Omen can't tell which team is yours in this league. Reconnect it in Account to fix that."
    "off_season" -> "Matchups return when the regular season starts."
    else -> "Omen couldn't read this week's matchup. Standings below are still current."
}

@Composable
private fun StandingsSection(overview: LeagueOverview) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("Standings")

        when (overview.standings.status) {
            LeagueOverview.Standings.Status.OffSeason -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "Standings return in the regular season",
                message = "Your league has no standings to show yet.",
            )
            LeagueOverview.Standings.Status.Unavailable -> OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "Standings didn't come back",
                message = "Omen won't show a stale table. Pull to refresh, or try again shortly.",
            )
            LeagueOverview.Standings.Status.Available -> {
                overview.standings.playoffPicture?.let { picture ->
                    OmenCard(variant = OmenCardVariant.Outlined) {
                        Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4)) {
                            Text(
                                text = picture.line,
                                style = OmenTheme.typography.h2.toTextStyle(),
                                color = OmenTheme.color.textPrimary,
                            )
                            // Only when the server actually read playoff settings. Omen states
                            // no playoff likelihood in v1 — position only.
                            if (picture.settingsKnown && picture.cutLineNote != null) {
                                Text(
                                    text = picture.cutLineNote,
                                    style = OmenTheme.typography.body.toTextStyle(),
                                    color = OmenTheme.color.textSecondary,
                                )
                            }
                        }
                    }
                }
                StandingsTable(overview.standings.teams)
            }
        }
    }
}

/** Provider rank order, preserved exactly — Omen never reorders a league (§14.1). */
@Composable
private fun StandingsTable(teams: List<LeagueStandings.Team>) {
    Column(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .border(1.dp, OmenTheme.color.border, RoundedCornerShape(12.dp)),
    ) {
        teams.forEach { team -> StandingsRow(team) }
    }
}

@Composable
private fun StandingsRow(team: LeagueStandings.Team) {
    val record = if (team.wins != null && team.losses != null) "${team.wins}-${team.losses}" else null
    // Points for. Shown because it is what the league is actually sorted by — without it two
    // teams at the same record appear ranked arbitrarily.
    val points = team.pointsFor?.let { String.format(java.util.Locale.US, "%.1f", it) }
    val description = buildList {
        team.rank?.let { add("Rank $it") }
        add(team.teamName ?: "Unnamed team")
        record?.let { add(it) }
        points?.let { add("$it points for") }
        if (team.isCurrentUser) add("your team")
    }.joinToString(", ")

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(if (team.isCurrentUser) OmenTheme.color.surface2 else Color.Transparent)
            .padding(OmenTheme.spacing.step12)
            .semantics { contentDescription = description },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = team.rank?.toString() ?: "–",
            style = OmenTheme.typography.label.toTextStyle(),
            color = OmenTheme.color.textSecondary,
            modifier = Modifier.widthIn(min = 24.dp),
        )
        Text(
            text = team.teamName ?: "Unnamed team",
            style = OmenTheme.typography.body.toTextStyle(),
            color = OmenTheme.color.textPrimary,
            modifier = Modifier.weight(1f),
        )
        record?.let {
            Text(
                text = it,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }
        points?.let {
            Text(
                text = it,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textTertiary,
            )
        }
        if (team.isCurrentUser) {
            OmenBadge(label = "You", tone = OmenBadgeTone.Live)
        }
    }
}

/**
 * v1 derives no activity signals, so this section is normally the approved empty line. It is a
 * real section with a real state — not a placeholder — and the waiver/trade work fills `items`
 * without touching this composable.
 */
@Composable
private fun ActivitySection(overview: LeagueOverview) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        SectionLabel("Around the League")

        if (overview.activity.items.isEmpty()) {
            OmenStateSurface(
                kind = OmenStateSurfaceKind.Empty,
                title = "No major league activity to flag right now",
                message = activityMessage(overview.activity),
            )
        } else {
            OmenCard(variant = OmenCardVariant.Outlined) {
                Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                    overview.activity.items.forEach { item ->
                        Text(
                            text = item.text,
                            style = OmenTheme.typography.body.toTextStyle(),
                            color = OmenTheme.color.textSecondary,
                        )
                    }
                }
            }
        }
    }
}

/**
 * The missing family is NAMED. §14.3 requires the screen to say *which* half is unavailable,
 * and it can only do that because the contract tells it.
 */
private fun activityMessage(activity: LeagueOverview.Activity): String =
    if (activity.unavailableFamilies.contains("transactions")) {
        "Waiver and trade activity isn't connected yet, so Omen isn't reporting on it."
    } else {
        "Omen will flag standings and deadline moves here as they happen."
    }

@Composable
private fun LeagueFailure(
    error: OmenApiError,
    onRetry: (() -> Unit)?,
    onConnect: (() -> Unit)?,
) {
    Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
        OmenStateSurface(
            kind = if (error is OmenApiError.Unauthorized) {
                OmenStateSurfaceKind.Disconnected
            } else {
                OmenStateSurfaceKind.Error
            },
            title = "Omen couldn't load your league",
            message = LeagueViewModel.messageFor(error),
        )
        onRetry?.let {
            OmenButton(
                text = "Try again",
                onClick = it,
                variant = OmenButtonVariant.Secondary,
                size = OmenButtonSize.Md,
            )
        }
        if (error is OmenApiError.Unauthorized) {
            onConnect?.let {
                OmenButton(
                    text = "Connect a league",
                    onClick = it,
                    variant = OmenButtonVariant.Primary,
                    size = OmenButtonSize.Md,
                )
            }
        }
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
