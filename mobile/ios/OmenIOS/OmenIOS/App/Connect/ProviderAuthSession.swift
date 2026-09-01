import Foundation
#if canImport(AuthenticationServices)
import AuthenticationServices
import UIKit
#endif

/// How a provider authorization round trip in the system browser ended.
enum ProviderAuthOutcome: Equatable {
    /// The browser returned to the app on the registered deep link.
    case returned(URL)
    /// The user dismissed the sheet. Normal, not an error (onboarding contract §6).
    case canceled
    /// The sheet could not be presented at all.
    case failed
}

/// Opens a provider's own sign-in page in a system-hosted browser and waits for the app's
/// deep-link return.
///
/// Distinct from `SupabaseOAuthProvider`, which knows how to build a Supabase authorize URL
/// and validate a PKCE callback. This one takes a URL the **server** built and hands back
/// whatever it returns: for a Yahoo connect the CSRF `state` is minted, stored, and consumed
/// server-side in `oauth_state`, so there is nothing for the client to validate and nothing
/// worth pretending to.
///
/// The onboarding contract §87 is explicit that the provider login is never embedded in a
/// WebView — an app-controlled web view can read what the user types into Yahoo's form.
@MainActor
protocol ProviderAuthSessionPresenting: AnyObject {
    func authorize(url: URL, callbackScheme: String) async -> ProviderAuthOutcome
}

#if canImport(AuthenticationServices)
@MainActor
final class ASWebAuthenticationProviderSession: NSObject, ProviderAuthSessionPresenting,
    ASWebAuthenticationPresentationContextProviding {

    private var activeSession: ASWebAuthenticationSession?

    func authorize(url: URL, callbackScheme: String) async -> ProviderAuthOutcome {
        await withCheckedContinuation { continuation in
            var resumed = false
            let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { callbackURL, error in
                guard !resumed else { return }
                resumed = true
                Task { @MainActor [weak self] in
                    self?.activeSession = nil
                }
                if let callbackURL {
                    continuation.resume(returning: .returned(callbackURL))
                } else if let error = error as? ASWebAuthenticationSessionError,
                          error.code == .canceledLogin {
                    continuation.resume(returning: .canceled)
                } else {
                    continuation.resume(returning: .failed)
                }
            }
            session.presentationContextProvider = self
            // Deliberately NOT ephemeral: a user already signed into Yahoo in Safari should not
            // be made to type their password again just to connect a league.
            session.prefersEphemeralWebBrowserSession = false
            activeSession = session
            if !session.start() {
                guard !resumed else { return }
                resumed = true
                continuation.resume(returning: .failed)
            }
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.first(where: { $0.activationState == .foregroundActive })?.windows.first(where: { $0.isKeyWindow })
            ?? scenes.first?.windows.first
        return window ?? ASPresentationAnchor()
    }
}
#endif

/// Test double. Records what it was asked to open so a test can assert the app never sends the
/// user to a URL it invented itself.
@MainActor
final class StubProviderAuthSession: ProviderAuthSessionPresenting {
    var outcome: ProviderAuthOutcome
    private(set) var requestedURLs: [URL] = []

    init(outcome: ProviderAuthOutcome = .canceled) { self.outcome = outcome }

    func authorize(url: URL, callbackScheme: String) async -> ProviderAuthOutcome {
        requestedURLs.append(url)
        return outcome
    }
}
