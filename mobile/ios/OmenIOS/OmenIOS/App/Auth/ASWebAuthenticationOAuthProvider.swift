import AuthenticationServices
import Foundation
import UIKit

/// Concrete `SupabaseOAuthProvider` using `ASWebAuthenticationSession`
/// (M4-Auth-Providers-v1 §4.1). Mirrors Android's `AndroidChromeTabsOAuthProvider`:
///
/// Each `launch(providerId:)` generates fresh PKCE + CSRF state, stashes them keyed by
/// providerId, and opens Supabase's `GET /auth/v1/authorize?provider=...&flow_type=pkce&
/// redirect_to=...&code_challenge=...&code_challenge_method=s256` in a system-hosted web view.
/// Supabase redirects to the third-party OAuth server (e.g. Discord); the third party redirects
/// back to Supabase, which in turn redirects to our `com.slopssaloon.omen://auth/callback?
/// state=...&code=...` deep link. Omen state travels inside `redirect_to`; the top-level
/// `state` query parameter belongs to Supabase's provider round trip and must not be overridden.
/// The `.onOpenURL` handler in `OmenIOSApp` feeds that URL
/// back to `AuthViewModel.handleOAuthCallback(_:)`.
///
/// `parseCallback` validates the returned `state` against the stashed value (CSRF defense per
/// RFC 6749 §10.12) and on match returns the PKCE `codeVerifier` for the caller to hand to
/// `AuthRepository.exchangeOAuthCode`.
///
/// Since the Supabase anon key can't tell us whether a provider is enabled server-side,
/// `isConfigured(providerId:)` is optimistic (true whenever Supabase itself is configured).
/// The transport 404 mapping in `SupabaseAuthRepository.exchangeOAuthCode` catches an
/// actually-disabled provider and surfaces `.oauthProviderNotConfigured`.
final class ASWebAuthenticationOAuthProvider: NSObject, SupabaseOAuthProvider, ASWebAuthenticationPresentationContextProviding {
    private let supabaseURL: URL
    /// The registered app-scheme deep link Supabase redirects to on completion.
    private let redirectURI: String
    private let callbackScheme: String

    private struct Pending {
        let codeVerifier: String
        let state: String
    }
    private var pending: [String: Pending] = [:]
    private var activeSession: ASWebAuthenticationSession?
    /// `ASWebAuthenticationSession` normally consumes the callback URL instead of forwarding it
    /// through SwiftUI's `onOpenURL`. The app installs this handler so the captured URL reaches
    /// the same state/PKCE validation path immediately.
    var callbackHandler: ((URL) -> Void)?

    init(
        supabaseURL: URL,
        redirectURI: String = "com.slopssaloon.omen://auth/callback",
        callbackScheme: String = "com.slopssaloon.omen"
    ) {
        self.supabaseURL = supabaseURL
        self.redirectURI = redirectURI
        self.callbackScheme = callbackScheme
    }

    func isConfigured(providerId: String) -> Bool { true }

    func launch(providerId: String) async -> OAuthLaunchResult {
        let pkce = PkceCodes.generate()
        pending[providerId] = Pending(codeVerifier: pkce.codeVerifier, state: pkce.state)
        guard let authorizeURL = buildAuthorizeURL(providerId: providerId, pkce: pkce) else {
            return .failed
        }

        // ASWebAuthenticationSession's completion is called on the deep link — but we also feed
        // the URL back through the app's `.onOpenURL` handler. Both paths resolve to the same
        // stashed `pending[providerId]` entry, so a duplicate is a no-op (parseCallback removes
        // the stash on first successful match).
        return await withCheckedContinuation { continuation in
            Task { @MainActor in
                let session = ASWebAuthenticationSession(
                    url: authorizeURL,
                    callbackURLScheme: self.callbackScheme
                ) { [weak self] callbackURL, _ in
                    guard let callbackURL else { return }
                    Task { @MainActor in
                        self?.activeSession = nil
                        self?.callbackHandler?(callbackURL)
                    }
                }
                session.presentationContextProvider = self
                session.prefersEphemeralWebBrowserSession = false
                self.activeSession = session
                if session.start() {
                    continuation.resume(returning: .launched)
                } else {
                    continuation.resume(returning: .failed)
                }
            }
        }
    }

    func parseCallback(providerId: String, code: String?, state: String?) -> OAuthCallback {
        guard let stashed = pending[providerId] else { return .mismatch }
        guard let code, !code.isEmpty, let state, !state.isEmpty else { return .malformed }
        guard state == stashed.state else { return .mismatch }
        // Single-use: consume the stash so a replayed callback can't succeed twice.
        pending.removeValue(forKey: providerId)
        return .valid(code: code, codeVerifier: stashed.codeVerifier)
    }

    private func buildAuthorizeURL(providerId: String, pkce: PkceParams) -> URL? {
        guard var callback = URLComponents(string: redirectURI) else { return nil }
        callback.queryItems = (callback.queryItems ?? []) + [
            URLQueryItem(name: "state", value: pkce.state)
        ]
        guard let callbackURL = callback.url else { return nil }

        var components = URLComponents(url: supabaseURL.appendingPathComponent("auth/v1/authorize"), resolvingAgainstBaseURL: false)
        components?.queryItems = [
            URLQueryItem(name: "provider", value: providerId),
            URLQueryItem(name: "flow_type", value: "pkce"),
            URLQueryItem(name: "redirect_to", value: callbackURL.absoluteString),
            URLQueryItem(name: "code_challenge", value: pkce.codeChallenge),
            URLQueryItem(name: "code_challenge_method", value: pkce.codeChallengeMethod),
        ]
        return components?.url
    }

    // ASWebAuthenticationPresentationContextProviding — the system needs a window anchor to
    // present the auth sheet. Use the current key window; on iOS this is provided by the
    // active UIWindowScene.
    @MainActor
    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let window = scenes.first(where: { $0.activationState == .foregroundActive })?.windows.first(where: { $0.isKeyWindow })
            ?? scenes.first?.windows.first
        return window ?? ASPresentationAnchor()
    }
}
