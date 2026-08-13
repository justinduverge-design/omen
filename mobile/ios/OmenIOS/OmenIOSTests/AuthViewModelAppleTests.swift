import Combine
import XCTest
@testable import Omen

@MainActor
final class AuthViewModelAppleTests: XCTestCase {
    func testAppleAvailabilityFollowsProviderConfiguration() {
        let unavailable = makeViewModel(appleProvider: AppleProviderStub(isConfigured: false))
        let available = makeViewModel(appleProvider: AppleProviderStub(isConfigured: true))

        XCTAssertFalse(unavailable.appleSignInAvailable)
        XCTAssertTrue(available.appleSignInAvailable)
    }

    func testAppleHappyPathCallsRepositoryAndAuthenticates() async {
        let expectedSession = Session(
            userID: "apple-user",
            accessToken: "access-token",
            refreshToken: "refresh-token",
            expiresAtEpochSeconds: 9_999
        )
        let repository = AuthRepositorySpy(appleOutcome: .success(session: expectedSession))
        let appleProvider = AppleProviderStub(isConfigured: true, idToken: "apple-id-token")
        let sessionStore = InMemorySecureSessionStore()
        let sessionManager = SessionManager(store: sessionStore, nowEpochSeconds: { 1_000 })
        let viewModel = AuthViewModel(
            repository: repository,
            appleProvider: appleProvider,
            oauthProvider: UnconfiguredSupabaseOAuthProvider(),
            passkeyProvider: UnsupportedPasskeyProvider(),
            sessionManager: sessionManager
        )
        let authenticated = expectation(description: "Apple sign-in reaches authenticated")
        var cancellables = Set<AnyCancellable>()

        viewModel.$flowState
            .sink { state in
                if state == .authenticated(session: expectedSession) {
                    authenticated.fulfill()
                }
            }
            .store(in: &cancellables)

        viewModel.signInWithApple()
        await fulfillment(of: [authenticated], timeout: 1.0)

        XCTAssertEqual(repository.appleCalls.count, 1)
        XCTAssertEqual(repository.appleCalls.first?.idToken, "apple-id-token")
        XCTAssertEqual(repository.appleCalls.first?.rawNonce, appleProvider.receivedNonce)
        XCTAssertEqual(repository.appleCalls.first?.rawNonce.count, 32)
        XCTAssertEqual(sessionManager.state, .signedIn(userID: expectedSession.userID))
        XCTAssertEqual(sessionStore.load(), expectedSession)
    }

    private func makeViewModel(appleProvider: AppleIDTokenProviding) -> AuthViewModel {
        AuthViewModel(
            repository: AuthRepositorySpy(appleOutcome: .unsupported),
            appleProvider: appleProvider,
            oauthProvider: UnconfiguredSupabaseOAuthProvider(),
            passkeyProvider: UnsupportedPasskeyProvider(),
            sessionManager: SessionManager(store: InMemorySecureSessionStore())
        )
    }
}

private final class AppleProviderStub: AppleIDTokenProviding {
    let isConfigured: Bool
    private let idToken: String
    private(set) var receivedNonce: String?

    init(isConfigured: Bool, idToken: String = "unused") {
        self.isConfigured = isConfigured
        self.idToken = idToken
    }

    @MainActor func getIDToken(rawNonce: String) async -> AppleIDTokenResult {
        receivedNonce = rawNonce
        return isConfigured
            ? .token(idToken: idToken, rawNonce: rawNonce)
            : .unavailable
    }
}

private final class AuthRepositorySpy: AuthRepository {
    struct AppleCall: Equatable {
        let idToken: String
        let rawNonce: String
    }

    private let appleOutcome: AuthOutcome
    private(set) var appleCalls: [AppleCall] = []

    init(appleOutcome: AuthOutcome) {
        self.appleOutcome = appleOutcome
    }

    func requestEmailOtp(email: String) async -> AuthOutcome { .unsupported }
    func verifyEmailOtp(email: String, code: String) async -> AuthOutcome { .unsupported }

    func signInWithAppleIDToken(idToken: String, rawNonce: String) async -> AuthOutcome {
        appleCalls.append(AppleCall(idToken: idToken, rawNonce: rawNonce))
        return appleOutcome
    }

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
