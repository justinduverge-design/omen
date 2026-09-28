import Foundation

/// T3 — drives `TradeFindReview` from `trade-find.v1`.
///
/// A client-side pager over a statically-fetched batch: T2 returns the whole batch in one call
/// (capped server-side at `MAX_CANDIDATES_RETURNED`), so "exhausted" is reached when the local
/// stack empties, never a second network call — the contract's own data-binding note for the
/// batch-exhausted state.
@MainActor
final class TradeFindReviewViewModel: ObservableObject {
    enum ViewState: Equatable {
        case loading
        case reviewing
        case batchExhausted
        /// `status: "ok"` (or `"degraded"`) with an empty `candidates` array — "a real, honest
        /// positive state", never a variant of the degraded or exhausted copy.
        case zeroCandidates
        /// `status: "unavailable"` — own-roster-unreadable / league-not-active / team-not-found.
        /// Per the contract's acceptance checks this is explicitly **not this screen's job** to
        /// render ("route those to the existing ConnectFailed/LeagueDegraded-family screens
        /// instead of rendering 'No real gaps to fill' over a read that never actually
        /// completed"). This case exists purely so the view model still answers honestly; the
        /// hosting flow is expected to route elsewhere on seeing it rather than have this screen
        /// improvise a treatment for a state it does not own.
        case routeElsewhere(reason: String)
        case failed(OmenApiError)
    }

    enum SaveState: Equatable { case idle, saving, saved, error }

    @Published private(set) var viewState: ViewState = .loading
    @Published private(set) var candidates: [TradeFindCandidate] = []
    @Published private(set) var currentIndex: Int = 0
    @Published private(set) var response: TradeFindResponse?
    @Published private(set) var saveStates: [String: SaveState] = [:]

    private let repository: TradeFindRepository
    private let saveAction: TradeFindSaveAction
    private let sessionManager: SessionManager

    init(
        repository: TradeFindRepository,
        saveAction: TradeFindSaveAction = StubTradeFindSaveAction(),
        sessionManager: SessionManager
    ) {
        self.repository = repository
        self.saveAction = saveAction
        self.sessionManager = sessionManager
    }

    var currentCandidate: TradeFindCandidate? {
        candidates.indices.contains(currentIndex) ? candidates[currentIndex] : nil
    }

    /// "3 of 6" — one-indexed position in the batch actually returned. Client pager state, not
    /// a server field (`candidates.length` is static once fetched).
    var positionLabel: String? {
        guard !candidates.isEmpty else { return nil }
        return "\(currentIndex + 1) of \(candidates.count)"
    }

    /// "5 of 6 teams scanned" — `bounds.teams_considered` against the reconstructed total.
    var teamsScannedLabel: String? {
        guard let response else { return nil }
        return "\(response.teamsConsidered) of \(response.totalOtherTeams) teams scanned"
    }

    /// "Showing 5 of 6 teams." — the degraded banner's bold lead-in.
    var degradedShowingLabel: String? {
        guard let response, response.showsDegradedBanner else { return nil }
        return "Showing \(response.teamsConsidered) of \(response.totalOtherTeams) teams."
    }

    /// The named-gap sentence for the degraded banner. Handles the "more than one team
    /// degraded" case the contract flags as unspecified by pluralizing rather than naming only
    /// the first team and silently dropping the rest.
    var degradedSentence: String? {
        guard let response, response.showsDegradedBanner else { return nil }
        let names = response.degradedTeams.compactMap { team -> String? in
            let trimmed = team.teamName?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
            return trimmed.isEmpty ? nil : trimmed
        }
        switch names.count {
        case 0:
            return "Omen couldn't read every team's roster this week — Omen never proposes a trade against a roster it can't see."
        case 1:
            return "ESPN couldn't read \(names[0])'s roster this week — Omen never proposes a trade against a roster it can't see."
        default:
            let joined = names.joined(separator: ", ")
            return "ESPN couldn't read \(names.count) teams' rosters this week (\(joined)) — Omen never proposes a trade against a roster it can't see."
        }
    }

    func load(platform: String, leagueId: String, teamId: String, week: Int?) async {
        viewState = .loading
        let accessToken: String?
        if case .token(let renewed) = await sessionManager.authorization() {
            accessToken = renewed
        } else {
            accessToken = nil
        }
        guard let accessToken else {
            viewState = .failed(.unauthorized)
            return
        }

        switch await repository.find(platform: platform, leagueId: leagueId, teamId: teamId, week: week, accessToken: accessToken) {
        case .success(let payload):
            response = payload
            if payload.status == "unavailable" {
                candidates = []
                currentIndex = 0
                viewState = .routeElsewhere(reason: payload.reason ?? "own_roster_unavailable")
                return
            }
            candidates = payload.candidates
            currentIndex = 0
            saveStates = [:]
            viewState = candidates.isEmpty ? .zeroCandidates : .reviewing
        case .failure(let error):
            if error == .unauthorized { sessionManager.onRefreshFailed() }
            viewState = .failed(error)
        }
    }

    /// E069 — `Pass`, and the swipe-left gesture's committed equivalent. Local only: "Pass never
    /// calls a network endpoint" (acceptance check). Advances regardless of whether this
    /// candidate was already saved — saving keeps the card up for continued review, and Pass is
    /// the "done looking at this one" action independent of it.
    func pass() {
        guard currentIndex < candidates.count else { return }
        currentIndex += 1
        if currentIndex >= candidates.count {
            viewState = .batchExhausted
        }
    }

    /// E070 — `Save for later`, and the swipe-right gesture's committed equivalent. Calls the
    /// save interface with the candidate's `id` and its `reasoning` verbatim, then flips that
    /// candidate's button to `Saved ✓`. Never advances the stack and never navigates — there is
    /// no saved-trades destination yet (T4).
    func save() async {
        guard let candidate = currentCandidate else { return }
        saveStates[candidate.id] = .saving
        let outcome = await saveAction.save(candidateId: candidate.id, reasoning: candidate.reasoning)
        switch outcome {
        case .saved: saveStates[candidate.id] = .saved
        case .error: saveStates[candidate.id] = .error
        }
    }

    func saveState(for candidateId: String) -> SaveState {
        saveStates[candidateId] ?? .idle
    }
}
