import Foundation
import MetricKit
import OSLog
import os
import SwiftUI

/// Signposts for every Omen API call and every screen that reaches useful content, so Instruments,
/// `xctrace` and `XCTOSSignpostMetric` measure lag instead of anyone guessing at it.
///
/// Names carry the route shape only: digits and UUID segments become `:id`, and there is never a
/// query string, header or body. A token, league id or player name cannot reach a trace.
enum OmenSignposts {
    static let subsystem = "com.slopssaloon.omen"
    static let api = OSSignposter(subsystem: subsystem, category: "api")
    static let screen = OSSignposter(subsystem: subsystem, category: "screen")
    static let logger = Logger(subsystem: subsystem, category: "timing")

    /// `api/moves/8f3c…` → `api/moves/:id`. Keeps the route, drops anything that identifies a row.
    static func routeShape(_ path: String) -> String {
        path.split(separator: "/", omittingEmptySubsequences: true).map { part -> String in
            let text = String(part)
            if text.allSatisfy(\.isNumber) || UUID(uuidString: text) != nil || text.count >= 20 { return ":id" }
            return text
        }.joined(separator: "/")
    }

    /// One interval per request. The caller ends it with the status (or `network-error`).
    static func beginRequest(method: String, path: String) -> (OSSignpostIntervalState, String) {
        let name = "\(method) \(routeShape(path))"
        return (api.beginInterval("request", id: api.makeSignpostID(), "\(name, privacy: .public)"), name)
    }

    /// The `[omen-timing]` console line stays in `OmenRequestTiming`; this only closes the interval.
    static func endRequest(_ state: OSSignpostIntervalState, name: String, status: Int?) {
        let statusText = status.map(String.init) ?? "network-error"
        api.endInterval("request", state, "\(name, privacy: .public) \(statusText, privacy: .public)")
    }

    /// Process start to now, in milliseconds. The first screen-ready event per launch is the
    /// honest "time to first useful screen", which launch metrics alone do not see.
    static func sinceProcessStart() -> Int {
        var info = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]
        guard sysctl(&mib, u_int(mib.count), &info, &size, nil, 0) == 0 else { return -1 }
        let start = info.kp_proc.p_starttime
        let started = Double(start.tv_sec) + Double(start.tv_usec) / 1_000_000
        return Int((Date().timeIntervalSince1970 - started) * 1000)
    }

    private static let firstReady = OSAllocatedUnfairLock(initialState: false)
    private static let demoTapAt = OSAllocatedUnfairLock<Date?>(initialState: nil)

    /// A named moment on the launch timeline, in ms since process start.
    static func mark(_ what: String) {
        let ms = sinceProcessStart()
        screen.emitEvent("mark", "\(what, privacy: .public) \(ms)ms")
        logger.notice("[omen-timing] \(what, privacy: .public) at \(ms)ms")
    }

    /// Starts the demo-door clock; the next desk ready event reports how long entry took.
    static func markDemoTap() {
        demoTapAt.withLock { $0 = Date() }
        mark("demo tapped")
    }

    /// A screen has its real content on screen (not a skeleton, not a spinner).
    static func screenReady(_ name: String) {
        screen.emitEvent("ready", "\(name, privacy: .public)")
        mark("ready \(name)")
        if name.hasPrefix("desk"), let tapped = demoTapAt.withLock({ value -> Date? in defer { value = nil }; return value }) {
            logger.notice("[omen-timing] demo tap to \(name, privacy: .public) \(Int(Date().timeIntervalSince(tapped) * 1000))ms")
        }
        let isFirst = firstReady.withLock { seen -> Bool in
            defer { seen = true }
            return !seen
        }
        if isFirst {
            let ms = sinceProcessStart()
            screen.emitEvent("first-useful-screen", "\(name, privacy: .public) \(ms)ms")
            logger.notice("[omen-timing] first useful screen \(name, privacy: .public) \(ms)ms after process start")
        }
    }
}

extension View {
    /// Marks this screen as showing useful content once `isReady` is true (immediately when omitted).
    func omenScreenReady(_ name: String, when isReady: Bool = true) -> some View {
        modifier(OmenScreenReadyModifier(name: name, isReady: isReady))
    }
}

private struct OmenScreenReadyModifier: ViewModifier {
    let name: String
    let isReady: Bool
    @State private var reported = false

    func body(content: Content) -> some View {
        content
            .onAppear { report() }
            .onChange(of: isReady) { _, _ in report() }
    }

    private func report() {
        guard isReady, !reported else { return }
        reported = true
        OmenSignposts.screenReady(name)
    }
}

/// MetricKit: Apple's own launch, hang, responsiveness, memory, network and crash reports, from
/// TestFlight and real phones, with no third-party SDK (facts-of-record rule 13).
///
/// Payloads stay on the device in Application Support/metrickit, newest 30 kept. Nothing is
/// uploaded; sending them anywhere is a separate decision. A phone attached to this Mac can be read
/// with `xcrun devicectl device copy from`.
final class OmenMetricKitRecorder: NSObject, MXMetricManagerSubscriber {
    static let shared = OmenMetricKitRecorder()
    private let keep = 30

    func install() {
        MXMetricManager.shared.add(self)
    }

    private var directory: URL? {
        guard let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first else { return nil }
        let dir = base.appendingPathComponent("metrickit", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    func didReceive(_ payloads: [MXMetricPayload]) {
        for payload in payloads { store(payload.jsonRepresentation(), kind: "metrics") }
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        for payload in payloads { store(payload.jsonRepresentation(), kind: "diagnostics") }
    }

    private func store(_ json: Data, kind: String) {
        guard let dir = directory else { return }
        let stamp = ISO8601DateFormatter().string(from: Date()).replacingOccurrences(of: ":", with: "-")
        try? json.write(to: dir.appendingPathComponent("\(stamp)-\(kind).json"), options: .atomic)
        OmenSignposts.logger.info("[omen-metrickit] stored \(kind, privacy: .public) payload")
        prune(dir)
    }

    private func prune(_ dir: URL) {
        let files = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
        let sorted = files.sorted { $0.lastPathComponent > $1.lastPathComponent }
        for stale in sorted.dropFirst(keep) { try? FileManager.default.removeItem(at: stale) }
    }
}
