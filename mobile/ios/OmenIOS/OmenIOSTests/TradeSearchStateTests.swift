import XCTest
@testable import Omen

/// `F-BAR-34` — a failed player search must never render as "no results".
///
/// The original code funnelled every `.failure` into `suggestions = []`, which is byte-identical
/// on screen to a successful search that found nothing. `/api/players/search` shares a
/// 30-request-per-minute-per-IP bucket with `/api/trade`, `/api/demo` and
/// `/api/draft-assistant`, so 429 is not exotic — it is the failure real users hit, and it was
/// being reported to them as "this player does not exist". These tests exist to keep the two
/// apart forever.
@MainActor
final class TradeSearchStateTests: XCTestCase {

    private func makeViewModel(
        search: Result<[PlayerSearchResult], OmenApiError>
    ) -> TradeViewModel {
        TradeViewModel(
            repository: StubTradeRepository(result: .failure(.network)),
            playerSearch: StubPlayerSearchRepository(result: search),
            sessionManager: SessionManager(store: InMemorySecureSessionStore())
        )
    }

    /// Waits past the 250ms debounce without coupling the test to the exact constant.
    private func settle() async {
        try? await Task.sleep(nanoseconds: 700_000_000)
    }

    func testSuccessfulSearchWithRowsProducesResults() async {
        let row = PlayerSearchResult(id: "1", name: "Justin Jefferson", position: "WR", team: "MIN")
        let sut = makeViewModel(search: .success([row]))
        sut.search("Jeff", side: .send)
        await settle()
        XCTAssertEqual(sut.searchState, .results([row]))
        XCTAssertEqual(sut.suggestions, [row])
    }

    /// The honest empty case: the server answered and knows no such player.
    func testSuccessfulSearchWithNoRowsProducesEmptyNotFailure() async {
        let sut = makeViewModel(search: .success([]))
        sut.search("Zzzzzz", side: .send)
        await settle()
        XCTAssertEqual(sut.searchState, .empty(query: "Zzzzzz"))
        XCTAssertTrue(sut.suggestions.isEmpty)
    }

    /// The regression this file exists for. 429 is a failure, not an absence.
    func testRateLimitedSearchProducesFailedNotEmpty() async {
        let sut = makeViewModel(search: .failure(.server(status: 429)))
        sut.search("Jefferson", side: .send)
        await settle()
        XCTAssertEqual(sut.searchState, .failed(.server(status: 429)))
        XCTAssertNotEqual(sut.searchState, .empty(query: "Jefferson"))
        XCTAssertTrue(sut.suggestions.isEmpty, "A failure must not masquerade as rows.")
    }

    func testNetworkAndDecodeFailuresAlsoProduceFailed() async {
        for error in [OmenApiError.network, .decode, .server(status: 500)] {
            let sut = makeViewModel(search: .failure(error))
            sut.search("Jefferson", side: .send)
            await settle()
            XCTAssertEqual(sut.searchState, .failed(error))
        }
    }

    func testShortQueryIsIdleRatherThanEmpty() async {
        let sut = makeViewModel(search: .success([]))
        sut.search("J", side: .send)
        await settle()
        XCTAssertEqual(sut.searchState, .idle)
        XCTAssertNil(sut.searchingSide)
    }

    func testClearSuggestionsReturnsToIdle() async {
        let row = PlayerSearchResult(id: "1", name: "Justin Jefferson", position: "WR", team: "MIN")
        let sut = makeViewModel(search: .success([row]))
        sut.search("Jeff", side: .send)
        await settle()
        sut.clearSuggestions()
        XCTAssertEqual(sut.searchState, .idle)
        XCTAssertNil(sut.searchingSide)
    }

    /// The rate-limit copy has to be its own sentence. Folding 429 into the generic server
    /// message is what made the limit invisible in the first place.
    func testRateLimitCopyIsDistinctAndNamesTheWait() {
        let limited = OmenApiError.server(status: 429)
        let other = OmenApiError.server(status: 500)
        XCTAssertEqual(TradeViewModel.searchTitle(for: limited), "Too many searches")
        XCTAssertNotEqual(
            TradeViewModel.searchMessage(for: limited),
            TradeViewModel.searchMessage(for: other)
        )
        XCTAssertTrue(TradeViewModel.searchMessage(for: limited).contains("minute"))
    }

    /// Every failure keeps the manual path open — autocomplete is an accelerator, never a gate.
    func testEverySearchFailureMessageOffersTheManualPath() {
        for error in [OmenApiError.network, .unauthorized, .decode,
                      .server(status: 429), .server(status: 500)] {
            XCTAssertTrue(
                TradeViewModel.searchMessage(for: error).contains("press Add"),
                "\(error) must still tell the user they can type the name."
            )
        }
    }
}
