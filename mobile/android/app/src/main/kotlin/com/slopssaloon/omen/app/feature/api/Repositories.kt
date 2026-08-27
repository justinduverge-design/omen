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
}

class ApiDashboardRepository(private val client: OmenApiClient) : DashboardRepository {
    override suspend fun fetchSummary(accessToken: String): OmenApiResult<DashboardSummary> =
        client.get("api/dashboard/summary", accessToken, DashboardSummary::parse)
}

class ApiLeagueRepository(private val client: OmenApiClient) : LeagueRepository {
    override suspend fun fetchStandings(accessToken: String): OmenApiResult<LeagueStandings> =
        client.get("api/league/standings", accessToken, LeagueStandings::parse)
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
) : LeagueRepository {
    override suspend fun fetchStandings(accessToken: String): OmenApiResult<LeagueStandings> = result
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
