import XCTest
@testable import Omen

/// Regression cover for a live failure on 2026-09-18.
///
/// The Supabase Google provider held an invalid client secret. The round trip reached Google,
/// the user approved, Google issued a code, and Supabase then failed to exchange it
/// (`oauth2: "invalid_client"`). Supabase redirected back to the app carrying `error` and
/// `error_description` and NO `code`.
///
/// The app read only `code` and `state`. A missing code parsed as `.malformed`, which the view
/// model reported as a provider mismatch, which the reducer turned into `.oauthCallbackMismatch`
/// — user-facing copy "Sign-in couldn't be verified. Start again."
///
/// Both halves of that were false. Nothing was unverified: the request was well-formed and the
/// state matched. And starting again could not work, because the cause was a secret only a
/// server-side change could fix. The provider's own answer was in the callback URL and was
/// being thrown away.
@MainActor
final class AuthViewModelOAuthCallbackTests: XCTestCase {

    func testProviderErrorInCallbackIsReportedAsRejectionNotMismatch() {
        let viewModel = makeViewModel()
        viewModel.signInWithOAuth(providerId: "google")

        viewModel.handleOAuthCallback(callbackURL(
            "com.slopssaloon.omen://auth/callback?error=server_error&error_description=Unable+to+exchange+external+code"
        ))

        XCTAssertEqual(viewModel.flowState, .failed(reason: .oauthProviderRejected))
        XCTAssertNotEqual(
            viewModel.flowState, .failed(reason: .oauthCallbackMismatch),
            "This is the exact shape of the 2026-09-18 invalid_client failure. Reporting it as a "
            + "mismatch tells the user their sign-in was unverifiable and to retry, and both are untrue."
        )
    }

    func testAGenuineStateMismatchStillReadsAsMismatch() {
        // Negative control: the honest-error path must not swallow the CSRF case it sits in
        // front of. A callback with no `error` but a wrong `state` is still a mismatch.
        let viewModel = makeViewModel()
        viewModel.signInWithOAuth(providerId: "google")

        viewModel.handleOAuthCallback(callbackURL(
            "com.slopssaloon.omen://auth/callback?code=abc&state=not-the-stashed-state"
        ))

        XCTAssertEqual(viewModel.flowState, .failed(reason: .oauthCallbackMismatch))
    }

    func testDismissingTheSheetLeavesLaunchingInsteadOfSpinningForever() {
        // ASWebAuthenticationSession calls back with a nil URL when the sheet is dismissed. That
        // path used to `return` without dispatching, stranding the flow in `.launchingOAuth`
        // with the provider button spinning and no way back.
        let viewModel = makeViewModel()
        viewModel.signInWithOAuth(providerId: "google")
        XCTAssertEqual(viewModel.flowState, .launchingOAuth(providerId: "google"))

        viewModel.handleOAuthDismissed()

        XCTAssertEqual(viewModel.flowState, .failed(reason: .canceled))
    }

    func testALateDismissalDoesNotClobberAFinishedFlow() {
        // Same shape as the ESPN late-dismissal defect: the sheet's teardown can arrive after
        // the callback already moved the flow on. Cancelling then would discard real progress.
        let viewModel = makeViewModel()
        viewModel.signInWithOAuth(providerId: "google")
        viewModel.handleOAuthCallback(callbackURL(
            "com.slopssaloon.omen://auth/callback?error=server_error"
        ))
        let afterCallback = viewModel.flowState

        viewModel.handleOAuthDismissed()

        XCTAssertEqual(viewModel.flowState, afterCallback)
        XCTAssertNotEqual(viewModel.flowState, .failed(reason: .canceled))
    }

    private func callbackURL(_ string: String) -> URL {
        guard let url = URL(string: string) else {
            preconditionFailure("test URL is malformed: \(string)")
        }
        return url
    }

    private func makeViewModel() -> AuthViewModel {
        AuthViewModel(
            repository: FakeAuthRepository(),
            appleProvider: UnavailableAppleProvider(),
            oauthProvider: StubOAuthProvider(),
            passkeyProvider: UnsupportedPasskeyProvider(),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(),
                nowEpochSeconds: { 1_000 }
            )
        )
    }
}

/// Launches successfully and reports every callback as a mismatch, so any test that lands on
/// `.oauthProviderRejected` got there from the URL's `error`, not from the parse result.
private struct UnavailableAppleProvider: AppleIDTokenProviding {
    var isConfigured: Bool { false }
    @MainActor func getIDToken(rawNonce: String) async -> AppleIDTokenResult { .unavailable }
}

private final class StubOAuthProvider: SupabaseOAuthProvider {
    func isConfigured(providerId: String) -> Bool { true }
    func launch(providerId: String) async -> OAuthLaunchResult { .launched }
    func parseCallback(providerId: String, code: String?, state: String?) -> OAuthCallback { .mismatch }
}
