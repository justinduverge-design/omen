package com.slopssaloon.omen.app.feature.api

import org.json.JSONObject

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
    suspend fun fetchOverview(accessToken: String): OmenApiResult<LeagueOverview>
}

class ApiDashboardRepository(private val client: OmenApiClient) : DashboardRepository {
    override suspend fun fetchSummary(accessToken: String): OmenApiResult<DashboardSummary> =
        client.get("api/dashboard/summary", accessToken, DashboardSummary::parse)
}

class ApiLeagueRepository(private val client: OmenApiClient) : LeagueRepository {
    override suspend fun fetchStandings(accessToken: String): OmenApiResult<LeagueStandings> =
        client.get("api/league/standings", accessToken, LeagueStandings::parse)

    override suspend fun fetchOverview(accessToken: String): OmenApiResult<LeagueOverview> =
        client.get("api/league/overview", accessToken, LeagueOverview::parse)
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

    override suspend fun fetchOverview(accessToken: String): OmenApiResult<LeagueOverview> =
        overviewResult
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
}

class ApiTradeRepository(private val client: OmenApiClient) : TradeRepository {
    override suspend fun compare(
        offer: TradeOffer,
        accessToken: String?,
    ): OmenApiResult<TradeCompare> = client.postOptionalAuth(
        "api/trade/compare",
        accessToken,
        offer.requestBody(),
        TradeCompare::parse,
    )
}

class StubTradeRepository(
    private val result: OmenApiResult<TradeCompare>,
) : TradeRepository {
    override suspend fun compare(
        offer: TradeOffer,
        accessToken: String?,
    ): OmenApiResult<TradeCompare> = result
}

/**
 * Slice D — `POST /api/omen/mvp-move`.
 *
 * Separate again, and for the same reason: this is the expensive call. It runs the live
 * engine against a provider, so the Omen destination owns its own loading state rather than
 * blocking the shell. Per the route contract the client sends `{}` — the server derives
 * league, week, and provider from the authenticated session, so there is no context the
 * client could get wrong.
 */
interface OmenDecisionRepository {
    suspend fun fetchDecision(accessToken: String): OmenApiResult<OmenDecisionEnvelope>
}

class ApiOmenDecisionRepository(private val client: OmenApiClient) : OmenDecisionRepository {
    override suspend fun fetchDecision(accessToken: String): OmenApiResult<OmenDecisionEnvelope> =
        client.post("api/omen/mvp-move", accessToken, "{}", OmenDecisionEnvelope::parse)
}

class StubOmenDecisionRepository(
    private val result: OmenApiResult<OmenDecisionEnvelope>,
) : OmenDecisionRepository {
    override suspend fun fetchDecision(accessToken: String): OmenApiResult<OmenDecisionEnvelope> = result
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
    suspend fun fetchMoves(accessToken: String): OmenApiResult<MovesHistory>
}

class ApiMovesRepository(private val client: OmenApiClient) : MovesRepository {
    override suspend fun fetchMoves(accessToken: String): OmenApiResult<MovesHistory> =
        client.get("api/moves", accessToken, MovesHistory::parse)
}

class StubMovesRepository(
    private val result: OmenApiResult<MovesHistory>,
) : MovesRepository {
    override suspend fun fetchMoves(accessToken: String): OmenApiResult<MovesHistory> = result
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
