import Foundation
import UIKit

/// Production `OmenBetaReportRepository`. Mirrors Android's `OkHttpBetaReportRepository.kt`.
///
/// Two calls, in the order `CONTRACTS.md` states: *"GET /api/beta/reports/schema first, then
/// POST metadata-only report."* The schema read is what supplies the disclosure the user is
/// asked to accept, so it genuinely has to come first — accepting a disclosure the app invented
/// is not consent to anything the server will do.
final class URLSessionBetaReportRepository: OmenBetaReportRepository {
    private let apiBaseURL: URL
    private let session: URLSession

    init(apiBaseURL: URL, session: URLSession = .shared) {
        self.apiBaseURL = apiBaseURL
        self.session = session
    }

    func schema() async -> OmenBetaReportSchema {
        var request = URLRequest(url: apiBaseURL.appendingPathComponent("api/beta/reports/schema"))
        request.httpMethod = "GET"
        request.timeoutInterval = 15

        guard
            let (data, response) = try? await session.data(for: request),
            let http = response as? HTTPURLResponse, http.statusCode == 200,
            let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let disclosure = json["disclosure"] as? String, !disclosure.isEmpty
        else {
            // Not a thrown error and not an empty disclosure: the composer still has to say
            // something true, and `.unreadable` is the sentence that is true when the terms
            // could not be read.
            return .unreadable
        }

        return OmenBetaReportSchema(
            screens: json["screens"] as? [String] ?? OmenBetaReportScreen.allCases.map(\.rawValue),
            screenshotsSupported: json["screenshots_supported"] as? Bool ?? false,
            disclosure: disclosure
        )
    }

    func send(_ report: OmenBetaReport, accessToken: String) async -> OmenBetaReportOutcome {
        guard report.isSendable else {
            return .rejected(message: "Add a note before sending.")
        }

        var request = URLRequest(url: apiBaseURL.appendingPathComponent("api/beta/reports"))
        request.httpMethod = "POST"
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: report.jsonBody())

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            return .failed(message: "Omen couldn\u{2019}t reach the server. Nothing was sent.")
        }

        guard let http = response as? HTTPURLResponse else {
            return .failed(message: "Omen couldn\u{2019}t reach the server. Nothing was sent.")
        }
        let json = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any] ?? [:]

        switch http.statusCode {
        case 201:
            // The id is the server's receipt that it stored something. Rendering it is the only
            // evidence the composer has that the report went anywhere, which is why the success
            // state shows it rather than a tick.
            return .received(id: json["id"] as? String ?? "")
        case 503:
            return .notSaved
        case 400:
            return .rejected(message: "Omen couldn\u{2019}t accept those fields. Nothing was sent.")
        case 401:
            return .failed(message: "Your session expired. Sign in again to send a report.")
        case 429:
            return .failed(message: "Too many reports just now. Try again shortly.")
        default:
            return .failed(message: "Omen couldn\u{2019}t send that report. Nothing was sent.")
        }
    }
}

/// The device facts a report carries, read from the running app rather than typed in.
///
/// **This is the whole list.** There is no identifier for advertising, no vendor id, no carrier,
/// no locale and no IP — the payload has four metadata fields and these are they.
enum OmenBetaReportDevice {
    static var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
    }

    static var build: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "unknown"
    }

    static var osVersion: String {
        "iOS \(UIDevice.current.systemVersion)"
    }

    /// `UIDevice.model` is "iPhone", not "iPhone 16 Pro" — which is the right level of
    /// resolution for this and is kept deliberately. A precise hardware string plus an app
    /// version is a narrower fingerprint than the report needs.
    static var deviceModel: String {
        UIDevice.current.model
    }
}
