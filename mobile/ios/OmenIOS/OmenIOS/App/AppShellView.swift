import SwiftUI

struct AppShellView: View {
    @EnvironmentObject private var session: SessionStore

    var body: some View {
        Group {
            switch session.state {
            case .loading:
                ProgressView("Loading Omen")
            case .signedOut:
                VStack(spacing: 16) {
                    Text("Welcome to Omen")
                    Text("See the move before the league does.")
                    Button("Try Demo") {
                        session.enterDemo()
                    }
                    Button("Get started") { session.beginSignIn() }
                }
            case .authPlaceholder:
                VStack(spacing: 16) {
                    Text("Sign in to Omen")
                    Text("Sign-in wiring comes after this local vertical slice.")
                    Button("Continue with local preview") { session.continueWithPlaceholderSignIn() }
                }
            case .signedIn:
                TabView {
                    Text("Command Center\nDemo mode is active.").tabItem { Label("Command", systemImage: "sparkles") }
                    VStack(spacing: 12) {
                        Text("Mock recommendation")
                        Text("Start Jordan Addison over the flex alternative.")
                        Text("Connection needs attention: connect a league for live Omen.")
                    }.tabItem { Label("Omen", systemImage: "bolt.fill") }
                    Text("Trade").tabItem { Label("Trade", systemImage: "arrow.left.arrow.right") }
                    Text("Draft").tabItem { Label("Draft", systemImage: "list.number") }
                    Text("League & Account").tabItem { Label("League", systemImage: "person.crop.circle") }
                }
            }
        }
        .task { session.markSignedOut() }
    }
}
