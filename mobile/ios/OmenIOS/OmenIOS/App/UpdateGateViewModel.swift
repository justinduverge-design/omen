import Foundation

enum UpdateGateState: Equatable {
    /// Includes both "checking" and "check failed/unavailable" — a network error must never
    /// block the app, so both resolve to the same pass-through state as a successful "ok".
    case passed
    case blocked(minimumVersion: String)
}

@MainActor
final class UpdateGateViewModel: ObservableObject {
    @Published private(set) var state: UpdateGateState = .passed

    private let client: MinVersionGateChecking
    private let currentVersion: String
    private let platform = "ios"

    init(client: MinVersionGateChecking, currentVersion: String = AppVersionProvider.current) {
        self.client = client
        self.currentVersion = currentVersion
    }

    func check() async {
        switch await client.check(platform: platform, currentVersion: currentVersion) {
        case .ok, .unavailable:
            state = .passed
        case .updateRequired(let minimumVersion):
            state = .blocked(minimumVersion: minimumVersion)
        }
    }
}
