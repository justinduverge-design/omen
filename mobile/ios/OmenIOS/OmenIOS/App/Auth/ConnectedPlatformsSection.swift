import SwiftUI

/// Account → "Connected leagues", and the disconnect behind it.
///
/// **This exists because the app was making a promise it could not keep.** The ESPN consent
/// screen — the one App Review reads — says the connection is "your account and your choice, and
/// you can disconnect it any time in Account". Account had no disconnect. `DELETE
/// /api/platforms/:platform` had shipped months earlier and no client ever called it.
///
/// It is also the only way to reset a connection for testing, which is how the gap was found: the
/// founder tried to reconnect ESPN, could not clear the existing connection, and ended up
/// deleting his whole account instead.
@MainActor
final class ConnectedPlatformsViewModel: ObservableObject {
    enum LoadState: Equatable {
        case loading
        case loaded([Row])
        /// Never blocks the rest of Account — a directory that will not load must not take
        /// sign-out and delete down with it.
        case failed
    }

    /// One connected platform, reduced to what Account needs to show and act on.
    struct Row: Equatable, Identifiable {
        let platform: String
        let leagueName: String?
        let teamName: String?

        var id: String { platform }

        var displayName: String {
            switch platform {
            case "espn": return "ESPN"
            case "yahoo": return "Yahoo"
            case "sleeper": return "Sleeper"
            default: return platform.capitalized
            }
        }

        /// ESPN exposes no league list, so `league_name` is routinely null on a healthy
        /// connection. Show whatever is real and say nothing rather than print a placeholder.
        var subtitle: String? {
            let parts = [leagueName, teamName].compactMap { $0?.isEmpty == false ? $0 : nil }
            return parts.isEmpty ? nil : parts.joined(separator: " · ")
        }
    }

    @Published private(set) var state: LoadState = .loading
    @Published private(set) var disconnecting: String?
    @Published private(set) var errorMessage: String?

    private let repository: LeagueDirectoryRepository
    private let sessionManager: SessionManager

    init(repository: LeagueDirectoryRepository, sessionManager: SessionManager) {
        self.repository = repository
        self.sessionManager = sessionManager
    }

    func load() async {
        guard case .token(let accessToken) = await sessionManager.authorization() else {
            state = .failed
            return
        }

        switch await repository.fetchDirectory(accessToken: accessToken) {
        case .success(let directory):
            state = .loaded(Self.rows(from: directory))
        case .failure:
            state = .failed
        }
    }

    /// Disconnects, then re-reads the directory rather than mutating the list locally.
    ///
    /// The server is the truth about what is connected, and a local removal that the server did
    /// not actually perform is exactly the lie this screen exists to stop telling.
    func disconnect(_ platform: String) async {
        guard disconnecting == nil else { return }
        errorMessage = nil
        guard case .token(let accessToken) = await sessionManager.authorization() else {
            errorMessage = "Sign in again to change your connections."
            return
        }

        disconnecting = platform
        defer { disconnecting = nil }

        switch await repository.disconnect(accessToken: accessToken, platform: platform) {
        case .success:
            await load()
        case .failure:
            errorMessage = "That didn't disconnect. Try again in a moment."
        }
    }

    /// Only genuinely connected platforms are listed. A `not_connected` group is not a thing the
    /// user can disconnect, and showing it as one would be its own small lie.
    static func rows(from directory: LeagueDirectory) -> [Row] {
        directory.platforms
            .filter { $0.connectionState == "connected" }
            .map { group in
                let active = group.leagues.first(where: { $0.isActive }) ?? group.leagues.first
                return Row(
                    platform: group.platform,
                    leagueName: active?.leagueName,
                    teamName: active?.teamName
                )
            }
    }
}

struct ConnectedPlatformsSection: View {
    @StateObject private var viewModel: ConnectedPlatformsViewModel
    @State private var pendingDisconnect: ConnectedPlatformsViewModel.Row?

    init(repository: LeagueDirectoryRepository, sessionManager: SessionManager) {
        _viewModel = StateObject(
            wrappedValue: ConnectedPlatformsViewModel(
                repository: repository,
                sessionManager: sessionManager
            )
        )
    }

    var body: some View {
        VStack(alignment: .leading, spacing: OmenSpacing.step12) {
            Text("Connected leagues")
                .omenTextStyle(OmenTypography.h3)
                .foregroundStyle(OmenColor.textPrimary)

            switch viewModel.state {
            case .loading:
                Text("Checking your connections…")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)

            case .failed:
                // Deliberately quiet: this section failing must not imply anything is wrong with
                // the account itself, and sign-out and delete sit right below it.
                Text("We couldn't load your connections just now.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)

            case .loaded(let rows) where rows.isEmpty:
                Text("No leagues connected yet.")
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.textSecondary)

            case .loaded(let rows):
                ForEach(rows) { row in
                    VStack(alignment: .leading, spacing: OmenSpacing.step8) {
                        OmenListRow(title: row.displayName, subtitle: row.subtitle)
                        OmenButton(
                            title: "Disconnect",
                            action: { pendingDisconnect = row },
                            variant: .link,
                            size: .sm,
                            enabled: viewModel.disconnecting == nil,
                            loading: viewModel.disconnecting == row.platform
                        )
                    }
                }
            }

            if let errorMessage = viewModel.errorMessage {
                Text(errorMessage)
                    .omenTextStyle(OmenTypography.bodySmall)
                    .foregroundStyle(OmenColor.Data.riskHigh)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .task { await viewModel.load() }
        // Confirmed, because disconnecting is not what a user means by a mis-tap next to
        // "Delete account" — but no typed phrase: it is reversible by reconnecting.
        .sheet(item: $pendingDisconnect) { row in
            OmenModalSheet(title: "Disconnect \(row.displayName)?") {
                VStack(alignment: .leading, spacing: OmenSpacing.step12) {
                    Text("Omen will stop reading this league. Your \(row.displayName) account and your team are untouched, and you can connect again any time.")
                        .omenTextStyle(OmenTypography.body)
                        .foregroundStyle(OmenColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    OmenButton(
                        title: "Disconnect",
                        action: {
                            let platform = row.platform
                            pendingDisconnect = nil
                            Task { await viewModel.disconnect(platform) }
                        },
                        variant: .danger,
                        size: .lg
                    )
                    OmenButton(
                        title: "Keep it connected",
                        action: { pendingDisconnect = nil },
                        variant: .secondary,
                        size: .lg
                    )
                }
            }
            .presentationDetents([.medium])
        }
    }
}
