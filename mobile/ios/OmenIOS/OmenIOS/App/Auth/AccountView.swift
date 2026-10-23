import SwiftUI

/// Account's production host: reads the league directory, maps it into `OmenAccountState`, and owns disconnect.
struct AccountView: View {
    let userID: String
    @ObservedObject var sessionManager: SessionManager
    /// Nil in demo mode and previews: there are no real connections to manage there.
    var leagueDirectoryRepository: LeagueDirectoryRepository?
    /// Providers whose sign-in the server rejected; those rows say "Sign in again".
    var needsSignIn: Set<String> = []
    var onOpen: (AccountRoute) -> Void
    var onConnect: (() -> Void)?
    var onContactSupport: (() -> Void)?
    var onReportProblem: (() -> Void)?

    private var isDemo: Bool { userID == SessionManager.demoUserID }

    var body: some View {
        if !isDemo, let leagueDirectoryRepository {
            ConnectedAccountView(
                base: state(.loading),
                repository: leagueDirectoryRepository,
                sessionManager: sessionManager,
                needsSignIn: needsSignIn,
                onOpen: onOpen,
                onConnect: onConnect,
                onContactSupport: onContactSupport,
                onReportProblem: onReportProblem
            )
        } else {
            OmenAccountScreen(
                state: state(.none),
                onOpen: onOpen,
                onConnect: onConnect,
                onContactSupport: onContactSupport,
                onReportProblem: onReportProblem,
                onSignOut: { sessionManager.signOut() }
            )
        }
    }

    private func state(_ connections: OmenAccountConnections) -> OmenAccountState {
        let identity = isDemo ? "Demo mode" : userID
        return OmenAccountState(
            initials: OmenAccountState.initials(from: identity),
            identity: identity,
            // The session does not say which provider signed the user in, so this names no provider.
            identityDetail: isDemo ? "No account" : "Signed in \u{00B7} passkeys",
            connections: connections,
            isDemo: isDemo
        )
    }
}

/// The signed-in path. Its own view so the directory view model is only built when there is a repository.
private struct ConnectedAccountView: View {
    let base: OmenAccountState
    @StateObject private var viewModel: ConnectedPlatformsViewModel
    @Environment(\.omenHaptics) private var haptics
    let sessionManager: SessionManager
    let needsSignIn: Set<String>
    let onOpen: (AccountRoute) -> Void
    let onConnect: (() -> Void)?
    let onContactSupport: (() -> Void)?
    let onReportProblem: (() -> Void)?

    init(
        base: OmenAccountState, repository: LeagueDirectoryRepository, sessionManager: SessionManager, needsSignIn: Set<String>,
        onOpen: @escaping (AccountRoute) -> Void, onConnect: (() -> Void)?, onContactSupport: (() -> Void)?, onReportProblem: (() -> Void)?
    ) {
        self.base = base
        _viewModel = StateObject(wrappedValue: ConnectedPlatformsViewModel(repository: repository, sessionManager: sessionManager))
        self.sessionManager = sessionManager
        self.needsSignIn = needsSignIn
        self.onOpen = onOpen
        self.onConnect = onConnect
        self.onContactSupport = onContactSupport
        self.onReportProblem = onReportProblem
    }

    private var connections: OmenAccountConnections {
        switch viewModel.state {
        case .loading: return .loading
        case .failed: return .unavailable
        case .loaded(let rows) where rows.isEmpty: return .none
        case .loaded(let rows):
            return .loaded(rows.map {
                OmenAccountConnection(
                    id: $0.platform, platform: $0.platform,
                    leagueName: $0.leagueName ?? $0.teamName ?? "League name not sent",
                    needsSignIn: needsSignIn.contains($0.platform)
                )
            })
        }
    }

    var body: some View {
        OmenAccountScreen(
            state: { var s = base; s.connections = connections; return s }(),
            disconnecting: viewModel.disconnecting,
            disconnectError: viewModel.errorMessage,
            onOpen: onOpen,
            onConnect: onConnect,
            onDisconnect: { connection in
                Task { haptics.play(await viewModel.disconnect(connection.platform) ? .success : .error) }
            },
            onContactSupport: onContactSupport,
            onReportProblem: onReportProblem,
            onSignOut: { sessionManager.signOut() }
        )
        .task { await viewModel.load() }
    }
}
