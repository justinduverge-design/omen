import XCTest
@testable import Omen

/// O6 iOS half — envelope construction. Kotlin twin: `SentryEnvelopeReporterTest.kt`.
///
/// These prove the wire format and the PII boundary. They cannot prove ingestion — that needs
/// a real crash against the live project, recorded separately in the handoff.
final class SentryEnvelopeReporterTests: XCTestCase {
    private let dsn = "https://abc123@o4509.ingest.us.sentry.io/4510"

    func testIngestURLBuildsTheEnvelopeEndpointFromTheDSN() {
        XCTAssertEqual(
            SentryEnvelopeReporter.ingestURL(dsn: dsn)?.absoluteString,
            "https://o4509.ingest.us.sentry.io/api/4510/envelope/"
        )
    }

    /// A blank or malformed DSN must yield nil rather than a URL that posts somewhere wrong.
    func testIngestURLRejectsUnusableDSNs() {
        XCTAssertNil(SentryEnvelopeReporter.ingestURL(dsn: ""))
        XCTAssertNil(SentryEnvelopeReporter.ingestURL(dsn: "not a dsn"))
        XCTAssertNil(SentryEnvelopeReporter.ingestURL(dsn: "https://key@host-with-no-project"))
    }

    func testEnvelopeProducesThreeLinesInTheRequiredOrder() {
        let lines = SentryEnvelopeReporter
            .envelope(dsn: dsn, name: "NSGenericException", reason: "boom", callStack: ["0 Omen 0x1"])
            .split(separator: "\n", omittingEmptySubsequences: false)

        XCTAssertEqual(lines.count, 3)
        XCTAssertTrue(lines[0].contains("\"dsn\""))
        XCTAssertTrue(lines[1].contains("\"type\":\"event\""))
        XCTAssertTrue(lines[2].contains("\"exception\""))
    }

    /// Sentry rejects an envelope whose item-header length disagrees with the payload, so this
    /// is the one field a formatting change is most likely to break silently.
    func testItemHeaderLengthMatchesTheActualPayloadByteCount() {
        let envelope = SentryEnvelopeReporter
            .envelope(dsn: dsn, name: "NSGenericException", reason: "boom", callStack: [])
        let lines = envelope.split(separator: "\n", omittingEmptySubsequences: false)

        let declared = lines[1]
            .split(separator: ",")
            .first { $0.contains("\"length\"") }
            .flatMap { Int($0.split(separator: ":")[1]) }

        XCTAssertEqual(declared, lines[2].lengthOfBytes(using: .utf8))
    }

    func testEventPayloadCarriesExceptionTypeAndMessage() {
        let payload = SentryEnvelopeReporter.eventPayload(
            name: "NSInvalidArgumentException", reason: "something broke", callStack: []
        )
        XCTAssertTrue(payload.contains("\"type\":\"NSInvalidArgumentException\""))
        XCTAssertTrue(payload.contains("\"value\":\"something broke\""))
        XCTAssertTrue(payload.contains("\"level\":\"fatal\""))
        XCTAssertTrue(payload.contains("\"platform\":\"cocoa\""))
    }

    func testEventPayloadHandlesAMissingReasonWithoutCrashing() {
        let payload = SentryEnvelopeReporter.eventPayload(
            name: "NSGenericException", reason: nil, callStack: []
        )
        XCTAssertTrue(payload.contains("\"value\":\"\""))
    }

    func testEventPayloadEscapesSpecialCharactersInTheMessage() {
        let payload = SentryEnvelopeReporter.eventPayload(
            name: "NSGenericException",
            reason: "he said \"hi\"\nthen\tleft \\ ",
            callStack: []
        )
        // Must remain parseable — an unescaped quote would silently break ingestion.
        let body = payload.data(using: .utf8)!
        XCTAssertNoThrow(try JSONSerialization.jsonObject(with: body))
    }

    /// O6's `Do not touch` boundary: no user data, provider token, or league identifier in a
    /// crash payload. Frames carry symbol names only.
    func testEventPayloadCarriesFramesAndNoUserData() throws {
        let payload = SentryEnvelopeReporter.eventPayload(
            name: "NSGenericException",
            reason: "boom",
            callStack: ["0   Omen  0x0000000102a4c1b8  $s4Omen11AppShellViewV4bodyQrvg + 120"]
        )
        let json = try JSONSerialization.jsonObject(with: payload.data(using: .utf8)!) as! [String: Any]
        let values = (json["exception"] as! [String: Any])["values"] as! [[String: Any]]
        let frames = (values[0]["stacktrace"] as! [String: Any])["frames"] as! [[String: Any]]

        XCTAssertEqual(frames.count, 1)
        XCTAssertTrue((frames[0]["function"] as! String).contains("AppShellView"))

        // A frame must never carry a token-shaped or credential-shaped value.
        for banned in ["espn_s2", "SWID", "access_token", "Bearer ", "refresh_token"] {
            XCTAssertFalse(payload.contains(banned), "crash payload must never contain \(banned)")
        }
    }

    /// Blank DSN is the documented "off" switch on all three platforms. It must not attempt a
    /// request, and must not trap.
    func testReportWithABlankDSNDoesNothing() {
        SentryEnvelopeReporter(dsn: "").report(name: "NSGenericException", reason: "x", callStack: [])
    }

    /// The deliberate-crash hook must stay inert without its launch argument.
    ///
    /// It runs unconditionally in `OmenIOSApp.init`, so a bug in this guard crashes the app on
    /// launch for every user. Worth a test precisely because the failure mode is total, and
    /// because a test that *asserts the crash* cannot exist — it would take the runner with it.
    func testCrashHookIsInertWithoutItsLaunchArgument() {
        CrashReporting.crashIfRequested(arguments: ["Omen", "-SomeOtherFlag", "OMEN_CRASH_TEST"])
        CrashReporting.crashIfRequested(arguments: [])
        // Reaching here at all is the assertion: neither call raised.
        XCTAssertTrue(true)
    }
}
