import Foundation

/// Production `GoTrueTransport` using `URLSession` directly — no Supabase SDK, mirroring
/// Android's `OkHttpGoTrueTransport.kt` (which also avoids the Supabase SDK in favor of a plain
/// HTTP client). Hits the same three GoTrue REST endpoints Android uses.
final class URLSessionGoTrueTransport: GoTrueTransport {
    private let supabaseURL: URL
    private let anonKey: String
    private let session: URLSession

    init(supabaseURL: URL, anonKey: String, session: URLSession = .shared) {
        self.supabaseURL = supabaseURL
        self.anonKey = anonKey
        self.session = session
    }

    func requestEmailOtp(email: String) async -> TransportResult {
        await send(path: "auth/v1/otp", body: ["email": email, "create_user": true], expectSession: false)
    }

    func verifyEmailOtp(email: String, code: String) async -> TransportResult {
        await send(path: "auth/v1/verify", body: ["type": "email", "email": email, "token": code], expectSession: true)
    }

    func signInWithIDToken(provider: String, idToken: String, nonce: String?) async -> TransportResult {
        var body: [String: Any] = ["provider": provider, "id_token": idToken]
        if let nonce {
            body["nonce"] = nonce
        }
        return await send(
            path: "auth/v1/token",
            query: [URLQueryItem(name: "grant_type", value: "id_token")],
            body: body,
            expectSession: true
        )
    }

    func refresh(refreshToken: String) async -> TransportResult {
        await send(
            path: "auth/v1/token",
            query: [URLQueryItem(name: "grant_type", value: "refresh_token")],
            body: ["refresh_token": refreshToken],
            expectSession: true
        )
    }

    private func send(path: String, query: [URLQueryItem] = [], body: [String: Any], expectSession: Bool) async -> TransportResult {
        guard var components = URLComponents(url: supabaseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false) else {
            return .malformed
        }
        if !query.isEmpty {
            components.queryItems = query
        }
        guard let url = components.url else {
            return .malformed
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")

        do {
            request.httpBody = try JSONSerialization.data(withJSONObject: body)
        } catch {
            return .malformed
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            return .networkError
        }

        guard let http = response as? HTTPURLResponse else {
            return .malformed
        }
        guard (200...299).contains(http.statusCode) else {
            return .httpError(status: http.statusCode)
        }
        guard expectSession else {
            return .ok
        }

        guard
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let accessToken = json["access_token"] as? String, !accessToken.isEmpty,
            let refreshToken = json["refresh_token"] as? String, !refreshToken.isEmpty,
            let user = json["user"] as? [String: Any],
            let userID = user["id"] as? String, !userID.isEmpty
        else {
            return .malformed
        }
        let expiresIn = (json["expires_in"] as? Int) ?? 3600
        return .sessionTokens(userID: userID, accessToken: accessToken, refreshToken: refreshToken, expiresInSeconds: expiresIn)
    }
}
