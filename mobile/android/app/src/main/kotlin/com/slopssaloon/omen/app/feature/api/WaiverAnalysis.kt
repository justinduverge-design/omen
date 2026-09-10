package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverOpportunity
import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverWatchState
import org.json.JSONObject
import kotlin.math.floor
import kotlin.math.round

/**
 * `GET /api/waivers/analysis` -> `waiver-analysis.v1`.
 * iOS mirror: `App/Api/WaiverAnalysis.swift`.
 */
data class WaiverAnalysis(
    val state: State,
    val message: String?,
    val deadline: String?,
    val bestMove: BestMove?,
    val alternatives: List<Alternative>,
) {
    enum class State(val wire: String) {
        ConfirmedOpportunity("confirmed_opportunity"),
        AvailabilityUnknown("availability_unknown"),
        NoLowCostDrop("no_low_cost_drop"),
        NoCredibleMove("no_credible_move"),
        EngineLimitation("engine_limitation"),
        OffSeason("off_season"),
        Unknown("");

        companion object {
            fun from(raw: String?): State =
                entries.firstOrNull { it.wire == raw && it != Unknown } ?: Unknown
        }
    }

    data class BestMove(
        val add: Player?,
        val drop: Player?,
        val improvement: Double?,
        val whyNow: String?,
        val bid: Bid?,
    )

    data class Player(
        val name: String?,
        val position: String?,
        val team: String?,
        val projectedPoints: Double?,
        val status: String?,
    )

    data class Bid(val amount: Double?, val basis: String?)

    data class Alternative(
        val player: Player?,
        val improvement: Double?,
        val tradeoff: String?,
    )

    val waiverWatchState: OmenWaiverWatchState
        get() = when (state) {
            State.ConfirmedOpportunity -> {
                val best = bestMove?.toOpportunity()
                if (best == null) {
                    OmenWaiverWatchState.AvailabilityUnknown
                } else {
                    OmenWaiverWatchState.Urgent(
                        deadlineText = deadline?.let { "Deadline $it" } ?: "Availability confirmed",
                        bestMove = best,
                        longHorizonMoves = alternatives.mapNotNull { it.toOpportunity() }.take(3),
                    )
                }
            }
            State.AvailabilityUnknown -> OmenWaiverWatchState.AvailabilityUnknown
            State.NoLowCostDrop -> OmenWaiverWatchState.Processed
            State.NoCredibleMove -> OmenWaiverWatchState.NoCredibleMove
            State.EngineLimitation, State.Unknown -> OmenWaiverWatchState.AvailabilityUnknown
            State.OffSeason -> OmenWaiverWatchState.OffSeason
        }

    companion object {
        fun parse(json: String): WaiverAnalysis? = runCatching {
            val root = JSONObject(json)
            WaiverAnalysis(
                state = State.from(root.optStringOrNull("state")),
                message = root.optStringOrNull("message"),
                deadline = root.optStringOrNull("deadline"),
                bestMove = root.optJSONObject("best_move")?.let(::bestMove),
                alternatives = root.optJSONArray("alternatives")?.let { array ->
                    (0 until array.length()).mapNotNull { index ->
                        array.optJSONObject(index)?.let(::alternative)
                    }
                }.orEmpty(),
            )
        }.getOrNull()

        private fun bestMove(json: JSONObject): BestMove = BestMove(
            add = json.optJSONObject("add")?.let(::player),
            drop = json.optJSONObject("drop")?.let(::player),
            improvement = json.optDoubleOrNull("improvement"),
            whyNow = json.optStringOrNull("why_now"),
            bid = json.optJSONObject("bid")?.let { Bid(it.optDoubleOrNull("amount"), it.optStringOrNull("basis")) },
        )

        private fun alternative(json: JSONObject): Alternative = Alternative(
            player = json.optJSONObject("player")?.let(::player),
            improvement = json.optDoubleOrNull("improvement"),
            tradeoff = json.optStringOrNull("tradeoff"),
        )

        private fun player(json: JSONObject): Player = Player(
            name = json.optStringOrNull("name"),
            position = json.optStringOrNull("position"),
            team = json.optStringOrNull("team"),
            projectedPoints = json.optDoubleOrNull("projected_points"),
            status = json.optStringOrNull("status"),
        )
    }
}

private fun WaiverAnalysis.BestMove.toOpportunity(): OmenWaiverOpportunity? {
    val player = add ?: return null
    val name = player.name?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    val projected = improvement?.let { "Projects +${pointsText(it)} vs current slot" }
    val suggestedBid = bid?.amount?.let { "Suggested bid ${pointsText(it)}" }
    return OmenWaiverOpportunity(
        playerName = name,
        position = player.position?.trim()?.takeIf { it.isNotEmpty() } ?: "Player",
        team = player.team?.trim()?.takeIf { it.isNotEmpty() } ?: "Available player",
        availability = listOfNotNull(projected, suggestedBid).joinToString(" · ")
            .ifEmpty { "Available in this league" },
        reason = whyNow?.trim()?.takeIf { it.isNotEmpty() }
            ?: "Omen found this as the strongest available roster move.",
    )
}

private fun WaiverAnalysis.Alternative.toOpportunity(): OmenWaiverOpportunity? {
    val player = player ?: return null
    val name = player.name?.trim()?.takeIf { it.isNotEmpty() } ?: return null
    return OmenWaiverOpportunity(
        playerName = name,
        position = player.position?.trim()?.takeIf { it.isNotEmpty() } ?: "Player",
        team = player.team?.trim()?.takeIf { it.isNotEmpty() } ?: "Available player",
        availability = improvement?.let { "Projects +${pointsText(it)}" } ?: "Available in this league",
        reason = tradeoff?.trim()?.takeIf { it.isNotEmpty() } ?: "Alternative waiver option.",
    )
}

private fun pointsText(value: Double): String {
    val rounded = round(value * 10) / 10
    return if (rounded == floor(rounded)) rounded.toInt().toString() else rounded.toString()
}

private fun JSONObject.optDoubleOrNull(key: String): Double? {
    if (!has(key) || isNull(key)) return null
    val value = optDouble(key, Double.NaN)
    return if (value.isNaN()) null else value
}
