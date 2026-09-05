import XCTest
@testable import Omen

/// The favourite ordering rule and the remembered provider filter.
/// Contract: `Blueprints/specs/mobile/omen-league-switcher-contract-v1.md` §3 and §4.
/// Kotlin twin to follow: `LeagueSwitcherFavoritesTest.kt`.
///
/// These pin the two behaviours most likely to drift, for the same reason `LeagueCarouselTests`
/// pins provider order: both are rules a client could plausibly "helpfully" reimplement, and the
/// carousel and the switcher sheet must never end up with two answers.
final class LeagueSwitcherFavoritesTests: XCTestCase {

    private func page(_ platform: String, _ leagueID: String, active: Bool = false) -> LeagueCarouselViewModel.Page {
        .init(platform: platform, leagueID: leagueID, leagueName: nil, teamName: nil, isActive: active)
    }

    private func ids(_ pages: [LeagueCarouselViewModel.Page]) -> [String] { pages.map(\.id) }

    // MARK: - §3, the one ordering rule

    func testFavouritesLeadInTheOrderTheyWereStarredNotAlphabetically() {
        let pages = [page("espn", "E1"), page("sleeper", "S1"), page("yahoo", "Y1")]
        // Starred Y1 first, then E1. Star order, not list order and not name order.
        var favorites = LeagueFavorites()
        favorites.toggle("yahoo:Y1")
        favorites.toggle("espn:E1")

        XCTAssertEqual(
            ids(LeagueCarouselViewModel.ordered(pages, by: favorites)),
            ["yahoo:Y1", "espn:E1", "sleeper:S1"]
        )
    }

    /// The tail must keep the server's provider order exactly. A `sorted(by:)` implementation
    /// would be free to reshuffle equal elements and quietly undo the "most leagues first, ties
    /// alphabetical" rule the server owns.
    func testUnstarredTeamsKeepTheServersOrderBehindTheFavourites() {
        let pages = [page("espn", "E1"), page("espn", "E2"), page("sleeper", "S1"), page("yahoo", "Y1")]
        var favorites = LeagueFavorites()
        favorites.toggle("sleeper:S1")

        XCTAssertEqual(
            ids(LeagueCarouselViewModel.ordered(pages, by: favorites)),
            ["sleeper:S1", "espn:E1", "espn:E2", "yahoo:Y1"]
        )
    }

    /// The same function, applied to a narrowed input. This is what makes "ESPN's favourites at
    /// the top of the ESPN list" need no code of its own — and what stops the sheet and the
    /// carousel from growing two orderings.
    func testFilteringToOneProviderAppliesTheSameRuleToThatProvidersTeams() {
        let all = [page("espn", "E1"), page("espn", "E2"), page("sleeper", "S1")]
        var favorites = LeagueFavorites()
        favorites.toggle("sleeper:S1")
        favorites.toggle("espn:E2")

        XCTAssertEqual(
            ids(LeagueCarouselViewModel.ordered(all, by: favorites)),
            ["sleeper:S1", "espn:E2", "espn:E1"],
            "On All, every favourite floats up across providers, in star order"
        )
        let espnOnly = all.filter { $0.platform == "espn" }
        XCTAssertEqual(
            ids(LeagueCarouselViewModel.ordered(espnOnly, by: favorites)),
            ["espn:E2", "espn:E1"],
            "Filtered to ESPN, only the ESPN favourite leads"
        )
    }

    func testReStarringMovesATeamToTheEndOfTheFavouriteBlock() {
        var favorites = LeagueFavorites()
        favorites.toggle("a:1")
        favorites.toggle("b:2")
        XCTAssertEqual(favorites.ordered, ["a:1", "b:2"])

        favorites.toggle("a:1")
        favorites.toggle("a:1")
        // It was clicked again, later. "First clicked is first" reads on the current stars,
        // not on a star the user removed.
        XCTAssertEqual(favorites.ordered, ["b:2", "a:1"])
    }

    func testNoFavouritesLeavesTheServerOrderCompletelyUntouched() {
        let pages = [page("espn", "E1"), page("sleeper", "S1")]
        XCTAssertEqual(ids(LeagueCarouselViewModel.ordered(pages, by: LeagueFavorites())), ids(pages))
    }

    /// Defaults is user-writable state that has already survived at least one app version. A
    /// duplicated id would sort a team above itself and render it twice.
    func testADuplicatedStoredIdCannotProduceATeamListedTwice() {
        let favorites = LeagueFavorites(ordered: ["a:1", "b:2", "a:1"])
        XCTAssertEqual(favorites.ordered, ["a:1", "b:2"])

        let pages = [page("a", "1"), page("b", "2")]
        XCTAssertEqual(ids(LeagueCarouselViewModel.ordered(pages, by: favorites)), ["a:1", "b:2"])
    }

    /// A star for a league the user disconnected must not sit in defaults waiting to reappear
    /// if they ever reconnect it.
    func testStarsForLeaguesTheDirectoryNoLongerReportsArePruned() {
        var favorites = LeagueFavorites(ordered: ["espn:E1", "yahoo:Y1"])
        favorites.pruned(toKnown: ["espn:E1"])
        XCTAssertEqual(favorites.ordered, ["espn:E1"])
    }

    // MARK: - §8, whose stars these are

    func testStarsAreKeyedPerUserSoASharedDeviceDoesNotLeakThem() {
        let store = InMemoryLeagueSwitcherPreferences()
        var justins = LeagueFavorites()
        justins.toggle("espn:E1")
        store.setFavorites(justins, userID: "user-a")

        XCTAssertEqual(store.favorites(userID: "user-a").ordered, ["espn:E1"])
        XCTAssertEqual(store.favorites(userID: "user-b").ordered, [], "A second user inherits nothing")
    }

    // MARK: - §4, the remembered filter

    /// Absent, not "All". The distinction is what lets the first-open-defaults-to-All rule be
    /// expressed without carrying a second "has the user ever chosen?" flag.
    func testAnUnsetFilterIsAbsentRatherThanDefaultedInTheStore() {
        let store = InMemoryLeagueSwitcherPreferences()
        XCTAssertNil(store.providerFilter(userID: "user-a"))

        store.setProviderFilter("espn", userID: "user-a")
        XCTAssertEqual(store.providerFilter(userID: "user-a"), "espn")
    }
}
