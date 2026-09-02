import XCTest
@testable import Omen

/// The code-entry screen used to end at "Verify code".
///
/// Supabase answering 200 to an OTP request means it **accepted the request** — not that the
/// message reached an inbox. It can still bounce, be deferred by the receiving provider, land
/// in spam, or be dropped for an address on a suppression list. A beta user whose code never
/// arrived had nothing to press and nothing to read, so they simply stopped.
@MainActor
final class OtpResendTests: XCTestCase {

    private final class OtpRepositorySpy: AuthRepository {
        var requestOutcomes: [AuthOutcome]
        private(set) var requestedEmails: [String] = []

        init(_ outcomes: [AuthOutcome]) { requestOutcomes = outcomes }

        func requestEmailOtp(email: String) async -> AuthOutcome {
            requestedEmails.append(email)
            return requestOutcomes.isEmpty ? .otpSent : requestOutcomes.removeFirst()
        }

        func verifyEmailOtp(email: String, code: String) async -> AuthOutcome { .invalidCode }
        func signInWithAppleIDToken(idToken: String, rawNonce: String) async -> AuthOutcome { .unsupported }
        func refresh() async -> AuthOutcome { .needsReauth }
        func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> AuthOutcome { .unsupported }
        func startPasskeyAuthentication() async -> PasskeyStartResult<PasskeyAuthenticationOptions> { .failed(code: .unknown) }
        func signInWithPasskey(challengeID: String, assertion: PasskeyResult.Assertion) async -> AuthOutcome { .unsupported }
        func startPasskeyRegistration() async -> PasskeyStartResult<PasskeyRegistrationOptions> { .needsReauth }
        func registerPasskey(challengeID: String, credential: PasskeyRegistrationResult.Credential) async -> AuthOutcome { .unsupported }
        func listPasskeys() async -> PasskeyListOutcome { .needsReauth }
        func deletePasskey(id: String) async -> PasskeyManagementOutcome { .needsReauth }
        func signOut() async {}
    }

    private func makeViewModel(_ repository: OtpRepositorySpy) -> AuthViewModel {
        AuthViewModel(
            repository: repository,
            appleProvider: UnconfiguredAppleIDTokenProvider(),
            oauthProvider: UnconfiguredSupabaseOAuthProvider(),
            passkeyProvider: UnsupportedPasskeyProvider(),
            sessionManager: SessionManager(store: InMemorySecureSessionStore(), nowEpochSeconds: { 1_000 })
        )
    }

    /// Spins the main actor until `condition` holds. The view model does its work in detached
    /// `Task`s, so a fixed number of `Task.yield()` calls is a guess that passes on one machine
    /// and flakes on another.
    private func waitUntil(
        _ description: String,
        timeout: TimeInterval = 2,
        _ condition: () -> Bool,
        file: StaticString = #filePath,
        line: UInt = #line
    ) async {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if condition() { return }
            try? await Task.sleep(nanoseconds: 5_000_000)
        }
        XCTFail("timed out waiting for \(description)", file: file, line: line)
    }

    /// Drives the view model to the code-entry screen the way a user does.
    private func awaitingCode(_ repository: OtpRepositorySpy) async -> AuthViewModel {
        let viewModel = makeViewModel(repository)
        viewModel.emailField = "tester@example.com"
        viewModel.submitEmail()
        await waitUntil("the code-entry screen") {
            if case .awaitingOtp = viewModel.flowState { return true }
            return false
        }
        return viewModel
    }

    func testTheFirstSendStartsTheCooldownSoResendIsNotInstantlyAvailable() async {
        let repository = OtpRepositorySpy([.otpSent])
        let viewModel = await awaitingCode(repository)

        XCTAssertEqual(viewModel.flowState, .awaitingOtp(email: "tester@example.com"))
        XCTAssertEqual(viewModel.otpResendSecondsRemaining, AuthViewModel.otpResendCooldownSeconds)
    }

    /// The cooldown is not decoration: hammering resend gets the address throttled by Supabase,
    /// and the user then blames Omen for the silence it caused.
    func testResendIsRefusedWhileTheCooldownIsRunning() async {
        let repository = OtpRepositorySpy([.otpSent, .otpSent])
        let viewModel = await awaitingCode(repository)

        viewModel.resendOtp()
        await Task.yield()

        XCTAssertEqual(repository.requestedEmails.count, 1, "only the original send should have gone out")
    }

    func testResendRequestsAnotherCodeForTheSameAddress() async {
        let repository = OtpRepositorySpy([.otpSent, .otpSent])
        let viewModel = await awaitingCode(repository)
        viewModel.clearOtpResendCooldownForTesting()

        viewModel.resendOtp()
        await waitUntil("the resend to be accepted") { viewModel.otpResent }

        XCTAssertEqual(repository.requestedEmails, ["tester@example.com", "tester@example.com"])
        XCTAssertEqual(viewModel.otpResendSecondsRemaining, AuthViewModel.otpResendCooldownSeconds)
    }

    /// A successful resend must not re-enter `awaitingOtp` through the reducer: the user is
    /// already on the code screen and may be mid-type, and a state change would clear the field.
    func testASuccessfulResendDoesNotDisturbACodeAlreadyBeingTyped() async {
        let repository = OtpRepositorySpy([.otpSent, .otpSent])
        let viewModel = await awaitingCode(repository)
        viewModel.clearOtpResendCooldownForTesting()
        viewModel.otpField = "123"

        viewModel.resendOtp()
        await waitUntil("the resend to be accepted") { viewModel.otpResent }

        XCTAssertEqual(viewModel.otpField, "123")
        XCTAssertEqual(viewModel.flowState, .awaitingOtp(email: "tester@example.com"))
    }

    /// A failed resend reports beside the field rather than through the reducer, for the same
    /// reason — and it releases the cooldown, because nothing was sent and there is nothing to
    /// wait for.
    func testAFailedResendReportsInPlaceAndReleasesTheCooldown() async {
        let repository = OtpRepositorySpy([.otpSent, .retryableError(code: .network)])
        let viewModel = await awaitingCode(repository)
        viewModel.clearOtpResendCooldownForTesting()

        viewModel.resendOtp()
        await waitUntil("the resend failure to surface") { viewModel.otpResendError != nil }

        XCTAssertEqual(viewModel.otpResendError, AuthFailure.network.userMessage)
        XCTAssertFalse(viewModel.otpResent)
        XCTAssertEqual(viewModel.otpResendSecondsRemaining, 0, "nothing was sent, so nothing is worth waiting for")
        XCTAssertEqual(viewModel.flowState, .awaitingOtp(email: "tester@example.com"))
    }

    /// Resending only makes sense while a code is outstanding.
    func testResendDoesNothingBeforeACodeHasBeenRequested() async {
        let repository = OtpRepositorySpy([])
        let viewModel = makeViewModel(repository)

        viewModel.resendOtp()
        await Task.yield()

        XCTAssertTrue(repository.requestedEmails.isEmpty)
    }

    func testResetClearsTheResendState() async {
        let repository = OtpRepositorySpy([.otpSent])
        let viewModel = await awaitingCode(repository)

        viewModel.reset()

        XCTAssertEqual(viewModel.otpResendSecondsRemaining, 0)
        XCTAssertFalse(viewModel.otpResent)
        XCTAssertNil(viewModel.otpResendError)
    }
}
