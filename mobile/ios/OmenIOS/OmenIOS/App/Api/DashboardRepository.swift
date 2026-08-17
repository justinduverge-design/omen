import Foundation

/// M5-Native-API-Client slice B — the repository seam, mirroring `AccountRepository`.
///
/// The protocol exists so tests and previews can supply a summary without a network,
/// exactly as `FakeAuthRepository` does for auth.
protocol DashboardRepository {
    func fetchSummary(accessToken: String) async -> Result<DashboardSummary, OmenApiError>
}

/// Production implementation. Holds no state beyond the client.
struct ApiDashboardRepository: DashboardRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchSummary(accessToken: String) async -> Result<DashboardSummary, OmenApiError> {
        await client.get("api/dashboard/summary", accessToken: accessToken, as: DashboardSummary.self)
    }
}

/// Test/preview double. Not `#if DEBUG`-gated because `FakeAuthRepository` isn't either —
/// the app already ships its auth fake for the unconfigured-Supabase path, and matching
/// that convention keeps the two repository families symmetrical.
struct StubDashboardRepository: DashboardRepository {
    let result: Result<DashboardSummary, OmenApiError>

    func fetchSummary(accessToken: String) async -> Result<DashboardSummary, OmenApiError> {
        result
    }
}

// MARK: - Slice C — league standings

/// Separate from `DashboardRepository` on purpose: the two have different cost and failure
/// profiles. The dashboard reads our own rows; standings makes a live provider call. Keeping
/// them apart stops a slow or failing provider from being able to hold up the shell.
protocol LeagueRepository {
    func fetchStandings(accessToken: String) async -> Result<LeagueStandings, OmenApiError>
}

struct ApiLeagueRepository: LeagueRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchStandings(accessToken: String) async -> Result<LeagueStandings, OmenApiError> {
        await client.get("api/league/standings", accessToken: accessToken, as: LeagueStandings.self)
    }
}

struct StubLeagueRepository: LeagueRepository {
    let result: Result<LeagueStandings, OmenApiError>

    func fetchStandings(accessToken: String) async -> Result<LeagueStandings, OmenApiError> {
        result
    }
}

// MARK: - Slice D — Omen decision

/// `POST /api/omen/mvp-move`. Kept separate from the dashboard for the same reason
/// standings is: this is the expensive call. It runs the live engine against a provider,
/// so it is slower and independently failable, and the Omen destination owns its own
/// loading state rather than blocking anything else.
///
/// Per the route contract the live UI sends `{}` — the server derives league, week, and
/// provider from the authenticated session. The client passes no context it could get wrong.
protocol OmenDecisionRepository {
    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError>
}

struct ApiOmenDecisionRepository: OmenDecisionRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError> {
        await client.post("api/omen/mvp-move", accessToken: accessToken, body: [:], as: OmenDecisionEnvelope.self)
    }
}

struct StubOmenDecisionRepository: OmenDecisionRepository {
    let result: Result<OmenDecisionEnvelope, OmenApiError>

    func fetchDecision(accessToken: String) async -> Result<OmenDecisionEnvelope, OmenApiError> {
        result
    }
}

// MARK: - Slice E — Ledger

/// `GET /api/moves`. Kept separate from the dashboard for consistency with the slices above,
/// though its cost profile is closer to the dashboard's than to standings': it reads our own
/// `moves` rows and makes no provider call. It is still independently failable, and the
/// Command Center must not lose its shell because the Ledger request did.
protocol MovesRepository {
    func fetchMoves(accessToken: String) async -> Result<MovesHistory, OmenApiError>
}

struct ApiMovesRepository: MovesRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    /// No query string. `season` defaults to the current NFL season server-side and `limit`
    /// defaults to 20 — the preview shows three. Sending our own season would mean the client
    /// deciding what "this season" is, which `getCurrentNflWeekContext()` already owns.
    func fetchMoves(accessToken: String) async -> Result<MovesHistory, OmenApiError> {
        await client.get("api/moves", accessToken: accessToken, as: MovesHistory.self)
    }
}

struct StubMovesRepository: MovesRepository {
    let result: Result<MovesHistory, OmenApiError>

    func fetchMoves(accessToken: String) async -> Result<MovesHistory, OmenApiError> {
        result
    }
}
