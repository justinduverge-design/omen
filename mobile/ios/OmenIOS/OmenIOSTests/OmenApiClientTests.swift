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

    // MARK: - Query strings
    //
    // This has shipped wrong twice. Once in player search (`search?q=x` became `search%3Fq=x`),
    // and again on 2026-09-04 in the league carousel, where every page told the user "Omen
    // couldn't read this league's week" while the server answered 200 to the same request made
    // correctly. Both times the cause was a query string built into `path` and then run through
    // `appendingPathComponent`, which treats it as a single path segment.

    func testAnAuthenticatedGetPutsQueryItemsInTheQueryNotThePath() async throws {
        let fetcher = StubFetcher(result: .success((Data(#"{"ok":true}"#.utf8), response(200))))

        _ = await client(fetcher).get(
            "api/league/overview",
            accessToken: "t",
            query: ["platform": "espn", "leagueId": "13338821"],
            as: Payload.self
        )

        let url = try XCTUnwrap(fetcher.captured?.url)
        let components = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false))
        XCTAssertEqual(components.path, "/api/league/overview")
        XCTAssertEqual(components.queryItems?.first(where: { $0.name == "platform" })?.value, "espn")
        XCTAssertEqual(components.queryItems?.first(where: { $0.name == "leagueId" })?.value, "13338821")
        // The failure mode, named so a regression is unmistakable in the diff.
        XCTAssertFalse(url.absoluteString.contains("%3F"), "the ? was encoded into the path again")
    }

    func testAnEmptyQueryLeavesTheURLUntouched() async throws {
        let fetcher = StubFetcher(result: .success((Data(#"{"ok":true}"#.utf8), response(200))))

        _ = await client(fetcher).get("api/league/overview", accessToken: "t", as: Payload.self)

        let url = try XCTUnwrap(fetcher.captured?.url)
        // No stray "?" for the callers that pass nothing — every pre-existing GET is one.
        XCTAssertEqual(url.absoluteString.hasSuffix("/api/league/overview"), true)
    }

    /// A Yahoo league key is `nfl.l.12345`, and ESPN ids are numeric, but a provider is free to
    /// hand us something that needs escaping. `URLQueryItem` handles it; string building did not.
    func testALeagueIdNeedingEscapingSurvivesTheRoundTrip() async throws {
        let fetcher = StubFetcher(result: .success((Data(#"{"ok":true}"#.utf8), response(200))))

        _ = await client(fetcher).get(
            "api/league/overview",
            accessToken: "t",
            query: ["platform": "yahoo", "leagueId": "470.l.1358570"],
            as: Payload.self
        )

        let url = try XCTUnwrap(fetcher.captured?.url)
        let components = try XCTUnwrap(URLComponents(url: url, resolvingAgainstBaseURL: false))
        XCTAssertEqual(components.queryItems?.first(where: { $0.name == "leagueId" })?.value, "470.l.1358570")
    }
}
