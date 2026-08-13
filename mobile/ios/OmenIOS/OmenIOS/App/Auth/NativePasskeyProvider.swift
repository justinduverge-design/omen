import AuthenticationServices
import Foundation
import UIKit

/// Native iOS passkey ceremony. Supabase supplies the RP ID and W3C options; Authentication
/// Services owns the private key and biometric prompt. Omen only forwards the resulting opaque,
/// base64url-encoded credential to Supabase and never logs or persists it.
@MainActor
final class NativePasskeyProvider: PasskeyProvider {
    var isSupported: Bool {
        #if targetEnvironment(simulator)
        false
        #else
        true
        #endif
    }

    func getAssertion(options: PasskeyAuthenticationOptions) async -> PasskeyResult {
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
            relyingPartyIdentifier: options.relyingPartyID
        )
        let request = provider.createCredentialAssertionRequest(challenge: options.challenge)
        request.userVerificationPreference = Self.userVerificationPreference(options.userVerification)

        do {
            let authorization = try await AuthorizationCeremony().run(request: request)
            guard let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion else {
                return .failed
            }
            return .assertion(PasskeyResult.Assertion(
                credentialID: credential.credentialID.base64URLEncodedString,
                clientDataJSON: credential.rawClientDataJSON.base64URLEncodedString,
                authenticatorData: credential.rawAuthenticatorData.base64URLEncodedString,
                signature: credential.signature.base64URLEncodedString,
                userHandle: credential.userID.isEmpty ? nil : credential.userID.base64URLEncodedString
            ))
        } catch {
            return Self.authenticationResult(for: error)
        }
    }

    func register(options: PasskeyRegistrationOptions) async -> PasskeyRegistrationResult {
        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(
            relyingPartyIdentifier: options.relyingPartyID
        )
        let request = provider.createCredentialRegistrationRequest(
            challenge: options.challenge,
            name: options.userName,
            userID: options.userID
        )
        request.displayName = options.displayName
        request.userVerificationPreference = Self.userVerificationPreference(options.userVerification)

        do {
            let authorization = try await AuthorizationCeremony().run(request: request)
            guard let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialRegistration else {
                return .failed
            }
            return .credential(PasskeyRegistrationResult.Credential(
                credentialID: credential.credentialID.base64URLEncodedString,
                clientDataJSON: credential.rawClientDataJSON.base64URLEncodedString,
                attestationObject: (credential.rawAttestationObject ?? Data()).base64URLEncodedString
            ))
        } catch {
            return Self.registrationResult(for: error)
        }
    }

    private static func userVerificationPreference(_ value: String?) -> ASAuthorizationPublicKeyCredentialUserVerificationPreference {
        switch value {
        case "required": return .required
        case "discouraged": return .discouraged
        default: return .preferred
        }
    }

    private static func authenticationResult(for error: Error) -> PasskeyResult {
        guard let authError = error as? ASAuthorizationError else { return .failed }
        switch authError.code {
        case .canceled: return .canceled
        case .notHandled: return .noCredential
        case .notInteractive: return .unavailable
        default: return .failed
        }
    }

    private static func registrationResult(for error: Error) -> PasskeyRegistrationResult {
        guard let authError = error as? ASAuthorizationError else { return .failed }
        switch authError.code {
        case .canceled: return .canceled
        case .notHandled, .notInteractive: return .unavailable
        default: return .failed
        }
    }
}

@MainActor
private final class AuthorizationCeremony: NSObject, ASAuthorizationControllerDelegate,
    ASAuthorizationControllerPresentationContextProviding
{
    private var continuation: CheckedContinuation<ASAuthorization, Error>?
    private var controller: ASAuthorizationController?
    private var selfRetain: AuthorizationCeremony?

    func run(request: ASAuthorizationRequest) async throws -> ASAuthorization {
        try await withCheckedThrowingContinuation { continuation in
            self.continuation = continuation
            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = self
            controller.presentationContextProvider = self
            self.controller = controller
            selfRetain = self
            controller.performRequests()
        }
    }

    func authorizationController(
        controller: ASAuthorizationController,
        didCompleteWithAuthorization authorization: ASAuthorization
    ) {
        finish(.success(authorization))
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        finish(.failure(error))
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        return scenes.first(where: { $0.activationState == .foregroundActive })?
            .windows.first(where: { $0.isKeyWindow })
            ?? scenes.first?.windows.first
            ?? ASPresentationAnchor()
    }

    private func finish(_ result: Result<ASAuthorization, Error>) {
        continuation?.resume(with: result)
        continuation = nil
        controller = nil
        selfRetain = nil
    }
}

private extension Data {
    var base64URLEncodedString: String {
        base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
