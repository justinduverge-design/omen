package com.slopssaloon.omen.app.feature.api

import org.json.JSONObject
import java.util.UUID

/**
 * M5-Native-API-Client slices B and C — repository seams, mirroring `AccountRepository`.
 *
 * [DashboardRepository] and [LeagueRepository] are separate on purpose: the two have different
 * cost and failure profiles. The dashboard reads our own rows; standings makes a live provider
 * call. Keeping them apart stops a slow or failing provider from holding up the shell.
 */
interface DashboardRepository {
    suspend fun fetchSummary(accessToken: String): OmenApiResult<DashboardSummary>
}

interface LeagueRepository {
    suspend fun fetchStandings(accessToken: String): OmenApiResult<LeagueStandings>

    /**
     * `league-overview.v1`. Supersedes [fetchStandings] for callers that need the matchup and
     * activity sections too. [fetchStandings] stays because the Command Center context strip
     * consumed that narrower contract and it must not be disturbed.
     */
    /**
     * [platform] / [leagueId] name ONE of the user's leagues. Both null means "whichever
     * league is active", which is every pre-existing caller. The league carousel names one
     * per page, because a carousel that could only ever read the active league would show
     * the same matchup on all of them.
     */
    suspend fun fetchOverview(
        accessToken: String,
        platform: String? = null,
        leagueId: String? = null,
    ): OmenApiResult<LeagueOverview>
}

class ApiDashboardRepository(private val client: OmenApiClient) : DashboardRepository {
    override suspend fun fetchSummary(accessToken: String): OmenApiResult<DashboardSummary> =
        client.get("api/dashboard/summary", accessToken, DashboardSummary::parse)
}

class ApiLeagueRepository(private val client: OmenApiClient) : LeagueRepository {
    override suspend fun fetchStandings(accessToken: String): OmenApiResult<LeagueStandings> =
        client.get("api/league/standings", accessToken, LeagueStandings::parse)

    override suspend fun fetchOverview(
        accessToken: String,
        platform: String?,
        leagueId: String?,
    ): OmenApiResult<LeagueOverview> {
        // Both or neither. A league id without its platform makes the server search every
        // connected provider for it, which is a slower way to reach the same answer.
        val path = if (platform != null && leagueId != null) {
            "api/league/overview?platform=$platform&leagueId=${java.net.URLEncoder.encode(leagueId, "UTF-8")}"
        } else {
            "api/league/overview"
        }
        return client.get(path, accessToken, LeagueOverview::parse)
    }
}

/**
 * Test/preview doubles. Not debug-gated, matching `FakeAuthRepository` — the app already ships
 * its auth fake for the unconfigured-Supabase path, and matching that convention keeps the
 * repository families symmetrical.
 */
class StubDashboardRepository(
    private val result: OmenApiResult<DashboardSummary>,
) : DashboardRepository {
    override suspend fun fetchSummary(accessToken: String): OmenApiResult<DashboardSummary> = result
}

class StubLeagueRepository(
    private val result: OmenApiResult<LeagueStandings>,
    private val overviewResult: OmenApiResult<LeagueOverview> =
        OmenApiResult.Failure(OmenApiError.Network),
) : LeagueRepository {
    override suspend fun fetchStandings(accessToken: String): OmenApiResult<LeagueStandings> = result

    /**
     * Per-league answers when a test supplies them, keyed `"platform:leagueId"`; otherwise the
     * single [overviewResult], which is what the active-league callers get.
     */
    var overviewByLeague: Map<String, OmenApiResult<LeagueOverview>> = emptyMap()

    override suspend fun fetchOverview(
        accessToken: String,
        platform: String?,
        leagueId: String?,
    ): OmenApiResult<LeagueOverview> {
        if (platform != null && leagueId != null) {
            overviewByLeague["$platform:$leagueId"]?.let { return it }
        }
        return overviewResult
    }
}

/**
 * Slice G — `POST /api/trade/compare`.
 *
 * Separate from the league repositories because this route is **free and public**: it has a
 * different auth posture from everything else here, and a signed-out caller still gets a real
 * (neutral) answer rather than a 401.
 */
interface TradeRepository {
    suspend fun compare(offer: TradeOffer, accessToken: String?): OmenApiResult<TradeCompare>
    suspend fun capabilities(): OmenApiResult<TradeCapabilities> = OmenApiResult.Failure(OmenApiError.Network)

    /**
     * `GET /api/trade/roster`. Requires a real access token — unlike [compare], this reads the
     * caller's own connected league and cannot degrade to an anonymous answer.
     */
    suspend fun roster(
        platform: String,
        leagueId: String,
        teamId: String?,
        week: Int?,
        accessToken: String,
    ): OmenApiResult<TradeRosterResponse> = OmenApiResult.Failure(OmenApiError.Network)

    /** `POST /api/trade/share`. Free and public, like [compare]. */
    suspend fun share(offer: TradeOffer, accessToken: String?): OmenApiResult<TradeShareResponse> =
        OmenApiResult.Failure(OmenApiError.Network)
}

data class TradeCapabilities(val maxTeams: Int, val submission: String, val threeTeamSupported: Boolean, val threeTeamReason: String?) {
    companion object {
        /**
         * Returns null for a payload this build cannot read as `trade-capabilities.v1`.
         *
         * A version mismatch and a malformed body both land here, and both are treated as
         * "unread" rather than guessed at — the screen then says the format is unknown instead
         * of asserting a limit. What it must never do is read a *different* contract's fields
         * and present them as this one's, which is why the version is checked first.
         */
        fun parse(raw: String): TradeCapabilities? = runCatching {
            val json = JSONObject(raw)
            require(json.getString("contract_version") == "trade-capabilities.v1") {
                "unsupported trade capabilities contract: ${json.optString("contract_version")}"
            }
            val three = json.getJSONObject("three_team")
            TradeCapabilities(
                maxTeams = json.getInt("max_teams"),
                submission = json.getString("submission"),
                threeTeamSupported = three.getBoolean("supported"),
                threeTeamReason = if (three.isNull("reason")) null else three.getString("reason"),
            )
        }.getOrNull()
    }
}

class ApiTradeRepository(private val client: OmenApiClient) : TradeRepository {
    override suspend fun capabilities(): OmenApiResult<TradeCapabilities> =
        client.getOptionalAuth("api/trade/capabilities", null, decode = TradeCapabilities::parse)
    override suspend fun compare(
        offer: TradeOffer,
        accessToken: String?,
    ): OmenApiResult<TradeCompare> = client.postOptionalAuth(
        "api/trade/compare",
        accessToken,
        offer.requestBody(),
        TradeCompare::parse,
    )

    override suspend fun roster(
        platform: String,
        leagueId: String,
        teamId: String?,
        week: Int?,
        accessToken: String,
    ): OmenApiResult<TradeRosterResponse> {
        val query = buildMap {
            put("platform", platform)
            put("league_id", leagueId)
            teamId?.takeIf { it.isNotEmpty() }?.let { put("team_id", it) }
            week?.let { put("week", it.toString()) }
        }
        return client.getOptionalAuth("api/trade/roster", accessToken, query, TradeRosterResponse::parse)
    }

    override suspend fun share(offer: TradeOffer, accessToken: String?): OmenApiResult<TradeShareResponse> =
        client.postOptionalAuth("api/trade/share", accessToken, offer.shareRequestBody(), TradeShareResponse::parse)
}

class StubTradeRepository(
    private val result: OmenApiResult<TradeCompare>,
    private val rosterResult: OmenApiResult<TradeRosterResponse> = OmenApiResult.Failure(OmenApiError.Network),
    private val shareResult: OmenApiResult<TradeShareResponse> = OmenApiResult.Failure(OmenApiError.Network),
) : TradeRepository {
    override suspend fun compare(
        offer: TradeOffer,
        accessToken: String?,
    ): OmenApiResult<TradeCompare> = result

    override suspend fun roster(
        platform: String,
        leagueId: String,
        teamId: String?,
        week: Int?,
        accessToken: String,
    ): OmenApiResult<TradeRosterResponse> = rosterResult

    override suspend fun share(offer: TradeOffer, accessToken: String?): OmenApiResult<TradeShareResponse> =
        shareResult
}

/**
 * Slice D — `POST /api/omen/mvp-move`.
 *
 * Separate again, and for the same reason: this is the expensive call. It runs the live
 * engine against a provider, so the Omen destination owns its own loading state rather than
 * blocking the shell. The server derives league, week, and provider from the authenticated
 * session, so the client sends no league facts it could get wrong. It does explicitly opt into
 * the private narration capability: that request stays server-mediated and has its own short
 * response budget, so it can improve the explanation but cannot delay or choose the move.
 */
interface OmenDecisionRepository {
    suspend fun fetchDecision(accessToken: String): OmenApiResult<OmenDecisionEnvelope>
}

class ApiOmenDecisionRepository(private val client: OmenApiClient) : OmenDecisionRepository {
    override suspend fun fetchDecision(accessToken: String): OmenApiResult<OmenDecisionEnvelope> =
        client.post(
            "api/omen/mvp-move",
            accessToken,
            "{\"contract_version\":\"omen-decision-brief.v3\",\"include_signals\":{\"llm_reasoning\":true}}",
            OmenDecisionEnvelope::parse,
        )
}

class StubOmenDecisionRepository(
    private val result: OmenApiResult<OmenDecisionEnvelope>,
) : OmenDecisionRepository {
    override suspend fun fetchDecision(accessToken: String): OmenApiResult<OmenDecisionEnvelope> = result
}

// --- Shared Decision Capabilities v1 — Start/Sit transport seam ----------------

/** `GET /api/start-sit/detail?contract_version=start-sit-detail.v2`.
 *
 * This is deliberately a transport seam, not a new screen. The later Start/Sit UI must consume
 * server-owned evidence and capabilities rather than inventing a parallel client model.
 */
data class StartSitDetail(
    val contractVersion: String?,
    val state: String,
    val message: String?,
    val platform: String?,
    val leagueId: String?,
    val leagueName: String?,
    val teamName: String?,
    val season: Int?,
    val week: Int?,
    val scoringFormat: String?,
    val recommendation: Recommendation?,
    val why: List<String>,
    val whatCouldChangeThis: List<String>,
    val evidence: List<Evidence>,
    val alternatives: List<Alternative>,
    val capabilities: List<com.slopssaloon.omen.core.designsystem.component.OmenDecisionCapability>,
) {
    data class Recommendation(
        val slot: String?,
        val start: Player?,
        val over: Player?,
        val pointsDelta: Double?,
        val confidence: String?,
    )
    data class Player(
        val playerKey: String?,
        val name: String?,
        val position: String?,
        val team: String?,
        val projectedPoints: Double?,
        val status: String?,
        val kickoff: String?,
    )
    data class Evidence(val category: String?, val kind: String?, val statement: String?)
    data class Alternative(val slot: String?, val start: String?, val over: String?, val pointsDelta: Double?)

    companion object {
        fun parse(json: String): StartSitDetail? = runCatching {
            val root = JSONObject(json)
            val rec = root.optJSONObject("recommendation")
            val evidence = root.optJSONArray("evidence")
            val alternatives = root.optJSONArray("alternatives")
            StartSitDetail(
                contractVersion = root.optStringOrNull("contract_version"),
                state = root.optStringOrNull("state") ?: "incomplete_data",
                message = root.optStringOrNull("message"),
                platform = root.optStringOrNull("platform"),
                leagueId = root.optStringOrNull("league_id"),
                leagueName = root.optStringOrNull("league_name"),
                teamName = root.optStringOrNull("team_name"),
                season = root.optIntOrNull("season"),
                week = root.optIntOrNull("week"),
                scoringFormat = root.optStringOrNull("scoring_format"),
                recommendation = rec?.let {
                    Recommendation(
                        slot = it.optStringOrNull("slot"),
                        start = it.optJSONObject("start")?.toStartSitPlayer(),
                        over = it.optJSONObject("over")?.toStartSitPlayer(),
                        pointsDelta = if (it.has("points_delta") && !it.isNull("points_delta")) it.optDouble("points_delta") else null,
                        confidence = it.optStringOrNull("confidence"),
                    )
                },
                why = root.optJSONArray("why").strings(),
                whatCouldChangeThis = root.optJSONArray("what_could_change_this").strings(),
                evidence = buildList {
                    for (index in 0 until (evidence?.length() ?: 0)) {
                        evidence?.optJSONObject(index)?.let {
                            add(Evidence(it.optStringOrNull("category"), it.optStringOrNull("kind"), it.optStringOrNull("statement")))
                        }
                    }
                },
                alternatives = buildList {
                    for (index in 0 until (alternatives?.length() ?: 0)) {
                        alternatives?.optJSONObject(index)?.let {
                            add(
                                Alternative(
                                    slot = it.optStringOrNull("slot"),
                                    start = it.optStringOrNull("start"),
                                    over = it.optStringOrNull("over"),
                                    pointsDelta = if (it.has("points_delta") && !it.isNull("points_delta")) it.optDouble("points_delta") else null,
                                ),
                            )
                        }
                    }
                },
                capabilities = root.decisionCapabilities(),
            )
        }.getOrNull()

        private fun JSONObject.toStartSitPlayer(): Player = Player(
            playerKey = optStringOrNull("player_key"),
            name = optStringOrNull("name"),
            position = optStringOrNull("position"),
            team = optStringOrNull("team"),
            projectedPoints = if (has("projected_points") && !isNull("projected_points")) optDouble("projected_points") else null,
            status = optStringOrNull("status"),
            kickoff = optStringOrNull("kickoff"),
        )

        private fun org.json.JSONArray?.strings(): List<String> = buildList {
            for (index in 0 until (this@strings?.length() ?: 0)) {
                this@strings?.optString(index)?.takeIf { it.isNotBlank() }?.let(::add)
            }
        }
    }
}

interface StartSitDetailRepository {
    suspend fun fetchDetail(accessToken: String, slot: String? = null): OmenApiResult<StartSitDetail>
}

class ApiStartSitDetailRepository(private val client: OmenApiClient) : StartSitDetailRepository {
    override suspend fun fetchDetail(accessToken: String, slot: String?): OmenApiResult<StartSitDetail> =
        client.getOptionalAuth(
            path = "api/start-sit/detail",
            accessToken = accessToken,
            query = buildMap {
                put("contract_version", "start-sit-detail.v2")
                slot?.takeIf { it.isNotEmpty() }?.let { put("slot", it) }
            },
            decode = StartSitDetail::parse,
        )
}

class StubStartSitDetailRepository(
    private val result: OmenApiResult<StartSitDetail>,
) : StartSitDetailRepository {
    override suspend fun fetchDetail(accessToken: String, slot: String?): OmenApiResult<StartSitDetail> = result
}

/**
 * Slice E — `GET /api/moves`.
 *
 * Its cost profile is closer to the dashboard's than to standings': it reads our own `moves`
 * rows and makes no provider call. It is still independently failable, and the Command Center
 * must not lose its shell because the Ledger request did.
 *
 * No query string. `season` defaults to the current NFL season server-side and `limit` defaults
 * to 20 — the preview shows three. Sending our own season would mean the client deciding what
 * "this season" is, which `getCurrentNflWeekContext()` already owns.
 */
interface MovesRepository {
    suspend fun fetchMoves(accessToken: String, platform: String, leagueId: String): OmenApiResult<MovesHistory>
    suspend fun fetchReceipt(accessToken: String, id: String): OmenApiResult<MoveReceipt> = OmenApiResult.Failure(OmenApiError.Network)
}

class ApiMovesRepository(private val client: OmenApiClient) : MovesRepository {
    override suspend fun fetchReceipt(accessToken: String, id: String): OmenApiResult<MoveReceipt> {
        if (runCatching { UUID.fromString(id) }.isFailure) return OmenApiResult.Failure(OmenApiError.Decode)
        return client.get("api/moves/$id", accessToken, MoveReceipt::parse)
    }
    override suspend fun fetchMoves(accessToken: String, platform: String, leagueId: String): OmenApiResult<MovesHistory> =
        client.getOptionalAuth(
            path = "api/moves", accessToken = accessToken,
            query = mapOf("contract_version" to "moves-history.v2", "platform" to platform, "league_id" to leagueId),
            decode = MovesHistory::parse,
        )
}

class StubMovesRepository(
    private val result: OmenApiResult<MovesHistory>,
) : MovesRepository {
    override suspend fun fetchMoves(accessToken: String, platform: String, leagueId: String): OmenApiResult<MovesHistory> = result
}

// --- Waiver Watch -------------------------------------------------------------

interface WaiverAnalysisRepository {
    suspend fun fetchWaiverAnalysis(accessToken: String): OmenApiResult<WaiverAnalysis>
}

class ApiWaiverAnalysisRepository(private val client: OmenApiClient) : WaiverAnalysisRepository {
    override suspend fun fetchWaiverAnalysis(accessToken: String): OmenApiResult<WaiverAnalysis> =
        client.get("api/waivers/analysis", accessToken, WaiverAnalysis::parse)
}

class StubWaiverAnalysisRepository(
    private val result: OmenApiResult<WaiverAnalysis> = OmenApiResult.Failure(OmenApiError.Network),
) : WaiverAnalysisRepository {
    override suspend fun fetchWaiverAnalysis(accessToken: String): OmenApiResult<WaiverAnalysis> = result
}

// --- Team/league switcher (visual briefs §10.2) -------------------------------
//
// Kept separate from DashboardRepository and LeagueRepository for the reason already
// recorded on those two: they have different cost and failure profiles. The directory
// makes live provider calls to enumerate leagues, so a slow provider must not be able to
// hold up the shell.

interface LeagueDirectoryRepository {
    suspend fun fetchDirectory(accessToken: String): OmenApiResult<LeagueDirectory>
    suspend fun selectLeague(
        accessToken: String,
        platform: String,
        leagueId: String,
        teamId: String?,
    ): OmenApiResult<LeagueSelectionResult>
}

class ApiLeagueDirectoryRepository(private val client: OmenApiClient) : LeagueDirectoryRepository {
    override suspend fun fetchDirectory(accessToken: String): OmenApiResult<LeagueDirectory> =
        client.get("api/leagues", accessToken, LeagueDirectory::parse)

    override suspend fun selectLeague(
        accessToken: String,
        platform: String,
        leagueId: String,
        teamId: String?,
    ): OmenApiResult<LeagueSelectionResult> {
        val body = JSONObject().apply {
            put("platform", platform)
            put("league_id", leagueId)
            // Sent only when known. An explicit null would be indistinguishable from
            // "clear the team", and the server treats an absent key as "leave it alone".
            if (!teamId.isNullOrEmpty()) put("team_id", teamId)
        }
        return client.post("api/leagues/active", accessToken, body.toString(), LeagueSelectionResult::parse)
    }
}

class StubLeagueDirectoryRepository(
    private val directory: OmenApiResult<LeagueDirectory>,
    private val selection: OmenApiResult<LeagueSelectionResult> = OmenApiResult.Failure(OmenApiError.Network),
) : LeagueDirectoryRepository {
    /** Records what the sheet actually asked for, so a test can assert the request, not just the UI. */
    val calls = mutableListOf<Triple<String, String, String?>>()

    override suspend fun fetchDirectory(accessToken: String): OmenApiResult<LeagueDirectory> = directory

    override suspend fun selectLeague(
        accessToken: String,
        platform: String,
        leagueId: String,
        teamId: String?,
    ): OmenApiResult<LeagueSelectionResult> {
        calls += Triple(platform, leagueId, teamId)
        return selection
    }
}
