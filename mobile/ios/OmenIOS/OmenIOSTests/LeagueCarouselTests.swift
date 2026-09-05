import XCTest
@testable import Omen

/// The Command Center league carousel's ordering and filtering rules.
/// Kotlin twin: `LeagueCarouselTest.kt`.
///
/// These are the founder's two rules, and they are the thing most likely to drift between the
/// two platforms because both clients could plausibly "helpfully" re-sort. The point of these
/// tests is that neither does: the server's `platforms` order is the authority and the client
/// renders it.
final class LeagueCarouselTests: XCTestCase {

    private func decode(_ json: String) throws -> LeagueDirectory {
        try JSONDecoder().decode(LeagueDirectory.self, from: Data(json.utf8))
    }

    func testIsFollowedDefaultsToTrueSoAServerWithoutFollowsLosesNoLeagues() throws {
        let directory = try decode("""
        {"contract_version":"league-directory.v1","season":2026,
         "selection_persistence":"explicit",
         "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
           "leagues":[{"league_id":"L1","league_name":"Alpha","is_active":true}]}]}
        """)

        // The whole carousel filters on `isFollowed`. Defaulting it to false would have made
        // an older server's response render an empty widget for a user with real leagues.
        XCTAssertTrue(directory.platforms[0].leagues[0].isFollowed)
        // Absent `follow_persistence` means "unavailable", never a claimed save.
        XCTAssertNil(directory.followPersistence)
        XCTAssertFalse(directory.followChoicePersists)
    }

    func testALeagueTheUserUnfollowedIsNotACarouselPage() throws {
        let directory = try decode("""
        {"contract_version":"league-directory.v1","season":2026,
         "follow_persistence":"explicit",
         "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
           "leagues":[
             {"league_id":"L1","league_name":"Alpha","is_active":true,"is_followed":true},
             {"league_id":"L2","league_name":"Beta","is_active":false,"is_followed":false}]}]}
        """)

        XCTAssertTrue(directory.followChoicePersists)
        let followed = directory.platforms[0].leagues.filter(\.isFollowed).map(\.leagueID)
        XCTAssertEqual(followed, ["L1"])
    }

    /// The client must NOT re-sort. `orderPlatformsByFollowCount` in
    /// `src/services/leagueFollows.js` owns the rule; this pins that the client renders the
    /// server's order verbatim, so a future change to the rule needs one edit, not three.
    func testPagesFlattenInTheServersPlatformOrderNotAClientOrder() throws {
        let directory = try decode("""
        {"contract_version":"league-directory.v1","season":2026,
         "follow_persistence":"explicit",
         "platforms":[
          {"platform":"espn","connection_state":"connected","discovery":"full","leagues":[
            {"league_id":"E1","is_active":true},{"league_id":"E2"},{"league_id":"E3"}]},
          {"platform":"sleeper","connection_state":"connected","discovery":"full","leagues":[
            {"league_id":"S1"}]},
          {"platform":"yahoo","connection_state":"connected","discovery":"full","leagues":[
            {"league_id":"Y1"}]}]}
        """)

        let pages = directory.platforms.flatMap { group in
            group.leagues.filter(\.isFollowed).map { "\(group.platform):\($0.leagueID)" }
        }
        XCTAssertEqual(pages, ["espn:E1", "espn:E2", "espn:E3", "sleeper:S1", "yahoo:Y1"])
    }

    /// Filtering to a provider with fewer leagues than the current index would leave the pager
    /// pointing past the end, which renders nothing at all — a blank widget with no error and
    /// no explanation, the worst of the available failures.
    func testFilteringToASmallerProviderClampsThePageIndex() {
        let all = ["E1", "E2", "E3", "S1"]
        let filtered = all.filter { $0.hasPrefix("S") }
        var index = 2

        if filtered.isEmpty {
            index = 0
        } else if index >= filtered.count {
            index = filtered.count - 1
        }

        XCTAssertEqual(index, 0)
        XCTAssertEqual(filtered[index], "S1")
    }

    // MARK: - The shared commit
    //
    // The carousel (swipe to rest on a league) and the team picker (tap a chip) both make a
    // league active through `commit(_:)`. One implementation on purpose: two would eventually
    // disagree about what happens on failure, and the failure path is the one that matters.

    @MainActor
    private func makeViewModel(
        directory: LeagueDirectory,
        selection: Result<LeagueSelectionResult, OmenApiError>,
        recorder: StubLeagueDirectoryRepository.Recorder
    ) -> LeagueCarouselViewModel {
        LeagueCarouselViewModel(
            directoryRepository: StubLeagueDirectoryRepository(
                directory: .success(directory),
                selection: selection,
                recorder: recorder
            ),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(initial: Session(
                    userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000
                )),
                nowEpochSeconds: { 1_000 }
            )
        )
    }

    private func twoLeagues() throws -> LeagueDirectory {
        try decode("""
        {"contract_version":"league-directory.v1","season":2026,"follow_persistence":"explicit",
         "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
           "leagues":[
             {"league_id":"L1","league_name":"Alpha","team_name":"Titans","is_active":true},
             {"league_id":"L2","league_name":"Beta","team_name":"Sentinels","is_active":false}]}]}
        """)
    }

    @MainActor
    func testCommittingTheAlreadyActiveLeagueWritesNothing() async throws {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        let viewModel = makeViewModel(
            directory: try twoLeagues(),
            selection: .failure(.network),
            recorder: recorder
        )
        await viewModel.load(userID: "user-1")

        let active = try XCTUnwrap(viewModel.allPages.first(where: { $0.isActive }))
        let refresh = await viewModel.commit(active)

        // Nothing to change, so nothing is sent. Without this guard, dragging across a
        // five-league carousel fires five verified provider writes to land where one reaches,
        // and a tap on the picker's current chip costs a round trip for no reason.
        XCTAssertNil(refresh)
        XCTAssertTrue(recorder.calls.isEmpty)
    }

    @MainActor
    func testCommittingAnotherLeagueSendsItAndReturnsTheSurfacesToRefresh() async throws {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        let viewModel = makeViewModel(
            directory: try twoLeagues(),
            selection: .success(LeagueSelectionResult(
                contractVersion: "league-active-selection.v1",
                selectionPersistence: "explicit",
                active: nil,
                refresh: ["command_center", "omen", "league"]
            )),
            recorder: recorder
        )
        await viewModel.load(userID: "user-1")

        let other = try XCTUnwrap(viewModel.allPages.first(where: { !$0.isActive }))
        let refresh = await viewModel.commit(other)

        XCTAssertEqual(recorder.calls.count, 1)
        XCTAssertEqual(recorder.calls.first?.leagueID, "L2")
        // The caller re-reads what the SERVER says went stale, rather than deciding for itself.
        XCTAssertEqual(refresh, ["command_center", "omen", "league"])
    }

    @MainActor
    func testAFailedCommitReturnsNilSoTheCallerDoesNotRefresh() async throws {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        let viewModel = makeViewModel(
            directory: try twoLeagues(),
            selection: .failure(.server(status: 500)),
            recorder: recorder
        )
        await viewModel.load(userID: "user-1")

        let other = try XCTUnwrap(viewModel.allPages.first(where: { !$0.isActive }))

        // §10.3: re-reading for the OLD context and presenting it as new is the stale-context
        // failure the contract names. `nil` is how the caller is told not to.
        let refresh = await viewModel.commit(other)
        XCTAssertNil(refresh)
        // And the active league must not have moved locally on a write that did not land.
        XCTAssertEqual(viewModel.allPages.first(where: { $0.isActive })?.leagueID, "L1")
    }

    /// The picker renders nothing for one league. A row with a single chip is a control that
    /// can only ever confirm what the screen already says.
    @MainActor
    func testOneLeagueIsNotAChoice() async throws {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        let single = try decode("""
        {"contract_version":"league-directory.v1","season":2026,
         "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
           "leagues":[{"league_id":"L1","league_name":"Alpha","is_active":true}]}]}
        """)
        let viewModel = makeViewModel(directory: single, selection: .failure(.network), recorder: recorder)
        await viewModel.load(userID: "user-1")

        XCTAssertEqual(viewModel.allPages.count, 1)
        // Same threshold the picker checks.
        XCTAssertFalse(viewModel.allPages.count > 1)
    }

    // MARK: - The commit feedback loop (2026-09-05 production outage)

    /// No league marked active. Not a contrived fixture: it is what the server returns
    /// before any selection has been stored, and the state the carousel and the server were
    /// in during the outage.
    private func noActiveLeague() throws -> LeagueDirectory {
        try decode("""
        {"contract_version":"league-directory.v1","season":2026,"follow_persistence":"explicit",
         "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
           "leagues":[
             {"league_id":"L1","league_name":"Alpha","team_name":"Titans","is_active":false},
             {"league_id":"L2","league_name":"Beta","team_name":"Sentinels","is_active":false}]}]}
        """)
    }

    /// Same two leagues, reordered, still with nothing marked active. Re-reading the
    /// directory after a write legitimately returns a different order — the server decides
    /// it — and that reorder is what moves the pager underneath the user.
    private func noActiveLeagueReordered() throws -> LeagueDirectory {
        try decode("""
        {"contract_version":"league-directory.v1","season":2026,"follow_persistence":"explicit",
         "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
           "leagues":[
             {"league_id":"L2","league_name":"Beta","team_name":"Sentinels","is_active":false},
             {"league_id":"L1","league_name":"Alpha","team_name":"Titans","is_active":false}]}]}
        """)
    }

    /// Serves a different directory on the second read, which the shared stub cannot do.
    /// The reorder is the whole mechanism: without it the resting page keeps its index,
    /// nothing moves, and the loop never closes.
    private struct ReorderingDirectoryRepository: LeagueDirectoryRepository {
        let first: LeagueDirectory
        let second: LeagueDirectory
        let selection: Result<LeagueSelectionResult, OmenApiError>
        let recorder: StubLeagueDirectoryRepository.Recorder
        let reads = Counter()

        final class Counter: @unchecked Sendable {
            private(set) var value = 0
            func next() -> Int { value += 1; return value }
        }

        func fetchDirectory(accessToken: String) async -> Result<LeagueDirectory, OmenApiError> {
            .success(reads.next() == 1 ? first : second)
        }

        func selectLeague(
            accessToken: String, platform: String, leagueID: String, teamID: String?
        ) async -> Result<LeagueSelectionResult, OmenApiError> {
            recorder.record(platform, leagueID, teamID)
            return selection
        }

        func disconnect(accessToken: String, platform: String) async -> Result<Void, OmenApiError> {
            .success(())
        }
    }

    /// The regression test for the outage.
    ///
    /// A real swipe commits, and the commit re-reads the directory. When that re-read comes
    /// back in a different order, `reloadDirectoryPreservingPages` moves the pager to keep
    /// the user on the same league — and in SwiftUI that write fires the carousel's
    /// `.onChange(of: selectedIndex)`, which calls `commitSelection()` again. The only brake
    /// was `guard !page.isActive`, which holds solely if the re-read reports that league
    /// active. When it does not, the cycle runs unbounded: on 2026-09-05 it emitted 28
    /// requests in nine seconds from one phone, oscillating between two leagues, and pegged
    /// the single-core production API at 99% CPU until it was restarted by hand.
    ///
    /// One user swipe must produce exactly one write, whatever the server reports.
    @MainActor
    func testAReorderedRereadDoesNotTurnOneSwipeIntoACommitLoop() async throws {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        let viewModel = LeagueCarouselViewModel(
            directoryRepository: ReorderingDirectoryRepository(
                first: try noActiveLeague(),
                second: try noActiveLeagueReordered(),
                selection: .success(LeagueSelectionResult(
                    contractVersion: "league-active-selection.v1",
                    selectionPersistence: "explicit",
                    active: nil,
                    refresh: ["command_center"]
                )),
                recorder: recorder
            ),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(initial: Session(
                    userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000
                )),
                nowEpochSeconds: { 1_000 }
            )
        )

        await viewModel.load(userID: "user-1")

        // The user swipes to Beta and rests there. One write is correct and expected.
        viewModel.selectedIndex = 1
        let refresh = await viewModel.commitSelection()
        XCTAssertEqual(refresh, ["command_center"])
        XCTAssertEqual(recorder.calls.count, 1)

        // The re-read reordered the list, so the view model moved the pager to keep the user
        // on Beta. That move fires `.onChange` exactly as SwiftUI would.
        XCTAssertEqual(viewModel.selectedIndex, 0, "reload should have followed Beta to its new index")
        XCTAssertEqual(viewModel.currentPage?.leagueID, "L2")
        _ = await viewModel.commitSelection()

        XCTAssertEqual(
            recorder.calls.count, 1,
            "the view model's own pager move was committed back to the server — this is the loop"
        )
    }

    /// The guard must not be so broad that it eats the real thing. A user resting on a
    /// different league still has to be written, or the carousel silently does nothing.
    @MainActor
    func testAGenuineUserSwipeStillCommits() async throws {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        let viewModel = makeViewModel(
            directory: try noActiveLeague(),
            selection: .success(LeagueSelectionResult(
                contractVersion: "league-active-selection.v1",
                selectionPersistence: "explicit",
                active: nil,
                refresh: ["command_center"]
            )),
            recorder: recorder
        )

        await viewModel.load(userID: "user-1")
        viewModel.selectedIndex = 1
        let refresh = await viewModel.commitSelection()

        XCTAssertEqual(refresh, ["command_center"])
        XCTAssertEqual(recorder.calls.count, 1)
        XCTAssertEqual(recorder.calls.first?.leagueID, "L2")
    }
}
