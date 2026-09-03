import Foundation

/// The switcher's data seam, kept separate from `DashboardRepository` and
/// `LeagueRepository` for the reason already recorded on those two: they have different
/// cost and failure profiles. The directory makes live provider calls to enumerate
/// leagues, so a slow provider must not be able to hold up the shell.
protocol LeagueDirectoryRepository {
    func fetchDirectory(accessToken: String) async -> Result<LeagueDirectory, OmenApiError>
    func selectLeague(
        accessToken: String,
        platform: String,
        leagueID: String,
        teamID: String?
    ) async -> Result<LeagueSelectionResult, OmenApiError>

    /// Disconnects a platform entirely — `DELETE /api/platforms/:platform`.
    ///
    /// The ESPN consent screen tells the user they can disconnect any time in Account. Until
    /// this existed that sentence was false: the route has shipped for months, and no client
    /// ever called it.
    func disconnect(accessToken: String, platform: String) async -> Result<Void, OmenApiError>
}

struct ApiLeagueDirectoryRepository: LeagueDirectoryRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func fetchDirectory(accessToken: String) async -> Result<LeagueDirectory, OmenApiError> {
        await client.get("api/leagues", accessToken: accessToken, as: LeagueDirectory.self)
    }

    func selectLeague(
        accessToken: String,
        platform: String,
        leagueID: String,
        teamID: String?
    ) async -> Result<LeagueSelectionResult, OmenApiError> {
        var body: [String: Any] = ["platform": platform, "league_id": leagueID]
        // Sent only when known. An explicit `null` would be indistinguishable from
        // "clear the team", and the server treats an absent key as "leave it alone".
        if let teamID, !teamID.isEmpty { body["team_id"] = teamID }
        return await client.post(
            "api/leagues/active",
            accessToken: accessToken,
            body: body,
            as: LeagueSelectionResult.self
        )
    }

    func disconnect(accessToken: String, platform: String) async -> Result<Void, OmenApiError> {
        let result = await client.delete(
            "api/platforms/\(platform)",
            accessToken: accessToken,
            as: PlatformDisconnectResult.self
        )
        return result.map { _ in () }
    }
}

/// `DELETE /api/platforms/:platform` → `{ disconnected, platform }`.
private struct PlatformDisconnectResult: Decodable {
    let disconnected: Bool?
    let platform: String?
}

/// Test/preview double, matching the `Stub*Repository` convention already in this folder.
struct StubLeagueDirectoryRepository: LeagueDirectoryRepository {
    let directory: Result<LeagueDirectory, OmenApiError>
    var selection: Result<LeagueSelectionResult, OmenApiError> = .failure(.network)

    /// Records what the sheet actually asked for, so a test can assert the selection was
    /// sent rather than only that the UI changed.
    final class Recorder: @unchecked Sendable {
        private(set) var calls: [(platform: String, leagueID: String, teamID: String?)] = []
        private(set) var disconnected: [String] = []
        func record(_ platform: String, _ leagueID: String, _ teamID: String?) {
            calls.append((platform, leagueID, teamID))
        }
        func recordDisconnect(_ platform: String) { disconnected.append(platform) }
    }

    var recorder: Recorder?
    var disconnectResult: Result<Void, OmenApiError> = .success(())

    func fetchDirectory(accessToken: String) async -> Result<LeagueDirectory, OmenApiError> {
        directory
    }

    func selectLeague(
        accessToken: String,
        platform: String,
        leagueID: String,
        teamID: String?
    ) async -> Result<LeagueSelectionResult, OmenApiError> {
        recorder?.record(platform, leagueID, teamID)
        return selection
    }

    func disconnect(accessToken: String, platform: String) async -> Result<Void, OmenApiError> {
        recorder?.recordDisconnect(platform)
        return disconnectResult
    }
}
