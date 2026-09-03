import XCTest
@testable import Omen

/// Mirrors Android `AuthFlowReducerTest.kt` (9 tests). Apple-flow cases replace the Android
/// suite's Google-flow cases (`googleHappyPath`, `googleUnavailableGuidesToEmail`) — same shape,
/// different provider, per GitHub issue #159's parity-not-translation instruction.
final class AuthFlowReducerTests: XCTestCase {
    private let session = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 9_999)

    func testOAuthBrowserDisclosureDoesNotNameTheSupabaseProjectHost() {
        XCTAssertEqual(
            AuthSignInCopy.oauthBrowserDisclosure,
            "Google and Discord open a secure Omen sign-in page. We only receive the sign-in result."
        )
        XCTAssertFalse(AuthSignInCopy.oauthBrowserDisclosure.lowercased().contains("supabase"))
        XCTAssertFalse(AuthSignInCopy.oauthBrowserDisclosure.lowercased().contains("xyudxf"))
    }

    func testEmailHappyPathReachesAuthenticated() {
        var state: AuthFlowState = .idle

        state = AuthFlowReducer.reduce(state: state, event: .emailSubmitted(email: "user@example.com"))
        XCTAssertEqual(state, .requestingOtp(email: "user@example.com"))

        state = AuthFlowReducer.reduce(state: state, event: .otpRequestResult(outcome: .otpSent))
        XCTAssertEqual(state, .awaitingOtp(email: "user@example.com"))

        state = AuthFlowReducer.reduce(state: state, event: .otpSubmitted(code: "123456"))
        XCTAssertEqual(state, .verifyingOtp(email: "user@example.com"))

        state = AuthFlowReducer.reduce(state: state, event: .otpVerifyResult(outcome: .success(session: session)))
        XCTAssertEqual(state, .authenticated(session: session))
    }

    func testInvalidEmailFailsFast() {
        let state = AuthFlowReducer.reduce(state: .idle, event: .emailSubmitted(email: "not-an-email"))
        XCTAssertEqual(state, .failed(reason: .invalidEmail))
    }

    func testInvalidCodeShapeIsRejectedBeforeVerify() {
        let state = AuthFlowReducer.reduce(state: .awaitingOtp(email: "user@example.com"), event: .otpSubmitted(code: "12"))
        XCTAssertEqual(state, .failed(reason: .invalidCode))
    }

    func testWrongCodeFromServerIsInvalidCode() {
        let state = AuthFlowReducer.reduce(state: .verifyingOtp(email: "user@example.com"), event: .otpVerifyResult(outcome: .invalidCode))
        XCTAssertEqual(state, .failed(reason: .invalidCode))
    }

    func testRetryableOtpRequestMapsToNamedFailure() {
        let state = AuthFlowReducer.reduce(
            state: .requestingOtp(email: "user@example.com"),
            event: .otpRequestResult(outcome: .retryableError(code: .network))
        )
        XCTAssertEqual(state, .failed(reason: .network))
    }

    func testAppleHappyPath() {
        var state: AuthFlowState = .idle

        state = AuthFlowReducer.reduce(state: state, event: .appleRequested)
        XCTAssertEqual(state, .launchingApple)

        state = AuthFlowReducer.reduce(state: state, event: .appleTokenResult(.token(idToken: "id", rawNonce: "nonce")))
        XCTAssertEqual(state, .exchangingAppleToken)

        state = AuthFlowReducer.reduce(state: state, event: .appleExchangeResult(outcome: .success(session: session)))
        XCTAssertEqual(state, .authenticated(session: session))
    }

    func testAppleUnavailableGuidesToEmail() {
        let state = AuthFlowReducer.reduce(state: .launchingApple, event: .appleTokenResult(.unavailable))
        XCTAssertEqual(state, .failed(reason: .appleUnavailable))
    }

    func testCancellationIsNamedNotFatal() {
        let state = AuthFlowReducer.reduce(state: .awaitingOtp(email: "user@example.com"), event: .canceled)
        XCTAssertEqual(state, .failed(reason: .canceled))
    }

    func testResetReturnsToIdle() {
        let state = AuthFlowReducer.reduce(state: .failed(reason: .network), event: .reset)
        XCTAssertEqual(state, .idle)
    }

    // M4-Auth-Providers-v1 §6.1 — OAuth reducer

    func testOAuthRequestedEntersLaunching() {
        let state = AuthFlowReducer.reduce(state: .idle, event: .oauthRequested(providerId: "discord"))
        XCTAssertEqual(state, .launchingOAuth(providerId: "discord"))
    }

    func testOAuthCallbackReceivedEntersExchange() {
        let state = AuthFlowReducer.reduce(
            state: .launchingOAuth(providerId: "discord"),
            event: .oauthCallbackReceived(providerId: "discord", code: "c", state: "s")
        )
        XCTAssertEqual(state, .exchangingOAuthCode(providerId: "discord"))
    }

    func testOAuthCallbackProviderMismatchIsRejected() {
        // Stray callback naming a different providerId while launching Discord is a routing/CSRF
        // anomaly, not a normal recoverable event.
        let state = AuthFlowReducer.reduce(
            state: .launchingOAuth(providerId: "discord"),
            event: .oauthCallbackReceived(providerId: "github", code: "c", state: "s")
        )
        XCTAssertEqual(state, .failed(reason: .oauthCallbackMismatch))
    }

    func testOAuthExchangeSuccessAuthenticates() {
        let state = AuthFlowReducer.reduce(
            state: .exchangingOAuthCode(providerId: "discord"),
            event: .oauthExchangeResult(providerId: "discord", outcome: .success(session: session))
        )
        XCTAssertEqual(state, .authenticated(session: session))
    }

    func testOAuthCallbackMismatchFromExchangeMapsToNamedFailure() {
        let state = AuthFlowReducer.reduce(
            state: .exchangingOAuthCode(providerId: "discord"),
            event: .oauthExchangeResult(providerId: "discord", outcome: .oauthCallbackMismatch)
        )
        XCTAssertEqual(state, .failed(reason: .oauthCallbackMismatch))
    }

    func testOAuthProviderNotConfiguredMapsToNamedFailure() {
        let state = AuthFlowReducer.reduce(
            state: .launchingOAuth(providerId: "discord"),
            event: .oauthExchangeResult(providerId: "discord", outcome: .oauthProviderNotConfigured)
        )
        XCTAssertEqual(state, .failed(reason: .oauthProviderNotConfigured))
    }

    func testOAuthRetryableExchangeErrorMapsToNamedFailure() {
        let state = AuthFlowReducer.reduce(
            state: .exchangingOAuthCode(providerId: "discord"),
            event: .oauthExchangeResult(providerId: "discord", outcome: .retryableError(code: .network))
        )
        XCTAssertEqual(state, .failed(reason: .network))
    }

    // M4-Auth-Providers-v1 §6.1 — Passkey reducer

    func testPasskeyRequestedEntersLaunching() {
        let state = AuthFlowReducer.reduce(state: .idle, event: .passkeyRequested)
        XCTAssertEqual(state, .launchingPasskey)
    }

    func testPasskeyAssertionEntersExchange() {
        let assertion = PasskeyResult.Assertion(
            credentialID: "cred-1",
            clientDataJSON: "cdj",
            authenticatorData: "auth",
            signature: "sig",
            userHandle: "u1"
        )
        let state = AuthFlowReducer.reduce(state: .launchingPasskey, event: .passkeyAssertionResult(.assertion(assertion)))
        XCTAssertEqual(state, .exchangingPasskeyAssertion)
    }

    func testPasskeyNoCredentialMapsToNamedFailure() {
        let state = AuthFlowReducer.reduce(state: .launchingPasskey, event: .passkeyAssertionResult(.noCredential))
        XCTAssertEqual(state, .failed(reason: .passkeyNoCredential))
    }

    func testPasskeyUnavailableMapsToNamedFailure() {
        let state = AuthFlowReducer.reduce(state: .launchingPasskey, event: .passkeyAssertionResult(.unavailable))
        XCTAssertEqual(state, .failed(reason: .passkeyUnavailable))
    }

    func testPasskeyCancelIsNamedNotFatal() {
        let state = AuthFlowReducer.reduce(state: .launchingPasskey, event: .passkeyAssertionResult(.canceled))
        XCTAssertEqual(state, .failed(reason: .canceled))
    }

    func testPasskeyExchangeSuccessAuthenticates() {
        let state = AuthFlowReducer.reduce(
            state: .exchangingPasskeyAssertion,
            event: .passkeyExchangeResult(outcome: .success(session: session))
        )
        XCTAssertEqual(state, .authenticated(session: session))
    }
}
