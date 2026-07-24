import CryptoKit
import Foundation

/// Mirrors Android `core/auth/PkceCodes.kt`. RFC 7636 PKCE parameters + a CSRF `state`.
/// Foundation + CryptoKit only — no third-party crypto.
///
/// - `codeVerifier`: base64url of 32 random bytes (43 chars) — RFC 7636 §4.1 minimum, matching
///   the Supabase JS SDK.
/// - `codeChallenge`: base64url(SHA-256(codeVerifier)), 43 chars.
/// - `state`: 32-byte URL-safe random string. CSRF defense per RFC 6749 §10.12.
struct PkceParams: Equatable {
    let codeVerifier: String
    let codeChallenge: String
    let state: String
    /// Only `s256` is accepted by Supabase for mobile flows.
    var codeChallengeMethod: String { "s256" }
}

enum PkceCodes {
    static func generate() -> PkceParams {
        let verifier = randomBase64URL(byteCount: 32)
        let challengeData = Data(SHA256.hash(data: Data(verifier.utf8)))
        let challenge = base64URL(challengeData)
        let state = randomBase64URL(byteCount: 32)
        return PkceParams(codeVerifier: verifier, codeChallenge: challenge, state: state)
    }

    private static func randomBase64URL(byteCount: Int) -> String {
        var bytes = [UInt8](repeating: 0, count: byteCount)
        let status = SecRandomCopyBytes(kSecRandomDefault, byteCount, &bytes)
        precondition(status == errSecSuccess, "SecRandomCopyBytes failed: \(status)")
        return base64URL(Data(bytes))
    }

    private static func base64URL(_ data: Data) -> String {
        data.base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
