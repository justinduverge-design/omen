package com.slopssaloon.omen.app.feature.commandcenter

import com.slopssaloon.omen.app.feature.api.LeagueOverview
import com.slopssaloon.omen.app.feature.api.LeagueStandings
import com.slopssaloon.omen.app.feature.api.WaiverAnalysis
import com.slopssaloon.omen.app.feature.shell.omenCrest
import com.slopssaloon.omen.core.designsystem.component.OmenConfidenceBand
import com.slopssaloon.omen.core.designsystem.component.OmenPlatform
import com.slopssaloon.omen.core.designsystem.component.OmenRiskLevel
import java.util.Locale

// ---------------------------------------------------------------------------------------------
// Binding the scout's nest to the real read. Mirror of the `MARK: - Binding the scout's nest to
// the real read` section of `App/CommandCenter/OmenScoutScreens.swift`.
//
// **Nothing here invents a value.** Where the payload does not carry what the artboard draws, the
// element does not render, or the section becomes `Unread` with the capability named and the
// server's own reason quoted.
//
// Sections resolve independently, which is the screen's rule rather than a convenience: a dead
// trade-target read must be able to sit beside a live table.
// ---------------------------------------------------------------------------------------------

/** Builds the Table screen from `league-overview.v1`. */
fun omenScoutTableState(
    overview: LeagueOverview,
    waiver: OmenScoutSection<OmenDeskWaiverMove>,
    tradeTargets: OmenScoutSection<List<OmenScoutTradeTarget>>,
    notice: String? = null,
    footnote: OmenDeskFootnote? = null,
    retryTitle: String? = null,
): OmenScoutTableState = OmenScoutTableState(
    weekLabel = scoutWeekLabel(overview),
    notice = notice,
    strip = scoutStrip(overview),
    table = scoutTable(overview),
    cutLine = scoutCutLine(overview),
    tradeTargets = tradeTargets,
    waiver = waiver,
    activity = scoutActivity(overview),
    activityUnreadNote = scoutActivityUnreadNote(overview),
    footnote = footnote,
    retryTitle = retryTitle,
)

private fun scoutWeekLabel(overview: LeagueOverview): String {
    val teams = overview.standings.teams.size
    val week = overview.week
    return when {
        week != null && teams > 0 -> "Week $week · $teams teams"
        week != null -> "Week $week"
        teams > 0 -> "$teams teams"
        // No week and no team count. An eyebrow reading "Week —" would look like a bug; nothing
        // is what the payload actually supports.
        else -> ""
    }
}

private fun scoutStrip(overview: LeagueOverview): OmenScoutSection<OmenScoutStrip> {
    val platform = overview.omenPlatform
    val mine = overview.matchup.you?.points
    val theirs = overview.matchup.opponent?.points
    if (platform == null || mine == null || theirs == null ||
        overview.matchup.status == LeagueOverview.Matchup.Status.Unavailable
    ) {
        return OmenScoutSection.Unread(
            capability = "League matchup",
            sentence = overview.matchup.unavailableReason
                ?: "The provider did not return this week's scoreboard. The table below read normally.",
        )
    }
    return OmenScoutSection.Read(
        OmenScoutStrip(
            platform = platform,
            myScore = scoutPoints(mine),
            theirScore = scoutPoints(theirs),
            status = scoutMatchupLabel(overview.matchup.status),
        ),
    )
}

/** The strip's status word. Server-owned states, worded as the artboard words them. */
private fun scoutMatchupLabel(status: LeagueOverview.Matchup.Status): String = when (status) {
    LeagueOverview.Matchup.Status.Live -> "Live"
    LeagueOverview.Matchup.Status.Final -> "Final"
    LeagueOverview.Matchup.Status.Pregame -> "Pre-game"
    LeagueOverview.Matchup.Status.NoMatchup -> "No matchup"
    LeagueOverview.Matchup.Status.Unavailable -> "Unavailable"
}

private fun scoutTable(overview: LeagueOverview): OmenScoutSection<List<OmenScoutTableRow>> =
    when (overview.standings.status) {
        LeagueOverview.Standings.Status.Unavailable -> OmenScoutSection.Unread(
            capability = "League standings",
            sentence = "Omen could not read the table this week and will not show you a stale one.",
        )
        LeagueOverview.Standings.Status.OffSeason -> OmenScoutSection.Unread(
            capability = "League standings",
            sentence = "Standings return when the regular season starts.",
        )
        LeagueOverview.Standings.Status.Available -> OmenScoutSection.Read(
            // Provider rank order, preserved exactly. Omen never reorders a league (§14.1), and
            // re-ranking here would be a claim no contract supports.
            overview.standings.teams.mapIndexed { index, team ->
                OmenScoutTableRow(
                    rank = team.rank ?: (index + 1),
                    crest = omenCrest(team.teamName.orEmpty()),
                    teamName = team.teamName?.takeIf { it.isNotEmpty() } ?: "Unnamed team",
                    // `league-overview.v1` carries no form history. Null, not five invented pips.
                    form = null,
                    record = scoutRecordText(team),
                    isMine = team.isCurrentUser,
                )
            },
        )
    }

private fun scoutRecordText(team: LeagueStandings.Team): String {
    val wins = team.wins ?: return ""
    val losses = team.losses ?: return ""
    return "$wins–$losses"
}

/**
 * **Sleeper only, today.** `playoff_picture.settings_known` is `true` on Sleeper ONLY; ESPN and
 * Yahoo are unproven, and on an unproven provider the line is absent rather than drawn at a
 * guessed rank. A cut line in the wrong place is a claim about who makes the playoffs.
 */
private fun scoutCutLine(overview: LeagueOverview): OmenScoutCutLine? {
    val picture = overview.standings.playoffPicture ?: return null
    if (!picture.settingsKnown) return null
    val note = picture.cutLineNote ?: return null
    return OmenScoutCutLine(afterRank = picture.rank, label = note)
}

private fun scoutActivity(overview: LeagueOverview): OmenScoutSection<List<OmenScoutActivityRow>> {
    if (overview.activity.status == LeagueOverview.Activity.Status.Unavailable) {
        return OmenScoutSection.Unread(
            capability = "League activity",
            sentence = "Adds, drops and trades are not in this list. The list is not empty — it is unread, and those are different things.",
        )
    }
    return OmenScoutSection.Read(
        overview.activity.items.map { OmenScoutActivityRow(category = it.category, text = it.text) },
    )
}

/** The missing family is NAMED, which the screen can only do because the contract carries it. */
private fun scoutActivityUnreadNote(overview: LeagueOverview): String? {
    val families = overview.activity.unavailableFamilies
    if (families.isEmpty()) return null
    if (overview.activity.status == LeagueOverview.Activity.Status.Unavailable) return null
    return "${families.joinToString(", ")} unavailable for ${scoutProviderName(overview)} right now — those entries are missing from this list, which is unread rather than empty."
}

private fun scoutProviderName(overview: LeagueOverview): String = when (overview.omenPlatform) {
    OmenPlatform.Espn -> "ESPN"
    OmenPlatform.Yahoo -> "Yahoo"
    OmenPlatform.Sleeper -> "Sleeper"
    null -> "this provider"
}

private fun scoutPoints(value: Double): String = String.format(Locale.US, "%.1f", value)

// MARK: The wire

/** Builds the wire from `waiver-analysis.v1`. */
fun omenScoutWireState(
    analysis: WaiverAnalysis,
    weekLabel: String,
    footnote: OmenDeskFootnote? = null,
): OmenScoutWireState {
    val system = omenWaiverSystem(analysis.waiverSystem)
    return OmenScoutWireState(
        weekLabel = weekLabel,
        processLabel = analysis.deadline?.let { "Claims process" },
        processTime = analysis.deadline,
        system = system,
        notice = if (system == OmenWaiverSystem.NotDetermined) NOT_DETERMINED_NOTICE else null,
        body = scoutWireBody(analysis, system),
        footnote = footnote,
    )
}

private const val NOT_DETERMINED_NOTICE =
    "Omen could not tell which waiver system this league uses. The setting did not come back, and budget, rolling priority and reverse standings each change the advice completely."

/**
 * Maps `waiver_system` onto the gate.
 *
 * **Anything that is not a positively determined system is [OmenWaiverSystem.NotDetermined].** An
 * unknown wire value resolves here rather than to a guess, because the one thing worse than not
 * knowing the system is assuming FAAB — which is what ESPN and Yahoo would get.
 */
private fun omenWaiverSystem(system: WaiverAnalysis.WaiverSystem?): OmenWaiverSystem {
    if (system == null) return OmenWaiverSystem.NotDetermined
    return when (system.system) {
        WaiverAnalysis.WaiverSystem.System.Faab -> {
            val budget = system.budgetText ?: return OmenWaiverSystem.NotDetermined
            OmenWaiverSystem.Faab(budgetText = budget, orderText = system.orderText)
        }
        WaiverAnalysis.WaiverSystem.System.Priority -> {
            val order = system.orderText ?: return OmenWaiverSystem.NotDetermined
            OmenWaiverSystem.Priority(orderText = order)
        }
        WaiverAnalysis.WaiverSystem.System.NotDetermined -> OmenWaiverSystem.NotDetermined
    }
}

private fun scoutWireBody(
    analysis: WaiverAnalysis,
    system: OmenWaiverSystem,
): OmenScoutWireBody {
    // The gate comes first. A confirmed opportunity in a league whose waiver system is unknown
    // still cannot carry a bid or a claim order, so the not-determined surface wins over the
    // opportunity one and the player read survives inside it.
    if (system == OmenWaiverSystem.NotDetermined) {
        return OmenScoutWireBody.NotDetermined(
            stillTrueTitle = "What is still true",
            stillTrue = scoutStillTrueRows(analysis),
            withheldTitle = "What Omen will not tell you",
            withheld = listOf(
                OmenScoutWireRow(
                    title = "Suggested bid",
                    detail = "needs a confirmed budget",
                    status = OmenScoutWireRowStatus.Unavailable,
                ),
                OmenScoutWireRow(
                    title = "Your claim order",
                    detail = "needs a confirmed priority system",
                    status = OmenScoutWireRowStatus.Unavailable,
                ),
                // Reworded against the artboard, deliberately. The artboard files this as "needs
                // both", which implies Omen would give you odds if it knew the system. It would
                // not: claim probability is never returned, for ANY league. The artboard owns the
                // shape of this row; the contract owns what it may say.
                OmenScoutWireRow(
                    title = "Odds you win the claim",
                    detail = "Omen never estimates this, in any league",
                    status = OmenScoutWireRowStatus.Unavailable,
                ),
            ),
            note = "A bid figure invented without the budget would be worse than no figure. The player read above is unaffected — it does not depend on the waiver system.",
        )
    }

    if (analysis.state == WaiverAnalysis.State.ConfirmedOpportunity) {
        val best = analysis.bestMove
        val move = best?.let(::scoutMoveFromBest)
        if (best != null && move != null) {
            return OmenScoutWireBody.Opportunity(
                best = move,
                // Null, never zero. `Bid.amount` is nullable for exactly this reason and the line
                // disappears rather than reading "$0".
                suggestedBid = best.bid?.amount?.let { amount ->
                    val figure = "Suggested bid $${Math.round(amount)}"
                    val basis = best.bid?.basis?.takeIf { it.isNotEmpty() }
                    if (basis == null) figure else "$figure — $basis"
                },
                alternatives = analysis.alternatives.mapNotNull(::scoutMoveFromAlternative),
            )
        }
    }
    return scoutNoMove(analysis)
}

private fun scoutNoMove(analysis: WaiverAnalysis): OmenScoutWireBody = OmenScoutWireBody.NoMove(
    headline = "Nothing on this wire beats what you have.",
    // The server's own message when it sent one. A client-authored explanation of someone else's
    // decision is a guess.
    body = analysis.message?.trim()?.takeIf { it.isNotEmpty() }
        ?: "Omen checked the available free agents against your starting slots and found nothing that clears the noise.",
    costTitle = "What it would have cost",
    cost = "Claiming the best available means dropping someone worth more to you than the claim. Doing nothing is the move this week.",
    band = OmenConfidenceBand.Confident,
    risk = OmenRiskLevel.Low,
    watchTitle = "Watch list",
    watching = emptyList(),
)

/**
 * The player read does not depend on the waiver system, so it survives — which is the entire
 * argument of `WaiverNotDetermined`.
 */
private fun scoutStillTrueRows(analysis: WaiverAnalysis): List<OmenScoutWireRow> = buildList {
    analysis.bestMove?.add?.let { add ->
        val name = add.name
        if (!name.isNullOrEmpty()) {
            add(
                OmenScoutWireRow(
                    title = name,
                    detail = scoutMeta(add.position, add.team),
                    status = OmenScoutWireRowStatus.Live,
                ),
            )
        }
    }
    analysis.alternatives.forEach { alternative ->
        val player = alternative.player ?: return@forEach
        val name = player.name
        if (name.isNullOrEmpty()) return@forEach
        add(
            OmenScoutWireRow(
                title = name,
                detail = scoutMeta(player.position, player.team),
                status = OmenScoutWireRowStatus.Live,
            ),
        )
    }
}

private fun scoutMoveFromBest(best: WaiverAnalysis.BestMove): OmenScoutWireMove? {
    val add = best.add ?: return null
    val name = add.name?.takeIf { it.isNotEmpty() } ?: return null
    return OmenScoutWireMove(
        addName = name,
        addMeta = scoutMeta(add.position, add.team),
        addPoints = add.projectedPoints?.let(::scoutPoints),
        dropName = best.drop?.name,
        dropMeta = scoutMeta(best.drop?.position, best.drop?.team).takeIf { it.isNotEmpty() },
        dropPoints = best.drop?.projectedPoints?.let(::scoutPoints),
        reasoning = best.whyNow?.takeIf { it.isNotEmpty() }
            ?: "Omen found this as the strongest available roster move.",
    )
}

private fun scoutMoveFromAlternative(alternative: WaiverAnalysis.Alternative): OmenScoutWireMove? {
    val player = alternative.player ?: return null
    val name = player.name?.takeIf { it.isNotEmpty() } ?: return null
    return OmenScoutWireMove(
        addName = name,
        addMeta = scoutMeta(player.position, player.team),
        addPoints = player.projectedPoints?.let(::scoutPoints),
        reasoning = alternative.tradeoff?.takeIf { it.isNotEmpty() }
            ?: "An alternative claim if the first one does not land.",
    )
}

private fun scoutMeta(position: String?, team: String?): String =
    listOfNotNull(position, team).joinToString(" · ")

// MARK: The Waiver section on the Table screen

/**
 * The one-card summary the Table screen's Waiver section shows.
 *
 * Only a confirmed opportunity with a real add becomes a card. Every other state — no credible
 * move, no low-cost drop, availability unknown, engine limitation, off-season — resolves to the
 * *could not read* block with a sentence, because a blank Waiver section on the scout's nest is
 * indistinguishable from a wire nobody read.
 */
val WaiverAnalysis.scoutSummary: OmenScoutSection<OmenDeskWaiverMove>
    get() {
        val best = bestMove
        val add = best?.add
        val name = add?.name
        if (state != WaiverAnalysis.State.ConfirmedOpportunity || best == null || add == null ||
            name.isNullOrEmpty()
        ) {
            return OmenScoutSection.Unread(
                capability = "Waivers",
                sentence = message?.trim()?.takeIf { it.isNotEmpty() }
                    ?: "Omen has no claim worth making on this wire right now. Open the wire for what it checked.",
            )
        }
        return OmenScoutSection.Read(
            OmenDeskWaiverMove(
                addName = name,
                addMeta = scoutMeta(add.position, add.team),
                addPoints = add.projectedPoints?.let(::scoutPoints),
                dropName = best.drop?.name,
                dropMeta = scoutMeta(best.drop?.position, best.drop?.team).takeIf { it.isNotEmpty() },
                dropPoints = best.drop?.projectedPoints?.let(::scoutPoints),
                reasoning = best.whyNow?.takeIf { it.isNotEmpty() }
                    ?: "Omen found this as the strongest available roster move.",
                band = OmenConfidenceBand.Confident,
                risk = OmenRiskLevel.Low,
            ),
        )
    }
