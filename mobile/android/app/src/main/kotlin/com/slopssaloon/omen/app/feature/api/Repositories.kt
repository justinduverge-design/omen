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
