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
}

/// Test/preview double, matching the `Stub*Repository` convention already in this folder.
struct StubLeagueDirectoryRepository: LeagueDirectoryRepository {
    let directory: Result<LeagueDirectory, OmenApiError>
    var selection: Result<LeagueSelectionResult, OmenApiError> = .failure(.network)

    /// Records what the sheet actually asked for, so a test can assert the selection was
    /// sent rather than only that the UI changed.
    final class Recorder: @unchecked Sendable {
        private(set) var calls: [(platform: String, leagueID: String, teamID: String?)] = []
        func record(_ platform: String, _ leagueID: String, _ teamID: String?) {
            calls.append((platform, leagueID, teamID))
        }
    }

    var recorder: Recorder?

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
}
