import Foundation

/// `GET /api/players/search` → `players-search.v1`.
///
/// The Trade destination shipped on 2026-08-30 with a bare text field: the user typed a name
/// freehand and pressed Add. **This route already existed** — documented in `api-routes.md` as
/// "Free Trade Analyzer autocomplete", public Sleeper data, no auth, max 10 rows — and native
/// simply never called it. The founder found it in the first minutes of real use:
/// *"players' names don't pop up… it's like the page wasn't wired."* He was right.
///
/// It is the same defect class as `F-SCR-01`: a capability the backend already serves, that the
/// native client did not consume.
struct PlayerSearchResult: Decodable, Equatable, Identifiable {
    let id: String
    let name: String
    let position: String?
    let team: String?

    /// "WR · MIN" — omitted entirely when the provider gives neither, rather than rendering
    /// a stray separator.
    var subtitle: String? {
        let parts = [position, team].compactMap { $0?.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

protocol PlayerSearchRepository {
    func search(query: String) async -> Result<[PlayerSearchResult], OmenApiError>
}

struct ApiPlayerSearchRepository: PlayerSearchRepository {
    private let client: OmenApiClient

    init(client: OmenApiClient) {
        self.client = client
    }

    func search(query: String) async -> Result<[PlayerSearchResult], OmenApiError> {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2 else { return .success([]) }

        // Public route — no bearer. Same posture as `/api/trade/compare`. The query goes
        // through `URLComponents`, never string interpolation into the path.
        return await client.get(
            "api/players/search",
            optionalAccessToken: nil,
            query: ["q": trimmed],
            as: [PlayerSearchResult].self
        )
    }
}

struct StubPlayerSearchRepository: PlayerSearchRepository {
    let result: Result<[PlayerSearchResult], OmenApiError>

    func search(query: String) async -> Result<[PlayerSearchResult], OmenApiError> { result }
}
