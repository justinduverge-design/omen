import Foundation

/// M5-NativeConnect — the user-facing connection state machine.
///
/// Authority: `Blueprints/specs/mobile/omen-mobile-onboarding-connection-contract-v1.md` §6.
/// The spec lists the full machine including OAuth stages (`authorizing`, `awaitingReturn`).
/// Sleeper is not an OAuth provider, so those stages are unreachable on the only path this
/// item ships — they are deliberately **not** modeled here rather than added as dead cases a
/// future Yahoo item would have to re-specify anyway.
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
        default:
            return nil
        }
    }

    /// True while a request is in flight. Drives control disabling so a double-tap cannot
    /// start a second connect (spec §7: double-taps must not create duplicate connections).
    var isBusy: Bool {
        switch self {
        case .resolvingAccount, .validatingConnection: return true
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
        }
    }
}

/// Providers offered in the picker. Availability is a *product* fact here, not a guess —
/// each case's `availability` is sourced from a recorded decision, not from probing.
enum ConnectProvider: String, CaseIterable, Identifiable {
    case sleeper
    case yahoo
    case espn

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
            // `YAHOO_ENABLED` is false pending a Fantasy API entitlement only Yahoo can grant
            // (P1-YahooReauth). The OAuth handshake still succeeds while every Fantasy call
            // 403s, so offering the button would produce a connection that reads connected
            // and serves nothing.
            return .onHold(
                reason: "Yahoo connections are paused while we wait on Yahoo to restore our data access."
            )
        case .espn:
            // Onboarding contract §5: ESPN is research-gated on native and a store build must
            // not ask for a password or raw cookie entry. §10 blocks any "ESPN connected" UI
            // until the ESPN mobile feasibility memo is resolved.
            return .useWeb(
                reason: "ESPN needs your browser to connect securely. Connect it once on the Omen website and it'll show up here."
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
