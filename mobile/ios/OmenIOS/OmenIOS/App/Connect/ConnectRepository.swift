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

    /// Reads back whether the ESPN connection made on a computer has reached this account.
    ///
    /// The app never *makes* an ESPN connection — the desktop helper fills Omen's web form and
    /// the user presses Connect there. This is the read side only: `GET /api/leagues` is the
    /// provider-neutral directory the server already publishes, and it is the single honest
    /// answer to "did it work?". Returning `nil` means "not yet", which is a normal status and
    /// not a failure.
    func espnConnection(accessToken: String) async -> Result<EspnConnection?, ConnectFailure>

    /// W1-A — the one request that carries the ESPN session, and the only one that ever will.
    ///
    /// `POST /api/platforms/espn/connect` already shipped and is unchanged: it validates through
    /// `verifyLeagueAccess()` and stores Vault secret references. The route sets
    /// `res.locals.__skipBodyLog`, so the body is excluded from request logging server-side.
    func connectEspn(_ capture: EspnCapture, accessToken: String) async -> Result<Void, ConnectFailure>

    /// Asks ESPN which leagues the signed-in account plays in, via
    /// `POST /api/platforms/espn/leagues`. Stores nothing — the connect call is what persists.
    func discoverEspnLeagues(
        espnS2: String,
        swid: String,
        accessToken: String
    ) async -> Result<[EspnLeagueOption], ConnectFailure>
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

    // MARK: - ESPN read-back

    func espnConnection(accessToken: String) async -> Result<EspnConnection?, ConnectFailure> {
        let result = await client.get(
            "api/leagues",
            accessToken: accessToken,
            as: LeagueDirectoryResponse.self
        )

        switch result {
        case .success(let response):
            return .success(response.espnConnection)
        case .failure(let error):
            // Unlike `yahooLeagues`, this route has no provider-token failure mode of its own,
            // so nothing here is special-cased: a 401 is the Omen session and everything else
            // is our side. There is deliberately no ESPN-shaped error, because the app is not
            // performing an ESPN operation — it is reading a directory.
            return .failure(Self.map(error, notFoundMeans: .server))
        }
    }

    func connectEspn(_ capture: EspnCapture, accessToken: String) async -> Result<Void, ConnectFailure> {
        // Snake_case, because that is what the route reads — `espn_s2`, `swid`, `league_id`,
        // `espn_team_id`. The Wave 1 contract wrote these as camelCase and was wrong; a camelCase
        // body 422s with `espn_cookies_required`, which reads as "your session is bad" and is not.
        var body: [String: Any] = [
            "espn_s2": capture.espnS2,
            "swid": capture.swid,
            "league_id": capture.leagueId,
        ]
        if let teamId = capture.teamId, !teamId.isEmpty {
            body["espn_team_id"] = teamId
        }

        let result = await client.post(
            "api/platforms/espn/connect",
            accessToken: accessToken,
            body: body,
            as: EspnConnectResponse.self
        )

        switch result {
        case .success:
            return .success(())
        case .failure(let error):
            // 422 is the route's own "we didn't get a session" — the values never arrived or were
            // empty. 400 is `espnValidationError`: the session was fine and ESPN would not serve
            // that league. Those are different sentences to the user and different next actions,
            // so they are not collapsed. The bodies are deliberately not decoded: the route's
            // error payload can quote back the field it rejected.
            if case .server(let status) = error {
                if status == 422 { return .failure(.espnSessionUnreadable) }
                if status == 400 { return .failure(.espnLeagueUnreachable) }
            }
            return .failure(Self.map(error, notFoundMeans: .espnLeagueUnreachable))
        }
    }

    func discoverEspnLeagues(
        espnS2: String,
        swid: String,
        accessToken: String
    ) async -> Result<[EspnLeagueOption], ConnectFailure> {
        let result = await client.post(
            "api/platforms/espn/leagues",
            accessToken: accessToken,
            body: ["espn_s2": espnS2, "swid": swid],
            as: EspnLeaguesResponse.self
        )

        switch result {
        case .success(let response):
            return .success(response.leagues.map(\.asOption))
        case .failure(let error):
            // 401 here is ESPN rejecting the session, not the Omen session — the route
            // distinguishes them, and conflating the two would sign the user out of Omen over
            // an expired ESPN cookie.
            if case .unauthorized = error { return .failure(.espnSessionUnreadable) }
            if case .server(let status) = error, status == 422 { return .failure(.espnSessionUnreadable) }
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

/// The connect route answers `{ status, platform, league_id, ... }`. Only the success of the call
/// matters here — the directory read that follows is what tells the app what got connected — so
/// this decodes the single field needed to confirm the shape and nothing else.
/// `POST /api/platforms/espn/leagues` — labels only, never a credential.
private struct EspnLeaguesResponse: Decodable {
    let leagues: [League]

    struct League: Decodable {
        let leagueId: String
        let leagueName: String?
        let season: Int?
        let teamId: String?
        let teamName: String?

        enum CodingKeys: String, CodingKey {
            case leagueId = "league_id"
            case leagueName = "league_name"
            case season
            case teamId = "team_id"
            case teamName = "team_name"
        }

        var asOption: EspnLeagueOption {
            EspnLeagueOption(
                id: leagueId,
                name: leagueName,
                season: season,
                teamId: teamId,
                teamName: teamName
            )
        }
    }
}

private struct EspnConnectResponse: Decodable {
    let status: String?
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

/// `GET /api/leagues` — `league-directory.v1`.
///
/// Decodes only the fields the ESPN read-back needs. The contract also carries
/// `espn_secret_id`-adjacent connection bookkeeping server-side; none of it is in the
/// response and none of it is decoded here.
private struct LeagueDirectoryResponse: Decodable {
    let platforms: [PlatformGroup]

    struct PlatformGroup: Decodable {
        let platform: String
        let connectionState: String
        let leagues: [League]

        enum CodingKeys: String, CodingKey {
            case platform
            case connectionState = "connection_state"
            case leagues
        }
    }

    struct League: Decodable {
        let leagueName: String?
        let teamId: String?
        let teamName: String?

        enum CodingKeys: String, CodingKey {
            case leagueName = "league_name"
            case teamId = "team_id"
            case teamName = "team_name"
        }
    }

    /// ESPN counts as connected only when the group says `connected` **and** a league carries
    /// usable team context.
    ///
    /// The second half matters: `espnLeagues()` reports `discovery: "bound_only"` and can
    /// return a league row whose team lookup failed, and routing someone to Command Center on
    /// that produces a dashboard with no team in it. `omenReadiness` draws the same line
    /// (`ready` vs `pending_live_engine`), so this is the existing rule, not a new one.
    var espnConnection: EspnConnection? {
        guard let group = platforms.first(where: { $0.platform == "espn" }),
              group.connectionState == "connected" else { return nil }

        let usable = group.leagues.first { league in
            league.teamId?.isEmpty == false || league.teamName?.isEmpty == false
        }
        guard let usable else { return nil }

        return EspnConnection(leagueName: usable.leagueName, teamName: usable.teamName)
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
    var espnConnectionResult: Result<EspnConnection?, ConnectFailure> = .success(nil)
    var espnConnectResult: Result<Void, ConnectFailure> = .failure(.network)
    var espnDiscoverResult: Result<[EspnLeagueOption], ConnectFailure> = .success([])
    /// Records every request id the flow sent, so tests can prove idempotency behavior.
    final class Recorder {
        var requestIds: [String] = []
        var boundYahooLeagueIds: [String] = []
        var espnConnectionChecks = 0
        var espnDiscoveries = 0
        var espnConnectAttempts: [(leagueId: String, teamId: String?, sentSession: Bool)] = []
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

    func espnConnection(accessToken: String) async -> Result<EspnConnection?, ConnectFailure> {
        recorder.espnConnectionChecks += 1
        return espnConnectionResult
    }

    func discoverEspnLeagues(
        espnS2: String,
        swid: String,
        accessToken: String
    ) async -> Result<[EspnLeagueOption], ConnectFailure> {
        recorder.espnDiscoveries += 1
        return espnDiscoverResult
    }

    func connectEspn(_ capture: EspnCapture, accessToken: String) async -> Result<Void, ConnectFailure> {
        // Records the non-secret shape only. A test double that stored the session values would
        // put them in a test fixture, which is the same leak with a friendlier name.
        recorder.espnConnectAttempts.append(
            (leagueId: capture.leagueId, teamId: capture.teamId, sentSession: !capture.espnS2.isEmpty && !capture.swid.isEmpty)
        )
        return espnConnectResult
    }
}
