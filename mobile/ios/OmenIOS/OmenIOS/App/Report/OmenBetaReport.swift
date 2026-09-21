import Foundation

// MARK: - The beta report, and the one thing it must never carry
//
// `ReportPill.dc.html` and `CONTRACTS.md`'s `ReportPill` row. The route is
// `POST /api/beta/reports` against `beta-report.v1`, with `GET /api/beta/reports/schema`
// describing what the server will accept.
//
// ## What may be sent, stated as a type rather than as a comment
//
// `CONTRACTS.md`: *"Sends screen, app/build/OS/device, provider connection state, recent
// scrubbed error codes and a user note. **Never league data, rosters, screenshots or
// credentials.**"* That last clause is fact-of-record #6 territory and is absolute.
//
// So the payload is a **closed struct with nine stored properties and no dictionary anywhere**.
// There is no `extra: [String: Any]`, no passthrough, and no way for a caller to add a field:
// the encoder writes exactly these keys because they are the only keys that exist. A payload
// that could carry a roster if someone passed one is a payload that eventually does.
//
// The server validates the same nine keys and rejects unknown ones (`src/routes/betaReports.js`,
// `FIELDS`). Both halves are deliberate — the client cannot send a roster and the server would
// refuse it if a different client tried.
//
// ## Storage is gated, and this file does not pretend otherwise
//
// Fact-of-record #8 separates authoring SQL from applying it. `sql/2026-09-14_beta_reports_review.sql`
// is review-only until migration approval, so the route's insert can fail — and when it does the
// server answers `503 report_storage_unavailable` with *"Your report was not saved."*
//
// `OmenBetaReportOutcome` therefore has a `notSaved` case that is **not** merged into a generic
// failure, and the composer renders it as its own state. The client never claims the report was
// stored; it repeats what the server said about this one request and nothing more.

/// The screens the route will accept, verbatim from `SCREENS` in `src/routes/betaReports.js`.
///
/// An enum rather than a string, so a typo is a compile error rather than a 400 the user reads
/// as "Omen lost my report". The raw values are the server's snake_case tokens.
///
/// `Identifiable` so `.sheet(item:)` can carry it: presenting the composer and naming the screen
/// it is about are one action, and two pieces of state that must agree are one that can disagree.
enum OmenBetaReportScreen: String, CaseIterable, Identifiable {
    case commandCenter = "command_center"
    case omen
    case omenEvidence = "omen_evidence"
    case startSit = "start_sit"
    case league
    case waiver
    case trade
    case ledger
    case ledgerDetail = "ledger_detail"
    case account
    case signIn = "sign_in"
    case emailCode = "email_code"
    case connectLeague = "connect_league"
    case espnConnect = "espn_connect"
    case connectFailed = "connect_failed"
    case switcher

    var id: String { rawValue }

    /// What the composer shows the user under "Screen". The token is for the server; a reader
    /// should not have to parse `omen_evidence`.
    var displayName: String {
        switch self {
        case .commandCenter: return "Command"
        case .omen: return "Omen"
        case .omenEvidence: return "Omen \u{2014} the full argument"
        case .startSit: return "Start / sit"
        case .league: return "League"
        case .waiver: return "Waiver"
        case .trade: return "Trade"
        case .ledger: return "The Ledger"
        case .ledgerDetail: return "A receipt"
        case .account: return "Account"
        case .signIn: return "Sign in"
        case .emailCode: return "Email code"
        case .connectLeague: return "Connect a league"
        case .espnConnect: return "ESPN connect"
        case .connectFailed: return "Connection failed"
        case .switcher: return "League switcher"
        }
    }
}

/// `provider:state`, or `none`. The server's regex is
/// `^(espn|yahoo|sleeper):(connected|disconnected|reconnect_required|unavailable|pending)$`.
///
/// This is a *connection state*, not a league. "espn:connected" says a provider is linked; it
/// names no league, no team and no id, which is the line `CONTRACTS.md` draws for the
/// `ConnectLeague` row as well: *"State is opaque: recovery action and error code only, never
/// credentials or Vault IDs."*
struct OmenBetaReportConnectionState: Equatable {
    enum Provider: String { case espn, yahoo, sleeper }
    enum State: String {
        case connected, disconnected, unavailable, pending
        case reconnectRequired = "reconnect_required"
    }

    let provider: Provider?
    let state: State?

    static let none = OmenBetaReportConnectionState(provider: nil, state: nil)

    init(provider: Provider?, state: State?) {
        self.provider = provider
        self.state = state
    }

    init(provider: Provider, state: State) {
        self.provider = provider
        self.state = state
    }

    var wireValue: String {
        guard let provider, let state else { return "none" }
        return "\(provider.rawValue):\(state.rawValue)"
    }

    /// The sentence the composer shows. "No provider connected" is a true statement; an empty
    /// row would read as a missing field.
    var displayName: String {
        guard let provider, let state else { return "No provider connected" }
        let providerName = provider == .espn ? "ESPN" : provider.rawValue.capitalized
        switch state {
        case .connected: return "\(providerName), connected"
        case .disconnected: return "\(providerName), disconnected"
        case .unavailable: return "\(providerName), unavailable"
        case .pending: return "\(providerName), pending"
        case .reconnectRequired: return "\(providerName), needs reconnecting"
        }
    }
}

/// The exact body `POST /api/beta/reports` accepts. Nine fields, no more, by construction.
struct OmenBetaReport: Equatable {
    let screen: OmenBetaReportScreen
    let appVersion: String
    let build: String
    let osVersion: String
    let deviceModel: String
    let connectionState: OmenBetaReportConnectionState
    /// At most five, each `^[a-z][a-z0-9_]{0,63}$`. These are **codes**, not messages: a raw
    /// provider error string could contain a league name or a URL with an id in it, so the only
    /// thing that travels is a token the app itself chose.
    let recentErrorCodes: [String]
    /// The user's own words. The one free-text field, which is why the disclosure exists.
    let message: String
    /// The server rejects anything without `disclosure_accepted: true`. It is a stored property
    /// rather than a constant so a report can only be built by a caller that had a disclosure to
    /// accept.
    let disclosureAccepted: Bool

    /// Five is the server's cap. Truncating here rather than letting the server 400 means a user
    /// with six recent errors gets a report, not a rejection they cannot act on.
    static let maximumErrorCodes = 5
    /// The server's `message.length > 4000` rejection.
    static let maximumMessageLength = 4000

    /// Mirrors `validReport` in `src/routes/betaReports.js` closely enough to catch a bad report
    /// before it costs a round trip — and *not* so closely that it becomes a second authority.
    /// The server remains the one that decides; this only avoids sending something known bad.
    var isSendable: Bool {
        guard disclosureAccepted else { return false }
        guard !message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return false }
        guard message.count <= Self.maximumMessageLength else { return false }
        guard recentErrorCodes.count <= Self.maximumErrorCodes else { return false }
        let metadata = [appVersion, build, osVersion, deviceModel]
        guard metadata.allSatisfy({ !$0.isEmpty && $0.count <= 80 }) else { return false }
        return recentErrorCodes.allSatisfy(Self.isValidErrorCode)
    }

    static func isValidErrorCode(_ code: String) -> Bool {
        guard (1...64).contains(code.count), let first = code.first, first.isLowercase, first.isLetter else { return false }
        return code.allSatisfy { $0.isNumber || ($0.isLowercase && $0.isLetter) || $0 == "_" }
    }

    /// JSON built by hand rather than by `Codable`, for one reason: `JSONEncoder` encodes
    /// whatever a type declares, so the guarantee that no tenth field can appear would move from
    /// this file to whatever struct someone adds later. Built here, the key list is the code.
    func jsonBody() -> [String: Any] {
        [
            "screen": screen.rawValue,
            "app_version": appVersion,
            "build": build,
            "os_version": osVersion,
            "device_model": deviceModel,
            "connection_state": connectionState.wireValue,
            "recent_error_codes": Array(recentErrorCodes.prefix(Self.maximumErrorCodes)),
            "message": message,
            "disclosure_accepted": disclosureAccepted
        ]
    }

    /// The lines the composer lists under "What this sends", in send order.
    ///
    /// Built from the payload itself rather than written as copy, so the list cannot describe a
    /// report the app is not actually sending. A disclosure that drifts from the payload is
    /// worse than none: it is a specific false claim rather than a vague one.
    var disclosedLines: [(field: String, value: String)] {
        var lines: [(String, String)] = [
            ("Screen", screen.displayName),
            ("App", "\(appVersion) (\(build))"),
            ("Device", "\(deviceModel), \(osVersion)"),
            ("Connection", connectionState.displayName)
        ]
        lines.append((
            "Recent error codes",
            recentErrorCodes.isEmpty ? "None recorded" : recentErrorCodes.joined(separator: ", ")
        ))
        lines.append(("Your note", message.isEmpty ? "Empty" : message))
        return lines
    }
}

/// What `GET /api/beta/reports/schema` returns.
///
/// The disclosure string is **the server's**, not the client's. It says what happens to a report
/// — today, *"Reports are summarized by a model for a daily founder digest."* That is a claim
/// about processing, and it belongs to whoever operates the processing. A client that wrote its
/// own copy of that sentence would keep telling users it after the server changed its mind.
struct OmenBetaReportSchema: Equatable {
    let screens: [String]
    let screenshotsSupported: Bool
    let disclosure: String

    /// Used when the schema read fails. It carries **no** claim about what happens to a report,
    /// because a client that could not reach the server does not know. It states only the thing
    /// the client is certain of: what it is about to send.
    static let unreadable = OmenBetaReportSchema(
        screens: OmenBetaReportScreen.allCases.map(\.rawValue),
        screenshotsSupported: false,
        disclosure: "Omen couldn\u{2019}t read the current reporting terms. The fields listed below are exactly what your report contains."
    )
}

/// The result of one `POST`. Four cases, because four different things are true.
enum OmenBetaReportOutcome: Equatable {
    /// `201`. The server said it received the report and gave it an id.
    case received(id: String)
    /// `503 report_storage_unavailable` — including the storage-gate case. **Its own case**, not
    /// folded into `failed`: "we could not reach the server" and "the server has nowhere to put
    /// this yet" are different facts and a user can act on only one of them.
    case notSaved
    /// `400`. The server refused the fields.
    case rejected(message: String)
    /// `401`, a transport failure, or anything else.
    case failed(message: String)
}

protocol OmenBetaReportRepository {
    func schema() async -> OmenBetaReportSchema
    func send(_ report: OmenBetaReport, accessToken: String) async -> OmenBetaReportOutcome
}
