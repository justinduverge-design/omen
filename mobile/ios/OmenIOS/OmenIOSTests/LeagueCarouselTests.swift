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
    func testContextIsResolvingBeforeTheDirectoryAnswers() throws {
        let viewModel = makeViewModel(
            directory: try twoLeagues(),
            selection: .failure(.network),
            recorder: StubLeagueDirectoryRepository.Recorder()
        )

        XCTAssertEqual(viewModel.contextResolution, .resolving)
    }

    @MainActor
    func testLoadedDirectoryResolvesToItsActiveLeagueScope() async throws {
        let viewModel = makeViewModel(
            directory: try twoLeagues(),
            selection: .failure(.network),
            recorder: StubLeagueDirectoryRepository.Recorder()
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(
            viewModel.contextResolution,
            .selected(OmenCallScope(platform: "sleeper", leagueID: "L1"))
        )
    }

    @MainActor
    func testEmptyDirectoryIsConfirmedNoneNotStillResolving() async throws {
        let empty = try decode("""
        {"contract_version":"league-directory.v1","season":2026,"platforms":[]}
        """)
        let viewModel = makeViewModel(
            directory: empty,
            selection: .failure(.network),
            recorder: StubLeagueDirectoryRepository.Recorder()
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(viewModel.contextResolution, .confirmedNone)
    }

    @MainActor
    func testDirectoryFailureDoesNotMasqueradeAsNoLeague() async {
        let viewModel = LeagueCarouselViewModel(
            directoryRepository: StubLeagueDirectoryRepository(directory: .failure(.network)),
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            sessionManager: liveSession()
        )

        await viewModel.load(userID: "user-1")

        XCTAssertEqual(viewModel.contextResolution, .failed(.network))
    }

    @MainActor
    func testCommittingTheAlreadyActiveLeagueWritesOnceThenNothing() async throws {
        let recorder = StubLeagueDirectoryRepository.Recorder()
        let viewModel = makeViewModel(
            directory: try twoLeagues(),
            selection: .failure(.network),
            recorder: recorder
        )
        await viewModel.load(userID: "user-1")

        // The directory's active flag is per provider, not the account's selection, so the first
        // pick of it is still told to the server (see commit(_:)). A failed write sends and
        // reports nothing to refresh.
        let active = try XCTUnwrap(viewModel.allPages.first(where: { $0.isActive }))
        let refresh = await viewModel.commit(active)
        XCTAssertNil(refresh)
        XCTAssertEqual(recorder.calls.count, 1)
    }

    @MainActor
    func testExactlyOnePageIsCurrentEvenWhenEveryProviderFlagsOneActive() async throws {
        let json = """
        {"contract_version":"league-directory.v1","season":2026,
         "active":{"platform":"yahoo","league_id":"Y1"},
         "platforms":[
          {"platform":"espn","leagues":[{"league_id":"E1","is_active":true},{"league_id":"E2"}]},
          {"platform":"sleeper","leagues":[{"league_id":"S1","is_active":true}]},
          {"platform":"yahoo","leagues":[{"league_id":"Y1","is_active":true}]}]}
        """
        let directory = try JSONDecoder().decode(LeagueDirectory.self, from: Data(json.utf8))
        let viewModel = makeViewModel(directory: directory, selection: .failure(.network), recorder: StubLeagueDirectoryRepository.Recorder())
        await viewModel.load(userID: "user-1")

        XCTAssertEqual(viewModel.allPages.filter { $0.isActive }.count, 3)
        XCTAssertEqual(viewModel.allPages.filter { viewModel.isCurrent($0) }.map(\.id), ["yahoo:Y1"])
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
        await viewModel.pendingDirectoryReload?.value

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


    // MARK: - Walk-1: crest consistency (chip vs sheet)

    func testCrestAgreesWithTheChipLabelForAnAmpersandName() {
        let name = "Puk Around & Find Out"
        XCTAssertEqual(omenCompactTeamLabel(name), "PAF")
        XCTAssertEqual(OmenDeskState.crest(from: name), "PAF")
    }

    func testCrestSkipsNonLettersAndNeverReturnsPunctuation() {
        XCTAssertEqual(OmenDeskState.crest(from: "Fire & Ice"), "FI")
        XCTAssertEqual(OmenDeskState.crest(from: "&"), "\u{2014}")
        XCTAssertEqual(OmenDeskState.crest(from: ""), "\u{2014}")
        XCTAssertEqual(OmenDeskState.crest(from: "Scaries"), "SCA")
        XCTAssertFalse(OmenDeskState.crest(from: "Puk Around & Find Out").contains("&"))
    }

    // MARK: - Walk-1: honest wording for unnamed ESPN teams

    func testUnnamedTeamSubtitleIsHonest() {
        XCTAssertEqual(OmenTeamPicker.unnamedTeamSubtitle(provider: "ESPN"), "ESPN team \u{00B7} name not shared")
        XCTAssertFalse(OmenTeamPicker.unnamedTeamSubtitle(provider: "ESPN").contains("unnamed"))
    }

    // MARK: - Walk-1: nflverse credit

    func testDataSourcesCarryTheNflverseCreditAndLink() {
        XCTAssertTrue(OmenDataSources.nflverseCredit.contains("nflverse data"))
        XCTAssertTrue(OmenDataSources.nflverseCredit.contains("CC BY 4.0"))
        XCTAssertEqual(OmenDataSources.nflverseURL.absoluteString, "https://github.com/nflverse/nflverse-data")
        XCTAssertTrue(OmenDataSources.providerData.contains("your own data"))
    }

    // MARK: - Walk-1: a lost response, and one directory fetch per switch

    /// Counts directory reads and lets the switch POST fail the way a dropped connection does.
    private final class CountingRepository: LeagueDirectoryRepository, @unchecked Sendable {
        var directories: [LeagueDirectory]
        var selection: Result<LeagueSelectionResult, OmenApiError>
        var fetchDelayNanoseconds: UInt64
        private(set) var fetches = 0
        init(
            directories: [LeagueDirectory],
            selection: Result<LeagueSelectionResult, OmenApiError>,
            fetchDelayNanoseconds: UInt64 = 0
        ) {
            self.directories = directories
            self.selection = selection
            self.fetchDelayNanoseconds = fetchDelayNanoseconds
        }
        func fetchDirectory(accessToken: String) async -> Result<LeagueDirectory, OmenApiError> {
            if fetchDelayNanoseconds > 0 {
                try? await Task.sleep(nanoseconds: fetchDelayNanoseconds)
            }
            defer { fetches += 1 }
            return .success(directories[min(fetches, directories.count - 1)])
        }
        func selectLeague(accessToken: String, platform: String, leagueID: String, teamID: String?) async -> Result<LeagueSelectionResult, OmenApiError> {
            selection
        }
        func disconnect(accessToken: String, platform: String) async -> Result<Void, OmenApiError> { .success(()) }
    }

    @MainActor
    private func viewModel(over repository: CountingRepository) -> LeagueCarouselViewModel {
        LeagueCarouselViewModel(
            directoryRepository: repository,
            leagueRepository: StubLeagueRepository(result: .failure(.network)),
            sessionManager: SessionManager(
                store: InMemorySecureSessionStore(initial: Session(
                    userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000
                )),
                nowEpochSeconds: { 1_000 }
            )
        )
    }

    private func directory(active leagueID: String) throws -> LeagueDirectory {
        try decode("""
        {"contract_version":"league-directory.v1","season":2026,"follow_persistence":"explicit",
         "active":{"platform":"sleeper","league_id":"\(leagueID)"},
         "platforms":[{"platform":"sleeper","connection_state":"connected","discovery":"full",
           "leagues":[
             {"league_id":"L1","league_name":"Alpha","team_name":"Titans","is_active":\(leagueID == "L1")},
             {"league_id":"L2","league_name":"Beta","team_name":"Sentinels","is_active":\(leagueID == "L2")}]}]}
        """)
    }

    @MainActor
    func testConcurrentSurfaceLoadsShareOneDirectoryRequest() async throws {
        let repository = CountingRepository(
            directories: [try directory(active: "L1")],
            selection: .failure(.network),
            fetchDelayNanoseconds: 50_000_000
        )
        let model = viewModel(over: repository)

        async let command: Void = model.load(userID: "user-1")
        async let omen: Void = model.load(userID: "user-1")
        async let league: Void = model.load(userID: "user-1")
        _ = await (command, omen, league)

        XCTAssertEqual(repository.fetches, 1)
        guard case .selected = model.contextResolution else {
            return XCTFail("shared load must resolve selected context, got \(model.contextResolution)")
        }
    }

    @MainActor
    func testASwitchReadsTheDirectoryOncePerSwitch() async throws {
        let repository = CountingRepository(
            directories: [try directory(active: "L1"), try directory(active: "L2")],
            selection: .success(LeagueSelectionResult(contractVersion: nil, selectionPersistence: nil, active: nil, refresh: ["omen"]))
        )
        let model = viewModel(over: repository)
        await model.load(userID: "user-1")
        XCTAssertEqual(repository.fetches, 1)

        let target = try XCTUnwrap(model.allPages.first { $0.leagueID == "L2" })
        _ = await model.commit(target)
        await model.pendingDirectoryReload?.value

        XCTAssertEqual(repository.fetches, 2, "one load + exactly one re-read for the switch")
        XCTAssertTrue(model.isCurrent(target))
    }

    @MainActor
    func testALostSwitchResponseThatTheServerAppliedKeepsChipAndContentTogether() async throws {
        let repository = CountingRepository(
            directories: [try directory(active: "L1"), try directory(active: "L2")],
            selection: .failure(.network)
        )
        let model = viewModel(over: repository)
        await model.load(userID: "user-1")

        let target = try XCTUnwrap(model.allPages.first { $0.leagueID == "L2" })
        let refresh = await model.commit(target)
        await model.pendingDirectoryReload?.value

        XCTAssertNotNil(refresh, "the server did switch, so the surfaces must reload")
        XCTAssertTrue(model.isCurrent(target), "the chip follows the confirmed switch")
        XCTAssertEqual(model.activePage?.id, target.id, "content follows the same league as the chip")
        XCTAssertEqual(repository.fetches, 2, "the verifying read is the switch's one directory fetch")
    }

    @MainActor
    func testALostSwitchResponseThatTheServerDidNotApplyChangesNothing() async throws {
        let repository = CountingRepository(
            directories: [try directory(active: "L1")],
            selection: .failure(.network)
        )
        let model = viewModel(over: repository)
        await model.load(userID: "user-1")
        let before = model.activePage?.id

        let target = try XCTUnwrap(model.allPages.first { $0.leagueID == "L2" })
        let refresh = await model.commit(target)

        XCTAssertNil(refresh)
        XCTAssertEqual(model.selectionError, .network, "the visible switcher owns a retryable failure state")
        XCTAssertEqual(model.activePage?.id, before, "chip and content both stay on the old league")
        XCTAssertFalse(model.isCurrent(target))
    }

    @MainActor
    func testALostDirectoryResponseAfterASwitchLeavesChipAndContentAgreeing() async throws {
        let repository = CountingRepository(
            directories: [try directory(active: "L1")],
            selection: .success(LeagueSelectionResult(contractVersion: nil, selectionPersistence: nil, active: nil, refresh: ["omen"]))
        )
        let model = viewModel(over: repository)
        await model.load(userID: "user-1")
        // The re-read after the switch still answers with the OLD active league (stale/lost).
        let target = try XCTUnwrap(model.allPages.first { $0.leagueID == "L2" })
        _ = await model.commit(target)
        await model.pendingDirectoryReload?.value

        XCTAssertTrue(model.isCurrent(target))
        XCTAssertEqual(model.activePage?.id, target.id)
    }

    // MARK: - A cancel while the task is still live is a failure, never a hung spinner

    @MainActor
    private func liveSession() -> SessionManager {
        SessionManager(
            store: InMemorySecureSessionStore(initial: Session(
                userID: "user-1", accessToken: "t", refreshToken: "r", expiresAtEpochSeconds: 2_000
            )),
            nowEpochSeconds: { 1_000 }
        )
    }

    @MainActor
    func testCancelledFetchWithALiveTaskFailsInsteadOfSpinningForever() async {
        let model = LeagueViewModel(
            repository: StubLeagueRepository(result: .failure(.network), overviewResult: .failure(.cancelled)),
            sessionManager: liveSession()
        )
        await model.load(userID: "user-1")
        XCTAssertEqual(model.viewState, .failed(.cancelled))
        XCTAssertEqual(LeagueViewModel.message(for: .cancelled), "That was interrupted. Try again.")
    }

    @MainActor
    func testCarouselPageIsUnavailableNotLoadingWhenACancelHasNoSuccessor() async throws {
        let repository = CountingRepository(
            directories: [try directory(active: "L1")],
            selection: .failure(.network)
        )
        let model = LeagueCarouselViewModel(
            directoryRepository: repository,
            leagueRepository: StubLeagueRepository(result: .failure(.network), overviewResult: .failure(.cancelled)),
            sessionManager: liveSession()
        )
        await model.load(userID: "user-1")

        let page = try XCTUnwrap(model.currentPage)
        guard case .unavailable(let reason) = model.state(for: page) else {
            return XCTFail("expected unavailable, got \(model.state(for: page))")
        }
        XCTAssertTrue(reason.contains("try again"))
    }

    func testConfirmationSaysNothingAboutMemoryWhileTheFollowWriteIsInFlight() {
        let pending = ConnectConfirmation(leagueNames: ["A", "B"], remembered: true, pending: true)
        XCTAssertTrue((pending.message ?? "").contains("Saving"))
        XCTAssertFalse((pending.message ?? "").contains("remember"))
    }
}
