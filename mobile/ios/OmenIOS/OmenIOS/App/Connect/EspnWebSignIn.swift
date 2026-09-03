import SwiftUI
import WebKit

/// W1-A — the in-app ESPN sign-in surface.
///
/// **Read this before changing anything in this file.**
///
/// This hosts ESPN's own sign-in inside an app-controlled `WKWebView`. That reverses onboarding
/// contract §87, which bans exactly this for provider logins on the grounds that an app-controlled
/// web view *can* read what a user types into a provider's form. The founder lifted that rule for
/// ESPN specifically on 2026-09-02, with the App Review exposure stated; the record is in
/// `Direction/decision_log.md`. It is not lifted for Yahoo, which keeps its system auth sheet.
///
/// Because the ban exists for a real reason, the mitigations are not optional:
///
/// - **No script is injected into ESPN's pages.** No `WKUserScript`, no `evaluateJavaScript`
///   against an ESPN origin, no message handlers. Omen reads the cookie jar WebKit maintains and
///   nothing else. Reading a form field would be trivial here and is precisely what §87 forbids.
/// - **A non-persistent data store.** The ESPN session lives in memory for the life of this sheet
///   and is gone when it closes — never written to the app container, never restored on launch.
/// - **Captured values never enter `ConnectState`.** That type is `Equatable` and gets
///   string-interpolated into test failure messages; a cookie reaching it would eventually reach a
///   CI log. The capture is held in one private field on the view model instead.
/// - **`EspnCapture` redacts itself** under `print`, `dump`, and string interpolation.
///
/// The mechanism was proven before it was built: `HttpOnlyCookieSpikeTests` shows
/// `WKHTTPCookieStore` returns server-set HttpOnly cookies in full on iOS 26.5.
struct EspnCapture: CustomStringConvertible, CustomDebugStringConvertible {
    let espnS2: String
    let swid: String
    let leagueId: String
    let teamId: String?

    /// Deliberately not the synthesized description. Anything that stringifies this — a `print`,
    /// a crash-report frame, an `XCTAssert` message — gets the shape, never the values.
    var description: String {
        "EspnCapture(league: \(leagueId), team: \(teamId ?? "-"), session: <redacted>)"
    }

    var debugDescription: String { description }
}

/// What the sign-in sheet has managed to observe so far.
///
/// Signed-in-ness and league detection are **separate facts**, and collapsing them was the bug
/// behind two dead ends on a real phone: a signed-in user parked on a page with no `leagueId` in
/// the URL looked identical to a signed-out one, so the Connect button stayed dead with no way
/// forward. Now sign-in alone is enough to proceed, and the league id is something the user can
/// supply if ESPN's URL does not.
enum EspnSignInProgress: Equatable {
    /// No ESPN session in the jar yet. Carries a presence-only diagnostic, never a value.
    case signedOut(diagnostic: String)
    /// Signed in. The ids are whatever the current page happened to reveal — often nothing.
    case signedIn(detectedLeagueId: String?, detectedTeamId: String?)

    var isSignedIn: Bool {
        if case .signedIn = self { return true }
        return false
    }

    /// Non-nil only while signed out — there is nothing to diagnose once it works.
    var diagnostic: String? {
        if case .signedOut(let diagnostic) = self { return diagnostic }
        return nil
    }

    var detectedLeagueId: String? {
        if case .signedIn(let leagueId, _) = self { return leagueId }
        return nil
    }

    var detectedTeamId: String? {
        if case .signedIn(_, let teamId) = self { return teamId }
        return nil
    }
}

/// Presents ESPN's site and reports when a connectable league becomes visible.
///
/// Nothing here decides to connect. It observes, and hands the decision up.
struct EspnWebSignIn: UIViewRepresentable {
    /// Where the sheet starts: the page that reliably makes ESPN ask for a sign-in.
    ///
    /// **Chosen from observed device behavior, not from reading ESPN's markup.** On a real
    /// iPhone, `/football/team` immediately presented the MyDisney sign-in — that part worked
    /// exactly as wanted. Its only flaw was as a *destination*: with no `leagueId` it then serves
    /// ESPN's "Invalid league ID" page, so a user who had just signed in successfully landed on
    /// an error. `afterSignInURL` fixes that half rather than trading away the half that works.
    ///
    /// Two alternatives were tried and rejected on device: `/football/welcome` is ESPN's
    /// new-user signup pitch (Create a League / Join a Public League), and `www.espn.com/fantasy`
    /// renders a signed-out content hub whose sign-in entry is buried in the hamburger menu.
    /// `www.espn.com/login` exists and returns 200, but renders as a nav stub rather than a form,
    /// so it was not adopted on markup evidence alone.
    static let entryURL = URL(string: "https://fantasy.espn.com/football/team")!

    /// Where the user is sent once ESPN has a session and the current page names no league.
    ///
    /// Exists purely so "Invalid league ID" is never the resting state after a successful
    /// sign-in. It is a convenience, not a dependency — the league-id field is what this flow
    /// actually stands on, so if ESPN reshapes this page nothing breaks.
    static let afterSignInURL = URL(string: "https://www.espn.com/fantasy/football/")!

    /// ESPN has issued these under more than one domain scope, and a stale value under one can
    /// coexist with a valid one under another — the failure the extension's multi-domain read
    /// exists to diagnose. Preference order matches `extension/popup.js`.
    static let cookieDomainPreference = ["www.espn.com", "fantasy.espn.com", "espn.com"]

    let store: EspnCookieReading
    let onProgress: (EspnSignInProgress) -> Void

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        // Non-persistent: the ESPN session never touches the app container, and closing the sheet
        // disposes of it. It also means the user signs in again next time, which is the correct
        // trade — an app that silently retains a provider session is the thing §87 is about.
        configuration.websiteDataStore = store.dataStore
        // No `userContentController` scripts are added. See the file header.

        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        webView.allowsBackForwardNavigationGestures = true
        webView.load(URLRequest(url: Self.entryURL))
        context.coordinator.startWatching(webView)
        return webView
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        coordinator.stopWatching()
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.onProgress = onProgress
    }

    func makeCoordinator() -> Coordinator {
        Coordinator(store: store, onProgress: onProgress)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let store: EspnCookieReading
        var onProgress: (EspnSignInProgress) -> Void

        init(store: EspnCookieReading, onProgress: @escaping (EspnSignInProgress) -> Void) {
            self.store = store
            self.onProgress = onProgress
        }

        /// Guards the one post-sign-in redirect. Without it, a destination that itself reveals
        /// no league would redirect to itself forever.
        private var didRedirectAfterSignIn = false

        private var watch: Task<Void, Never>?

        /// Samples the cookie jar on a timer for as long as the sheet is open.
        ///
        /// **Navigation callbacks alone are not enough, and assuming they were is what stranded a
        /// real signed-in user.** ESPN's sign-in completes through redirects and XHR; by the time
        /// the session cookies land, the page the user is looking at has already finished
        /// navigating, so `didFinish` never fires again and Omen never looks again. The user sat
        /// on a signed-in ESPN page — account avatar visible — while Omen insisted they were
        /// signed out. WebKit also syncs cookies from its network process to the UI process
        /// asynchronously, so even a perfectly-timed navigation callback can read an empty jar.
        ///
        /// A one-second poll is cheap: it reads an in-memory cookie jar, touches no network, and
        /// stops the moment the sheet closes.
        func startWatching(_ webView: WKWebView) {
            watch?.cancel()
            watch = Task { @MainActor [weak webView] in
                while !Task.isCancelled {
                    guard let webView else { return }
                    await self.sample(webView)
                    try? await Task.sleep(for: .seconds(1))
                }
            }
        }

        func stopWatching() {
            watch?.cancel()
            watch = nil
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            report(webView)
        }

        /// ESPN's post-sign-in hop to the team page is frequently same-document, and `didFinish`
        /// alone misses it — which reads to the user as "I signed in and Omen did nothing."
        func webView(_ webView: WKWebView, didFinishSameDocumentNavigation navigation: WKNavigation!) {
            report(webView)
        }

        private func report(_ webView: WKWebView) {
            Task { @MainActor [weak webView] in
                guard let webView else { return }
                await self.sample(webView)
            }
        }

        @MainActor
        private func sample(_ webView: WKWebView) async {
            let ids = EspnWebSignIn.leagueAndTeam(from: webView.url)
            let diagnostic = await store.sessionDiagnostic()

            guard await store.hasSession() else {
                return onProgress(.signedOut(diagnostic: diagnostic))
            }
            onProgress(.signedIn(detectedLeagueId: ids.leagueId, detectedTeamId: ids.teamId))

            // Just signed in, and sitting on a page that names no league — which on the entry URL
            // means ESPN's "Invalid league ID" error. Move them somewhere useful, once.
            guard ids.leagueId == nil, !didRedirectAfterSignIn else { return }
            didRedirectAfterSignIn = true
            webView.load(URLRequest(url: EspnWebSignIn.afterSignInURL))
        }
    }

    /// Pulls the league and team out of whatever ESPN page the user is on.
    ///
    /// Matches `normalizeEspnLeagueId` on the server, which accepts `leagueId` or `league_id`.
    /// Anything not on an espn.com host is ignored outright, so a redirect through an identity
    /// provider cannot be mistaken for a league page.
    static func leagueAndTeam(from url: URL?) -> (leagueId: String?, teamId: String?) {
        guard let url,
              url.host?.hasSuffix("espn.com") == true,
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false)
        else { return (nil, nil) }

        // ESPN's fantasy pages are a client-routed app, and some of its transitions put the ids in
        // the fragment rather than the query. Both are read, query first, so a user who reaches a
        // league by tapping through rather than by a fresh page load is still detected.
        let fragmentItems = components.fragment
            .flatMap { URLComponents(string: "?\($0.hasPrefix("/") ? String($0.drop(while: { $0 != "?" }).dropFirst()) : $0)") }?
            .queryItems ?? []

        func item(_ names: [String]) -> String? {
            for name in names {
                if let value = components.queryItems?.first(where: { $0.name == name })?.value,
                   !value.isEmpty {
                    return value
                }
                if let value = fragmentItems.first(where: { $0.name == name })?.value, !value.isEmpty {
                    return value
                }
            }
            return nil
        }

        return (item(["leagueId", "league_id"]), item(["teamId", "team_id"]))
    }
}

/// The cookie-jar seam, so the flow is testable without a live ESPN session.
@MainActor
protocol EspnCookieReading: AnyObject {
    var dataStore: WKWebsiteDataStore { get }
    /// True when both values ESPN's API requires are present.
    func hasSession() async -> Bool
    /// Reads them out. Called once, at the moment the user presses Connect.
    func takeSession() async -> (espnS2: String, swid: String)?

    /// Presence and domain only — **never a value**. Mirrors the diagnostic in
    /// `extension/popup.js`, which exists for the same reason: "Omen can't see your session" is
    /// a dead end unless you can tell *which* half is missing and where it was looked for.
    func sessionDiagnostic() async -> String
}

/// Reads `espn_s2` and `SWID` from the sheet's own in-memory cookie jar.
///
/// **This type is the only place in the app that touches those values.** It has no logging, no
/// analytics, no persistence, and no description that could carry them anywhere.
@MainActor
final class EspnWebCookieStore: EspnCookieReading {
    let dataStore: WKWebsiteDataStore

    init(dataStore: WKWebsiteDataStore = .nonPersistent()) {
        self.dataStore = dataStore
    }

    func hasSession() async -> Bool {
        await takeSession() != nil
    }

    func sessionDiagnostic() async -> String {
        let cookies = await dataStore.httpCookieStore.allCookies()
        func describe(_ name: String) -> String {
            let hosts = cookies
                .filter { $0.name.caseInsensitiveCompare(name) == .orderedSame && !$0.value.isEmpty }
                .map { Self.host($0) }
            return hosts.isEmpty ? "\(name): not found" : "\(name): \(hosts.sorted().joined(separator: ", "))"
        }
        // Host names and a total count. No value, no length, no prefix — a length is a hint and
        // a prefix is a leak, and neither helps diagnose anything.
        return "\(describe("espn_s2")) · \(describe("SWID")) · \(cookies.count) cookies"
    }

    func takeSession() async -> (espnS2: String, swid: String)? {
        let cookies = await dataStore.httpCookieStore.allCookies()
        guard let espnS2 = Self.best(named: "espn_s2", in: cookies),
              let swid = Self.best(named: "SWID", in: cookies)
        else { return nil }
        return (espnS2, swid)
    }

    /// Picks by the same domain preference the extension uses, rather than taking whichever the
    /// jar happens to return first. A stale cookie under one scope alongside a valid one under
    /// another is a real ESPN behavior, and the server rejects the stale value without saying why.
    static func best(named name: String, in cookies: [HTTPCookie]) -> String? {
        let matches = cookies.filter {
            $0.name.caseInsensitiveCompare(name) == .orderedSame && !$0.value.isEmpty
        }
        guard !matches.isEmpty else { return nil }

        // Exact host first, across the whole preference order, **before** any suffix match.
        //
        // Doing it in one pass with `preferred.hasSuffix(domain)` folded in looks equivalent and
        // is not: a dot-prefixed `.espn.com` cookie is a suffix of `www.espn.com`, so a stale
        // wildcard value wins the `www.espn.com` slot and the fresh host-scoped one is never
        // reached. That is the exact ESPN failure `extension/popup.js` was written to diagnose —
        // the server rejects the stale value and says nothing about why.
        for preferred in EspnWebSignIn.cookieDomainPreference {
            if let hit = matches.first(where: { Self.host($0) == preferred }) {
                return hit.value
            }
        }
        // Only then fall back to a domain-scoped cookie that merely covers the preferred host.
        for preferred in EspnWebSignIn.cookieDomainPreference {
            if let hit = matches.first(where: { preferred.hasSuffix(Self.host($0)) }) {
                return hit.value
            }
        }
        return matches.first?.value
    }

    /// Cookie domains arrive both bare (`www.espn.com`) and dot-prefixed (`.espn.com`).
    private static func host(_ cookie: HTTPCookie) -> String {
        cookie.domain.hasPrefix(".") ? String(cookie.domain.dropFirst()) : cookie.domain
    }
}
