import WebKit
import XCTest

/// Platform-fact guard: **does `WKHTTPCookieStore` expose HttpOnly cookie values to the app?**
///
/// Kept, not thrown away, because this single fact has now flipped the ESPN-on-mobile plan
/// twice and is load-bearing for `W1-A`. It is Apple's behavior, not ours, so it can change
/// under an iOS release with no warning and no compile error. This file is the tripwire.
///
/// **Answer, measured 2026-09-02 on iOS 26.5 simulator: YES, in full — including a cookie set
/// by a real server over a real navigation.** That contradicts the inference in
/// `Direction/reviews/2026-07-07-espn-ios-cookie-sync-research.md`, which reasoned from WebKit
/// test fixtures that `WKHTTPCookieStore` would redact HttpOnly the same way the extension
/// `browser.cookies` API does. It does not. The extension limitation is real and was proven on
/// a real iPhone (`2026-08-15-espn-mobile-feasibility-memo.md`); it simply does not generalize
/// to `WKHTTPCookieStore`, which is a different API with different rules.
///
/// **What this does and does not settle.** It settles *mechanism*: an app-controlled `WKWebView`
/// can read what ESPN's session sets. It settles nothing about whether Omen *should* — that is
/// the App Review and Disney-ToU question in `W1-A`, and this result does not touch it.
///
/// **Why there is no ESPN in this file.** HttpOnly is enforced by WebKit, not by ESPN, so the
/// question is answerable against any HttpOnly cookie at all. A synthetic one means this needs
/// no ESPN account, sends nothing to ESPN, touches no credential, and is re-runnable by anyone
/// forever. Pointing it at a real logged-in ESPN session would have proved the same fact while
/// creating every risk the connection contract exists to avoid.
///
/// The server-set test needs `scripts/httponly-cookie-spike-server.py` running on
/// 127.0.0.1:8770. It **skips** rather than fails when that is absent, so a normal test run is
/// unaffected.
final class HttpOnlyCookieSpikeTests: XCTestCase {

    /// Control. Establishes that the harness itself works — a normal cookie must round-trip, or
    /// a negative result on the HttpOnly cookie would prove nothing about HttpOnly.
    @MainActor
    func testSpikeControlNormalCookieRoundTripsThroughWKHTTPCookieStore() async throws {
        let cookie = try XCTUnwrap(Self.cookie(named: "spike_normal", httpOnly: false))
        XCTAssertFalse(cookie.isHTTPOnly, "control cookie must not be HttpOnly")

        let readBack = await Self.roundTrip(cookie)

        let found = readBack.first { $0.name == "spike_normal" }
        XCTAssertNotNil(found, "CONTROL FAILED — the harness cannot round-trip even a normal cookie")
        XCTAssertEqual(found?.value, Self.sentinel)
    }

    /// The actual question.
    ///
    /// This test is written to **pass either way** and print the answer, because the point of a
    /// spike is to learn the fact, not to assert a hoped-for one. A red X here would say the
    /// harness broke; the finding itself is in the log line.
    @MainActor
    func testSpikeDoesWKHTTPCookieStoreExposeAnHttpOnlyCookieValue() async throws {
        let cookie = try XCTUnwrap(Self.cookie(named: "spike_http_only", httpOnly: true))
        // If this fails, `HTTPCookie` never parsed the flag and the spike is testing nothing.
        XCTAssertTrue(cookie.isHTTPOnly, "PRECONDITION FAILED — the probe cookie is not HttpOnly")

        let readBack = await Self.roundTrip(cookie)
        let found = readBack.first { $0.name == "spike_http_only" }

        let verdict: String
        if let found, found.value == Self.sentinel {
            verdict = "READABLE — WKHTTPCookieStore returned the HttpOnly value in full."
        } else if let found {
            verdict = "PRESENT BUT REDACTED — cookie listed, value was '\(found.value)', not the sentinel."
        } else {
            verdict = "NOT READABLE — WKHTTPCookieStore omitted the HttpOnly cookie entirely."
        }

        print("""

        ============================================================
        SPIKE RESULT — WKHTTPCookieStore vs HttpOnly
        \(verdict)
        Cookies visible to the app: \(readBack.map(\.name).sorted())
        ============================================================

        """)
    }

    /// The version that actually settles it: an **HttpOnly cookie set by a real server** over a
    /// real navigation, which is how `espn_s2` arrives. The test above proves WebKit will hand
    /// back a cookie the app itself injected; this proves whether it hands back one the app was
    /// never supposed to see. Only the second result transfers to ESPN.
    ///
    /// Requires the throwaway server in the session scratchpad on 127.0.0.1:8770. Skips —
    /// rather than fails — when it is not running, so this file never breaks an unrelated run.
    @MainActor
    func testSpikeDoesWKHTTPCookieStoreExposeAServerSetHttpOnlyCookie() async throws {
        let dataStore = WKWebsiteDataStore.nonPersistent()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = dataStore
        let webView = WKWebView(frame: .zero, configuration: configuration)

        let navigated = await Self.load(webView, URL(string: "http://127.0.0.1:8770/")!)
        try XCTSkipUnless(navigated, "spike server not reachable — start spikeserver.py and re-run")

        let all = await dataStore.httpCookieStore.allCookies()
        let httpOnly = all.first { $0.name == "srv_http_only" }
        let normal = all.first { $0.name == "srv_normal" }

        XCTAssertNotNil(normal, "CONTROL FAILED — even the normal server cookie was not stored")

        let verdict: String
        if let httpOnly, httpOnly.value == Self.sentinel {
            verdict = "READABLE — a server-set HttpOnly cookie was returned to the app in full."
        } else if httpOnly != nil {
            verdict = "PRESENT BUT REDACTED — listed without its value."
        } else {
            verdict = "NOT READABLE — WebKit withheld the server-set HttpOnly cookie."
        }

        print("""

        ============================================================
        SPIKE RESULT 2 — server-set HttpOnly cookie, real navigation
        \(verdict)
        Cookies visible to the app: \(all.map(\.name).sorted())
        ============================================================

        """)

        withExtendedLifetime(webView) {}
    }

    // MARK: - Harness

    /// Loads a URL and reports whether navigation finished, without failing the test when it
    /// does not — a blocked or unreachable load is a skip condition, not a finding.
    @MainActor
    private static func load(_ webView: WKWebView, _ url: URL) async -> Bool {
        final class Delegate: NSObject, WKNavigationDelegate {
            var finish: ((Bool) -> Void)?
            func webView(_ w: WKWebView, didFinish n: WKNavigation!) { finish?(true); finish = nil }
            func webView(_ w: WKWebView, didFail n: WKNavigation!, withError e: Error) { finish?(false); finish = nil }
            func webView(_ w: WKWebView, didFailProvisionalNavigation n: WKNavigation!, withError e: Error) {
                print("SPIKE navigation blocked: \(e.localizedDescription)")
                finish?(false); finish = nil
            }
        }
        let delegate = Delegate()
        webView.navigationDelegate = delegate
        let ok = await withCheckedContinuation { (c: CheckedContinuation<Bool, Never>) in
            delegate.finish = { c.resume(returning: $0) }
            webView.load(URLRequest(url: url))
        }
        withExtendedLifetime(delegate) {}
        return ok
    }

    private static let sentinel = "SPIKE_SENTINEL_VALUE_0123456789"
    private static let probeURL = URL(string: "https://spike.invalid/")!

    /// Builds a genuine `HttpOnly` cookie the only way the public API allows: by parsing a
    /// `Set-Cookie` response header, which is exactly how a real server would deliver one.
    /// `HTTPCookie(properties:)` cannot set the flag, so this is not a shortcut — it is the
    /// same code path a network response goes through.
    private static func cookie(named name: String, httpOnly: Bool) -> HTTPCookie? {
        let header = "\(name)=\(sentinel); Path=/; Domain=spike.invalid; Secure"
            + (httpOnly ? "; HttpOnly" : "")
        return HTTPCookie.cookies(
            withResponseHeaderFields: ["Set-Cookie": header],
            for: probeURL
        ).first
    }

    /// Writes the cookie into a WebKit cookie store and reads back everything the app can see.
    /// A non-persistent store keeps the spike out of the simulator's shared cookie jar.
    ///
    /// The `WKWebView` is not decoration and must not be optimized away. A `WKWebsiteDataStore`
    /// does not start its networking process until a web view is attached to it, and cookie
    /// writes against a detached store are silently dropped — which is exactly what the control
    /// test caught on the first run of this spike, when every read came back empty and briefly
    /// looked like a finding about HttpOnly.
    @MainActor
    private static func roundTrip(_ cookie: HTTPCookie) async -> [HTTPCookie] {
        let dataStore = WKWebsiteDataStore.nonPersistent()
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = dataStore
        let webView = WKWebView(frame: .zero, configuration: configuration)

        let store = dataStore.httpCookieStore
        await store.setCookie(cookie)
        let all = await store.allCookies()

        withExtendedLifetime(webView) {}
        return all
    }
}
