import Foundation

/// M5-NativeConnect — the user-facing connection state machine.
///
/// Authority: `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §6.
/// The spec lists the full machine including OAuth stages (`authorizing`, `awaitingReturn`).
/// Sleeper does not use OAuth and reaches none of them; Yahoo does, and its stages are modeled
/// separately below rather than shared, because the two flows differ in every step that has
/// user-visible copy.
///
/// Spec rules this type exists to enforce:
/// - no generic endless "Loading…" — every waiting state carries its own sentence;
/// - every non-success state has a safe next action;
/// - **cancellation is normal, not an error.**
enum ConnectState: Equatable {
    case notStarted
    case resolvingAccount
    case choosingLeague(ResolvedSleeperAccount)
    case validatingConnection(league: SleeperLeague)
    case connected(league: SleeperLeague)

    // MARK: Yahoo — OAuth in the system browser, then a league bind.
    //
    // Modeled as its own cases rather than reusing the Sleeper ones: the two flows genuinely
    // differ (no username, a browser round trip, a different league shape), and collapsing
    // them would mean one set of copy trying to describe both.

    /// Asking the backend for the provider authorization URL.
    case startingYahooAuthorization
    /// The system browser is open on Yahoo's own sign-in. Cancelling here is normal.
    case awaitingYahooReturn
    /// Back from the browser, confirming with the server what actually got connected.
    case confirmingYahooConnection
    case choosingYahooLeague([YahooLeague])
    case bindingYahooLeague(league: YahooLeague)
    case yahooConnected(league: YahooLeague)

    /// The user backed out. Distinct from `retryableError` so copy never scolds them.
    case canceled
    case retryableError(ConnectFailure)

    /// The Omen session, not the provider, is the problem.
    case needsReauth

    /// A provider Omen cannot connect on this platform at all — ESPN today. Not a failure,
    /// and never a dead end: the copy routes to the path that does work.
    case unsupportedOnMobile(provider: ConnectProvider)

    // MARK: ESPN — handoff, not a connect flow.
    //
    // The app never performs the ESPN connection: the desktop helper fills Omen's own web
    // form and the user presses Connect there. These two cases exist only so the app can
    // *read back* what the server already knows, which is why there is no ESPN equivalent of
    // `authorizing` or `choosingLeague`. Onboarding contract §5/§10: no in-app credential
    // capture, no embedded provider login, and no ESPN connect UI.

    /// Consent, shown before ESPN's sign-in is opened. W1-A makes this a required step, not a
    /// footnote: the user is told what is about to open and what Omen will read, before it opens.
    case espnConsent
    /// ESPN's own sign-in is on screen in the in-app web view.
    case espnSigningIn
    /// Signed in; asking ESPN which leagues this account plays in.
    case discoveringEspnLeagues
    /// ESPN answered with the user's leagues. They pick one.
    case choosingEspnLeague([EspnLeagueOption])
    /// The user pressed Connect. Sending the one request that carries the session.
    case validatingEspnConnection(leagueId: String)
    /// Re-reading `GET /api/leagues` after the user says they finished on a computer.
    case checkingEspnConnection
    /// The server reports a bound ESPN league with usable team context.
    case espnConnected(EspnConnection)

    /// Spec §6: "Every waiting screen says what is happening and what the user can do."
    var progressLabel: String? {
        switch self {
        case .resolvingAccount:
            return "Looking up your Sleeper account…"
        case .validatingConnection:
            return "Checking that Omen can read this league…"
        case .startingYahooAuthorization:
            return "Opening Yahoo's sign-in…"
        case .awaitingYahooReturn:
            return "Waiting for Yahoo. Finish signing in, and we'll pick up where you left off."
        case .confirmingYahooConnection:
            return "Checking what Yahoo shared with Omen…"
        case .bindingYahooLeague:
            return "Checking that Omen can read this league…"
        case .checkingEspnConnection:
            return "Checking whether your ESPN league reached Omen…"
        case .discoveringEspnLeagues:
            return "Signed in. Finding your leagues…"
        case .validatingEspnConnection:
            return "Checking that Omen can read this league…"
        default:
            return nil
        }
    }

    /// True while a request is in flight. Drives control disabling so a double-tap cannot
    /// start a second connect (spec §7: double-taps must not create duplicate connections).
    var isBusy: Bool {
        switch self {
        case .resolvingAccount, .validatingConnection,
             .startingYahooAuthorization, .awaitingYahooReturn,
             .confirmingYahooConnection, .bindingYahooLeague,
             .checkingEspnConnection, .validatingEspnConnection,
             .discoveringEspnLeagues:
            return true
        default: return false
        }
    }
}

/// Why a connection attempt stopped, in terms the user can act on. Never carries a raw
/// provider error, identifier, or credential — spec §7: "raw provider/cookie details never
/// enter client copy."
enum ConnectFailure: Error, Equatable {
    case usernameNotFound
    case noLeaguesForSeason
    case network
    case server
    /// The backend's own idempotency guard said an identical request is already running.
    case alreadyInProgress
    /// Yahoo's Fantasy Sports API entitlement is off server-side (`503 yahoo_unavailable`).
    /// A product state, not a user error, so it gets its own sentence rather than "our side".
    case providerUnavailable
    /// The provider round trip finished but Omen still cannot read the account — the usual
    /// cause is the user approving in the browser and the token exchange failing behind it.
    case providerNotConnected

    /// Signed in, but the session was not where Omen could read it. Contract §W1-A's failure
    /// table names this one explicitly and forbids blaming the user for it.
    case espnSessionUnreadable
    /// The session read fine and ESPN refused the league — wrong league, or no access to it.
    case espnLeagueUnreachable

    var message: String {
        switch self {
        case .usernameNotFound:
            return "We couldn't find that Sleeper username. Check the spelling and try again."
        case .noLeaguesForSeason:
            return "That account doesn't have any leagues this season. Try another username, or explore the demo."
        case .network:
            return "We couldn't reach Omen. Check your connection and try again."
        case .server:
            return "Omen had a problem on our side. Try again in a moment."
        case .alreadyInProgress:
            return "That connection is already being set up. Give it a second, then check Account."
        case .providerUnavailable:
            return "Yahoo connections are paused right now. Sleeper still works, or try again later."
        case .providerNotConnected:
            return "Yahoo didn't finish connecting. Try again, and make sure you tap Agree in the Yahoo screen."
        case .espnSessionUnreadable:
            return "Omen couldn't read your ESPN session. That's on us, not you — try once more, or finish on a computer."
        case .espnLeagueUnreachable:
            return "Omen signed in but couldn't reach that league. Open the league you want in ESPN, then try again."
        }
    }
}

/// Providers offered in the picker. Availability is a *product* fact here, not a guess —
/// each case's `availability` is sourced from a recorded decision, not from probing.
enum ConnectProvider: String, CaseIterable, Identifiable {
    case espn
    case yahoo
    case sleeper

    static let espnSetupURL = URL(string: "https://slopssaloon.com/espn-connect")!

    /// The order the picker shows, which is **not** `allCases`.
    ///
    /// `ConnectLeague.dc.html` draws Sleeper → Yahoo → ESPN, and the connection contract's policy
    /// matrix agrees: Sleeper is the "first native connection candidate — fast, direct,
    /// resumable", and ESPN is the most-steps path. The shipped list led with ESPN, which put the
    /// slowest and most fragile provider first — and ESPN on iPhone is the only confirmed beta
    /// failure on record.
    ///
    /// Declared here rather than by reordering the enum, because `allCases` order is not this
    /// screen's to decide on behalf of every other caller.
    static let displayOrder: [ConnectProvider] = [.sleeper, .yahoo, .espn]

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .sleeper: return "Sleeper"
        case .yahoo: return "Yahoo"
        case .espn: return "ESPN"
        }
    }

    var platform: OmenPlatform {
        switch self {
        case .sleeper: return .sleeper
        case .yahoo: return .yahoo
        case .espn: return .espn
        }
    }

    var availability: ConnectAvailability {
        switch self {
        case .sleeper:
            return .available
        case .yahoo:
            // **Entitlement granted 2026-08-28**, and native OAuth is wired as of this change.
            //
            // This case previously returned `.useWeb` because native had browser plumbing only
            // for Supabase sign-in, not for a provider connect handshake. That was true of the
            // client and never of the server: `POST /api/yahoo/auth` has accepted
            // `native_return: true` since PR #191, and its callback redirects to
            // `com.slopssaloon.omen://auth/callback?status=connected|cancelled` after
            // validating and consuming the OAuth state server-side. The missing half was the
            // `ASWebAuthenticationSession` the onboarding-connection contract §87 already
            // specifies. A beta tester found the gap the honest way — by picking Yahoo on a
            // phone and being told to go find a computer.
            return .available
        case .espn:
            // **Was `.useWeb` until 2026-09-02.** W1-A: ESPN now signs in inside the app.
            //
            // Two things had to be true and both now are. The mechanism: `HttpOnlyCookieSpikeTests`
            // proved `WKHTTPCookieStore` returns server-set HttpOnly cookies, killing the standing
            // assumption — inherited from `2026-07-07-espn-ios-cookie-sync-research.md` §C — that
            // iOS could not reach them. The permission: onboarding contract §87's WebView ban was
            // lifted for ESPN by the founder on 2026-09-02, with the guideline 5.2.2 exposure
            // stated and accepted, since ESPN publishes no authorization to satisfy it.
            //
            // The desktop helper and `/espn-connect` stay exactly as they are. They are the
            // documented fallback for `espnSessionUnreadable`, and the only path on Android.
            return .available
        }
    }
}

/// What the server reports about the user's ESPN connection, reduced to the two things the
/// app is allowed to show.
///
/// Deliberately narrow. `GET /api/leagues` returns a whole directory contract; this carries
/// the league label and the team label and nothing else — no secret ids, no credential
/// fields, no raw provider payload (onboarding contract §7).
struct EspnConnection: Equatable {
    let leagueName: String?
    let teamName: String?

    /// ESPN does not expose a league list to Omen, so `league_name` is routinely null even on
    /// a healthy connection. A neutral label beats an empty headline.
    var displayLeagueName: String {
        leagueName?.isEmpty == false ? leagueName! : "Your ESPN league"
    }
}

/// One league ESPN reports for the signed-in account.
///
/// Carries labels and ids only — the shape `POST /api/platforms/espn/leagues` returns. No
/// credential passes through this type, which is why it is safe to hold in `ConnectState`.
struct EspnLeagueOption: Equatable, Identifiable {
    let id: String
    let name: String?
    let season: Int?
    let teamId: String?
    let teamName: String?

    /// ESPN routinely omits a league name. A neutral label beats an empty row the user cannot
    /// tell apart from the one below it.
    var displayName: String { name?.isEmpty == false ? name! : "Untitled ESPN league" }

    /// Secondary line, omitting what ESPN did not supply rather than printing placeholders.
    var subtitle: String? {
        let parts = [teamName, season.map(String.init)].compactMap { $0?.isEmpty == false ? $0 : nil }
        return parts.isEmpty ? nil : parts.joined(separator: " · ")
    }
}

/// The ESPN handoff, written once so the app and its tests agree on what the user is told.
///
/// Every line here has to survive App Store review reading it as store-facing copy: no
/// password, no cookie, no token, no `espn_s2`, no `SWID`. The app is describing a helper
/// that runs somewhere else, and it says so.
enum EspnHandoffCopy {
    static let title = "Sync ESPN"
    static let subtitle = "ESPN doesn't offer Omen a phone sign-in yet. One setup on a computer, and your league syncs here from then on."

    struct Step: Equatable, Identifiable {
        let index: Int
        let title: String
        let detail: String
        var id: Int { index }
    }

    static let steps: [Step] = [
        Step(
            index: 1,
            title: "Open the setup page on a computer",
            detail: "Send yourself the link, or open slopssaloon.com/espn-connect in Chrome or Edge."
        ),
        Step(
            index: 2,
            title: "Add the free Omen helper",
            detail: "It reads espn.com only, and it never submits anything for you."
        ),
        Step(
            index: 3,
            title: "Sign in to ESPN Fantasy there",
            detail: "You sign in on ESPN's own site, in your own browser. Omen never sees that step."
        ),
        Step(
            index: 4,
            title: "Review the form and choose Connect",
            detail: "The helper fills Omen's form. You check it and press Connect yourself."
        ),
        Step(
            index: 5,
            title: "Come back and tap I connected ESPN",
            detail: "Omen re-checks your leagues and takes you straight to Command Center."
        ),
    ]

    /// Consent, shown before ESPN's own sign-in opens. W1-A's binding constraint, and the
    /// sentence App Review will read: it says what opens, who the user signs in to, what Omen
    /// reads, and what Omen never sees.
    static let consentEyebrow = "ESPN"
    static let consentTitle = "Before we start"

    /// Rewritten 2026-09-19 to `EspnConnect.dc.html`.
    ///
    /// The previous copy said Omen "never sees your ESPN password" and stopped there. True, and
    /// not the point: what Omen actually stores is **two cookies**, and the old paragraph never
    /// said so. Consent that omits the mechanism is not informed consent, and informed consent is
    /// the specific thing `W1-GATE` required when the founder accepted this risk — the terms
    /// answer was No, so the consent screen is carrying real weight rather than being a formality.
    ///
    /// **RESOLVED by the founder 2026-09-19: name them.** The consent screen says "Two cookies,
    /// SWID and espn_s2" outright, as `EspnConnect.dc.html` always drew it.
    ///
    /// The credential-vocabulary ban still stands **everywhere else**, and the reason the two can
    /// coexist is a distinction worth keeping sharp:
    ///
    /// - **Naming the fields is disclosure.** The user is being asked to hand over a specific
    ///   thing, and they cannot weigh that if the screen will not say what it is. This screen
    ///   exists precisely because the terms answer was No, so vagueness here would be the one
    ///   place it actually costs something.
    /// - **Showing the values is still absolutely forbidden** — fact-of-record #6, no exceptions.
    ///   A cookie value is never displayed, logged, echoed, or sent anywhere but ESPN, and this
    ///   screen promises exactly that in the list below.
    ///
    /// The ban continues to cover every other ESPN surface, because naming a credential in a
    /// progress message or an error buys nothing and only raises the review surface.
    /// Says what is about to happen, and stops.
    ///
    /// The previous version explained *why* ESPN is different and compared it to Yahoo's button.
    /// Founder, 2026-09-19: they do not need the reason, and they certainly do not need to hear
    /// about another provider while they are connecting this one. The security terms below still
    /// have to be stated — they can be short and boring, they just cannot be missing.
    static let consentLead = """
    ESPN's own sign-in page opens next. You sign in to ESPN, then Omen reads your league.
    """
    static let consentTakesTitle = "What Omen takes"
    static let consentTakes = [
        "Two cookies, SWID and espn_s2, which identify you to ESPN.",
        "Your leagues, rosters, matchups and scoring settings."
    ]
    static let consentNeverTitle = "What Omen never does"
    static let consentNever = [
        "Set a lineup, make a claim, or send a trade.",
        "Post, message, or act as you anywhere.",
        "Show those cookies back to you, log them, or send them anywhere but ESPN."
    ]
    /// Kept from the shipped copy although the artboard omits it: the affiliation disclaimer is a
    /// binding `W1-GATE` constraint, not decoration.
    static let consentFooter = """
    You sign in on ESPN's own sign-in page, and Omen never sees your ESPN password. Signing out \
    of ESPN in your browser ends Omen's access too. You can disconnect from Account at any time \
    and the stored values are deleted. Omen is not affiliated with or endorsed by ESPN.
    """

    /// Every consent surface as one string, for the App Review guardrails that check the screen
    /// as a whole. It replaces `consentBody`, which was the single paragraph this screen used to
    /// be — the assertions are about what the screen says, not about which constant holds it.
    static var consentAllCopy: String {
        ([consentEyebrow, consentTitle, consentLead, consentTakesTitle]
         + consentTakes + [consentNeverTitle] + consentNever
         + [consentFooter, consentContinueTitle, consentDeclineTitle]).joined(separator: " ")
    }
    static let consentContinueTitle = "I understand — open the ESPN sheet"
    /// Not "Not now". A decline that names the alternatives is a door rather than a dead end, and
    /// both named providers connect today.
    static let consentDeclineTitle = "Use Sleeper or Yahoo instead"

    /// The sign-in sheet's own guidance while it waits.
    static let signInWaiting = "Sign in to ESPN above. Omen picks up from there."
    static let signInReady = "Signed in. Open your league so Omen can fill this in — or type the ID yourself."
    static let leagueIdHint = "It's the number in your league's web address, after leagueId=. Pasting the whole address works too."
    static let signInConnectTitle = "Connect this league"
    static let signInCancelTitle = "Cancel"

    /// Shown when the in-app sign-in has failed twice and the user is routed to the desktop path.
    static let signInFellBack = "We couldn't read your ESPN session on this phone. The desktop helper still works — here's how."

    /// League-picker copy. Mirrors what the flow actually did rather than a generic heading:
    /// the user did not choose these, ESPN reported them.
    static func foundLeaguesTitle(_ count: Int) -> String {
        count == 1 ? "Found your league" : "Found \(count) leagues"
    }
    static let foundLeaguesSubtitle = "Pick the one Omen should follow. You can connect another later."
    /// Shown when ESPN accepts the session but reports no football leagues on the account.
    static let noLeaguesFound = "ESPN didn't report any football leagues on this account. If you know the league ID, you can enter it."
    /// Shown when discovery itself could not run. Not a failed connection — a failed lookup.
    static let discoveryUnavailable = "Omen couldn't ask ESPN for your leagues. Enter the league ID and we'll connect it directly."

    static let openSetupTitle = "Open ESPN setup"
    static let checkConnectionTitle = "I connected ESPN"
    static let checkAgainTitle = "Check again"

    /// Shown when the re-check finds nothing yet. A status line, not an error: the user has
    /// done nothing wrong, they are most likely mid-way through the desktop steps.
    static let notConnectedYet = "No ESPN league yet. Finish the steps on a computer, then tap Check again."

    /// Shown when the re-check itself could not run.
    static let checkUnavailable = "We couldn't reach Omen to check. Try again in a moment."

    static func connectedMessage(_ connection: EspnConnection) -> String {
        guard let team = connection.teamName, !team.isEmpty else {
            return "Omen can now read this league's roster, scoring, and matchup."
        }
        return "Omen is reading \(team) — roster, scoring, and matchup."
    }
}

enum ConnectAvailability: Equatable {
    case available
    case onHold(reason: String)
    case useWeb(reason: String)
}

/// A Sleeper account resolved from a username, with the leagues Omen can offer.
struct ResolvedSleeperAccount: Equatable {
    let username: String
    let leagues: [SleeperLeague]
}

/// A Yahoo league as `GET /api/yahoo/leagues` returns it.
///
/// `id` is Yahoo's `league_key` (`nfl.l.12345`), which is what `POST /api/yahoo/league`
/// matches against — not the bare numeric id a user sees in the Yahoo UI.
struct YahooLeague: Equatable, Identifiable {
    let id: String
    let name: String
    let season: Int?

    /// Secondary line in the picker. Yahoo returns `name` and `season` as nullable, so this
    /// omits what the payload did not supply rather than printing a placeholder.
    var subtitle: String? {
        season.map(String.init)
    }
}

struct SleeperLeague: Equatable, Identifiable {
    let id: String
    let name: String
    let season: Int
    let scoringFormat: String?
    let teamName: String?

    /// Secondary line in the league picker. Omits anything the payload did not supply rather
    /// than printing a placeholder next to real values.
    var subtitle: String {
        [teamName, scoringFormat, String(season)]
            .compactMap { $0?.isEmpty == false ? $0 : nil }
            .joined(separator: " · ")
    }
}
