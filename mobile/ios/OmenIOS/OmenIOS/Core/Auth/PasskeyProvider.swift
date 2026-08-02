import Foundation

/// Mirrors Android `core/auth/PasskeyProvider.kt`. Seam over the platform passkey (WebAuthn) API —
/// `AuthenticationServices.ASAuthorizationPlatformPublicKeyCredentialProvider` on iOS
/// (M4-Auth-Providers-v1 §4.1). Distinct from `SupabaseOAuthProvider` because passkeys use
/// `signInWithWebAuthn` (not `signInWithOAuth`) and never involve a browser deep link.
///
/// Keeping this as a protocol means the flow reducer, repository, and UI can be built and
/// XCTested with a fake before the platform impl exists.
protocol PasskeyProvider {

    /// True only when the device has a platform authenticator and the API is available.
    var isSupported: Bool { get }

    /// Present the platform passkey UI for sign-in against `challenge` (base64url from Supabase).
    /// The returned `PasskeyResult.Assertion` fields are forwarded verbatim to Supabase; the app
    /// never inspects, logs, or stores them.
    func getAssertion(challenge: String) async -> PasskeyResult

    /// Present the platform passkey registration UI to create a new credential for `userID`
    /// against `challenge`. Used for post-sign-in pairing (brief §4.4) and Account settings
    /// "Add a passkey".
    func register(challenge: String, userID: String) async -> PasskeyResult
}

/// Mirrors Android `PasskeyResult`. All string fields carry opaque WebAuthn payloads the app
/// must NOT inspect, log, or persist beyond the immediate `verifyWebAuthn` call (M0c §8 opaque-
/// error rule applies to credentials in the same spirit).
enum PasskeyResult: Equatable {
    struct Assertion: Equatable {
        let credentialID: String
        let clientDataJSON: String
        let authenticatorData: String
        let signature: String
        let userHandle: String?
    }

    case assertion(Assertion)
    /// User dismissed the passkey sheet. Normal, not an error.
    case canceled
    /// Device has no platform authenticator or the passkey API is unavailable.
    case unavailable
    /// No passkey is registered for this account on this device. UI offers another method.
    case noCredential
    /// Ceremony failed for a reason the app should not surface verbatim.
    case failed
}

/// Default provider used until the real `ASAuthorizationPlatform*` wiring lands. Reports
/// unsupported so the UI can hide the "Sign in with a passkey" button entirely instead of
/// surfacing a broken CTA.
final class UnsupportedPasskeyProvider: PasskeyProvider {
    let isSupported = false
    func getAssertion(challenge: String) async -> PasskeyResult { .unavailable }
    func register(challenge: String, userID: String) async -> PasskeyResult { .unavailable }
}
