import Foundation

/// M5-Native-API-Client slice A — the shared product API transport.
///
/// Mirrors the shape already proven by `URLSessionAccountRepository`: base URL from
/// `AppEnvironment`, bearer from the stored `Session`, typed outcome. This is the only
/// place in the app that knows how an Omen API request is assembled.
///
/// Deliberately NOT a Supabase SDK client — M0c doctrine keeps this app SDK-free, and
/// the auth layer already speaks GoTrue over `URLSession` for the same reason.
enum OmenApiError: Error, Equatable {
    /// Transport never completed — offline, DNS, TLS, timeout.
    case network
    /// 401/403. The caller is responsible for routing this to re-auth, not this layer.
    case unauthorized
    /// Any other non-2xx. Carries the status so callers can log a code without a body.
    case server(status: Int)
    /// 2xx with a body this app cannot read as the declared contract.
    case decode
}

/// Seam for tests. `URLSession` satisfies this without a subclass or a `URLProtocol` stub,
/// which keeps the fakes in tests readable.
protocol OmenHTTPFetching {
    func data(for request: URLRequest) async throws -> (Data, URLResponse)
}

extension URLSession: OmenHTTPFetching {}

/// Reads authenticated Omen product routes.
///
/// Every method is `async` and returns `Result` rather than throwing: the call sites are
/// SwiftUI view models that must render an honest failure state, and a typed error is
/// easier to map to `OmenStateSurface` than a thrown `Error` of unknown provenance.
struct OmenApiClient {
    private let baseURL: URL
    private let fetcher: OmenHTTPFetching
    private let timeout: TimeInterval

    init(baseURL: URL, fetcher: OmenHTTPFetching = URLSession.shared, timeout: TimeInterval = 20) {
        self.baseURL = baseURL
        self.fetcher = fetcher
        self.timeout = timeout
    }

    /// Authenticated GET returning a decoded contract payload.
    ///
    /// `path` is contract-relative and must not start with a slash (`"api/dashboard/summary"`),
    /// matching how `URLSessionAccountRepository` builds its URL.
    /// Authenticated GET.
    ///
    /// `query` exists so callers never build a query string into `path`. Doing that puts the
    /// whole thing through `appendingPathComponent`, which percent-encodes the `?` and 404s —
    /// see the note in `makeRequest`. That mistake shipped twice: once in player search, and
    /// again on 2026-09-04 in the league carousel's per-league read, where every page reported
    /// "Omen couldn't read this league's week" while the server was answering 200 to the same
    /// request made correctly. The overload without a query is what made the wrong thing the
    /// easy thing, so the parameter is defaulted here rather than added as a third variant.
    func get<T: Decodable>(
        _ path: String,
        accessToken: String,
        query: [String: String] = [:],
        as type: T.Type
    ) async -> Result<T, OmenApiError> {
        await send(
            makeRequest(path: path, method: "GET", accessToken: accessToken, body: nil, query: query),
            as: type
        )
    }

    /// GET where the token is genuinely optional. `/api/players/search` is public, like
    /// `/api/trade/compare` — sending an empty bearer would be a malformed header.
    func get<T: Decodable>(
        _ path: String,
        optionalAccessToken: String?,
        query: [String: String] = [:],
        as type: T.Type
    ) async -> Result<T, OmenApiError> {
        await send(
            makeRequest(path: path, method: "GET", accessToken: optionalAccessToken, body: nil, query: query),
            as: type
        )
    }

    /// Authenticated POST returning a decoded contract payload. `body` is encoded as JSON;
    /// the live Omen route is called with `{}` per the dashboard-gated contract.
    func post<T: Decodable>(
        _ path: String,
        accessToken: String,
        body: [String: Any] = [:],
        as type: T.Type
    ) async -> Result<T, OmenApiError> {
        await post(path, optionalAccessToken: accessToken, body: body, as: type)
    }

    /// POST where the token is genuinely optional.
    ///
    /// `POST /api/trade/compare` is free and public: an unauthenticated caller gets a **200**
    /// with a neutral answer, not a 401. Sending `Authorization: Bearer ` with an empty value
    /// would be a malformed header, so the field is omitted entirely when there is no token.
    func post<T: Decodable>(
        _ path: String,
        optionalAccessToken: String?,
        body: [String: Any] = [:],
        as type: T.Type
    ) async -> Result<T, OmenApiError> {
        let encoded = try? JSONSerialization.data(withJSONObject: body)
        return await send(
            makeRequest(path: path, method: "POST", accessToken: optionalAccessToken, body: encoded),
            as: type
        )
    }

    /// Authenticated DELETE. Added for `DELETE /api/platforms/:platform` — the disconnect the
    /// ESPN consent screen has been promising since it shipped, with no client behind it.
    ///
    /// Returns the decoded body like the others rather than discarding it: the route answers
    /// `{ disconnected, platform }`, and a caller that ignores the body cannot tell a real
    /// disconnect from a 200 that did nothing.
    func delete<T: Decodable>(_ path: String, accessToken: String, as type: T.Type) async -> Result<T, OmenApiError> {
        await send(makeRequest(path: path, method: "DELETE", accessToken: accessToken, body: nil), as: type)
    }

    private func makeRequest(
        path: String,
        method: String,
        accessToken: String?,
        body: Data?,
        query: [String: String] = [:]
    ) -> URLRequest {
        // Query items must NOT go through `appendingPathComponent` — it treats the whole string
        // as one path segment and percent-encodes the `?`, so `search?q=x` becomes
        // `search%3Fq=x` and the server 404s. That shipped in the first cut of player search and
        // was found by the founder typing a name into a real build.
        var url = baseURL.appendingPathComponent(path)
        if !query.isEmpty, var components = URLComponents(url: url, resolvingAgainstBaseURL: false) {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
            url = components.url ?? url
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = timeout
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        // The bearer is set here and nowhere else. It is never logged, never placed in a
        // URL, and never included in an error value — `OmenApiError` carries a status only.
        if let accessToken, !accessToken.isEmpty {
            request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        }
        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }
        return request
    }

    private func send<T: Decodable>(_ request: URLRequest, as type: T.Type) async -> Result<T, OmenApiError> {
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await fetcher.data(for: request)
        } catch {
            return .failure(.network)
        }

        guard let http = response as? HTTPURLResponse else { return .failure(.network) }

        switch http.statusCode {
        case 200...299:
            guard let decoded = try? JSONDecoder().decode(type, from: data) else {
                return .failure(.decode)
            }
            return .success(decoded)
        case 401, 403:
            return .failure(.unauthorized)
        default:
            return .failure(.server(status: http.statusCode))
        }
    }
}
