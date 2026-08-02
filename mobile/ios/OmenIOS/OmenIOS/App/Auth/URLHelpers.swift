import Foundation

extension URL {
    /// Read a query parameter's value from the URL, or nil if absent/empty. Used by the OAuth
    /// callback plumbing in `AuthViewModel.handleOAuthCallback(_:)`.
    func queryValue(_ name: String) -> String? {
        guard let items = URLComponents(url: self, resolvingAgainstBaseURL: false)?.queryItems else {
            return nil
        }
        let value = items.first(where: { $0.name == name })?.value
        return (value?.isEmpty ?? true) ? nil : value
    }
}
