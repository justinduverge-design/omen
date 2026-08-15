import XCTest
@testable import Omen

/// M5-Native-API-Client slice A — transport behavior.
final class OmenApiClientTests: XCTestCase {
    private struct Payload: Decodable, Equatable { let ok: Bool }

    /// Records the request it was handed so tests can assert on headers without a network.
    private final class StubFetcher: OmenHTTPFetching {
        var captured: URLRequest?
        var result: Result<(Data, URLResponse), Error>

        init(result: Result<(Data, URLResponse), Error>) { self.result = result }

        func data(for request: URLRequest) async throws -> (Data, URLResponse) {
            captured = request
            return try result.get()
        }
    }

    private func response(_ status: Int) -> HTTPURLResponse {
        HTTPURLResponse(
            url: URL(string: "https://example.invalid/api/dashboard/summary")!,
            statusCode: status,
            httpVersion: nil,
            headerFields: nil
        )!
    }

    private func client(_ fetcher: OmenHTTPFetching) -> OmenApiClient {
        OmenApiClient(baseURL: URL(string: "https://example.invalid")!, fetcher: fetcher)
    }

    func testSendsBearerTokenAndAcceptHeader() async {
        let fetcher = StubFetcher(result: .success((Data(#"{"ok":true}"#.utf8), response(200))))
        _ = await client(fetcher).get("api/dashboard/summary", accessToken: "token-123", as: Payload.self)

        XCTAssertEqual(fetcher.captured?.value(forHTTPHeaderField: "Authorization"), "Bearer token-123")
        XCTAssertEqual(fetcher.captured?.value(forHTTPHeaderField: "Accept"), "application/json")
        XCTAssertEqual(fetcher.captured?.httpMethod, "GET")
        XCTAssertEqual(fetcher.captured?.url?.absoluteString, "https://example.invalid/api/dashboard/summary")
    }

    /// A token must never be reachable through the URL — it would land in server logs and
    /// in any crash report that captures the request line.
    func testNeverPlacesTokenInTheURL() async {
        let fetcher = StubFetcher(result: .success((Data(#"{"ok":true}"#.utf8), response(200))))
        _ = await client(fetcher).get("api/dashboard/summary", accessToken: "token-123", as: Payload.self)

        XCTAssertFalse(fetcher.captured?.url?.absoluteString.contains("token-123") ?? true)
    }

    func testDecodesSuccessfulPayload() async {
        let fetcher = StubFetcher(result: .success((Data(#"{"ok":true}"#.utf8), response(200))))
        let result = await client(fetcher).get("api/dashboard/summary", accessToken: "t", as: Payload.self)

        XCTAssertEqual(try? result.get(), Payload(ok: true))
    }

    func testMapsUnauthorizedStatuses() async {
        for status in [401, 403] {
            let fetcher = StubFetcher(result: .success((Data(), response(status))))
            let result = await client(fetcher).get("api/dashboard/summary", accessToken: "t", as: Payload.self)

            guard case .failure(let error) = result else { return XCTFail("expected failure for \(status)") }
            XCTAssertEqual(error, .unauthorized)
        }
    }

    func testMapsServerErrorAndCarriesStatus() async {
        let fetcher = StubFetcher(result: .success((Data(), response(503))))
        let result = await client(fetcher).get("api/dashboard/summary", accessToken: "t", as: Payload.self)

        guard case .failure(let error) = result else { return XCTFail("expected failure") }
        XCTAssertEqual(error, .server(status: 503))
    }

    func testMapsTransportFailureToNetwork() async {
        let fetcher = StubFetcher(result: .failure(URLError(.notConnectedToInternet)))
        let result = await client(fetcher).get("api/dashboard/summary", accessToken: "t", as: Payload.self)

        guard case .failure(let error) = result else { return XCTFail("expected failure") }
        XCTAssertEqual(error, .network)
    }

    /// A 200 carrying an unreadable body is a decode failure, not a silent empty success —
    /// an empty state would read to the user as "you have no leagues."
    func testMapsUnreadableSuccessBodyToDecode() async {
        let fetcher = StubFetcher(result: .success((Data(#"{"unexpected":1}"#.utf8), response(200))))
        let result = await client(fetcher).get("api/dashboard/summary", accessToken: "t", as: Payload.self)

        guard case .failure(let error) = result else { return XCTFail("expected failure") }
        XCTAssertEqual(error, .decode)
    }

    func testPostSendsJSONBodyAndContentType() async {
        let fetcher = StubFetcher(result: .success((Data(#"{"ok":true}"#.utf8), response(200))))
        _ = await client(fetcher).post("api/omen/mvp-move", accessToken: "t", as: Payload.self)

        XCTAssertEqual(fetcher.captured?.httpMethod, "POST")
        XCTAssertEqual(fetcher.captured?.value(forHTTPHeaderField: "Content-Type"), "application/json")
        XCTAssertEqual(fetcher.captured?.httpBody, Data("{}".utf8))
    }
}
