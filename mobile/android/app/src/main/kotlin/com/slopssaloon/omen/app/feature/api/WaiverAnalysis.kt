package com.slopssaloon.omen.app.feature.api

import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverOpportunity
import com.slopssaloon.omen.app.feature.commandcenter.OmenWaiverWatchState
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionCapability
import org.json.JSONObject
import kotlin.math.floor
import kotlin.math.round

/**
 * `GET /api/waivers/analysis` -> `waiver-analysis.v1`.
 * iOS mirror: `WaiverAnalysis` in `App/Api/DashboardRepository.swift`. There is no
 * `App/Api/WaiverAnalysis.swift` and there never was — this pointer named one until
 * 2026-09-20, which sent anyone checking the two models against each other to a file that
 * does not exist.
 */
data class WaiverAnalysis(
    val state: State,
    val message: String?,
    val deadline: String?,
    val bestMove: BestMove?,
    val alternatives: List<Alternative>,
    /**
     * `waiver_system`. **Absent means not determined** — see [WaiverSystem.System].
     *
     * Added for J5's `WaiverNotDetermined`, which cannot be rendered honestly without it: the
     * screen's entire job is to say that the system is unknown, and before this field the client
     * had no way to tell "unknown" from "FAAB with a budget we happen not to have".
     */
    val waiverSystem: WaiverSystem? = null,
    /** Coverage only; player rows and bid math stay owned by waiver-analysis.v1. */
    val capabilities: List<OmenDecisionCapability> = emptyList(),
) {

    /**
     * `waiver_system` — how this league decides who gets a claim.
     *
     * §6.2's gate. FAAB figures appear only for a positively-determined FAAB league; priority
     * only for a determined priority league; **neither** for `not_determined`, which is what ESPN
     * and Yahoo return today.
     */
    data class WaiverSystem(
        val system: System,
        /**
         * "Your budget $63 of $100". Composed server-side, because the client does not know
         * whether a zero balance means spent or unread.
         */
        val budgetText: String?,
        /** "Claim order 7 of 12". */
        val orderText: String?,
    ) {
        enum class System(val wire: String) {
            Faab("faab"),
            Priority("priority"),
            NotDetermined("not_determined");

            companion object {
                /**
                 * An unrecognized value degrades to [NotDetermined], never to [Faab]. Assuming a
                 * budget league is the one wrong guess that produces a bid figure out of nothing.
                 */
                fun from(raw: String?): System =
                    entries.firstOrNull { it.wire == raw } ?: NotDetermined
            }
        }
    }
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
                waiverSystem = root.optJSONObject("waiver_system")?.let(::waiverSystem),
                alternatives = root.optJSONArray("alternatives")?.let { array ->
                    (0 until array.length()).mapNotNull { index ->
                        array.optJSONObject(index)?.let(::alternative)
                    }
                }.orEmpty(),
                capabilities = root.decisionCapabilities(),
            )
        }.getOrNull()

        private fun waiverSystem(json: JSONObject): WaiverSystem = WaiverSystem(
            system = WaiverSystem.System.from(json.optStringOrNull("system")),
            budgetText = json.optStringOrNull("budget_text"),
            orderText = json.optStringOrNull("order_text"),
        )

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
