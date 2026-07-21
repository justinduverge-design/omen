import Foundation
import Security

/// iOS analog of Android `core/auth/GoogleIdTokenProvider.kt`, retargeted at Sign in with Apple
/// since Apple, not Google, is the primary native ID-token mechanism on this platform. The
/// production implementation is `NativeAppleIDTokenProvider` (App layer, needs
/// `AuthenticationServices`); this protocol has no framework dependency.
protocol AppleIDTokenProviding {
    var isConfigured: Bool { get }
    func getIDToken(rawNonce: String) async -> AppleIDTokenResult
}

enum AppleIDTokenResult: Equatable {
    case token(idToken: String, rawNonce: String)
    case canceled
    case unavailable
    case failed
}

/// Default seam so an environment without Apple sign-in configured reports "unavailable" honestly
/// instead of crashing or silently pretending to succeed.
struct UnconfiguredAppleIDTokenProvider: AppleIDTokenProviding {
    let isConfigured = false

    func getIDToken(rawNonce: String) async -> AppleIDTokenResult {
        .unavailable
    }
}

/// Cryptographically random nonce for the Sign in with Apple request. The raw value is sent to
/// Supabase; only its SHA-256 hash is sent to Apple (Apple never sees the raw nonce).
enum SecureNonce {
    static func generate(length: Int = 32) -> String {
        let charset = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        var result = ""
        var remaining = length

        while remaining > 0 {
            var randomBytes = [UInt8](repeating: 0, count: 16)
            let status = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
            precondition(status == errSecSuccess, "Unable to generate secure random bytes")

            for byte in randomBytes where remaining > 0 {
                // Reject bytes outside the charset's range to avoid modulo bias.
                if byte < charset.count {
                    result.append(charset[Int(byte)])
                    remaining -= 1
                }
            }
        }
        return result
    }
}
