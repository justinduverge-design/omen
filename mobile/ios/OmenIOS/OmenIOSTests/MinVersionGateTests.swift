import XCTest
@testable import Omen

/// O7 — forced-update gate: below-minimum, at-minimum, and check-unavailable.
final class MinVersionGateTests: XCTestCase {
    private final class StubFetcher: OmenHTTPFetching {
        var result: Result<(Data, URLResponse), Error>
        init(result: Result<(Data, URLResponse), Error>) { self.result = result }
        func data(for request: URLRequest) async throws -> (Data, URLResponse) { try result.get() }
    }

    private final class StubGateChecker: MinVersionGateChecking {
        let result: MinVersionGateResult
        init(_ result: MinVersionGateResult) { self.result = result }
        func check(platform: String, currentVersion: String) async -> MinVersionGateResult { result }
    }

    private func response(_ status: Int) -> HTTPURLResponse {
        HTTPURLResponse(url: URL(string: "https://example.invalid/api/system/min-version")!, statusCode: status, httpVersion: nil, headerFields: nil)!
    }

    private func client(_ fetcher: OmenHTTPFetching) -> MinVersionGateClient {
        MinVersionGateClient(baseURL: URL(string: "https://example.invalid")!, fetcher: fetcher)
    }

    func testBelowMinimumReturnsUpdateRequired() async {
        let body = #"{"status":"update_required","update_required":true,"minimum_version":"1.2.0"}"#
        let fetcher = StubFetcher(result: .success((Data(body.utf8), response(200))))
        let result = await client(fetcher).check(platform: "ios", currentVersion: "1.1.0")

        XCTAssertEqual(result, .updateRequired(minimumVersion: "1.2.0"))
    }

    func testAtMinimumReturnsOk() async {
        let body = #"{"status":"ok","update_required":false,"minimum_version":"1.2.0"}"#
        let fetcher = StubFetcher(result: .success((Data(body.utf8), response(200))))
        let result = await client(fetcher).check(platform: "ios", currentVersion: "1.2.0")

        XCTAssertEqual(result, .ok)
    }

    func testNetworkFailureFailsOpen() async {
        struct AnyError: Error {}
        let fetcher = StubFetcher(result: .failure(AnyError()))
        let result = await client(fetcher).check(platform: "ios", currentVersion: "1.1.0")

        XCTAssertEqual(result, .unavailable)
    }

    func testServerErrorFailsOpen() async {
        let fetcher = StubFetcher(result: .success((Data(), response(500))))
        let result = await client(fetcher).check(platform: "ios", currentVersion: "1.1.0")

        XCTAssertEqual(result, .unavailable)
    }

    func testUndecodablePayloadFailsOpen() async {
        let fetcher = StubFetcher(result: .success((Data("not json".utf8), response(200))))
        let result = await client(fetcher).check(platform: "ios", currentVersion: "1.1.0")

        XCTAssertEqual(result, .unavailable)
    }

    @MainActor
    func testViewModelBlocksOnUpdateRequired() async {
        let viewModel = UpdateGateViewModel(client: StubGateChecker(.updateRequired(minimumVersion: "2.0.0")), currentVersion: "1.0.0")
        await viewModel.check()

        XCTAssertEqual(viewModel.state, .blocked(minimumVersion: "2.0.0"))
    }

    @MainActor
    func testViewModelPassesThroughOnUnavailable() async {
        let viewModel = UpdateGateViewModel(client: StubGateChecker(.unavailable), currentVersion: "1.0.0")
        await viewModel.check()

        XCTAssertEqual(viewModel.state, .passed)
    }

    @MainActor
    func testViewModelPassesThroughOnOk() async {
        let viewModel = UpdateGateViewModel(client: StubGateChecker(.ok), currentVersion: "1.0.0")
        await viewModel.check()

        XCTAssertEqual(viewModel.state, .passed)
    }
}
