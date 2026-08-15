import Foundation

/// M5-NativeConnect — the Sleeper connect seam.
///
/// Two shipped routes, both authenticated:
/// - `POST /api/platforms/sleeper/resolve` — username → account + leagues
/// - `POST /api/platforms/sleeper/connect` — bind a chosen league
protocol ConnectRepository {
    func resolveSleeper(username: String, accessToken: String) async -> Result<ResolvedSleeperAccount, ConnectFailure>
    func connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String
    ) async -> Result<Void, ConnectFailure>
}

struct ApiConnectRepository: ConnectRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func resolveSleeper(
        username: String,
        accessToken: String
    ) async -> Result<ResolvedSleeperAccount, ConnectFailure> {
        let result = await client.post(
            "api/platforms/sleeper/resolve",
            accessToken: accessToken,
            body: ["sleeper_username": username],
            as: SleeperResolveResponse.self
        )

        switch result {
        case .success(let response):
            let leagues = response.leagues.map(\.asLeague)
            guard !leagues.isEmpty else { return .failure(.noLeaguesForSeason) }
            return .success(
                ResolvedSleeperAccount(username: response.username ?? username, leagues: leagues)
            )
        case .failure(let error):
            // The route answers 400 for an unknown username specifically. Everything else in
            // the 4xx range is still a server-side rejection from the user's point of view.
            return .failure(Self.map(error, notFoundMeans: .usernameNotFound))
        }
    }

    func connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String
    ) async -> Result<Void, ConnectFailure> {
        let result = await client.post(
            "api/platforms/sleeper/connect",
            accessToken: accessToken,
            body: [
                "sleeper_username": username,
                "league_id": leagueId,
                // Spec §7: idempotent connect. The backend replays a completed request for ten
                // minutes and 409s an in-flight duplicate, so an app resume or double-tap
                // cannot create a second connection.
                "request_id": requestId,
            ],
            as: SleeperConnectResponse.self
        )

        switch result {
        case .success:
            return .success(())
        case .failure(let error):
            if case .server(let status) = error, status == 409 { return .failure(.alreadyInProgress) }
            return .failure(Self.map(error, notFoundMeans: .server))
        }
    }

    private static func map(_ error: OmenApiError, notFoundMeans: ConnectFailure) -> ConnectFailure {
        switch error {
        case .network: return .network
        case .unauthorized: return .server
        case .decode: return .server
        case .server(let status): return (400...499).contains(status) ? notFoundMeans : .server
        }
    }
}

// MARK: - Wire shapes

private struct SleeperResolveResponse: Decodable {
    let username: String?
    let leagues: [League]

    struct League: Decodable {
        let id: String
        let name: String?
        let season: Int?
        let scoringFormat: String?
        let teamName: String?

        enum CodingKeys: String, CodingKey {
            case id, name, season
            case scoringFormat = "scoring_format"
            case teamName = "team_name"
        }

        /// `sleeperLeagueSummary()` returns `name`/`team_name` as nullable — a roster lookup
        /// that drifts still yields the league. An unnamed league falls back to a neutral
        /// label rather than an empty row the user cannot identify.
        var asLeague: SleeperLeague {
            SleeperLeague(
                id: id,
                name: name?.isEmpty == false ? name! : "Untitled league",
                season: season ?? Calendar.current.component(.year, from: Date()),
                scoringFormat: scoringFormat,
                teamName: teamName
            )
        }
    }
}

private struct SleeperConnectResponse: Decodable {
    let connected: Bool
}

/// Test double.
struct StubConnectRepository: ConnectRepository {
    var resolveResult: Result<ResolvedSleeperAccount, ConnectFailure> = .failure(.network)
    var connectResult: Result<Void, ConnectFailure> = .failure(.network)
    /// Records every request id the flow sent, so tests can prove idempotency behavior.
    final class Recorder { var requestIds: [String] = [] }
    var recorder = Recorder()

    func resolveSleeper(
        username: String,
        accessToken: String
    ) async -> Result<ResolvedSleeperAccount, ConnectFailure> {
        resolveResult
    }

    func connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String
    ) async -> Result<Void, ConnectFailure> {
        recorder.requestIds.append(requestId)
        return connectResult
    }
}
