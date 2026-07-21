import AuthenticationServices
import CryptoKit
import Foundation
import UIKit

/// Production `AppleIDTokenProviding` using `ASAuthorizationController` directly (App layer,
/// needs `AuthenticationServices`). Wraps the delegate-based API in `async/await` so callers can
/// `await` a single `AppleIDTokenResult` the same way they `await` a `GoTrueTransport` call.
final class NativeAppleIDTokenProvider: AppleIDTokenProviding {
    let isConfigured = true

    private var activeDelegate: Delegate?

    func getIDToken(rawNonce: String) async -> AppleIDTokenResult {
        await withCheckedContinuation { continuation in
            let delegate = Delegate(rawNonce: rawNonce, continuation: continuation)
            activeDelegate = delegate

            let provider = ASAuthorizationAppleIDProvider()
            let request = provider.createRequest()
            request.requestedScopes = [.email]
            request.nonce = Self.sha256(rawNonce)

            let controller = ASAuthorizationController(authorizationRequests: [request])
            controller.delegate = delegate
            controller.presentationContextProvider = delegate
            controller.performRequests()
        }
    }

    private static func sha256(_ input: String) -> String {
        let hashed = SHA256.hash(data: Data(input.utf8))
        return hashed.compactMap { String(format: "%02x", $0) }.joined()
    }

    private final class Delegate: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
        private let rawNonce: String
        private let continuation: CheckedContinuation<AppleIDTokenResult, Never>

        init(rawNonce: String, continuation: CheckedContinuation<AppleIDTokenResult, Never>) {
            self.rawNonce = rawNonce
            self.continuation = continuation
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
            guard
                let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
                let tokenData = credential.identityToken,
                let idToken = String(data: tokenData, encoding: .utf8)
            else {
                continuation.resume(returning: .failed)
                return
            }
            continuation.resume(returning: .token(idToken: idToken, rawNonce: rawNonce))
        }

        func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
            if let authError = error as? ASAuthorizationError, authError.code == .canceled {
                continuation.resume(returning: .canceled)
            } else {
                continuation.resume(returning: .failed)
            }
        }

        func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
            UIApplication.shared.connectedScenes
                .compactMap { ($0 as? UIWindowScene)?.keyWindow }
                .first ?? ASPresentationAnchor()
        }
    }
}
