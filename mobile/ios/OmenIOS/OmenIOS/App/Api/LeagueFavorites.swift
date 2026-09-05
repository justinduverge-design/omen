import Foundation

/// Which teams the user has starred, and **in what order they starred them**.
///
/// Contract: `Blueprints/specs/mobile/omen-league-switcher-contract-v1.md` §3.
/// Founder, 2026-09-05: "multiple favorites… break the hierarchies within the favorites from
/// first clicked to last clicked."
///
/// ## Why order is stored, not derived
///
/// The obvious implementation is a `Set` of ids plus a sort by team name, and it is wrong: the
/// founder asked for *star order* specifically, so the array's own order is the data. Appending
/// on star and removing on unstar means re-starring a team moves it to the end, which is the
/// honest reading of "first clicked is first" — it was clicked again, later.
///
/// ## Why this is local for now
///
/// `league-directory.v1` has no favourite field. `is_followed` is a different concept and must
/// not be reused: **one** league is active, **many** are followed, and favourites are an
/// ordering over the followed set. Overloading `is_followed` would silently change which
/// leagues appear in the carousel the moment a user stars one.
///
/// So v1 persists per user in `UserDefaults`, which satisfies "across launches" but not "across
/// devices". §8 of the contract asks for cross-device, and that needs a server field. This type
/// is the seam: give it a remote repository later and no call site changes.
///
/// Keyed by user id because a shared device that signs out and back in as someone else must not
/// inherit the first user's stars.
struct LeagueFavorites: Equatable {
    /// Page ids (`"platform:leagueID"`), oldest star first.
    private(set) var ordered: [String]

    init(ordered: [String] = []) {
        // De-duplicated on the way in. A defaults blob is user-writable state that has already
        // survived at least one app version, and a duplicate id would sort a team above itself.
        var seen = Set<String>()
        self.ordered = ordered.filter { seen.insert($0).inserted }
    }

    func contains(_ id: String) -> Bool { ordered.contains(id) }

    /// The star's rank, or `nil` when it is not starred. Used as the primary sort key.
    func rank(of id: String) -> Int? { ordered.firstIndex(of: id) }

    mutating func toggle(_ id: String) {
        if let index = ordered.firstIndex(of: id) {
            ordered.remove(at: index)
        } else {
            ordered.append(id)
        }
    }

    /// Drops stars for teams the directory no longer reports.
    ///
    /// Without this a disconnected league's star would sit in defaults forever and silently
    /// come back if the user ever reconnected that league — a preference they set months ago
    /// reappearing with no explanation. Called after every directory read.
    mutating func pruned(toKnown ids: Set<String>) {
        ordered.removeAll { !ids.contains($0) }
    }
}

/// Where favourites and the remembered provider filter live between launches.
///
/// A protocol so tests drive a real in-memory double rather than mutating the simulator's
/// shared `UserDefaults`, where one test's stars leak into the next test's assertions.
protocol LeagueSwitcherPreferencesStore: AnyObject {
    func favorites(userID: String) -> LeagueFavorites
    func setFavorites(_ favorites: LeagueFavorites, userID: String)
    /// `nil` until the user has ever changed the filter — which is what makes the
    /// "first open defaults to All" rule (contract §4) expressible without a second flag.
    func providerFilter(userID: String) -> String?
    func setProviderFilter(_ platform: String, userID: String)
}

final class UserDefaultsLeagueSwitcherPreferences: LeagueSwitcherPreferencesStore {
    private let defaults: UserDefaults

    init(defaults: UserDefaults = .standard) { self.defaults = defaults }

    private func favoritesKey(_ userID: String) -> String { "omen.switcher.favorites.\(userID)" }
    private func filterKey(_ userID: String) -> String { "omen.switcher.filter.\(userID)" }

    func favorites(userID: String) -> LeagueFavorites {
        LeagueFavorites(ordered: defaults.stringArray(forKey: favoritesKey(userID)) ?? [])
    }

    func setFavorites(_ favorites: LeagueFavorites, userID: String) {
        defaults.set(favorites.ordered, forKey: favoritesKey(userID))
    }

    func providerFilter(userID: String) -> String? {
        defaults.string(forKey: filterKey(userID))
    }

    func setProviderFilter(_ platform: String, userID: String) {
        defaults.set(platform, forKey: filterKey(userID))
    }
}

/// In-memory double for tests and previews.
final class InMemoryLeagueSwitcherPreferences: LeagueSwitcherPreferencesStore {
    private var favoritesByUser: [String: LeagueFavorites] = [:]
    private var filterByUser: [String: String] = [:]

    init(favorites: [String: LeagueFavorites] = [:], filters: [String: String] = [:]) {
        favoritesByUser = favorites
        filterByUser = filters
    }

    func favorites(userID: String) -> LeagueFavorites { favoritesByUser[userID] ?? LeagueFavorites() }
    func setFavorites(_ favorites: LeagueFavorites, userID: String) { favoritesByUser[userID] = favorites }
    func providerFilter(userID: String) -> String? { filterByUser[userID] }
    func setProviderFilter(_ platform: String, userID: String) { filterByUser[userID] = platform }
}
