package com.slopssaloon.omen.core.designsystem.component

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.IntrinsicSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.foundation.layout.Spacer
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.slopssaloon.omen.core.designsystem.theme.OmenTheme

/**
 * Registry §3.2 MatchupHero (Matchup Spine, Figma node `25:26`, approved 2026-07-20).
 * Omen-owned vertical head-to-head layout. Selected team on top, opponent on bottom, a
 * centered projection/final rule between them, and — when the container is wide enough —
 * a right-side "What to Watch" rail carrying exactly one factual signal.
 *
 * Deliberate absences per mobile-briefs §1.2: no literal tournament bracket, no mini
 * field, no player headshots, no giant logos, no broadcast-style score bug. Records sit
 * beside/lower-right of team name in smaller, muted type — never beneath.
 *
 * The composition is a single tap target; `onOpen == null` renders display-only.
 */
sealed interface OmenMatchupHeroState {
    val selectedTeam: OmenMatchupTeam
    val opponent: OmenMatchupTeam
    val whatToWatch: String?

    /** Before games kick off. Scores are labeled projections. */
    data class BeforeGames(
        override val selectedTeam: OmenMatchupTeam,
        override val opponent: OmenMatchupTeam,
        val startTime: String,
        override val whatToWatch: String? = null,
    ) : OmenMatchupHeroState

    /** Games in progress. Scores are actual live scores; a projected finish is optional. */
    data class Live(
        override val selectedTeam: OmenMatchupTeam,
        override val opponent: OmenMatchupTeam,
        val projectedFinish: String? = null,
        override val whatToWatch: String? = null,
    ) : OmenMatchupHeroState

    /** Games final. Plain result — brief §1.2: route to Ledger, no celebration/loss drama. */
    data class Final(
        override val selectedTeam: OmenMatchupTeam,
        override val opponent: OmenMatchupTeam,
        val resultSummary: String,
        override val whatToWatch: String? = null,
    ) : OmenMatchupHeroState

    /** No matchup this week or off-season. Never fabricate a weekly scoring context. */
    data class NoMatchup(
        val reason: String,
    ) : OmenMatchupHeroState {
        // Emit safe placeholder teams so callers can pattern-match on the sealed type
        // uniformly — no fabricated scores appear in the UI for this state.
        override val selectedTeam: OmenMatchupTeam = OmenMatchupTeam("", "", "")
        override val opponent: OmenMatchupTeam = OmenMatchupTeam("", "", "")
        override val whatToWatch: String? = null
    }
}

/**
 * One side of the matchup spine.
 * @param scoreText the strongest number on the row. For [OmenMatchupHeroState.BeforeGames]
 * this is a projection and the caller should format it as such (e.g. "119.6 proj").
 */
/**
 * One side of the matchup spine.
 *
 * [scoreText] is the live/final number. [projectedText] is the projection, and when it is
 * supplied the row renders **two labelled columns** — `PROJ` and `SCORE` — instead of one
 * number, per the founder's 2026-09-04 sketch. Both numbers matter at once during a game:
 * where you are, and where you are heading. A single slot forced a choice between them and
 * the projection always lost.
 *
 * [projectedText] is null for a caller with no projection (or one that does not want the
 * columns), and the row falls back to the single-number layout it had before. Absent, not
 * zero — a column of dashes beside real numbers is noise, and "0.0" would read as a real
 * projection of nothing. iOS mirror: `OmenMatchupTeam`.
 */
data class OmenMatchupTeam(
    val name: String,
    val record: String,
    val scoreText: String,
    val projectedText: String? = null,
)

/**
 * True when either side carries a projection. Both rows share one layout so the numbers line
 * up into actual columns — a row with columns above a row without would put the opponent's
 * score under your projection, which is worse than showing neither.
 */
private fun OmenMatchupHeroState.showsColumns(): Boolean = when (this) {
    is OmenMatchupHeroState.BeforeGames ->
        selectedTeam.projectedText != null || opponent.projectedText != null
    is OmenMatchupHeroState.Live ->
        selectedTeam.projectedText != null || opponent.projectedText != null
    is OmenMatchupHeroState.Final ->
        selectedTeam.projectedText != null || opponent.projectedText != null
    is OmenMatchupHeroState.NoMatchup -> false
}

// Column widths are fixed and shared so `123` and `50` sit under `PROJ` and `SCORE` rather
// than drifting with the length of a team name.
//
// Narrowed from 64/72 on 2026-09-06, matching iOS. The numbers were already set in the
// monospaced `numeric` role here, and mono digits at these sizes need less room than the old
// reservation. Every point taken back goes to the team name beside it, which was truncating
// on a phone-width card.
private val PROJ_COLUMN_WIDTH = 58.dp
private val SCORE_COLUMN_WIDTH = 78.dp

/** The accent bar marking your own row. See [TeamRow]. */
private val YOUR_ROW_MARKER_WIDTH = 3.dp

@Composable
fun OmenMatchupHero(
    state: OmenMatchupHeroState,
    modifier: Modifier = Modifier,
    onOpen: (() -> Unit)? = null,
) {
    val a11y = matchupHeroAccessibilityLabel(state)
    val outer = modifier
        .fillMaxWidth()
        .then(
            if (onOpen != null) Modifier
                .clickable(onClickLabel = "View matchup") { onOpen() }
                .semantics {
                    role = Role.Button
                    contentDescription = a11y
                }
            else Modifier.semantics { contentDescription = a11y },
        )

    if (state is OmenMatchupHeroState.NoMatchup) {
        OmenCard(modifier = outer, variant = OmenCardVariant.Solid) {
            Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8)) {
                MatchupEyebrow(text = "MATCHUP")
                Text(
                    text = state.reason,
                    style = OmenTheme.typography.body.toTextStyle(),
                    color = OmenTheme.color.textSecondary,
                )
            }
        }
        return
    }
    val eyebrowText = when (state) {
        is OmenMatchupHeroState.BeforeGames -> "MATCHUP · ${state.startTime}"
        is OmenMatchupHeroState.Live -> "LIVE"
        is OmenMatchupHeroState.Final -> "FINAL"
        is OmenMatchupHeroState.NoMatchup -> "MATCHUP" // unreachable — handled above
    }

    OmenCard(modifier = outer, variant = OmenCardVariant.Solid) {
        BoxWithConstraints {
            val narrow = maxWidth < 380.dp
            val spine = @Composable {
                Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step12)) {
                    MatchupEyebrow(text = eyebrowText)
                    val columns = state.showsColumns()
                    if (columns) ColumnHeader()
                    TeamRow(state.selectedTeam, semanticLabel = "Your team", columns = columns, isYours = true)
                    ConnectingRule(state)
                    TeamRow(state.opponent, semanticLabel = "Opponent", columns = columns, isYours = false)
                    if (onOpen != null) {
                        Text(
                            text = "View matchup →",
                            style = OmenTheme.typography.label.toTextStyle(),
                            color = OmenTheme.color.accent,
                        )
                    }
                }
            }
            val rail: (@Composable () -> Unit)? = state.whatToWatch?.let { signal ->
                @Composable { WhatToWatchRail(signal = signal) }
            }
            if (narrow || rail == null) {
                Column(verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16)) {
                    spine()
                    if (rail != null) rail()
                }
            } else {
                Row(horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step16)) {
                    Box(modifier = Modifier.weight(1f, fill = true)) { spine() }
                    Box(modifier = Modifier.width(160.dp)) { rail() }
                }
            }
        }
    }
}

@Composable
private fun MatchupEyebrow(text: String) {
    Text(
        text = text,
        style = OmenTheme.typography.eyebrow.toTextStyle(),
        color = OmenTheme.color.textSecondary,
    )
}

@Composable
private fun ColumnHeader() {
    val type = OmenTheme.typography
    val colors = OmenTheme.color
    Row(
        // The headers are read once in each row's own label instead, so a screen reader hears
        // "Demo Titans, 6-1, projected 123, scoring 50" rather than a stray "proj score".
        modifier = Modifier.fillMaxWidth().clearAndSetSemantics { },
        horizontalArrangement = Arrangement.End,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        // Matches the leading accent bar in `TeamRow` so `PROJ`/`SCORE` stay over their own
        // columns rather than drifting left of them.
        Spacer(Modifier.width(YOUR_ROW_MARKER_WIDTH))
        Spacer(Modifier.weight(1f))
        Text(
            text = "PROJ",
            style = type.eyebrow.toTextStyle(),
            color = colors.textSecondary,
            textAlign = TextAlign.End,
            modifier = Modifier.width(PROJ_COLUMN_WIDTH),
        )
        Spacer(Modifier.width(OmenTheme.spacing.step8))
        Text(
            text = "SCORE",
            style = type.eyebrow.toTextStyle(),
            color = colors.textSecondary,
            textAlign = TextAlign.End,
            modifier = Modifier.width(SCORE_COLUMN_WIDTH),
        )
    }
}

/**
 * [isYours] draws a short accent bar down the leading edge of your own row.
 *
 * Both rows were styled identically, so on a card showing two unfamiliar league names the
 * reader had to already know their own team name to know which line was theirs — the position
 * convention (yours on top) is real but invisible, and it was the *only* thing carrying it. A
 * rule, not a colour swap on the text: the row keeps `textPrimary` at full contrast either way,
 * and the semantics already say "Your team" first, so this adds a sighted cue to match one the
 * screen-reader label always had.
 *
 * The record moved from beside the name to beneath it on 2026-09-06. The "never beneath" line
 * in brief §1.2 was written before the PROJ column existed; with two numeric columns taking the
 * trailing third of the row, name and record were competing for what was left and the **name**
 * lost, truncating on a phone. It is also set in the numeric (monospaced) role now rather than
 * the serif `bodySmall` — a record is a stat, not prose, and the serif was most of why this card
 * read as three fonts arguing.
 */
@Composable
private fun TeamRow(
    team: OmenMatchupTeam,
    semanticLabel: String,
    columns: Boolean = false,
    isYours: Boolean = false,
) {
    val colors = OmenTheme.color
    val type = OmenTheme.typography
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(IntrinsicSize.Min)
            .semantics { contentDescription = rowDescription(team, semanticLabel, columns) },
        horizontalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .width(YOUR_ROW_MARKER_WIDTH)
                .fillMaxHeight()
                .clip(CircleShape)
                .background(if (isYours) colors.accent else Color.Transparent),
        )
        Column(modifier = Modifier.weight(1f)) {
            // Two lines, not one. Founder on a real device, 2026-09-07: a long Yahoo team name
            // still lost its ending, because a single line has to share the row with two numeric
            // columns no matter how much the columns give back. Wrapping is the only thing that
            // buys a long name more room. `maxLines = 2` wraps only when it must, so a short name
            // is laid out exactly as before. iOS mirror: same change, same reason.
            Text(
                text = team.name,
                style = type.h2.toTextStyle(),
                color = colors.textPrimary,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (team.record.isNotEmpty()) {
                Text(
                    text = team.record,
                    style = type.numeric.copy(size = 13.sp).toTextStyle(),
                    color = colors.textSecondary,
                    maxLines = 1,
                )
            }
        }
        if (columns) {
            Text(
                text = team.projectedText ?: "—",
                // Smaller than the score: the projection is context, the score is the
                // fact. Same size would make the reader work out which is which.
                style = type.numeric.copy(size = 18.sp).toTextStyle(),
                color = colors.textSecondary,
                textAlign = TextAlign.End,
                maxLines = 1,
                modifier = Modifier.width(PROJ_COLUMN_WIDTH),
            )
        }
        Text(
            text = team.scoreText,
            style = type.numeric.copy(size = 24.sp).toTextStyle(),
            color = colors.textPrimary,
            textAlign = if (columns) TextAlign.End else TextAlign.Start,
            maxLines = 1,
            modifier = if (columns) Modifier.width(SCORE_COLUMN_WIDTH) else Modifier,
        )
    }
}

private fun rowDescription(
    team: OmenMatchupTeam,
    semanticLabel: String,
    columns: Boolean,
): String = buildList {
    add(semanticLabel)
    add(team.name)
    if (team.record.isNotEmpty()) add(team.record)
    if (columns) team.projectedText?.let { add("projected $it") }
    add("scoring ${team.scoreText}")
}.joinToString(", ")

@Composable
private fun ConnectingRule(state: OmenMatchupHeroState) {
    val brass = OmenTheme.color.accent
    // Both pre-game and live cases used to restate the two projections here. Once PROJ became
    // its own column that is the same pair of numbers printed twice, three lines apart — so the
    // rule stands down and says what the columns cannot: which phase you are in. Without
    // columns it keeps its old job, because then it is the only place a projection appears.
    val columns = state.showsColumns()
    val contextText = when (state) {
        is OmenMatchupHeroState.BeforeGames ->
            // Both sides carry an em dash before kickoff when the provider gave no projection,
            // and "Projected: —–—" is a label with nothing behind it. Seen on a real ESPN
            // league. Say the true thing instead.
            // Empty, not "Not started", once the columns are present. The eyebrow directly
            // above already reads "MATCHUP · NOT STARTED"; printing it again three lines down
            // inside the rule put the same two words on screen twice with a hairline between
            // them. With columns the rule has nothing left to say, so it stays a hairline.
            if (columns) {
                ""
            } else if (state.selectedTeam.scoreText == "—" && state.opponent.scoreText == "—") {
                "Not started"
            } else {
                "Projected: ${state.selectedTeam.scoreText}–${state.opponent.scoreText}"
            }
        is OmenMatchupHeroState.Live ->
            // Same reason: the eyebrow says "LIVE", so "Live score" here is an echo.
            if (columns) ""
            else state.projectedFinish?.let { "Projected finish: $it" } ?: "Live score"
        // Never redundant: the columns carry no result, and a projection is gone by now.
        is OmenMatchupHeroState.Final ->
            state.resultSummary
        is OmenMatchupHeroState.NoMatchup -> ""
    }
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = OmenTheme.spacing.step4),
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step4),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        // Thin aged-brass rule per brief §1.2 "subtle lace-derived connector may define the spine".
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(1.dp)
                .drawBehind {
                    drawLine(
                        color = brass,
                        start = Offset.Zero,
                        end = Offset(size.width, 0f),
                        strokeWidth = size.height,
                    )
                },
        )
        if (contextText.isNotEmpty()) {
            Text(
                text = contextText,
                style = OmenTheme.typography.bodySmall.toTextStyle(),
                color = OmenTheme.color.textSecondary,
            )
        }
    }
}

@Composable
private fun WhatToWatchRail(signal: String) {
    val colors = OmenTheme.color
    val type = OmenTheme.typography
    Column(
        verticalArrangement = Arrangement.spacedBy(OmenTheme.spacing.step8),
    ) {
        Text(
            text = "WHAT TO WATCH",
            style = type.eyebrow.toTextStyle(),
            color = colors.textSecondary,
        )
        // Brief §1.2 constrains this to two-to-three lines maximum; enforce with maxLines.
        Text(
            text = signal,
            style = type.bodySmall.toTextStyle(),
            color = colors.textPrimary,
            maxLines = 3,
        )
    }
}

/** Publicly exposed for tests + accessibility auditing. */
fun matchupHeroAccessibilityLabel(state: OmenMatchupHeroState): String = when (state) {
    // `projectedText ?: scoreText`, not `scoreText`. Before kickoff `scoreText` is an em dash by
    // design — nobody has scored, and a "0.0" there would read as a real score of nothing — so
    // once the PROJ column shipped this label started announcing "projected —" while the screen
    // showed 100.7. The number moved into its own field and the label was never re-pointed at
    // it. Falls back to `scoreText` for a caller with no projection, which is the shape this
    // label was written for and still the pre-column behaviour. iOS mirror: same fix.
    is OmenMatchupHeroState.BeforeGames ->
        "Matchup starts at ${state.startTime}. Your team ${state.selectedTeam.name} (${state.selectedTeam.record}) projected ${state.selectedTeam.projectedText ?: state.selectedTeam.scoreText}. Opponent ${state.opponent.name} (${state.opponent.record}) projected ${state.opponent.projectedText ?: state.opponent.scoreText}."
    is OmenMatchupHeroState.Live ->
        "Live: ${state.selectedTeam.name} ${state.selectedTeam.scoreText}, ${state.opponent.name} ${state.opponent.scoreText}." +
            (state.projectedFinish?.let { " Projected finish: $it." } ?: "")
    is OmenMatchupHeroState.Final ->
        "Final: ${state.selectedTeam.name} ${state.selectedTeam.scoreText}, ${state.opponent.name} ${state.opponent.scoreText}. ${state.resultSummary}"
    is OmenMatchupHeroState.NoMatchup ->
        "No matchup this week. ${state.reason}"
}
