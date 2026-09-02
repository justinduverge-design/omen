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
             .confirmingYahooConnection, .bindingYahooLeague:
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
        }
    }
}

/// Providers offered in the picker. Availability is a *product* fact here, not a guess —
/// each case's `availability` is sourced from a recorded decision, not from probing.
enum ConnectProvider: String, CaseIterable, Identifiable {
    case espn
    case yahoo
    case sleeper

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
            // Onboarding contract §5: ESPN is research-gated on native and a store build must
            // not ask for a password or raw cookie entry. §10 blocks any "ESPN connected" UI
            // until the ESPN mobile feasibility memo is resolved.
            return .useWeb(
                reason: "Needs a computer for now · we'll show you"
            )
        }
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
