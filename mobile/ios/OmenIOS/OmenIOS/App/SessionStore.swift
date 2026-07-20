import Foundation

@MainActor
final class SessionStore: ObservableObject {
    enum State: Equatable {
        case loading
        case signedOut
        case authPlaceholder
        case signedIn(userID: String)
    }

    @Published private(set) var state: State = .loading

    func markSignedOut() {
        state = .signedOut
    }

    func enterDemo() {
        state = .signedIn(userID: "demo-local")
    }

    func beginSignIn() { state = .authPlaceholder }
    func continueWithPlaceholderSignIn() { state = .signedIn(userID: "local-preview") }
}
