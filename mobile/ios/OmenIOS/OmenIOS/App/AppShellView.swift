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
                    Button("Enter demo") {
                        session.enterDemo()
                    }
                }
            case .signedIn:
                TabView {
                    Text("Command Center").tabItem { Label("Command", systemImage: "sparkles") }
                    Text("Omen").tabItem { Label("Omen", systemImage: "bolt.fill") }
                    Text("Trade").tabItem { Label("Trade", systemImage: "arrow.left.arrow.right") }
                    Text("Draft").tabItem { Label("Draft", systemImage: "list.number") }
                    Text("League & Account").tabItem { Label("League", systemImage: "person.crop.circle") }
                }
            }
        }
        .task { session.markSignedOut() }
    }
}
