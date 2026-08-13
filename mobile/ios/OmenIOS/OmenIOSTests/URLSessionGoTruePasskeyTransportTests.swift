import Foundation
import XCTest
@testable import Omen

final class URLSessionGoTruePasskeyTransportTests: XCTestCase {
    override func tearDown() {
        URLProtocolStub.handler = nil
        super.tearDown()
    }

    func testAuthenticationOptionsDecodeServerWebAuthnShape() async {
        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/auth/v1/passkeys/authentication/options")
            XCTAssertEqual(request.httpMethod, "POST")
            return (200, Self.authenticationOptionsJSON)
        }

        let result = await makeTransport().startPasskeyAuthentication()

        guard case .options(let options) = result else { XCTFail("expected options"); return }
        XCTAssertEqual(options.challengeID, "challenge-id")
        XCTAssertEqual(options.relyingPartyID, "slopssaloon.com")
        XCTAssertEqual(options.challenge, Data([1, 2, 3]))
        XCTAssertEqual(options.userVerification, "preferred")
    }

    func testAuthenticationVerificationSendsW3CShapeAndReturnsSession() async {
        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/auth/v1/passkeys/authentication/verify")
            let body = try XCTUnwrap(request.bodyData)
            let json = try XCTUnwrap(JSONSerialization.jsonObject(with: body) as? [String: Any])
            XCTAssertEqual(json["challenge_id"] as? String, "challenge-id")
            let credential = try XCTUnwrap(json["credential"] as? [String: Any])
            XCTAssertEqual(credential["type"] as? String, "public-key")
            XCTAssertEqual(credential["id"] as? String, "credential-id")
            let response = try XCTUnwrap(credential["response"] as? [String: Any])
            XCTAssertEqual(response["clientDataJSON"] as? String, "client-data")
            XCTAssertEqual(response["authenticatorData"] as? String, "auth-data")
            XCTAssertEqual(response["signature"] as? String, "signature")
            XCTAssertEqual(response["userHandle"] as? String, "user-handle")
            return (200, Self.sessionJSON)
        }

        let result = await makeTransport().verifyPasskeyAuthentication(
            challengeID: "challenge-id",
            assertion: PasskeyResult.Assertion(
                credentialID: "credential-id",
                clientDataJSON: "client-data",
                authenticatorData: "auth-data",
                signature: "signature",
                userHandle: "user-handle"
            )
        )

        XCTAssertEqual(
            result,
            .sessionTokens(userID: "user-id", accessToken: "access", refreshToken: "refresh", expiresInSeconds: 3600)
        )
    }

    func testRegistrationOptionsUseUserAccessTokenAndDecodeServerShape() async {
        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.url?.path, "/auth/v1/passkeys/registration/options")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer user-access-token")
            return (200, Self.registrationOptionsJSON)
        }

        let result = await makeTransport().startPasskeyRegistration(accessToken: "user-access-token")

        guard case .options(let options) = result else { XCTFail("expected options"); return }
        XCTAssertEqual(options.challengeID, "registration-id")
        XCTAssertEqual(options.relyingPartyID, "slopssaloon.com")
        XCTAssertEqual(options.challenge, Data([1, 2, 3]))
        XCTAssertEqual(options.userID, Data([4, 5, 6]))
        XCTAssertEqual(options.userName, "user@example.com")
    }

    func testPasskeyListDecodesPublicMetadataOnly() async {
        URLProtocolStub.handler = { request in
            XCTAssertEqual(request.httpMethod, "GET")
            XCTAssertEqual(request.url?.path, "/auth/v1/passkeys")
            return (200, Self.passkeyListJSON)
        }

        let result = await makeTransport().listPasskeys(accessToken: "user-access-token")

        guard case .passkeys(let passkeys) = result else { XCTFail("expected passkeys"); return }
        XCTAssertEqual(passkeys.count, 1)
        XCTAssertEqual(passkeys[0].id, "00000000-0000-0000-0000-000000000001")
        XCTAssertEqual(passkeys[0].friendlyName, "iCloud Keychain")
    }

    private func makeTransport() -> URLSessionGoTrueTransport {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]
        return URLSessionGoTrueTransport(
            supabaseURL: URL(string: "https://project.supabase.co")!,
            anonKey: "public-anon-key",
            session: URLSession(configuration: configuration)
        )
    }

    private static let authenticationOptionsJSON = Data(#"""
    {
      "challenge_id":"challenge-id",
      "options":{"challenge":"AQID","rpId":"slopssaloon.com","userVerification":"preferred"},
      "expires_at":9999999999
    }
    """#.utf8)

    private static let registrationOptionsJSON = Data(#"""
    {
      "challenge_id":"registration-id",
      "options":{
        "challenge":"AQID",
        "rp":{"id":"slopssaloon.com","name":"Omen"},
        "user":{"id":"BAUG","name":"user@example.com","displayName":"Omen User"},
        "authenticatorSelection":{"userVerification":"preferred"}
      },
      "expires_at":9999999999
    }
    """#.utf8)

    private static let sessionJSON = Data(#"""
    {
      "access_token":"access",
      "refresh_token":"refresh",
      "expires_in":3600,
      "user":{"id":"user-id"}
    }
    """#.utf8)

    private static let passkeyListJSON = Data(#"""
    [{
      "id":"00000000-0000-0000-0000-000000000001",
      "friendly_name":"iCloud Keychain",
      "created_at":"2026-08-12T20:00:00.000Z",
      "last_used_at":null
    }]
    """#.utf8)
}

private final class URLProtocolStub: URLProtocol {
    static var handler: ((URLRequest) throws -> (status: Int, body: Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        do {
            let result = try XCTUnwrap(Self.handler)(request)
            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: result.status,
                httpVersion: "HTTP/1.1",
                headerFields: ["Content-Type": "application/json"]
            )!
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: result.body)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}

private extension URLRequest {
    var bodyData: Data? {
        if let httpBody { return httpBody }
        guard let httpBodyStream else { return nil }

        httpBodyStream.open()
        defer { httpBodyStream.close() }

        var body = Data()
        var buffer = [UInt8](repeating: 0, count: 1024)
        while httpBodyStream.hasBytesAvailable {
            let count = httpBodyStream.read(&buffer, maxLength: buffer.count)
            guard count >= 0 else { return nil }
            if count == 0 { break }
            body.append(buffer, count: count)
        }
        return body
    }
}
