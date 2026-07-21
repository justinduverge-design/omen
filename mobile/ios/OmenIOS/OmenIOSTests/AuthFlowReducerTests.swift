import XCTest
@testable import Omen

/// Mirrors Android `AuthFlowReducerTest.kt` (9 tests). Apple-flow cases replace the Android
/// suite's Google-flow cases (`googleHappyPath`, `googleUnavailableGuidesToEmail`) — same shape,
/// different provider, per GitHub issue #159's parity-not-translation instruction.
final class AuthFlowReducerTests: XCTestCase {
    private let session = Session(userID: "u1", accessToken: "a", refreshToken: "r", expiresAtEpochSeconds: 9_999)

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
}
