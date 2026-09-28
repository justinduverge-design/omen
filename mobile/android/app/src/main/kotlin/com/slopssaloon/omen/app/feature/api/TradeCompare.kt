package com.slopssaloon.omen.app.feature.api

import org.json.JSONArray
import org.json.JSONObject
import com.slopssaloon.omen.core.designsystem.component.OmenDecisionCapability

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
    /** Server-owned supporting coverage; it never creates a verdict on-device. */
    val capabilities: List<OmenDecisionCapability> = emptyList(),
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
    val headline: String get() = headlineFor(verdictState)

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
        /**
         * T5: hoisted out of the instance property so [TradeThreeTeamCompare] — which carries
         * the same `verdict_state` vocabulary for its "your own" headline but is parsed from a
         * distinct response shape — reads the identical `when` rather than a second copy of it.
         */
        fun headlineFor(state: VerdictState): String = when (state) {
            VerdictState.FavorsYou -> "This favors you"
            VerdictState.YouGiveUpTooMuch -> "You give up too much"
            VerdictState.CloseNeedsContext -> "Close — needs context"
            VerdictState.InsufficientData -> "Omen can't call this one"
        }

        fun parse(json: String): TradeCompare? = runCatching {
            val root = JSONObject(json)
            val ev = root.optJSONObject("evaluability")
            val ctx = root.optJSONObject("analysis_context")
            val applied = ctx?.optJSONArray("applied")

            TradeCompare(
                contractVersion = root.optStringOrNull("contract_version").orEmpty(),
                verdictState = VerdictState.from(root.optStringOrNull("verdict_state").orEmpty()),
                evaluability = Evaluability(
                    status = ev?.optString("status").orEmpty(),
                    reason = ev?.optStringOrNull("reason").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
                    missingProjectionCount = ev?.optInt("missing_projection_count") ?: 0,
                    totalPlayerCount = ev?.optInt("total_player_count") ?: 0,
                ),
                analysisContext = AnalysisContext(
                    mode = ctx?.optString("mode").orEmpty(),
                    platform = ctx?.optStringOrNull("platform").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
                    leagueId = ctx?.optStringOrNull("league_id").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
                    leagueName = ctx?.optStringOrNull("league_name").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
                    applied = buildList {
                        for (i in 0 until (applied?.length() ?: 0)) {
                            applied?.optString(i)?.takeIf { it.isNotEmpty() }?.let { add(it) }
                        }
                    },
                    unavailableReason = ctx?.optStringOrNull("unavailable_reason").orEmpty()
                        ?.takeIf { it.isNotEmpty() && it != "null" },
                ),
                netValue = if (root.has("net_value") && !root.isNull("net_value")) {
                    root.optDouble("net_value")
                } else {
                    null
                },
                explanation = root.optStringOrNull("explanation"),
                capabilities = root.decisionCapabilities(),
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

    /** Just the send/receive players — used by `POST /api/trade/share`, which takes no
     * `league_context`. */
    fun shareRequestBody(): String = JSONObject()
        .put("send", JSONArray(send.map { it.payload() }))
        .put("receive", JSONArray(receive.map { it.payload() }))
        .toString()
}

// MARK: - Trade roster read (J4: TradeBuild, TradeRoster)

/**
 * `GET /api/trade/roster` → `trade-roster.v1`. iOS mirror: `TradeRosterResponse`.
 *
 * Sleeper, ESPN and Yahoo all resolve a real opponent roster today. `status` still carries
 * `"unavailable"` as the exception path — no connection, a stale ESPN/Yahoo session, or a league
 * that has not drafted — and the screen renders that honestly rather than treating a thin
 * payload as an empty roster.
 */
data class TradeRosterResponse(
    val contractVersion: String,
    val status: String,
    val platform: String,
    val reason: String?,
    val week: Int?,
    val teams: List<Team>,
) {
    val isAvailable: Boolean get() = status == "ok"

    /**
     * The server's reason code, said in the product's voice. `CONTRACTS.md`'s `LeagueNoRosters`
     * rule: no retry — a permanent provider limit for this league is not an outage.
     */
    val unavailableSentence: String
        get() = when (reason) {
            "provider_unsupported" -> "Omen can't read the other teams' rosters for this provider yet."
            "provider_reauth_required" ->
                "Omen's connection to your league needs to be reconnected before it can read the other teams' rosters."
            "league_not_active" -> "This league hasn't drafted yet, so there are no rosters to read."
            else -> "Omen can't read the other teams' rosters for this league right now."
        }

    data class Team(val teamId: String, val teamName: String?, val players: List<Player>) {
        val id: String get() = teamId
    }

    data class Player(
        val playerKey: String?,
        val name: String,
        val position: String?,
        val team: String?,
        val projectedPoints: Double?,
    ) {
        val id: String get() = playerKey ?: name

        /** "RB · IND", or just the position, or just the team — never a fabricated rank. */
        val meta: String
            get() = when {
                !position.isNullOrEmpty() && !team.isNullOrEmpty() -> "$position · $team"
                !position.isNullOrEmpty() -> position
                !team.isNullOrEmpty() -> team
                else -> "Unranked"
            }
    }

    companion object {
        fun parse(raw: String): TradeRosterResponse? = runCatching {
            val root = JSONObject(raw)
            val teamsArr = root.optJSONArray("teams")
            val teams = buildList {
                for (i in 0 until (teamsArr?.length() ?: 0)) {
                    val t = teamsArr?.optJSONObject(i) ?: continue
                    val playersArr = t.optJSONArray("players")
                    val players = buildList {
                        for (j in 0 until (playersArr?.length() ?: 0)) {
                            val p = playersArr?.optJSONObject(j) ?: continue
                            add(
                                Player(
                                    playerKey = p.optStringOrNull("player_key"),
                                    name = p.optStringOrNull("name") ?: "Unknown",
                                    position = p.optStringOrNull("position"),
                                    team = p.optStringOrNull("team"),
                                    projectedPoints = if (p.has("projected_points") && !p.isNull("projected_points")) {
                                        p.optDouble("projected_points")
                                    } else {
                                        null
                                    },
                                ),
                            )
                        }
                    }
                    add(
                        Team(
                            teamId = t.optStringOrNull("team_id") ?: "",
                            teamName = t.optStringOrNull("team_name"),
                            players = players,
                        ),
                    )
                }
            }
            TradeRosterResponse(
                contractVersion = root.optStringOrNull("contract_version").orEmpty(),
                status = root.optStringOrNull("status") ?: "unavailable",
                platform = root.optStringOrNull("platform").orEmpty(),
                reason = root.optStringOrNull("reason"),
                week = if (root.has("week") && !root.isNull("week")) root.optInt("week") else null,
                teams = teams,
            )
        }.getOrNull()
    }
}

// MARK: - Trade share (J4: TradeShare)

/**
 * `POST /api/trade/share` → `trade-share.v1`. Free, public, no auth required: a 30-day hash with
 * no provider data and names off by default. iOS mirror: `TradeShareResponse`.
 */
data class TradeShareResponse(
    val contractVersion: String,
    val hash: String,
    val apiPath: String,
    val expiresAt: String,
) {
    companion object {
        fun parse(raw: String): TradeShareResponse? = runCatching {
            val root = JSONObject(raw)
            TradeShareResponse(
                contractVersion = root.optStringOrNull("contract_version").orEmpty(),
                hash = root.optStringOrNull("hash").orEmpty(),
                apiPath = root.optStringOrNull("api_path").orEmpty(),
                expiresAt = root.optStringOrNull("expires_at").orEmpty(),
            )
        }.getOrNull()
    }
}

// MARK: - T5: three-team trade builder (J4: TradeBuild -> TradeBuildThreeTeam, TradePartnerPicker)

/**
 * One player transfer between two named teams — the unit a three-team trade is built from.
 * Mirrors T1's `legs[]` request shape exactly (`omen-t1-three-team-capability`,
 * `src/routes/trade.js`, `validateLeg`). Built locally by the picker/roster-chooser flow, never
 * reassembled from a server response — the client is the one that knows `to`/`toName` for each
 * leg, because it is the one that asked the user who a player should go to. iOS mirror:
 * `TradeThreeTeamLeg`.
 */
data class TradeThreeTeamLeg(
    val from: String,
    val fromName: String?,
    val to: String,
    val toName: String?,
    val players: List<TradePlayer>,
) {
    fun payload(): JSONObject {
        val out = JSONObject()
            .put("from", from)
            .put("to", to)
            .put("players", JSONArray(players.map { it.payload() }))
        fromName?.takeIf { it.isNotEmpty() }?.let { out.put("from_name", it) }
        toName?.takeIf { it.isNotEmpty() }?.let { out.put("to_name", it) }
        return out
    }
}

/**
 * The three-team offer under construction. `legs` is intentionally not `send`/`receive` — T1's
 * contract is legs between named teams, not a two-sided offer. iOS mirror: `TradeThreeTeamOffer`.
 */
data class TradeThreeTeamOffer(
    val legs: List<TradeThreeTeamLeg> = emptyList(),
    val leagueContext: TradeOffer.LeagueContext? = null,
) {
    /** Every team id touched, in the order first seen. T1's own `uniqueTeamIdsFromLegs`. */
    val teamIds: List<String>
        get() {
            val ids = mutableListOf<String>()
            for (leg in legs) {
                if (leg.from !in ids) ids.add(leg.from)
                if (leg.to !in ids) ids.add(leg.to)
            }
            return ids
        }

    val isThreeTeamShape: Boolean get() = teamIds.size == 3

    fun requestBody(): String {
        val root = JSONObject().put("legs", JSONArray(legs.map { it.payload() }))
        leagueContext?.let {
            root.put("league_context", JSONObject().put("platform", it.platform).put("league_id", it.leagueId))
        }
        return root.toString()
    }
}

/**
 * `POST /api/trade/compare` with a `legs` body -> the three-team branch of `trade-compare.v2`.
 * iOS mirror: `TradeThreeTeamCompare`.
 *
 * A distinct type from [TradeCompare] rather than an overload of it: the two response shapes
 * share a vocabulary (`verdict_state`, `evaluability`, `analysis_context`) but the three-team one
 * has no top-level `net_value`/`explanation`/`capabilities` and adds
 * `participants`/`trade_shape`/`team_count`/`submission` the two-team shape does not have. Fields
 * read exactly as documented in `omen-t1-three-team-capability`'s `test/tradeRoute.test.js` —
 * that branch is unmerged as of this writing, so this is built against the documented shape
 * rather than a live route.
 */
data class TradeThreeTeamCompare(
    val contractVersion: String,
    val tradeShape: String,
    val teamCount: Int,
    val participants: List<Participant>,
    val evaluability: TradeCompare.Evaluability,
    /** The first team named across the legs — "your" headline, per T1's own comment. */
    val verdictState: TradeCompare.VerdictState,
    val analysisContext: TradeCompare.AnalysisContext,
    val submission: Submission,
) {
    data class RosterFit(val summary: String?, val depthDiscounted: Boolean?)

    /**
     * One player as the three-team engine returns it (`playerValue()` in `tradeValue.js`).
     * **Carries no `team` field** — the server's `sideValue()` shape returns only `name`/
     * `position`. `omenTradeThreeTeamSides` builds the on-screen leg rows from the
     * locally-authored [TradeThreeTeamLeg] (which does carry `team`, because the client is the
     * one that read it off a roster) rather than from this type — see that function's doc
     * comment.
     */
    data class Player(val name: String, val position: String?, val playerKey: String?)

    data class Side(
        val totalValue: Double?,
        val playerCount: Int,
        val missingProjectionCount: Int,
        val players: List<Player>,
    ) {
        companion object {
            val EMPTY = Side(totalValue = null, playerCount = 0, missingProjectionCount = 0, players = emptyList())
        }
    }

    data class Participant(
        val teamId: String,
        val teamName: String?,
        val sends: Side,
        val receives: Side,
        val netValue: Double?,
        val verdictState: TradeCompare.VerdictState,
        /** "likely" / "unlikely" / "uncertain". T1's `acceptanceLikelihoodFor`. */
        val acceptanceLikelihood: String?,
        val confidence: String?,
        val rosterFit: RosterFit?,
        val evaluability: TradeCompare.Evaluability,
    )

    /**
     * T1's `buildThreeTeamSubmission`: a client-only checklist, never a claim of provider
     * confirmation. `steps` line up 1:1, in order, with the legs the client POSTed, so
     * `TradeViewModel` can pair step *i* with `TradeThreeTeamOffer.legs[i]` to build the
     * per-step "Copy" text.
     */
    data class Submission(val mode: String, val reason: String?, val caption: String, val steps: List<String>)

    /** "Your own" participant — the first team named across the legs. */
    val viewerParticipant: Participant? get() = participants.firstOrNull()

    companion object {
        private fun parseSide(json: JSONObject?): Side {
            if (json == null) return Side.EMPTY
            val playersArr = json.optJSONArray("players")
            val players = buildList {
                for (i in 0 until (playersArr?.length() ?: 0)) {
                    val p = playersArr?.optJSONObject(i) ?: continue
                    add(
                        Player(
                            name = p.optStringOrNull("name") ?: "Unknown",
                            position = p.optStringOrNull("position"),
                            playerKey = p.optStringOrNull("player_key"),
                        ),
                    )
                }
            }
            return Side(
                totalValue = if (json.has("total_value") && !json.isNull("total_value")) json.optDouble("total_value") else null,
                playerCount = json.optInt("player_count", 0),
                missingProjectionCount = json.optInt("missing_projection_count", 0),
                players = players,
            )
        }

        private fun parseEvaluability(json: JSONObject?): TradeCompare.Evaluability = TradeCompare.Evaluability(
            status = json?.optString("status").orEmpty(),
            reason = json?.optStringOrNull("reason").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
            missingProjectionCount = json?.optInt("missing_projection_count") ?: 0,
            totalPlayerCount = json?.optInt("total_player_count") ?: 0,
        )

        private fun parseAnalysisContext(json: JSONObject?): TradeCompare.AnalysisContext {
            val applied = json?.optJSONArray("applied")
            return TradeCompare.AnalysisContext(
                mode = json?.optString("mode").orEmpty(),
                platform = json?.optStringOrNull("platform").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
                leagueId = json?.optStringOrNull("league_id").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
                leagueName = json?.optStringOrNull("league_name").orEmpty()?.takeIf { it.isNotEmpty() && it != "null" },
                applied = buildList {
                    for (i in 0 until (applied?.length() ?: 0)) {
                        applied?.optString(i)?.takeIf { it.isNotEmpty() }?.let { add(it) }
                    }
                },
                unavailableReason = json?.optStringOrNull("unavailable_reason").orEmpty()
                    ?.takeIf { it.isNotEmpty() && it != "null" },
            )
        }

        fun parse(json: String): TradeThreeTeamCompare? = runCatching {
            val root = JSONObject(json)
            val participantsArr = root.optJSONArray("participants")
            val participants = buildList {
                for (i in 0 until (participantsArr?.length() ?: 0)) {
                    val p = participantsArr?.optJSONObject(i) ?: continue
                    val fit = p.optJSONObject("roster_fit")
                    add(
                        Participant(
                            teamId = p.optStringOrNull("team_id") ?: "",
                            teamName = p.optStringOrNull("team_name"),
                            sends = parseSide(p.optJSONObject("sends")),
                            receives = parseSide(p.optJSONObject("receives")),
                            netValue = if (p.has("net_value") && !p.isNull("net_value")) p.optDouble("net_value") else null,
                            verdictState = TradeCompare.VerdictState.from(p.optStringOrNull("verdict_state")),
                            acceptanceLikelihood = p.optStringOrNull("acceptance_likelihood"),
                            confidence = p.optStringOrNull("confidence"),
                            rosterFit = fit?.let { RosterFit(it.optStringOrNull("summary"), if (it.has("depth_discounted")) it.optBoolean("depth_discounted") else null) },
                            evaluability = parseEvaluability(p.optJSONObject("evaluability")),
                        ),
                    )
                }
            }
            val submissionJson = root.optJSONObject("submission")
            val stepsArr = submissionJson?.optJSONArray("steps")
            val submission = Submission(
                mode = submissionJson?.optString("mode") ?: "split_handoff",
                reason = submissionJson?.optStringOrNull("reason"),
                caption = submissionJson?.optString("caption").orEmpty(),
                steps = buildList {
                    for (i in 0 until (stepsArr?.length() ?: 0)) {
                        stepsArr?.optString(i)?.let { add(it) }
                    }
                },
            )

            TradeThreeTeamCompare(
                contractVersion = root.optStringOrNull("contract_version").orEmpty(),
                tradeShape = root.optStringOrNull("trade_shape") ?: "three_team",
                teamCount = if (root.has("team_count")) root.optInt("team_count") else 3,
                participants = participants,
                evaluability = parseEvaluability(root.optJSONObject("evaluability")),
                verdictState = TradeCompare.VerdictState.from(root.optStringOrNull("verdict_state")),
                analysisContext = parseAnalysisContext(root.optJSONObject("analysis_context")),
                submission = submission,
            )
        }.getOrNull()
    }
}
