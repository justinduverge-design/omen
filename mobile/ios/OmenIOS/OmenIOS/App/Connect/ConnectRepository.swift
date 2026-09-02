import Foundation

/// M5-NativeConnect — the native connect seam.
///
/// Sleeper (username → leagues → bind), all authenticated:
/// - `POST /api/platforms/sleeper/resolve`
/// - `POST /api/platforms/sleeper/connect`
///
/// Yahoo (browser OAuth → leagues → bind). Every route already shipped; the client half is
/// what was missing:
/// - `POST /api/yahoo/auth` with `native_return: true` → `{ url }`, and the server's callback
///   redirects to `com.slopssaloon.omen://auth/callback?status=connected|cancelled`
/// - `GET  /api/yahoo/leagues`
/// - `POST /api/yahoo/league`
protocol ConnectRepository {
    func resolveSleeper(username: String, accessToken: String) async -> Result<ResolvedSleeperAccount, ConnectFailure>
    func connectSleeper(
        username: String,
        leagueId: String,
        requestId: String,
        accessToken: String
    ) async -> Result<Void, ConnectFailure>

    /// Starts a Yahoo authorization and returns the URL to open in the system browser.
    ///
    /// The CSRF `state` is minted and stored server-side against the user's row in
    /// `oauth_state` and consumed on callback, so the client neither generates nor validates
    /// it. Asking for `native_return` is what makes the callback come back to the app scheme
    /// instead of the website.
    func startYahooAuthorization(accessToken: String) async -> Result<URL, ConnectFailure>

    /// The leagues Yahoo will let Omen read for this user. Also the connection proof: it can
    /// only answer once tokens are actually stored, which is why the app confirms with this
    /// rather than trusting the `status=connected` it was handed on a deep link.
    func yahooLeagues(accessToken: String) async -> Result<[YahooLeague], ConnectFailure>

    /// Binds the chosen league to the Yahoo connection.
    func bindYahooLeague(id: String, accessToken: String) async -> Result<Void, ConnectFailure>
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

    // MARK: - Yahoo

    func startYahooAuthorization(accessToken: String) async -> Result<URL, ConnectFailure> {
        let result = await client.post(
            "api/yahoo/auth",
            accessToken: accessToken,
            body: ["native_return": true],
            as: YahooAuthStartResponse.self
        )

        switch result {
        case .success(let response):
            guard let url = URL(string: response.url), url.scheme?.hasPrefix("http") == true else {
                // Never hand an arbitrary string to the browser. If the server did not answer
                // with an http(s) URL, something is wrong on our side, not the user's.
                return .failure(.server)
            }
            return .success(url)
        case .failure(let error):
            // 503 is `requireYahooEnabled` — the Fantasy Sports API entitlement is off. That is
            // a product state with its own sentence, not "a problem on our side".
            if case .server(let status) = error, status == 503 { return .failure(.providerUnavailable) }
            return .failure(Self.map(error, notFoundMeans: .server))
        }
    }

    func yahooLeagues(accessToken: String) async -> Result<[YahooLeague], ConnectFailure> {
        let result = await client.get(
            "api/yahoo/leagues",
            accessToken: accessToken,
            as: YahooLeaguesResponse.self
        )

        switch result {
        case .success(let response):
            let leagues = response.leagues.map(\.asLeague)
            guard !leagues.isEmpty else { return .failure(.noLeaguesForSeason) }
            return .success(leagues)
        case .failure(let error):
            // The route answers 401 for `yahoo_token_expired` — from the user's point of view
            // that is "Yahoo didn't finish connecting", not "your Omen session died". Routing
            // it to re-auth would sign out a perfectly good Omen session over a Yahoo problem.
            if case .unauthorized = error { return .failure(.providerNotConnected) }
            return .failure(Self.map(error, notFoundMeans: .providerNotConnected))
        }
    }

    func bindYahooLeague(id: String, accessToken: String) async -> Result<Void, ConnectFailure> {
        let result = await client.post(
            "api/yahoo/league",
            accessToken: accessToken,
            body: ["leagueId": id],
            as: YahooLeagueBindResponse.self
        )

        switch result {
        case .success:
            return .success(())
        case .failure(let error):
            if case .unauthorized = error { return .failure(.providerNotConnected) }
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

private struct YahooAuthStartResponse: Decodable {
    let url: String
}

private struct YahooLeaguesResponse: Decodable {
    let leagues: [League]

    struct League: Decodable {
        let leagueId: String
        let name: String?
        let season: Int?

        enum CodingKeys: String, CodingKey {
            case leagueId = "league_id"
            case name, season
        }

        /// `getUserLeagues()` returns `name` and `season` as nullable — a Yahoo payload shape
        /// that drifts still yields the league key, which is the only field the bind needs.
        /// An unnamed league gets a neutral label rather than an empty row.
        var asLeague: YahooLeague {
            YahooLeague(
                id: leagueId,
                name: name?.isEmpty == false ? name! : "Untitled league",
                season: season
            )
        }
    }
}

private struct YahooLeagueBindResponse: Decodable {
    let leagueId: String

    enum CodingKeys: String, CodingKey {
        case leagueId = "league_id"
    }
}

/// Test double.
struct StubConnectRepository: ConnectRepository {
    var resolveResult: Result<ResolvedSleeperAccount, ConnectFailure> = .failure(.network)
    var connectResult: Result<Void, ConnectFailure> = .failure(.network)
    var yahooAuthResult: Result<URL, ConnectFailure> = .failure(.network)
    var yahooLeaguesResult: Result<[YahooLeague], ConnectFailure> = .failure(.network)
    var yahooBindResult: Result<Void, ConnectFailure> = .failure(.network)
    /// Records every request id the flow sent, so tests can prove idempotency behavior.
    final class Recorder {
        var requestIds: [String] = []
        var boundYahooLeagueIds: [String] = []
    }
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

    func startYahooAuthorization(accessToken: String) async -> Result<URL, ConnectFailure> {
        yahooAuthResult
    }

    func yahooLeagues(accessToken: String) async -> Result<[YahooLeague], ConnectFailure> {
        yahooLeaguesResult
    }

    func bindYahooLeague(id: String, accessToken: String) async -> Result<Void, ConnectFailure> {
        recorder.boundYahooLeagueIds.append(id)
        return yahooBindResult
    }
}
