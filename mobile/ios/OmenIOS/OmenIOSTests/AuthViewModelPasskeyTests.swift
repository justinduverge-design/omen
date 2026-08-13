import Combine
import XCTest
@testable import Omen

@MainActor
final class AuthViewModelPasskeyTests: XCTestCase {
    func testPasskeyAvailabilityFollowsProviderSupport() {
        XCTAssertFalse(makeViewModel(provider: PasskeyProviderStub(isSupported: false)).passkeySignInAvailable)
        XCTAssertTrue(makeViewModel(provider: PasskeyProviderStub(isSupported: true)).passkeySignInAvailable)
    }

    func testPasskeyHappyPathVerifiesChallengeAndAuthenticates() async {
        let expectedSession = Session(
            userID: "passkey-user",
            accessToken: "access-token",
            refreshToken: "refresh-token",
            expiresAtEpochSeconds: 9_999
        )
        let repository = PasskeyRepositorySpy(signInOutcome: .success(session: expectedSession))
        let provider = PasskeyProviderStub(isSupported: true)
        let store = InMemorySecureSessionStore()
        let sessionManager = SessionManager(store: store, nowEpochSeconds: { 1_000 })
        let viewModel = AuthViewModel(
            repository: repository,
            appleProvider: UnconfiguredAppleIDTokenProvider(),
            oauthProvider: UnconfiguredSupabaseOAuthProvider(),
            passkeyProvider: provider,
            sessionManager: sessionManager
        )
        let authenticated = expectation(description: "Passkey sign-in reaches authenticated")
        var cancellables = Set<AnyCancellable>()

        viewModel.$flowState
            .sink { state in
                if state == .authenticated(session: expectedSession) { authenticated.fulfill() }
            }
            .store(in: &cancellables)

        viewModel.signInWithPasskey()
        await fulfillment(of: [authenticated], timeout: 1.0)

        XCTAssertEqual(provider.authenticationOptions, repository.authenticationOptions)
        XCTAssertEqual(repository.signInChallengeID, repository.authenticationOptions.challengeID)
        XCTAssertEqual(repository.signInAssertion?.credentialID, "credential-id")
        XCTAssertEqual(sessionManager.state, .signedIn(userID: expectedSession.userID))
        XCTAssertEqual(store.load(), expectedSession)
    }

    func testRegisterPasskeyRefreshesAccountMetadata() async {
        let existing = Session(
            userID: "passkey-user",
            accessToken: "access-token",
            refreshToken: "refresh-token",
            expiresAtEpochSeconds: 9_999
        )
        let passkey = PasskeyInfo(
            id: "00000000-0000-0000-0000-000000000001",
            friendlyName: "iCloud Keychain",
            createdAt: Date(timeIntervalSince1970: 1_000),
            lastUsedAt: nil
        )
        let repository = PasskeyRepositorySpy(
            signInOutcome: .unsupported,
            registerOutcome: .success(session: existing),
            listedPasskeys: [passkey]
        )
        let provider = PasskeyProviderStub(isSupported: true)
        let store = InMemorySecureSessionStore(initial: existing)
        let viewModel = AuthViewModel(
            repository: repository,
            appleProvider: UnconfiguredAppleIDTokenProvider(),
            oauthProvider: UnconfiguredSupabaseOAuthProvider(),
            passkeyProvider: provider,
            sessionManager: SessionManager(store: store, nowEpochSeconds: { 1_000 })
        )
        let refreshed = expectation(description: "Registered passkey appears in account metadata")
        var cancellables = Set<AnyCancellable>()

        viewModel.$passkeys
            .dropFirst()
            .sink { passkeys in
                if passkeys == [passkey] { refreshed.fulfill() }
            }
            .store(in: &cancellables)

        viewModel.registerPasskey()
        await fulfillment(of: [refreshed], timeout: 1.0)

        XCTAssertEqual(provider.registrationOptions, repository.registrationOptions)
        XCTAssertEqual(repository.registrationChallengeID, repository.registrationOptions.challengeID)
        XCTAssertEqual(repository.registrationCredential?.credentialID, "credential-id")
        XCTAssertEqual(viewModel.passkeyManagementState, .idle)
    }

    private func makeViewModel(provider: PasskeyProvider) -> AuthViewModel {
        AuthViewModel(
            repository: PasskeyRepositorySpy(signInOutcome: .unsupported),
            appleProvider: UnconfiguredAppleIDTokenProvider(),
            oauthProvider: UnconfiguredSupabaseOAuthProvider(),
            passkeyProvider: provider,
            sessionManager: SessionManager(store: InMemorySecureSessionStore())
        )
    }
}

@MainActor
private final class PasskeyProviderStub: PasskeyProvider {
    let isSupported: Bool
    private(set) var authenticationOptions: PasskeyAuthenticationOptions?
    private(set) var registrationOptions: PasskeyRegistrationOptions?

    init(isSupported: Bool) { self.isSupported = isSupported }

    func getAssertion(options: PasskeyAuthenticationOptions) async -> PasskeyResult {
        authenticationOptions = options
        return .assertion(PasskeyResult.Assertion(
            credentialID: "credential-id",
            clientDataJSON: "client-data",
            authenticatorData: "authenticator-data",
            signature: "signature",
            userHandle: "user-handle"
        ))
    }

    func register(options: PasskeyRegistrationOptions) async -> PasskeyRegistrationResult {
        registrationOptions = options
        return .credential(PasskeyRegistrationResult.Credential(
            credentialID: "credential-id",
            clientDataJSON: "client-data",
            attestationObject: "attestation"
        ))
    }
}

private final class PasskeyRepositorySpy: AuthRepository {
    let authenticationOptions = PasskeyAuthenticationOptions(
        challengeID: "authentication-challenge-id",
        relyingPartyID: "slopssaloon.com",
        challenge: Data("challenge".utf8),
        userVerification: "preferred"
    )
    let registrationOptions = PasskeyRegistrationOptions(
        challengeID: "registration-challenge-id",
        relyingPartyID: "slopssaloon.com",
        challenge: Data("challenge".utf8),
        userID: Data("passkey-user".utf8),
        userName: "passkey-user",
        displayName: "Passkey User",
        userVerification: "preferred"
    )

    private let signInOutcome: AuthOutcome
    private let registerOutcome: AuthOutcome
    private let listedPasskeys: [PasskeyInfo]
    private(set) var signInChallengeID: String?
    private(set) var signInAssertion: PasskeyResult.Assertion?
    private(set) var registrationChallengeID: String?
    private(set) var registrationCredential: PasskeyRegistrationResult.Credential?

    init(
        signInOutcome: AuthOutcome,
        registerOutcome: AuthOutcome = .unsupported,
        listedPasskeys: [PasskeyInfo] = []
    ) {
        self.signInOutcome = signInOutcome
        self.registerOutcome = registerOutcome
        self.listedPasskeys = listedPasskeys
    }

    func requestEmailOtp(email: String) async -> AuthOutcome { .unsupported }
    func verifyEmailOtp(email: String, code: String) async -> AuthOutcome { .unsupported }
    func signInWithAppleIDToken(idToken: String, rawNonce: String) async -> AuthOutcome { .unsupported }
    func refresh() async -> AuthOutcome { .needsReauth }
    func exchangeOAuthCode(providerId: String, code: String, codeVerifier: String) async -> AuthOutcome { .unsupported }
    func startPasskeyAuthentication() async -> PasskeyStartResult<PasskeyAuthenticationOptions> { .ready(authenticationOptions) }

    func signInWithPasskey(challengeID: String, assertion: PasskeyResult.Assertion) async -> AuthOutcome {
        signInChallengeID = challengeID
        signInAssertion = assertion
        return signInOutcome
    }

    func startPasskeyRegistration() async -> PasskeyStartResult<PasskeyRegistrationOptions> { .ready(registrationOptions) }

    func registerPasskey(challengeID: String, credential: PasskeyRegistrationResult.Credential) async -> AuthOutcome {
        registrationChallengeID = challengeID
        registrationCredential = credential
        return registerOutcome
    }

    func listPasskeys() async -> PasskeyListOutcome { .success(listedPasskeys) }
    func deletePasskey(id: String) async -> PasskeyManagementOutcome { .success }
    func signOut() async {}
}
