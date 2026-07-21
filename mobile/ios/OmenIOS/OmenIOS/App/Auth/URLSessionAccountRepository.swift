import Foundation

/// Production `AccountRepository`, mirroring Android's `OkHttpAccountRepository.kt`. The
/// confirmation-phrase guard runs client-side first so an unconfirmed request never leaves the
/// device, exactly like the Android implementation.
final class URLSessionAccountRepository: AccountRepository {
    private let apiBaseURL: URL
    private let session: URLSession

    init(apiBaseURL: URL, session: URLSession = .shared) {
        self.apiBaseURL = apiBaseURL
        self.session = session
    }

    func deleteAccount(accessToken: String, confirmation: String) async -> AccountDeletionOutcome {
        guard AccountDeletion.isConfirmed(confirmation) else {
            return .invalidConfirmation
        }

        var request = URLRequest(url: apiBaseURL.appendingPathComponent("api/user/delete"))
        request.httpMethod = "DELETE"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["confirmation": confirmation])

        let response: URLResponse
        do {
            (_, response) = try await session.data(for: request)
        } catch {
            return .retryableError(code: .network)
        }

        guard let http = response as? HTTPURLResponse else {
            return .retryableError(code: .unknown)
        }
        return mapDeleteStatus(http.statusCode)
    }
}
