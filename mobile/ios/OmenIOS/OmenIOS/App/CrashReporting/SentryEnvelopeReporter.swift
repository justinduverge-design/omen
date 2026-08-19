import Foundation

/// O6 iOS half — hand-rolled Sentry envelope sender. Android twin:
/// `app/crashreporting/SentryEnvelopeReporter.kt`.
///
/// No Sentry SDK dependency, matching the choice the Android half and the backend (`O8`) both
/// made: a direct HTTP integration rather than a new package dependency. Posts
/// `application/x-sentry-envelope` to the DSN's `/envelope/` endpoint, authenticating via the
/// DSN embedded in the envelope header — the legacy `/store/` + `X-Sentry-Auth` shape that
/// `O1b` proved against GlitchTip is documented as deprecated for direct Sentry SaaS ingestion.
///
/// **What this can and cannot catch.** `NSSetUncaughtExceptionHandler` fires for Objective-C
/// exceptions (`NSException`), which covers `fatalError`-adjacent ObjC-bridged failures and
/// anything raised through the ObjC runtime. It does **not** fire for pure Swift runtime traps
/// — `fatalError()`, force-unwrapping nil, array index out of range — because those raise
/// `SIGTRAP`/`SIGILL` rather than an exception. Catching those needs signal handlers, which
/// carry real async-signal-safety hazards and are deliberately out of scope here. Stated
/// plainly rather than left implied: **this is partial crash coverage on iOS.**
struct SentryEnvelopeReporter {
    private let dsn: String
    private let session: URLSession
    private let timeout: TimeInterval

    init(dsn: String, session: URLSession = .shared, timeout: TimeInterval = 5) {
        self.dsn = dsn
        self.session = session
        self.timeout = timeout
    }

    /// Ships one event, blocking the caller until the request completes or times out.
    ///
    /// Blocking is deliberate and mirrors Android's `join()`: an uncaught exception handler
    /// runs moments before the process is torn down, so an async send would simply not
    /// survive. The semaphore bounds that wait so a hung network cannot wedge a crashing app.
    func report(name: String, reason: String?, callStack: [String]) {
        guard !dsn.isEmpty, let url = Self.ingestURL(dsn: dsn) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.timeoutInterval = timeout
        request.setValue("application/x-sentry-envelope", forHTTPHeaderField: "Content-Type")
        request.httpBody = Self.envelope(dsn: dsn, name: name, reason: reason, callStack: callStack)
            .data(using: .utf8)

        let done = DispatchSemaphore(value: 0)
        session.dataTask(with: request) { _, response, error in
            // Mirrors Android's `Log.i(TAG, "…response code …")`. This line is the only way
            // to prove ingestion from the device side — a crash handler has no UI and the
            // process is about to die, so without it a silent failure looks identical to a
            // success. Logs the status only; never the DSN, the body, or the payload.
            if let http = response as? HTTPURLResponse {
                NSLog("[OmenCrashReporting] Reported crash to Sentry, response code \(http.statusCode)")
            } else {
                NSLog("[OmenCrashReporting] Crash report failed to send: \(error?.localizedDescription ?? "unknown")")
            }
            done.signal()
        }.resume()
        _ = done.wait(timeout: .now() + timeout)
    }

    /// `https://<key>@<host>/<projectId>` → `https://<host>/api/<projectId>/envelope/`
    static func ingestURL(dsn: String) -> URL? {
        guard let parsed = URLComponents(string: dsn),
              let host = parsed.host else { return nil }
        let projectId = parsed.path.trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        guard !projectId.isEmpty else { return nil }
        return URL(string: "https://\(host)/api/\(projectId)/envelope/")
    }

    static func envelope(dsn: String, name: String, reason: String?, callStack: [String]) -> String {
        let event = eventPayload(name: name, reason: reason, callStack: callStack)
        let length = event.lengthOfBytes(using: .utf8)
        let header = #"{"dsn":"\#(dsn)","sent_at":"\#(isoTimestamp())"}"#
        let itemHeader = #"{"type":"event","length":\#(length),"content_type":"application/json"}"#
        return "\(header)\n\(itemHeader)\n\(event)"
    }

    static func eventPayload(name: String, reason: String?, callStack: [String]) -> String {
        // No user data, provider token, or league identifier ever belongs in a crash payload
        // (O6's own boundary) — only code structure. `callStackSymbols` frames are addresses
        // and symbol names, never a value the app was holding.
        let frames = callStack.reversed()
            .map { #"{"filename":"","function":\#(jsonString($0)),"module":"","lineno":0}"# }
            .joined(separator: ",")
        let eventId = UUID().uuidString.replacingOccurrences(of: "-", with: "").lowercased()
        return #"{"event_id":"\#(eventId)","timestamp":"\#(isoTimestamp())","platform":"cocoa","level":"fatal","exception":{"values":[{"type":\#(jsonString(name)),"value":\#(jsonString(reason ?? "")),"stacktrace":{"frames":[\#(frames)]}}]}}"#
    }

    static func jsonString(_ value: String) -> String {
        let escaped = value
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "\"", with: "\\\"")
            .replacingOccurrences(of: "\n", with: "\\n")
            .replacingOccurrences(of: "\r", with: "\\r")
            .replacingOccurrences(of: "\t", with: "\\t")
        return "\"\(escaped)\""
    }

    private static func isoTimestamp() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(identifier: "UTC")
        return formatter.string(from: Date())
    }
}

/// Installs the uncaught-exception handler once, chaining to any previously-installed one so
/// existing crash behavior is preserved rather than replaced.
enum CrashReporting {
    /// Held at file scope because the C-function-pointer handler cannot capture context.
    nonisolated(unsafe) private static var reporter: SentryEnvelopeReporter?
    nonisolated(unsafe) private static var previousHandler: (@convention(c) (NSException) -> Void)?

    static func install(dsn: String) {
        guard !dsn.isEmpty, reporter == nil else { return }
        reporter = SentryEnvelopeReporter(dsn: dsn)
        previousHandler = NSGetUncaughtExceptionHandler()

        NSSetUncaughtExceptionHandler { exception in
            CrashReporting.reporter?.report(
                name: exception.name.rawValue,
                reason: exception.reason,
                callStack: exception.callStackSymbols
            )
            CrashReporting.previousHandler?(exception)
        }
    }

    /// Deliberate crash for O6's `Done when:` proof, triggered only by a launch argument.
    ///
    /// Raises an **`NSException`** specifically, because that is the class of failure this
    /// handler actually catches — a `fatalError()` would die via `SIGTRAP` without ever
    /// reaching it and would prove nothing. Mirrors Android's `adb shell am crash`, which iOS
    /// has no OS-level equivalent of.
    ///
    /// Not reachable by an end user: nothing in the UI passes this argument, and a shipped
    /// build has no surface that sets it — the same containment the screenshot-scenario
    /// short-circuit relies on.
    static func crashIfRequested(arguments: [String] = ProcessInfo.processInfo.arguments) {
        guard arguments.contains("-OMEN_CRASH_TEST") else { return }
        NSException(
            name: .init("OmenDeliberateTestCrash"),
            reason: "O6 verification — deliberate NSException, no user data attached",
            userInfo: nil
        ).raise()
    }
}
