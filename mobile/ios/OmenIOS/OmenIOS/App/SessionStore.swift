import Foundation

@MainActor
final class SessionStore: ObservableObject {
    enum State: Equatable {
        case loading
        case signedOut
        case signedIn(userID: String)
    }

    @Published private(set) var state: State = .loading

    func markSignedOut() {
        state = .signedOut
    }

    func enterDemo() {
        state = .signedIn(userID: "demo-local")
    }
}
