package com.slopssaloon.omen.app.feature.api

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
