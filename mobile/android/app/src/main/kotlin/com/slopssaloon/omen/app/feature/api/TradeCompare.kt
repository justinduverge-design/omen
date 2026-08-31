package com.slopssaloon.omen.app.feature.api

import org.json.JSONArray
import org.json.JSONObject

/**
 * `POST /api/trade/compare` → `trade-compare.v2`. iOS mirror: `App/Api/TradeCompare.swift`.
 *
 * v2 exists for exactly one reason: the shipped engine emits a three-value verdict
 * (`accept` / `decline` / `neutral`), and the approved vocabulary has **four** labels. The
 * fourth — `insufficient_data` — is reachable only through the server's `evaluability` signal
 * and **never by inference on the client**. This type therefore reads `verdict_state` and
 * never `verdict`.
 */
data class TradeCompare(
    val contractVersion: String,
    val verdictState: VerdictState,
    val evaluability: Evaluability,
    val analysisContext: AnalysisContext,
    val netValue: Double?,
    val explanation: String?,
) {
    /** Visual briefs §9.2. */
    enum class VerdictState(val wire: String) {
        FavorsYou("favors_you"),
        YouGiveUpTooMuch("you_give_up_too_much"),
        CloseNeedsContext("close_needs_context"),
        InsufficientData("insufficient_data"),
        ;

        companion object {
            /**
             * An unrecognized state degrades to the honest non-answer, never to a verdict.
             * Guessing here would be the client minting a call the server did not issue.
             */
            fun from(raw: String?): VerdictState =
                entries.firstOrNull { it.wire == raw } ?: InsufficientData
        }
    }

    /** §9.4: name incomplete input, do not force a verdict. */
    data class Evaluability(
        val status: String,
        val reason: String?,
        val missingProjectionCount: Int,
        val totalPlayerCount: Int,
    ) {
        val isEvaluable: Boolean get() = status == "evaluable"
    }

    /** The server's word for whether the answer used the caller's real league. */
    data class AnalysisContext(
        val mode: String,
        val platform: String?,
        val leagueId: String?,
        val leagueName: String?,
        val applied: List<String>,
        val unavailableReason: String?,
    ) {
        val isPersonalized: Boolean get() = mode == "personalized"
    }

    /**
     * The headline. Never derived from [netValue] — the server owns the verdict, and a client
     * that recomputed it could disagree with the server on screen.
     */
    val headline: String
        get() = when (verdictState) {
            VerdictState.FavorsYou -> "This favors you"
            VerdictState.YouGiveUpTooMuch -> "You give up too much"
            VerdictState.CloseNeedsContext -> "Close — needs context"
            VerdictState.InsufficientData -> "Omen can't call this one"
        }

    val subhead: String
        get() = when (verdictState) {
            VerdictState.InsufficientData -> when (evaluability.reason) {
                "no_players" -> "Add players to both sides and Omen will look at it."
                "missing_projections" -> {
                    val n = evaluability.missingProjectionCount
                    if (n == 1) {
                        "Omen has no projection for 1 of these players, so it won't force a verdict."
                    } else {
                        "Omen has no projection for $n of these players, so it won't force a verdict."
                    }
                }
                else -> "Omen doesn't have enough to evaluate this offer."
            }
            VerdictState.CloseNeedsContext ->
                "The value is close enough that your roster and league settings decide it."
            else -> if (analysisContext.isPersonalized) {
                "Based on your league's scoring and your roster."
            } else {
                "Based on standard scoring — not your league's settings."
            }
        }

    companion object {
        fun parse(json: String): TradeCompare? = runCatching {
            val root = JSONObject(json)
            val ev = root.optJSONObject("evaluability")
            val ctx = root.optJSONObject("analysis_context")
            val applied = ctx?.optJSONArray("applied")

            TradeCompare(
                contractVersion = root.optString("contract_version"),
                verdictState = VerdictState.from(root.optString("verdict_state")),
                evaluability = Evaluability(
                    status = ev?.optString("status").orEmpty(),
                    reason = ev?.optString("reason")?.takeIf { it.isNotEmpty() && it != "null" },
                    missingProjectionCount = ev?.optInt("missing_projection_count") ?: 0,
                    totalPlayerCount = ev?.optInt("total_player_count") ?: 0,
                ),
                analysisContext = AnalysisContext(
                    mode = ctx?.optString("mode").orEmpty(),
                    platform = ctx?.optString("platform")?.takeIf { it.isNotEmpty() && it != "null" },
                    leagueId = ctx?.optString("league_id")?.takeIf { it.isNotEmpty() && it != "null" },
                    leagueName = ctx?.optString("league_name")?.takeIf { it.isNotEmpty() && it != "null" },
                    applied = buildList {
                        for (i in 0 until (applied?.length() ?: 0)) {
                            applied?.optString(i)?.takeIf { it.isNotEmpty() }?.let { add(it) }
                        }
                    },
                    unavailableReason = ctx?.optString("unavailable_reason")
                        ?.takeIf { it.isNotEmpty() && it != "null" },
                ),
                netValue = if (root.has("net_value") && !root.isNull("net_value")) {
                    root.optDouble("net_value")
                } else {
                    null
                },
                explanation = root.optString("explanation").takeIf { it.isNotEmpty() && it != "null" },
            )
        }.getOrNull()
    }
}

/**
 * The offer being compared. Names only: the client never sends roster, scoring rules, or
 * settings, and `league_context` is a *request* for personalization rather than the data — the
 * server reads that from the user's own stored connection.
 */
/**
 * One player in an offer. iOS mirror: `TradePlayer`.
 *
 * **These were bare strings, and that was a beta-blocking defect.**
 * `POST /api/trade/compare` validates `each player must be an object` and rejects a string with
 * a 400, so every Compare from either native client failed — and failed as "Omen couldn't
 * compare this", an error surface, rather than as the honest `insufficient_data` answer the
 * contract defines.
 *
 * Nobody found it because nobody could reach it: the Trade screen had no working way to add a
 * player (`F-DEV-03`), so Compare was never pressed against the live API with a real offer.
 * Two defects in one screen, the first hiding the second.
 *
 * `position` and `team` are carried because the server scores on them — a name-only player
 * resolves to `position: "UNK"` and drops out of scarcity and tier calculation entirely. The
 * autocomplete already returned both and the client was discarding them.
 */
data class TradePlayer(
    val name: String,
    val position: String? = null,
    val team: String? = null,
    /**
     * The provider's own id (`"sleeper:6794"`), passed through untouched so the server can
     * resolve a projection by key rather than by fuzzy name match.
     */
    val playerKey: String? = null,
) {
    fun payload(): JSONObject {
        val out = JSONObject().put("name", name)
        position?.takeIf { it.isNotEmpty() }?.let { out.put("position", it) }
        team?.takeIf { it.isNotEmpty() }?.let { out.put("team", it) }
        playerKey?.takeIf { it.isNotEmpty() }?.let { out.put("player_key", it) }
        return out
    }

    companion object {
        /** A name typed by hand carries no position, and none is invented for it. */
        fun of(result: PlayerSearchResult) = TradePlayer(
            name = result.name,
            position = result.position,
            team = result.team,
            playerKey = result.id,
        )
    }
}

data class TradeOffer(
    val send: List<TradePlayer> = emptyList(),
    val receive: List<TradePlayer> = emptyList(),
    val leagueContext: LeagueContext? = null,
) {
    data class LeagueContext(val platform: String, val leagueId: String)

    val isComparable: Boolean get() = send.isNotEmpty() && receive.isNotEmpty()

    fun requestBody(): String {
        val root = JSONObject()
            .put("send", JSONArray(send.map { it.payload() }))
            .put("receive", JSONArray(receive.map { it.payload() }))
        leagueContext?.let {
            root.put(
                "league_context",
                JSONObject().put("platform", it.platform).put("league_id", it.leagueId),
            )
        }
        return root.toString()
    }
}
