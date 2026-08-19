import Foundation

/// O7 — server-driven minimum-version gate.
///
/// Mirrors `OmenApiClient`'s transport shape but is deliberately unauthenticated: the check
/// must run before sign-in, at launch, so it cannot depend on a bearer token.
struct MinVersionStatus: Decodable, Equatable {
    let status: String
    let updateRequired: Bool
    let minimumVersion: String?

    enum CodingKeys: String, CodingKey {
        case status
        case updateRequired = "update_required"
        case minimumVersion = "minimum_version"
    }
}

/// Collapsed to what the gate view actually needs to render. Any failure — network, decode,
/// non-2xx — resolves to `.unavailable`, which the caller must treat identically to `.ok`.
/// This gate exists to block a known-bad build, not to add a new way to get locked out.
enum MinVersionGateResult: Equatable {
    case ok
    case updateRequired(minimumVersion: String)
    case unavailable
}

protocol MinVersionGateChecking {
    func check(platform: String, currentVersion: String) async -> MinVersionGateResult
}

struct MinVersionGateClient: MinVersionGateChecking {
    private let baseURL: URL
    private let fetcher: OmenHTTPFetching
    private let timeout: TimeInterval

    init(baseURL: URL, fetcher: OmenHTTPFetching = URLSession.shared, timeout: TimeInterval = 10) {
        self.baseURL = baseURL
        self.fetcher = fetcher
        self.timeout = timeout
    }

    func check(platform: String, currentVersion: String) async -> MinVersionGateResult {
        var components = URLComponents(
            url: baseURL.appendingPathComponent("api/system/min-version"),
            resolvingAgainstBaseURL: false
        )
        components?.queryItems = [
            URLQueryItem(name: "platform", value: platform),
            URLQueryItem(name: "version", value: currentVersion),
        ]
        guard let url = components?.url else { return .unavailable }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.timeoutInterval = timeout
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await fetcher.data(for: request)
        } catch {
            return .unavailable
        }

        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            return .unavailable
        }
        guard let decoded = try? JSONDecoder().decode(MinVersionStatus.self, from: data) else {
            return .unavailable
        }
        guard decoded.updateRequired, let minimumVersion = decoded.minimumVersion else {
            return .ok
        }
        return .updateRequired(minimumVersion: minimumVersion)
    }
}

/// Reads the running build's own version, the same value sent to the gate endpoint.
enum AppVersionProvider {
    static var current: String {
        (Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String) ?? "0.0.0"
    }
}
