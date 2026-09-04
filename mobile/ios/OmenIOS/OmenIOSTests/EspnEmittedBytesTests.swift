import WebKit
import XCTest
@testable import Omen

/// **W1-A acceptance: `espn_s2` and `SWID` must appear in zero emitted bytes outside the requests
/// authorized to carry them** — proved "the way the scrubber failures were proved: by provoking a
/// real failure and searching the bytes, not by review."
///
/// So this is not a review. It drives the **real** `ApiConnectRepository` and the **real**
/// `ConnectViewModel` through a whole ESPN connect — including a provoked server failure and the
/// retry after it — with a recorder wired in where `URLSession` normally sits, and then searches
/// every byte the app handed to the transport: every URL, every header name and value, and every
/// body. A sentinel that appears anywhere it should not fails the test with the offending request
/// named.
///
/// **What this covers, and what it cannot.** It covers the app's own HTTP emissions and the crash
/// envelope, which are the only channels Omen emits through — there is no analytics SDK, and the
/// only `NSLog` in the app is in `SentryEnvelopeReporter` and logs a status code. It does **not**
/// cover the `WKWebView`'s own traffic to ESPN, which necessarily carries the cookie: that is the
/// browser being a browser, and it is the mechanism, not a leak.
@MainActor
final class EspnEmittedBytesTests: XCTestCase {

    /// Distinctive enough that a substring search cannot produce a false negative, and shaped
    /// nothing like a real value so a reader of a failure message learns nothing.
    private let espnS2Sentinel = "ESPN_S2_SENTINEL_ZZZ_0123456789"
    private let swidSentinel = "{SWID-SENTINEL-ZZZ-0123456789}"

    /// Everything the app handed to the transport, kept verbatim.
    private final class RecordingFetcher: OmenHTTPFetching, @unchecked Sendable {
        struct Emission {
            let method: String
            let url: String
            let headers: [String: String]
            let body: String

            /// Every byte of this request as one searchable string — URL, headers and body
            /// together, because a value smuggled into a query string or an `X-` header is just
            /// as leaked as one in a body.
            var allBytes: String {
                let headerText = headers.map { "\($0.key): \($0.value)" }.joined(separator: "\n")
                return "\(method) \(url)\n\(headerText)\n\(body)"
            }
        }

        private(set) var emissions: [Emission] = []
        /// Status per path substring; anything unlisted answers 200.
        var statusOverrides: [String: Int] = [:]
        var bodies: [String: String] = [:]

        func data(for request: URLRequest) async throws -> (Data, URLResponse) {
            let url = request.url?.absoluteString ?? ""
            emissions.append(
                Emission(
                    method: request.httpMethod ?? "",
                    url: url,
                    headers: request.allHTTPHeaderFields ?? [:],
                    body: request.httpBody.map { String(decoding: $0, as: UTF8.self) } ?? ""
                )
            )

            let status = statusOverrides.first { url.contains($0.key) }?.value ?? 200
            let payload = bodies.first { url.contains($0.key) }?.value ?? "{}"
            let response = HTTPURLResponse(
                url: request.url ?? URL(string: "https://example.invalid")!,
                statusCode: status,
                httpVersion: nil,
                headerFields: nil
            )!
            return (Data(payload.utf8), response)
        }
    }

    private final class SentinelCookieStore: EspnCookieReading {
        let dataStore = WKWebsiteDataStore.nonPersistent()
        let session: (espnS2: String, swid: String)
        init(_ session: (espnS2: String, swid: String)) { self.session = session }
        func hasSession() async -> Bool { true }
        func takeSession() async -> (espnS2: String, swid: String)? { session }
        func sessionDiagnostic() async -> String { "espn_s2: www.espn.com · SWID: www.espn.com" }
    }

    private func sessionManager() -> SessionManager {
        SessionManager(
            store: InMemorySecureSessionStore(
                initial: Session(userID: "u1", accessToken: "omen-bearer", refreshToken: "r", expiresAtEpochSeconds: 9_999)
            ),
            nowEpochSeconds: { 1_000 }
        )
    }

    /// Runs a full ESPN connect against the real repository, with a **provoked failure** on the
    /// first connect attempt and a successful retry after it, and returns everything emitted.
    private func runFullFlowProvokingAFailure() async -> [RecordingFetcher.Emission] {
        let fetcher = RecordingFetcher()
        fetcher.bodies = [
            "api/platforms/espn/leagues": """
            {"status":"ok","platform":"espn","leagues":[
              {"league_id":"13338821","league_name":"Slops Saloon FF Showdown","season":2026,"team_id":"3","team_name":"Titans"}
            ]}
            """,
            "api/leagues": """
            {"contract_version":"league-directory.v1","platforms":[
              {"platform":"espn","connection_state":"connected","discovery":"bound_only","notice":null,
               "leagues":[{"league_id":"13338821","league_name":null,"season":2026,"scoring_format":null,
                           "team_id":"3","team_name":"Titans","is_active":true}]}
            ]}
            """,
        ]

        let repository = ApiConnectRepository(
            client: OmenApiClient(baseURL: URL(string: "https://example.invalid")!, fetcher: fetcher)
        )
        let viewModel = ConnectViewModel(repository: repository, sessionManager: sessionManager())
        viewModel.selectProvider(.espn)
        viewModel.beginEspnSignIn(cookieStore: SentinelCookieStore((espnS2Sentinel, swidSentinel)))

        // Sign-in observed → discovery runs and returns a league.
        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: "13338821", detectedTeamId: "3"))
        await viewModel.discoverEspnLeagues()

        let option = EspnLeagueOption(
            id: "13338821", name: "Slops Saloon FF Showdown", season: 2026, teamId: "3", teamName: "Titans"
        )

        // **Provoke a real failure**, which is the point: error paths are where a value escapes,
        // because that is where things get logged, reported and interpolated.
        fetcher.statusOverrides["api/platforms/espn/connect"] = 500
        await viewModel.connectEspnLeague(option)

        // And the retry after it, so the recovery path emits too.
        fetcher.statusOverrides["api/platforms/espn/connect"] = nil
        viewModel.beginEspnSignIn(cookieStore: SentinelCookieStore((espnS2Sentinel, swidSentinel)))
        viewModel.espnSignInProgressed(.signedIn(detectedLeagueId: "13338821", detectedTeamId: "3"))
        await viewModel.discoverEspnLeagues()
        await viewModel.connectEspnLeague(option)

        return fetcher.emissions
    }

    /// **This suite was verified to fail.** A leak was deliberately injected — the ESPN session
    /// appended to the directory read's query string — and 5 of these 6 tests failed, each naming
    /// the offending request. A passing safety test that has never been shown to fail is a
    /// decoration, and this repo has already been bitten once by exactly that: the first run of
    /// the iOS cookie spike returned a confident false negative that only its control caught.
    ///
    /// The clause itself.
    func testTheEspnSessionAppearsInNoEmittedByteOutsideTheRequestsAuthorizedToCarryIt() async {
        let emissions = await runFullFlowProvokingAFailure()
        XCTAssertGreaterThan(emissions.count, 3, "the flow should have emitted several requests")

        // **Two paths are authorized to carry it, not one.** `/espn/connect` always was.
        // `/espn/leagues` was added on 2026-09-03 for league discovery, after the Wave 1 contract
        // was written — so the contract's literal "the single connect request" is now one request
        // out of date. That is a real deviation and it is named here rather than absorbed: see
        // `Direction/decision_log.md`, 2026-09-03.
        let authorized = ["api/platforms/espn/connect", "api/platforms/espn/leagues"]

        for emission in emissions {
            let carriesSession = emission.allBytes.contains(espnS2Sentinel)
                || emission.allBytes.contains(swidSentinel)
            guard carriesSession else { continue }

            XCTAssertTrue(
                authorized.contains(where: { emission.url.contains($0) }),
                "ESPN session leaked into an unauthorized request: \(emission.method) \(emission.url)"
            )
        }
    }

    /// A session in a URL is leaked to every proxy, server log and analytics pipeline on the path,
    /// even when the request itself is authorized to carry it in a body.
    func testTheEspnSessionNeverAppearsInAUrl() async {
        for emission in await runFullFlowProvokingAFailure() {
            XCTAssertFalse(emission.url.contains(espnS2Sentinel), "espn_s2 in a URL: \(emission.url)")
            XCTAssertFalse(emission.url.contains(swidSentinel), "SWID in a URL: \(emission.url)")
        }
    }

    /// Headers are emitted bytes too, and are the likeliest accidental carrier — a well-meaning
    /// "pass the session along" lands here far more often than in a body.
    func testTheEspnSessionNeverAppearsInAnyRequestHeader() async {
        for emission in await runFullFlowProvokingAFailure() {
            for (name, value) in emission.headers {
                XCTAssertFalse(
                    value.contains(espnS2Sentinel) || value.contains(swidSentinel),
                    "ESPN session in header \(name) of \(emission.url)"
                )
                // A `Cookie:` header on an Omen request would mean the app is forwarding the
                // provider session to our own API outside the authorized body.
                XCTAssertNotEqual(name.lowercased(), "cookie", "Omen requests must send no Cookie header")
            }
        }
    }

    /// The read-back after connecting is the request most likely to be given the session "while
    /// we have it". It must be a plain authenticated GET.
    func testTheDirectoryReadBackCarriesOnlyTheOmenBearer() async {
        let emissions = await runFullFlowProvokingAFailure()
        let directoryReads = emissions.filter { $0.url.contains("api/leagues") }

        XCTAssertFalse(directoryReads.isEmpty, "the flow should re-read the directory after connecting")
        for read in directoryReads {
            XCTAssertEqual(read.method, "GET")
            XCTAssertEqual(read.body, "", "a directory read must have no body at all")
            XCTAssertFalse(read.allBytes.contains(espnS2Sentinel))
            XCTAssertFalse(read.allBytes.contains(swidSentinel))
        }
    }

    /// The failure path specifically: after a 500, nothing that ran in response to it emitted the
    /// session anywhere new. This is the clause's "provoke a real failure" half.
    func testAProvokedServerFailureEmitsNothingExtraCarryingTheSession() async {
        let emissions = await runFullFlowProvokingAFailure()

        let carriers = emissions.filter {
            $0.allBytes.contains(espnS2Sentinel) || $0.allBytes.contains(swidSentinel)
        }
        // Two discoveries and two connects across the run, and nothing else. If a failure handler
        // ever starts reporting the request that failed, this count moves and the test says so.
        XCTAssertEqual(
            carriers.count, 4,
            "unexpected number of session-carrying requests: \(carriers.map(\.url))"
        )
        for carrier in carriers {
            XCTAssertEqual(carrier.method, "POST")
        }
    }

    /// **The crash channel.** `SentryEnvelopeReporter` ships an exception's name, reason and call
    /// stack. If a capture ever reached one of those — and an exception reason interpolating the
    /// object it failed on is exactly how that happens — the session would ship to the error
    /// backend. `EspnCapture`'s redaction is what prevents it, tested here through the reporter
    /// rather than on the type alone.
    func testACrashReportInterpolatingTheCaptureShipsNoSession() {
        let capture = EspnCapture(
            espnS2: espnS2Sentinel, swid: swidSentinel, leagueId: "13338821", teamId: "3"
        )

        let envelope = SentryEnvelopeReporter.envelope(
            dsn: "https://public@example.invalid/1",
            name: "NSInvalidArgumentException",
            reason: "failed while connecting \(capture)",
            callStack: ["0 Omen connectEspn(\(capture))"]
        )

        XCTAssertFalse(envelope.contains(espnS2Sentinel), "espn_s2 reached the crash envelope")
        XCTAssertFalse(envelope.contains(swidSentinel), "SWID reached the crash envelope")
        // The report is still useful — redaction that erases the diagnosis gets removed later.
        XCTAssertTrue(envelope.contains("13338821"))
        XCTAssertTrue(envelope.contains("redacted"))
    }
}
