import Foundation

/// Production `GoTrueTransport` using `URLSession` directly — no Supabase SDK, mirroring
/// Android's `OkHttpGoTrueTransport.kt` (which also avoids the Supabase SDK in favor of a plain
/// HTTP client). Hits the same GoTrue REST surface used by the other native client.
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

    // M4-Auth-Providers-v1 §9 step 5b — Supabase PKCE code exchange.
    // POST /auth/v1/token?grant_type=pkce with { auth_code, code_verifier } → session tokens
    // (mirrors the JS SDK's `exchangeCodeForSession`). `providerId` isn't in the request body —
    // Supabase already knows the provider from the ceremony started at /auth/v1/authorize.
    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> TransportResult {
        await send(
            path: "auth/v1/token",
            query: [URLQueryItem(name: "grant_type", value: "pkce")],
            body: ["auth_code": code, "code_verifier": codeVerifier],
            expectSession: true
        )
    }

    // Supabase Auth shipped first-factor passkey endpoints in 2026. The surface remains marked
    // experimental, but the route and W3C payload shapes are now published in Supabase's official
    // Swift client. Keeping these calls in the existing URLSession transport preserves Omen's
    // SDK-free auth architecture while using the same documented server contract.

    func startPasskeyAuthentication() async -> PasskeyOptionsTransportResult<PasskeyAuthenticationOptions> {
        switch await perform(path: "auth/v1/passkeys/authentication/options", body: [:]) {
        case .response(let data, let status):
            guard (200...299).contains(status) else { return .httpError(status: status) }
            guard
                let envelope = try? JSONDecoder().decode(AuthenticationOptionsEnvelope.self, from: data),
                let challenge = envelope.options.challenge.base64URLDecodedData
            else { return .malformed }
            return .options(PasskeyAuthenticationOptions(
                challengeID: envelope.challengeID,
                relyingPartyID: envelope.options.relyingPartyID,
                challenge: challenge,
                userVerification: envelope.options.userVerification
            ))
        case .networkError:
            return .networkError
        case .malformed:
            return .malformed
        }
    }

    func verifyPasskeyAuthentication(challengeID: String, assertion: PasskeyResult.Assertion) async -> TransportResult {
        await send(
            path: "auth/v1/passkeys/authentication/verify",
            body: [
                "challenge_id": challengeID,
                "credential": assertion.webAuthnJSONObject,
            ],
            expectSession: true
        )
    }

    func startPasskeyRegistration(accessToken: String) async -> PasskeyOptionsTransportResult<PasskeyRegistrationOptions> {
        switch await perform(
            path: "auth/v1/passkeys/registration/options",
            body: [:],
            accessToken: accessToken
        ) {
        case .response(let data, let status):
            guard (200...299).contains(status) else { return .httpError(status: status) }
            guard
                let envelope = try? JSONDecoder().decode(RegistrationOptionsEnvelope.self, from: data),
                let challenge = envelope.options.challenge.base64URLDecodedData,
                let userID = envelope.options.user.id.base64URLDecodedData
            else { return .malformed }
            return .options(PasskeyRegistrationOptions(
                challengeID: envelope.challengeID,
                relyingPartyID: envelope.options.relyingParty.id,
                challenge: challenge,
                userID: userID,
                userName: envelope.options.user.name,
                displayName: envelope.options.user.displayName,
                userVerification: envelope.options.authenticatorSelection?.userVerification
            ))
        case .networkError:
            return .networkError
        case .malformed:
            return .malformed
        }
    }

    func verifyPasskeyRegistration(
        challengeID: String,
        credential: PasskeyRegistrationResult.Credential,
        accessToken: String
    ) async -> TransportResult {
        await send(
            path: "auth/v1/passkeys/registration/verify",
            body: [
                "challenge_id": challengeID,
                "credential": credential.webAuthnJSONObject,
            ],
            expectSession: false,
            accessToken: accessToken
        )
    }

    func listPasskeys(accessToken: String) async -> PasskeyListTransportResult {
        switch await perform(path: "auth/v1/passkeys/", method: "GET", accessToken: accessToken) {
        case .response(let data, let status):
            guard (200...299).contains(status) else { return .httpError(status: status) }
            guard let items = try? JSONDecoder().decode([PasskeyItemDTO].self, from: data) else {
                return .malformed
            }
            let passkeys = items.compactMap { item -> PasskeyInfo? in
                guard let createdAt = Self.parseISO8601(item.createdAt) else { return nil }
                let lastUsedAt = item.lastUsedAt.flatMap(Self.parseISO8601)
                return PasskeyInfo(
                    id: item.id,
                    friendlyName: item.friendlyName,
                    createdAt: createdAt,
                    lastUsedAt: lastUsedAt
                )
            }
            guard passkeys.count == items.count else { return .malformed }
            return .passkeys(passkeys)
        case .networkError:
            return .networkError
        case .malformed:
            return .malformed
        }
    }

    func deletePasskey(id: String, accessToken: String) async -> TransportResult {
        guard UUID(uuidString: id) != nil else { return .malformed }
        switch await perform(path: "auth/v1/passkeys/\(id)", method: "DELETE", accessToken: accessToken) {
        case .response(_, let status) where (200...299).contains(status):
            return .ok
        case .response(_, let status):
            return .httpError(status: status)
        case .networkError:
            return .networkError
        case .malformed:
            return .malformed
        }
    }

    private func send(
        path: String,
        query: [URLQueryItem] = [],
        body: [String: Any],
        expectSession: Bool,
        accessToken: String? = nil
    ) async -> TransportResult {
        switch await perform(path: path, query: query, body: body, accessToken: accessToken) {
        case .networkError:
            return .networkError
        case .malformed:
            return .malformed
        case .response(let data, let status):
            guard (200...299).contains(status) else {
                return .httpError(status: status)
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

    private enum RawResponse {
        case response(Data, status: Int)
        case networkError
        case malformed
    }

    private func perform(
        path: String,
        method: String = "POST",
        query: [URLQueryItem] = [],
        body: [String: Any]? = nil,
        accessToken: String? = nil
    ) async -> RawResponse {
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
        request.httpMethod = method
        request.timeoutInterval = 20
        request.setValue(anonKey, forHTTPHeaderField: "apikey")
        request.setValue("Bearer \(accessToken ?? anonKey)", forHTTPHeaderField: "Authorization")

        if let body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            do {
                request.httpBody = try JSONSerialization.data(withJSONObject: body)
            } catch {
                return .malformed
            }
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
        return .response(data, status: http.statusCode)
    }

    private static func parseISO8601(_ value: String) -> Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }
}

private struct AuthenticationOptionsEnvelope: Decodable {
    let challengeID: String
    let options: Options

    struct Options: Decodable {
        let challenge: String
        let relyingPartyID: String
        let userVerification: String?

        enum CodingKeys: String, CodingKey {
            case challenge
            case relyingPartyID = "rpId"
            case userVerification
        }
    }

    enum CodingKeys: String, CodingKey {
        case challengeID = "challenge_id"
        case options
    }
}

private struct RegistrationOptionsEnvelope: Decodable {
    let challengeID: String
    let options: Options

    struct Options: Decodable {
        struct RelyingParty: Decodable { let id: String }
        struct User: Decodable {
            let id: String
            let name: String
            let displayName: String?
        }
        struct AuthenticatorSelection: Decodable { let userVerification: String? }

        let challenge: String
        let relyingParty: RelyingParty
        let user: User
        let authenticatorSelection: AuthenticatorSelection?

        enum CodingKeys: String, CodingKey {
            case challenge
            case relyingParty = "rp"
            case user
            case authenticatorSelection
        }
    }

    enum CodingKeys: String, CodingKey {
        case challengeID = "challenge_id"
        case options
    }
}

private struct PasskeyItemDTO: Decodable {
    let id: String
    let friendlyName: String?
    let createdAt: String
    let lastUsedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case friendlyName = "friendly_name"
        case createdAt = "created_at"
        case lastUsedAt = "last_used_at"
    }
}

private extension PasskeyResult.Assertion {
    var webAuthnJSONObject: [String: Any] {
        var response: [String: Any] = [
            "clientDataJSON": clientDataJSON,
            "authenticatorData": authenticatorData,
            "signature": signature,
        ]
        if let userHandle { response["userHandle"] = userHandle }
        return [
            "id": credentialID,
            "rawId": credentialID,
            "type": "public-key",
            "response": response,
        ]
    }
}

private extension PasskeyRegistrationResult.Credential {
    var webAuthnJSONObject: [String: Any] {
        [
            "id": credentialID,
            "rawId": credentialID,
            "type": "public-key",
            "response": [
                "clientDataJSON": clientDataJSON,
                "attestationObject": attestationObject,
            ],
        ]
    }
}

private extension String {
    var base64URLDecodedData: Data? {
        var value = replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = value.count % 4
        if remainder != 0 { value.append(String(repeating: "=", count: 4 - remainder)) }
        return Data(base64Encoded: value)
    }
}
