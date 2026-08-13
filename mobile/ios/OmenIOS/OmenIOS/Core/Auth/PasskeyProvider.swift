import Foundation

/// Server-provided WebAuthn options required to start a discoverable passkey sign-in.
/// `challengeID` is returned to Supabase during verification; it is never shown or logged.
struct PasskeyAuthenticationOptions: Equatable {
    let challengeID: String
    let relyingPartyID: String
    let challenge: Data
    let userVerification: String?
}

/// Server-provided WebAuthn options required to register a passkey for the signed-in user.
struct PasskeyRegistrationOptions: Equatable {
    let challengeID: String
    let relyingPartyID: String
    let challenge: Data
    let userID: Data
    let userName: String
    let displayName: String?
    let userVerification: String?
}

/// Public metadata returned by Supabase for a registered passkey. Raw keys and WebAuthn
/// credential payloads are deliberately absent.
struct PasskeyInfo: Equatable, Identifiable {
    let id: String
    let friendlyName: String?
    let createdAt: Date
    let lastUsedAt: Date?
}

/// Mirrors Android `core/auth/PasskeyProvider.kt`. Seam over the platform passkey (WebAuthn) API —
/// `AuthenticationServices.ASAuthorizationPlatformPublicKeyCredentialProvider` on iOS
/// (M4-Auth-Providers-v1 §4.1). Distinct from `SupabaseOAuthProvider` because passkeys use
/// `signInWithWebAuthn` (not `signInWithOAuth`) and never involve a browser deep link.
///
/// Keeping this as a protocol means the flow reducer, repository, and UI stay testable with a
/// fake while the native implementation owns all platform UI on the main actor.
@MainActor
protocol PasskeyProvider {

    /// True only when the device has a platform authenticator and the API is available.
    var isSupported: Bool { get }

    /// Present the platform passkey UI for sign-in against `challenge` (base64url from Supabase).
    /// The returned `PasskeyResult.Assertion` fields are forwarded verbatim to Supabase; the app
    /// never inspects, logs, or stores them.
    func getAssertion(options: PasskeyAuthenticationOptions) async -> PasskeyResult

    /// Present the platform passkey registration UI to create a new credential for `userID`
    /// against `challenge`. Used for post-sign-in pairing (brief §4.4) and Account settings
    /// "Add a passkey".
    func register(options: PasskeyRegistrationOptions) async -> PasskeyRegistrationResult
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

enum PasskeyRegistrationResult: Equatable {
    struct Credential: Equatable {
        let credentialID: String
        let clientDataJSON: String
        let attestationObject: String
    }

    case credential(Credential)
    case canceled
    case unavailable
    case failed
}

/// Default for builds without live client configuration. Reports unsupported so the UI can hide
/// the "Sign in with a passkey" button instead of surfacing a broken CTA.
@MainActor
final class UnsupportedPasskeyProvider: PasskeyProvider {
    let isSupported = false
    func getAssertion(options: PasskeyAuthenticationOptions) async -> PasskeyResult { .unavailable }
    func register(options: PasskeyRegistrationOptions) async -> PasskeyRegistrationResult { .unavailable }
}
